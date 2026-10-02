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
  Volume2,
  Tag,
  Coins,
  FileCheck2,
  Hash
} from "lucide-react";
import { getSupabase } from "../supabase";
import { useVoiceToText } from "../useVoiceToText";
import { cleanSubstantiveContent } from "../cleanSubstantiveContent";

export interface SourceMetadata {
  domain: string;
  url: string;
  title: string;
  category?: string;
  sourceType?: string;
  similarity?: number;
  relevanceLabel?: "HIGH" | "MEDIUM" | "LOW" | string;
  contentLength?: number;
  cleanedContentLength?: number;
  has_price_data?: boolean;
  has_quantity_data?: boolean;
  has_specification_data?: boolean;
  created_at?: string | null;
}

export interface SupabaseDbRecord {
  id: string;
  title: string;
  content: string;
  cleanedContent?: string;
  cleanedContentLength?: number;
  url: string;
  material_category: string;
  sourceDomain: string;
  domain?: string;
  sourceType?: string;
  relevanceLabel?: "HIGH" | "MEDIUM" | "LOW";
  has_price_data?: boolean;
  has_quantity_data?: boolean;
  has_specification_data?: boolean;
  contentLength?: number;
  sourceMetadata?: SourceMetadata;
  created_at?: string | null;
  excerpt: string;
  similarity?: number;
  rawRecord?: any;
}

export interface GroundedSourceItem {
  index: number;
  title: string;
  domain: string;
  url: string;
  similarity: number;
  sourceType?: string;
  relevanceLabel?: string;
  contentLength?: number;
  sourceMetadata?: SourceMetadata;
}

export interface AiOverviewSynthesis {
  summaryParagraphs: string[];
  supportingCitations?: string[];
  materialSpecs: string;
  pricingInsights: string;
  usageGuidelines: string;
  qualityStandards: string;
  fullAnalysis: string;
  sources?: GroundedSourceItem[];
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
  const [detectedIntent, setDetectedIntent] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
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

  // Phase 4B Authoritative Semantic Search Pipeline:
  // Calls POST /api/search which executes 768-D query embedding -> Supabase match_knowledge -> grounded AI Overview
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
    setDetectedIntent(null);
    setSearchError(null);
    const startTimestamp = performance.now();

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: clean, forceRefresh: true })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.intent) {
          setDetectedIntent(data.intent);
        }
        
        // Map backend searchResults into SupabaseDbRecord format preserving domain, relevance, contentLength, and source metadata
        const mappedRecords: SupabaseDbRecord[] = (data.searchResults || []).map((r: any, idx: number) => {
          const rawContent = r.fullContent || r.content || "";
          const targetUrl = r.url || `https://shurefire.africa/materials/${r.id || idx}`;
          const title = r.title || "Material Specification";
          const category = r.material_category || "General Construction";
          const cleanDomain = r.domain || r.sourceDomain || r.siteName || getDomainFromUrl(targetUrl);
          const sim = typeof r.similarity === "number" ? r.similarity : undefined;
          const relevanceLabel = r.relevanceLabel || (typeof sim === "number" ? (sim >= 0.75 ? "HIGH" : sim >= 0.55 ? "MEDIUM" : "LOW") : undefined);
          const contentLength = typeof r.contentLength === "number" ? r.contentLength : rawContent.length;
          const cleanedContentLength = typeof r.cleanedContentLength === "number" ? r.cleanedContentLength : (r.cleanedContent ? r.cleanedContent.length : contentLength);

          const sourceMetadata: SourceMetadata = r.sourceMetadata || {
            domain: cleanDomain,
            url: targetUrl,
            title,
            category,
            sourceType: r.sourceType,
            similarity: sim,
            relevanceLabel,
            contentLength,
            cleanedContentLength,
            has_price_data: r.has_price_data,
            has_quantity_data: r.has_quantity_data,
            has_specification_data: r.has_specification_data,
            created_at: r.created_at || null
          };

          const cleanContent = r.cleanedContent || cleanSubstantiveContent(rawContent);

          return {
            id: r.id ? String(r.id) : `res_${idx}`,
            title,
            content: cleanContent,
            cleanedContent: cleanContent,
            rawContent: r.rawContent || rawContent,
            cleanedContentLength: typeof r.cleanedContentLength === "number" ? r.cleanedContentLength : cleanContent.length,
            url: targetUrl,
            material_category: category,
            domain: cleanDomain,
            sourceDomain: cleanDomain,
            sourceType: r.sourceType,
            relevanceLabel,
            has_price_data: r.has_price_data,
            has_quantity_data: r.has_quantity_data,
            has_specification_data: r.has_specification_data,
            contentLength,
            sourceMetadata,
            created_at: r.created_at,
            excerpt: r.excerpt || r.snippet || (r.cleanedContent ? r.cleanedContent.slice(0, 240) : (r.content ? r.content.slice(0, 240) : "")),
            similarity: sim,
            rawRecord: r
          };
        });

        setDbResults(mappedRecords);

        if (data.aiOverview) {
          setAiOverview(data.aiOverview);
        } else if (data.featuredAnswer) {
          setAiOverview({
            summaryParagraphs: [data.quickAnswer || data.featuredAnswer],
            materialSpecs: "Verified parameters sourced from indexed technical specifications.",
            pricingInsights: "Refer to retrieved source documentation for current price ranges.",
            usageGuidelines: "Adhere to standard structural engineering specifications.",
            qualityStandards: "Aligned with Nigerian Industrial Standards (NIS/SON).",
            fullAnalysis: data.featuredAnswer
          });
        }
      } else {
        throw new Error(`Search failed with status ${response.status}`);
      }
    } catch (err: any) {
      console.warn("[Shurefire Search Pipeline] Error:", err);
      setSearchError(err?.message || "Retrieval error. Unable to connect to construction intelligence database.");
      setAiOverview({
        summaryParagraphs: [
          "I couldn't retrieve enough verified construction information from the indexed knowledge base to answer this question accurately.",
          "Please verify your connection or inquire directly through the Shurefire Sourcing Desk on WhatsApp (+2349023089987)."
        ],
        materialSpecs: "No verified material specifications are available for this query.",
        pricingInsights: "No verified pricing benchmarks are available for this query.",
        usageGuidelines: "Direct technical consultation is available through accredited civil engineering professionals.",
        qualityStandards: "All structural data on Shurefire requires verification against Nigerian Industrial Standards (NIS/SON).",
        fullAnalysis: "I couldn't retrieve enough verified construction information from the indexed knowledge base to answer this question accurately."
      });
    } finally {
      const elapsed = ((performance.now() - startTimestamp) / 1000).toFixed(2);
      setSearchTime(elapsed);
      setIsLoading(false);
    }
  }, []);

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
    const textToCopy = selectedDrawerRecord.cleanedContent || selectedDrawerRecord.content;
    const text = `${selectedDrawerRecord.title.toUpperCase()}
Category: ${selectedDrawerRecord.material_category}
Source: ${selectedDrawerRecord.url}

${textToCopy}`;
    navigator.clipboard.writeText(text);
    setHasCopiedDrawerContent(true);
    setTimeout(() => setHasCopiedDrawerContent(false), 2000);
  };

  // Helper: Format inline bold markdown without raw asterisks
  const formatInlineContent = (text: string) => {
    if (!text) return "";
    const cleanText = text
      .replace(/\[\s*(?:!\[.*?\]\(.*?\)\s*)+[^\]]*\]\([^)]*\)/g, "")
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/!\[.*?\]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    const parts = cleanText.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // Render markdown text cleanly inside the drawer
  const renderFormattedMarkdown = (rawText: string) => {
    if (!rawText) return null;
    const sanitized = rawText
      .replace(/\[\s*(?:!\[.*?\]\(.*?\)\s*)+[^\]]*\]\([^)]*\)/g, "")
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/!\[.*?\]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    const lines = sanitized.split("\n");

    return (
      <div className="space-y-3.5 text-xs text-slate-700 leading-relaxed font-sans">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1.5" />;

          // Table row
          if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
            return (
              <div key={idx} className="font-mono text-[11px] overflow-x-auto py-0.5 text-slate-800">
                {trimmed}
              </div>
            );
          }

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
                <span className="flex-1 text-slate-700">{formatInlineContent(trimmed.replace(/^[-*•]\s+/, ""))}</span>
              </div>
            );
          }

          // Standard paragraph
          return (
            <p key={idx} className="text-slate-600 leading-relaxed">
              {formatInlineContent(trimmed)}
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

          {/* Right Navigation Controls - Only Round RB Icon */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenAdmin || onNavigateHome}
              className="w-9 h-9 rounded-full bg-[#ae2424] text-white flex items-center justify-center font-black text-xs shadow-xs hover:bg-[#931f1f] hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-white ring-2 ring-[#ae2424]/20"
              title="Admin Portal Login (Ramon Bisola)"
              aria-label="Admin Login"
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
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                {isLoading ? (
                  <span className="flex items-center gap-1.5 text-[#ae2424] font-medium">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Querying Supabase & synthesizing with Gemini...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>
                      About {dbResults.length} database result{dbResults.length === 1 ? "" : "s"} ({searchTime} seconds)
                    </span>
                  </span>
                )}
              </span>

              {detectedIntent && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-[#ae2424] border border-red-200 shadow-xs">
                  <Tag className="w-3 h-3 text-[#ae2424]" />
                  <span>Intent: {detectedIntent.replace(/_/g, " ")}</span>
                </span>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <Database className="w-3 h-3 text-slate-400" />
                <span>Supabase pgvector</span>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1 text-[#ae2424]">
                <Sparkles className="w-3 h-3" />
                <span>Gemini Intelligence</span>
              </span>
            </div>
          </div>

          {/* Error Alert if Search Pipeline Fails (Part 10) */}
          {searchError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between gap-3 animate-fade-in shadow-2xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#ae2424] shrink-0" />
                <span>{searchError}</span>
              </div>
              <button
                onClick={() => executeSearch(activeQuery)}
                className="px-3 py-1 rounded-lg bg-white border border-red-200 text-[#ae2424] font-semibold hover:bg-red-100/50 transition-colors shrink-0 cursor-pointer"
              >
                Retry Search
              </button>
            </div>
          )}

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

              {/* Supporting Citations List (Part 2 & Part 9) */}
              {aiOverview.sources && aiOverview.sources.length > 0 && (
                <div className="pt-3 pb-1 flex flex-col gap-2 border-t border-slate-200/60">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#ae2424]" />
                    <span>Supporting Citations:</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {aiOverview.sources.map((src, sIdx) => {
                      const matchedDb = dbResults.find(d => d.url === src.url || d.title === src.title);
                      return (
                        <div
                          key={sIdx}
                          onClick={() => {
                            if (matchedDb) setSelectedDrawerRecord(matchedDb);
                          }}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer group text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="w-5 h-5 rounded-md bg-rose-50 text-[#ae2424] font-bold text-[11px] flex items-center justify-center shrink-0 border border-rose-200/70">
                              [{src.index || sIdx + 1}]
                            </span>
                            <div className="truncate">
                              <span className="font-semibold text-slate-900 group-hover:text-[#ae2424] transition-colors truncate block">
                                {src.title}
                              </span>
                              <span className="font-mono text-[11px] text-slate-500">
                                {src.domain}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {typeof src.similarity === "number" && (
                              <span className="font-mono text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                                {(src.similarity * 100).toFixed(0)}%
                              </span>
                            )}
                            <a
                              href={src.url.startsWith("http") ? src.url : `https://${src.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-400 hover:text-[#ae2424] p-1"
                              title="Open external source"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                    Grounded live via Gemini using verified Supabase vector retrieval (match_knowledge) and NIS standards.
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
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-200/80 pb-2">
                  <Database className="w-3.5 h-3.5 text-[#ae2424]" />
                  <span>SOURCES ({dbResults.length})</span>
                </div>

                {dbResults.map((result) => {
                  const relevance = result.relevanceLabel || (typeof result.similarity === "number" ? (result.similarity >= 0.75 ? "HIGH" : result.similarity >= 0.55 ? "MEDIUM" : "LOW") : "LOW");
                  return (
                    <article
                      key={result.id}
                      onClick={() => setSelectedDrawerRecord(result)}
                      className="group bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 p-4 sm:p-5 hover:shadow-xs transition-all cursor-pointer space-y-3 text-left"
                    >
                      {/* Top Header: Source Domain + Material/Category + Content Length + Relevance Classification */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 inline-flex items-center gap-1.5 font-medium">
                            <Globe className="w-3 h-3 text-slate-400" />
                            <span>{result.domain || result.sourceDomain}</span>
                          </span>

                          <span className="text-slate-300">&bull;</span>

                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/70">
                            Category: {result.material_category || result.sourceType || "Procurement Standards"}
                          </span>

                          {result.contentLength !== undefined && result.contentLength > 0 && (
                            <>
                              <span className="text-slate-300">&bull;</span>
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60 inline-flex items-center gap-1" title={`${result.contentLength.toLocaleString()} characters indexed`}>
                                <FileText className="w-2.5 h-2.5 text-slate-400" />
                                <span>{result.contentLength >= 1000 ? `${(result.contentLength / 1000).toFixed(1)}k chars` : `${result.contentLength} chars`}</span>
                              </span>
                            </>
                          )}
                        </div>

                        {/* Relevance Badge with real similarity score mapping */}
                        {relevance && (
                          <div className="flex items-center gap-1.5">
                            {relevance === "HIGH" && (
                              <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                <span>HIGH RELEVANCE{typeof result.similarity === "number" ? ` (${(result.similarity * 100).toFixed(1)}%)` : ""}</span>
                              </span>
                            )}
                            {relevance === "MEDIUM" && (
                              <span className="font-mono text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 inline-flex items-center gap-1 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span>MEDIUM RELEVANCE{typeof result.similarity === "number" ? ` (${(result.similarity * 100).toFixed(1)}%)` : ""}</span>
                              </span>
                            )}
                            {relevance === "LOW" && (
                              <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 inline-flex items-center gap-1 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                <span>LOW RELEVANCE{typeof result.similarity === "number" ? ` (${(result.similarity * 100).toFixed(1)}%)` : ""}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Title in bold slate with red hover */}
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#ae2424] group-hover:underline transition-colors leading-snug">
                        {result.title}
                      </h3>

                      {/* Content Indicator Badges (Price, Specs, Quantity) */}
                      {(result.has_price_data || result.has_specification_data || result.has_quantity_data) && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {result.has_price_data && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                              <Coins className="w-3 h-3 text-emerald-600" />
                              <span>₦ Price Data</span>
                            </span>
                          )}
                          {result.has_specification_data && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200/80">
                              <Layers className="w-3 h-3 text-blue-600" />
                              <span>Technical Specs</span>
                            </span>
                          )}
                          {result.has_quantity_data && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200/80">
                              <Hash className="w-3 h-3 text-purple-600" />
                              <span>Quantities</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* 3-line query-focused excerpt */}
                      <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed bg-slate-50/70 p-2.5 rounded-lg border border-slate-100 font-sans">
                        <span className="font-semibold text-slate-500">Relevant excerpt: </span>
                        "{result.excerpt || (result.cleanedContent ? result.cleanedContent.slice(0, 240) : result.content.replace(/\[\s*!\[.*?\]\(.*?\)\s*[^\]]*\]\([^)]*\)/g, "").replace(/!\[.*?\]\(.*?\)/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[#*`_]/g, "").trim().slice(0, 240))}"
                      </p>

                      {/* Card Footer Actions */}
                      <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
                        <span className="text-[#ae2424] font-semibold group-hover:underline inline-flex items-center gap-1">
                          <span>Open Deep Intelligence Drawer</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>

                        <a
                          href={result.url.startsWith("http") ? result.url : `https://${result.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-[#ae2424] font-semibold transition-colors border border-slate-200"
                          title="Open original webpage in new tab"
                        >
                          <span>Visit Source</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : !isLoading ? (
              /* When vector retrieval returns 0 records */
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/90 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-200/60 text-slate-500 flex items-center justify-center mx-auto">
                  <Database className="w-6 h-6 text-slate-400" />
                </div>
                <h4 className="text-base font-bold text-slate-800">
                  Insufficient Verified Indexed Information
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  We couldn't retrieve enough verified construction records from the indexed knowledge base to answer <span className="font-semibold text-slate-700">"{activeQuery}"</span>.
                </p>
                <p className="text-xs text-slate-400">
                  Try searching for a specific material (e.g. <em>Dangote cement</em>), structural stage, or building type.
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-[#ae2424] border border-rose-200">
                    {selectedDrawerRecord.material_category}
                  </span>
                  <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-flex items-center gap-1 font-medium">
                    <Globe className="w-3 h-3 text-slate-400" />
                    <span>{selectedDrawerRecord.domain || selectedDrawerRecord.sourceDomain}</span>
                  </span>
                  {selectedDrawerRecord.relevanceLabel && (
                    <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                      selectedDrawerRecord.relevanceLabel === "HIGH" 
                        ? "text-emerald-800 bg-emerald-50 border-emerald-200" 
                        : selectedDrawerRecord.relevanceLabel === "MEDIUM" 
                        ? "text-amber-800 bg-amber-50 border-amber-200" 
                        : "text-slate-600 bg-slate-100 border-slate-200"
                    }`}>
                      <span>{selectedDrawerRecord.relevanceLabel} RELEVANCE</span>
                      {typeof selectedDrawerRecord.similarity === "number" && (
                        <span>({(selectedDrawerRecord.similarity * 100).toFixed(1)}%)</span>
                      )}
                    </span>
                  )}
                  {selectedDrawerRecord.contentLength !== undefined && selectedDrawerRecord.contentLength > 0 && (
                    <span className="font-mono text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 inline-flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-400" />
                      <span>{selectedDrawerRecord.contentLength.toLocaleString()} characters</span>
                    </span>
                  )}
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
                  {renderFormattedMarkdown(selectedDrawerRecord.cleanedContent || selectedDrawerRecord.content)}
                </div>
              </div>

              {/* Database Context Metadata Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 text-xs">
                <div className="font-bold text-slate-800 flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#ae2424]" />
                    <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-700">Source Intelligence & Provenance</span>
                  </div>
                  {selectedDrawerRecord.relevanceLabel && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                      selectedDrawerRecord.relevanceLabel === "HIGH"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : selectedDrawerRecord.relevanceLabel === "MEDIUM"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}>
                      {selectedDrawerRecord.relevanceLabel} RELEVANCE
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400 block font-medium">Source Domain:</span>
                    <span className="font-mono text-slate-900 font-semibold truncate block mt-0.5">
                      {selectedDrawerRecord.domain || selectedDrawerRecord.sourceDomain}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Category:</span>
                    <span className="font-semibold text-slate-900 truncate block mt-0.5">
                      {selectedDrawerRecord.material_category || "Procurement Standards"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Relevance:</span>
                    <span className="font-semibold text-slate-900 block mt-0.5">
                      {selectedDrawerRecord.relevanceLabel || "STANDARD"}
                      {typeof selectedDrawerRecord.similarity === "number" && (
                        <span className="font-mono text-slate-500 font-normal"> — {(selectedDrawerRecord.similarity * 100).toFixed(2)}%</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Original Content:</span>
                    <span className="font-mono text-slate-800 font-medium block mt-0.5">
                      {selectedDrawerRecord.contentLength 
                        ? (selectedDrawerRecord.contentLength >= 1000 
                            ? `${(selectedDrawerRecord.contentLength / 1000).toFixed(2)}k characters` 
                            : `${selectedDrawerRecord.contentLength} characters`)
                        : `${selectedDrawerRecord.content.length} characters`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Cleaned Content:</span>
                    <span className="font-mono text-slate-800 font-medium block mt-0.5">
                      {selectedDrawerRecord.cleanedContentLength
                        ? (selectedDrawerRecord.cleanedContentLength >= 1000
                            ? `${(selectedDrawerRecord.cleanedContentLength / 1000).toFixed(2)}k characters`
                            : `${selectedDrawerRecord.cleanedContentLength} characters`)
                        : `${(selectedDrawerRecord.cleanedContent || selectedDrawerRecord.content).length} characters`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Indexed Date:</span>
                    <span className="text-slate-700 block mt-0.5">
                      {selectedDrawerRecord.created_at
                        ? new Date(selectedDrawerRecord.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                        : "Verified Archive"}
                    </span>
                  </div>
                </div>

                {/* Data Indicator Badges */}
                <div className="pt-3 border-t border-slate-100 space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Data Detected in Document:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border ${
                      selectedDrawerRecord.has_price_data 
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                        : "bg-slate-50 text-slate-400 border-slate-200"
                    }`}>
                      <span>{selectedDrawerRecord.has_price_data ? "✓" : "✗"}</span>
                      <span>Price data</span>
                    </span>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border ${
                      selectedDrawerRecord.has_quantity_data 
                        ? "bg-purple-50 text-purple-800 border-purple-200" 
                        : "bg-slate-50 text-slate-400 border-slate-200"
                    }`}>
                      <span>{selectedDrawerRecord.has_quantity_data ? "✓" : "✗"}</span>
                      <span>Quantity data</span>
                    </span>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border ${
                      selectedDrawerRecord.has_specification_data 
                        ? "bg-blue-50 text-blue-800 border-blue-200" 
                        : "bg-slate-50 text-slate-400 border-slate-200"
                    }`}>
                      <span>{selectedDrawerRecord.has_specification_data ? "✓" : "✗"}</span>
                      <span>Specifications</span>
                    </span>
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
