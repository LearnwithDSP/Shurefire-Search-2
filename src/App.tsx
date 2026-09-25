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
import AdminDashboard from "./components/AdminDashboard";
import SearchResultsPage from "./components/SearchResultsPage";

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

  if (currentPath === "/admin/dashboard" || ((currentPath === "/admin" || currentPath === "/admin/login") && isAdminLoggedIn)) {
    if (!isAdminLoggedIn) {
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
      <AdminDashboard
        userEmail={adminEmail}
        onSignOut={() => {
          setIsAdminLoggedIn(false);
          const client = (typeof window !== "undefined" && window.dbClient) || getSupabase();
          client?.auth?.signOut?.();
          window.history.pushState({}, "", "/");
          setCurrentPath("/");
        }}
        onNavigateHome={() => {
          window.history.pushState({}, "", "/");
          setCurrentPath("/");
        }}
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
            
            {/* Center Branding: Big, Bold, Neat SaaS-like Hero Header */}
            <div className="flex flex-col items-center cursor-default select-none animate-fade-in pb-3">
              <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-[-0.03em] text-[#ae2424] leading-tight select-none">
                Shurefire
              </h1>
              <p className="mt-2.5 sm:mt-3.5 text-sm sm:text-base md:text-lg font-medium text-slate-600 tracking-tight text-center max-w-2xl px-4">
                <span className="font-bold text-slate-900">#1 Construction Search Engine In Africa</span>
                <span className="text-slate-400 mx-2 font-normal hidden sm:inline">-</span>
                <span className="block sm:inline text-slate-600 font-medium">Developed for building Enthusiats</span>
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
        <SearchResultsPage
          initialQuery={activeQuery || query}
          onQueryChange={(newQ) => {
            setQuery(newQ);
            setActiveQuery(newQ);
          }}
          onNavigateHome={handleResetToLanding}
          onOpenAdmin={() => setShowAdminModal(true)}
          onProcureMaterial={(mat) => {
            setProcureItem(mat);
            setShowProcureModal(true);
          }}
        />
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
            <div className="bg-white rounded-3xl border border-[#e2e8f0] max-w-6xl w-full h-[90vh] shadow-2xl flex flex-col overflow-hidden relative">
              <div className="absolute top-3.5 right-4 z-40 flex items-center gap-2">
                <button
                  onClick={() => {
                    window.history.pushState({}, "", "/admin/dashboard");
                    setCurrentPath("/admin/dashboard");
                    setShowAdminModal(false);
                  }}
                  className="text-xs font-semibold text-slate-600 hover:text-[#ae2424] px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1 bg-white/90 border border-slate-200"
                >
                  <span>Full Screen</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowAdminModal(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer bg-white/90 border border-slate-200"
                  title="Close"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                <AdminDashboard
                  userEmail={adminEmail}
                  onSignOut={() => {
                    setIsAdminLoggedIn(false);
                    const client = (typeof window !== "undefined" && window.dbClient) || getSupabase();
                    client?.auth?.signOut?.();
                    setShowAdminModal(false);
                  }}
                  onNavigateHome={() => setShowAdminModal(false)}
                />
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
