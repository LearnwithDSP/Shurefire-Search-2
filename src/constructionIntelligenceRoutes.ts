// Phase 5A: Construction Intelligence API Router

import { Router, Request, Response } from "express";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { db } from "./firebase.js";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import {
  ProjectIntelligenceProfile,
  ConstructionActionResult,
  IntelligenceActionType
} from "./constructionIntelligenceTypes.js";
import {
  validateUploadedFile,
  analyzeConstructionDocument,
  executeIntelligenceAction
} from "./constructionIntelligenceService.js";

// In-memory project cache for sub-millisecond retrieval, backed by Firestore
const projectMemoryCache = new Map<string, ProjectIntelligenceProfile>();
const projectDocumentPayloads = new Map<string, { fileData: string; mimeType: string; filename: string }>();
const projectActionResultsCache = new Map<string, Map<string, ConstructionActionResult>>();

export function createConstructionIntelligenceRouter(
  getAiClient: () => GoogleGenAI | null,
  getSupabaseClient: () => any
): Router {
  const router = Router();

  async function getProfile(id: string): Promise<ProjectIntelligenceProfile | null> {
    if (projectMemoryCache.has(id)) {
      return projectMemoryCache.get(id)!;
    }

    try {
      const snap = await getDoc(doc(db, "construction_projects", id));
      if (snap.exists()) {
        const data = snap.data() as ProjectIntelligenceProfile;
        projectMemoryCache.set(id, data);
        return data;
      }
    } catch (err: any) {
      console.warn(`[Construction Intelligence] Firestore read notice for ${id}:`, err?.message || err);
    }
    return null;
  }

  async function saveProfile(profile: ProjectIntelligenceProfile): Promise<void> {
    projectMemoryCache.set(profile.id, profile);
    try {
      await setDoc(doc(db, "construction_projects", profile.id), profile);
      await setDoc(doc(db, "construction_analyses", profile.id), {
        id: profile.id,
        projectId: profile.id,
        profile,
        confidence: profile.confidence,
        missingInformation: profile.missingInformation,
        createdAt: profile.createdAt
      });
    } catch (err: any) {
      console.warn(`[Construction Intelligence] Firestore write notice for ${profile.id}:`, err?.message || err);
    }
  }

  // =========================================================================
  // 1. POST /api/construction/analyze
  // Validates file, executes Gemini multimodal analysis, extracts Project Intelligence Profile
  // =========================================================================
  router.post("/analyze", async (req: Request, res: Response): Promise<void> => {
    try {
      const { filename, mimeType, fileSize, fileData, projectId: clientProjectId } = req.body;

      // 1. Validation
      const validation = validateUploadedFile({ filename, mimeType, fileSize, fileData });
      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const aiClient = getAiClient();
      if (!aiClient) {
        res.status(500).json({ error: "AI Gemini Engine is not initialized on the server." });
        return;
      }

      const projectId = clientProjectId || `proj_${crypto.randomUUID()}`;

      // Cache raw file payload in memory for subsequent actions
      projectDocumentPayloads.set(projectId, {
        fileData,
        mimeType: mimeType.toLowerCase(),
        filename: filename || "construction_drawing.png"
      });

      // Persist document metadata to Firestore
      try {
        await setDoc(doc(db, "construction_documents", projectId), {
          id: projectId,
          projectId,
          filename: filename || "construction_drawing.png",
          mimeType: mimeType.toLowerCase(),
          fileSize: fileSize || 0,
          createdAt: new Date().toISOString()
        });
      } catch (docErr: any) {
        console.warn("[Construction Intelligence] Document metadata notice:", docErr?.message || docErr);
      }

      // 2. Multimodal Analysis
      const profile = await analyzeConstructionDocument(
        fileData,
        mimeType.toLowerCase(),
        filename || "construction_drawing.png",
        projectId,
        aiClient
      );

      // 3. Save profile
      await saveProfile(profile);

      // 4. Return concise analysis summary + full profile
      res.status(200).json({
        projectId,
        profile,
        message: "Analysis Complete",
        summary: {
          projectName: profile.projectName,
          buildingType: profile.buildingType,
          approximateFloorArea: profile.floorArea ? `${profile.floorArea} m²` : "Not annotated",
          floors: profile.floors || 1,
          unitsRooms: profile.rooms.length > 0 ? `${profile.rooms.length} rooms identified` : "Standard layout",
          structuralInformationAvailable: profile.hasStructuralDrawings,
          materialsDetected: profile.materialsMentioned,
          importantMissingInformation: profile.missingInformation.slice(0, 3)
        }
      });
    } catch (err: any) {
      console.error("[Construction Intelligence] Analysis error:", err);
      res.status(500).json({ error: "An unexpected error occurred during document analysis." });
    }
  });

  // =========================================================================
  // 2. POST /api/construction/action
  // Executes one of the 6 intelligence actions:
  // - cement_requirement
  // - cost_estimate
  // - procurement_priority
  // - preliminary_boq
  // - missing_information
  // - rebar_requirement
  // =========================================================================
  router.post("/action", async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, action } = req.body;

      if (!projectId || typeof projectId !== "string") {
        res.status(400).json({ error: "Missing or invalid 'projectId'." });
        return;
      }

      const validActions: IntelligenceActionType[] = [
        "cement_requirement",
        "cost_estimate",
        "procurement_priority",
        "preliminary_boq",
        "missing_information",
        "rebar_requirement"
      ];

      if (!action || !validActions.includes(action as IntelligenceActionType)) {
        res.status(400).json({
          error: `Invalid action '${action}'. Supported actions: ${validActions.join(", ")}.`
        });
        return;
      }

      const profile = await getProfile(projectId);
      if (!profile) {
        res.status(404).json({ error: `Project with ID '${projectId}' was not found. Please upload the document first.` });
        return;
      }

      // Check in-memory cache first (Phase 5B Part 5: Action Result Caching)
      const cachedResult = projectActionResultsCache.get(projectId)?.get(action);
      if (cachedResult && !req.body.forceRefresh) {
        res.status(200).json({
          projectId,
          action,
          result: cachedResult,
          cached: true
        });
        return;
      }

      const aiClient = getAiClient();
      if (!aiClient) {
        res.status(500).json({ error: "AI Engine is not initialized." });
        return;
      }

      const supabaseClient = getSupabaseClient();

      // Execute action
      const result = await executeIntelligenceAction(
        profile,
        action as IntelligenceActionType,
        aiClient,
        supabaseClient
      );

      // Cache result
      if (!projectActionResultsCache.has(projectId)) {
        projectActionResultsCache.set(projectId, new Map());
      }
      projectActionResultsCache.get(projectId)!.set(action, result);

      // Persist result into Firestore
      try {
        const actionResultId = `res_${projectId}_${action}`;
        await setDoc(doc(db, "construction_action_results", actionResultId), {
          id: actionResultId,
          projectId,
          action,
          result,
          createdAt: new Date().toISOString()
        });
      } catch (saveErr: any) {
        console.warn("[Construction Intelligence] Action result save notice:", saveErr?.message || saveErr);
      }

      res.status(200).json({
        projectId,
        action,
        result
      });
    } catch (err: any) {
      console.error("[Construction Intelligence] Action execution error:", err);
      res.status(500).json({ error: "Failed to execute construction intelligence action." });
    }
  });

  // =========================================================================
  // 3. GET /api/construction/project/:id
  // =========================================================================
  router.get("/project/:id", async (req: Request, res: Response): Promise<void> => {
    try {
      const profile = await getProfile(req.params.id);
      if (!profile) {
        res.status(404).json({ error: "Project not found." });
        return;
      }
      res.status(200).json({ project: profile });
    } catch (err: any) {
      res.status(500).json({ error: "Error fetching project." });
    }
  });

  // =========================================================================
  // 4. GET /api/construction/project/:id/results
  // Returns all cached action results for this project
  // =========================================================================
  router.get("/project/:id/results", async (req: Request, res: Response): Promise<void> => {
    try {
      const projectId = req.params.id;
      const resultsMap = projectActionResultsCache.get(projectId);
      const results: Record<string, ConstructionActionResult> = {};

      if (resultsMap) {
        for (const [actionName, result] of resultsMap.entries()) {
          results[actionName] = result;
        }
      }

      res.status(200).json({ projectId, results });
    } catch (err: any) {
      res.status(500).json({ error: "Error fetching project results." });
    }
  });

  // =========================================================================
  // 5. DELETE /api/construction/project/:id
  // Purges project data
  // =========================================================================
  router.delete("/project/:id", async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      projectMemoryCache.delete(id);
      projectDocumentPayloads.delete(id);
      projectActionResultsCache.delete(id);

      try {
        await deleteDoc(doc(db, "construction_projects", id));
        await deleteDoc(doc(db, "construction_documents", id));
        await deleteDoc(doc(db, "construction_analyses", id));
      } catch (delErr: any) {
        console.warn("[Construction Intelligence] Delete notice:", delErr?.message || delErr);
      }

      res.status(200).json({ success: true, message: "Project purged successfully." });
    } catch (err: any) {
      res.status(500).json({ error: "Error purging project." });
    }
  });

  return router;
}
