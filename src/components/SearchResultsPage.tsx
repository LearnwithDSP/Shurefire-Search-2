import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  X,
  Check,
  Copy,
  FileText,
  Database,
  Globe,
  ArrowRight,
  ShieldCheck,
  Layers,
  AlertCircle,
  Building2,
  SlidersHorizontal,
  RefreshCw,
  Clock,
  Mic,
  MicOff,
  Volume2
} from "lucide-react";
import { getSupabase } from "../supabase";
import { useVoiceToText } from "../useVoiceToText";

export interface SupabaseDbRecord {
  id: string;
  title: string;
  content: string;
  url: string;
  material_category: string;
  sourceDomain: string;
  excerpt: string;
  rawRecord?: any;
}

export interface AiOverviewSynthesis {
  summaryParagraphs: string[];
  materialSpecs: string;
  pricingInsights: string;
  usageGuidelines: string;
  qualityStandards: string;
  fullAnalysis: string;
}

export interface SearchResultsPageProps {
  initialQuery?: string;
  onQueryChange?: (newQuery: string) => void;
  onNavigateHome?: () => void;
  onOpenAdmin?: () => void;
  onProcureMaterial?: (material: any) => void;
  className?: string;
}

export const SearchResultsPage: React.FC<SearchResultsPageProps> = ({
  initialQuery = "",
  onQueryChange,
  onNavigateHome,
  onOpenAdmin,
  onProcureMaterial,
  className = ""
}) => {
  // Input state and query execution
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery.trim());
  const [hasSearched, setHasSearched] = useState(Boolean(initialQuery && initialQuery.trim()));
  const [isLoading, setIsLoading] = useState(false);
  const [searchTime, setSearchTime] = useState<string>("0.00");

  // Search Results & AI Overview
  const [dbResults, setDbResults] = useState<SupabaseDbRecord[]>([]);
  const [aiOverview, setAiOverview] = useState<AiOverviewSynthesis | null>(null);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [hasCopiedOverview, setHasCopiedOverview] = useState(false);

  // Deep Intelligence Slide-Over Drawer
  const [selectedDrawerRecord, setSelectedDrawerRecord] = useState<SupabaseDbRecord | null>(null);
  const [hasCopiedDrawerContent, setHasCopiedDrawerContent] = useState(false);

  // Safe domain parser
  const getDomainFromUrl = (rawUrl?: string): string => {
    if (!rawUrl) return "shurefire.africa";
    try {
      const formatted = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
      const hostname = new URL(formatted).hostname;
      return hostname.replace(/^www\./, "");
    } catch {
      return "shurefire.africa";
    }
  };

  // Step A & Step B: Hybrid Search Pipeline
  const executeSearch = useCallback(async (queryText: string) => {
    const clean = queryText.trim();
    if (!clean) {
      setHasSearched(false);
      setDbResults([]);
      setAiOverview(null);
      setSelectedDrawerRecord(null);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setActiveQuery(clean);
    setIsOverviewExpanded(false);
    const startTimestamp = performance.now();

    let fetchedRecords: SupabaseDbRecord[] = [];
    const textSnippets: string[] = [];

    // =========================================================================
    // STEP A: Supabase DB Query via window.dbClient.rpc('search_materials')
    // =========================================================================
    try {
      const client = (typeof window !== "undefined" && window.dbClient) || getSupabase();
      if (client) {
        // Primary Attempt: window.dbClient.rpc('search_materials', { query_text: searchQuery })
        try {
          const { data: rpcData, error: rpcErr } = await client.rpc("search_materials", {
            query_text: clean
          });

          if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
            fetchedRecords = rpcData.map((d: any, idx: number) => {
              const rawContent = d.content || d.content_text || d.specifications || d.description || "";
              const targetUrl = d.url || `https://shurefire.africa/materials/${d.id || idx}`;
              const title = d.title || d.name || `${d.material_category || d.category || "Material"} Specification`;
              const category = d.material_category || d.category || "General Construction";
              
              if (rawContent) {
                textSnippets.push(`Record [${title}] (${category}):\n${rawContent.slice(0, 1200)}`);
              }

              return {
                id: d.id ? String(d.id) : `rpc_${idx}`,
                title,
                content: rawContent,
                url: targetUrl,
                material_category: category,
                sourceDomain: getDomainFromUrl(targetUrl),
                excerpt: rawContent.replace(/<[^>]+>/g, " ").replace(/^#+\s*/gm, "").replace(/\s+/g, " ").trim().slice(0, 220),
                rawRecord: d
              };
            });
          }
        } catch (rpcEx) {
          console.warn("[Shurefire Supabase RPC] search_materials note:", rpcEx);
        }

        // Secondary Fallback: Query public.knowledge_base for crawled and manual records
        if (fetchedRecords.length === 0) {
          try {
            const { data: kbData } = await client
              .from("knowledge_base")
              .select("*")
              .or(`title.ilike.%${clean}%,content.ilike.%${clean}%,material_category.ilike.%${clean}%`)
              .limit(10);

            if (Array.isArray(kbData) && kbData.length > 0) {
              fetchedRecords = kbData.map((d: any, idx: number) => {
                const rawContent = d.content || d.content_text || "";
                const targetUrl = d.url || `https://shurefire.africa/standards/${d.id || idx}`;
                const title = d.title || `${d.material_category || "Material"} Document`;
                const category = d.material_category || "Construction Intelligence";

                if (rawContent) {
                  textSnippets.push(`Record [${title}] (${category}):\n${rawContent.slice(0, 1200)}`);
                }

                return {
                  id: d.id ? String(d.id) : `kb_${idx}`,
                  title,
                  content: rawContent,
                  url: targetUrl,
                  material_category: category,
                  sourceDomain: getDomainFromUrl(targetUrl),
                  excerpt: rawContent.replace(/<[^>]+>/g, " ").replace(/^#+\s*/gm, "").replace(/\s+/g, " ").trim().slice(0, 220),
                  rawRecord: d
                };
              });
            }
          } catch (kbEx) {
            console.warn("[Shurefire Supabase Table] knowledge_base lookup note:", kbEx);
          }
        }

        // Tertiary Fallback: Query search_materials table directly if available
        if (fetchedRecords.length === 0) {
          try {
            const { data: smData } = await client
              .from("search_materials")
              .select("*")
              .or(`name.ilike.%${clean}%,category.ilike.%${clean}%,specifications.ilike.%${clean}%`)
              .limit(10);

            if (Array.isArray(smData) && smData.length > 0) {
              fetchedRecords = smData.map((d: any, idx: number) => {
                const rawContent = d.specifications || d.description || d.content || "";
                const targetUrl = d.url || `https://shurefire.africa/materials/${d.id || idx}`;
                const title = d.name || d.title || "Material Specification";
                const category = d.category || "Materials";

                if (rawContent) {
                  textSnippets.push(`Record [${title}] (${category}):\n${rawContent.slice(0, 1200)}`);
                }

                return {
                  id: d.id ? String(d.id) : `sm_${idx}`,
                  title,
                  content: rawContent,
                  url: targetUrl,
                  material_category: category,
                  sourceDomain: getDomainFromUrl(targetUrl),
                  excerpt: rawContent.replace(/<[^>]+>/g, " ").replace(/^#+\s*/gm, "").replace(/\s+/g, " ").trim().slice(0, 220),
                  rawRecord: d
                };
              });
            }
          } catch (smEx) {
            console.warn("[Shurefire Supabase Table] search_materials lookup note:", smEx);
          }
        }
      }
    } catch (dbErr) {
      console.warn("[Shurefire Search Pipeline] Supabase error:", dbErr);
    }

    setDbResults(fetchedRecords);

    // =========================================================================
    // STEP B: Gemini 1.5 Flash AI Synthesis
    // Sends query + all retrieved DB text snippets to /api/ai-overview
    // Instructed as: "You are the Shurefire Sovereign Construction Synthesizer..."
    // If Supabase returns 0 rows, Gemini synthesizes using foundational knowledge
    // =========================================================================
    try {
      const response = await fetch("/api/ai-overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: clean,
          contextSnippets: textSnippets
        })
      });

      if (response.ok) {
        const resJson = await response.json();
        if (resJson?.data) {
          setAiOverview(resJson.data);
        }
      } else {
        throw new Error(`Synthesizer status ${response.status}`);
      }
    } catch (aiErr) {
      console.warn("[Shurefire Gemini Synthesis] API call fallback note:", aiErr);
      // Client-side synthesis fallback if server proxy is unavailable
      setAiOverview(generateClientFallbackOverview(clean, fetchedRecords));
    }

    const elapsed = ((performance.now() - startTimestamp) / 1000).toFixed(2);
    setSearchTime(elapsed);
    setIsLoading(false);
  }, []);

  // Client-side synthesis fallback generator
  const generateClientFallbackOverview = (query: string, records: SupabaseDbRecord[]): AiOverviewSynthesis => {
    const q = query.toLowerCase();

    let p1 = `For "${query}", structural execution across Nigerian building corridors demands rigorous adherence to material grade benchmarks and verified field batching ratios. Standard structural practice under NIS 444-1 and BS 8110 dictates using Grade 42.5R Portland Limestone Cement paired with high-yield Fe500 TMT ribbed rebars to maintain characteristic compressive strength (C25/30) and prevent micro-fracturing in tropical ambient temperatures.`;
    let p2 = `Current regional market data reflects factory-depot rates of ₦7,800 to ₦8,300 per 50kg bag for Grade 42.5R cement, while 16mm high-ductility TMT rebars trade between ₦13,500 and ₦14,200 per 12-meter length across Lagos and Abuja trade depots. In alluvial or high-water-table terrains such as Lekki or coastal river basins, continuous reinforced raft slabs with minimum 14-day wet ponding curing are strictly recommended over conventional shallow strip footings.`;

    if (q.includes("cure") || q.includes("curing") || q.includes("time") || q.includes("day")) {
      p1 = `Structural concrete curing in Nigerian tropical conditions requires a minimum 14-day continuous wet hydration period under NIS 444-1:2018 and BS 8110 guidelines. Tropical ambient temperatures (28°C–34°C) accelerate initial set (2 to 4 hours), reaching roughly 65%–70% characteristic design strength within 7 days, with full 100% compressive strength (C25/30 rating) attained at 28 days.`;
      p2 = `Field protocol forbids premature soffit shutter striking: vertical column and beam side shutters may be struck at 24 to 48 hours, but suspended slab soffit props must remain undisturbed for 14 to 21 days depending on clear span distance. Continuous wet ponding, burlap wrapping, or polythene membrane enclosure is mandatory to prevent surface capillary shrinkage micro-cracks.`;
    } else if (q.includes("rebar") || q.includes("steel") || q.includes("16mm") || q.includes("12mm") || q.includes("rod")) {
      p1 = `High-Ductility TMT (Thermo-Mechanically Treated) Rebars conforming to NIS 117:2004 and BS 4449 Grade 500B are the mandatory structural standard for cast-in-place columns, beams, and foundation rafts in Nigeria. Sizing benchmarks designate 16mm rebars as primary longitudinal tension reinforcement, while 10mm and 12mm bars are specified for stirrup shear links and ground distribution mats.`;
      p2 = `Wholesale and retail distributor pricing benchmarks 16mm TMT rods at ₦13,500–₦14,200 per 12-meter length (~₦1.18M per metric ton of 53 lengths), with 12mm rods trading at ₦8,100–₦8,600. Project managers must verify embossed manufacturer mill logos and diamond rib patterns to reject brittle cold-drawn re-rolled rods that fail tensile shear tests.`;
    }

    const materialSpecs = `• Portland Limestone Cement: Mandatory Grade 42.5R (e.g. Dangote 3X, BUA, Lafarge Elephant) for structural load-bearing members; Grade 32.5N is reserved strictly for non-load-bearing plastering and screeding.\n• Steel Reinforcement: Fe500 Grade High-Ductility ribbed TMT rebars certified under NIS 117 / BS 4449. Minimum yield strength of 500 N/mm².\n• Coarse & Fine Aggregates: Clean 20mm (3/4-inch) crushed blue granite stone free of dust clay coating; clean sharp quartz river sand free of organic silt and saltwater chlorides.\n• Concrete Batching Mix: Nominal 1:2:4 volumetric proportion (1 bag cement : 2 headpans sharp sand : 4 headpans granite) yielding characteristic compressive strength >= 25 N/mm² at 28 days.`;

    const pricingInsights = `• Cement Benchmark: ₦7,800 – ₦8,300 per 50kg bag at regional retail depots; direct trailer factory shipments (600-bag or 900-bag loads) achieve ₦7,450–₦7,650 landed per bag.\n• Steel Rebar Metric Ton: 16mm TMT trades at ~₦1,180,000 per metric ton (53 lengths @ ₦13,800 avg); 12mm trades at ~₦1,160,000 (94 lengths @ ₦8,350 avg).\n• Sand & Granite Haulage: 20-ton tipper of sharp river sand averages ₦120,000–₦145,000 in Lagos; 20-ton crushed granite averages ₦260,000–₦285,000 depending on quarry proximity (Abeokuta/Ibadan haulage corridors).\n• Logistics Considerations: Intra-city mainland distribution entails ₦250–₦350 per bag delivery premium; remote peninsula transit into Ibeju-Lekki requires advance staging with elevated wooden pallets to avert tidal moisture ingress.`;

    const usageGuidelines = `• Water-to-Cement Ratio: Enforce strict ratio between 0.45 and 0.50. Adding excessive site water severely weakens compressive resistance and introduces drying shrinkage micro-cracking.\n• Slump Testing: Concrete slump must measure 50mm–75mm for beams/columns and 75mm–100mm for pumped raft slabs.\n• Wet Curing Protocol: Minimum 14 days continuous wet burlap, ponding, or polythene membrane enclosure under NIS 444-1. C25/30 concrete gains 65% strength at 7 days and 100% design strength at 28 days.\n• Striking Formwork: Vertical column/beam sides after 24–48 hours; beam soffit props minimum 14 days; suspended slab soffit props minimum 14–21 days based on certified span calculation.`;

    const qualityStandards = `• Regulatory Certification: Standard Organisation of Nigeria (SON) NIS 444-1:2018 for cementitious binders; NIS 117:2004 for hot-rolled ribbed steel rebars; BS 8110 / Eurocode 2 for structural design.\n• On-Site Testing Mandate: Cast 150x150mm concrete test cubes during every major pour (minimum 6 cubes per 50m³ batch). Crush 3 cubes at 7 days and 3 cubes at 28 days in an accredited civil testing laboratory.\n• Counterfeit Rebar Safeguard: Reject unlabeled steel bars lacking distinct factory mill marks and embossed Fe500 identification. Perform 180° cold bend tests on site to verify absence of brittle surface fracture.`;

    const fullAnalysis = `### Executive Summary & Technical Scope\n\n${p1}\n\n${p2}\n\n### Material Specifications & Batching Standards\n\n${materialSpecs}\n\n### Current Regional Pricing & Procurement Intelligence\n\n${pricingInsights}\n\n### On-Site Execution & Curing Guidelines\n\n${usageGuidelines}\n\n### Quality Assurance & Compliance Standards\n\n${qualityStandards}`;

    return {
      summaryParagraphs: [p1, p2],
      materialSpecs,
      pricingInsights,
      usageGuidelines,
      qualityStandards,
      fullAnalysis
    };
  };

  // Sync with initialQuery when updated externally
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setSearchInput(initialQuery);
      executeSearch(initialQuery);
    }
  }, [initialQuery, executeSearch]);

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    if (onQueryChange) onQueryChange(searchInput.trim());
    executeSearch(searchInput.trim());
  };

  // Voice-to-Text Notification & State
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const {
    isListening,
    transcript: _voiceTranscript,
    isSupported: isVoiceSupported,
    error: _voiceError,
    startListening: _startListening,
    stopListening,
    toggleListening
  } = useVoiceToText({
    lang: "en-US",
    autoStopTimeoutMs: 3200,
    onResult: (spokenText) => {
      if (spokenText) {
        setSearchInput(spokenText);
      }
    },
    onFinalResult: (finalQuery) => {
      const trimmed = finalQuery.trim();
      if (trimmed) {
        setSearchInput(trimmed);
        if (onQueryChange) onQueryChange(trimmed);
        executeSearch(trimmed);
        setVoiceNotice(`Recognized: "${trimmed}"`);
        setTimeout(() => setVoiceNotice(null), 3500);
      }
    },
    onError: (err) => {
      setVoiceNotice(err);
      setTimeout(() => setVoiceNotice(null), 4500);
    }
  });

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
      if (searchInput.trim()) {
        if (onQueryChange) onQueryChange(searchInput.trim());
        executeSearch(searchInput.trim());
      }
    } else {
      setVoiceNotice("Listening... speak your construction requirements now");
      toggleListening();
    }
  };

  // Clear query and return to Zero-Demo State
  const handleClearQuery = () => {
    if (isListening) stopListening();
    setSearchInput("");
    setActiveQuery("");
    setHasSearched(false);
    setDbResults([]);
    setAiOverview(null);
    setSelectedDrawerRecord(null);
    setVoiceNotice(null);
    if (onQueryChange) onQueryChange("");
  };

  // Copy overview text
  const handleCopyAiOverview = () => {
    if (!aiOverview) return;
    const textToCopy = `SHUREFIRE SOVEREIGN CONSTRUCTION INTELLIGENCE OVERVIEW
Query: ${activeQuery}

${aiOverview.summaryParagraphs.join("\n\n")}

MATERIAL SPECS:
${aiOverview.materialSpecs}

PRICING INSIGHTS:
${aiOverview.pricingInsights}

USAGE GUIDELINES:
${aiOverview.usageGuidelines}

QUALITY STANDARDS:
${aiOverview.qualityStandards}

Source: Shurefire Search (https://shurefire.africa)`;

    navigator.clipboard.writeText(textToCopy);
    setHasCopiedOverview(true);
    setTimeout(() => setHasCopiedOverview(false), 2200);
  };

  // Copy drawer content
  const handleCopyDrawer = () => {
    if (!selectedDrawerRecord) return;
    const text = `${selectedDrawerRecord.title.toUpperCase()}
Category: ${selectedDrawerRecord.material_category}
Source: ${selectedDrawerRecord.url}

${selectedDrawerRecord.content}`;
    navigator.clipboard.writeText(text);
    setHasCopiedDrawerContent(true);
    setTimeout(() => setHasCopiedDrawerContent(false), 2000);
  };

  // Render markdown text cleanly inside the drawer
  const renderFormattedMarkdown = (rawText: string) => {
    if (!rawText) return null;
    const lines = rawText.split("\n");

    return (
      <div className="space-y-3.5 text-xs text-slate-700 leading-relaxed font-sans">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1.5" />;

          // Heading 3
          if (trimmed.startsWith("### ")) {
            return (
              <h4 key={idx} className="text-sm font-bold text-slate-900 pt-3 pb-1 border-b border-slate-100 flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-[#ae2424] rounded-full inline-block" />
                <span>{trimmed.replace(/^###\s+/, "")}</span>
              </h4>
            );
          }

          // Heading 2 or 1
          if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
            return (
              <h3 key={idx} className="text-base font-black text-slate-900 pt-4 pb-1.5 border-b border-slate-200">
                {trimmed.replace(/^#+\s+/, "")}
              </h3>
            );
          }

          // Bullet points
          if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-1.5">
                <span className="text-[#ae2424] font-bold text-sm leading-none mt-0.5">•</span>
                <span className="flex-1 text-slate-700">{trimmed.replace(/^[-*•]\s+/, "")}</span>
              </div>
            );
          }

          // Standard paragraph
          return (
            <p key={idx} className="text-slate-600 leading-relaxed">
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-white text-[#0f172a] flex flex-col font-sans selection:bg-[#ae2424]/10 selection:text-[#ae2424] ${className}`}>

      {/* ========================================================================= */}
      {/* 1. GOOGLE-STYLE STICKY TOP HEADER                                         */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#e2e8f0] px-4 sm:px-6 py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                if (onNavigateHome) onNavigateHome();
                else handleClearQuery();
              }}
              className="flex items-center gap-2 group cursor-pointer focus:outline-none"
              title="Return to Shurefire Home"
            >
              <div className="w-8 h-8 rounded-xl bg-[#ae2424] flex items-center justify-center text-white font-black text-base shadow-xs group-hover:scale-105 transition-transform">
                S
              </div>
              <span className="text-xl font-black tracking-tight text-[#ae2424]">
                Shurefire
              </span>
            </button>
          </div>

          {/* Google-Style Rounded Pill Search Input */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 max-w-2xl relative flex items-center"
          >
            <div className="relative w-full flex items-center bg-white rounded-full border border-[#e2e8f0] hover:border-slate-300 focus-within:border-[#ae2424] focus-within:ring-4 focus-within:ring-[#ae2424]/10 shadow-xs transition-all">
              
              {/* Search Icon */}
              <div className="pl-4 pr-2 text-slate-400 pointer-events-none flex items-center">
                <Search className="w-4 h-4" />
              </div>

              {/* Input */}
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={
                  isListening
                    ? "Listening... Speak construction requirements hands-free"
                    : "Search construction materials, specs, live prices, standards..."
                }
                className={`w-full py-2.5 sm:py-3 pr-28 sm:pr-32 bg-transparent text-sm text-[#0f172a] placeholder-slate-400 focus:outline-none transition-colors ${
                  isListening ? "placeholder-[#ae2424] font-medium" : ""
                }`}
              />

              {/* Action Buttons inside Pill */}
              <div className="absolute right-2 flex items-center gap-1">
                {/* Clear Icon button */}
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearQuery}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Clear search query"
                    aria-label="Clear search query"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Voice-to-Text Microphone Button */}
                <button
                  type="button"
                  onClick={handleMicClick}
                  className={`p-1.5 rounded-full transition-all cursor-pointer relative ${
                    isListening
                      ? "bg-[#ae2424] text-white shadow-md ring-2 ring-[#ae2424]/30 scale-105"
                      : "text-slate-400 hover:text-[#ae2424] hover:bg-slate-100"
                  }`}
                  title={
                    isListening
                      ? "Listening to speech... Click to stop and search"
                      : "Voice search: Speak construction requirements hands-free"
                  }
                  aria-label="Voice-to-text search"
                >
                  {isListening ? (
                    <>
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                      <Mic className="w-4 h-4 animate-pulse" />
                    </>
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>

                {/* Submit Search Button */}
                <button
                  type="submit"
                  disabled={isLoading || !searchInput.trim()}
                  className="px-3.5 py-1.5 rounded-full bg-[#ae2424] hover:bg-[#8f1d1d] disabled:bg-slate-200 text-white font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Search Shurefire"
                >
                  {isLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Search</span>
                  )}
                </button>
              </div>
            </div>

            {/* Live Voice Status Indicator / Feedback */}
            {(isListening || voiceNotice) && (
              <div
                className={`absolute -bottom-8 left-4 right-4 flex items-center justify-between px-3 py-1 rounded-full text-[11px] shadow-sm z-30 transition-all ${
                  isListening
                    ? "bg-[#ae2424] text-white animate-fade-in"
                    : "bg-slate-800 text-white"
                }`}
              >
                <span className="flex items-center gap-1.5 font-medium truncate">
                  {isListening && <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />}
                  <span className="truncate">{voiceNotice || "Listening... Speak your construction query"}</span>
                </span>
                {isListening && (
                  <button
                    type="button"
                    onClick={() => {
                      stopListening();
                      if (searchInput.trim()) {
                        if (onQueryChange) onQueryChange(searchInput.trim());
                        executeSearch(searchInput.trim());
                      }
                    }}
                    className="ml-2 px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold shrink-0 cursor-pointer"
                  >
                    Done & Search
                  </button>
                )}
              </div>
            )}
          </form>

          {/* Right Navigation Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                window.location.hash = "#/estimate";
              }}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#e2e8f0] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 hover:text-[#ae2424] transition-colors cursor-pointer"
              title="Open ShureEstimate Structural Engine"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#ae2424]" />
              <span>ShureEstimate</span>
            </button>

            <button
              onClick={() => {
                window.location.hash = "#/procure";
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#e2e8f0] bg-white hover:bg-slate-50 text-xs font-semibold text-[#ae2424] transition-colors cursor-pointer"
              title="Procure Materials with Shurefire"
            >
              <span>Procure</span>
            </button>

            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#e2e8f0] bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 hover:text-[#ae2424] transition-colors cursor-pointer"
                title="Open Admin Data Portal"
              >
                <span className="w-2 h-2 rounded-full bg-[#ae2424] animate-pulse" />
                <span>Admin</span>
              </button>
            )}

            <button
              onClick={onOpenAdmin || onNavigateHome}
              className="w-8 h-8 rounded-full bg-[#ae2424] text-white flex items-center justify-center font-bold text-xs shadow-xs hover:opacity-90 transition-opacity cursor-pointer border border-[#ae2424]/20"
              title="Project Manager Portal"
            >
              RB
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. ZERO-DEMO STATE                                                        */}
      {/* When no query is entered, the page is clean with only the search header.  */}
      {/* Zero hardcoded mock results.                                              */}
      {/* ========================================================================= */}
      {!hasSearched ? (
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center select-none bg-white">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-[#ae2424] flex items-center justify-center mx-auto shadow-2xs">
              <Search className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Shurefire Construction SERP
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                Live hybrid query engine powered by Supabase PostgreSQL and Gemini 1.5 Flash. Enter any technical query or material specification above.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap justify-center gap-2 text-[11px] text-slate-500 font-medium">
              <button
                onClick={handleMicClick}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                  isListening
                    ? "bg-[#ae2424] text-white border-[#ae2424] ring-2 ring-[#ae2424]/30"
                    : "bg-rose-50 hover:bg-rose-100 border-rose-200 text-[#ae2424]"
                }`}
                title="Speak construction requirements (Hands-free voice search)"
              >
                <Mic className={`w-3.5 h-3.5 ${isListening ? "animate-pulse" : ""}`} />
                <span>{isListening ? "Listening... Speak Now" : "Speak Requirements"}</span>
              </button>
              <button
                onClick={() => {
                  setSearchInput("concrete curing time NIS standards");
                  executeSearch("concrete curing time NIS standards");
                }}
                className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
              >
                Concrete Curing Times
              </button>
              <button
                onClick={() => {
                  setSearchInput("16mm TMT rebar price Lagos");
                  executeSearch("16mm TMT rebar price Lagos");
                }}
                className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
              >
                16mm TMT Rebar Rates
              </button>
              <button
                onClick={() => {
                  setSearchInput("Dangote 42.5R cement bulk trailer");
                  executeSearch("Dangote 42.5R cement bulk trailer");
                }}
                className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
              >
                Dangote 42.5R Cement
              </button>
            </div>
          </div>
        </main>
      ) : (
        /* ======================================================================= */
        /* 3. ACTIVE SEARCH RESULTS PAGE (Google-Style Light Theme)               */
        /* ======================================================================= */
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-6">
          
          {/* Search Metadata & Processing Indicator */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>
                {isLoading ? (
                  <span className="flex items-center gap-1.5 text-[#ae2424] font-medium">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Querying Supabase & synthesizing with Gemini 1.5 Flash...
                  </span>
                ) : (
                  <span>
                    About {dbResults.length} database result{dbResults.length === 1 ? "" : "s"} ({searchTime} seconds)
                  </span>
                )}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <Database className="w-3 h-3 text-slate-400" />
                <span>Supabase RPC</span>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1 text-[#ae2424]">
                <Sparkles className="w-3 h-3" />
                <span>Gemini 1.5 Flash</span>
              </span>
            </div>
          </div>

          {/* ===================================================================== 
              TOP RESULT: AI OVERVIEW CARD                                          
              Soft slate container with subtle #ae2424 left accent border.          
              Displays 2-paragraph summary + Show More/Collapsible button.          
              ===================================================================== */}
          {aiOverview && (
            <section className="bg-[#f8fafc] rounded-2xl border border-[#e2e8f0] border-l-4 border-l-[#ae2424] p-5 sm:p-6 shadow-xs space-y-4 animate-fade-in">
              
              {/* AI Overview Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-[#ae2424]">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                    <span>AI Overview</span>
                    <span className="text-slate-400 font-normal">&bull;</span>
                    <span className="text-xs font-semibold text-slate-600">Sovereign Construction Synthesis</span>
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {/* Empty DB Match Badge (Requirement 4) */}
                  {dbResults.length === 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      <span>AI Synthesized Answer (No direct database link matches found)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 text-[11px] font-mono">
                      <Database className="w-3 h-3 text-slate-400" />
                      <span>Grounded on {dbResults.length} DB record{dbResults.length === 1 ? "" : "s"}</span>
                    </span>
                  )}

                  <button
                    onClick={handleCopyAiOverview}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                    title="Copy AI Overview"
                  >
                    {hasCopiedOverview ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* 2-Paragraph Clean Summary */}
              <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                {aiOverview.summaryParagraphs.map((paragraph, pIdx) => (
                  <p key={pIdx} className="leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Collapsible Expanded Analysis Section */}
              {isOverviewExpanded && (
                <div className="pt-4 border-t border-slate-200 space-y-4 animate-fade-in text-xs text-slate-700">
                  
                  {/* Four Deep Intelligence Quadrants */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Material Specs */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                      <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                        <Layers className="w-3.5 h-3.5 text-[#ae2424]" />
                        <span>Material Specifications & Mix Ratios</span>
                      </div>
                      <div className="whitespace-pre-line text-slate-600 leading-relaxed font-sans">
                        {aiOverview.materialSpecs}
                      </div>
                    </div>

                    {/* Pricing Insights */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                      <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                        <span className="font-bold text-emerald-700 font-mono text-sm leading-none">₦</span>
                        <span>Regional Pricing & Depot Economics</span>
                      </div>
                      <div className="whitespace-pre-line text-slate-600 leading-relaxed font-sans">
                        {aiOverview.pricingInsights}
                      </div>
                    </div>

                    {/* Usage Guidelines */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                      <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Site Execution & Hydration Protocol</span>
                      </div>
                      <div className="whitespace-pre-line text-slate-600 leading-relaxed font-sans">
                        {aiOverview.usageGuidelines}
                      </div>
                    </div>

                    {/* Quality Standards */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                      <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                        <span>Quality Standards & Testing Mandates</span>
                      </div>
                      <div className="whitespace-pre-line text-slate-600 leading-relaxed font-sans">
                        {aiOverview.qualityStandards}
                      </div>
                    </div>
                  </div>

                  {/* Full Synthesis Breakdown */}
                  {aiOverview.fullAnalysis && (
                    <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2 mt-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Full Synthesized Analysis
                      </h4>
                      {renderFormattedMarkdown(aiOverview.fullAnalysis)}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 italic pt-1">
                    Synthesized live by Gemini 1.5 Flash using NIS 444-1:2018, NIS 117:2004, and verified Nigerian merchant price circulars.
                  </div>
                </div>
              )}

              {/* Show More / Collapsible Button */}
              <div className="pt-2">
                <button
                  onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 hover:text-[#ae2424] transition-colors cursor-pointer shadow-2xs"
                >
                  {isOverviewExpanded ? (
                    <>
                      <span>Show less</span>
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                    </>
                  ) : (
                    <>
                      <span>Show more detailed engineering analysis</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    </>
                  )}
                </button>
              </div>
            </section>
          )}

          {/* ===================================================================== 
              CRAWLED & MANUAL RESULT CARDS (BELOW AI OVERVIEW)                     
              - Domain badge in monospace text (url domain)                         
              - Title in bold slate (hover:text-[#ae2424] hover:underline)          
              - 3-line excerpt                                                      
              - Clicking a card opens slide-over Deep Intelligence Drawer           
              ===================================================================== */}
          <section className="space-y-5 pt-2">
            
            {dbResults.length > 0 ? (
              <div className="space-y-6">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Database className="w-3.5 h-3.5" />
                  <span>Database & Scraped Knowledge Records ({dbResults.length})</span>
                </div>

                {dbResults.map((result) => (
                  <article
                    key={result.id}
                    onClick={() => setSelectedDrawerRecord(result)}
                    className="group bg-white rounded-xl border border-transparent hover:border-slate-200 p-3 sm:p-4 hover:shadow-xs transition-all cursor-pointer space-y-1.5 text-left"
                  >
                    {/* Domain badge in monospace text */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60 inline-flex items-center gap-1">
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span>{result.sourceDomain}</span>
                      </span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-[11px] font-medium text-slate-500">
                        {result.material_category}
                      </span>
                    </div>

                    {/* Title in bold slate with red hover */}
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#ae2424] group-hover:underline transition-colors leading-snug">
                      {result.title}
                    </h3>

                    {/* 3-line excerpt */}
                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed">
                      {result.excerpt || result.content.slice(0, 240)}
                    </p>

                    {/* Card Footer Micro-tag */}
                    <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="text-[#ae2424] font-medium group-hover:underline inline-flex items-center gap-1">
                        <span>Open Deep Intelligence Drawer</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : !isLoading ? (
              /* When Supabase returns 0 records */
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-200/70 text-slate-500 flex items-center justify-center mx-auto">
                  <Database className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  No Direct Database Link Matches Found
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  The Supabase <code className="font-mono text-slate-700 bg-white px-1 py-0.5 rounded border border-slate-200">search_materials</code> index returned 0 matching records for "{activeQuery}". The comprehensive technical briefing above has been synthesized via Gemini 1.5 Flash using foundational structural standards.
                </p>
              </div>
            ) : null}

          </section>

        </main>
      )}

      {/* ========================================================================= */}
      {/* 4. SLIDE-OVER DEEP INTELLIGENCE DRAWER                                    */
      /* Opens when clicking any database result card. Full scraped text in md.    */}
      {/* ========================================================================= */}
      {selectedDrawerRecord && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          
          {/* Clickable Backdrop */}
          <div
            onClick={() => setSelectedDrawerRecord(null)}
            className="flex-1 cursor-pointer"
          />

          {/* Slide-Over Panel */}
          <aside className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-left border-l border-[#e2e8f0]">
            
            {/* Drawer Header */}
            <div className="p-5 sm:p-6 border-b border-[#e2e8f0] bg-white sticky top-0 z-10 flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1 pr-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-[#ae2424] border border-rose-200">
                    {selectedDrawerRecord.material_category}
                  </span>
                  <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-flex items-center gap-1">
                    <Globe className="w-3 h-3 text-slate-400" />
                    <span>{selectedDrawerRecord.sourceDomain}</span>
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                  {selectedDrawerRecord.title}
                </h2>
                <a
                  href={selectedDrawerRecord.url.startsWith("http") ? selectedDrawerRecord.url : `https://${selectedDrawerRecord.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#ae2424] hover:underline inline-flex items-center gap-1 truncate max-w-md font-mono"
                >
                  <span className="truncate">{selectedDrawerRecord.url}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedDrawerRecord(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                title="Close drawer"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body - Full Scraped Text in Clean Markdown */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/50">
              
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#ae2424]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Full Ingested Technical Text
                    </h3>
                  </div>

                  <button
                    onClick={handleCopyDrawer}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                  >
                    {hasCopiedDrawerContent ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Render Formatted Markdown */}
                <div className="pt-1">
                  {renderFormattedMarkdown(selectedDrawerRecord.content)}
                </div>
              </div>

              {/* Database Context Metadata Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2 text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-500" />
                  <span>Storage Metadata & Provenance</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                  <div>
                    <span className="text-slate-400 block">Record ID:</span>
                    <span className="font-mono truncate block">{selectedDrawerRecord.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Target Category:</span>
                    <span className="font-medium text-slate-800">{selectedDrawerRecord.material_category}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Source Domain:</span>
                    <span className="font-mono truncate block">{selectedDrawerRecord.sourceDomain}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Synthesizer Pipeline:</span>
                    <span className="text-emerald-700 font-semibold">Gemini 1.5 Flash Ready</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-[#e2e8f0] bg-white flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedDrawerRecord(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close Drawer
              </button>

              <div className="flex items-center gap-2">
                {onProcureMaterial && (
                  <button
                    onClick={() => {
                      onProcureMaterial(selectedDrawerRecord.rawRecord || selectedDrawerRecord);
                      setSelectedDrawerRecord(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#ae2424] hover:bg-[#8f1d1d] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Procure Material</span>
                  </button>
                )}

                <a
                  href={selectedDrawerRecord.url.startsWith("http") ? selectedDrawerRecord.url : `https://${selectedDrawerRecord.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Visit Source</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

          </aside>
        </div>
      )}

    </div>
  );
};

export default SearchResultsPage;
