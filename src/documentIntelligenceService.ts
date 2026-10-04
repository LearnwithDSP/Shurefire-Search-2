import { GoogleGenAI } from "@google/genai";
import { db } from "./firebase.js";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import crypto from "crypto";

export interface UserDocumentRecord {
  id: string;
  sessionId: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  fileData?: string; // base64 representation
  uploadTimestamp: string;
  analysisStatus: "uploaded" | "analyzing" | "completed" | "error";
  analysisProgress?: string;
  errorMessage?: string;
  analysis?: StructuredDocumentAnalysis | null;
  chatMessages: DocumentChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  groundingSources?: string[];
  evidenceLevel?: "EXPLICIT" | "CALCULATED" | "ESTIMATED" | "MARKET-BASED" | "UNKNOWN";
}

export interface StructuredDocumentAnalysis {
  document_overview: {
    document_type: string;
    project_type: string;
    building_type: string;
    number_of_floors: string | number;
    number_of_units: string | number;
    number_of_bedrooms: string | number;
    approximate_floor_area: string;
    drawing_title: string;
    drawing_number: string;
    revision: string;
    date: string;
    architect_or_engineer: string;
    location: string;
  };
  what_i_found: {
    rooms: Array<{ name: string; dimensions?: string; area?: string; notes?: string }>;
    dimensions: string[];
    wall_types: string[];
    doors: Array<{ tag?: string; type?: string; dimensions?: string; count?: number | string }>;
    windows: Array<{ tag?: string; type?: string; dimensions?: string; count?: number | string }>;
    structural_elements: {
      columns?: string[];
      beams?: string[];
      slabs?: string[];
      foundation?: string[];
      stairs?: string[];
    };
    roofing: string[];
    electrical: string[];
    plumbing: string[];
    general_notes: string[];
    visible_schedules: string[];
    preserved_units: string[];
  };
  construction_components: Array<{
    category_id: number;
    category_name: string;
    present: boolean;
    details: string;
    evidence_level: "EXPLICIT" | "CALCULATED" | "ESTIMATED" | "UNKNOWN";
    key_items: string[];
  }>;
  material_requirements: Array<{
    category: string;
    material: string;
    document_quantity: string;
    unit: string;
    source: string;
    confidence: "High" | "Medium" | "Low";
    evidence_level: "EXPLICIT" | "CALCULATED" | "ESTIMATED" | "UNKNOWN";
  }>;
  estimated_requirements: {
    calculated_items: Array<{
      item: string;
      calculated_value: string;
      derivation_formula: string;
      evidence_level: "CALCULATED";
      confidence: "High" | "Medium";
    }>;
    inferred_estimates: Array<{
      item: string;
      estimated_value: string;
      assumptions: string;
      evidence_level: "ESTIMATED";
      confidence: "Medium" | "Low";
    }>;
    insufficient_information_notice: string | null;
  };
  missing_information: {
    missing_critical_items: string[];
    impact_assessment: string;
  };
  potential_issues_to_verify: {
    verification_items: Array<{
      issue: string;
      location_in_doc?: string;
      risk_level: "HIGH" | "MEDIUM" | "ADVISORY";
      recommendation: string;
    }>;
    disclaimer: string;
  };
  construction_recommendations: {
    document_derived_recommendations: string[];
    general_construction_guidance: string[];
  };
  building_cost_analysis: {
    cost_status: "DOCUMENT-DERIVED" | "CALCULATED" | "ESTIMATED" | "MARKET-BASED" | "NOT AVAILABLE";
    preliminary_budget_band: {
      substructure_ngn?: string;
      superstructure_ngn?: string;
      finishes_ngn?: string;
      estimated_grand_total_ngn?: string;
      basis_of_estimate: string;
      pricing_source: string;
    } | null;
    analysis_notes: string;
  };
}

// Supported MIME types and size limit (20MB)
export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp"
];
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export function validateUploadedFile(mimeType: string, fileSize: number): { valid: boolean; error?: string } {
  const normalizedMime = (mimeType || "").toLowerCase().trim();
  if (!normalizedMime || !SUPPORTED_MIME_TYPES.includes(normalizedMime)) {
    return {
      valid: false,
      error: `Unsupported file type (${mimeType || "unknown"}). Shurefire Document Intelligence accepts architectural drawings, BOQs, and construction specifications in PDF, PNG, JPG, or WebP format.`
    };
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 20MB limit (${(fileSize / (1024 * 1024)).toFixed(1)}MB). Please upload a compressed or single-sheet drawing.`
    };
  }

  return { valid: true };
}

// System prompt for multimodal construction drawing and document analysis
const DOCUMENT_ANALYSIS_SYSTEM_INSTRUCTION = `You are Shurefire's Senior Construction Intelligence Engineer and Quantity Surveyor.
Your task is to perform an exhaustive, technically rigorous, multimodal analysis of an uploaded construction document (such as an architectural floor plan, structural drawing, elevation, Bill of Quantities / BOQ, quotation, material schedule, specification, or site photograph).

CRITICAL TRUST RULES:
1. DISTINGUISH FOUR STRICT EVIDENCE LEVELS:
   - "EXPLICIT": Information directly visible or readable in the document.
   - "CALCULATED": Values mathematically derived from explicit dimensions (e.g. wall length × height = block area).
   - "ESTIMATED": Inferred using standard Nigerian construction engineering norms and assumptions.
   - "UNKNOWN": Information that cannot be reliably determined.
   NEVER merge these categories. Never present an estimate or calculation as an explicit fact.

2. ACCURACY & ANTI-HALLUCINATION:
   - Never invent dimensions, room names, drawing numbers, or materials that cannot be read from the document.
   - If a field is not stated or visible, use "Not specified" or null.
   - If text/numbers are blurry or low-resolution, state: "Requires professional verification due to resolution limits".
   - Units MUST be preserved exactly (mm, cm, m, m², m³, kg, tonnes, bags, pieces).

3. CONSTRUCTION COMPONENTS:
   Organize findings across the 14 standard construction stages:
   1. Site preparation
   2. Foundation
   3. Ground floor/slab
   4. Blockwork
   5. Columns
   6. Beams
   7. Suspended slabs
   8. Roofing
   9. Doors
   10. Windows
   11. Plumbing
   12. Electrical
   13. Finishes
   14. External works

4. MISSING INFORMATION DETECTION:
   Identify typical engineering details needed for construction but absent in this specific document (e.g. foundation depth, soil bearing capacity, rebar schedule, concrete class, slab thickness, door/window schedules).

5. POTENTIAL ISSUES / DISCLAIMER:
   Identify inconsistencies or ambiguities with careful, professional phrasing ("Requires professional verification"). Include the required professional disclaimer.

6. OUTPUT FORMAT:
   Return STRICT JSON ONLY matching the requested StructuredDocumentAnalysis schema. No markdown backticks outside JSON, no conversational preamble.`;

export async function performMultimodalAnalysis(
  fileData: string, // raw base64 or data URL
  mimeType: string,
  filename: string,
  aiClient: GoogleGenAI
): Promise<StructuredDocumentAnalysis> {
  // Strip data URL header if present
  let cleanBase64 = fileData;
  if (fileData.includes(";base64,")) {
    cleanBase64 = fileData.split(";base64,")[1];
  }

  const promptText = `Analyze this construction document ("${filename}") thoroughly according to the Shurefire Document Intelligence specification.
Extract all visible architectural, structural, material, dimension, and scheduling details.
Populate every section with exact evidence, maintaining the four trust levels (EXPLICIT, CALCULATED, ESTIMATED, UNKNOWN).
Ensure building cost estimates only use market-based logic when sufficient dimensions are present.

Return STRICT JSON matching this schema:
{
  "document_overview": {
    "document_type": string,
    "project_type": string,
    "building_type": string,
    "number_of_floors": string | number,
    "number_of_units": string | number,
    "number_of_bedrooms": string | number,
    "approximate_floor_area": string,
    "drawing_title": string,
    "drawing_number": string,
    "revision": string,
    "date": string,
    "architect_or_engineer": string,
    "location": string
  },
  "what_i_found": {
    "rooms": [{"name": string, "dimensions": string, "area": string, "notes": string}],
    "dimensions": [string],
    "wall_types": [string],
    "doors": [{"tag": string, "type": string, "dimensions": string, "count": number | string}],
    "windows": [{"tag": string, "type": string, "dimensions": string, "count": number | string}],
    "structural_elements": {
      "columns": [string],
      "beams": [string],
      "slabs": [string],
      "foundation": [string],
      "stairs": [string]
    },
    "roofing": [string],
    "electrical": [string],
    "plumbing": [string],
    "general_notes": [string],
    "visible_schedules": [string],
    "preserved_units": [string]
  },
  "construction_components": [
    {
      "category_id": number,
      "category_name": string,
      "present": boolean,
      "details": string,
      "evidence_level": "EXPLICIT" | "CALCULATED" | "ESTIMATED" | "UNKNOWN",
      "key_items": [string]
    }
  ],
  "material_requirements": [
    {
      "category": string,
      "material": string,
      "document_quantity": string,
      "unit": string,
      "source": string,
      "confidence": "High" | "Medium" | "Low",
      "evidence_level": "EXPLICIT" | "CALCULATED" | "ESTIMATED" | "UNKNOWN"
    }
  ],
  "estimated_requirements": {
    "calculated_items": [
      {
        "item": string,
        "calculated_value": string,
        "derivation_formula": string,
        "evidence_level": "CALCULATED",
        "confidence": "High" | "Medium"
      }
    ],
    "inferred_estimates": [
      {
        "item": string,
        "estimated_value": string,
        "assumptions": string,
        "evidence_level": "ESTIMATED",
        "confidence": "Medium" | "Low"
      }
    ],
    "insufficient_information_notice": string | null
  },
  "missing_information": {
    "missing_critical_items": [string],
    "impact_assessment": string
  },
  "potential_issues_to_verify": {
    "verification_items": [
      {
        "issue": string,
        "location_in_doc": string,
        "risk_level": "HIGH" | "MEDIUM" | "ADVISORY",
        "recommendation": string
      }
    ],
    "disclaimer": "Requires professional verification. Shurefire AI is an intelligent engineering analysis assistant, not a replacement for a licensed architect, structural engineer, quantity surveyor, or other certified professional."
  },
  "construction_recommendations": {
    "document_derived_recommendations": [string],
    "general_construction_guidance": [string]
  },
  "building_cost_analysis": {
    "cost_status": "DOCUMENT-DERIVED" | "CALCULATED" | "ESTIMATED" | "MARKET-BASED" | "NOT AVAILABLE",
    "preliminary_budget_band": {
      "substructure_ngn": string,
      "superstructure_ngn": string,
      "finishes_ngn": string,
      "estimated_grand_total_ngn": string,
      "basis_of_estimate": string,
      "pricing_source": string
    },
    "analysis_notes": string
  }
}`;

  // Call modern Gemini multimodal model
  const modelsToTry = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await aiClient.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64
                }
              },
              { text: promptText }
            ]
          }
        ],
        config: {
          systemInstruction: DOCUMENT_ANALYSIS_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json"
        }
      });

      const rawText = (response.text || "").trim();
      if (!rawText) {
        throw new Error("Gemini returned empty response for document analysis");
      }

      const parsed: StructuredDocumentAnalysis = JSON.parse(rawText);
      return sanitizeAnalysisOutput(parsed);
    } catch (err: any) {
      console.warn(`[Document Intelligence] Model ${model} analysis error:`, err?.message || err);
      lastError = err;
    }
  }

  throw new Error(`Failed to analyze document with Gemini: ${lastError?.message || "Unknown error"}`);
}

// Fallback sanitizer to guarantee all 10 sections exist and match types
function sanitizeAnalysisOutput(parsed: any): StructuredDocumentAnalysis {
  return {
    document_overview: {
      document_type: parsed?.document_overview?.document_type || "Building Plan / Document",
      project_type: parsed?.document_overview?.project_type || "Not specified",
      building_type: parsed?.document_overview?.building_type || "Not specified",
      number_of_floors: parsed?.document_overview?.number_of_floors ?? "Not specified",
      number_of_units: parsed?.document_overview?.number_of_units ?? "Not specified",
      number_of_bedrooms: parsed?.document_overview?.number_of_bedrooms ?? "Not specified",
      approximate_floor_area: parsed?.document_overview?.approximate_floor_area || "Not specified",
      drawing_title: parsed?.document_overview?.drawing_title || "Not specified",
      drawing_number: parsed?.document_overview?.drawing_number || "Not specified",
      revision: parsed?.document_overview?.revision || "Not specified",
      date: parsed?.document_overview?.date || "Not specified",
      architect_or_engineer: parsed?.document_overview?.architect_or_engineer || "Not specified",
      location: parsed?.document_overview?.location || "Not specified"
    },
    what_i_found: {
      rooms: Array.isArray(parsed?.what_i_found?.rooms) ? parsed.what_i_found.rooms : [],
      dimensions: Array.isArray(parsed?.what_i_found?.dimensions) ? parsed.what_i_found.dimensions : [],
      wall_types: Array.isArray(parsed?.what_i_found?.wall_types) ? parsed.what_i_found.wall_types : [],
      doors: Array.isArray(parsed?.what_i_found?.doors) ? parsed.what_i_found.doors : [],
      windows: Array.isArray(parsed?.what_i_found?.windows) ? parsed.what_i_found.windows : [],
      structural_elements: {
        columns: Array.isArray(parsed?.what_i_found?.structural_elements?.columns) ? parsed.what_i_found.structural_elements.columns : [],
        beams: Array.isArray(parsed?.what_i_found?.structural_elements?.beams) ? parsed.what_i_found.structural_elements.beams : [],
        slabs: Array.isArray(parsed?.what_i_found?.structural_elements?.slabs) ? parsed.what_i_found.structural_elements.slabs : [],
        foundation: Array.isArray(parsed?.what_i_found?.structural_elements?.foundation) ? parsed.what_i_found.structural_elements.foundation : [],
        stairs: Array.isArray(parsed?.what_i_found?.structural_elements?.stairs) ? parsed.what_i_found.structural_elements.stairs : []
      },
      roofing: Array.isArray(parsed?.what_i_found?.roofing) ? parsed.what_i_found.roofing : [],
      electrical: Array.isArray(parsed?.what_i_found?.electrical) ? parsed.what_i_found.electrical : [],
      plumbing: Array.isArray(parsed?.what_i_found?.plumbing) ? parsed.what_i_found.plumbing : [],
      general_notes: Array.isArray(parsed?.what_i_found?.general_notes) ? parsed.what_i_found.general_notes : [],
      visible_schedules: Array.isArray(parsed?.what_i_found?.visible_schedules) ? parsed.what_i_found.visible_schedules : [],
      preserved_units: Array.isArray(parsed?.what_i_found?.preserved_units) ? parsed.what_i_found.preserved_units : ["mm", "m", "m²"]
    },
    construction_components: Array.isArray(parsed?.construction_components) && parsed.construction_components.length > 0
      ? parsed.construction_components
      : getBaselineComponents(),
    material_requirements: Array.isArray(parsed?.material_requirements) ? parsed.material_requirements : [],
    estimated_requirements: {
      calculated_items: Array.isArray(parsed?.estimated_requirements?.calculated_items) ? parsed.estimated_requirements.calculated_items : [],
      inferred_estimates: Array.isArray(parsed?.estimated_requirements?.inferred_estimates) ? parsed.estimated_requirements.inferred_estimates : [],
      insufficient_information_notice: parsed?.estimated_requirements?.insufficient_information_notice || null
    },
    missing_information: {
      missing_critical_items: Array.isArray(parsed?.missing_information?.missing_critical_items) ? parsed.missing_information.missing_critical_items : [
        "Reinforcement schedule (bar bending schedule)",
        "Concrete characteristic strength grade",
        "Foundation depth and footing detail",
        "Door and window schedule"
      ],
      impact_assessment: parsed?.missing_information?.impact_assessment || "Absent technical specifications prevent exact structural costing and require professional verification."
    },
    potential_issues_to_verify: {
      verification_items: Array.isArray(parsed?.potential_issues_to_verify?.verification_items) ? parsed.potential_issues_to_verify.verification_items : [],
      disclaimer: "Requires professional verification. Shurefire AI is an intelligent engineering analysis assistant, not a replacement for a licensed architect, structural engineer, quantity surveyor, or other certified professional."
    },
    construction_recommendations: {
      document_derived_recommendations: Array.isArray(parsed?.construction_recommendations?.document_derived_recommendations)
        ? parsed.construction_recommendations.document_derived_recommendations
        : ["Confirm dimensional consistency on site before commencing foundation setting out."],
      general_construction_guidance: Array.isArray(parsed?.construction_recommendations?.general_construction_guidance)
        ? parsed.construction_recommendations.general_construction_guidance
        : [
          "Stage material procurement according to structural timeline: Cement and Rebar first.",
          "Ensure continuous wet curing of cast concrete elements for a minimum of 14 days."
        ]
    },
    building_cost_analysis: {
      cost_status: parsed?.building_cost_analysis?.cost_status || "NOT AVAILABLE",
      preliminary_budget_band: parsed?.building_cost_analysis?.preliminary_budget_band || null,
      analysis_notes: parsed?.building_cost_analysis?.analysis_notes || "Cost estimates require confirmed quantities and regional pricing validation."
    }
  };
}

function getBaselineComponents() {
  const categories = [
    "Site preparation", "Foundation", "Ground floor/slab", "Blockwork",
    "Columns", "Beams", "Suspended slabs", "Roofing", "Doors",
    "Windows", "Plumbing", "Electrical", "Finishes", "External works"
  ];
  return categories.map((name, i) => ({
    category_id: i + 1,
    category_name: name,
    present: false,
    details: "Not clearly depicted in current sheet.",
    evidence_level: "UNKNOWN" as const,
    key_items: []
  }));
}

// Interactive chat function grounded in the analyzed document + Shurefire verified prices
export async function chatAboutDocument(
  docRecord: UserDocumentRecord,
  userMessage: string,
  aiClient: GoogleGenAI
): Promise<{ reply: string; evidenceLevel: "EXPLICIT" | "CALCULATED" | "ESTIMATED" | "MARKET-BASED" | "UNKNOWN"; citations: string[] }> {
  const analysisContext = docRecord.analysis ? JSON.stringify(docRecord.analysis, null, 2) : "No prior analysis available.";
  
  // Recent chat context
  const previousTurns = (docRecord.chatMessages || [])
    .slice(-6)
    .map(m => `${m.role === "user" ? "User" : "Shurefire AI"}: ${m.content}`)
    .join("\n\n");

  const systemPrompt = `You are Shurefire's Construction Document Intelligence Assistant.
You are in a live technical conversation with a user about their uploaded building document ("${docRecord.filename}").

DOCUMENT CONTEXT & EXTRACTED DATA:
${analysisContext}

PREVIOUS CONVERSATION:
${previousTurns}

GROUNDING AND TRUST RULES:
1. Base all answers strictly on the facts, dimensions, and schedules extracted from the uploaded document.
2. Label your findings according to the four levels:
   - [EXPLICIT] for facts readable directly in the drawing.
   - [CALCULATED] for values derived mathematically from dimensions.
   - [ESTIMATED] for engineering approximations.
   - [UNKNOWN] when information is missing or not provided in the drawing.
3. If the user asks about current Nigerian building material prices (e.g. Dangote cement in Lagos, TMT rebar, sand, granite):
   - You may reference verified Shurefire Nigerian market benchmarks:
     • Dangote 3X 42.5R Cement: ~₦7,800 - ₦8,300 per 50kg bag (Lagos trade depots)
     • High-Yield 16mm TMT Rebar: ~₦13,500 - ₦14,200 per length
     • High-Yield 12mm TMT Rebar: ~₦8,300 - ₦8,800 per length
     • 9" Sandcrete Hollow Blocks: ~₦780 - ₦850 each
     • Sharp River Sand: ~₦135,000 per 20-ton tipper
     • 3/4" Blue Granite: ~₦275,000 per 20-ton tipper
   - Clearly label these rates as [MARKET-BASED (Shurefire Sovereign Rates)].
4. Never pretend missing engineering information exists (e.g. soil condition or rebar design if not in drawing).
5. Always remind the user that preliminary estimates require sign-off by a licensed architect or engineer.`;

  const models = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];
  for (const model of models) {
    try {
      const response = await aiClient.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [{ text: `User Question: "${userMessage}"\n\nProvide a clear, structured, engineering-grounded response.` }]
          }
        ],
        config: {
          systemInstruction: systemPrompt
        }
      });

      const reply = response.text || "I was unable to analyze this question against the document.";
      const citations = [docRecord.filename];
      if (/price|cost|naira|₦|rate|market/i.test(userMessage)) {
        citations.push("Shurefire Sovereign Market Benchmarks");
      }

      let evidenceLevel: "EXPLICIT" | "CALCULATED" | "ESTIMATED" | "MARKET-BASED" | "UNKNOWN" = "EXPLICIT";
      if (/market-based/i.test(reply) || /sovereign/i.test(reply)) {
        evidenceLevel = "MARKET-BASED";
      } else if (/calculated/i.test(reply)) {
        evidenceLevel = "CALCULATED";
      } else if (/estimated/i.test(reply)) {
        evidenceLevel = "ESTIMATED";
      } else if (/unknown|not specified|cannot be determined/i.test(reply)) {
        evidenceLevel = "UNKNOWN";
      }

      return { reply, evidenceLevel, citations };
    } catch (err: any) {
      console.warn(`[Document Chat] Model ${model} error:`, err?.message || err);
    }
  }

  return {
    reply: "I could not process your question due to a temporary service disruption. Please try again.",
    evidenceLevel: "UNKNOWN",
    citations: [docRecord.filename]
  };
}
