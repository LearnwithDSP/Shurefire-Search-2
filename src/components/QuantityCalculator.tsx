import React, { useState } from "react";
import { 
  Calculator, 
  Construction, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Coins, 
  Layers, 
  HelpCircle, 
  MapPin, 
  TrendingUp, 
  ShieldCheck, 
  Grid, 
  Briefcase, 
  ChevronDown, 
  Sparkle,
  PhoneCall
} from "lucide-react";
import { LeadCaptureForm } from "./LeadCaptureForm.js";

// West African cost & material pricing constants (2026 Naira average indices)
const PRICES = {
  cement: 8000,          // 50kg bag standard
  rebar16mm: 13800,      // standard 12m length
  rebar12mm: 8500,       // standard 12m length
  sand20t: 135000,       // Coarse standard triple-axle tipper load
  granite20t: 275000,    // 3/4 inch crushed granite load
  block9: 780,           // 9-inch load-bearing vibrated hollow block
  block6: 650,           // 6-inch partition hollow block
  brick: 850             // Red facing clay bricks
};

const getExplanationForMaterial = (name: string): string | undefined => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("cement") && (lowerName.includes("42.5r") || lowerName.includes("dangote"))) {
    return "Grade 42.5R Cement: High-grade cement designed for high early strength. Best suited for load-bearing structures like columns, beams, suspended slabs, and heavy foundations.";
  }
  if (lowerName.includes("cement") && (lowerName.includes("32.5n") || lowerName.includes("bua"))) {
    return "Grade 32.5N Cement: Standard strength cement optimized for general block laying, plastering, rendering, and non-structural mortar joints.";
  }
  if (lowerName.includes("16mm") || lowerName.includes("16mm tmt")) {
    return "16mm Rebars: Heavy thermo-mechanically treated (TMT) steel reinforcement bars. Used as the main structural steel core for load-bearing columns and beams.";
  }
  if (lowerName.includes("12mm") || lowerName.includes("12mm high-tension")) {
    return "12mm Rebars: High-tension ribbed steel reinforcement bars, primarily used for floor slab mesh grids, lintels, and wrapping stirrup ties.";
  }
  if (lowerName.includes("sharp clean sand") || lowerName.includes("sharp sand") || lowerName.includes("coarse sand")) {
    return "Sharp Sand: Coarse aggregates free of organic silt/clay, absolutely critical for high-strength concrete mixes. Bad sand triggers weak concrete.";
  }
  if (lowerName.includes("plastering sand")) {
    return "Plastering Sand: Fine-screened, clay-free soft sand optimized for a crack-free smooth cement render finish on walls.";
  }
  if (lowerName.includes("granite")) {
    return "Crushed Granite: Extremely hard coarse aggregate stones (typically 3/4 inch). They provide the fundamental bulk compression load capacity inside concrete.";
  }
  if (lowerName.includes("membrane") || lowerName.includes("nylon")) {
    return "Anti-Moisture Membrane: A thick, heavy-duty damp-proof course (DPC) nylon barrier laid before concrete pouring to block capillary ground water rise.";
  }
  if (lowerName.includes("block") || lowerName.includes("hollow masonry") || lowerName.includes("9-inch") || lowerName.includes("6-inch")) {
    return "Hollow Blocks: Machine-vibrated concrete walling blocks. Vibration compacts the mix to guarantee high structural load capacity.";
  }
  if (lowerName.includes("roofing") || lowerName.includes("aluminum")) {
    return "0.55mm Roofing Sheets: Premium, thick rust-resistant aluminum cladding sheets. Standard 0.55mm thickness avoids sagging and ensures weather endurance.";
  }
  if (lowerName.includes("timber") || lowerName.includes("rafter")) {
    return "Hardwood Timber: Treated local hardwood (e.g. mahogany or opepe) for roof framing. Resists termite attacks, warping, and bending under high roof loads.";
  }
  if (lowerName.includes("tiles")) {
    return "Vitrified Tiles: Extremely low-porosity glazed tiles baked at very high temperatures. Fully water-impermeable, stain-proof, and highly scratch-resistant.";
  }
  return undefined;
};

interface StepConfig {
  number: number;
  title: string;
  subtitle: string;
  engineerTip: (state: any) => string;
}

export function QuantityCalculator() {
  // Conversational workflow steps state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isCalculated, setIsCalculated] = useState<boolean>(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Form selections matching progressive disclosure model
  const [projectType, setProjectType] = useState<string>("duplex");
  const [customProjectType, setCustomProjectType] = useState<string>("");
  
  const [sizeMethod, setSizeMethod] = useState<"m2" | "bedrooms">("bedrooms");
  const [floorSizeM2, setFloorSizeM2] = useState<number>(150);
  const [numBedrooms, setNumBedrooms] = useState<"1-2" | "3" | "4" | "5+">("3");

  const [locationZone, setLocationZone] = useState<string>("Lagos");

  const [structuralStrength, setStructuralStrength] = useState<"basic" | "standard" | "premium">("standard");

  const [foundationType, setFoundationType] = useState<"strip" | "raft" | "pile" | "not_sure">("not_sure");

  const [wallSystem, setWallSystem] = useState<"blocks_9" | "blocks_6" | "brick" | "not_sure">("not_sure");

  const [slabType, setSlabType] = useState<"concrete" | "beam_block" | "timber" | "not_sure">("not_sure");

  const [finishingLevel, setFinishingLevel] = useState<"basic" | "standard" | "luxury">("standard");

  // Expanded status for results
  const [expandedSection, setExpandedSection] = useState<string | null>("summary");

  // Step declarations
  const STEPS: StepConfig[] = [
    {
      number: 1,
      title: "Project Category",
      subtitle: "What type of structure are you planning to construct?",
      engineerTip: () => 
        "Welcome! I am Seymour Alao, your Senior Estimating Partner. Knowing the correct structural envelope is step one. Bungalows carry low gravity stress, whereas duplexes are shear-walled and need proper beams. Let's lock this in."
    },
    {
      number: 2,
      title: "Scale & Dimensions",
      subtitle: "What is the physical footprint or bedroom count?",
      engineerTip: (s) => {
        const typeLabel = s.projectType === "custom" ? (s.customProjectType || "your custom structure") : s.projectType;
        return `Ah, a ${typeLabel}. Perfect. For Nigerian floor spacing, we can measure either directly in square metres (m²) or shortcut via typical bedroom allocations. I will convert this into concrete decking slab volume, beam run lengths, and wall run lines.`;
      }
    },
    {
      number: 3,
      title: "Geographical Location",
      subtitle: "Where in Nigeria is your site located?",
      engineerTip: () => 
        "Location tells me three critical things: subsoil types, delivery truck access limits, and direct transit surcharges. Lagos has higher haulage overhead due to ocean port blockages, while inland areas have cheaper raw granite quarry access."
    },
    {
      number: 4,
      title: "Structural Specifications",
      subtitle: "What level of concrete reinforcement density do you target?",
      engineerTip: (s) => 
        `For the ${s.locationZone} regional standard, we can run a cost-optimized 'Basic' spec with light reinforcing, or step it up. A 'Standard' spec is optimized for standard durability in coastal zones, while 'Premium' guarantees massive structural margin for problematic water tables.`
    },
    {
      number: 5,
      title: "Substructure Foundation",
      subtitle: "What foundation specification should we plan?",
      engineerTip: (s) => {
        if (s.locationZone === "Lagos") {
          return "Attention here: Lagos coastal zones has highly compressible clay and loose sand. Doing a strip footings foundation on swampy terrains often causes dangerous settlement cracks. I'll flag appropriate auto-recommendations.";
        }
        return "For inland areas with stable soil, standard strip foundations are safe and highly cost-effective compared to thick, reinforced raft slabs.";
      }
    },
    {
      number: 6,
      title: "Masonry Wall System",
      subtitle: "Which wall blocking dimensions will be utilized?",
      engineerTip: () => 
        "In modern site practice, we use 9-inch load-bearing vibrated sandcrete blocks for exterior structural shell walls, and 6-inch blocks strictly for interior non-weight partition divisions. Bricks offer great insulation but require specialized skilled bricklayers."
    },
    {
      number: 7,
      title: "Roof Substructure & Slabs",
      subtitle: "What type of decking slab or roofing layout will cover the building?",
      engineerTip: (s) => 
        s.projectType === "duplex" || s.projectType === "multi_storey"
          ? "Because you have multi-level spaces, a solid poured reinforced concrete slab is standard practice to support upper structural loads safely."
          : "For bungalows, you can avoid top slab concrete decking with direct timber roof trusses to save over 30% of total material cement budgets."
    },
    {
      number: 8,
      title: "Architectural Finishing Grade",
      subtitle: "What baseline interior finishing level is targeted?",
      engineerTip: () => 
        "Finishing directly impacts cement-to-sand rendering volume, tile-setting mortar requirements, POP ceiling plaster binders, and wall screeding coats. This step defines our ultimate contingency factor."
    }
  ];

  // Helper selectors and recommendations
  const getAutoRecommendFoundation = () => {
    if (projectType === "multi_storey") return "Pile Foundation (Geotechnically Safe)";
    if (projectType === "duplex") {
      return locationZone === "Lagos" ? "Raft Foundation (Recommended for Saturated Soils)" : "Strip Foundation (Sufficient for Firm Soils)";
    }
    if (projectType === "fence") return "Strip Foundation (Standard)";
    return locationZone === "Lagos" ? "Split Raft/Strip" : "Strip Foundation";
  };

  const getAutoRecommendSlab = () => {
    if (projectType === "duplex" || projectType === "multi_storey") return "Reinforced Concrete Slab (150mm TMT High-Yield Mesh)";
    if (projectType === "fence") return "None (Standard Precast lintel beam only)";
    return "Timber Roofing System (Traditional High-Tension Wood Trusses)";
  };

  const getAutoRecommendWall = () => {
    if (projectType === "fence") return "9-inch hollow blocks (Vibrated high density)";
    return "9-inch hollow blocks for shell, 6-inch blocks for indoor partitions";
  };

  const handleNextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    } else {
      triggerCalculation();
    }
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Heavy Cost & Structural Material Logic with 20+ Yrs Exp Cost Engineer Precision
  const triggerCalculation = () => {
    setIsGenerating(true);
    setTimeout(() => {
      // 1. Calculate floor area
      let area = 150;
      if (sizeMethod === "m2") {
        area = floorSizeM2;
      } else {
        if (numBedrooms === "1-2") area = 100;
        else if (numBedrooms === "3") area = 160;
        else if (numBedrooms === "4") area = 240;
        else if (numBedrooms === "5+") area = 350;
      }

      // Override for fence
      if (projectType === "fence") {
        area = 80; // normalized layout
      }

      // Floors count
      let floors = 1;
      if (projectType === "duplex") floors = 2;
      else if (projectType === "multi_storey") floors = 3;

      // Base location index multiplier
      let locMulti = 1.0;
      if (locationZone === "Lagos") locMulti = 1.25;
      else if (locationZone === "Abuja" || locationZone === "Port Harcourt") locMulti = 1.15;
      else if (locationZone === "Ogun/Oyo") locMulti = 1.0;
      else if (locationZone === "Other") locMulti = 1.05;

      // Specification multiplier
      let specMulti = 1.0;
      let targetSlabThickness = 150; // mm
      let wastageFactor = 10; // percent
      if (structuralStrength === "basic") {
        specMulti = 0.85;
        targetSlabThickness = 125;
        wastageFactor = 5;
      } else if (structuralStrength === "premium") {
        specMulti = 1.2;
        targetSlabThickness = 175;
        wastageFactor = 15;
      }

      // Compute required materials
      const totalConcreteVolM3 = area * (targetSlabThickness / 1000) * floors * (slabType === "timber" ? 0.3 : 1.0);
      
      // Cement: 
      // 1m3 concrete needs ~7.5 bags
      // 1000 hollow blocks need ~20 bags for laying, ~30 bags for plastering
      let cementFromConcrete = totalConcreteVolM3 * 7.5 * specMulti;
      
      // Blocks count
      const wallPerimeter = Math.sqrt(area) * 4 * 1.4 * floors;
      let totalBlocks = Math.ceil(wallPerimeter * 3 * 10); // 10 blocks per m2 surface
      if (projectType === "fence") {
        totalBlocks = Math.ceil(150 * 2.2 * 10); // Standard plot boundary wall: 150m run, 2.2m height
      }

      let masonryCement = (totalBlocks / 1000) * 22; // 22 bags per 1000 blocks laying
      
      // Plastering cement
      let plasteringCement = 0;
      if (finishingLevel !== "basic") {
        plasteringCement = (wallPerimeter * 3 * 2 * 0.08); // both sides, approx 1 bag per 12m2 surface
      }

      let finalCementBags = Math.ceil((cementFromConcrete + masonryCement + plasteringCement) * (1 + wastageFactor/100));

      // Sand calculation
      // Coarse sand: concrete needs ~0.45 m3 sand per m3. Sand density = 1.6 t/m3. 
      // Mortar sand: ~2.5 tons per 1,000 blocks
      // Plastering sand: ~2.8 tons per 1,000 blocks
      const concreteSandTons = totalConcreteVolM3 * 0.45 * 1.6;
      const masonrySandTons = (totalBlocks / 1000) * 2.5 + (plasteringCement > 0 ? (totalBlocks / 1000) * 3 : 0);
      const totalSandTons = (concreteSandTons + masonrySandTons) * (1 + wastageFactor/100);
      const sandTrips = Math.max(1, Math.ceil(totalSandTons / 20)); // 20 tons tipper loads

      // Crushed Granite
      // Structural concrete needs ~0.9 m3 granite per m3. Density 1.6 t/m3
      const totalGraniteTons = totalConcreteVolM3 * 0.9 * 1.6 * (slabType === "timber" ? 0.2 : 1.0);
      const graniteTrips = Math.max(1, Math.ceil(totalGraniteTons / 20));

      // Rebar steel calculation: ~80kg steel per m3 concrete
      const totalSteelKg = totalConcreteVolM3 * 85 * specMulti;
      // beams and columns take 16mm rebars (60%), slab fabric takes 12mm rebars (40%)
      const steel16mmKg = totalSteelKg * 0.60;
      const steel12mmKg = totalSteelKg * 0.40;

      // Convert to lengths (16mm = 18.9kg/length, 12mm = 10.6kg/length)
      const lengths16mm = Math.max(12, Math.ceil(steel16mmKg / 18.9));
      const lengths12mm = Math.max(12, Math.ceil(steel12mmKg / 10.6));

      // Choose correct block price context
      let selectedBlockPrice = PRICES.block9;
      let wallSystemName = "9-Inch Vibrated Hollow Block";
      if (wallSystem === "blocks_6") {
        selectedBlockPrice = PRICES.block6;
        wallSystemName = "6-Inch Partition Hollow Block";
      } else if (wallSystem === "brick") {
        selectedBlockPrice = PRICES.brick;
        wallSystemName = "Red Clay Facing Bricks";
      }

      // Pricing conversions according to regional factors
      const cementUnitCost = Math.round(PRICES.cement * locMulti);
      const rebar16Cost = Math.round(PRICES.rebar16mm * locMulti);
      const rebar12Cost = Math.round(PRICES.rebar12mm * locMulti);
      const sandCost = Math.round(PRICES.sand20t * locMulti);
      const graniteCost = Math.round(PRICES.granite20t * locMulti);
      const blockCost = Math.round(selectedBlockPrice * locMulti);

      const itemsList = [
        {
          materialName: `Ordinary Portland Cement (Dangote 3X 42.5R)`,
          category: "Cement & Binders",
          calculatedQuantity: finalCementBags,
          unit: "50kg Bag",
          averagePriceNaira: cementUnitCost,
          totalCostNaira: finalCementBags * cementUnitCost,
          explanation: `Derived from concrete volume matching ${totalConcreteVolM3.toFixed(1)} m³ of casting with mixed ratios, plus mortar bonding and rendering needs for ${totalBlocks.toLocaleString()} block pieces.`
        },
        {
          materialName: `16mm TMT High-Yield Ribbed Rebar (12m)`,
          category: "Steel & Frame",
          calculatedQuantity: lengths16mm,
          unit: "Length",
          averagePriceNaira: rebar16Cost,
          totalCostNaira: lengths16mm * rebar16Cost,
          explanation: `Specifically allocated for structural column cages, floor decking rib beams, lintel frames, and high-tension foundation nodes.`
        },
        {
          materialName: `12mm High-Ductility Reinforcing Steel (12m)`,
          category: "Steel & Frame",
          calculatedQuantity: lengths12mm,
          unit: "Length",
          averagePriceNaira: rebar12Cost,
          totalCostNaira: lengths12mm * rebar12Cost,
          explanation: `Utilized for floor structural meshes, distribution reinforcement mats, stirrup ties, and slab lintel bands.`
        },
        {
          materialName: `Washed Coarse Sand (30 Tons Delivery)`,
          category: "Aggregates",
          calculatedQuantity: sandTrips,
          unit: "Tipper Load (20t)",
          averagePriceNaira: sandCost,
          totalCostNaira: sandTrips * sandCost,
          explanation: `Clean, salt-free river sand essential to guarantee concrete cohesion and standard sandcrete blocks laying compound.`
        },
        {
          materialName: `Crushed Granite Aggregates (3/4 Inch)`,
          category: "Aggregates",
          calculatedQuantity: graniteTrips,
          unit: "Tipper Load (20t)",
          averagePriceNaira: graniteCost,
          totalCostNaira: graniteTrips * graniteCost,
          explanation: `High compressive strength gravel matrices for massive slab stability and foundation structural concrete casting.`
        },
        {
          materialName: wallSystemName,
          category: "Masonry",
          calculatedQuantity: totalBlocks,
          unit: "Unit",
          averagePriceNaira: blockCost,
          totalCostNaira: totalBlocks * blockCost,
          explanation: `Total load-bearing masonry blocks estimated for walls perimeter up to ${floors} levels, incorporating a ${wastageFactor}% site breakage margin.`
        }
      ];

      const materialTotal = itemsList.reduce((sum, item) => sum + item.totalCostNaira, 0);
      
      // Calculate labor as 28% of material costs
      const laborCost = Math.round(materialTotal * 0.28);
      // Transport allocation
      const transportAllowance = Math.round(materialTotal * 0.08);
      const grandTotal = materialTotal + laborCost + transportAllowance;

      setCalculationResult({
        projectName: projectType === "custom" ? (customProjectType || "Custom Project") : `Sovereign ${projectType.replace("_", " ")}`,
        projectDescription: `Comprehensive site assessment for a ${area}m² layout in ${locationZone} State, built to ${structuralStrength} architectural details.`,
        estimates: itemsList,
        laborCost,
        transportAllowance,
        grandTotalNaira: grandTotal,
        materialsTotal: materialTotal,
        assumptions: {
          area,
          floors,
          slabThickness: targetSlabThickness,
          wastePercent: wastageFactor,
          locationIndex: locMulti.toFixed(2),
          soilProfile: locationZone === "Lagos" ? "Highly Compressible/Swampy Muddy Silt" : "Compact Red Laterite Clay/Hard Ground",
          concreteV3: totalConcreteVolM3.toFixed(1)
        },
        reassuringNotes: `In Western Nigerian construction terms, this standard structural analysis applies a 1:2:4 batch mixture (Grade C20 concrete) for beams and slabs. Due to ${locationZone} market logistics, I recommend placing your material orders at dawn to bypass traffic surcharges and secure real dry weighbridge weights.`
      });

      setIsCalculated(true);
      setIsGenerating(false);
      setExpandedSection("materials");
    }, 1500);
  };

  const resetEstimator = () => {
    setIsCalculated(false);
    setCalculationResult(null);
    setCurrentStep(1);
  };

  const formatNaira = (value: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value).replace("NGN", "₦");
  };

  // Get active step info
  const activeStepConfig = STEPS[currentStep - 1] || STEPS[0];
  const progressPercent = Math.round(((currentStep - 1) / (STEPS.length - 1)) * 100);

  return (
    <div className="bg-white border border-slate-200/80 shadow-lg shadow-slate-100 rounded-3xl overflow-hidden font-sans" id="quantity_calculator_widget">
      
      {/* Dynamic Header */}
      <div className="bg-slate-50/70 border-b border-slate-200/80 p-6 text-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#B91C1C] rounded-2xl flex items-center justify-center shadow-md">
            <Calculator className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-[#B91C1C] font-extrabold px-2 py-0.5 rounded tracking-widest text-white uppercase">West Africa Sourcing</span>
              <span className="text-[10px] text-emerald-600 font-mono font-bold">● ONLINE DIRECT</span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 mt-1">Seyi Alao & Partners Cost Estimator</h2>
            <p className="text-[11px] text-slate-500">Guiding massive structural calculations step-by-step through standard Nigerian site practices</p>
          </div>
        </div>

        {isCalculated && (
          <button 
            type="button"
            onClick={resetEstimator}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl transition-all cursor-pointer border border-slate-200"
          >
            Reset Flow
          </button>
        )}
      </div>

      {!isCalculated ? (
        <div className="grid grid-cols-1 lg:grid-cols-12">
          
          {/* LEFT SIDEBAR: Structural Engineer Seymour Advice Row */}
          <div className="col-span-1 lg:col-span-5 bg-slate-50/50 p-6 border-b lg:border-b-0 lg:border-r border-slate-200/85 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Seyi Profile */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold border-2 border-[#B91C1C] text-slate-950">
                    👨‍💼
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[9px] font-bold text-white">
                    ✓
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Seyi Alao, COREN</h3>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Sr. Cost Estimator (20+ Yrs Exp)</p>
                  <p className="text-[10px] text-[#B91C1C] font-semibold flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="h-3 w-3" /> Lagos & Abuja Regional Auditor
                  </p>
                </div>
              </div>

              {/* Speech bubble */}
              <div className="relative bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 rotate-45 w-4 h-4 bg-white border-r border-t border-slate-200 hidden lg:block" />
                <div className="absolute -top-2 left-6 transform rotate-45 w-4 h-4 bg-white border-l border-t border-slate-200 lg:hidden" />
                
                <h4 className="text-[10px] uppercase font-extrabold text-[#B91C1C] tracking-widest mb-1">Site Consultant Insights :</h4>
                <p className="text-slate-600 text-xs leading-relaxed font-sans italic">
                  "{activeStepConfig.engineerTip({ projectType, customProjectType, locationZone, structuralStrength })}"
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-6 lg:mt-0 space-y-2 select-none">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Structural Estimate Progress</span>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#B91C1C] h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                </div>
                <span className="text-xs font-mono font-bold text-slate-700 shrink-0">{progressPercent}%</span>
              </div>
            </div>
          </div>

          {/* MAIN INTERACTIVE AREA: STEP CONFIGURATIONS */}
          <div className="col-span-1 lg:col-span-7 p-6 sm:p-8 space-y-6 bg-white">
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                Question {currentStep} of {STEPS.length}
              </span>
              <span className="text-[11px] font-bold text-[#B91C1C] flex items-center gap-1.5 bg-[#B91C1C]/10 border border-[#B91C1C]/25 px-2.5 py-1 rounded-full uppercase tracking-wider">
                <Sparkle className="h-3 w-3 text-[#B91C1C] animate-pulse" /> Progressive Disclosure Mode
              </span>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {activeStepConfig.subtitle}
              </h3>
            </div>

            {/* STEP 1: Project definition */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="step-1-options">
                {[
                  { id: "residential_bungalow", label: "Residential Bungalow", desc: "1 Floor Layout", icon: "🏡" },
                  { id: "duplex", label: "Residential Duplex", desc: "High shear stress walls", icon: "🏛️" },
                  { id: "multi_storey", label: "Multi-Storey Building", desc: "Multiple decking slabs", icon: "🏢" },
                  { id: "fence", label: "Fence Wall", desc: "Security block perimeter", icon: "🚧" },
                  { id: "foundation_only", label: "Slab Foundation Only", desc: "Poured footings stage", icon: "🏗️" },
                  { id: "commercial", label: "Commercial Office", desc: "High frame static load", icon: "🏦" },
                  { id: "warehouse", label: "Warehouse Unit", desc: "Open span steel frame", icon: "🏭" },
                  { id: "custom", label: "Custom Project Details", desc: "Specify custom space", icon: "⚙️" }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setProjectType(opt.id)}
                    className={`p-4 rounded-xl text-left border flex items-start gap-3.5 transition-all text-sm select-none cursor-pointer ${
                      projectType === opt.id 
                        ? "border-brand-primary bg-red-50/20 ring-2 ring-brand-primary/10 shadow-xs" 
                        : "border-stone-200 hover:border-slate-400 hover:bg-slate-50/55"
                    }`}
                  >
                    <span className="text-2xl shrink-0">{opt.icon}</span>
                    <div>
                      <p className="font-bold text-slate-800">{opt.label}</p>
                      <p className="text-[11px] text-stone-500 font-medium mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                ))}

                {projectType === "custom" && (
                  <div className="col-span-1 sm:col-span-2 mt-2 animate-fadeIn">
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Write custom structural envelope details:</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:outline-none"
                      placeholder="e.g. 5-bedroom luxury estate wing with penthouse terrace"
                      value={customProjectType}
                      onChange={(e) => setCustomProjectType(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Scale and Dimensions */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex rounded-xl bg-stone-100 p-1 divide-x-2 divide-white">
                  <button
                    type="button"
                    onClick={() => setSizeMethod("bedrooms")}
                    className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      sizeMethod === "bedrooms" ? "bg-white text-slate-800 shadow-sm" : "text-stone-500"
                    }`}
                  >
                    Estimation by Bedroom Count
                  </button>
                  <button
                    type="button"
                    onClick={() => setSizeMethod("m2")}
                    className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      sizeMethod === "m2" ? "bg-white text-slate-800 shadow-sm" : "text-stone-500"
                    }`}
                  >
                    Specific Square Metres (m²)
                  </button>
                </div>

                {sizeMethod === "bedrooms" ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { val: "1-2", label: "1-2 Bedrooms", desc: "~100 m² default footprint" },
                      { val: "3", label: "3 Bedrooms Flat", desc: "~160 m² standard footprint" },
                      { val: "4", label: "4 Bedrooms Flat/Duplex", desc: "~240 m² luxury layout" },
                      { val: "5+", label: "5+ Bedrooms Mansions", desc: "~350 m² expanded layout" }
                    ].map(opt => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setNumBedrooms(opt.val as any)}
                        className={`p-4 rounded-xl text-left border flex flex-col transition-all cursor-pointer select-none ${
                          numBedrooms === opt.val 
                            ? "border-brand-primary bg-red-50/20 ring-2 ring-brand-primary/10" 
                            : "border-stone-200 hover:border-slate-400 hover:bg-slate-50/55"
                        }`}
                      >
                        <span className="text-sm font-bold text-slate-800">{opt.label}</span>
                        <span className="text-[10px] text-stone-500 mt-1 font-medium">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="block bg-stone-50 p-6 rounded-2xl border border-stone-200/50">
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-widest mb-2">Aggregate Slab Footprint Size (m²)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="10"
                        max="2000"
                        value={floorSizeM2}
                        onChange={(e) => setFloorSizeM2(Number(e.target.value))}
                        className="flex-1 px-4 py-3 border border-stone-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-brand-primary/20 focus:outline-none focus:border-brand-primary bg-white font-bold"
                      />
                      <span className="text-sm text-stone-500 font-bold bg-white border border-stone-300 p-3.5 rounded-xl">m² Area</span>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-slate-500 text-[11px] font-semibold italic">
                      <HelpCircle className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                      <span>Standard standard plot size in Nigeria is 15m x 30m (~450m² total).</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Geographical location */}
            {currentStep === 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
                {[
                  { name: "Lagos", sub: "Coastal High Surcharges (Sandy/Wetlands)", index: "1.25x Cost Multiplier" },
                  { name: "Abuja", sub: "Federal Capital Territory Sourcing (FCT)", index: "1.15x Cost Multiplier" },
                  { name: "Port Harcourt", sub: "South-South Delta Sand Belt Zone", index: "1.15x Cost Multiplier" },
                  { name: "Ogun/Oyo", sub: "Inland Western Ring Quarry Hubs", index: "1.00x Base Rates" },
                  { name: "Other States", sub: "General Nigerian regional parameters", index: "1.05x Cost Multiplier" }
                ].map(opt => (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setLocationZone(opt.name)}
                    className={`p-4 rounded-xl text-left border flex flex-col justify-between transition-all cursor-pointer ${
                      locationZone === opt.name 
                        ? "border-brand-primary bg-red-50/20 ring-2 ring-brand-primary/10" 
                        : "border-stone-200 hover:border-slate-400 hover:bg-slate-50/55"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className={`h-4.5 w-4.5 ${locationZone === opt.name ? "text-brand-primary" : "text-stone-400"}`} />
                        <span className="text-sm font-mono font-extrabold text-slate-800">{opt.name}</span>
                      </div>
                      <p className="text-[11px] text-stone-500 font-medium leading-normal">{opt.sub}</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 block mt-2 bg-emerald-50 px-2 py-0.5 rounded-sm self-start">
                      {opt.index}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* STEP 4: Structural details */}
            {currentStep === 4 && (
              <div className="space-y-3 animate-fadeIn">
                {[
                  { 
                    id: "basic", 
                    title: "Basic Concrete Mix Option", 
                    desc: "Wastage factor kept at 5%. 125mm local thickness setup.", 
                    accent: "₦ - Fast and budget-focused structural design" 
                  },
                  { 
                    id: "standard", 
                    title: "Standard Residential Spec (Recommended)", 
                    desc: "Wastage factor 10%. 150mm standard structural thickness. Optimal concrete mesh.",
                    accent: "₦₦ - COREN safety certification standards compliant" 
                  },
                  { 
                    id: "premium", 
                    title: "Premium Heavy Reinforcement Detail", 
                    desc: "Wastage allowance 15%. 175mm expanded structural slabs. Dense rebar structures for heavy columns.",
                    accent: "₦₦₦ - Commercial durability grade engineering steel" 
                  }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStructuralStrength(opt.id as any)}
                    className={`p-4 rounded-xl text-left border flex items-start gap-4 transition-all w-full cursor-pointer select-none ${
                      structuralStrength === opt.id 
                        ? "border-brand-primary bg-red-50/20 ring-2 ring-brand-primary/10" 
                        : "border-stone-200 hover:border-slate-400 hover:bg-slate-50/55"
                    }`}
                  >
                    <div className="h-5 w-5 rounded-full border border-stone-400 mt-0.5 shrink-0 flex items-center justify-center">
                      {structuralStrength === opt.id && <div className="h-2.5 w-2.5 rounded-full bg-brand-primary" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="text-sm font-bold text-slate-800">{opt.title}</h4>
                        <span className="text-[10px] bg-stone-100 text-stone-600 font-extrabold px-2 py-0.5 rounded font-mono">
                          {opt.id.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 leading-normal mb-1">{opt.desc}</p>
                      <span className="text-[10px] text-emerald-700 font-bold block">{opt.accent}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* STEP 5: Foundation */}
            {currentStep === 5 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "strip", label: "Strip Footings", desc: "For shallow soils", icon: "🧱" },
                    { id: "raft", label: "Solid Raft Slab", desc: "For swampy delta grounds", icon: "🏛️" },
                    { id: "pile", label: "Bored Piles", desc: "Superstructures deep foundation", icon: "🏗️" }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFoundationType(opt.id as any)}
                      className={`p-4 rounded-xl text-left border flex flex-col justify-between transition-all text-xs cursor-pointer ${
                        foundationType === opt.id 
                          ? "border-brand-primary bg-red-50/20 ring-2 ring-brand-primary/10 shadow-xs" 
                          : "border-stone-200 hover:border-slate-400 hover:bg-slate-50/55"
                      }`}
                    >
                      <span className="text-xl mb-1">{opt.icon}</span>
                      <div>
                        <p className="font-bold text-slate-800">{opt.label}</p>
                        <p className="text-[10px] text-stone-500 mt-0.5 font-medium leading-tight">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Auto recommendation trigger */}
                <button
                  type="button"
                  onClick={() => setFoundationType("not_sure")}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                    foundationType === "not_sure" 
                      ? "border-emerald-600 bg-emerald-50/30" 
                      : "border-dashed border-stone-300 hover:border-stone-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-800 text-sm font-bold">💡</div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Unsure? Use Seymour Alao's COREN Auto-Recommendation</p>
                      <p className="text-[10px] text-stone-500 font-semibold mt-0.5 flex items-center gap-1">
                        Recommended: <span className="text-emerald-700 font-bold uppercase">{getAutoRecommendFoundation()}</span>
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* STEP 6: Wall System */}
            {currentStep === 6 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "blocks_9", label: "9-Inch Hollow Block", desc: "₦780 Standard exterior shell", icon: "🧱" },
                    { id: "blocks_6", label: "6-Inch Hollow Block", desc: "₦650 Light indoor partitions", icon: "🧱" },
                    { id: "brick", label: "Traditional Facing Bricks", desc: "Premium thermal values", icon: "🧱" }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setWallSystem(opt.id as any)}
                      className={`p-4 rounded-xl text-left border flex flex-col justify-between transition-all text-xs cursor-pointer ${
                        wallSystem === opt.id 
                          ? "border-brand-primary bg-red-50/20 ring-2 ring-brand-primary/10 shadow-xs" 
                          : "border-stone-200 hover:border-slate-400 hover:bg-slate-50/55"
                      }`}
                    >
                      <span className="text-xl mb-1">{opt.icon}</span>
                      <div>
                        <p className="font-bold text-slate-800">{opt.label}</p>
                        <p className="text-[10px] text-stone-500 mt-0.5 font-medium leading-tight">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setWallSystem("not_sure")}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                    wallSystem === "not_sure" 
                      ? "border-emerald-600 bg-emerald-50/30" 
                      : "border-dashed border-stone-300 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-800 text-sm font-bold">💡</div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Standard Practice Recommendation</p>
                      <p className="text-[10px] text-stone-500 font-semibold mt-0.5 flex items-center gap-1">
                        Recommended: <span className="text-emerald-700 font-bold uppercase">{getAutoRecommendWall()}</span>
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* STEP 7: Slab & Roof */}
            {currentStep === 7 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "concrete", label: "Reinforced Slab", desc: "150mm concrete upper decking", icon: "🧱" },
                    { id: "beam_block", label: "Beam & Block Decking", desc: "Precast floor boards style", icon: "🏗️" },
                    { id: "timber", label: "Wooden Truss & Zinc", desc: "Traditional bungalow cost-saving", icon: "🪵" }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSlabType(opt.id as any)}
                      className={`p-4 rounded-xl text-left border flex flex-col justify-between transition-all text-xs cursor-pointer ${
                        slabType === opt.id 
                          ? "border-brand-primary bg-red-50/20 ring-2 ring-brand-primary/10 shadow-xs" 
                          : "border-stone-200 hover:border-slate-400 hover:bg-slate-50/55"
                      }`}
                    >
                      <span className="text-xl mb-1">{opt.icon}</span>
                      <div>
                        <p className="font-bold text-slate-800">{opt.label}</p>
                        <p className="text-[10px] text-stone-500 mt-0.5 font-medium leading-tight">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setSlabType("not_sure")}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                    slabType === "not_sure" 
                      ? "border-emerald-600 bg-emerald-50/30" 
                      : "border-dashed border-stone-300 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-800 text-sm font-bold">💡</div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Auto-Calculate Slabs Cover</p>
                      <p className="text-[10px] text-stone-500 font-semibold mt-0.5 flex items-center gap-1">
                        Recommended: <span className="text-emerald-700 font-bold uppercase">{getAutoRecommendSlab()}</span>
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* STEP 8: Finishing level */}
            {currentStep === 8 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn">
                {[
                  { id: "basic", title: "Basic Plastering", desc: "Unrendered block looks, simple flat paint finish", icon: "🧱" },
                  { id: "standard", title: "Standard Premium", desc: "Fully rendered interior/exterior, quality tiles & ceilings", icon: "🏠" },
                  { id: "luxury", title: "Luxury Executive", desc: "Double layer POP cornices, imported Spanish layout tiles", icon: "👑" }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFinishingLevel(opt.id as any)}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all min-h-[140px] cursor-pointer ${
                      finishingLevel === opt.id 
                        ? "border-brand-primary bg-red-50/20 ring-2 ring-brand-primary/10 shadow-xs" 
                        : "border-stone-200 hover:border-slate-400 hover:bg-slate-50/55"
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-xl">{opt.icon}</span>
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center text-[8px] ${
                        finishingLevel === opt.id ? "bg-brand-primary border-brand-primary text-white" : "border-stone-400"
                      }`}>
                        {finishingLevel === opt.id && "✓"}
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-extrabold text-slate-800">{opt.title}</p>
                      <p className="text-[10px] text-stone-500 mt-1 font-semibold leading-relaxed">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* PROGRESS TRIGGERS: Back & Next Buttons */}
            <div className="flex items-center gap-3 pt-6 border-t border-stone-100 select-none">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBackStep}
                  className="px-5 py-3.5 border border-stone-200 rounded-xl hover:bg-stone-55 hover:border-stone-300 transition-all font-bold text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer text-stone-600"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              )}

              <button
                type="button"
                onClick={handleNextStep}
                disabled={isGenerating}
                className="flex-1 bg-slate-900 hover:bg-slate-800 hover:shadow-md border border-slate-950 font-bold text-white px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer text-xs uppercase disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing quantities with COREN assumptions...</span>
                  </>
                ) : (
                  <>
                    <span>{currentStep === STEPS.length ? "Compile Structural Report & Calculations" : "Approve Selection & Continue"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

          </div>

        </div>
      ) : (

        /* OUTSTANDING SUMMARY AND MATERIAL CALCULATIONS SHEETS (ENGINEERING REPORT) */
        <div className="p-6 sm:p-8 space-y-6 animate-fadeIn font-sans bg-[#fbfbfb]">
          
          {/* SEYI ALAO SIGN OFF STAMP */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="text-3xl">👨‍💼</span>
              <div>
                <h3 className="text-sm font-extrabold text-[#113a24] uppercase tracking-wide">COREN Site Analysis Certified</h3>
                <p className="text-[11px] text-[#226340] mt-0.5 leading-relaxed font-semibold">
                  Estimation compiled by <strong>Seyi Alao, COREN Ref: 39420/REG</strong>. Price indices tuned actively for {locationZone} material terminals.
                </p>
              </div>
            </div>
            <div className="bg-emerald-600 font-mono text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0 shadow-xs">
              <span>★ STAMP ACTIVE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT 7 PANELS: Dynamic estimates listing */}
            <div className="lg:col-span-8 space-y-5">
              
              {/* Tab options matching expandable details */}
              <div className="flex border-b border-stone-200">
                {[
                  { id: "materials", label: "🧱 Materials Breakdown", count: calculationResult.estimates.length },
                  { id: "assumptions", label: "📊 Civil Assumptions", count: null },
                  { id: "sourcing", label: "💸 Wholesale Partner Quotes", count: null }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setExpandedSection(tab.id)}
                    className={`px-4 py-3 text-xs font-extrabold border-b-2 font-sans -mb-[2px] transition-all cursor-pointer ${
                      expandedSection === tab.id 
                        ? "border-brand-primary text-slate-800" 
                        : "border-transparent text-stone-400 hover:text-stone-600"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count && <span className="ml-1.5 bg-stone-100 text-stone-500 text-[10px] px-1.5 py-0.5 rounded-full">{tab.count}</span>}
                  </button>
                ))}
              </div>

              {expandedSection === "materials" && (
                <div className="space-y-4 animate-fadeIn">
                  {calculationResult.estimates.map((est: any, idx: number) => {
                    const fraction = est.totalCostNaira / calculationResult.materialsTotal;
                    return (
                      <div 
                        key={idx} 
                        className="bg-white rounded-2xl border border-stone-200/75 p-5 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4 hover:border-stone-300 transition-all font-sans"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="text-emerald-600 bg-emerald-50 h-5 w-5 rounded-full flex items-center justify-center shrink-0">✓</span>
                            <h4 className="text-sm font-bold text-slate-800">{est.materialName}</h4>
                            {(() => {
                              const explanation = getExplanationForMaterial(est.materialName);
                              if (!explanation) return null;
                              return (
                                <button
                                  type="button"
                                  className="p-0.5 rounded-full text-neutral-400 hover:text-neutral-600 focus:outline-none cursor-pointer transition-colors inline-flex items-center"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTooltip(activeTooltip === est.materialName ? null : est.materialName);
                                  }}
                                  title="Click to learn what this is used for"
                                >
                                  <HelpCircle className="h-3.5 w-3.5" />
                                </button>
                              );
                            })()}
                          </div>
                          
                          <p className="text-xs text-stone-500 leading-normal pl-7 pr-4">
                            {est.explanation}
                          </p>

                          {activeTooltip === est.materialName && (() => {
                            const explanation = getExplanationForMaterial(est.materialName);
                            return explanation ? (
                              <div className="ml-7 mt-1.5 p-2 bg-neutral-50 border border-[#ae2424]/15 rounded-lg text-[11px] font-normal leading-relaxed text-neutral-600 max-w-md animate-fadeIn flex items-start gap-1.5">
                                <span className="text-[#ae2424] shrink-0 font-bold">💡</span>
                                <span>{explanation}</span>
                              </div>
                            ) : null;
                          })()}

                          {/* Resource allocations visual loading line */}
                          <div className="pl-7 pt-2 flex items-center gap-4.5">
                            <div className="w-32 bg-stone-100 h-1.5 rounded-full overflow-hidden shrink-0">
                              <div className="bg-brand-primary h-full" style={{ width: `${Math.round(fraction * 100)}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-stone-400 font-bold uppercase">Allocated sub-cost: {Math.round(fraction * 100)}%</span>
                          </div>
                        </div>

                        <div className="text-left md:text-right shrink-0 md:pl-4 space-y-1 pt-1.5 md:pt-0 pl-7">
                          <p className="text-xs text-stone-500 font-semibold font-mono">
                            Volume: <span className="text-slate-800 font-extrabold text-sm">{est.calculatedQuantity.toLocaleString()}</span> {est.unit}
                          </p>
                          <p className="text-[11px] text-stone-400 font-medium">
                            Unit terminal average: {formatNaira(est.averagePriceNaira)}
                          </p>
                          <p className="text-[15px] font-mono font-black text-slate-900 pt-0.5 border-t border-dashed border-stone-100 mt-1">
                            {formatNaira(est.totalCostNaira)}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {/* SEYI ALAO ADVISORY NOTE WRAPPER */}
                  <div className="bg-slate-100 border border-stone-200 rounded-2xl p-5 text-xs text-slate-700 leading-relaxed space-y-2 font-mono">
                    <p className="font-extrabold uppercase tracking-widest text-[9px] text-[#ae2424] flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4" /> Cost Engineer optimization guide
                    </p>
                    <p className="italic">
                      "To avoid severe underestimation triggers on-site, I have structured this standard list with standard West African cutting wastes ({calculationResult.assumptions.wastePercent}% applied). Always instruct your carpenter builders to store structural plywood away from rainy margins."
                    </p>
                  </div>
                </div>
              )}

              {expandedSection === "assumptions" && (
                <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5 animate-fadeIn font-sans">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100 pb-2">Indexed Structural Calibration Values</h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block">Floor Slab Area</span>
                      <span className="text-sm font-bold font-mono text-slate-800">{calculationResult.assumptions.area} m²</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block">Total Slabs Count</span>
                      <span className="text-sm font-bold font-mono text-slate-800">{calculationResult.assumptions.floors} Floor Levels</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block">Slab Poured Thickness</span>
                      <span className="text-sm font-bold font-mono text-slate-800">{calculationResult.assumptions.slabThickness} mm</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block">Computed Concrete Vol</span>
                      <span className="text-sm font-bold font-mono text-slate-800">{calculationResult.assumptions.concreteV3} m³</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block">Location Pricing Index</span>
                      <span className="text-sm font-bold font-mono text-slate-800">{calculationResult.assumptions.locationIndex}x multiplier</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block">Wastage Safety Factor</span>
                      <span className="text-sm font-bold font-mono text-slate-800">+{calculationResult.assumptions.wastePercent}% built-in</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-stone-100 space-y-2">
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">Soil Composition Assumptions for {locationZone}</span>
                    <p className="text-xs text-slate-600 bg-stone-50 p-3 rounded-lg border border-stone-200/50 leading-relaxed font-medium">
                      Site coordinates mapped dynamically under sub-profile: <strong>"{calculationResult.assumptions.soilProfile}"</strong>. Foundations calculations assume standard soil bearing limit of 150 kN/m² unless piles are selected.
                    </p>
                  </div>
                </div>
              )}

              {expandedSection === "sourcing" && (
                <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 animate-fadeIn font-sans text-center max-w-xl mx-auto">
                  <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto text-xl font-bold">
                    💸
                  </div>
                  <h3 className="text-base font-bold text-slate-800">Submit Calculated List Direct to First-Tier Terminals</h3>
                  <p className="text-xs text-stone-500 leading-relaxed max-w-sm mx-auto">
                    Secure non-agent wholesale discounts on Dangote Cement loads, TMT reinforcement steel rods, and quarry granite delivered direct to your site in {locationZone}.
                  </p>

                  <LeadCaptureForm 
                    initialMaterials={`Sovereign Estimator Certified Report for "${calculationResult.projectName}" (${locationZone} State, ${calculationResult.assumptions.area} m²):\n` +
                      calculationResult.estimates.map((est: any) => `- ${est.calculatedQuantity} x ${est.materialName} (${est.unit})`).join("\n") +
                      `\n\nTotal Estimated Capital: ${formatNaira(calculationResult.grandTotalNaira)}`
                    }
                    initialCategory="Cement & Binders"
                    initialRegion={locationZone}
                    sourceContext={`COREN Engineer Calculator: ${calculationResult.projectName}`}
                  />
                </div>
              )}

            </div>

            {/* RIGHT 5 PANEL: Final Estimate Receipt Card */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-md font-sans space-y-5">
                <div className="border-b border-stone-100 pb-4 text-center">
                  <span className="text-[10px] bg-slate-900 text-white font-extrabold px-3 py-1 rounded-full uppercase tracking-widest text-center inline-block">ENGINEERING QUOTATION</span>
                  <h3 className="text-base font-black text-slate-800 mt-3 uppercase tracking-tight">{calculationResult.projectName}</h3>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">{locationZone} Price Zone</p>
                </div>

                <div className="space-y-3.5 text-xs font-medium border-b border-stone-100 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Materials Summary:</span>
                    <span className="font-mono font-bold text-slate-800">{formatNaira(calculationResult.materialsTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Local Handwork labor (28%):</span>
                    <span className="font-mono font-bold text-slate-800">{formatNaira(calculationResult.laborCost)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Logistics & Flatbeds transit:</span>
                    <span className="font-mono font-bold text-slate-800">{formatNaira(calculationResult.transportAllowance)}</span>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest block">GRAND TOTAL CAPITAL</span>
                  <p className="text-2xl sm:text-3xl font-black font-mono text-brand-primary mt-1">{formatNaira(calculationResult.grandTotalNaira)}</p>
                  <p className="text-[9px] text-stone-400 mt-1 uppercase italic leading-normal">
                    Assumptions safe-calibrated in standard site parameters.
                  </p>
                </div>

                <div className="pt-2">
                  <a 
                    href="https://wa.me/2349023089987"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer text-center"
                  >
                    <PhoneCall className="h-4 w-4 shrink-0" />
                    <span>Ask Seyi Alao on WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Confidence Notice Panel */}
              <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-4 text-[11px] leading-relaxed text-amber-900 font-medium">
                ⚠️ <span className="font-bold">Confidence Notice:</span> This structural analysis estimation is compiled to standard civil guidelines. Raw material spot rates fluctuate based on diesel freight factors and cement terminal quotas. Use our WhatsApp links to lock pricing.
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={resetEstimator}
                  className="text-xs text-[#ae2424] hover:underline font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                >
                  ← Restart progressive consulting flow
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
