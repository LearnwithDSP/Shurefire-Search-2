import React, { useState } from "react";
import {
  Truck,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  TrendingUp,
  Layers,
  FileText,
  PhoneCall,
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  ExternalLink,
  Hammer,
  Clock,
  Sparkles,
  Search,
  Package,
  BadgeCheck,
  Zap,
  Filter,
  DollarSign,
  AlertCircle,
  Home,
  RefreshCw
} from "lucide-react";
import { getSupabase } from "../supabase";

interface ProcureWithShurefirePageProps {
  onNavigateHome: () => void;
  onNavigateEstimate: () => void;
  onOpenAdmin?: () => void;
}

interface CatalogItem {
  id: string;
  name: string;
  category: "core" | "electrical_plumbing" | "finishing";
  categoryLabel: string;
  spec: string;
  priceRange: string;
  unit: string;
  moq: string;
  supplierBadge: string;
  depotLocation: string;
  status: "In Stock - Lagos Depot" | "Next-Day Dispatch" | "Factory Direct";
  statusColor: string;
  badgeType: "depot" | "factory" | "quarry";
}

const CATALOG_ITEMS: CatalogItem[] = [
  // Core Structural
  {
    id: "dangote-cement",
    name: "Dangote 3X Portland Cement",
    category: "core",
    categoryLabel: "Core Structural",
    spec: "Grade 42.5R Rapid Hardening (50kg Bag, NIS 444 Compliant)",
    priceRange: "₦7,850 – ₦8,050",
    unit: "50kg Bag",
    moq: "100 Bags (or 600-Bag Trailer)",
    supplierBadge: "Dangote Direct Dispatch - Ibese Depot",
    depotLocation: "Coker Allied / Ibese Terminal",
    status: "In Stock - Lagos Depot",
    statusColor: "emerald",
    badgeType: "factory"
  },
  {
    id: "rebar-16mm",
    name: "16mm High-Yield TMT Steel Rebar",
    category: "core",
    categoryLabel: "Core Structural",
    spec: "Thermo-Mechanically Treated, NIS/SON 117 Certified (12m Length)",
    priceRange: "₦13,500 – ₦13,950",
    unit: "Length (12m)",
    moq: "50 Lengths (~0.95 Ton)",
    supplierBadge: "Coker Allied Steel Depot",
    depotLocation: "Coker Express Depot, Orile-Iganmu",
    status: "In Stock - Lagos Depot",
    statusColor: "emerald",
    badgeType: "depot"
  },
  {
    id: "rebar-12mm",
    name: "12mm High-Tension Ribbed Rebar",
    category: "core",
    categoryLabel: "Core Structural",
    spec: "Ribbed Core Decking Mesh Steel (12m Length, 500 N/mm² Yield)",
    priceRange: "₦8,200 – ₦8,500",
    unit: "Length (12m)",
    moq: "50 Lengths (~0.53 Ton)",
    supplierBadge: "Coker Allied Steel Depot",
    depotLocation: "Coker Express Depot, Orile-Iganmu",
    status: "In Stock - Lagos Depot",
    statusColor: "emerald",
    badgeType: "depot"
  },
  {
    id: "vibrated-blocks-9",
    name: "9-Inch Vibrated Hollow Blocks",
    category: "core",
    categoryLabel: "Core Structural",
    spec: "Machine Vibrated 9\"x9\"x18\", 3.5 N/mm² Load-Bearing Density",
    priceRange: "₦760 – ₦800",
    unit: "Piece",
    moq: "500 Pieces",
    supplierBadge: "Lekki Precast Industrial Yard",
    depotLocation: "Sangotedo / Ajah Yard",
    status: "Next-Day Dispatch",
    statusColor: "blue",
    badgeType: "factory"
  },
  {
    id: "sharp-sand-20t",
    name: "Washed Clean Sharp River Sand",
    category: "core",
    categoryLabel: "Core Structural",
    spec: "Coarse Washed Aggregates Free from Marine Clay/Silt (20-Ton Load)",
    priceRange: "₦130,000 – ₦140,000",
    unit: "20-Ton Tipper Load",
    moq: "1 Tipper (20t)",
    supplierBadge: "Epe Dredging Terminal",
    depotLocation: "Epe Lagoon Corridor",
    status: "In Stock - Lagos Depot",
    statusColor: "emerald",
    badgeType: "quarry"
  },
  {
    id: "granite-3-4-20t",
    name: "3/4-Inch Crushed Quarry Granite",
    category: "core",
    categoryLabel: "Core Structural",
    spec: "Clean Hard Black Aggregate (19mm) for High-Strength Casting",
    priceRange: "₦270,000 – ₦285,000",
    unit: "20-Ton Tipper Load",
    moq: "1 Tipper (20t)",
    supplierBadge: "Julius Berger Quarry Logistics",
    depotLocation: "Abeokuta / Sagamu Axis",
    status: "Next-Day Dispatch",
    statusColor: "blue",
    badgeType: "quarry"
  },

  // Electrical & Plumbing
  {
    id: "coleman-cable-2-5",
    name: "Coleman Pure Copper Cable 2.5mm²",
    category: "electrical_plumbing",
    categoryLabel: "Electrical & Plumbing",
    spec: "100% Oxygen-Free Pure Copper Single Core Conduit Wire (100m Coil)",
    priceRange: "₦42,000 – ₦45,500",
    unit: "100m Coil",
    moq: "5 Coils",
    supplierBadge: "Coleman Technical Industries Depot",
    depotLocation: "Alaba / Sagamu Direct",
    status: "In Stock - Lagos Depot",
    statusColor: "emerald",
    badgeType: "factory"
  },
  {
    id: "coleman-cable-4",
    name: "Coleman Pure Copper Cable 4.0mm²",
    category: "electrical_plumbing",
    categoryLabel: "Electrical & Plumbing",
    spec: "Heavy Air Conditioner & Water Heater Dedicated Circuit (100m Coil)",
    priceRange: "₦68,000 – ₦72,000",
    unit: "100m Coil",
    moq: "4 Coils",
    supplierBadge: "Coleman Technical Industries Depot",
    depotLocation: "Alaba / Ikeja Central",
    status: "In Stock - Lagos Depot",
    statusColor: "emerald",
    badgeType: "factory"
  },
  {
    id: "pvc-conduit-pipes",
    name: "20mm Heavy Gauge PVC Conduit Pipes",
    category: "electrical_plumbing",
    categoryLabel: "Electrical & Plumbing",
    spec: "Flame-Retardant High-Impact Electrical Conduits (4m Length)",
    priceRange: "₦1,850 – ₦2,100",
    unit: "Length (4m)",
    moq: "50 Lengths",
    supplierBadge: "Coker Allied Plastics Annex",
    depotLocation: "Orile-Iganmu, Lagos",
    status: "In Stock - Lagos Depot",
    statusColor: "emerald",
    badgeType: "depot"
  },
  {
    id: "pressure-pvc-pipe-4inch",
    name: "4-Inch Soil & Drainage PVC Pipes",
    category: "electrical_plumbing",
    categoryLabel: "Electrical & Plumbing",
    spec: "Class D Heavy-Duty Underground Wastewater Drainage Pipe (5.8m)",
    priceRange: "₦11,500 – ₦13,000",
    unit: "Length (5.8m)",
    moq: "10 Lengths",
    supplierBadge: "Nigerite / Wavin Plumbing Depot",
    depotLocation: "Ikeja Industrial Estate",
    status: "In Stock - Lagos Depot",
    statusColor: "emerald",
    badgeType: "factory"
  },

  // Finishing & Roofing
  {
    id: "aluminum-longspan",
    name: "0.55mm Step-Tile Aluminum Roofing Sheets",
    category: "finishing",
    categoryLabel: "Finishing & Roofing",
    spec: "Gauge 0.55mm Pure Coil Aluminum with Anti-Fade Polyurethane Finish",
    priceRange: "₦4,800 – ₦5,300",
    unit: "Square Metre (m²)",
    moq: "120 m²",
    supplierBadge: "Tower Aluminum Authorized Depot",
    depotLocation: "Ikeja / Oshodi",
    status: "Factory Direct",
    statusColor: "amber",
    badgeType: "factory"
  },
  {
    id: "porcelain-floor-tiles",
    name: "60x60cm Glazed Vitrified Porcelain Tiles",
    category: "finishing",
    categoryLabel: "Finishing & Roofing",
    spec: "High-Traffic Non-Porous Vitrified Floor Tiles (4 Pcs = 1.44 m² per Box)",
    priceRange: "₦8,200 – ₦9,500",
    unit: "Box (1.44 m²)",
    moq: "30 Boxes",
    supplierBadge: "Royal Ceramics Direct Depot",
    depotLocation: "Amuwo-Odofin Tile Center",
    status: "In Stock - Lagos Depot",
    statusColor: "emerald",
    badgeType: "depot"
  },
  {
    id: "pop-cement-bag",
    name: "Super-White Plaster of Paris (POP) Cement",
    category: "finishing",
    categoryLabel: "Finishing & Roofing",
    spec: "Ultra-Fine Quick-Setting Casting Gypsum for Suspended Ceilings (40kg)",
    priceRange: "₦7,400 – ₦7,900",
    unit: "40kg Bag",
    moq: "25 Bags",
    supplierBadge: "Coker Allied Drywall Depot",
    depotLocation: "Coker Market, Lagos",
    status: "In Stock - Lagos Depot",
    statusColor: "emerald",
    badgeType: "depot"
  }
];

export const ProcureWithShurefirePage: React.FC<ProcureWithShurefirePageProps> = ({
  onNavigateHome,
  onNavigateEstimate,
  onOpenAdmin
}) => {
  // Category tab state
  const [activeCategory, setActiveCategory] = useState<"all" | "core" | "electrical_plumbing" | "finishing">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // 3-Step RFQ State
  const [rfqStep, setRfqStep] = useState<number>(1);
  const [selectedMaterialName, setSelectedMaterialName] = useState<string>("Dangote 3X Portland Cement");
  const [rfqQuantity, setRfqQuantity] = useState<string>("200 Bags");
  const [rfqGrade, setRfqGrade] = useState<string>("Grade 42.5R High-Strength");

  // Step 2: Logistics
  const [rfqLocation, setRfqLocation] = useState<string>("Lekki Phase 1, Lagos");
  const [rfqAccessCondition, setRfqAccessCondition] = useState<string>("Standard Paved Road (Full Trailer / 20t Tipper Access)");
  const [rfqOffloadReq, setRfqOffloadReq] = useState<boolean>(true);

  // Step 3: Contact & Lead
  const [contractorName, setContractorName] = useState<string>("");
  const [contractorPhone, setContractorPhone] = useState<string>("");
  const [contractorWhatsApp, setContractorWhatsApp] = useState<string>("");
  const [contractorEmail, setContractorEmail] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [urgency, setUrgency] = useState<string>("Dispatch within 24-48 Hours");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [rfqRefId, setRfqRefId] = useState<string>("");

  // Filter catalog items
  const filteredCatalog = CATALOG_ITEMS.filter((item) => {
    const matchesCat = activeCategory === "all" || item.category === activeCategory;
    const matchesSearch =
      !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.spec.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplierBadge.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Pre-fill RFQ from catalog card
  const handleSelectCatalogItem = (item: CatalogItem) => {
    setSelectedMaterialName(item.name);
    setRfqQuantity(item.moq);
    setRfqStep(1);
    const formElement = document.getElementById("rfq-form-section");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Submit RFQ
  const handleRfqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractorName.trim() || !contractorPhone.trim()) {
      alert("Please provide your Name and Contact Phone Number to submit the RFQ.");
      return;
    }

    setIsSubmitting(true);
    const refCode = `SF-RFQ-${Date.now().toString().slice(-6)}`;
    setRfqRefId(refCode);

    const payload = {
      id: refCode,
      name: contractorName.trim(),
      phone: contractorPhone.trim(),
      whatsapp: contractorWhatsApp.trim() || contractorPhone.trim(),
      email: contractorEmail.trim() || "procurement@shurefire.ng",
      company: companyName.trim() || "Independent Contractor",
      material: selectedMaterialName,
      quantity: rfqQuantity,
      grade: rfqGrade,
      location: rfqLocation,
      logisticsAccess: rfqAccessCondition,
      offloadRequested: rfqOffloadReq,
      urgency: urgency,
      status: "new",
      createdAt: new Date().toISOString()
    };

    // 1. Supabase persistence via window.dbClient
    try {
      const client = (typeof window !== "undefined" && window.dbClient) || getSupabase();
      if (client) {
        await client.from("leads").insert({
          id: refCode,
          name: payload.name,
          phone: payload.phone,
          email: payload.email,
          query: `RFQ: ${payload.quantity} of ${payload.material} to ${payload.location}`,
          project_title: `${payload.company} - ${payload.material}`,
          notes: `WhatsApp: ${payload.whatsapp}, Access: ${payload.logisticsAccess}, Urgency: ${payload.urgency}`,
          status: "new",
          created_at: payload.createdAt
        });
      }
    } catch (err) {
      console.warn("[Procure] Supabase lead write notice:", err);
    }

    // 2. Server API persistence
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          phone: payload.phone,
          email: payload.email,
          query: `RFQ: ${payload.quantity} of ${payload.material} to ${payload.location}`,
          projectTitle: `${payload.company} - Depot Sourcing`,
          notes: `Material: ${payload.material} (${payload.quantity}), Location: ${payload.location}, Urgency: ${payload.urgency}`,
          grandTotal: 0
        })
      });
    } catch (err) {
      console.warn("[Procure] Server leads endpoint notice:", err);
    }

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const handleResetRfq = () => {
    setIsSubmitted(false);
    setRfqStep(1);
  };

  return (
    <div className="min-h-screen bg-white text-[#0f172a] flex flex-col font-sans selection:bg-[#ae2424]/10 selection:text-[#ae2424]">
      
      {/* ========================================================================= */}
      {/* 1. TOP EXECUTIVE HEADER                                                   */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2 group cursor-pointer text-left"
              title="Return to Shurefire Search Engine"
            >
              <span className="text-2xl font-black tracking-tight text-[#ae2424] group-hover:opacity-90 transition-opacity">
                Shurefire
              </span>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold uppercase tracking-wider">
                Procure™ B2B Desk
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={onNavigateEstimate}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 hover:border-[#ae2424]/40 bg-white hover:bg-slate-50 text-xs font-semibold text-[#0f172a] transition-all cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#ae2424]" />
              <span>ShureEstimate</span>
            </button>

            <a
              href="https://shurefire.com.ng/#/categories/shop-all"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#ae2424] hover:bg-[#8f1d1d] text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
            >
              <span>Marketplace</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <span>Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION (STRICT SINGLE BUTTON RULE)                               */}
      {/* ========================================================================= */}
      <section className="relative bg-gradient-to-b from-slate-50/80 via-white to-slate-50/40 pt-14 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-[#ae2424] text-xs font-bold uppercase tracking-wider animate-fade-in">
            <Building2 className="w-3.5 h-3.5 text-[#ae2424]" />
            <span>Direct-from-Depot Construction Material Sourcing</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-[#0f172a] tracking-tight leading-tight">
            Sovereign Construction Procurement. Delivered Directly to Your Site.
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Eliminate supply chain delays, middleman markups, and counterfeit materials. Buy factory-direct cement, TMT rebar, aggregates, and finishing supplies at verified depot rates.
          </p>

          {/* STRICT SINGLE BUTTON RULE in Hero Section */}
          <div className="pt-2">
            <a
              href="https://shurefire.com.ng/#/categories/shop-all"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-[#ae2424] hover:bg-[#8f1d1d] text-white text-sm sm:text-base font-bold shadow-lg hover:shadow-xl hover:shadow-[#ae2424]/20 transition-all active:scale-98 cursor-pointer"
            >
              <span>Explore Shurefire Marketplace →</span>
            </a>
          </div>

          {/* Quick Metrics Trust Bar */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#ae2424]" />
              0% Middleman Distributor Markup
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#ae2424]" />
              100% NIS & SON 117 Certified
            </span>
            <span className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-[#ae2424]" />
              Tracked Site Delivery Across Nigeria
            </span>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. FEATURE PILLARS (GRID LAYOUT)                                          */}
      {/* ========================================================================= */}
      <section className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ae2424]">Procurement Assurance</span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0f172a] tracking-tight mt-1">
              Why Tier-1 Contractors Procure with Shurefire
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Pillar 1 */}
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-6 sm:p-7 hover:border-[#ae2424]/40 hover:bg-white transition-all shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-[#ae2424] flex items-center justify-center mb-5">
                <DollarSign className="w-6 h-6 text-[#ae2424]" />
              </div>
              <h3 className="text-lg font-bold text-[#0f172a]">Factory-Direct Pricing</h3>
              <p className="text-xs font-bold text-[#ae2424] mt-0.5">Zero Distributor Markups</p>
              <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
                Direct depot dispatch with zero distributor markups. We bypass speculative street retailers, routing your trailer or tipper straight from major manufacturing terminals like Coker Allied, Ibese, and Abeokuta quarries.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-6 sm:p-7 hover:border-[#ae2424]/40 hover:bg-white transition-all shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-[#ae2424] flex items-center justify-center mb-5">
                <Truck className="w-6 h-6 text-[#ae2424]" />
              </div>
              <h3 className="text-lg font-bold text-[#0f172a]">Site Delivery Guarantee</h3>
              <p className="text-xs font-bold text-[#ae2424] mt-0.5">Tracked Logistical Dispatch</p>
              <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
                Tracked logistical dispatch straight to your construction site across Nigeria. Real-time GPS driver coordination, guaranteed demurrage compensation, and direct access for 20-ton triple-axle tippers and low-bed trailers.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-6 sm:p-7 hover:border-[#ae2424]/40 hover:bg-white transition-all shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-[#ae2424] flex items-center justify-center mb-5">
                <BadgeCheck className="w-6 h-6 text-[#ae2424]" />
              </div>
              <h3 className="text-lg font-bold text-[#0f172a]">Verified Standard Quality</h3>
              <p className="text-xs font-bold text-[#ae2424] mt-0.5">NIS & SON Certified Materials</p>
              <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
                NIS & SON certified materials (Dangote Cement Grade 42.5R, high-yield TMT steel with certified mill yield strength &ge; 500 N/mm²). Never worry about diluted cement, underweight rebar, or clay-polluted sand.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. SUPPLIER & MATERIAL CATALOG GRID                                       */}
      {/* ========================================================================= */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#ae2424]">Direct Depots & Suppliers</span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0f172a] tracking-tight mt-1">
              Verified Material Catalog & Live Depot Rates
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Select any item to pre-fill the instant 3-step Request for Quote (RFQ) form below.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search cement, rebar, sand..."
              className="w-full pl-10 pr-4 py-2 rounded-full border border-slate-200 text-xs text-[#0f172a] focus:outline-none focus:border-[#ae2424]"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { id: "all" as const, label: "All Materials" },
            { id: "core" as const, label: "Core Structural (Cement, Rebar, Aggregates)" },
            { id: "electrical_plumbing" as const, label: "Electrical & Plumbing" },
            { id: "finishing" as const, label: "Finishing & Roofing" }
          ].map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#ae2424] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCatalog.map((item) => {
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-[#ae2424]/40 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Status Tag & Category */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {item.categoryLabel}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.statusColor === "emerald"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : item.statusColor === "blue"
                          ? "bg-sky-50 text-sky-700 border border-sky-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  {/* Material Name */}
                  <h3 className="font-bold text-base text-[#0f172a] leading-snug">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {item.spec}
                  </p>

                  {/* Supplier & Depot Badge */}
                  <div className="mt-3 py-2 px-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#ae2424] shrink-0" />
                      <span className="truncate">{item.supplierBadge}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{item.depotLocation}</span>
                    </div>
                  </div>

                  {/* Pricing & MOQ */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Depot Rate</span>
                      <span className="font-bold text-sm text-[#0f172a]">{item.priceRange}</span>
                      <span className="text-[10px] text-slate-500 block">per {item.unit}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Minimum Order (MOQ)</span>
                      <span className="font-semibold text-xs text-slate-800">{item.moq}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div className="mt-5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleSelectCatalogItem(item)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-[#ae2424] text-slate-800 hover:text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <span>Request Dispatch / RFQ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 5. RFQ / ORDER PLACEMENT WORKFLOW (3-STEP FORM)                           */}
      {/* ========================================================================= */}
      <section id="rfq-form-section" className="py-16 bg-slate-50 border-t border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ae2424]">Direct Depot Dispatch</span>
            <h2 className="text-3xl font-black text-[#0f172a] tracking-tight mt-1">
              3-Step Request for Quote (RFQ)
            </h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto mt-2">
              Submit your material requirements for instant live pricing confirmation and site offload scheduling with the Coker Allied sourcing desk.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm">
            
            {/* Step Indicators */}
            <div className="grid grid-cols-3 gap-2 pb-8 mb-8 border-b border-slate-200 text-center">
              <div className={`space-y-1 ${rfqStep >= 1 ? "text-[#ae2424]" : "text-slate-400"}`}>
                <div className="text-xs font-bold uppercase tracking-wider">Step 1</div>
                <div className="text-xs font-semibold">Material & Quantity</div>
              </div>
              <div className={`space-y-1 ${rfqStep >= 2 ? "text-[#ae2424]" : "text-slate-400"}`}>
                <div className="text-xs font-bold uppercase tracking-wider">Step 2</div>
                <div className="text-xs font-semibold">Site Logistics</div>
              </div>
              <div className={`space-y-1 ${rfqStep >= 3 ? "text-[#ae2424]" : "text-slate-400"}`}>
                <div className="text-xs font-bold uppercase tracking-wider">Step 3</div>
                <div className="text-xs font-semibold">Confirmation</div>
              </div>
            </div>

            {isSubmitted ? (
              /* Success View */
              <div className="py-8 text-center space-y-5 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <Check className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-[#0f172a]">
                    RFQ Submitted Successfully!
                  </h3>
                  <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    Ramon Bisola and our sourcing coordinators at the Coker Allied depot have received your order ({rfqRefId}). You will receive immediate phone and WhatsApp dispatch confirmation.
                  </p>
                </div>

                <div className="max-w-md mx-auto bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs text-left space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Material:</span>
                    <span className="font-bold text-slate-900">{selectedMaterialName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Volume / Quantity:</span>
                    <span className="font-bold text-slate-900">{rfqQuantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Destination:</span>
                    <span className="font-bold text-slate-900">{rfqLocation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Site Access:</span>
                    <span className="font-medium text-slate-700">{rfqAccessCondition}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Contact Person:</span>
                    <span className="font-bold text-[#ae2424]">{contractorName} ({contractorPhone})</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={`https://wa.me/2349023089987?text=Hello%20Shurefire%20Procurement%20Desk,%20I%20just%20submitted%20RFQ%20${rfqRefId}%20for%20${encodeURIComponent(rfqQuantity)}%20of%20${encodeURIComponent(selectedMaterialName)}%20to%20${encodeURIComponent(rfqLocation)}.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#ae2424] hover:bg-[#8f1d1d] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Confirm via WhatsApp (+234 902 308 9987)</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleResetRfq}
                    className="w-full sm:w-auto px-5 py-3 rounded-full text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    Submit Another RFQ
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRfqSubmit} className="space-y-6">
                
                {/* ================= STEP 1: Material & Quantity ================= */}
                {rfqStep === 1 && (
                  <div className="space-y-5 animate-fade-in">
                    <div>
                      <h3 className="text-lg font-bold text-[#0f172a]">Step 1: Material & Quantity Specification</h3>
                      <p className="text-xs text-slate-500">Choose the exact building supplies and required volume.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Selected Material
                      </label>
                      <select
                        value={selectedMaterialName}
                        onChange={(e) => setSelectedMaterialName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#0f172a] focus:outline-none focus:border-[#ae2424] bg-white font-medium"
                      >
                        {CATALOG_ITEMS.map((item) => (
                          <option key={item.id} value={item.name}>
                            {item.name} ({item.priceRange})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Quantity Needed *
                        </label>
                        <input
                          type="text"
                          required
                          value={rfqQuantity}
                          onChange={(e) => setRfqQuantity(e.target.value)}
                          placeholder="e.g. 300 Bags, 80 Lengths, 3 Tippers"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#0f172a] focus:outline-none focus:border-[#ae2424]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Structural Grade Requirement
                        </label>
                        <select
                          value={rfqGrade}
                          onChange={(e) => setRfqGrade(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#0f172a] focus:outline-none focus:border-[#ae2424] bg-white"
                        >
                          <option value="Grade 42.5R High-Strength">Grade 42.5R High-Strength (Slabs & Columns)</option>
                          <option value="Grade 32.5N Standard">Grade 32.5N Standard (Masonry Blockwork)</option>
                          <option value="High-Yield TMT NIS/SON 117">High-Yield TMT Steel (NIS/SON 117)</option>
                          <option value="Standard Washed River Sand">Standard Washed River Sand</option>
                          <option value="Machine-Crushed 3/4 Granite">Machine-Crushed 3/4" Granite</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setRfqStep(2)}
                        className="px-6 py-2.5 rounded-full bg-[#ae2424] hover:bg-[#8f1d1d] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <span>Next: Site Logistics</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ================= STEP 2: Site Location & Logistics ================= */}
                {rfqStep === 2 && (
                  <div className="space-y-5 animate-fade-in">
                    <div>
                      <h3 className="text-lg font-bold text-[#0f172a]">Step 2: Site Location & Access Logistics</h3>
                      <p className="text-xs text-slate-500">Provide delivery coordinates and road conditions for offloading.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Site Location Address *
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          required
                          value={rfqLocation}
                          onChange={(e) => setRfqLocation(e.target.value)}
                          placeholder="e.g. Lekki Phase 1, Ajah, Ikeja, Victoria Island, Epe"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#0f172a] focus:outline-none focus:border-[#ae2424]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Site Road Condition & Heavy Vehicle Access
                      </label>
                      <select
                        value={rfqAccessCondition}
                        onChange={(e) => setRfqAccessCondition(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#0f172a] focus:outline-none focus:border-[#ae2424] bg-white"
                      >
                        <option value="Standard Paved Road (Full Trailer / 20t Tipper Access)">
                          Standard Paved Road (Full Trailer / 20t Tipper Access)
                        </option>
                        <option value="Unpaved / Sandy Road (Strictly 20t Tipper or 6-Wheel Truck)">
                          Unpaved / Sandy Road (Strictly 20t Tipper or 6-Wheel Truck)
                        </option>
                        <option value="Restricted Estate Hours (Night or Weekend Dispatch)">
                          Restricted Estate Hours (Night or Weekend Dispatch Only)
                        </option>
                        <option value="Waterlogged / Coastal Strip (Requires Special Ground Mats)">
                          Waterlogged / Coastal Strip (Requires Special Ground Mats)
                        </option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="offloadCheck"
                        checked={rfqOffloadReq}
                        onChange={(e) => setRfqOffloadReq(e.target.checked)}
                        className="w-4 h-4 text-[#ae2424] rounded border-slate-300 focus:ring-[#ae2424]"
                      />
                      <label htmlFor="offloadCheck" className="text-xs text-slate-700 cursor-pointer font-medium">
                        Request Shurefire Offloading Labor Crew at Site
                      </label>
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setRfqStep(1)}
                        className="px-5 py-2.5 rounded-full border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRfqStep(3)}
                        className="px-6 py-2.5 rounded-full bg-[#ae2424] hover:bg-[#8f1d1d] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <span>Next: Contact Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ================= STEP 3: Contact & Lead ================= */}
                {rfqStep === 3 && (
                  <div className="space-y-5 animate-fade-in">
                    <div>
                      <h3 className="text-lg font-bold text-[#0f172a]">Step 3: Contact & Order Confirmation</h3>
                      <p className="text-xs text-slate-500">Provide direct phone and WhatsApp contact for immediate logistics dispatch.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Contractor / Site Representative *
                        </label>
                        <input
                          type="text"
                          required
                          value={contractorName}
                          onChange={(e) => setContractorName(e.target.value)}
                          placeholder="Engr. Babatunde"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#0f172a] focus:outline-none focus:border-[#ae2424]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Phone Number (Calling) *
                        </label>
                        <input
                          type="tel"
                          required
                          value={contractorPhone}
                          onChange={(e) => setContractorPhone(e.target.value)}
                          placeholder="+234 802 345 6789"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#0f172a] focus:outline-none focus:border-[#ae2424]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          WhatsApp Number
                        </label>
                        <input
                          type="tel"
                          value={contractorWhatsApp}
                          onChange={(e) => setContractorWhatsApp(e.target.value)}
                          placeholder="+234 802 345 6789"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#0f172a] focus:outline-none focus:border-[#ae2424]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Construction Company Name
                        </label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g. Apex Civil Build Ltd"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#0f172a] focus:outline-none focus:border-[#ae2424]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Delivery Urgency
                        </label>
                        <select
                          value={urgency}
                          onChange={(e) => setUrgency(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#0f172a] focus:outline-none focus:border-[#ae2424] bg-white"
                        >
                          <option value="Same-Day Express Dispatch">Same-Day Express Dispatch (Before 2 PM)</option>
                          <option value="Dispatch within 24-48 Hours">Dispatch within 24-48 Hours</option>
                          <option value="Scheduled for This Weekend">Scheduled for This Weekend</option>
                          <option value="Price Lock for Next Week">Price Lock for Next Week</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setRfqStep(2)}
                        className="px-5 py-2.5 rounded-full border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-7 py-3 rounded-full bg-[#ae2424] hover:bg-[#8f1d1d] disabled:opacity-70 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Routing to Coker Allied Depot...</span>
                          </>
                        ) : (
                          <>
                            <span>Submit RFQ for Instant Depot Dispatch</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

              </form>
            )}

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. BOTTOM CTA BANNER (STRICT REPEATED CTA BUTTON)                          */}
      {/* ========================================================================= */}
      <section className="bg-slate-900 text-white py-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-5 relative z-10">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
            Sovereign Supply Chain
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Ready to Streamline Your Site Procurement?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
            Join hundreds of civil contractors and developers procuring verified building materials at zero middleman markup.
          </p>

          <div className="pt-2">
            <a
              href="https://shurefire.com.ng/#/categories/shop-all"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-[#ae2424] hover:bg-[#8f1d1d] text-white text-sm sm:text-base font-bold shadow-lg hover:shadow-xl hover:shadow-[#ae2424]/30 transition-all active:scale-98 cursor-pointer"
            >
              <span>Explore Shurefire Marketplace →</span>
            </a>
          </div>

          <p className="text-xs text-slate-400 pt-2">
            Direct Depot Logistics Hotline:{" "}
            <a
              href="https://wa.me/2349023089987"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-bold hover:underline"
            >
              +234 902 308 9987
            </a>
          </p>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FOOTER                                                                 */}
      {/* ========================================================================= */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#ae2424]">Shurefire Procure™</span>
            <span>• Sovereign West African B2B Construction Supply Chain</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={onNavigateEstimate}
              className="text-[#ae2424] font-semibold hover:underline cursor-pointer"
            >
              ShureEstimate (#/estimate)
            </button>
            <button
              onClick={onNavigateHome}
              className="hover:text-slate-800 transition-colors cursor-pointer"
            >
              Search Engine
            </button>
            <span className="text-slate-400">© {new Date().getFullYear()} Shurefire</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default ProcureWithShurefirePage;
