import React, { useState, useMemo } from "react";
import {
  Calculator,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  TrendingUp,
  Layers,
  FileText,
  PhoneCall,
  Download,
  Share2,
  Check,
  AlertCircle,
  Building2,
  ShieldCheck,
  Compass,
  Hammer,
  Truck,
  Sparkles,
  ChevronRight,
  Home,
  Clock,
  HelpCircle,
  FileCheck2,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import jsPDF from "jspdf";
import { getSupabase } from "../supabase";

interface ShureEstimatePageProps {
  onNavigateHome: () => void;
  onNavigateProcure: () => void;
  onOpenAdmin?: () => void;
}

// West African Construction Indices (2026 Sovereign Depot Rates in NGN)
const RATES = {
  cementBag: 7950,        // Dangote Grade 42.5R 50kg bag
  rebar16mm: 13800,       // 16mm TMT high-ductility 12m length
  rebar12mm: 8300,        // 12mm high-tension ribbed 12m length
  blocks9inch: 780,       // 9" vibrated hollow masonry block
  sandTipper20t: 135000,  // Clean sharp coarse aggregate (20-ton triple-axle tipper)
  graniteTipper20t: 275000 // 3/4" crushed quarry aggregate (20-ton tipper)
};

// Preset Project Scopes
interface ScopePreset {
  id: string;
  name: string;
  category: string;
  floors: string;
  footprint: string;
  baseCement: number;
  baseRebar16: number;
  baseRebar12: number;
  baseBlocks: number;
  baseSandTippers: number;
  baseGraniteTippers: number;
  description: string;
}

const SCOPE_PRESETS: ScopePreset[] = [
  {
    id: "4-bed-duplex",
    name: "4-Bed Contemporary Duplex",
    category: "Residential (Double Storey)",
    floors: "2 Floors (Ground + Suspended Decking Slab)",
    footprint: "~320 m² Built Area",
    baseCement: 420,
    baseRebar16: 160,
    baseRebar12: 210,
    baseBlocks: 3600,
    baseSandTippers: 4,
    baseGraniteTippers: 4,
    description: "Full residential duplex with cantilever beams, columns, suspended slab, and parapet coping."
  },
  {
    id: "3-bed-bungalow",
    name: "3-Bed Standard Bungalow",
    category: "Residential (Single Storey)",
    floors: "1 Floor (Slab on Grade / Strip Footing)",
    footprint: "~180 m² Built Area",
    baseCement: 260,
    baseRebar16: 85,
    baseRebar12: 120,
    baseBlocks: 2100,
    baseSandTippers: 2,
    baseGraniteTippers: 2,
    description: "Efficient single-level residence optimized for firm inland or strip foundation ground conditions."
  },
  {
    id: "boys-quarter",
    name: "Boys Quarter (BQ Annex)",
    category: "Secondary Residential",
    floors: "1 Floor (Compact Utility Slab)",
    footprint: "~65 m² Built Area",
    baseCement: 110,
    baseRebar16: 35,
    baseRebar12: 50,
    baseBlocks: 950,
    baseSandTippers: 1,
    baseGraniteTippers: 1,
    description: "Compact 2-room domestic staff annex or auxiliary service structure."
  },
  {
    id: "commercial-warehouse",
    name: "Commercial Warehouse & Depot",
    category: "Industrial / Commercial",
    floors: "Heavy Duty Ground Slab (250mm High-Load)",
    footprint: "~600 m² Clear Span",
    baseCement: 680,
    baseRebar16: 240,
    baseRebar12: 320,
    baseBlocks: 4200,
    baseSandTippers: 7,
    baseGraniteTippers: 8,
    description: "Reinforced industrial apron slab built to carry forklift axles and stacked pallet tonnage."
  },
  {
    id: "2-storey-plaza",
    name: "2-Storey Commercial Plaza",
    category: "Commercial Office / Retail",
    floors: "3 Levels (Ground + 2 Suspended Slabs)",
    footprint: "~550 m² Gross Area",
    baseCement: 720,
    baseRebar16: 280,
    baseRebar12: 360,
    baseBlocks: 5800,
    baseSandTippers: 8,
    baseGraniteTippers: 8,
    description: "High-traffic commercial structure with heavy perimeter column cages and multi-level deck casting."
  }
];

export const ShureEstimatePage: React.FC<ShureEstimatePageProps> = ({
  onNavigateHome,
  onNavigateProcure,
  onOpenAdmin
}) => {
  // Quick Estimator State
  const [selectedScopeId, setSelectedScopeId] = useState<string>("4-bed-duplex");
  const [terrainType, setTerrainType] = useState<"standard" | "coastal_swamp">("coastal_swamp");
  const [finishQuality, setFinishQuality] = useState<"standard" | "luxury">("standard");

  // Multi-step Survey Wizard State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [surveyProjectType, setSurveyProjectType] = useState<string>("4-Bed Duplex");
  const [surveyLocation, setSurveyLocation] = useState<string>("Lekki Phase 1, Lagos");
  const [surveyTerrain, setSurveyTerrain] = useState<string>("Swampy Terrain / Raft Foundation");
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([
    "Dangote Cement (Grade 42.5R)",
    "TMT Rebar Steel (16mm & 12mm)",
    "Sharp Sand",
    "Granite (3/4 Inch)",
    "9\" Vibrated Hollow Blocks"
  ]);
  const [leadName, setLeadName] = useState<string>("");
  const [leadPhone, setLeadPhone] = useState<string>("");
  const [leadEmail, setLeadEmail] = useState<string>("");
  const [leadBudget, setLeadBudget] = useState<string>("₦25M - ₦50M");
  const [leadTimeline, setLeadTimeline] = useState<string>("Within 1-2 Months");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [lastSubmissionId, setLastSubmissionId] = useState<string>("");

  const activeScope = SCOPE_PRESETS.find(s => s.id === selectedScopeId) || SCOPE_PRESETS[0];

  // Dynamic calculations based on scope, terrain, and finish
  const calculations = useMemo(() => {
    const isSwamp = terrainType === "coastal_swamp";
    const isLux = finishQuality === "luxury";
    const terrainMultiplier = isSwamp ? 1.35 : 1.0;

    const cementBags = Math.round(activeScope.baseCement * terrainMultiplier);
    const cementTotal = cementBags * RATES.cementBag;

    const rebar16Lengths = Math.round(activeScope.baseRebar16 * terrainMultiplier);
    const rebar16Tons = Number(((rebar16Lengths * 18.9) / 1000).toFixed(2));
    const rebar16Total = rebar16Lengths * RATES.rebar16mm;

    const rebar12Lengths = Math.round(activeScope.baseRebar12 * terrainMultiplier);
    const rebar12Tons = Number(((rebar12Lengths * 10.6) / 1000).toFixed(2));
    const rebar12Total = rebar12Lengths * RATES.rebar12mm;

    const blocksCount = Math.round(activeScope.baseBlocks);
    const blocksTotal = blocksCount * RATES.blocks9inch;

    const sandTippers = Math.round(activeScope.baseSandTippers * (isSwamp ? 1.25 : 1.0));
    const sandTotal = sandTippers * RATES.sandTipper20t;

    const graniteTippers = Math.round(activeScope.baseGraniteTippers * (isSwamp ? 1.3 : 1.0));
    const graniteTotal = graniteTippers * RATES.graniteTipper20t;

    // Substructure (Foundation, ground beam, raft grid, blindings)
    const substructureTotal = Math.round(
      (cementTotal * 0.45) +
      (rebar16Total * 0.60) +
      (rebar12Total * 0.45) +
      (sandTotal * 0.50) +
      (graniteTotal * 0.50) +
      (isSwamp ? 850000 : 0) // DPC membrane, dewatering & marine anti-sulfate additive
    );

    // Superstructure (Columns, suspended beams, decking slab, masonry walls)
    const superstructureTotal = Math.round(
      (cementTotal * 0.55) +
      (rebar16Total * 0.40) +
      (rebar12Total * 0.55) +
      blocksTotal +
      (sandTotal * 0.50) +
      (graniteTotal * 0.50)
    );

    // Finishes, MEP rough-in & roof cover
    const finishingMultiplier = isLux ? 0.38 : 0.24;
    const finishingTotal = Math.round((substructureTotal + superstructureTotal) * finishingMultiplier);

    const grandTotal = substructureTotal + superstructureTotal + finishingTotal;

    return {
      cementBags,
      cementTotal,
      rebar16Lengths,
      rebar16Tons,
      rebar16Total,
      rebar12Lengths,
      rebar12Tons,
      rebar12Total,
      blocksCount,
      blocksTotal,
      sandTippers,
      sandTotal,
      graniteTippers,
      graniteTotal,
      substructureTotal,
      superstructureTotal,
      finishingTotal,
      grandTotal,
      isSwamp
    };
  }, [activeScope, terrainType, finishQuality]);

  // Toggle material requirement
  const toggleMaterial = (mat: string) => {
    setSelectedMaterials(prev =>
      prev.includes(mat) ? prev.filter(m => m !== mat) : [...prev, mat]
    );
  };

  // Generate and download client-side PDF quote using jsPDF
  const generatePdfQuote = (customLeadInfo?: { name: string; location: string; phone: string; email: string }) => {
    try {
      const doc = new jsPDF();
      const clientName = customLeadInfo?.name || leadName || "Valued Construction Client";
      const projectLoc = customLeadInfo?.location || surveyLocation || "Lagos, Nigeria";
      const refId = `SF-EST-${Date.now().toString().slice(-6)}`;
      const dateStr = new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });

      // Crimson Header Accent
      doc.setFillColor(174, 36, 36); // #ae2424
      doc.rect(0, 0, 210, 24, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("SHUREFIRE SOVEREIGN CONSTRUCTION ENGINE", 14, 15);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Official Structural Bill of Quantities (BOQ)", 150, 15);

      // Document Meta Bar
      doc.setTextColor(15, 23, 42); // #0f172a
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("PROJECT ESTIMATE & STRUCTURAL SPECIFICATION", 14, 36);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`Ref ID: ${refId}  |  Generated: ${dateStr}  |  Compliance: NIS / SON 117 / Eurocode 2`, 14, 42);

      // Client & Project Information Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 46, 182, 30, 2, 2, "FD");

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("CLIENT & SITE DETAILS", 18, 53);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`Client Name: ${clientName}`, 18, 60);
      doc.text(`Site Location: ${projectLoc}`, 18, 66);
      doc.text(`Contact: ${customLeadInfo?.phone || leadPhone || "+234 Site Rep"} | ${customLeadInfo?.email || leadEmail || "Direct Portal"}`, 18, 72);

      doc.text(`Project Scope: ${surveyProjectType || activeScope.name}`, 110, 60);
      doc.text(`Subgrade Terrain: ${surveyTerrain || (terrainType === "coastal_swamp" ? "Coastal Subgrade / Raft Grid" : "Firm Inland Soil")}`, 110, 66);
      doc.text(`Casting Standard: Grade 42.5R Portland (1:2:4 batching)`, 110, 72);

      // Table Header
      let y = 84;
      doc.setFillColor(15, 23, 42);
      doc.rect(14, y, 182, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("ITEM / STRUCTURAL COMPONENT", 18, y + 5.5);
      doc.text("SPECIFICATION & GRADE", 80, y + 5.5);
      doc.text("QTY", 132, y + 5.5);
      doc.text("DEPOT RATE", 152, y + 5.5);
      doc.text("AMOUNT (NGN)", 175, y + 5.5);

      // Table Rows
      const rows = [
        {
          item: "Dangote Portland Cement",
          spec: "Grade 42.5R High-Yield (50kg)",
          qty: `${calculations.cementBags} Bags`,
          rate: `N${RATES.cementBag.toLocaleString()}`,
          total: `N${calculations.cementTotal.toLocaleString()}`
        },
        {
          item: "16mm TMT Steel Rebar",
          spec: `High-Ductility NIS 117 (${calculations.rebar16Tons}t)`,
          qty: `${calculations.rebar16Lengths} Pcs (12m)`,
          rate: `N${RATES.rebar16mm.toLocaleString()}`,
          total: `N${calculations.rebar16Total.toLocaleString()}`
        },
        {
          item: "12mm High-Tension Rebar",
          spec: `Ribbed Decking Mesh (${calculations.rebar12Tons}t)`,
          qty: `${calculations.rebar12Lengths} Pcs (12m)`,
          rate: `N${RATES.rebar12mm.toLocaleString()}`,
          total: `N${calculations.rebar12Total.toLocaleString()}`
        },
        {
          item: "9\" Vibrated Hollow Blocks",
          spec: "Load-Bearing Masonry (9x9x18)",
          qty: `${calculations.blocksCount.toLocaleString()} Pcs`,
          rate: `N${RATES.blocks9inch.toLocaleString()}`,
          total: `N${calculations.blocksTotal.toLocaleString()}`
        },
        {
          item: "Clean Coarse Sharp Sand",
          spec: "Washed Marine/River Aggregate",
          qty: `${calculations.sandTippers} Tippers (20t)`,
          rate: `N${RATES.sandTipper20t.toLocaleString()}`,
          total: `N${calculations.sandTotal.toLocaleString()}`
        },
        {
          item: "Crushed Quarry Granite",
          spec: "3/4 Inch Clean Machine-Crushed",
          qty: `${calculations.graniteTippers} Tippers (20t)`,
          rate: `N${RATES.graniteTipper20t.toLocaleString()}`,
          total: `N${calculations.graniteTotal.toLocaleString()}`
        }
      ];

      y += 8;
      rows.forEach((r, idx) => {
        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y, 182, 7.5, "F");
        }
        doc.setDrawColor(226, 232, 240);
        doc.line(14, y + 7.5, 196, y + 7.5);

        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(r.item, 18, y + 5);
        doc.setTextColor(100, 116, 139);
        doc.text(r.spec, 80, y + 5);
        doc.setTextColor(15, 23, 42);
        doc.text(r.qty, 132, y + 5);
        doc.text(r.rate, 152, y + 5);
        doc.setFont("helvetica", "bold");
        doc.text(r.total, 175, y + 5);

        y += 7.5;
      });

      // Section Totals Summary Box
      y += 4;
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, y, 182, 34, 2, 2, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text("STRUCTURAL STAGE COST RECAPITULATION:", 18, y + 7);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Substructure (Foundation, Raft & Starter Beams):`, 18, y + 14);
      doc.text(`NGN ${calculations.substructureTotal.toLocaleString()}`, 160, y + 14);

      doc.text(`Superstructure (Columns, Suspended Slab & Blockwork):`, 18, y + 20);
      doc.text(`NGN ${calculations.superstructureTotal.toLocaleString()}`, 160, y + 20);

      doc.text(`Finishing & Enclosure Provision:`, 18, y + 26);
      doc.text(`NGN ${calculations.finishingTotal.toLocaleString()}`, 160, y + 26);

      doc.setDrawColor(203, 213, 225);
      doc.line(18, y + 28, 192, y + 28);

      // Grand Total Highlight
      y += 37;
      doc.setFillColor(174, 36, 36);
      doc.roundedRect(14, y, 182, 12, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("ESTIMATED STRUCTURAL GRAND TOTAL:", 18, y + 8);
      doc.setFontSize(12);
      doc.text(`NGN ${calculations.grandTotal.toLocaleString()}`, 148, y + 8);

      // Engineering Guidelines & Mandatory Notes
      y += 18;
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("ENGINEERING PROTOCOLS & CRAWLED TECHNICAL SPECIFICATIONS:", 14, y);

      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);

      const notes = [
        "1. Concrete Batching: Mandate 1:2:4 by volume (Grade 42.5R Portland cement, clean sharp river sand, and 3/4\" crushed granite).",
        "2. Soil Mechanics: Coastal alluvial subgrades (Lekki, Ajah, Epe) require continuous reinforced concrete raft grids with 16mm high-ductility rebar.",
        "3. Steel Standard: All rebar must conform strictly to NIS/SON 117 with verifiable mill yield tensile strength >= 500 N/mm2.",
        "4. Curing Mandate: 14 consecutive days of continuous wet burlap ponding/spraying before striking soffit formwork.",
        "5. Pricing Index: Sourced live from Shurefire Sovereign Depot Network (Coker Allied, Ibese, Abeokuta Quarry, Epe Corridor)."
      ];

      notes.forEach((n) => {
        doc.text(n, 14, y);
        y += 4.5;
      });

      // Footer
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        "Shurefire Construction Technologies | Depot Logistics Sourcing Desk: +234 902 308 9987 | https://shurefire.ng",
        14,
        286
      );

      doc.save(`Shurefire_BOQ_${refId}.pdf`);
    } catch (err) {
      console.error("PDF generation note:", err);
    }
  };

  // Handle final submission of the 4-step survey
  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadPhone.trim()) {
      alert("Please provide your Name and Contact Phone Number to generate the quote.");
      return;
    }

    setIsSubmitting(true);
    const submissionId = `est_${Date.now()}`;
    setLastSubmissionId(submissionId);

    const estimatePayload = {
      id: submissionId,
      project_type: surveyProjectType,
      location: surveyLocation,
      site_condition: surveyTerrain,
      terrain: surveyTerrain,
      materials: selectedMaterials,
      full_name: leadName.trim(),
      phone_number: leadPhone.trim(),
      email: leadEmail.trim() || "client@shurefire.ng",
      estimated_budget: leadBudget,
      timeline: leadTimeline,
      calculations: {
        cementBags: calculations.cementBags,
        rebar16Lengths: calculations.rebar16Lengths,
        rebar12Lengths: calculations.rebar12Lengths,
        blocksCount: calculations.blocksCount,
        sandTippers: calculations.sandTippers,
        graniteTippers: calculations.graniteTippers,
        substructureTotal: calculations.substructureTotal,
        superstructureTotal: calculations.superstructureTotal,
        finishingTotal: calculations.finishingTotal,
        grandTotal: calculations.grandTotal
      },
      created_at: new Date().toISOString()
    };

    // 1. Server-side API persistence (handled securely by backend)
    try {
      await fetch("/api/project-estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(estimatePayload)
      });
    } catch (err) {
      console.warn("[ShureEstimate] Server project estimates post notice:", err);
    }

    // 3. Generate the PDF immediately for the user
    generatePdfQuote({
      name: leadName,
      location: surveyLocation,
      phone: leadPhone,
      email: leadEmail
    });

    setIsSubmitting(false);
    setIsSuccess(true);
  };

  const handleResetSurvey = () => {
    setIsSuccess(false);
    setCurrentStep(1);
  };

  return (
    <div className="min-h-screen bg-white text-[#0f172a] flex flex-col font-sans selection:bg-[#ae2424]/10 selection:text-[#ae2424]">
      
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION HEADER                                                  */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Sub-tag */}
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2 group cursor-pointer text-left"
              title="Return to Shurefire Search Engine"
            >
              <span className="text-2xl font-black tracking-tight text-[#ae2424] group-hover:opacity-90 transition-opacity">
                Shurefire
              </span>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[#ae2424] text-[11px] font-bold uppercase tracking-wider">
                ShureEstimate™
              </span>
            </button>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Search Engine</span>
            </button>

            <button
              onClick={onNavigateProcure}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 hover:border-[#ae2424]/40 bg-white hover:bg-slate-50 text-xs font-semibold text-[#ae2424] transition-all cursor-pointer shadow-2xs"
            >
              <Truck className="w-3.5 h-3.5 text-[#ae2424]" />
              <span>Procure Materials</span>
            </button>

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
      {/* 2. HERO VALUE PROPOSITION                                                 */}
      {/* ========================================================================= */}
      <section className="relative bg-gradient-to-b from-rose-50/40 via-white to-slate-50/50 pt-12 pb-14 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-100/70 border border-rose-200 text-[#ae2424] text-xs font-bold uppercase tracking-wider animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-[#ae2424]" />
            <span>Proprietary West African Structural Engine</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-[#0f172a] tracking-tight leading-tight">
            Instant Structural Calculations & Quantities in Seconds.
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Eliminate costly site shortages and guesswork. Get exact <span className="font-semibold text-slate-900">Dangote 42.5R cement bag counts</span>, <span className="font-semibold text-slate-900">16mm/12mm TMT steel rebar tonnage</span>, sand & granite tipper loads, and itemized substructure vs. superstructure cost breakdowns.
          </p>

          {/* Feature Pillars Strip */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-xs font-semibold text-slate-700">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#ae2424]" />
              NIS / SON 117 Steel Compliant
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-2xs">
              <Compass className="w-3.5 h-3.5 text-[#ae2424]" />
              Lekki Coastal Raft vs Firm Inland Soil
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-2xs">
              <FileCheck2 className="w-3.5 h-3.5 text-[#ae2424]" />
              Itemized Official BOQ PDF Export
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE QUICK ESTIMATOR (LIVE SIMULATOR)                           */}
      {/* ========================================================================= */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#ae2424]">Interactive Live Matrix</span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0f172a] tracking-tight mt-1">
              Select Project Scope & Subgrade Terrain
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Toggle soil conditions to view live adjustments for raft reinforcement and slab volumes.
            </p>
          </div>

          {/* Quick Action: Jump to Full Survey / BOQ */}
          <a
            href="#boq-wizard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#ae2424] hover:bg-[#8f1d1d] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm self-start md:self-auto cursor-pointer"
          >
            <span>Request Official BOQ PDF</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Project Scope Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-8">
          {SCOPE_PRESETS.map((preset) => {
            const isSelected = selectedScopeId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setSelectedScopeId(preset.id);
                  setSurveyProjectType(preset.name);
                }}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-rose-50/60 border-[#ae2424] ring-2 ring-[#ae2424]/10 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-[#ae2424] uppercase tracking-wider">
                      {preset.category.split(" ")[0]}
                    </span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#ae2424] text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-[#0f172a] leading-snug">{preset.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{preset.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] font-medium text-slate-600">
                  {preset.footprint}
                </div>
              </button>
            );
          })}
        </div>

        {/* Terrain & Finish Quality Control Bar */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 sm:p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Terrain Toggle */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#ae2424]" />
                <span>Geotechnical Subgrade Terrain</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setTerrainType("standard");
                    setSurveyTerrain("Dry Firm Land (Standard Strip Footing)");
                  }}
                  className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    terrainType === "standard"
                      ? "bg-white border-[#ae2424] font-bold text-[#0f172a] shadow-xs ring-1 ring-[#ae2424]/20"
                      : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                  }`}
                >
                  <div className="font-bold text-slate-900">Standard Inland Firm</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Ikeja, Ibadan, Abuja (Strip Footing)</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTerrainType("coastal_swamp");
                    setSurveyTerrain("Swampy Terrain / Raft Foundation");
                  }}
                  className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    terrainType === "coastal_swamp"
                      ? "bg-rose-50 border-[#ae2424] font-bold text-[#0f172a] shadow-xs ring-1 ring-[#ae2424]/20"
                      : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-1 font-bold text-[#ae2424]">
                    <span>Coastal / Swampy (+35%)</span>
                    <span className="text-[10px] bg-rose-200/80 px-1.5 py-0.2 rounded-full font-bold">Lekki</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Raft Grid & Heavy Column Reinforcement</div>
                </button>
              </div>
            </div>

            {/* Finish Tier Toggle */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#ae2424]" />
                <span>Structural Specification & Finish Level</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setFinishQuality("standard")}
                  className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    finishQuality === "standard"
                      ? "bg-white border-[#ae2424] font-bold text-[#0f172a] shadow-xs ring-1 ring-[#ae2424]/20"
                      : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                  }`}
                >
                  <div className="font-bold text-slate-900">Standard Modern</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Quality residential specification</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFinishQuality("luxury")}
                  className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    finishQuality === "luxury"
                      ? "bg-white border-[#ae2424] font-bold text-[#0f172a] shadow-xs ring-1 ring-[#ae2424]/20"
                      : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                  }`}
                >
                  <div className="font-bold text-[#ae2424]">Executive / Luxury</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Premium structural & high-end MEP</div>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Live Material Quantities Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          
          {/* Card: Cement */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-[#ae2424]/40 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#ae2424]">Cement Bags</span>
                <h4 className="text-xl font-black text-[#0f172a] mt-0.5">Dangote 42.5R 3X</h4>
              </div>
              <span className="p-2 rounded-xl bg-rose-50 text-[#ae2424]">
                <Layers className="w-5 h-5" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#0f172a]">{calculations.cementBags.toLocaleString()}</span>
              <span className="text-xs font-semibold text-slate-500">50kg Bags</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Depot Rate: ₦{RATES.cementBag.toLocaleString()}/bag</span>
              <span className="font-bold text-[#0f172a]">₦{calculations.cementTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Card: 16mm Rebar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-[#ae2424]/40 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#ae2424]">Heavy Rebar</span>
                <h4 className="text-xl font-black text-[#0f172a] mt-0.5">16mm TMT Steel</h4>
              </div>
              <span className="p-2 rounded-xl bg-rose-50 text-[#ae2424]">
                <Hammer className="w-5 h-5" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#0f172a]">{calculations.rebar16Lengths.toLocaleString()}</span>
              <span className="text-xs font-semibold text-slate-500">Lengths ({calculations.rebar16Tons} Tons)</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Columns & Primary Beams</span>
              <span className="font-bold text-[#0f172a]">₦{calculations.rebar16Total.toLocaleString()}</span>
            </div>
          </div>

          {/* Card: 12mm Rebar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-[#ae2424]/40 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#ae2424]">Decking & Stirrups</span>
                <h4 className="text-xl font-black text-[#0f172a] mt-0.5">12mm Ribbed Steel</h4>
              </div>
              <span className="p-2 rounded-xl bg-rose-50 text-[#ae2424]">
                <Hammer className="w-5 h-5" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#0f172a]">{calculations.rebar12Lengths.toLocaleString()}</span>
              <span className="text-xs font-semibold text-slate-500">Lengths ({calculations.rebar12Tons} Tons)</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Decking Mesh & Rings</span>
              <span className="font-bold text-[#0f172a]">₦{calculations.rebar12Total.toLocaleString()}</span>
            </div>
          </div>

          {/* Card: Blocks */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-[#ae2424]/40 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#ae2424]">Masonry Units</span>
                <h4 className="text-xl font-black text-[#0f172a] mt-0.5">9" Vibrated Blocks</h4>
              </div>
              <span className="p-2 rounded-xl bg-rose-50 text-[#ae2424]">
                <Building2 className="w-5 h-5" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#0f172a]">{calculations.blocksCount.toLocaleString()}</span>
              <span className="text-xs font-semibold text-slate-500">Pcs</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Rate: ₦{RATES.blocks9inch}/pc</span>
              <span className="font-bold text-[#0f172a]">₦{calculations.blocksTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Card: Sharp Sand */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-[#ae2424]/40 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#ae2424]">Coarse Aggregates</span>
                <h4 className="text-xl font-black text-[#0f172a] mt-0.5">Clean Sharp Sand</h4>
              </div>
              <span className="p-2 rounded-xl bg-rose-50 text-[#ae2424]">
                <Truck className="w-5 h-5" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#0f172a]">{calculations.sandTippers}</span>
              <span className="text-xs font-semibold text-slate-500">Triple-Axle Tippers (20t)</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Rate: ₦{RATES.sandTipper20t.toLocaleString()}/load</span>
              <span className="font-bold text-[#0f172a]">₦{calculations.sandTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Card: Granite */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-[#ae2424]/40 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#ae2424]">Stone Aggregate</span>
                <h4 className="text-xl font-black text-[#0f172a] mt-0.5">3/4" Crushed Granite</h4>
              </div>
              <span className="p-2 rounded-xl bg-rose-50 text-[#ae2424]">
                <Truck className="w-5 h-5" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#0f172a]">{calculations.graniteTippers}</span>
              <span className="text-xs font-semibold text-slate-500">Quarry Tippers (20t)</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Rate: ₦{RATES.graniteTipper20t.toLocaleString()}/load</span>
              <span className="font-bold text-[#0f172a]">₦{calculations.graniteTotal.toLocaleString()}</span>
            </div>
          </div>

        </div>

        {/* Cost Breakdown & Grand Total Bar */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#ae2424]/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
            
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ae2424]"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
                  Substructure vs. Superstructure Cost Architecture
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="text-xs text-slate-300">Substructure (Foundation / Raft)</div>
                  <div className="text-xl font-bold text-white mt-1">₦{calculations.substructureTotal.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Footings, columns base, DPC</div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="text-xs text-slate-300">Superstructure (Columns / Slab)</div>
                  <div className="text-xl font-bold text-white mt-1">₦{calculations.superstructureTotal.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Slab deck, beams, lintels, walls</div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="text-xs text-slate-300">Finishes & MEP Enclosure</div>
                  <div className="text-xl font-bold text-white mt-1">₦{calculations.finishingTotal.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Plastering, conduit, roof frame</div>
                </div>
              </div>
            </div>

            {/* Grand Total Column */}
            <div className="bg-white/10 border border-white/15 rounded-2xl p-5 flex flex-col justify-between text-center lg:text-right">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-rose-300">Estimated Total</span>
                <div className="text-3xl font-black text-white mt-1">₦{calculations.grandTotal.toLocaleString()}</div>
                <p className="text-[11px] text-slate-300 mt-1">West African 2026 Index</p>
              </div>
              <button
                type="button"
                onClick={() => generatePdfQuote()}
                className="mt-4 w-full py-2.5 px-4 rounded-xl bg-[#ae2424] hover:bg-[#8f1d1d] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export BOQ PDF</span>
              </button>
            </div>

          </div>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 4. METHODOLOGY & REAL-TIME ENGINEERING PARAMETERS                         */}
      {/* ========================================================================= */}
      <section className="py-14 bg-slate-50 border-t border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ae2424]">Engineering Integrity</span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0f172a] tracking-tight mt-1">
              Methodology & West African Structural Standards
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Every ShureEstimate equation is strictly calibrated to Nigerian Industrial Standards (NIS), Lagos State Building Control Agency (LASBCA) codes, and coastal soil mechanics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1: Cement Grade 42.5R */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs hover:border-[#ae2424]/30 transition-all">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#ae2424] flex items-center justify-center font-bold text-sm mb-4">
                01
              </div>
              <h3 className="font-bold text-base text-[#0f172a]">Grade 42.5R Portland Mix</h3>
              <p className="text-xs font-semibold text-[#ae2424] mt-0.5">1:2:4 Volumetric Batching</p>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                We mandate Grade 42.5R cement for suspended slabs and load-bearing columns. With early 28-day compressive yield exceeding 42.5 MPa, it resists coastal salt efflorescence and load deflection.
              </p>
            </div>

            {/* Card 2: NIS / SON 117 Steel */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs hover:border-[#ae2424]/30 transition-all">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#ae2424] flex items-center justify-center font-bold text-sm mb-4">
                02
              </div>
              <h3 className="font-bold text-base text-[#0f172a]">NIS / SON 117 Steel Spec</h3>
              <p className="text-xs font-semibold text-[#ae2424] mt-0.5">High-Yield Ductility TMT</p>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                All 16mm and 12mm rebar calculations assume thermo-mechanically treated (TMT) steel with a characteristic tensile strength &ge; 500 N/mm² to prevent brittle structural failure under differential load.
              </p>
            </div>

            {/* Card 3: 14-Day Curing Mandate */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs hover:border-[#ae2424]/30 transition-all">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#ae2424] flex items-center justify-center font-bold text-sm mb-4">
                03
              </div>
              <h3 className="font-bold text-base text-[#0f172a]">14-Day Wet Curing Mandate</h3>
              <p className="text-xs font-semibold text-[#ae2424] mt-0.5">Hydration Integrity</p>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                Mandatory water-ponding or soaked burlap coverage for 14 continuous days. Premature drying under West African tropical sun induces thermal micro-cracking and slab moisture penetration.
              </p>
            </div>

            {/* Card 4: Coastal Subgrade Raft Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs hover:border-[#ae2424]/30 transition-all">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#ae2424] flex items-center justify-center font-bold text-sm mb-4">
                04
              </div>
              <h3 className="font-bold text-base text-[#0f172a]">Subgrade Raft Engineering</h3>
              <p className="text-xs font-semibold text-[#ae2424] mt-0.5">Lekki & Coastal Alluvial Soils</p>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                In sand-filled or swampy subgrades, strip foundations fail. ShureEstimate applies a 35% reinforcement surcharge for continuous inverted beam raft foundations with double 16mm rebar mats.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. 4-STEP INTERACTIVE LEAD SURVEY & BOQ PDF GENERATION WIZARD             */}
      {/* ========================================================================= */}
      <section id="boq-wizard" className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-[#ae2424] text-xs font-bold uppercase tracking-wider mb-2">
            <span>Sovereign BOQ Generator</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0f172a] tracking-tight">
            Interactive Project Estimate Survey
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto mt-2">
            Complete the 4-step survey below to record your site parameters in our Sovereign database and immediately download your customized Bill of Quantities PDF.
          </p>
        </div>

        {/* Step Indicator Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            <span className={currentStep >= 1 ? "text-[#ae2424]" : ""}>1. Scope & Location</span>
            <span className={currentStep >= 2 ? "text-[#ae2424]" : ""}>2. Soil & Terrain</span>
            <span className={currentStep >= 3 ? "text-[#ae2424]" : ""}>3. Materials</span>
            <span className={currentStep >= 4 ? "text-[#ae2424]" : ""}>4. Client Contact</span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
            <div
              className="bg-[#ae2424] h-full transition-all duration-300 rounded-full"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Wizard Form Container */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm relative">
          
          {isSuccess ? (
            /* Interactive Success Screen */
            <div className="py-8 text-center space-y-5 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <Check className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-[#0f172a]">
                  Project Specification Received!
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your project specification has been received! Our Sovereign Procurement engine is generating your itemized PDF quote. Check your email shortly.
                </p>
              </div>

              {/* Reference Details Box */}
              <div className="max-w-md mx-auto bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs text-left space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Project Type:</span>
                  <span className="font-bold text-slate-900">{surveyProjectType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Site Location:</span>
                  <span className="font-bold text-slate-900">{surveyLocation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Logistics Hub:</span>
                  <span className="font-bold text-[#ae2424]">Coker Allied Depot / Lekki Dispatch</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Estimated Total:</span>
                  <span className="font-black text-[#0f172a]">₦{calculations.grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => generatePdfQuote()}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#ae2424] hover:bg-[#8f1d1d] text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Official BOQ PDF</span>
                </button>

                <a
                  href="https://wa.me/2349023089987?text=Hello%20Shurefire%20Sourcing%20Desk,%20I%20just%20completed%20the%20ShureEstimate%20survey%20for%20my%20project."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-3 rounded-full border border-slate-300 hover:border-[#ae2424]/40 bg-white hover:bg-slate-50 text-[#0f172a] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <PhoneCall className="w-4 h-4 text-[#ae2424]" />
                  <span>Speak with Project Manager</span>
                </a>

                <button
                  type="button"
                  onClick={handleResetSurvey}
                  className="w-full sm:w-auto px-5 py-3 rounded-full text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  New Estimate
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSurveySubmit} className="space-y-6">
              
              {/* ================= STEP 1: Project Type & Location ================= */}
              {currentStep === 1 && (
                <div className="space-y-5 animate-fade-in">
                  <div>
                    <h3 className="text-lg font-bold text-[#0f172a]">Step 1: Project Type & Location</h3>
                    <p className="text-xs text-slate-500">Specify the structural classification and geography of your site.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Select Project Classification
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        "3-Bed Bungalow",
                        "4-Bed Duplex",
                        "Commercial Building / Plaza",
                        "Civil Works & Warehouse"
                      ].map((type) => {
                        const isSelected = surveyProjectType.toLowerCase().includes(type.toLowerCase().split(" ")[0]);
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setSurveyProjectType(type);
                              const match = SCOPE_PRESETS.find(p => p.name.toLowerCase().includes(type.toLowerCase().split(" ")[0]));
                              if (match) setSelectedScopeId(match.id);
                            }}
                            className={`p-3.5 rounded-2xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? "bg-rose-50 border-[#ae2424] font-bold text-[#0f172a] ring-1 ring-[#ae2424]"
                                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                            }`}
                          >
                            <span>{type}</span>
                            {isSelected && <Check className="w-4 h-4 text-[#ae2424]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Site City & Location Address
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        value={surveyLocation}
                        onChange={(e) => setSurveyLocation(e.target.value)}
                        placeholder="e.g. Lekki Phase 1, Ajah, Ikeja, Abuja"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-[#0f172a] focus:outline-none focus:border-[#ae2424] focus:ring-1 focus:ring-[#ae2424]"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-6 py-2.5 rounded-full bg-[#ae2424] hover:bg-[#8f1d1d] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <span>Next Step</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ================= STEP 2: Site Condition & Terrain ================= */}
              {currentStep === 2 && (
                <div className="space-y-5 animate-fade-in">
                  <div>
                    <h3 className="text-lg font-bold text-[#0f172a]">Step 2: Site Condition & Soil Terrain</h3>
                    <p className="text-xs text-slate-500">Soil subgrade dictates whether strip footings or raft reinforcement is engineered.</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        title: "Dry Firm Land",
                        sub: "Red laterite / Inland subgrade (Strip footing with starter rebar)",
                        terrainVal: "standard" as const
                      },
                      {
                        title: "Swampy Terrain / Raft Foundation",
                        sub: "Lekki, Ajah, waterfront (Reinforced concrete raft grid + anti-moisture membrane)",
                        terrainVal: "coastal_swamp" as const
                      },
                      {
                        title: "Waterlogged / High Water Table",
                        sub: "Requires dewatering pump wells and reinforced retaining perimeter walls",
                        terrainVal: "coastal_swamp" as const
                      },
                      {
                        title: "Unsure (Request Geotechnical Assessment)",
                        sub: "Shurefire soil engineers will verify subgrade bearing capacity on site",
                        terrainVal: "standard" as const
                      }
                    ].map((item) => {
                      const isSelected = surveyTerrain.includes(item.title.split(" ")[0]);
                      return (
                        <button
                          key={item.title}
                          type="button"
                          onClick={() => {
                            setSurveyTerrain(item.title);
                            setTerrainType(item.terrainVal);
                          }}
                          className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "bg-rose-50 border-[#ae2424] ring-1 ring-[#ae2424]"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div>
                            <div className="font-bold text-sm text-[#0f172a]">{item.title}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{item.sub}</div>
                          </div>
                          {isSelected && <Check className="w-5 h-5 text-[#ae2424] shrink-0 ml-3" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-5 py-2.5 rounded-full border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="px-6 py-2.5 rounded-full bg-[#ae2424] hover:bg-[#8f1d1d] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <span>Next Step</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ================= STEP 3: Material Requirements ================= */}
              {currentStep === 3 && (
                <div className="space-y-5 animate-fade-in">
                  <div>
                    <h3 className="text-lg font-bold text-[#0f172a]">Step 3: Material Requirements</h3>
                    <p className="text-xs text-slate-500">Select the materials to include in your personalized Bill of Quantities.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                      Toggle Key Procurement Items (Multi-select pill badges)
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      {[
                        "Dangote Cement (Grade 42.5R)",
                        "TMT Rebar Steel (16mm & 12mm)",
                        "Sharp Sand",
                        "Granite (3/4 Inch)",
                        "9\" Vibrated Hollow Blocks",
                        "Roofing Sheets & Trusses",
                        "Plumbing & Electrical Rough-in"
                      ].map((item) => {
                        const isSelected = selectedMaterials.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleMaterial(item)}
                            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? "bg-[#ae2424] text-white shadow-xs"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            <span>{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary of current active live estimate */}
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs text-slate-600">
                    <span className="font-bold text-[#0f172a] block mb-1">Current Estimator Output:</span>
                    <span>
                      {calculations.cementBags} Cement Bags • {calculations.rebar16Lengths} lengths (16mm) • {calculations.rebar12Lengths} lengths (12mm) • {calculations.sandTippers} Sand loads • {calculations.graniteTippers} Granite loads
                    </span>
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-5 py-2.5 rounded-full border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="px-6 py-2.5 rounded-full bg-[#ae2424] hover:bg-[#8f1d1d] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <span>Next Step</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ================= STEP 4: Contact & Lead Capture ================= */}
              {currentStep === 4 && (
                <div className="space-y-5 animate-fade-in">
                  <div>
                    <h3 className="text-lg font-bold text-[#0f172a]">Step 4: Contact & Lead Capture</h3>
                    <p className="text-xs text-slate-500">Provide your information to finalize calculations and export the official BOQ PDF quote.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Full Name / Organization *
                      </label>
                      <input
                        type="text"
                        required
                        value={leadName}
                        onChange={(e) => setLeadName(e.target.value)}
                        placeholder="e.g. Babatunde Adeniyi"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#0f172a] focus:outline-none focus:border-[#ae2424]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Phone Number (WhatsApp Active) *
                      </label>
                      <input
                        type="tel"
                        required
                        value={leadPhone}
                        onChange={(e) => setLeadPhone(e.target.value)}
                        placeholder="e.g. +234 802 345 6789"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#0f172a] focus:outline-none focus:border-[#ae2424]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={leadEmail}
                        onChange={(e) => setLeadEmail(e.target.value)}
                        placeholder="babatunde@example.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#0f172a] focus:outline-none focus:border-[#ae2424]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Estimated Budget Range
                      </label>
                      <select
                        value={leadBudget}
                        onChange={(e) => setLeadBudget(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#0f172a] focus:outline-none focus:border-[#ae2424] bg-white"
                      >
                        <option value="Under ₦15M">Under ₦15M</option>
                        <option value="₦15M - ₦30M">₦15M - ₦30M</option>
                        <option value="₦30M - ₦60M">₦30M - ₦60M</option>
                        <option value="₦60M - ₦120M">₦60M - ₦120M</option>
                        <option value="₦120M+">₦120M+ (Commercial / Multi-Unit)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Construction Timeline
                      </label>
                      <select
                        value={leadTimeline}
                        onChange={(e) => setLeadTimeline(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#0f172a] focus:outline-none focus:border-[#ae2424] bg-white"
                      >
                        <option value="Immediate (Within 2 Weeks)">Immediate (Within 2 Weeks)</option>
                        <option value="Within 1-2 Months">Within 1-2 Months</option>
                        <option value="3-6 Months">3-6 Months</option>
                        <option value="Planning Phase">Planning Phase</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
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
                          <span>Generating Sovereign Quote...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit & Generate PDF Quote</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </form>
          )}

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. MINIMAL LIGHT-MODE FOOTER                                              */}
      {/* ========================================================================= */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#ae2424]">Shurefire ShureEstimate™</span>
            <span>• West African Structural Estimation Engine</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={onNavigateProcure}
              className="text-[#ae2424] font-semibold hover:underline cursor-pointer"
            >
              Procure Materials (#/procure)
            </button>
            <button
              onClick={onNavigateHome}
              className="hover:text-slate-800 transition-colors cursor-pointer"
            >
              Search Console
            </button>
            <span className="text-slate-400">© {new Date().getFullYear()} Shurefire</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default ShureEstimatePage;
