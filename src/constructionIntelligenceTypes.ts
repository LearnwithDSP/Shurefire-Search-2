// Phase 5A: Construction Intelligence Types & Data Structures

export type EvidenceLevel =
  | "FOUND_IN_DOCUMENT"
  | "RETRIEVED_FROM_SHUREFIRE"
  | "CALCULATED"
  | "ESTIMATED"
  | "ASSUMED"
  | "UNKNOWN";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export type IntelligenceActionType =
  | "cement_requirement"
  | "cost_estimate"
  | "procurement_priority"
  | "preliminary_boq"
  | "missing_information"
  | "rebar_requirement";

export interface ProjectIntelligenceProfile {
  id: string;
  projectName: string;
  projectType: string;
  buildingType: string;
  floors: number | null;
  units: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  rooms: string[];
  floorArea: number | null; // in m²
  buildingFootprint: number | null; // in m²
  location: string;
  projectDescription: string;
  hasStructuralDrawings: boolean;
  hasReinforcementSchedule: boolean;
  architecturalFeatures: string[];
  structuralFeatures: string[];
  services: string[];
  materialsMentioned: string[];
  explicitQuantities: Array<{
    item: string;
    quantity: string | number;
    unit: string;
    locationInDoc?: string;
  }>;
  dimensions: Array<{
    element: string;
    dimension: string;
    areaM2?: number;
  }>;
  detectedSpecifications: string[];
  missingInformation: string[];
  assumptionsRequired: string[];
  confidence: {
    overall: ConfidenceLevel;
    dimensions: ConfidenceLevel;
    materials: ConfidenceLevel;
    structural: ConfidenceLevel;
  };
  sourcePages: string[];
  analysisWarnings: string[];
  createdAt: string;
}

export interface ShurefireKnowledgeSource {
  id?: string;
  title: string;
  domain: string;
  url: string;
  similarity: number;
  sourceType: string;
  excerpt?: string;
}

export interface BOQItem {
  itemNo: number;
  category: string;
  description: string;
  quantity: number | string;
  unit: string;
  unitRate: number;
  amount: number;
  basis: string;
  confidence: ConfidenceLevel;
  evidenceLevel: EvidenceLevel;
}

export interface ProcurementItem {
  material: string;
  estimatedQuantity: string;
  unit: string;
  reason: string;
  constructionStage: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  basis: string;
  evidenceLevel: EvidenceLevel;
}

export interface ProcurementGroup {
  group: "BUY NOW" | "BUY NEXT" | "BUY LATER" | "DO NOT BUY YET";
  description: string;
  items: ProcurementItem[];
}

export interface MissingInfoItem {
  category: "CRITICAL" | "IMPORTANT" | "OPTIONAL";
  item: string;
  whyItMatters: string;
  recommendedAction: string;
}

export interface ProjectCompletenessAudit {
  completenessPercent: number;
  foundItems: string[];
  missingItems: MissingInfoItem[];
  mostImportantNextDocument: string;
}

export interface BreakdownItem {
  item: string;
  quantity?: string | number;
  unit?: string;
  rate?: number;
  amount?: number;
  explanation?: string;
  evidenceLevel: EvidenceLevel;
  confidence: ConfidenceLevel;
}

export interface DetectedFact {
  label: string;
  value: string;
  evidenceLevel: EvidenceLevel;
}

export interface MaterialBreakdownRow {
  material: string;
  estimatedQuantity: string;
  unit: string;
  evidenceLevel: EvidenceLevel;
}

export interface EvidenceTally {
  foundInDocument: number;
  calculated: number;
  retrievedFromShurefire: number;
  estimated: number;
  assumed: number;
  unknown: number;
}

export interface RebarScheduleRow {
  barDiameter: string;
  length: string;
  numberOfBars: number;
  totalLengthM: number;
  estimatedWeightTonnes: string | number;
  evidenceLevel: EvidenceLevel;
}

export interface CategoryCostRange {
  category: string;
  lowAmountNaira: number;
  highAmountNaira: number;
  evidenceLevel: EvidenceLevel;
}

export interface CementStageRequirement {
  stage: string;
  bags: number;
  unit: string;
  mixRatio: string;
  evidenceLevel: EvidenceLevel;
}

export interface ConstructionActionResult {
  title: string;
  shortAnswer: string;
  directAnswer?: string;
  whatShurefireFound?: DetectedFact[];
  evidenceSummary?: EvidenceTally;
  materialBreakdownTable?: MaterialBreakdownRow[];
  calculationAnalysis?: string[];
  rebarScheduleTable?: RebarScheduleRow[];
  categoryCostRanges?: CategoryCostRange[];
  cementStages?: CementStageRequirement[];
  projectInformationUsed: Record<string, any>;
  result: any;
  breakdown: BreakdownItem[];
  basisCalculation: string;
  shurefireSources: ShurefireKnowledgeSource[];
  assumptions: string[];
  whatIsUnknown: string[];
  confidence: ConfidenceLevel;
  importantNote: string;
  action: IntelligenceActionType;
  projectId: string;
  createdAt: string;
}
