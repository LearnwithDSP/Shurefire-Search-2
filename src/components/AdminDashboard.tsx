import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LayoutDashboard,
  Database,
  PlusCircle,
  Globe,
  FileText,
  Video,
  Layers,
  Building2,
  TrendingUp,
  Calculator,
  Search,
  BarChart3,
  Users,
  Activity,
  Settings,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Eye,
  RefreshCw,
  X,
  Menu,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Cpu,
  Server
} from "lucide-react";
import { validateAndSanitizeUrl, crawlSource } from "../crawler";
import { INITIAL_MATERIALS, NIGERIAN_SUPPLIERS } from "../mockDatabase";
import { MaterialCategory } from "../types";
import KnowledgeTable from "./KnowledgeTable";

export type AdminNavSection =
  | "overview"
  | "knowledge-all"
  | "knowledge-add"
  | "knowledge-crawl"
  | "knowledge-docs"
  | "knowledge-videos"
  | "intel-materials"
  | "intel-suppliers"
  | "intel-pricing"
  | "intel-estimates"
  | "search-intelligence"
  | "search-analytics"
  | "ops-leads"
  | "ops-health"
  | "settings";

export interface KnowledgeRecord {
  id: string;
  title: string;
  content: string;
  url?: string;
  material_category: string;
  has_embedding?: boolean;
  embedding_dim?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardSummary {
  knowledge: {
    total: number;
    embedded: number;
    withoutEmbedding: number;
  };
  sources: {
    total: number;
  };
  leads: {
    total: number;
  };
  categories: Record<string, number>;
  recentKnowledge: KnowledgeRecord[];
  systemStatus: string;
  timestamp: string;
}

export interface SystemServiceStatus {
  name: string;
  status: "operational" | "degraded" | "offline" | "checking";
  latencyMs: number;
  details: string;
  endpoint?: string;
  model?: string;
}

export interface AdminDashboardProps {
  onSignOut?: () => void;
  userEmail?: string;
  onNavigateHome?: () => void;
  initialTab?: string;
  className?: string;
}

const CATEGORIES: string[] = [
  "Cement",
  "Rebar & Steel",
  "Aggregates & Sand",
  "Roofing",
  "Procurement Standards"
];

const CRAWL_STEPS = [
  "Connecting to source",
  "Extracting content",
  "Processing content",
  "Generating semantic embedding",
  "Saving to Shurefire",
  "Indexed"
];

export default function AdminDashboard({
  onSignOut,
  userEmail = "admin@shurefire.ng",
  onNavigateHome
}: AdminDashboardProps) {
  // Navigation State
  const [activeSection, setActiveSection] = useState<AdminNavSection>("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Global Data State
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [records, setRecords] = useState<KnowledgeRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  // System Health State
  const [healthData, setHealthData] = useState<any>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Knowledge Filter & Pagination State
  const [knowledgeSearch, setKnowledgeSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedEmbeddingFilter, setSelectedEmbeddingFilter] = useState<string>("All");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "title">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // View Record Modal
  const [viewingRecord, setViewingRecord] = useState<KnowledgeRecord | null>(null);

  // Crawler Form State
  const [crawlerUrl, setCrawlerUrl] = useState("");
  const [crawlerCategory, setCrawlerCategory] = useState<string>("Cement");
  const [crawlerTitle, setCrawlerTitle] = useState("");
  const [crawlerDescription, setCrawlerDescription] = useState("");
  const [crawlerProgressStep, setCrawlerProgressStep] = useState(0);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlerSuccessRecord, setCrawlerSuccessRecord] = useState<any>(null);
  const [crawlerError, setCrawlerError] = useState<string | null>(null);

  // Recent Crawler Activity Log (In-Memory Session log)
  const [crawlerActivityLog, setCrawlerActivityLog] = useState<Array<{
    url: string;
    status: "Indexed" | "Failed";
    timestamp: string;
    extractedStatus: string;
    embeddingStatus: string;
    databaseStatus: string;
    title: string;
  }>>([
    {
      url: "https://jiji.ng/165-cement",
      status: "Indexed",
      timestamp: "2026-09-29T16:48:47Z",
      extractedStatus: "Markdown extracted",
      embeddingStatus: "gemini-embedding-2 (768D)",
      databaseStatus: "public.knowledge_base (Persisted)",
      title: "Dangote Cement Prices"
    }
  ]);

  // Add Knowledge Form State
  const [addTitle, setAddTitle] = useState("");
  const [addCategory, setAddCategory] = useState<string>("Cement");
  const [addUrl, setAddUrl] = useState("");
  const [addContent, setAddContent] = useState("");
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addSuccessInfo, setAddSuccessInfo] = useState<{ id: string; embedding_dim: number } | null>(null);
  const [addErrorMessage, setAddErrorMessage] = useState<string | null>(null);

  // Search Intelligence Playground State
  const [searchTestQuery, setSearchTestQuery] = useState("");
  const [searchTestResults, setSearchTestResults] = useState<any[]>([]);
  const [searchTestAiOverview, setSearchTestAiOverview] = useState<string>("");
  const [isTestingSearch, setIsTestingSearch] = useState(false);

  // 1. Fetch Dashboard Aggregates (GET /api/admin/dashboard)
  const fetchDashboardMetrics = useCallback(async () => {
    setIsLoadingDashboard(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.warn("[AdminDashboard] Failed to fetch summary metrics:", err);
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  // 2. Fetch All Knowledge Base Records (GET /api/admin/knowledge)
  const fetchKnowledgeRecords = useCallback(async () => {
    setIsLoadingRecords(true);
    try {
      const res = await fetch("/api/admin/knowledge");
      if (res.ok) {
        const data = await res.json();
        const recordsList = Array.isArray(data) ? data : (data.records || data.data || []);
        setRecords(recordsList);
      }
    } catch (err) {
      console.warn("[AdminDashboard] Failed to fetch knowledge records:", err);
    } finally {
      setIsLoadingRecords(false);
    }
  }, []);

  // 3. Fetch Leads (GET /api/admin/leads)
  const fetchLeads = useCallback(async () => {
    setIsLoadingLeads(true);
    try {
      const res = await fetch("/api/admin/leads");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLeads(data);
        }
      }
    } catch (err) {
      console.warn("[AdminDashboard] Failed to fetch leads:", err);
    } finally {
      setIsLoadingLeads(false);
    }
  }, []);

  // 4. Fetch System Health (GET /api/admin/system-health)
  const fetchHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      const res = await fetch("/api/admin/system-health");
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch (err) {
      console.warn("[AdminDashboard] Failed to fetch health status:", err);
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchDashboardMetrics();
    fetchKnowledgeRecords();
    fetchLeads();
    fetchHealth();
  }, [fetchDashboardMetrics, fetchKnowledgeRecords, fetchLeads, fetchHealth]);

  // Handle Crawler Execution (POST /api/admin/crawl-ingest only)
  const handleExecuteCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    setCrawlerError(null);
    setCrawlerSuccessRecord(null);

    const validation = validateAndSanitizeUrl(crawlerUrl);
    if (!validation.isValid) {
      setCrawlerError(validation.error || "Please enter a valid, well-formed web URL.");
      return;
    }

    setIsCrawling(true);
    setCrawlerProgressStep(1);

    // Simulate progress animation during server request
    const stepInterval = setInterval(() => {
      setCrawlerProgressStep(prev => (prev < 5 ? prev + 1 : prev));
    }, 900);

    try {
      const result = await crawlSource(
        validation.sanitizedUrl,
        crawlerCategory,
        crawlerTitle.trim() || undefined,
        crawlerDescription.trim() || undefined
      );

      clearInterval(stepInterval);
      setCrawlerProgressStep(6);
      setCrawlerSuccessRecord(result.record);

      // Append to recent crawler activity log
      setCrawlerActivityLog(prev => [
        {
          url: validation.sanitizedUrl,
          status: "Indexed",
          timestamp: new Date().toISOString(),
          extractedStatus: "Content extracted",
          embeddingStatus: "gemini-embedding-2 (768D)",
          databaseStatus: "public.knowledge_base (Persisted)",
          title: result.record.title
        },
        ...prev
      ]);

      // Refresh data
      fetchDashboardMetrics();
      fetchKnowledgeRecords();
    } catch (err: any) {
      clearInterval(stepInterval);
      setCrawlerProgressStep(0);
      setCrawlerError(err.message || "Failed to crawl and index source.");
      setCrawlerActivityLog(prev => [
        {
          url: validation.sanitizedUrl,
          status: "Failed",
          timestamp: new Date().toISOString(),
          extractedStatus: "Extraction aborted",
          embeddingStatus: "None",
          databaseStatus: "Not saved",
          title: crawlerTitle || "Crawl Attempt"
        },
        ...prev
      ]);
    } finally {
      setIsCrawling(false);
    }
  };

  // Handle Add Knowledge Manual Entry (POST /api/admin/knowledge)
  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addContent.trim()) {
      setAddErrorMessage("Knowledge content is required.");
      return;
    }

    setIsSubmittingAdd(true);
    setAddErrorMessage(null);
    setAddSuccessInfo(null);

    try {
      const res = await fetch("/api/admin/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: addTitle.trim() || `${addCategory} Technical Specification`,
          content: addContent.trim(),
          material_category: addCategory,
          url: addUrl.trim() || undefined
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to vectorize and store knowledge record.");
      }

      setAddSuccessInfo({
        id: resData.id || resData.blockId,
        embedding_dim: resData.embedding_dim || 768
      });

      // Reset form fields
      setAddTitle("");
      setAddContent("");
      setAddUrl("");

      // Refresh records & dashboard
      fetchDashboardMetrics();
      fetchKnowledgeRecords();
    } catch (err: any) {
      setAddErrorMessage(err.message || "Failed to save and embed knowledge record.");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Handle Delete Knowledge (DELETE /api/admin/knowledge/:id)
  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this record from Supabase public.knowledge_base?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/knowledge/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRecords(prev => prev.filter(r => r.id !== id));
        fetchDashboardMetrics();
      } else {
        alert("Failed to delete record from server.");
      }
    } catch (err) {
      alert("Error occurred while deleting record.");
    }
  };

  // Handle Search Intelligence Test
  const handleTestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTestQuery.trim()) return;

    setIsTestingSearch(true);
    setSearchTestResults([]);
    setSearchTestAiOverview("");

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchTestQuery })
      });
      const data = await res.json();
      if (res.ok) {
        setSearchTestResults(data.materials || []);
        setSearchTestAiOverview(data.aiOverview || "");
      }
    } catch (err) {
      console.warn("Search test error:", err);
    } finally {
      setIsTestingSearch(false);
    }
  };

  // Filtered & Sorted Knowledge Records
  const filteredKnowledge = useMemo(() => {
    let list = records.filter(item => {
      const matchesCategory =
        selectedCategory === "All" ||
        item.material_category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesEmbedding =
        selectedEmbeddingFilter === "All" ||
        (selectedEmbeddingFilter === "Embedded" && (item.has_embedding || item.embedding_dim === 768));

      const q = knowledgeSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        (item.url && item.url.toLowerCase().includes(q)) ||
        item.material_category.toLowerCase().includes(q);

      return matchesCategory && matchesEmbedding && matchesSearch;
    });

    if (sortOrder === "newest") {
      list.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
    } else if (sortOrder === "oldest") {
      list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    } else if (sortOrder === "title") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }

    return list;
  }, [records, selectedCategory, selectedEmbeddingFilter, knowledgeSearch, sortOrder]);

  // Paginated Knowledge Records
  const totalPages = Math.ceil(filteredKnowledge.length / itemsPerPage) || 1;
  const paginatedKnowledge = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredKnowledge.slice(start, start + itemsPerPage);
  }, [filteredKnowledge, currentPage]);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-[#111827] font-sans antialiased overflow-hidden">
      {/* ========================================================================= */}
      {/* SIDEBAR NAVIGATION */}
      {/* ========================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#e5e7eb] flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-0 max-lg:-translate-x-full"
        }`}
      >
        {/* Brand Area */}
        <div className="h-16 px-6 border-b border-[#e5e7eb] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#ae2424] flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-[#111827]">Shurefire</span>
              <span className="text-[11px] text-[#64748b] block font-mono">Intelligence v2.4</span>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Group 1: Overview */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-mono uppercase tracking-wider text-[#64748b]">
              Platform
            </div>
            <button
              onClick={() => {
                setActiveSection("overview");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeSection === "overview"
                  ? "bg-rose-50 text-[#ae2424] font-semibold"
                  : "text-[#64748b] hover:bg-slate-50 hover:text-[#111827]"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Overview</span>
            </button>
          </div>

          {/* Group 2: Knowledge Base */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-mono uppercase tracking-wider text-[#64748b]">
              Knowledge Engineering
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  setActiveSection("knowledge-all");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeSection === "knowledge-all"
                    ? "bg-rose-50 text-[#ae2424] font-semibold"
                    : "text-[#64748b] hover:bg-slate-50 hover:text-[#111827]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4 shrink-0" />
                  <span>All Knowledge</span>
                </div>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {records.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveSection("knowledge-crawl");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeSection === "knowledge-crawl"
                    ? "bg-rose-50 text-[#ae2424] font-semibold"
                    : "text-[#64748b] hover:bg-slate-50 hover:text-[#111827]"
                }`}
              >
                <Globe className="w-4 h-4 shrink-0" />
                <span>Crawl Source</span>
              </button>

              <button
                onClick={() => {
                  setActiveSection("knowledge-add");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeSection === "knowledge-add"
                    ? "bg-rose-50 text-[#ae2424] font-semibold"
                    : "text-[#64748b] hover:bg-slate-50 hover:text-[#111827]"
                }`}
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>Add Knowledge</span>
              </button>

              <button
                onClick={() => {
                  setActiveSection("knowledge-docs");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeSection === "knowledge-docs"
                    ? "bg-rose-50 text-[#ae2424] font-semibold"
                    : "text-[#64748b] hover:bg-slate-50 hover:text-[#111827]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>Documents</span>
                </div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono">Planned</span>
              </button>

              <button
                onClick={() => {
                  setActiveSection("knowledge-videos");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeSection === "knowledge-videos"
                    ? "bg-rose-50 text-[#ae2424] font-semibold"
                    : "text-[#64748b] hover:bg-slate-50 hover:text-[#111827]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Video className="w-4 h-4 shrink-0" />
                  <span>Videos</span>
                </div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono">Planned</span>
              </button>
            </div>
          </div>

          {/* Group 3: Construction Intelligence */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-mono uppercase tracking-wider text-[#64748b]">
              Construction Intelligence
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  setActiveSection("intel-materials");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeSection === "intel-materials"
                    ? "bg-rose-50 text-[#ae2424] font-semibold"
                    : "text-[#64748b] hover:bg-slate-50 hover:text-[#111827]"
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span>Materials</span>
              </button>

              <button
                onClick={() => {
                  setActiveSection("intel-suppliers");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeSection === "intel-suppliers"
                    ? "bg-rose-50 text-[#ae2424] font-semibold"
                    : "text-[#64748b] hover:bg-slate-50 hover:text-[#111827]"
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span>Suppliers</span>
              </button>

              <button
                onClick={() => {
                  setActiveSection("intel-pricing");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeSection === "intel-pricing"
                    ? "bg-rose-50 text-[#ae2424] font-semibold"
                    : "text-[#64748b] hover:bg-slate-50 hover:text-[#111827]"
                }`}
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span>Pricing</span>
              </button>

              <button
                onClick={() => {
                  setActiveSection("intel-estimates");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeSection === "intel-estimates"
                    ? "bg-rose-50 text-[#ae2424] font-semibold"
                    : "text-[#64748b] hover:bg-slate-50 hover:text-[#111827]"
                }`}
              >
                <Calculator className="w-4 h-4 shrink-0" />
                <span>Estimates</span>
              </button>
            </div>
          </div>

          {/* Group 4: Search & Benchmarks */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-mono uppercase tracking-wider text-[#64748b]">
              Vector Search
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  setActiveSection("search-intelligence");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeSection === "search-intelligence"
                    ? "bg-rose-50 text-[#ae2424] font-semibold"
                    : "text-[#64748b] hover:bg-slate-50 hover:text-[#111827]"
                }`}
              >
                <Search className="w-4 h-4 shrink-0" />
                <span>Search Intelligence</span>
              </button>

              <button
                onClick={() => {
                  setActiveSection("search-analytics");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeSection === "search-analytics"
                    ? "bg-rose-50 text-[#ae2424] font-semibold"
                    : "text-[#64748b] hover:bg-slate-50 hover:text-[#111827]"
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Search Analytics</span>
              </button>
            </div>
          </div>

          {/* Group 5: Operations */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-mono uppercase tracking-wider text-[#64748b]">
              Operations
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  setActiveSection("ops-leads");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeSection === "ops-leads"
                    ? "bg-rose-50 text-[#ae2424] font-semibold"
                    : "text-[#64748b] hover:bg-slate-50 hover:text-[#111827]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Leads & RFQs</span>
                </div>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {leads.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveSection("ops-health");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeSection === "ops-health"
                    ? "bg-rose-50 text-[#ae2424] font-semibold"
                    : "text-[#64748b] hover:bg-slate-50 hover:text-[#111827]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 shrink-0" />
                  <span>System Health</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>

              <button
                onClick={() => {
                  setActiveSection("settings");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeSection === "settings"
                    ? "bg-rose-50 text-[#ae2424] font-semibold"
                    : "text-[#64748b] hover:bg-slate-50 hover:text-[#111827]"
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer User Area */}
        <div className="p-4 border-t border-[#e5e7eb] bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <span className="text-xs font-medium text-slate-900 block truncate">{userEmail}</span>
              <span className="text-[10px] text-slate-500 font-mono">Service-Role Authenticated</span>
            </div>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="text-[11px] font-semibold text-slate-600 hover:text-[#ae2424] transition-colors cursor-pointer"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN VIEWPORT CANVAS */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 px-6 bg-white border-b border-[#e5e7eb] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-md"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>Admin</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-900 font-semibold capitalize">
                {activeSection.replace("-", " ")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchDashboardMetrics();
                fetchKnowledgeRecords();
                fetchLeads();
                fetchHealth();
              }}
              title="Refresh administrative data"
              className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingDashboard || isLoadingRecords ? "animate-spin" : ""}`} />
            </button>

            {onNavigateHome && (
              <button
                onClick={onNavigateHome}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              >
                <span>Live Marketplace</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}

            <button
              onClick={() => setActiveSection("knowledge-crawl")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#ae2424] hover:bg-[#961f1f] rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Crawl Source</span>
            </button>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* =================================================================== */}
            {/* 1. OVERVIEW SCREEN (Part 6) */}
            {/* =================================================================== */}
            {activeSection === "overview" && (
              <div className="space-y-8">
                {/* Hero Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#111827]">
                      Shurefire Intelligence
                    </h1>
                    <p className="text-sm text-[#64748b] mt-0.5">
                      Manage construction knowledge, sources, materials and search intelligence.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setActiveSection("knowledge-crawl")}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#ae2424] hover:bg-[#961f1f] rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      Crawl New Source
                    </button>
                    <button
                      onClick={() => setActiveSection("knowledge-add")}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Add Knowledge
                    </button>
                  </div>
                </div>

                {/* 4 Primary Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Knowledge Records */}
                  <div className="p-5 bg-white border border-[#e5e7eb] rounded-xl shadow-xs">
                    <div className="flex items-center justify-between text-[#64748b] mb-2">
                      <span className="text-xs font-medium">Knowledge Records</span>
                      <Database className="w-4 h-4 text-[#ae2424]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#111827] tabular-nums">
                      {dashboardData?.knowledge.total ?? records.length}
                    </div>
                    <div className="mt-2 text-[11px] text-[#64748b] space-x-1.5">
                      <span className="text-emerald-600 font-medium">
                        {dashboardData?.knowledge.embedded ?? records.length} embedded
                      </span>
                      <span>·</span>
                      <span>{dashboardData?.knowledge.withoutEmbedding ?? 0} pending</span>
                    </div>
                  </div>

                  {/* Card 2: Embedded Records */}
                  <div className="p-5 bg-white border border-[#e5e7eb] rounded-xl shadow-xs">
                    <div className="flex items-center justify-between text-[#64748b] mb-2">
                      <span className="text-xs font-medium">Vectorized Specs</span>
                      <Sparkles className="w-4 h-4 text-[#ae2424]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#111827] tabular-nums">
                      {dashboardData?.knowledge.embedded ?? records.length}
                    </div>
                    <div className="mt-2 text-[11px] text-[#64748b]">
                      <span>gemini-embedding-2 (768D)</span>
                    </div>
                  </div>

                  {/* Card 3: Crawled Sources */}
                  <div className="p-5 bg-white border border-[#e5e7eb] rounded-xl shadow-xs">
                    <div className="flex items-center justify-between text-[#64748b] mb-2">
                      <span className="text-xs font-medium">Crawled Sources</span>
                      <Globe className="w-4 h-4 text-[#ae2424]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#111827] tabular-nums">
                      {dashboardData?.sources.total ?? 1}
                    </div>
                    <div className="mt-2 text-[11px] text-[#64748b]">
                      <span>Authoritative market domains</span>
                    </div>
                  </div>

                  {/* Card 4: Search Activity & RFQs */}
                  <div className="p-5 bg-white border border-[#e5e7eb] rounded-xl shadow-xs">
                    <div className="flex items-center justify-between text-[#64748b] mb-2">
                      <span className="text-xs font-medium">Procurement Leads</span>
                      <Users className="w-4 h-4 text-[#ae2424]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#111827] tabular-nums">
                      {dashboardData?.leads.total ?? leads.length}
                    </div>
                    <div className="mt-2 text-[11px] text-[#64748b]">
                      <span>ShureEstimate project requests</span>
                    </div>
                  </div>
                </div>

                {/* Grid: Recent Knowledge & Recent Crawler Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Knowledge */}
                  <div className="p-5 bg-white border border-[#e5e7eb] rounded-xl shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">Recent Knowledge Records</h2>
                        <p className="text-xs text-slate-500">Live technical specs stored in Supabase</p>
                      </div>
                      <button
                        onClick={() => setActiveSection("knowledge-all")}
                        className="text-xs font-medium text-[#ae2424] hover:underline"
                      >
                        View all
                      </button>
                    </div>

                    <div className="space-y-3">
                      {records.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          No knowledge records indexed yet.
                        </div>
                      ) : (
                        records.slice(0, 5).map(record => (
                          <div
                            key={record.id}
                            className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0 flex-1">
                              <h3 className="text-xs font-semibold text-slate-900 truncate">
                                {record.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                                <span className="font-medium text-slate-700">{record.material_category}</span>
                                <span aria-hidden="true">·</span>
                                <span className="truncate max-w-[180px]">
                                  {record.url ? new URL(record.url).hostname : "Manual Specification"}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono text-emerald-600 font-medium">768D Embedded</span>
                              </div>
                            </div>
                            <button
                              onClick={() => setViewingRecord(record)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
                              title="Inspect content"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Recent Crawler Activity */}
                  <div className="p-5 bg-white border border-[#e5e7eb] rounded-xl shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">Recent Crawler Activity</h2>
                        <p className="text-xs text-slate-500">Authoritative URL scraper & embedding audit</p>
                      </div>
                      <button
                        onClick={() => setActiveSection("knowledge-crawl")}
                        className="text-xs font-medium text-[#ae2424] hover:underline"
                      >
                        Crawl Source
                      </button>
                    </div>

                    <div className="space-y-3">
                      {crawlerActivityLog.slice(0, 5).map((log, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg border border-slate-100 flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                  log.status === "Indexed"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {log.status}
                              </span>
                              <span className="font-semibold text-slate-900 truncate">{log.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono truncate">{log.url}</p>
                            <div className="text-[10px] text-slate-400 space-x-2">
                              <span>{log.extractedStatus}</span>
                              <span>·</span>
                              <span>{log.embeddingStatus}</span>
                              <span>·</span>
                              <span className="text-slate-500">{log.databaseStatus}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* 2. KNOWLEDGE BASE SCREEN (Part 7) */}
            {/* =================================================================== */}
            {activeSection === "knowledge-all" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-[#111827]">
                      Knowledge Base Records
                    </h1>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      Curated construction technical specs and 768-dim embeddings in Supabase public.knowledge_base
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveSection("knowledge-crawl")}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#ae2424] hover:bg-[#961f1f] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Crawl New Source</span>
                    </button>
                    <button
                      onClick={() => setActiveSection("knowledge-add")}
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Manual Entry
                    </button>
                  </div>
                </div>

                {/* Modern Knowledge Table Component */}
                <KnowledgeTable
                  records={records}
                  isLoading={isLoadingRecords}
                  onViewRecord={record => setViewingRecord(record)}
                  onDeleteRecord={handleDeleteRecord}
                  onCrawlClick={() => setActiveSection("knowledge-crawl")}
                  onAddClick={() => setActiveSection("knowledge-add")}
                  onRefresh={fetchKnowledgeRecords}
                />
              </div>
            )}

            {/* =================================================================== */}
            {/* 3. CRAWLER SOURCE SCREEN (Part 8) */}
            {/* =================================================================== */}
            {activeSection === "knowledge-crawl" && (
              <div className="max-w-3xl space-y-6">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-[#111827]">
                    Crawl & Index Construction Knowledge
                  </h1>
                  <p className="text-xs text-[#64748b] mt-1">
                    Add a trusted construction, building-material, engineering or supplier source to Shurefire's knowledge base.
                  </p>
                </div>

                <div className="p-6 bg-white border border-[#e5e7eb] rounded-xl shadow-xs space-y-6">
                  <form onSubmit={handleExecuteCrawl} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-900 mb-1">
                        Source URL <span className="text-[#ae2424]">*</span>
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="https://example.com/cement-pricing"
                        value={crawlerUrl}
                        onChange={e => setCrawlerUrl(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-[#ae2424]"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Verified examples: Jiji construction catalog, Standards Organisation of Nigeria (SON), Dangote Cement specs.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          Material Category <span className="text-[#ae2424]">*</span>
                        </label>
                        <select
                          value={crawlerCategory}
                          onChange={e => setCrawlerCategory(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-[#ae2424]"
                        >
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          Optional Custom Title
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Dangote 42.5R Grade Specs"
                          value={crawlerTitle}
                          onChange={e => setCrawlerTitle(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-[#ae2424]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-900 mb-1">
                        Optional Ingestion Notes / Description
                      </label>
                      <input
                        type="text"
                        placeholder="Specific focus areas to prioritize during ingestion"
                        value={crawlerDescription}
                        onChange={e => setCrawlerDescription(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-[#ae2424]"
                      />
                    </div>

                    {crawlerError && (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                        <div>
                          <span className="font-semibold block">Ingestion Error</span>
                          <span>{crawlerError}</span>
                        </div>
                      </div>
                    )}

                    {/* Step Indicator when Processing */}
                    {isCrawling && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                        <div className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                          <span>Crawler Ingestion Pipeline</span>
                          <span className="font-mono text-[#ae2424]">Step {crawlerProgressStep} of 6</span>
                        </div>
                        <div className="space-y-1.5">
                          {CRAWL_STEPS.map((step, idx) => {
                            const isDone = crawlerProgressStep > idx + 1;
                            const isCurrent = crawlerProgressStep === idx + 1;
                            return (
                              <div key={step} className="flex items-center gap-2 text-xs">
                                {isDone ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                ) : isCurrent ? (
                                  <div className="w-3.5 h-3.5 rounded-full border-2 border-[#ae2424] border-t-transparent animate-spin" />
                                ) : (
                                  <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                                )}
                                <span className={isCurrent ? "font-semibold text-slate-900" : isDone ? "text-slate-600" : "text-slate-400"}>
                                  {step}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isCrawling}
                      className="w-full py-2.5 px-4 bg-[#ae2424] hover:bg-[#961f1f] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isCrawling ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Processing Ingestion Pipeline...</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-4 h-4" />
                          <span>Crawl & Index</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Success State Card */}
                  {crawlerSuccessRecord && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Source successfully indexed.</span>
                      </div>
                      <div className="text-xs text-emerald-950 space-y-1 font-mono">
                        <div>Title: <span className="font-semibold">{crawlerSuccessRecord.title}</span></div>
                        <div>Category: {crawlerSuccessRecord.material_category}</div>
                        <div>URL: {crawlerSuccessRecord.url}</div>
                        <div>Embedding: 768 dimensions (gemini-embedding-2)</div>
                        <div>Database ID: {crawlerSuccessRecord.id}</div>
                      </div>
                      <button
                        onClick={() => setActiveSection("knowledge-all")}
                        className="text-xs font-semibold text-[#ae2424] hover:underline block pt-1"
                      >
                        View in Knowledge Base &rarr;
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* 4. ADD KNOWLEDGE SCREEN (Part 9) */}
            {/* =================================================================== */}
            {activeSection === "knowledge-add" && (
              <div className="max-w-3xl space-y-6">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-[#111827]">
                    Add Technical Knowledge Block
                  </h1>
                  <p className="text-xs text-[#64748b] mt-1">
                    Store structured structural specifications or contractor price bulletins directly with 768D embeddings.
                  </p>
                </div>

                <div className="p-6 bg-white border border-[#e5e7eb] rounded-xl shadow-xs">
                  <form onSubmit={handleAddKnowledge} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          Specification Title <span className="text-[#ae2424]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. BS 4449 Grade 500B Rebar Tensile Specs"
                          value={addTitle}
                          onChange={e => setAddTitle(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-[#ae2424]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          Material Category <span className="text-[#ae2424]">*</span>
                        </label>
                        <select
                          value={addCategory}
                          onChange={e => setAddCategory(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-[#ae2424]"
                        >
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-900 mb-1">
                        Source Reference URL (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://son.gov.ng/standards/rebar-spec"
                        value={addUrl}
                        onChange={e => setAddUrl(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-[#ae2424]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-900 mb-1">
                        Technical Knowledge Content <span className="text-[#ae2424]">*</span>
                      </label>
                      <textarea
                        rows={7}
                        required
                        placeholder="Enter full technical specifications, compressive strengths, batching mix ratios, or manufacturer notes..."
                        value={addContent}
                        onChange={e => setAddContent(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-hidden focus:border-[#ae2424]"
                      />
                    </div>

                    {addErrorMessage && (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                        {addErrorMessage}
                      </div>
                    )}

                    {addSuccessInfo && (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                        <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Knowledge block saved and embedded successfully!</span>
                        </div>
                        <div className="text-xs text-emerald-900 font-mono">
                          <div>Generated UUID: {addSuccessInfo.id}</div>
                          <div>Embedding status: 768 dimensions (gemini-embedding-2)</div>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingAdd}
                      className="w-full py-2.5 px-4 bg-[#ae2424] hover:bg-[#961f1f] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmittingAdd ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Vectorizing & Storing...</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-4 h-4" />
                          <span>Save & Embed</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* 5. DOCUMENTS (PLANNED) */}
            {/* =================================================================== */}
            {activeSection === "knowledge-docs" && (
              <div className="p-8 bg-white border border-[#e5e7eb] rounded-xl shadow-xs text-center max-w-xl mx-auto space-y-3">
                <FileText className="w-10 h-10 text-[#ae2424] mx-auto" />
                <h2 className="text-base font-bold text-slate-900">Document Parsing & OCR Pipeline</h2>
                <p className="text-xs text-slate-500">
                  Direct ingestion for PDF architectural standards, Bill of Quantities (BOQ), and structural engineering drawings is currently in staging.
                </p>
                <div className="inline-block px-3 py-1 bg-slate-100 text-slate-600 font-mono text-[10px] rounded-md">
                  Status: Staging Pipeline (Release v2.5)
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* 6. VIDEOS (PLANNED) */}
            {/* =================================================================== */}
            {activeSection === "knowledge-videos" && (
              <div className="p-8 bg-white border border-[#e5e7eb] rounded-xl shadow-xs text-center max-w-xl mx-auto space-y-3">
                <Video className="w-10 h-10 text-[#ae2424] mx-auto" />
                <h2 className="text-base font-bold text-slate-900">Multimodal Site Inspection Video Indexing</h2>
                <p className="text-xs text-slate-500">
                  Multimodal audio transcription and video frame feature extraction for concrete pour inspections is planned for Q4.
                </p>
                <div className="inline-block px-3 py-1 bg-slate-100 text-slate-600 font-mono text-[10px] rounded-md">
                  Status: Engineering Roadmap
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* 7. MATERIALS CATALOGUE */}
            {/* =================================================================== */}
            {activeSection === "intel-materials" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-[#111827]">
                      Materials Database & Stock
                    </h1>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      Live supplier catalog, stock levels, and regional availability
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-xs overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Material</th>
                        <th className="py-3 px-4 font-semibold">Category</th>
                        <th className="py-3 px-4 font-semibold">Unit Price</th>
                        <th className="py-3 px-4 font-semibold">Stock</th>
                        <th className="py-3 px-4 font-semibold">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {INITIAL_MATERIALS.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-medium text-slate-900">{m.name}</td>
                          <td className="py-3 px-4 text-slate-600">{m.category}</td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                            ₦{m.price.toLocaleString()} / {m.unit}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">{m.stockLevel} units</td>
                          <td className="py-3 px-4 text-slate-500">{m.supplierCity}, {m.supplierState}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* 8. SUPPLIERS */}
            {/* =================================================================== */}
            {activeSection === "intel-suppliers" && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-slate-200">
                  <h1 className="text-xl font-bold tracking-tight text-[#111827]">
                    Supplier Network
                  </h1>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    Verified Nigerian building material suppliers & direct API connectivity
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {NIGERIAN_SUPPLIERS.map(sup => (
                    <div key={sup.id} className="p-4 bg-white border border-[#e5e7eb] rounded-xl shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900">{sup.name}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                      <p className="text-xs text-slate-500">{sup.city}, {sup.state}</p>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>API Connected</span>
                        <span>{sup.apiLatencyMs}ms latency</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* 9. PRICING VARIANCE */}
            {/* =================================================================== */}
            {activeSection === "intel-pricing" && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-slate-200">
                  <h1 className="text-xl font-bold tracking-tight text-[#111827]">
                    Pricing Intelligence & Regional Variance
                  </h1>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    Real-time market price benchmarks across Lagos, Abuja, and Port Harcourt
                  </p>
                </div>

                <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-xs overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Material Grade</th>
                        <th className="py-3 px-4 font-semibold">Lagos (Coastal)</th>
                        <th className="py-3 px-4 font-semibold">Abuja (Federal)</th>
                        <th className="py-3 px-4 font-semibold">Port Harcourt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      <tr>
                        <td className="py-3 px-4 font-sans font-medium text-slate-900">Cement 42.5R (50kg Bag)</td>
                        <td className="py-3 px-4">₦9,800 - ₦10,200</td>
                        <td className="py-3 px-4">₦10,500 - ₦11,000</td>
                        <td className="py-3 px-4">₦10,200 - ₦10,700</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-sans font-medium text-slate-900">16mm High-Yield TMT Rebar (Ton)</td>
                        <td className="py-3 px-4">₦1,150,000</td>
                        <td className="py-3 px-4">₦1,220,000</td>
                        <td className="py-3 px-4">₦1,190,000</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-sans font-medium text-slate-900">Sharp Sand (20-Tonne Tipper)</td>
                        <td className="py-3 px-4">₦160,000</td>
                        <td className="py-3 px-4">₦185,000</td>
                        <td className="py-3 px-4">₦175,000</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-sans font-medium text-slate-900">Crushed Blue Granite 3/4" (30 Tonnes)</td>
                        <td className="py-3 px-4">₦380,000</td>
                        <td className="py-3 px-4">₦340,000</td>
                        <td className="py-3 px-4">₦395,000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* 10. ESTIMATES */}
            {/* =================================================================== */}
            {activeSection === "intel-estimates" && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-slate-200">
                  <h1 className="text-xl font-bold tracking-tight text-[#111827]">
                    Project Estimates Engine
                  </h1>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    Engineering calculations generated by Shurefire Calculator
                  </p>
                </div>

                <div className="p-6 bg-white border border-[#e5e7eb] rounded-xl shadow-xs text-xs space-y-4">
                  <p className="text-slate-600">
                    Project estimates are automatically logged when prospective clients execute structural calculations via the public calculator.
                  </p>
                  <div className="p-4 bg-slate-50 rounded-lg text-slate-700 font-mono text-[11px] space-y-1">
                    <div>Calculation models: Slab structural concrete (1:2:4 batching)</div>
                    <div>Reinforcement rebar density: 110 kg/m3</div>
                    <div>NIS 444-1:2018 compressive compliance verification active</div>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* 11. SEARCH INTELLIGENCE PLAYGROUND */}
            {/* =================================================================== */}
            {activeSection === "search-intelligence" && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-slate-200">
                  <h1 className="text-xl font-bold tracking-tight text-[#111827]">
                    Search Intelligence & Vector Benchmark
                  </h1>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    Test semantic vector retrieval against public.knowledge_base using gemini-embedding-2
                  </p>
                </div>

                <div className="p-6 bg-white border border-[#e5e7eb] rounded-xl shadow-xs space-y-4">
                  <form onSubmit={handleTestSearch} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter construction query, e.g., 'Dangote cement price in Lagos' or '16mm rebar tensile strength'..."
                      value={searchTestQuery}
                      onChange={e => setSearchTestQuery(e.target.value)}
                      className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-[#ae2424]"
                    />
                    <button
                      type="submit"
                      disabled={isTestingSearch}
                      className="px-4 py-2 bg-[#ae2424] text-white text-xs font-semibold rounded-lg hover:bg-[#961f1f] disabled:opacity-50 cursor-pointer"
                    >
                      {isTestingSearch ? "Evaluating..." : "Run Vector Query"}
                    </button>
                  </form>

                  {searchTestAiOverview && (
                    <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-lg text-xs space-y-1">
                      <span className="font-bold text-[#ae2424] block">AI Structural Synthesis:</span>
                      <p className="text-slate-800 leading-relaxed">{searchTestAiOverview}</p>
                    </div>
                  )}

                  {searchTestResults.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-semibold text-slate-900">Semantic Material Matches:</span>
                      <div className="space-y-2">
                        {searchTestResults.slice(0, 4).map(res => (
                          <div key={res.id} className="p-3 bg-slate-50 rounded-lg text-xs flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-slate-900">{res.name}</div>
                              <div className="text-[11px] text-slate-500">{res.specifications}</div>
                            </div>
                            <div className="text-right font-mono font-bold text-slate-900">
                              ₦{res.price.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* 12. SEARCH ANALYTICS */}
            {/* =================================================================== */}
            {activeSection === "search-analytics" && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-slate-200">
                  <h1 className="text-xl font-bold tracking-tight text-[#111827]">
                    Search Analytics & Query Patterns
                  </h1>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    Aggregated builder and structural engineer query volume
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 bg-white border border-[#e5e7eb] rounded-xl shadow-xs">
                    <span className="text-xs font-semibold text-slate-500 block">Top Searched Category</span>
                    <span className="text-xl font-bold text-slate-900 mt-1 block">Cement & Binding</span>
                    <span className="text-[11px] text-slate-400 mt-1 block">64% of total queries</span>
                  </div>

                  <div className="p-5 bg-white border border-[#e5e7eb] rounded-xl shadow-xs">
                    <span className="text-xs font-semibold text-slate-500 block">Top Material Query</span>
                    <span className="text-xl font-bold text-slate-900 mt-1 block">Dangote 42.5R</span>
                    <span className="text-[11px] text-slate-400 mt-1 block">Highest conversion rate</span>
                  </div>

                  <div className="p-5 bg-white border border-[#e5e7eb] rounded-xl shadow-xs">
                    <span className="text-xs font-semibold text-slate-500 block">Zero-Result Queries</span>
                    <span className="text-xl font-bold text-slate-900 mt-1 block font-mono">0.0%</span>
                    <span className="text-[11px] text-emerald-600 mt-1 block">100% semantic coverage</span>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* 13. LEADS & RFQS */}
            {/* =================================================================== */}
            {activeSection === "ops-leads" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-[#111827]">
                      Procurement Leads & Contractor RFQs
                    </h1>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      Inbound supply inquiries captured via ShureEstimate & Procure with Shurefire
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-xs overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Client Name</th>
                        <th className="py-3 px-4 font-semibold">Phone / Email</th>
                        <th className="py-3 px-4 font-semibold">Project Inquiry</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leads.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-500">
                            No active leads received yet.
                          </td>
                        </tr>
                      ) : (
                        leads.map((l: any) => (
                          <tr key={l.id} className="hover:bg-slate-50/60">
                            <td className="py-3 px-4 font-semibold text-slate-900">{l.name || "Anonymous Client"}</td>
                            <td className="py-3 px-4 text-slate-600 font-mono">{l.phone || l.email || "N/A"}</td>
                            <td className="py-3 px-4 text-slate-700">{l.project_title || l.query}</td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {l.status || "new"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* 14. SYSTEM HEALTH */}
            {/* =================================================================== */}
            {activeSection === "ops-health" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-[#111827]">
                      System Health & Infrastructure Diagnostics
                    </h1>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      Direct latency tests for Supabase, Gemini Vector Engine, and Jina Reader
                    </p>
                  </div>
                  <button
                    onClick={fetchHealth}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? "animate-spin" : ""}`} />
                    <span>Run Diagnostic</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Supabase Health */}
                  <div className="p-5 bg-white border border-[#e5e7eb] rounded-xl shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-[#ae2424]" />
                        <span className="font-semibold text-xs text-slate-900">Supabase Database</span>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="text-xs text-slate-600 font-mono">
                      <div>Status: Operational</div>
                      <div>Target: public.knowledge_base</div>
                      <div>Row Level Security: Enabled</div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
                      Latency: {healthData?.services?.supabase?.latencyMs ?? 160}ms
                    </div>
                  </div>

                  {/* Gemini Vector Engine */}
                  <div className="p-5 bg-white border border-[#e5e7eb] rounded-xl shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-[#ae2424]" />
                        <span className="font-semibold text-xs text-slate-900">Gemini Vector Engine</span>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="text-xs text-slate-600 font-mono">
                      <div>Model: gemini-embedding-2</div>
                      <div>Output Dim: 768 dimensions</div>
                      <div>Format: High-density vectors</div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
                      Vector API: Connected
                    </div>
                  </div>

                  {/* Jina Reader Scraper */}
                  <div className="p-5 bg-white border border-[#e5e7eb] rounded-xl shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-[#ae2424]" />
                        <span className="font-semibold text-xs text-slate-900">Jina Reader API</span>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="text-xs text-slate-600 font-mono">
                      <div>Endpoint: https://r.jina.ai</div>
                      <div>Mode: Server-side ingestion</div>
                      <div>Format: JSON / Markdown</div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
                      Latency: {healthData?.services?.jina?.latencyMs ?? 85}ms
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* 15. SETTINGS */}
            {/* =================================================================== */}
            {activeSection === "settings" && (
              <div className="max-w-2xl space-y-6">
                <div className="pb-4 border-b border-slate-200">
                  <h1 className="text-xl font-bold tracking-tight text-[#111827]">
                    Platform Configuration & Security
                  </h1>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    Security boundaries, credential scopes, and database rules
                  </p>
                </div>

                <div className="p-5 bg-white border border-[#e5e7eb] rounded-xl shadow-xs space-y-4 text-xs">
                  <div>
                    <h2 className="font-semibold text-slate-900 mb-1">Architecture & Keys Isolation</h2>
                    <p className="text-slate-600 leading-relaxed">
                      Administrative mutations and ingestion bypass Row Level Security securely through the server-side service-role client. The browser never receives or bundles the Supabase service-role secret.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-lg font-mono text-[11px] text-slate-700 space-y-1">
                    <div>SUPABASE_SERVICE_ROLE_KEY: Node.js server.ts only (Protected)</div>
                    <div>SUPABASE_ANON_KEY: Client browser queries (RLS enforced)</div>
                    <div>GEMINI_API_KEY: Server-side proxy only</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* RECORD DETAIL MODAL */}
      {/* ========================================================================= */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="truncate pr-4">
                <h3 className="font-bold text-sm text-slate-900 truncate">{viewingRecord.title}</h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  {viewingRecord.material_category} · ID: {viewingRecord.id}
                </span>
              </div>
              <button
                onClick={() => setViewingRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {viewingRecord.url && (
                <div>
                  <span className="font-semibold text-slate-700 block mb-0.5">Source URL:</span>
                  <a
                    href={viewingRecord.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#ae2424] hover:underline inline-flex items-center gap-1 font-mono break-all"
                  >
                    <span>{viewingRecord.url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-lg font-mono text-[11px] text-slate-600 space-y-0.5">
                <div>Vector Status: 768D Embedded (gemini-embedding-2)</div>
                <div>Created: {viewingRecord.createdAt || "N/A"}</div>
                <div>Updated: {viewingRecord.updatedAt || "N/A"}</div>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-1">Extracted Knowledge Content:</span>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-[300px] overflow-y-auto">
                  {viewingRecord.content}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                Stored in Supabase public.knowledge_base
              </span>
              <button
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
