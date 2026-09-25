export enum MaterialCategory {
  CEMENT_BINDERS = "Cement & Binders",
  STEEL_REBARS = "Steel & Rebars",
  ROOFING_CEILING = "Roofing & Ceiling",
  PLUMBING_SANETARY = "Plumbing & Sanitary",
  TILES_FINISHING = "Tiles & Finishing",
  ELECTRICAL_WIRING = "Electrical & Wiring",
  WOOD_TIMBER = "Wood & Timber",
  BLOCKS_AGGREGATES = "Blocks & Aggregates",
}

export type SupplyRegion = "Lagos" | "Abuja" | "Port Harcourt" | "Kano" | "Kaduna" | "Enugu" | "Ibadan";

export interface Supplier {
  id: string;
  name: string;
  marketName: string; // e.g. Coker, Dei-Dei, Mile 3, Sabon Gari
  city: string;
  state: SupplyRegion;
  contactPhone: string;
  rating: number;
  isVerified: boolean;
  apiConnected: boolean;
  apiLatencyMs: number;
}

export interface MaterialItem {
  id: string;
  name: string;
  category: MaterialCategory;
  price: number; // in Naira (NGN)
  unit: string; // e.g. "50kg Bag", "Ton", "Length (12m)", "Square Meter (SQM)", "Bundle"
  brand: string;
  supplierId: string;
  supplierName: string;
  supplierCity: string;
  supplierState: SupplyRegion;
  stockLevel: number;
  lastVerified: string; // ISO String
  specifications: string;
  isLiveStockSynced: boolean;
  priceTrend: "up" | "down" | "stable";
}

export interface PriceTrendPoint {
  date: string;
  averagePrice: number;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface SearchResultItem {
  id: string;
  title: string;
  snippet: string;
  fullContent: string;
  url: string;
  siteName: string;
}

export interface AISearchResult {
  answer: string;
  featuredAnswer: string;
  searchResults?: SearchResultItem[];
  groundingSources: GroundingSource[];
  simulatedApiLogs: {
    supplierId: string;
    supplierName: string;
    status: "success" | "offline" | "slow";
    latencyMs: number;
    stockFound: number;
  }[];
  localMaterials: MaterialItem[];
}

export interface QuantityEstimate {
  materialName: string;
  category: MaterialCategory;
  calculatedQuantity: number;
  unit: string;
  averagePriceNaira: number;
  totalCostNaira: number;
  explanation: string;
}

export interface ProjectQuantityCalculatorResult {
  projectName: string;
  projectDescription: string;
  estimates: QuantityEstimate[];
  grandTotalNaira: number;
  reassuringNotes: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  category: string;
  region: string;
  materialsNeeded: string;
  projectStage: string;
  timeline: string;
  source: string;
  status: "new" | "contacting" | "passed_to_merchant" | "closed";
  createdAt: string;
}
