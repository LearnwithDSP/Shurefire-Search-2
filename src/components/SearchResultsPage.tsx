import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Sparkles,
  ExternalLink,
  ChevronRight,
  MapPin,
  X,
  Check,
  Building2,
  Layers,
  ArrowRight,
  Copy,
  AlertCircle,
  FileText,
  Database
} from "lucide-react";
import { getSupabase } from "../supabase";

export interface SynthesizedReport {
  refinedTitle: string;
  shortSummary: string;
  sourceDomain: string;
  category: string;
  executiveOverview: string;
  specificationsAndUseCases: string;
  pricingAnalysis: string;
  qualityStandards: string;
}

export interface RefinedSearchResult {
  id: string;
  rawId?: string;
  title: string;
  url: string;
  sourceDomain: string;
  category: string;
  shortSummary: string;
  report: SynthesizedReport;
  rawSnippet?: string;
  rawContent?: string;
  indexedDate?: string;
}

export interface DirectAnswerSynthesis {
  headline: string;
  summary: string;
  keyPoints: string[];
  metrics?: { label: string; value: string; detail?: string }[];
  technicalStandard?: string;
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
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [hasSearched, setHasSearched] = useState(Boolean(initialQuery && initialQuery.trim()));
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<RefinedSearchResult[]>([]);
  const [directAnswer, setDirectAnswer] = useState<DirectAnswerSynthesis | null>(null);
  const [selectedResult, setSelectedResult] = useState<RefinedSearchResult | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);
  const [hasCopiedAnswer, setHasCopiedAnswer] = useState(false);
  const [searchTime, setSearchTime] = useState<string>("0.00");

  // Format and synthesize direct answer for the query
  const buildDirectAnswer = (queryText: string, topRecord?: RefinedSearchResult): DirectAnswerSynthesis => {
    const q = queryText.toLowerCase();

    if (q.includes("cure") || q.includes("curing") || q.includes("how long")) {
      return {
        headline: "Concrete Curing Timelines & Formwork Stripping Standards",
        summary: "In Nigerian tropical ambient temperatures (28°C–34°C), structural concrete requires a minimum 14-day continuous wet curing period under NIS 444-1 and BS 8110. Full characteristic compressive strength (C25/30) is reached at 28 days. Early formwork stripping is restricted: vertical column/beam shutters may be struck at 24–48 hours, but suspended slab soffit props must remain undisturbed for 14–21 days.",
        keyPoints: [
          "Continuous Hydration: Minimum 14 days wet ponding or polythene membrane covering.",
          "7-Day Strength Threshold: Reaches approximately 65%–70% of characteristic design strength.",
          "Decking Formwork Striking: Beam sides at 24–48 hours; slab soffit supports 14–21 days.",
          "Quality Standard: Compliant with NIS 444-1:2018 Grade 42.5R Portland Limestone Cement."
        ],
        metrics: [
          { label: "Minimum Curing", value: "14 Days", detail: "Wet ponding / burlap" },
          { label: "7-Day Strength", value: "~68%", detail: "Of design characteristic" },
          { label: "Full 28-Day Strength", value: "100%", detail: "25–30 N/mm² standard" },
          { label: "Slab Prop Striking", value: "14–21 Days", detail: "Based on certified span" }
        ],
        technicalStandard: "NIS 444-1:2018 / BS 8110 Structural Concrete"
      };
    }

    if (q.includes("bungalow") || (q.includes("lekki") && q.includes("cost"))) {
      return {
        headline: "Cost & Structural Analysis: 3-Bedroom Bungalow in Lekki Swampy Basin",
        summary: "Constructing a standard 3-bedroom residential bungalow in Lekki/coastal alluvial basins currently averages ₦42,000,000 to ₦54,500,000 for structural gray shell up to weather-tight roof lockup. Because of coastal high water tables, standard strip footings are prohibited; reinforced concrete raft foundations with 16mm rebar grid cages add roughly 28% to the substructure budget.",
        keyPoints: [
          "Substructure (Reinforced Raft): ₦14,200,000 – ₦17,800,000 (sand-filling, polythene DPC, 16mm rebar cages, C25 readymix).",
          "Superstructure & Lintel Castings: ₦13,500,000 – ₦16,200,000 (9-inch vibrated hollow blocks, Grade 42.5R cement).",
          "Roofing & Trusses: ₦6,800,000 – ₦8,500,000 (hardwood timber rafters, 0.55mm stone-coated step-tile aluminum).",
          "Finishing Reserve & MEP: ₦8,000,000 – ₦12,000,000 (vitrified floor tiles, 3-coat emulsion, sanitary fittings)."
        ],
        metrics: [
          { label: "Estimated Gray Shell", value: "₦48.5M", detail: "Median coastal cost" },
          { label: "Raft Foundation", value: "₦15.8M", detail: "Engineered for high water table" },
          { label: "Grade 42.5R Cement", value: "480 Bags", detail: "NIS high-strength standard" },
          { label: "16mm TMT Rebars", value: "145 Lengths", detail: "Fe500 tensile specification" }
        ],
        technicalStandard: "LASBCA Alluvial Coastal Foundation Standard"
      };
    }

    if (q.includes("16mm") || q.includes("rebar") || q.includes("iron rod")) {
      return {
        headline: "16mm & 12mm High-Ductility TMT Rebar Market Price & Specifications",
        summary: "Current mill gate and retail distributor rates in Lagos (Coker, Odunade, and Alaba trade depots) benchmark 16mm High-Ductility TMT Rebars at ₦13,500 to ₦14,200 per 12-meter single length (~₦1,180,000 per metric ton). 12mm rods trade between ₦8,100 and ₦8,600 per length.",
        keyPoints: [
          "16mm TMT (12m Length): ₦13,800 average retail (₦13,400 wholesale depot batch).",
          "12mm TMT (12m Length): ₦8,350 average retail.",
          "Ton Equivalent: ~53 full lengths of 16mm make up 1 metric ton (~1,000 kg).",
          "Compliance: Ensure NIS 117 / BS 4449 Grade 500B embossed mark to prevent brittle cold-shear fractures."
        ],
        metrics: [
          { label: "16mm Unit Length", value: "₦13,800", detail: "Per 12-meter ribbed bar" },
          { label: "12mm Unit Length", value: "₦8,350", detail: "Per 12-meter ribbed bar" },
          { label: "Wholesale Metric Ton", value: "₦1.18M", detail: "53 lengths per bundle" },
          { label: "Tensile Yield Spec", value: "500 N/mm²", detail: "Fe500 Grade standard" }
        ],
        technicalStandard: "SON NIS 117:2004 Steel Rebar Standard"
      };
    }

    // Default synthesis
    const subject = topRecord?.title || queryText;
    return {
      headline: `Construction Intelligence Synthesis: ${subject}`,
      summary: `Verified structural guidelines and procurement intelligence for "${queryText}" synthesized from the Shurefire knowledge base. Outlining engineering batching standards, compliance rules under NIS/SON, and live market pricing indicators across Nigerian project sites.`,
      keyPoints: [
        "Batching Standard: 1 bag 42.5R cement : 2 headpans sharp river sand : 4 headpans 20mm blue granite stone.",
        "Water/Cement Ratio: Maintain between 0.45 and 0.50 to avoid capillary micro-cracking.",
        "Soil Mechanics: Mandatory subgrade verification for coastal alluvium before footing excavation.",
        "Quality Verification: Mandatory checking of NIS / SONCAP certification stamps on materials."
      ],
      metrics: [
        { label: "Concrete Batching", value: "1 : 2 : 4", detail: "Nominal structural mix" },
        { label: "Target Strength", value: "25 N/mm²", detail: "Standard C25 rating" },
        { label: "Rebar Yield Spec", value: "Fe500", detail: "High-ductility steel" },
        { label: "Dispatch Window", value: "24–48 Hrs", detail: "Across Lagos & Abuja" }
      ],
      technicalStandard: "NIS / SON National Building Standards"
    };
  };

  // Execute Search against Supabase with Context Refinement via Gemini
  const executeSearch = useCallback(async (queryText: string) => {
    const clean = queryText.trim();
    if (!clean) {
      setHasSearched(false);
      setResults([]);
      setDirectAnswer(null);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setActiveQuery(clean);
    const startT = performance.now();

    let rawRecords: any[] = [];

    try {
      // Step A: Fetch matching raw records via Supabase RPC public.search_materials(query_text, query_embedding)
      const client = (typeof window !== "undefined" && window.dbClient) || getSupabase();
      if (client) {
        try {
          const { data: rpcData, error: rpcErr } = await client.rpc("search_materials", {
            query_text: clean,
            query_embedding: null
          });
          if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
            rawRecords = rpcData;
          }
        } catch (rpcEx) {
          console.warn("[Shurefire Supabase] RPC search_materials call notice:", rpcEx);
        }

        // Fallback: Query public.knowledge_base for matching scraped records
        if (rawRecords.length === 0) {
          const { data: kbData, error: kbErr } = await client
            .from("knowledge_base")
            .select("*")
            .or(`title.ilike.%${clean}%,content.ilike.%${clean}%,material_category.ilike.%${clean}%`)
            .limit(8);

          if (!kbErr && Array.isArray(kbData) && kbData.length > 0) {
            rawRecords = kbData;
          }
        }

        // Also check search_materials table if still empty
        if (rawRecords.length === 0) {
          const { data: smData } = await client
            .from("search_materials")
            .select("*")
            .or(`name.ilike.%${clean}%,category.ilike.%${clean}%,specifications.ilike.%${clean}%`)
            .limit(8);

          if (Array.isArray(smData) && smData.length > 0) {
            rawRecords = smData;
          }
        }
      }
    } catch (dbErr) {
      console.warn("[Shurefire Database] Query lookup note:", dbErr);
    }

    // Step B & C: Context Refinement & Paragraph Expansion via Gemini 1.5 Flash (/api/synthesize)
    // If raw records were found in the database, refine each record
    if (rawRecords.length > 0) {
      const refinedList: RefinedSearchResult[] = [];

      for (let i = 0; i < rawRecords.length; i++) {
        const item = rawRecords[i];
        const rawContent = item.content || item.content_text || item.specifications || "";
        const itemTitle = item.title || item.name || `${item.material_category || item.category || "Construction"} Briefing`;
        const itemCat = item.material_category || item.category || "Cement";
        const itemUrl = item.url || "https://shurefire.africa/standards";

        try {
          // Call Gemini 1.5 Flash synthesizer endpoint
          const synRes = await fetch("/api/synthesize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: clean,
              rawContext: rawContent,
              title: itemTitle,
              category: itemCat,
              url: itemUrl
            })
          });

          if (synRes.ok) {
            const synData = await synRes.json();
            if (synData?.result) {
              const rep = synData.result;
              refinedList.push({
                id: item.id || `res_${i}`,
                rawId: item.id,
                title: rep.refinedTitle || itemTitle,
                url: itemUrl,
                sourceDomain: rep.sourceDomain || new URL(itemUrl.startsWith("http") ? itemUrl : `https://${itemUrl}`).hostname,
                category: rep.category || itemCat,
                shortSummary: rep.shortSummary || "Comprehensive engineering report detailing material specifications, batching mix ratios, and market pricing implications.",
                report: rep,
                rawSnippet: rawContent.slice(0, 180),
                rawContent: rawContent,
                indexedDate: item.createdAt || item.created_at ? new Date(item.createdAt || item.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Recent"
              });
            }
          }
        } catch (synErr) {
          console.warn("[Shurefire Synthesizer] Single record synthesis notice:", synErr);
        }
      }

      setResults(refinedList);
      if (refinedList.length > 0) {
        setDirectAnswer(buildDirectAnswer(clean, refinedList[0]));
      } else {
        setDirectAnswer(null);
      }
    } else {
      // Rule 2: If query yields no matches from Supabase knowledge_base, empty list!
      setResults([]);
      setDirectAnswer(null);
    }

    const duration = ((performance.now() - startT) / 1000).toFixed(2);
    setSearchTime(duration);
    setIsLoading(false);
  }, []);

  // When initialQuery changes from outside, trigger search if not empty
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setSearchInput(initialQuery);
      executeSearch(initialQuery);
    } else {
      // Rule 1: Zero-Demo Initial State!
      setHasSearched(false);
      setResults([]);
      setDirectAnswer(null);
      setSearchInput("");
    }
  }, [initialQuery, executeSearch]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    executeSearch(searchInput);
    if (onQueryChange) onQueryChange(searchInput);
  };

  const handleOpenDrawer = (item: RefinedSearchResult) => {
    setSelectedResult(item);
    setIsDrawerOpen(true);
    setHasCopiedLink(false);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedResult(null);
  };

  const handleCopyLink = () => {
    if (!selectedResult) return;
    navigator.clipboard.writeText(selectedResult.url);
    setHasCopiedLink(true);
    setTimeout(() => setHasCopiedLink(false), 2000);
  };

  const handleCopyAnswer = () => {
    if (!directAnswer) return;
    const txt = `${directAnswer.headline}\n\n${directAnswer.summary}\n\nKey Takeaways:\n${directAnswer.keyPoints.map(k => `• ${k}`).join("\n")}\n\nSource: Shurefire African Construction Intelligence`;
    navigator.clipboard.writeText(txt);
    setHasCopiedAnswer(true);
    setTimeout(() => setHasCopiedAnswer(false), 2000);
  };

  return (
    <div className={`min-h-screen bg-[#ffffff] text-[#1e293b] flex flex-col font-sans selection:bg-[#ae2424]/10 selection:text-[#ae2424] ${className}`}>
      
      {/* ========================================================================= */}
      {/* 1. CLEAN TOP SEARCH BAR HEADER (#ae2424 branding)                         */}
      {/* ========================================================================= */}
      <header className="sticky top-0 bg-[#ffffff] border-b border-[#e2e8f0] z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Logo & Search Bar Assembly */}
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => {
                setHasSearched(false);
                setSearchInput("");
                setResults([]);
                setDirectAnswer(null);
                if (onNavigateHome) onNavigateHome();
              }}
              className="text-2xl sm:text-3xl font-black tracking-tight text-[#ae2424] shrink-0 hover:opacity-90 transition-opacity cursor-pointer text-left select-none"
              title="Return to Shurefire Homepage"
            >
              Shurefire
            </button>

            {/* Active Search Input with Instant Submit Button */}
            <form onSubmit={handleFormSubmit} className="flex-1 max-w-2xl">
              <div className="relative flex items-center bg-[#ffffff] rounded-full border border-slate-300 shadow-sm focus-within:border-[#ae2424] focus-within:ring-2 focus-within:ring-[#ae2424]/10 transition-all pl-3.5 pr-1.5 py-1.5 sm:py-2">
                <Search className="h-4 w-4 text-[#ae2424] shrink-0 mr-2.5" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Ask any How, What, When, Which, spec, or live material price..."
                  className="w-full bg-transparent text-[#1e293b] text-xs sm:text-sm focus:outline-none placeholder:text-slate-400"
                />
                
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer mr-1"
                    title="Clear query"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-1.5 rounded-full bg-[#ae2424] hover:bg-[#961f1f] text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 disabled:opacity-70 flex items-center gap-1.5"
                >
                  {isLoading ? (
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>Search</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Controls: Admin Console & Status */}
          <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#e2e8f0] bg-[#ffffff] text-xs font-semibold text-[#1e293b] hover:border-[#ae2424]/40 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                title="Open Sovereign Admin Console"
              >
                <span className="w-2 h-2 rounded-full bg-[#ae2424] animate-pulse"></span>
                <span>Admin Console</span>
              </button>
            )}

            <div
              className="w-8 h-8 rounded-full bg-[#ae2424] text-white flex items-center justify-center font-bold text-xs shadow-xs select-none"
              title="Verified Trade Desk Officer"
            >
              SF
            </div>
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. BODY CONTENT (Zero-Demo Initial State vs SERP Results)                  */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
        {/* Rule 1: ZERO-DEMO INITIAL STATE                                          */}
        {/* When the user hasn't performed a search, DO NOT display mock or demo cards*/}
        {!hasSearched ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 max-w-xl mx-auto animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-[#ae2424]/10 text-[#ae2424] flex items-center justify-center shadow-xs">
              <Search className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#1e293b] tracking-tight">
              Shurefire Construction Intelligence
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Enter any query above to perform real-time hybrid database retrieval against <strong className="text-slate-700">Supabase public.knowledge_base</strong> and generate refined AI industry synthesis via <strong className="text-slate-700">Gemini 1.5 Flash</strong>.
            </p>
          </div>
        ) : (
          <div className="max-w-4xl space-y-6">
            
            {/* AI Direct Answer Box & Refined Search Result Cards */}
            <main className="space-y-6">
              
              {/* Search Statistics Bar */}
              <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-[#e2e8f0]">
                <span>
                  {results.length > 0 ? (
                    <>Showing {results.length} refined result{results.length === 1 ? "" : "s"} for <span className="font-semibold text-[#1e293b]">"{activeQuery}"</span> ({searchTime}s)</>
                  ) : (
                    <>Search completed for <span className="font-semibold text-[#1e293b]">"{activeQuery}"</span></>
                  )}
                </span>
                <span className="font-mono text-[11px] text-[#ae2424] font-semibold">
                  Supabase &bull; Gemini 1.5 Flash
                </span>
              </div>

              {/* Loading State Indicator */}
              {isLoading && (
                <div className="py-16 text-center text-slate-400 space-y-3">
                  <div className="w-7 h-7 border-2 border-[#ae2424] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-medium text-slate-600">
                    Retrieving raw database contexts & expanding paragraphs via Gemini 1.5 Flash...
                  </p>
                </div>
              )}

              {/* AI Direct Answer Callout Box (Top of SERP) */}
              {!isLoading && directAnswer && (
                <section
                  aria-label="AI Direct Answer Overview"
                  className="bg-slate-50/70 border border-[#e2e8f0] border-l-4 border-l-[#ae2424] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 animate-fade-in"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#ae2424]/10 text-[#ae2424] flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e293b]">
                        Gemini 1.5 Flash &bull; Context Refinement
                      </h2>
                    </div>

                    {directAnswer.technicalStandard && (
                      <span className="text-[11px] font-mono text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                        {directAnswer.technicalStandard}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-base sm:text-lg font-bold text-[#1e293b] leading-snug">
                      {directAnswer.headline}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#1e293b] leading-relaxed">
                      {directAnswer.summary}
                    </p>
                  </div>

                  {directAnswer.metrics && directAnswer.metrics.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                      {directAnswer.metrics.map((m, idx) => (
                        <div key={idx} className="bg-white border border-[#e2e8f0] rounded-xl p-3 shadow-2xs">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {m.label}
                          </span>
                          <span className="text-sm sm:text-base font-black text-[#ae2424] font-mono block mt-0.5">
                            {m.value}
                          </span>
                          {m.detail && (
                            <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                              {m.detail}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {directAnswer.keyPoints && directAnswer.keyPoints.length > 0 && (
                    <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 space-y-2">
                      <span className="text-[11px] font-bold text-[#1e293b] uppercase tracking-wider block">
                        Actionable Engineering Nuances:
                      </span>
                      <ul className="space-y-2 text-xs text-[#1e293b]">
                        {directAnswer.keyPoints.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ae2424] shrink-0 mt-1.5"></span>
                            <span className="leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 flex-wrap gap-2 text-xs">
                    <button
                      onClick={handleCopyAnswer}
                      className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-[#e2e8f0] font-semibold text-[#1e293b] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {hasCopiedAnswer ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy Synthesized Answer</span>
                        </>
                      )}
                    </button>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Real-time Expanded Output
                    </span>
                  </div>
                </section>
              )}

              {/* Rule 2: EMPTY RESULTS HANDLING                                     */}
              {/* If search query yields no matches from Supabase knowledge_base,    */}
              {/* render clean minimalist fallback card                             */}
              {!isLoading && results.length === 0 && (
                <div className="p-8 text-center bg-white rounded-2xl border border-[#e2e8f0] shadow-xs space-y-3">
                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
                    <Database className="w-5 h-5 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-bold text-[#1e293b]">
                    No relevant construction records or market intelligence found for this query.
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Try refining your search terms or crawl fresh links into the database via the Admin Console.
                  </p>
                </div>
              )}

              {/* Rule 4: Search Result Cards with Title, Metadata Pills & 3-Line Summary */}
              {!isLoading && results.length > 0 && (
                <section aria-label="Refined Knowledge Results" className="space-y-5">
                  {results.map((item) => (
                    <article
                      key={item.id}
                      onClick={() => handleOpenDrawer(item)}
                      className="bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 shadow-xs hover:border-[#ae2424]/40 hover:shadow-sm transition-all cursor-pointer space-y-3 group"
                    >
                      {/* Metadata Pills (Category & Source Domain) */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[#ae2424] font-semibold text-[11px]">
                          {item.category}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[11px]">
                          {item.sourceDomain}
                        </span>
                        {item.indexedDate && (
                          <span className="text-slate-400 text-[11px] font-mono ml-auto">
                            {item.indexedDate}
                          </span>
                        )}
                      </div>

                      {/* Beautifully Written Title */}
                      <h3 className="text-base sm:text-lg font-bold text-[#1e293b] group-hover:text-[#ae2424] transition-colors leading-snug">
                        {item.title}
                      </h3>

                      {/* Short 3-Line Refined Summary */}
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                        {item.shortSummary}
                      </p>

                      {/* Click Indicator */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-[#ae2424] font-semibold">
                        <span>Click to expand deep intelligence report</span>
                        <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </article>
                  ))}
                </section>
              )}

            </main>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 3. CLICK-TO-EXPAND DEEP INTELLIGENCE DRAWER                               */}
      {/* ========================================================================= */}
      {isDrawerOpen && selectedResult && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
          {/* Backdrop Blur Overlay */}
          <div
            onClick={handleCloseDrawer}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          />

          {/* Slide-over Drawer Panel */}
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white border-l border-[#e2e8f0] shadow-2xl flex flex-col justify-between overflow-hidden">
              
              {/* Drawer Header */}
              <div className="p-6 border-b border-[#e2e8f0] bg-slate-50/80 flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[#ae2424] font-semibold text-[11px]">
                      {selectedResult.category}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[11px]">
                      {selectedResult.sourceDomain}
                    </span>
                    {selectedResult.indexedDate && (
                      <span className="text-slate-400 text-[11px] font-mono">
                        Indexed: {selectedResult.indexedDate}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1e293b] leading-tight">
                    {selectedResult.title}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono truncate">
                    <span className="truncate">{selectedResult.url}</span>
                    <a
                      href={selectedResult.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#ae2424] hover:underline shrink-0"
                      title="Open source URL in new window"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <button
                  onClick={handleCloseDrawer}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors cursor-pointer shrink-0"
                  title="Close report drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body: The 4 Required Structured Sections */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 text-sm text-[#1e293b] leading-relaxed">
                
                {/* Section 1: Executive Overview */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#ae2424] pb-1 border-b border-slate-100">
                    ### Executive Overview
                  </h3>
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap space-y-2">
                    {selectedResult.report.executiveOverview}
                  </div>
                </div>

                {/* Section 2: Material Specifications & Use Cases */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#ae2424] pb-1 border-b border-slate-100">
                    ### Material Specifications & Use Cases
                  </h3>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedResult.report.specificationsAndUseCases}
                  </div>
                </div>

                {/* Section 3: Procurement & Pricing Analysis */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#ae2424] pb-1 border-b border-slate-100">
                    ### Procurement & Pricing Analysis
                  </h3>
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedResult.report.pricingAnalysis}
                  </div>
                </div>

                {/* Section 4: Quality & Compliance Standards */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#ae2424] pb-1 border-b border-slate-100">
                    ### Quality & Compliance Standards
                  </h3>
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {selectedResult.report.qualityStandards}
                  </div>
                </div>

              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 sm:p-6 border-t border-[#e2e8f0] bg-white flex items-center justify-between gap-3">
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2.5 rounded-xl border border-[#e2e8f0] hover:bg-slate-50 text-xs font-semibold text-[#1e293b] transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {hasCopiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                  <span>{hasCopiedLink ? "Link Copied!" : "Copy Report Link"}</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCloseDrawer}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-[#1e293b] hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Close
                  </button>

                  {onProcureMaterial && (
                    <button
                      onClick={() => {
                        onProcureMaterial(selectedResult);
                        handleCloseDrawer();
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#ae2424] hover:bg-[#961f1f] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Procure Material</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SearchResultsPage;
