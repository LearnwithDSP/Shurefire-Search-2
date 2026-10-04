import { Router, Request, Response } from "express";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { db } from "./firebase.js";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import {
  UserDocumentRecord,
  validateUploadedFile,
  performMultimodalAnalysis,
  chatAboutDocument,
  StructuredDocumentAnalysis
} from "./documentIntelligenceService.js";

// In-memory document session cache for fast access, backed by Firestore user_documents collection
const documentSessions = new Map<string, UserDocumentRecord>();

export function createDocumentIntelligenceRouter(getAiClient: () => GoogleGenAI | null): Router {
  const router = Router();

  // Helper: Load document record from memory or Firestore
  async function getDocumentRecord(id: string): Promise<UserDocumentRecord | null> {
    if (documentSessions.has(id)) {
      return documentSessions.get(id)!;
    }

    try {
      const snap = await getDoc(doc(db, "user_documents", id));
      if (snap.exists()) {
        const data = snap.data() as UserDocumentRecord;
        documentSessions.set(id, data);
        return data;
      }
    } catch (err: any) {
      console.warn(`[Document Intelligence] Firestore read notice for ${id}:`, err?.message || err);
    }
    return null;
  }

  // Helper: Persist document record to memory and Firestore
  async function saveDocumentRecord(record: UserDocumentRecord): Promise<void> {
    record.updatedAt = new Date().toISOString();
    documentSessions.set(record.id, record);

    try {
      // Don't write massive base64 payload into Firestore if it exceeds Firestore's 1MB document limit
      const payloadToSave: any = { ...record };
      if (payloadToSave.fileData && payloadToSave.fileData.length > 700000) {
        // Keep a preview thumbnail snippet in Firestore; full base64 remains in memory cache
        payloadToSave.fileDataStoredInMemory = true;
        payloadToSave.fileDataPreview = payloadToSave.fileData.slice(0, 1000);
        delete payloadToSave.fileData;
      }

      await setDoc(doc(db, "user_documents", record.id), payloadToSave);
    } catch (err: any) {
      console.warn(`[Document Intelligence] Firestore write notice for ${record.id}:`, err?.message || err);
    }
  }

  // =========================================================================
  // 1. POST /api/documents/upload
  // Validates file format/size and initializes a private document session
  // =========================================================================
  router.post("/upload", async (req: Request, res: Response) => {
    try {
      const { filename, mimeType, fileSize, fileData, sessionId } = req.body;

      if (!filename || !mimeType || !fileData) {
        res.status(400).json({ error: "Missing required upload parameters (filename, mimeType, fileData)." });
        return;
      }

      const calculatedSize = typeof fileSize === "number" ? fileSize : Buffer.byteLength(fileData, "base64");
      const validation = validateUploadedFile(mimeType, calculatedSize);

      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const docId = `doc_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      const newRecord: UserDocumentRecord = {
        id: docId,
        sessionId: sessionId || `sess_${crypto.randomUUID()}`,
        filename: String(filename).trim(),
        mimeType: String(mimeType).toLowerCase().trim(),
        fileSize: calculatedSize,
        fileData: String(fileData),
        uploadTimestamp: now,
        analysisStatus: "uploaded",
        analysisProgress: "Uploaded successfully. Ready for AI inspection.",
        chatMessages: [],
        createdAt: now,
        updatedAt: now
      };

      await saveDocumentRecord(newRecord);

      res.status(201).json({
        id: newRecord.id,
        sessionId: newRecord.sessionId,
        filename: newRecord.filename,
        mimeType: newRecord.mimeType,
        fileSize: newRecord.fileSize,
        uploadTimestamp: newRecord.uploadTimestamp,
        analysisStatus: newRecord.analysisStatus,
        message: "Document uploaded and validated. Proceed with analysis."
      });
    } catch (err: any) {
      console.error("[Document Intelligence Upload Error]", err);
      res.status(500).json({ error: "Failed to upload document. Internal server error." });
    }
  });

  // =========================================================================
  // 2. POST /api/documents/analyze (or /api/documents/:id/analyze)
  // Multimodal AI analysis extracting structured construction findings
  // =========================================================================
  const handleAnalyze = async (req: Request, res: Response) => {
    try {
      const docId = req.params.id || req.body.id;
      if (!docId) {
        res.status(400).json({ error: "Document ID is required for analysis." });
        return;
      }

      const docRecord = await getDocumentRecord(docId);
      if (!docRecord) {
        res.status(404).json({ error: "Document not found or expired." });
        return;
      }

      if (!docRecord.fileData) {
        res.status(400).json({ error: "Document binary payload missing. Please re-upload the file." });
        return;
      }

      const ai = getAiClient();
      if (!ai) {
        res.status(503).json({ error: "Gemini AI service unavailable. Please check API configuration." });
        return;
      }

      // Mark analyzing state
      docRecord.analysisStatus = "analyzing";
      docRecord.analysisProgress = "Reading document and understanding drawing...";
      await saveDocumentRecord(docRecord);

      try {
        const analysis = await performMultimodalAnalysis(
          docRecord.fileData,
          docRecord.mimeType,
          docRecord.filename,
          ai
        );

        docRecord.analysisStatus = "completed";
        docRecord.analysisProgress = "Analysis complete.";
        docRecord.analysis = analysis;
        await saveDocumentRecord(docRecord);

        res.json({
          id: docRecord.id,
          filename: docRecord.filename,
          mimeType: docRecord.mimeType,
          analysisStatus: "completed",
          analysis
        });
      } catch (analysisErr: any) {
        docRecord.analysisStatus = "error";
        docRecord.errorMessage = analysisErr?.message || "Could not interpret document.";
        docRecord.analysisProgress = "Analysis halted.";
        await saveDocumentRecord(docRecord);

        res.status(422).json({
          id: docRecord.id,
          analysisStatus: "error",
          error: analysisErr?.message || "Failed to analyze document drawing."
        });
      }
    } catch (err: any) {
      console.error("[Document Intelligence Analysis Error]", err);
      res.status(500).json({ error: "Document analysis pipeline error." });
    }
  };

  router.post("/analyze", handleAnalyze);
  router.post("/:id/analyze", handleAnalyze);

  // =========================================================================
  // 3. GET /api/documents/:id
  // Retrieves document state and structured findings (excluding heavy base64)
  // =========================================================================
  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const record = await getDocumentRecord(id);

      if (!record) {
        res.status(404).json({ error: "Document not found." });
        return;
      }

      // Return clean view without raw bytes
      const { fileData, ...cleanMeta } = record;
      res.json({
        ...cleanMeta,
        hasFileData: Boolean(fileData || (record as any).fileDataPreview)
      });
    } catch (err: any) {
      console.error("[Document Intelligence Fetch Error]", err);
      res.status(500).json({ error: "Failed to retrieve document." });
    }
  });

  // =========================================================================
  // 4. POST /api/documents/:id/chat
  // Answers interactive technical questions grounded in the analyzed document
  // =========================================================================
  router.post("/:id/chat", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { message } = req.body;

      if (!message || typeof message !== "string" || !message.trim()) {
        res.status(400).json({ error: "Question message is required." });
        return;
      }

      const record = await getDocumentRecord(id);
      if (!record) {
        res.status(404).json({ error: "Document not found." });
        return;
      }

      const ai = getAiClient();
      if (!ai) {
        res.status(503).json({ error: "AI service unavailable." });
        return;
      }

      const userMsgId = `msg_${crypto.randomUUID()}`;
      const userMsg = {
        id: userMsgId,
        role: "user" as const,
        content: message.trim(),
        timestamp: new Date().toISOString()
      };
      record.chatMessages = [...(record.chatMessages || []), userMsg];

      // Run grounded reasoning
      const { reply, evidenceLevel, citations } = await chatAboutDocument(record, message.trim(), ai);

      const assistantMsg = {
        id: `msg_${crypto.randomUUID()}`,
        role: "assistant" as const,
        content: reply,
        timestamp: new Date().toISOString(),
        groundingSources: citations,
        evidenceLevel
      };
      record.chatMessages.push(assistantMsg);

      await saveDocumentRecord(record);

      res.json({
        id,
        userMessage: userMsg,
        assistantMessage: assistantMsg,
        reply,
        evidenceLevel,
        citations
      });
    } catch (err: any) {
      console.error("[Document Intelligence Chat Error]", err);
      res.status(500).json({ error: "Failed to process question." });
    }
  });

  // =========================================================================
  // 5. DELETE /api/documents/:id
  // Privacy removal: deletes user document and analysis
  // =========================================================================
  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      documentSessions.delete(id);

      try {
        await deleteDoc(doc(db, "user_documents", id));
      } catch (err: any) {
        console.warn(`[Document Intelligence] Firestore delete notice for ${id}:`, err?.message || err);
      }

      res.json({ success: true, message: "Document removed permanently." });
    } catch (err: any) {
      console.error("[Document Intelligence Delete Error]", err);
      res.status(500).json({ error: "Failed to delete document." });
    }
  });

  return router;
}
