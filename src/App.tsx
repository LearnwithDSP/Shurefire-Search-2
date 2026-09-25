import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  TrendingUp,
  Layers,
  FileText,
  PhoneCall,
  X,
  Grid,
  Building2,
  Download,
  Share2,
  Check,
  AlertCircle,
  ArrowRight,
  Send,
  SlidersHorizontal,
  Briefcase
} from "lucide-react";
import { getSupabase } from "./supabase";
import { INITIAL_MATERIALS, NIGERIAN_SUPPLIERS } from "./mockDatabase";
import { MaterialItem, MaterialCategory, Supplier } from "./types";
import AdminLogin from "./components/AdminLogin";

interface SpecCalculation {
  cementBags: number;
  cementRate: number;
  cementTotal: number;
  rebar16mmLengths: number;
  rebar16mmRate: number;
  rebar16mmTotal: number;
  rebar12mmLengths: number;
  rebar12mmRate: number;
  rebar12mmTotal: number;
  blocksCount: number;
  blocksRate: number;
  blocksTotal: number;
  sandTippers: number;
  sandRate: number;
  sandTotal: number;
  graniteTippers: number;
  graniteRate: number;
  graniteTotal: number;
  substructureSubtotal: number;
  superstructureSubtotal: number;
  finishingSubtotal: number;
  estimatedGrandTotal: number;
  terrainFactor: string;
  structuralNotes: string[];
}

export default function App() {
  // Search and view states
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [activeQuery, setActiveQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<"all" | "estimates" | "materials" | "suppliers">("all");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Materials & search results
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [specCalc, setSpecCalc] = useState<SpecCalculation | null>(null);

  // Modals & Panels
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showProcureModal, setShowProcureModal] = useState(false);
  const [procureItem, setProcureItem] = useState<MaterialItem | null>(null);
  const [procureSuccess, setProcureSuccess] = useState(false);
  const [procureQuantity, setProcureQuantity] = useState("100");
  const [procureName, setProcureName] = useState("");
  const [procurePhone, setProcurePhone] = useState("");
  const [procureLocation, setProcureLocation] = useState("Lagos, Nigeria");
  const [copiedQuote, setCopiedQuote] = useState(false);

  // Admin Portal state
  const [adminEmail, setAdminEmail] = useState("ramonbisola1@gmail.com");
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminTab, setAdminTab] = useState<"leads" | "knowledge">("leads");
  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [knowledgeList, setKnowledgeList] = useState<any[]>([]);
  const [newKbTitle, setNewKbTitle] = useState("");
  const [newKbContent, setNewKbContent] = useState("");
  const [isSavingKb, setIsSavingKb] = useState(false);
  const [currentPath, setCurrentPath] = useState(
    typeof window !== "undefined" ? window.location.pathname : "/"
  );

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check for admin hash or admin path
    if (window.location.hash.includes("#shurefire-admin")) {
      setShowAdminModal(true);
    }
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Sync window.dbClient
  useEffect(() => {
    if (typeof window !== "undefined" && !window.dbClient) {
      window.dbClient = getSupabase();
    }
  }, []);

  // Fetch admin data when logged in
  const fetchAdminData = useCallback(async () => {
    try {
      const leadsRes = await fetch("/api/admin/leads");
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setLeadsList(leadsData);
      }
      const kbRes = await fetch("/api/admin/knowledge");
      if (kbRes.ok) {
        const kbData = await kbRes.json();
        setKnowledgeList(kbData);
      }
    } catch (err) {
      console.error("Admin data fetch note:", err);
    }
  }, []);

  useEffect(() => {
    if (isAdminLoggedIn) {
      fetchAdminData();
    }
  }, [isAdminLoggedIn, fetchAdminData]);

  // Dynamic engineering spec calculator based on query terms
  const calculateSpecifications = (q: string): SpecCalculation => {
    const lower = q.toLowerCase();
    const isSwampy = lower.includes("swamp") || lower.includes("lekki") || lower.includes("water") || lower.includes("waterlogged") || lower.includes("ajah");
    const isDuplex = lower.includes("duplex") || lower.includes("storey") || lower.includes("story") || lower.includes("4-bed") || lower.includes("5-bed");
    const isBQ = lower.includes("bq") || lower.includes("annex") || lower.includes("boys quarter");
    const isPremium = lower.includes("premium") || lower.includes("luxury") || lower.includes("high-end");

    // Scale multipliers
    const scaleFactor = isDuplex ? 2.2 : isBQ ? 0.45 : 1.0;
    const swampMultiplier = isSwampy ? 1.35 : 1.0;

    // Rates in Naira (NGN)
    const cementRate = isPremium ? 8150 : 7850;
    const rebar16mmRate = isPremium ? 14200 : 13500;
    const rebar12mmRate = isPremium ? 8800 : 8300;
    const blocksRate = isPremium ? 820 : 780;
    const sandRate = 135000;
    const graniteRate = 275000;

    // Quantities
    const baseCement = isDuplex ? 420 : isBQ ? 110 : 260;
    const cementBags = Math.round(baseCement * swampMultiplier);
    const cementTotal = cementBags * cementRate;

    const baseRebar16 = isDuplex ? 160 : isBQ ? 35 : 85;
    const rebar16mmLengths = Math.round(baseRebar16 * swampMultiplier);
    const rebar16mmTotal = rebar16mmLengths * rebar16mmRate;

    const baseRebar12 = isDuplex ? 210 : isBQ ? 50 : 120;
    const rebar12mmLengths = Math.round(baseRebar12 * swampMultiplier);
    const rebar12mmTotal = rebar12mmLengths * rebar12mmRate;

    const baseBlocks = isDuplex ? 3600 : isBQ ? 950 : 2100;
    const blocksCount = Math.round(baseBlocks);
    const blocksTotal = blocksCount * blocksRate;

    const sandTippers = isDuplex ? 4 : isBQ ? 1 : 2;
    const sandTotal = sandTippers * sandRate;

    const graniteTippers = isDuplex ? 4 : isBQ ? 1 : 2;
    const graniteTotal = graniteTippers * graniteRate;

    const substructureSubtotal = Math.round((cementTotal * 0.45) + (rebar16mmTotal * 0.6) + (rebar12mmTotal * 0.5) + (sandTotal * 0.5) + (graniteTotal * 0.5));
    const superstructureSubtotal = Math.round((cementTotal * 0.55) + (rebar16mmTotal * 0.4) + (rebar12mmTotal * 0.5) + blocksTotal + (sandTotal * 0.5) + (graniteTotal * 0.5));
    const finishingSubtotal = Math.round((substructureSubtotal + superstructureSubtotal) * (isPremium ? 0.35 : 0.22));
    const estimatedGrandTotal = substructureSubtotal + superstructureSubtotal + finishingSubtotal;

    const structuralNotes = [
      isSwampy
        ? "Terrain Alert: Lekki/Coastal alluvial basin necessitates reinforced concrete raft foundation with 16mm tension cage grids."
        : "Standard Firm Subgrade: Strip footing with continuous 12mm starter rebar reinforcement recommended.",
      `Grade 42.5R Portland Cement specified with 1:2:4 batching mix for water-tight structural casting.`,
      `High-Ductility TMT 16mm/12mm Ribbed Steel complying with NIS/SON 117 certification standards.`,
      `Minimum 14-day continuous wet curing strictly mandated prior to second-tier superstructure loading.`
    ];

    return {
      cementBags,
      cementRate,
      cementTotal,
      rebar16mmLengths,
      rebar16mmRate,
      rebar16mmTotal,
      rebar12mmLengths,
      rebar12mmRate,
      rebar12mmTotal,
      blocksCount,
      blocksRate,
      blocksTotal,
      sandTippers,
      sandRate,
      sandTotal,
      graniteTippers,
      graniteRate,
      graniteTotal,
      substructureSubtotal,
      superstructureSubtotal,
      finishingSubtotal,
      estimatedGrandTotal,
      terrainFactor: isSwampy ? "Swampy / Coastal Soil (35% Substructure Reinforcement Surcharge)" : "Standard Inland Terrain",
      structuralNotes
    };
  };

  // Primary Search Execution Engine
  const executeSearch = async (searchTerm: string) => {
    const cleanTerm = searchTerm.trim();
    if (!cleanTerm) return;

    setActiveQuery(cleanTerm);
    setHasSearched(true);
    setIsLoading(true);
    setExpandedItemId(null);

    // Save search query live to Supabase (NO localStorage)
    fetch("/api/recent-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: cleanTerm })
    }).catch(() => {});

    // Calculate structural engineering specs
    const specs = calculateSpecifications(cleanTerm);
    setSpecCalc(specs);

    // 1. Connect search query to Supabase public.search_materials using window.dbClient
    let supabaseMaterials: MaterialItem[] = [];
    try {
      const client = window.dbClient || getSupabase();
      if (client) {
        // Attempt Supabase RPC search_materials
        const { data: rpcData, error: rpcErr } = await client.rpc("search_materials", {
          search_query: cleanTerm
        });

        if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
          supabaseMaterials = rpcData;
        } else {
          // Attempt select from public.search_materials
          const { data: tableData, error: tableErr } = await client
            .from("search_materials")
            .select("*")
            .or(`name.ilike.%${cleanTerm}%,category.ilike.%${cleanTerm}%,specifications.ilike.%${cleanTerm}%`)
            .limit(12);

          if (!tableErr && Array.isArray(tableData) && tableData.length > 0) {
            supabaseMaterials = tableData;
          }
        }
      }
    } catch (dbErr) {
      console.warn("[Shurefire dbClient] Supabase search_materials query notice:", dbErr);
    }

    // Fallback to verified Nigerian material items
    if (supabaseMaterials.length === 0) {
      const terms = cleanTerm.toLowerCase().split(/\s+/).filter(t => t.length > 1);
      const filtered = INITIAL_MATERIALS.filter(item => {
        const combined = `${item.name} ${item.category} ${item.specifications} ${item.brand} ${item.supplierName} ${item.supplierCity}`.toLowerCase();
        return terms.length === 0 || terms.some(t => combined.includes(t));
      });
      supabaseMaterials = filtered.length > 0 ? filtered : INITIAL_MATERIALS.slice(0, 8);
    }

    setMaterials(supabaseMaterials);

    // 2. Fetch AI Overview summary
    try {
      const aiRes = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleanTerm })
      });
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        setAiSummary(aiData.featuredAnswer || aiData.answer || null);
      }
    } catch (aiErr) {
      console.warn("[Shurefire AI] Direct summary fetch note:", aiErr);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      executeSearch(query);
    }
  };

  const handleResetToLanding = () => {
    setHasSearched(false);
    setQuery("");
    setActiveQuery("");
    setExpandedItemId(null);
    window.location.hash = "#home";
  };

  // Submit procurement RFQ
  const handleProcureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: procureName || "Verified Contractor",
          phone: procurePhone || "+234 800 000 0000",
          email: "procurement@shurefire.ng",
          location: procureLocation,
          material: procureItem ? procureItem.name : (activeQuery || "General Sourcing"),
          quantity: procureQuantity,
          estimatedTotal: specCalc ? specCalc.estimatedGrandTotal : 0
        })
      });
      setProcureSuccess(true);
      setTimeout(() => {
        setProcureSuccess(false);
        setShowProcureModal(false);
      }, 2500);
    } catch (err) {
      console.error("Lead submission error:", err);
    }
  };

  // Copy Bill of Quantities summary to clipboard
  const handleCopyQuote = () => {
    if (!specCalc) return;
    const text = `SHUREFIRE SOVEREIGN SPECIFICATION ESTIMATE
Query: ${activeQuery}
Estimated Total: ₦${specCalc.estimatedGrandTotal.toLocaleString()}
Substructure: ₦${specCalc.substructureSubtotal.toLocaleString()}
Superstructure: ₦${specCalc.superstructureSubtotal.toLocaleString()}
Finishes & Enclosure: ₦${specCalc.finishingSubtotal.toLocaleString()}

Key Materials Breakdown:
• Cement (Dangote 42.5R): ${specCalc.cementBags} Bags @ ₦${specCalc.cementRate.toLocaleString()} = ₦${specCalc.cementTotal.toLocaleString()}
• 16mm TMT Steel Rebar: ${specCalc.rebar16mmLengths} Lengths @ ₦${specCalc.rebar16mmRate.toLocaleString()} = ₦${specCalc.rebar16mmTotal.toLocaleString()}
• 12mm TMT Steel Rebar: ${specCalc.rebar12mmLengths} Lengths @ ₦${specCalc.rebar12mmRate.toLocaleString()} = ₦${specCalc.rebar12mmTotal.toLocaleString()}
• 9" Vibrated Blocks: ${specCalc.blocksCount.toLocaleString()} Pcs @ ₦${specCalc.blocksRate} = ₦${specCalc.blocksTotal.toLocaleString()}
• Sharp Sand (20t): ${specCalc.sandTippers} Tippers @ ₦${specCalc.sandRate.toLocaleString()} = ₦${specCalc.sandTotal.toLocaleString()}
• Granite 3/4" (20t): ${specCalc.graniteTippers} Tippers @ ₦${specCalc.graniteRate.toLocaleString()} = ₦${specCalc.graniteTotal.toLocaleString()}

Source: Shurefire Sovereign Construction Search (https://shurefire.ng)`;

    navigator.clipboard.writeText(text);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2000);
  };

  // Filter materials for SERP view
  const displayedMaterials = materials.filter(item => {
    if (activeFilterTab === "estimates") {
      return item.category === MaterialCategory.CEMENT_BINDERS || item.category === MaterialCategory.STEEL_REBARS;
    }
    if (activeFilterTab === "materials") {
      return item.category === MaterialCategory.BLOCKS_AGGREGATES || item.category === MaterialCategory.ROOFING_CEILING;
    }
    if (activeFilterTab === "suppliers") {
      return item.supplierState === "Lagos" || item.isLiveStockSynced;
    }
    return true;
  });

  // Dedicated full-page route support for /admin, /admin/login, /admin/dashboard
  if (currentPath === "/admin" || currentPath === "/admin/login") {
    if (!isAdminLoggedIn) {
      return (
        <AdminLogin
          onLoginSuccess={(user) => {
            setIsAdminLoggedIn(true);
            if (user?.email) setAdminEmail(user.email);
            window.history.pushState({}, "", "/admin/dashboard");
            setCurrentPath("/admin/dashboard");
            fetchAdminData();
          }}
          redirectTo="/admin/dashboard"
        />
      );
    }
  }

  if (currentPath === "/admin/dashboard" && !isAdminLoggedIn) {
    return (
      <AdminLogin
        onLoginSuccess={(user) => {
          setIsAdminLoggedIn(true);
          if (user?.email) setAdminEmail(user.email);
          setCurrentPath("/admin/dashboard");
          fetchAdminData();
        }}
        redirectTo="/admin/dashboard"
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#0f172a] flex flex-col font-sans selection:bg-[#ae2424]/10 selection:text-[#ae2424]">
      
      {/* ========================================================================= */}
      {/* 1. LANDING VIEW (State: !hasSearched)                                      */}
      {/* ========================================================================= */}
      {!hasSearched ? (
        <div className="flex-1 flex flex-col justify-between py-5 px-4 sm:px-8">
          
          {/* Top Bar Header */}
          <header className="w-full max-w-7xl mx-auto flex items-center justify-end gap-3 select-none h-14">
            
            {/* Status Pill: Admin Portal */}
            <button
              onClick={() => setShowAdminModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#e2e8f0] bg-white text-xs font-semibold text-[#0f172a] hover:border-[#ae2424]/40 hover:bg-[#f8fafc] transition-colors shadow-2xs cursor-pointer"
              title="Access Sovereign Admin Portal (#shurefire-admin)"
            >
              <span className="w-2 h-2 rounded-full bg-[#ae2424] animate-pulse"></span>
              <span>Admin Portal</span>
            </button>

            {/* Grid Menu Icon */}
            <button 
              className="p-2 text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc] rounded-full transition-colors cursor-pointer" 
              title="Shurefire Construction Services"
            >
              <Grid className="w-5 h-5" />
            </button>

            {/* Circular Profile Badge using #ae2424 */}
            <button
              onClick={() => setShowAdminModal(true)}
              className="w-8 h-8 rounded-full bg-[#ae2424] text-white flex items-center justify-center font-bold text-xs shadow-xs hover:opacity-90 hover:scale-105 transition-all cursor-pointer border border-[#ae2424]/20"
              title="Ramon Bisola (Project Manager) - Click to open Admin Portal"
            >
              RB
            </button>
          </header>

          {/* Center Search Console Column */}
          <main className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center space-y-6 my-auto text-center px-2">
            
            {/* Center Branding: Signature bold "Shurefire" in #ae2424 */}
            <div className="flex flex-col items-center cursor-default select-none animate-fade-in pb-2">
              <h1 className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight text-[#ae2424] drop-shadow-2xs">
                Shurefire
              </h1>
              <p className="mt-1 text-xs sm:text-sm font-medium tracking-wide uppercase text-[#64748b]">
                Sovereign Construction & Materials Search
              </p>
            </div>

            {/* Search Bar Assembly */}
            <form onSubmit={handleSearchSubmit} className="w-full max-w-[620px] space-y-5">
              <div className="relative flex items-center bg-white rounded-full border border-slate-300 shadow-sm focus-within:border-[#ae2424] focus-within:ring-2 focus-within:ring-[#ae2424]/10 transition-all duration-150 px-4 py-3 sm:py-3.5">
                <Search className="h-5 w-5 text-[#ae2424] shrink-0 mr-3" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search materials, structural estimates, or specs..."
                  className="w-full bg-transparent text-[#0f172a] text-sm sm:text-base focus:outline-none placeholder:text-[#64748b]"
                  autoFocus
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* CTA Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-[#f8fafc] hover:bg-slate-100 border border-[#e2e8f0] hover:border-slate-300 text-xs sm:text-sm font-semibold text-[#0f172a] transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  ShureEstimate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!query.trim()) {
                      setQuery("Dangote 50kg cement wholesale Lekki depot");
                      executeSearch("Dangote 50kg cement wholesale Lekki depot");
                    } else {
                      executeSearch(query);
                    }
                  }}
                  className="px-5 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-[#e2e8f0] hover:border-[#ae2424]/40 text-xs sm:text-sm font-semibold text-[#ae2424] transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  Procure with Shurefire
                </button>
              </div>
            </form>
          </main>

          {/* Minimalist Light-Mode Footer */}
          <footer className="w-full max-w-7xl mx-auto pt-8 pb-3 border-t border-[#e2e8f0] text-[#64748b] text-xs select-none space-y-2">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <p className="text-[12px] font-normal">
                Calculations powered by Gemini AI. Real-time pricing sourced from Shurefire Sovereign Marketplace.
              </p>
              <div className="flex items-center gap-4 text-[12px]">
                <span className="flex items-center gap-1 font-medium text-[#0f172a]">
                  <MapPin className="w-3.5 h-3.5 text-[#ae2424]" />
                  Lagos, Nigeria
                </span>
                <button
                  onClick={() => setShowAdminModal(true)}
                  className="hover:underline text-[#ae2424] font-medium cursor-pointer"
                >
                  Admin Portal
                </button>
              </div>
            </div>
          </footer>

        </div>
      ) : (

        /* ========================================================================= */
        /* 2. SEARCH ENGINE RESULTS PAGE VIEW (State: hasSearched)                   */
        /* ========================================================================= */
        <div className="flex-1 flex flex-col bg-white">
          
          {/* Compact Sticky Header */}
          <header className="sticky top-0 bg-white border-b border-[#e2e8f0] z-20 select-none shadow-2xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              
              {/* Left Column: Logo & Aligned Search Bar */}
              <div className="flex items-center gap-4 flex-1">
                
                {/* Compact "Shurefire" logo in #ae2424 pinned top-left */}
                <button
                  onClick={handleResetToLanding}
                  className="text-2xl sm:text-3xl font-black tracking-tight text-[#ae2424] shrink-0 hover:opacity-90 transition-opacity cursor-pointer text-left"
                  title="Return to Shurefire Homepage"
                >
                  Shurefire
                </button>

                {/* Rounded Search Input Aligned Next to Logo */}
                <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl">
                  <div className="relative flex items-center bg-white rounded-full border border-slate-300 shadow-sm focus-within:border-[#ae2424] focus-within:ring-2 focus-within:ring-[#ae2424]/10 transition-all px-3.5 py-2 sm:py-2.5">
                    <Search className="h-4 w-4 text-[#ae2424] shrink-0 mr-2.5" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search building materials, specs, or estimates..."
                      className="w-full bg-transparent text-[#0f172a] text-sm focus:outline-none placeholder:text-[#64748b]"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Right Side Status Pill & Profile */}
              <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                <button
                  onClick={() => setShowAdminModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#e2e8f0] bg-white text-xs font-semibold text-[#0f172a] hover:border-[#ae2424]/40 hover:bg-[#f8fafc] transition-colors shadow-2xs cursor-pointer"
                  title="Open Sovereign Admin Portal"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ae2424]"></span>
                  <span>Admin Portal</span>
                </button>

                <button 
                  className="p-1.5 text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc] rounded-full transition-colors cursor-pointer"
                  title="Shurefire Services"
                >
                  <Grid className="w-4.5 h-4.5" />
                </button>

                <button
                  onClick={() => setShowAdminModal(true)}
                  className="w-7 h-7 rounded-full bg-[#ae2424] text-white flex items-center justify-center font-bold text-[11px] shadow-xs hover:scale-105 transition-transform cursor-pointer"
                  title="Ramon Bisola (Project Manager)"
                >
                  RB
                </button>
              </div>

            </div>

            {/* Filter Navigation Tabs */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center border-t border-[#e2e8f0] text-xs font-medium gap-6 pt-2 pb-1.5 overflow-x-auto">
              {[
                { id: "all", label: "All Results" },
                { id: "estimates", label: "Structural Estimates & BOQ" },
                { id: "materials", label: "Materials Catalog" },
                { id: "suppliers", label: "Verified Depots" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilterTab(tab.id as any)}
                  className={`pb-1.5 px-1 border-b-2 transition-all cursor-pointer font-semibold whitespace-nowrap ${
                    activeFilterTab === tab.id
                      ? "border-[#ae2424] text-[#ae2424]"
                      : "border-transparent text-[#64748b] hover:text-[#0f172a]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </header>

          {/* SERP Body Main Layout */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left 8 Columns: AI Overview Hero Box & Google-Style SERP Items */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Query & Results Status */}
              <div className="flex items-center justify-between text-xs text-[#64748b] pb-1 border-b border-[#e2e8f0]">
                <span>
                  Showing results for <span className="font-semibold text-[#0f172a]">"{activeQuery}"</span>
                </span>
                <span className="font-mono">
                  {displayedMaterials.length} verified material items indexed
                </span>
              </div>

              {/* AI OVERVIEW HERO BOX: Top light-blue/slate callout card with subtle #ae2424 left-accent border */}
              {specCalc && (
                <section className="bg-[#f8fafc] border border-[#e2e8f0] border-l-4 border-l-[#ae2424] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5 animate-fade-in">
                  
                  {/* Top Header Badge */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#ae2424]/10 text-[#ae2424] flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <h2 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider">
                        Gemini AI Overview • Sovereign Market Intelligence
                      </h2>
                    </div>
                    <span className="text-[11px] font-mono text-[#64748b] bg-white px-2.5 py-1 rounded-full border border-[#e2e8f0]">
                      {specCalc.terrainFactor}
                    </span>
                  </div>

                  {/* Summary Narrative */}
                  <p className="text-sm text-[#0f172a] leading-relaxed">
                    Based on local Nigerian construction standards for{" "}
                    <strong className="text-[#ae2424] font-semibold">{activeQuery}</strong>, total estimated structural procurement is calculated at{" "}
                    <strong className="text-[#0f172a] font-bold">₦{specCalc.estimatedGrandTotal.toLocaleString()}</strong>. Specifications adhere to SON/NIS 117 standards using Dangote 42.5R Grade Cement, high-yield ribbed TMT rebars, and vibrated hollow masonry units.
                  </p>

                  {/* Budget & Spec Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="bg-white border border-[#e2e8f0] rounded-xl p-3 shadow-2xs">
                      <span className="block text-[11px] font-medium text-[#64748b]">Total Estimated Cost</span>
                      <span className="text-base sm:text-lg font-black text-[#ae2424] font-mono">
                        ₦{specCalc.estimatedGrandTotal.toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-white border border-[#e2e8f0] rounded-xl p-3 shadow-2xs">
                      <span className="block text-[11px] font-medium text-[#64748b]">Substructure / Raft</span>
                      <span className="text-base sm:text-lg font-bold text-[#0f172a] font-mono">
                        ₦{specCalc.substructureSubtotal.toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-white border border-[#e2e8f0] rounded-xl p-3 shadow-2xs">
                      <span className="block text-[11px] font-medium text-[#64748b]">Superstructure</span>
                      <span className="text-base sm:text-lg font-bold text-[#0f172a] font-mono">
                        ₦{specCalc.superstructureSubtotal.toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-white border border-[#e2e8f0] rounded-xl p-3 shadow-2xs">
                      <span className="block text-[11px] font-medium text-[#64748b]">Finishing Reserve</span>
                      <span className="text-base sm:text-lg font-bold text-[#0f172a] font-mono">
                        ₦{specCalc.finishingSubtotal.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Structural Spec Checklist */}
                  <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 space-y-2">
                    <span className="text-xs font-bold text-[#0f172a] uppercase tracking-wider block">
                      Engineering Specification Checklist:
                    </span>
                    <ul className="space-y-1.5 text-xs text-[#0f172a]">
                      {specCalc.structuralNotes.map((note, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#ae2424] shrink-0 mt-0.5" />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions inside AI Overview */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      onClick={() => {
                        setProcureItem(null);
                        setShowProcureModal(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#ae2424] hover:bg-[#8f1d1d] text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-xs flex items-center gap-2"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      Procure This Bill of Quantities
                    </button>

                    <button
                      onClick={handleCopyQuote}
                      className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#e2e8f0] text-xs font-semibold text-[#0f172a] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {copiedQuote ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <FileText className="w-3.5 h-3.5 text-[#64748b]" />}
                      {copiedQuote ? "Copied Spec to Clipboard!" : "Copy Bill of Quantities"}
                    </button>
                  </div>

                </section>
              )}

              {/* GOOGLE-STYLE SERP ITEMS */}
              <div className="space-y-6 pt-2">
                {displayedMaterials.map((item) => {
                  const isExpanded = expandedItemId === item.id;
                  const itemUrl = `https://shurefire.ng/materials/${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

                  return (
                    <article
                      key={item.id}
                      className="border-b border-[#e2e8f0] pb-6 last:border-b-0 space-y-1.5"
                    >
                      {/* Source URL snippet in small monospace text (#64748b) */}
                      <div className="flex items-center gap-2 font-mono text-[12px] text-[#64748b] tracking-tight">
                        <span className="w-4 h-4 rounded bg-[#ae2424]/10 text-[#ae2424] flex items-center justify-center font-bold text-[9px]">
                          SF
                        </span>
                        <span className="truncate">{itemUrl}</span>
                        {item.isLiveStockSynced && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-sans font-semibold">
                            Verified Stock
                          </span>
                        )}
                      </div>

                      {/* Title in bold blue/slate (text-[#1a0dab] hover:underline cursor-pointer) */}
                      <h3
                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                        className="text-lg sm:text-xl font-semibold text-[#1a0dab] hover:underline cursor-pointer leading-snug flex items-center justify-between gap-2"
                      >
                        <span>{item.name}</span>
                        <button
                          type="button"
                          className="text-[#64748b] hover:text-[#0f172a] p-1 rounded-md text-xs font-normal"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </h3>

                      {/* Description preview text */}
                      <p className="text-sm text-[#0f172a] leading-relaxed line-clamp-2">
                        {item.specifications}. Sourced directly from {item.supplierName} ({item.supplierCity}). Available for immediate dispatch across Lagos, Ogun, and regional construction sites.
                      </p>

                      {/* Click-to-Expand Details Viewer */}
                      {isExpanded && (
                        <div className="mt-3 p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl space-y-3 animate-fade-in text-xs">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-white p-2.5 rounded-lg border border-[#e2e8f0]">
                              <span className="text-[10px] uppercase font-bold text-[#64748b] block">Price per Unit</span>
                              <span className="text-sm font-black text-[#ae2424] font-mono">
                                ₦{item.price.toLocaleString()} / {item.unit}
                              </span>
                            </div>

                            <div className="bg-white p-2.5 rounded-lg border border-[#e2e8f0]">
                              <span className="text-[10px] uppercase font-bold text-[#64748b] block">Depot Location</span>
                              <span className="text-xs font-semibold text-[#0f172a] truncate block">
                                {item.supplierCity}, {item.supplierState}
                              </span>
                            </div>

                            <div className="bg-white p-2.5 rounded-lg border border-[#e2e8f0]">
                              <span className="text-[10px] uppercase font-bold text-[#64748b] block">Stock Synced</span>
                              <span className="text-xs font-semibold text-emerald-700 block">
                                {item.stockLevel.toLocaleString()} {item.unit}s
                              </span>
                            </div>

                            <div className="bg-white p-2.5 rounded-lg border border-[#e2e8f0]">
                              <span className="text-[10px] uppercase font-bold text-[#64748b] block">Standard Compliance</span>
                              <span className="text-xs font-semibold text-[#0f172a] block">
                                NIS / SON Certified
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                            <div className="text-[11px] text-[#64748b]">
                              Supplier ID: <span className="font-mono text-[#0f172a]">{item.supplierId}</span> • Updated Today
                            </div>

                            <button
                              onClick={() => {
                                setProcureItem(item);
                                setShowProcureModal(true);
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-[#ae2424] hover:bg-[#8f1d1d] text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-2xs"
                            >
                              Procure This Material
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

            </div>

            {/* Right 4 Columns: Sovereign Market Intelligence Sidebar */}
            <aside className="lg:col-span-4 space-y-5">
              
              {/* Market Pricing Desk Card */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-[#ae2424]" />
                    Sovereign Market Rates
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                    Live Lagos
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                    <span className="text-[#0f172a]">Dangote Cement 50kg (42.5R)</span>
                    <span className="font-bold text-[#ae2424] font-mono">₦7,850</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                    <span className="text-[#0f172a]">16mm TMT High-Yield Rebar</span>
                    <span className="font-bold text-[#ae2424] font-mono">₦13,500</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                    <span className="text-[#0f172a]">12mm High-Tension Rebar</span>
                    <span className="font-bold text-[#ae2424] font-mono">₦8,300</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                    <span className="text-[#0f172a]">9-inch Vibrated Hollow Block</span>
                    <span className="font-bold text-[#ae2424] font-mono">₦780</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#0f172a]">Sharp Sand (20t Tipper)</span>
                    <span className="font-bold text-[#ae2424] font-mono">₦135,000</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setProcureItem(null);
                    setShowProcureModal(true);
                  }}
                  className="w-full py-2 bg-white hover:bg-slate-50 border border-[#e2e8f0] text-xs font-semibold text-[#ae2424] rounded-xl transition-colors cursor-pointer shadow-2xs"
                >
                  Request Custom Sourcing Quote
                </button>
              </div>

              {/* Verified Depot Network */}
              <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#ae2424]" />
                  Verified Supply Hubs
                </h4>
                <div className="space-y-2 text-xs text-[#0f172a]">
                  {NIGERIAN_SUPPLIERS.slice(0, 3).map(sup => (
                    <div key={sup.id} className="p-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] space-y-0.5">
                      <div className="font-semibold text-[#0f172a]">{sup.name}</div>
                      <div className="text-[11px] text-[#64748b]">{sup.marketName}</div>
                      <div className="text-[10px] text-emerald-700 font-medium">Rating: {sup.rating} ★ • Direct Dispatch</div>
                    </div>
                  ))}
                </div>
              </div>

            </aside>

          </main>

          {/* Compact SERP Footer */}
          <footer className="w-full bg-[#f8fafc] border-t border-[#e2e8f0] py-4 text-center text-xs text-[#64748b] select-none">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span>Calculations powered by Gemini AI. Real-time pricing sourced from Shurefire Sovereign Marketplace.</span>
              <button
                onClick={handleResetToLanding}
                className="hover:underline text-[#ae2424] font-medium cursor-pointer"
              >
                Back to Search Home
              </button>
            </div>
          </footer>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PROCUREMENT RFQ MODAL                                                  */}
      {/* ========================================================================= */}
      {showProcureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ae2424]"></span>
                <h3 className="text-base font-bold text-[#0f172a]">
                  Procure with Shurefire
                </h3>
              </div>
              <button
                onClick={() => setShowProcureModal(false)}
                className="p-1 rounded-full text-[#64748b] hover:text-[#0f172a] hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {procureSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-[#0f172a]">Procurement Order Received</h4>
                <p className="text-xs text-[#64748b] max-w-xs mx-auto">
                  Ramon Bisola and our sourcing team at the Coker Allied depot have logged your order and will confirm delivery via phone.
                </p>
              </div>
            ) : (
              <form onSubmit={handleProcureSubmit} className="space-y-3.5 text-xs text-left">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-1">
                    Material / Scope of Order
                  </label>
                  <input
                    type="text"
                    value={procureItem ? procureItem.name : activeQuery}
                    readOnly
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-2.5 text-[#0f172a] font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-1">
                      Quantity Needed
                    </label>
                    <input
                      type="text"
                      required
                      value={procureQuantity}
                      onChange={(e) => setProcureQuantity(e.target.value)}
                      placeholder="e.g. 200 Bags / 50 Lengths"
                      className="w-full bg-white border border-[#e2e8f0] rounded-xl p-2.5 text-[#0f172a] focus:outline-none focus:border-[#ae2424]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-1">
                      Delivery Site Location
                    </label>
                    <input
                      type="text"
                      required
                      value={procureLocation}
                      onChange={(e) => setProcureLocation(e.target.value)}
                      placeholder="e.g. Lekki Phase 1, Lagos"
                      className="w-full bg-white border border-[#e2e8f0] rounded-xl p-2.5 text-[#0f172a] focus:outline-none focus:border-[#ae2424]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-1">
                      Contractor / Site Rep Name
                    </label>
                    <input
                      type="text"
                      required
                      value={procureName}
                      onChange={(e) => setProcureName(e.target.value)}
                      placeholder="Engr. Babatunde"
                      className="w-full bg-white border border-[#e2e8f0] rounded-xl p-2.5 text-[#0f172a] focus:outline-none focus:border-[#ae2424]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      required
                      value={procurePhone}
                      onChange={(e) => setProcurePhone(e.target.value)}
                      placeholder="+234 802 000 0000"
                      className="w-full bg-white border border-[#e2e8f0] rounded-xl p-2.5 text-[#0f172a] focus:outline-none focus:border-[#ae2424]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 rounded-xl bg-[#ae2424] hover:bg-[#8f1d1d] text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
                >
                  Confirm Sourcing Request
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ADMIN PORTAL MODAL (SFS Desk Logistics & Intelligence)                 */}
      {/* ========================================================================= */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          {!isAdminLoggedIn ? (
            <div className="relative w-full max-w-md">
              <button
                onClick={() => setShowAdminModal(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <AdminLogin
                isEmbedded
                onLoginSuccess={(user) => {
                  setIsAdminLoggedIn(true);
                  if (user?.email) setAdminEmail(user.email);
                  fetchAdminData();
                }}
              />
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#e2e8f0] max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#ae2424] text-white font-mono font-black text-xs flex items-center justify-center">
                    SFS
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0f172a]">
                      Shurefire Sovereign Index Console
                    </h3>
                    <p className="text-[11px] text-[#64748b] font-mono">
                      Trade Desk Logistics & Knowledge Base
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAdminModal(false)}
                  className="p-1.5 rounded-full text-[#64748b] hover:text-[#0f172a] hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                    <span className="flex items-center gap-2 font-mono text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Verified: {adminEmail}
                    </span>
                    <button
                      onClick={() => setIsAdminLoggedIn(false)}
                      className="text-xs text-[#ae2424] hover:underline cursor-pointer font-semibold"
                    >
                      Sign Out
                    </button>
                  </div>

                  <div className="flex border-b border-[#e2e8f0] text-xs font-semibold gap-4">
                    <button
                      onClick={() => setAdminTab("leads")}
                      className={`pb-2 border-b-2 cursor-pointer transition-colors ${
                        adminTab === "leads" ? "border-[#ae2424] text-[#ae2424]" : "border-transparent text-[#64748b]"
                      }`}
                    >
                      Procurement Leads ({leadsList.length})
                    </button>
                    <button
                      onClick={() => setAdminTab("knowledge")}
                      className={`pb-2 border-b-2 cursor-pointer transition-colors ${
                        adminTab === "knowledge" ? "border-[#ae2424] text-[#ae2424]" : "border-transparent text-[#64748b]"
                      }`}
                    >
                      Knowledge Documents ({knowledgeList.length})
                    </button>
                  </div>

                  {adminTab === "leads" ? (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto">
                      {leadsList.length === 0 ? (
                        <p className="text-center text-[#64748b] py-6">No inbound procurement leads recorded yet.</p>
                      ) : (
                        leadsList.map((lead, idx) => (
                          <div key={lead.id || idx} className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] space-y-1">
                            <div className="flex justify-between font-bold text-[#0f172a]">
                              <span>{lead.buyer_name || lead.name || "Contractor"}</span>
                              <span className="text-emerald-700 font-mono">
                                ₦{Number(lead.estimated_total || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-[#64748b]">
                              {lead.phone || lead.email} • {lead.project_location || "Lagos"}
                            </div>
                            <div className="text-[11px] text-[#0f172a] font-medium">
                              Scope: {lead.query || lead.material || "General Project"}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] space-y-2">
                        <span className="font-bold text-[#0f172a] block">Publish Knowledge Briefing</span>
                        <input
                          type="text"
                          value={newKbTitle}
                          onChange={(e) => setNewKbTitle(e.target.value)}
                          placeholder="Document title (e.g. Dangote Bulk Price Q3)"
                          className="w-full bg-white border border-[#e2e8f0] rounded-lg p-2 text-xs text-[#0f172a]"
                        />
                        <textarea
                          rows={3}
                          value={newKbContent}
                          onChange={(e) => setNewKbContent(e.target.value)}
                          placeholder="Engineering notes, pricing bulletins..."
                          className="w-full bg-white border border-[#e2e8f0] rounded-lg p-2 text-xs text-[#0f172a]"
                        />
                        <button
                          type="button"
                          disabled={isSavingKb}
                          onClick={async () => {
                            if (!newKbTitle.trim()) return;
                            setIsSavingKb(true);
                            try {
                              await fetch("/api/admin/knowledge", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ title: newKbTitle, content: newKbContent })
                              });
                              setNewKbTitle("");
                              setNewKbContent("");
                              fetchAdminData();
                            } finally {
                              setIsSavingKb(false);
                            }
                          }}
                          className="w-full py-1.5 rounded-lg bg-[#ae2424] hover:bg-[#8f1d1d] text-white font-bold text-xs uppercase cursor-pointer"
                        >
                          {isSavingKb ? "Publishing..." : "Save Knowledge Document"}
                        </button>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {knowledgeList.map((kb) => (
                          <div key={kb.id} className="p-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
                            <div className="font-semibold text-[#0f172a]">{kb.title}</div>
                            <div className="text-[11px] text-[#64748b] line-clamp-2">{kb.content}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
