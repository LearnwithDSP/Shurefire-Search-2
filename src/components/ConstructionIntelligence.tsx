import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  Upload,
  Layers,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Calculator,
  DollarSign,
  ShoppingCart,
  FileSpreadsheet,
  ShieldAlert,
  HardHat,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Info,
  ChevronRight,
  X,
  Clock,
  FileCheck2,
  FolderOpen
} from "lucide-react";
import {
  ProjectIntelligenceProfile,
  ConstructionActionResult,
  IntelligenceActionType,
  EvidenceLevel,
  ConfidenceLevel,
  BOQItem,
  ProcurementGroup,
  ProjectCompletenessAudit,
  DetectedFact,
  MaterialBreakdownRow,
  EvidenceTally
} from "../constructionIntelligenceTypes";

interface ConstructionIntelligenceProps {
  onNavigateHome: () => void;
  onOpenAdmin: () => void;
}

const ACTION_LOADING_STEPS = [
  "Reading uploaded project information",
  "Checking available dimensions",
  "Retrieving relevant construction intelligence",
  "Performing project calculations",
  "Validating evidence",
  "Preparing recommendation"
];

export default function ConstructionIntelligence({
  onNavigateHome,
  onOpenAdmin
}: ConstructionIntelligenceProps) {
  // Upload and document states
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [processingStage, setProcessingStage] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Analysis result
  const [projectId, setProjectId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProjectIntelligenceProfile | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<any | null>(null);

  // Active intelligence action
  const [activeAction, setActiveAction] = useState<IntelligenceActionType | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionLoadingStep, setActionLoadingStep] = useState<number>(0);
  const [actionResult, setActionResult] = useState<ConstructionActionResult | null>(null);
  const [cachedActionResults, setCachedActionResults] = useState<Record<string, ConstructionActionResult>>({});
  const [copiedCsv, setCopiedCsv] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionResultRef = useRef<HTMLDivElement>(null);

  // Progress through action loading steps naturally
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (actionLoading) {
      setActionLoadingStep(0);
      const interval = setInterval(() => {
        setActionLoadingStep(prev => (prev < ACTION_LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 450);
      return () => clearInterval(interval);
    }
  }, [actionLoading]);

  // File upload handler
  const handleFileSelection = (selectedFile: File) => {
    setErrorMsg(null);
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(selectedFile.type.toLowerCase())) {
      setErrorMsg(
        `Unsupported file type (${selectedFile.type || "unknown"}). Supported formats: PDF, PNG, JPG, JPEG, WebP.`
      );
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      setErrorMsg(`File size (${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB) exceeds 20MB limit.`);
      return;
    }

    setFile(selectedFile);
    setFilename(selectedFile.name);
    setMimeType(selectedFile.type);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1];
      setFileData(base64Data);
      triggerAnalysis(base64Data, selectedFile.type, selectedFile.name, selectedFile.size);
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read file from disk. Please try again.");
    };
    reader.readAsDataURL(selectedFile);
  };

  // Trigger document analysis pipeline
  const triggerAnalysis = async (
    data: string,
    mime: string,
    name: string,
    size: number
  ) => {
    setIsUploading(true);
    setUploadProgress(15);
    setProcessingStage("Uploading document to secure Shurefire sandbox...");

    try {
      setUploadProgress(40);
      setProcessingStage("Reading drawing & interpreting architectural callouts...");

      const res = await fetch("/api/construction/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: name,
          mimeType: mime,
          fileSize: size,
          fileData: data
        })
      });

      setUploadProgress(80);
      setProcessingStage("Extracting dimensions, room schedules & structural features...");

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Document analysis failed.");
      }

      setUploadProgress(100);
      setProcessingStage("Analysis complete!");

      setProjectId(json.projectId);
      setProfile(json.profile);
      setAnalysisSummary(json.summary);
      setIsUploading(false);
    } catch (err: any) {
      setIsUploading(false);
      setErrorMsg(err.message || "Failed to analyze document.");
    }
  };

  // Trigger intelligence action with Phase 5B loading sequence
  const handleExecuteAction = async (action: IntelligenceActionType) => {
    if (!projectId) return;

    setActiveAction(action);

    // Check client memory cache first (Phase 5B Part 5)
    if (cachedActionResults[action]) {
      setActionResult(cachedActionResults[action]);
      setTimeout(() => {
        actionResultRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return;
    }

    setActionLoading(true);
    setActionResult(null);

    try {
      const res = await fetch("/api/construction/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          action
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `Failed to execute action ${action}`);
      }

      const result = json.result as ConstructionActionResult;
      setActionResult(result);
      setCachedActionResults(prev => ({ ...prev, [action]: result }));
      setActionLoading(false);

      setTimeout(() => {
        actionResultRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: any) {
      setActionLoading(false);
      setErrorMsg(err.message || "Action failed.");
    }
  };

  // Preset sample testing loaders
  const loadPresetSample = (type: "floorplan" | "structural" | "boq") => {
    let svgContent = "";
    let sampleFilename = "";

    if (type === "floorplan") {
      sampleFilename = "Sample_2Bed_Architectural_FloorPlan.png";
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600">
        <rect width="900" height="600" fill="#0f172a"/>
        <text x="50" y="50" fill="#38bdf8" font-size="20">PROPOSED 2-BEDROOM FLAT - LEKKI, LAGOS</text>
        <text x="50" y="80" fill="#94a3b8" font-size="14">SCALE 1:100 • DRAWING NO: AR-2026-004 • REV A</text>
        <rect x="70" y="120" width="360" height="260" fill="none" stroke="#38bdf8" stroke-width="2"/>
        <text x="170" y="240" fill="#fff" font-size="16">LIVING ROOM: 5.2m x 4.2m (21.84m²)</text>
        <rect x="450" y="120" width="280" height="170" fill="none" stroke="#38bdf8" stroke-width="2"/>
        <text x="490" y="200" fill="#fff" font-size="14">BEDROOM 1: 4.0m x 3.6m (14.4m²)</text>
        <rect x="450" y="310" width="280" height="170" fill="none" stroke="#38bdf8" stroke-width="2"/>
        <text x="510" y="390" fill="#fff" font-size="14">BEDROOM 2: 3.6m x 3.6m (12.96m²)</text>
      </svg>`;
    } else if (type === "structural") {
      sampleFilename = "Sample_Structural_Engineering_Plan.png";
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600">
        <rect width="900" height="600" fill="#1e293b"/>
        <text x="50" y="50" fill="#fbbf24" font-size="20">STRUCTURAL RAFT FOUNDATION &amp; BEAM SCHEDULE</text>
        <text x="50" y="80" fill="#cbd5e1" font-size="14">CLIENT: IKEJA DUPLEX • STRUCTURAL ENGINEER: COREN REG: 28411</text>
        <rect x="70" y="120" width="760" height="380" fill="none" stroke="#fbbf24" stroke-width="2"/>
        <text x="100" y="180" fill="#fff" font-size="15">FOUNDATION: 250mm RAFT SLAB (T16 @ 150mm C/C TOP &amp; BOTTOM BARS)</text>
        <text x="100" y="230" fill="#fff" font-size="15">COLUMNS (C1-C12): 225x225mm (4Y16mm MAIN BARS, Y10mm LINKS @ 200mm C/C)</text>
        <text x="100" y="280" fill="#fff" font-size="15">BEAMS (RB1): 450x225mm (3Y16 BOTTOM, 2Y16 TOP, Y10 STIRRUPS @ 175mm C/C)</text>
        <text x="100" y="330" fill="#fff" font-size="15">CONCRETE GRADE: C25 (1:1.5:3 BATCHING WITH 20mm CRUSHED GRANITE)</text>
      </svg>`;
    } else {
      sampleFilename = "Sample_Substructure_BOQ_Schedule.png";
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600">
        <rect width="900" height="600" fill="#ffffff"/>
        <text x="50" y="50" fill="#0f172a" font-size="20" font-weight="bold">BILL OF QUANTITIES (BOQ): 3-BEDROOM BUNGALOW</text>
        <text x="60" y="160" fill="#333">1. Dangote 42.5R Portland Cement | 350 | Bags | ₦8,100 | ₦2,835,000</text>
        <text x="60" y="200" fill="#333">2. 16mm High-Yield TMT Steel Rods | 110 | Lengths | ₦13,800 | ₦1,518,000</text>
        <text x="60" y="240" fill="#333">3. 9-Inch Vibrated Sandcrete Blocks | 2,800 | Pcs | ₦820 | ₦2,296,000</text>
      </svg>`;
    }

    const base64 = btoa(svgContent);
    setFile(null);
    setFilename(sampleFilename);
    setMimeType("image/png");
    setFileData(base64);
    triggerAnalysis(base64, "image/png", sampleFilename, svgContent.length);
  };

  const copyBoqToCsv = () => {
    if (!actionResult?.result?.items) return;
    const items: BOQItem[] = actionResult.result.items;
    const header = "Item No,Category,Description,Quantity,Unit,Unit Rate (NGN),Amount (NGN),Basis,Confidence\n";
    const rows = items
      .map(
        it =>
          `"${it.itemNo}","${it.category}","${it.description.replace(/"/g, '""')}","${it.quantity}","${it.unit}","${it.unitRate}","${it.amount}","${it.basis}","${it.confidence}"`
      )
      .join("\n");
    const totals = `\n"","Subtotal","","","","","${actionResult.result.subtotalNaira}","",""\n"","Contingency (7.5%)","","","","","${actionResult.result.contingencyNaira}","",""\n"","Preliminary Total","","","","","${actionResult.result.grandTotalNaira}","",""`;

    navigator.clipboard.writeText(header + rows + totals);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2500);
  };

  // Helper for evidence tags
  const renderEvidenceBadge = (level: EvidenceLevel) => {
    const styles: Record<EvidenceLevel, { bg: string; label: string }> = {
      FOUND_IN_DOCUMENT: { bg: "bg-emerald-50 text-emerald-800 border-emerald-300", label: "FOUND IN DOCUMENT" },
      RETRIEVED_FROM_SHUREFIRE: { bg: "bg-blue-50 text-blue-800 border-blue-300", label: "SHUREFIRE KNOWLEDGE" },
      CALCULATED: { bg: "bg-indigo-50 text-indigo-800 border-indigo-300", label: "CALCULATED" },
      ESTIMATED: { bg: "bg-amber-50 text-amber-800 border-amber-300", label: "ESTIMATED" },
      ASSUMED: { bg: "bg-slate-100 text-slate-700 border-slate-300", label: "ASSUMED" },
      UNKNOWN: { bg: "bg-rose-50 text-rose-800 border-rose-300", label: "UNKNOWN" }
    };

    const s = styles[level] || styles.UNKNOWN;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${s.bg}`}>
        {s.label}
      </span>
    );
  };

  // Helper for confidence badges
  const renderConfidenceBadge = (confidence: ConfidenceLevel) => {
    const styles: Record<ConfidenceLevel, { bg: string; text: string }> = {
      HIGH: { bg: "bg-emerald-100 text-emerald-800 border-emerald-300", text: "HIGH" },
      MEDIUM: { bg: "bg-amber-100 text-amber-800 border-amber-300", text: "MEDIUM" },
      LOW: { bg: "bg-rose-100 text-rose-800 border-rose-300", text: "LOW" }
    };
    const s = styles[confidence] || styles.MEDIUM;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider border ${s.bg}`}>
        {s.text} CONFIDENCE
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] text-slate-900 flex flex-col font-sans selection:bg-[#ae2424]/10 selection:text-[#ae2424]">
      {/* Top Professional Engineering Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Return to Shurefire Search"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black tracking-tight text-[#ae2424]">SHUREFIRE</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 border-l border-slate-300 pl-2">
                Construction Intelligence
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenAdmin}
              className="w-9 h-9 rounded-full bg-[#ae2424] text-white flex items-center justify-center font-black text-xs hover:bg-[#931f1f] transition-all cursor-pointer shadow-xs border-2 border-white ring-2 ring-[#ae2424]/20"
              title="Admin Portal Login"
            >
              RB
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* ========================================================================= */}
        {/* HERO / UPLOAD SECTION                                                      */}
        {/* ========================================================================= */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-xs">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ae2424]/10 text-[#ae2424] text-xs font-bold uppercase tracking-wider">
              <HardHat className="w-3.5 h-3.5" />
              <span>Construction Document Intelligence</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              ANALYZE YOUR CONSTRUCTION DOCUMENT
            </h1>
            <p className="text-sm sm:text-base text-slate-600 font-medium">
              Upload a building plan, BOQ, quotation, specification or construction document.
            </p>
          </div>

          {/* Upload Zone */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#ae2424] bg-slate-50/70 hover:bg-slate-50 rounded-xl p-8 sm:p-12 text-center transition-all cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={e => {
                  if (e.target.files?.[0]) handleFileSelection(e.target.files[0]);
                }}
              />

              <div className="w-14 h-14 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center mx-auto text-[#ae2424] group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>

              <p className="mt-4 text-base font-bold text-slate-800">
                Click to browse or drop your construction document here
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Supported: PDF, JPG, JPEG, PNG (Max 20MB)
              </p>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-5 py-2.5 rounded-lg bg-[#ae2424] hover:bg-[#931f1f] text-white text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  <FileText className="w-4 h-4" />
                  <span>Upload Document</span>
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-5 py-2.5 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  <Layers className="w-4 h-4 text-slate-600" />
                  <span>Upload Image</span>
                </button>
              </div>
            </div>

            {/* Quick Test Samples */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-600">Quick Test Samples:</span>
              <button
                type="button"
                onClick={() => loadPresetSample("floorplan")}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer border border-slate-200 transition-colors"
              >
                2-Bed Architectural Plan
              </button>
              <button
                type="button"
                onClick={() => loadPresetSample("structural")}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer border border-slate-200 transition-colors"
              >
                Structural Rebar Schedule
              </button>
              <button
                type="button"
                onClick={() => loadPresetSample("boq")}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer border border-slate-200 transition-colors"
              >
                Substructure BOQ
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">{errorMsg}</div>
                <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Processing / Progress State */}
            {isUploading && (
              <div className="mt-6 p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-[#ae2424] animate-spin" />
                    <span>{processingStage}</span>
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#ae2424] h-2 transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* ANALYSIS COMPLETE & PROJECT INTELLIGENCE SUMMARY                           */}
        {/* ========================================================================= */}
        {profile && analysisSummary && (
          <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Analysis Complete</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {profile.projectName || "Project Intelligence Profile"}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Source Document: <span className="font-semibold text-slate-700">{filename}</span> • Project Ref: <span className="font-mono text-slate-600">{projectId}</span>
                </p>
              </div>

              <div>
                {renderConfidenceBadge(profile.confidence.overall)}
              </div>
            </div>

            {/* Concise Project Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <p className="text-[11px] font-bold uppercase text-slate-500">Building Type</p>
                <p className="text-sm font-extrabold text-slate-900 mt-1 truncate" title={profile.buildingType}>
                  {profile.buildingType}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <p className="text-[11px] font-bold uppercase text-slate-500">Floor Area</p>
                <p className="text-sm font-extrabold text-slate-900 mt-1">
                  {profile.floorArea ? `${profile.floorArea} m²` : "Not annotated"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <p className="text-[11px] font-bold uppercase text-slate-500">Floors</p>
                <p className="text-sm font-extrabold text-slate-900 mt-1">
                  {profile.floors || 1} Floor{profile.floors && profile.floors > 1 ? "s" : ""}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <p className="text-[11px] font-bold uppercase text-slate-500">Rooms / Layout</p>
                <p className="text-sm font-extrabold text-slate-900 mt-1 truncate">
                  {profile.rooms.length > 0 ? `${profile.rooms.length} Rooms` : "Standard Layout"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <p className="text-[11px] font-bold uppercase text-slate-500">Structural Data</p>
                <div className="mt-1">
                  {profile.hasStructuralDrawings ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Available</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Not in Sheet</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <p className="text-[11px] font-bold uppercase text-slate-500">Location</p>
                <p className="text-sm font-extrabold text-slate-900 mt-1 truncate" title={profile.location}>
                  {profile.location || "Lagos, Nigeria"}
                </p>
              </div>
            </div>

            {/* Summary Text Callout */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <p>
                <span className="font-bold text-slate-800">Shurefire analyzed your document and identified: </span>
                {profile.projectDescription}
              </p>
              {profile.missingInformation.length > 0 && (
                <p className="text-amber-800 font-medium">
                  <span className="font-bold text-amber-900">Missing Information Detected: </span>
                  {profile.missingInformation.slice(0, 3).join(", ")}
                </p>
              )}
            </div>

            {/* ========================================================================= */}
            {/* THE SIX INTELLIGENCE ACTIONS                                              */}
            {/* ========================================================================= */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
                  WHAT WOULD YOU LIKE TO KNOW?
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Choose an intelligence action below to execute real calculations against this project.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* 1. How much cement will I need? */}
                <button
                  type="button"
                  onClick={() => handleExecuteAction("cement_requirement")}
                  disabled={actionLoading}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer group flex items-start gap-3.5 ${
                    activeAction === "cement_requirement"
                      ? "border-[#ae2424] bg-[#ae2424]/5 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#ae2424]/10 text-[#ae2424] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 group-hover:text-[#ae2424] transition-colors">
                      How much cement will I need?
                    </p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      Calculates foundation, slab, blockwork mortar &amp; plastering cement bag requirements.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#ae2424] shrink-0 self-center" />
                </button>

                {/* 2. Estimate cost in Lagos */}
                <button
                  type="button"
                  onClick={() => handleExecuteAction("cost_estimate")}
                  disabled={actionLoading}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer group flex items-start gap-3.5 ${
                    activeAction === "cost_estimate"
                      ? "border-[#ae2424] bg-[#ae2424]/5 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      Estimate cost in Lagos
                    </p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      Indexed against verified Lagos wholesale material depots and skilled artisan labour.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 shrink-0 self-center" />
                </button>

                {/* 3. What materials to buy first? */}
                <button
                  type="button"
                  onClick={() => handleExecuteAction("procurement_priority")}
                  disabled={actionLoading}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer group flex items-start gap-3.5 ${
                    activeAction === "procurement_priority"
                      ? "border-[#ae2424] bg-[#ae2424]/5 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">
                      What materials to buy first?
                    </p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      Sequenced into BUY NOW, BUY NEXT, BUY LATER, and DO NOT BUY YET to protect capital.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-700 shrink-0 self-center" />
                </button>

                {/* 4. Create preliminary BOQ */}
                <button
                  type="button"
                  onClick={() => handleExecuteAction("preliminary_boq")}
                  disabled={actionLoading}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer group flex items-start gap-3.5 ${
                    activeAction === "preliminary_boq"
                      ? "border-[#ae2424] bg-[#ae2424]/5 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
                      Create preliminary BOQ
                    </p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      Structured Bill of Quantities schedule with line items, unit rates, and 7.5% contingency.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 shrink-0 self-center" />
                </button>

                {/* 5. What info is missing? */}
                <button
                  type="button"
                  onClick={() => handleExecuteAction("missing_information")}
                  disabled={actionLoading}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer group flex items-start gap-3.5 ${
                    activeAction === "missing_information"
                      ? "border-[#ae2424] bg-[#ae2424]/5 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 group-hover:text-amber-700 transition-colors">
                      What info is missing?
                    </p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      Audits project completeness % and prioritizes CRITICAL, IMPORTANT, and OPTIONAL documents.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 shrink-0 self-center" />
                </button>

                {/* 6. How much reinforcement rebar? */}
                <button
                  type="button"
                  onClick={() => handleExecuteAction("rebar_requirement")}
                  disabled={actionLoading}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer group flex items-start gap-3.5 ${
                    activeAction === "rebar_requirement"
                      ? "border-[#ae2424] bg-[#ae2424]/5 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 group-hover:text-rose-700 transition-colors">
                      How much reinforcement rebar?
                    </p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      Strict safety enforcement: refuses to fabricate rebar from architectural-only plans.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-700 shrink-0 self-center" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* PHASE 5B TECHNICAL PROCESSING SEQUENCE (PART 6: LOADING EXPERIENCE)       */}
        {/* ========================================================================= */}
        {actionLoading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-xs space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 text-[#ae2424] animate-spin" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                  ANALYZING PROJECT
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Step {actionLoadingStep + 1} of {ACTION_LOADING_STEPS.length}
              </span>
            </div>

            <div className="space-y-2.5 max-w-lg mx-auto py-2">
              {ACTION_LOADING_STEPS.map((step, idx) => {
                const isDone = idx < actionLoadingStep;
                const isCurrent = idx === actionLoadingStep;

                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 text-xs transition-colors duration-200 ${
                      isDone
                        ? "text-emerald-700 font-semibold"
                        : isCurrent
                        ? "text-slate-900 font-bold"
                        : "text-slate-400"
                    }`}
                  >
                    <span className="w-4 text-center">
                      {isDone ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 inline" />
                      ) : isCurrent ? (
                        <span className="text-[#ae2424] font-black">&rarr;</span>
                      ) : (
                        <span className="text-slate-300 font-mono">&bull;</span>
                      )}
                    </span>
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHASE 5B ACTION RESULT PRESENTATION (PART 1 & PART 2)                     */}
        {/* ========================================================================= */}
        {actionResult && !actionLoading && (
          <section
            ref={actionResultRef}
            className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-8 animate-fade-in"
          >
            {/* Header: Action Title & Overall Confidence */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                  Construction Intelligence Action
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {actionResult.title}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {renderConfidenceBadge(actionResult.confidence)}
              </div>
            </div>

            {/* 1. DIRECT ANSWER (Prominently displayed, not buried) */}
            <div className="p-6 rounded-xl bg-slate-900 text-white shadow-sm border border-slate-800 space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 block">
                DIRECT ANSWER
              </span>
              <p className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                {actionResult.directAnswer || actionResult.shortAnswer}
              </p>
            </div>

            {/* 2. WHAT SHUREFIRE FOUND (Factual inventory with evidence classification) */}
            {actionResult.whatShurefireFound && actionResult.whatShurefireFound.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    WHAT SHUREFIRE FOUND IN UPLOADED DOCUMENT
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Evidence validated
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">Extracted Dimension / Property</th>
                        <th className="py-2.5 px-3">Detected Value</th>
                        <th className="py-2.5 px-3">Evidence Classification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {actionResult.whatShurefireFound.map((fact: DetectedFact, fIdx: number) => (
                        <tr key={fIdx} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                            {fact.label}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {fact.value}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {renderEvidenceBadge(fact.evidenceLevel)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. CALCULATION / ANALYSIS (Concise, transparent steps) */}
            {actionResult.calculationAnalysis && actionResult.calculationAnalysis.length > 0 && (
              <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                  CALCULATION &amp; ENGINEERING ANALYSIS
                </span>
                <div className="space-y-1.5 text-xs text-slate-700 font-mono">
                  {actionResult.calculationAnalysis.map((step: string, sIdx: number) => (
                    <div key={sIdx} className="flex items-start gap-2">
                      <span className="text-[#ae2424] font-black shrink-0">&bull;</span>
                      <span className="font-medium text-slate-800">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. MATERIAL / QUANTITY BREAKDOWN (Structured table with ranges where uncertainty exists) */}
            {actionResult.materialBreakdownTable && actionResult.materialBreakdownTable.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  MATERIAL / QUANTITY BREAKDOWN
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">Material / Component</th>
                        <th className="py-2.5 px-3 text-right">Estimated Quantity</th>
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-3">Evidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {actionResult.materialBreakdownTable.map((row: MaterialBreakdownRow, rIdx: number) => (
                        <tr key={rIdx} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{row.material}</td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                            {row.estimatedQuantity}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{row.unit}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {renderEvidenceBadge(row.evidenceLevel)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ACTION-SPECIFIC MODULE: PRELIMINARY BOQ SCHEDULE */}
            {actionResult.action === "preliminary_boq" && actionResult.result?.items && (
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      PRELIMINARY BOQ SCHEDULE
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      PRELIMINARY BOQ — NOT A FINAL CONTRACT BOQ
                    </p>
                  </div>
                  <button
                    onClick={copyBoqToCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-700 transition-colors cursor-pointer self-start"
                  >
                    {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCsv ? "Copied CSV" : "Export CSV"}</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">Item No.</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-3 text-right">Unit Rate (NGN)</th>
                        <th className="py-2.5 px-3 text-right">Amount (NGN)</th>
                        <th className="py-2.5 px-3">Basis</th>
                        <th className="py-2.5 px-3">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(actionResult.result.items as BOQItem[]).map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{it.itemNo}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-600">{it.category}</td>
                          <td className="py-2.5 px-3 text-slate-900">{it.description}</td>
                          <td className="py-2.5 px-3 text-right font-black whitespace-nowrap">{it.quantity}</td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{it.unit}</td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">₦{Number(it.unitRate).toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                            ₦{Number(it.amount).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{renderEvidenceBadge(it.evidenceLevel)}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="text-[10px] font-bold text-slate-700 uppercase">{it.confidence}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={6} className="py-2.5 px-3 text-right font-extrabold">SUBTOTAL:</td>
                        <td className="py-2.5 px-3 text-right font-black">₦{actionResult.result.subtotalNaira?.toLocaleString()}</td>
                        <td colSpan={2}></td>
                      </tr>
                      <tr>
                        <td colSpan={6} className="py-2 px-3 text-right text-slate-600 font-medium">CONTINGENCY (7.5%):</td>
                        <td className="py-2 px-3 text-right text-slate-600">₦{actionResult.result.contingencyNaira?.toLocaleString()}</td>
                        <td colSpan={2}></td>
                      </tr>
                      <tr className="bg-slate-100 text-sm">
                        <td colSpan={6} className="py-3 px-3 text-right font-black text-[#ae2424]">PRELIMINARY TOTAL:</td>
                        <td className="py-3 px-3 text-right font-black text-[#ae2424]">₦{actionResult.result.grandTotalNaira?.toLocaleString()}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* ACTION-SPECIFIC MODULE: PROCUREMENT 4 CHRONOLOGICAL GROUPS */}
            {actionResult.action === "procurement_priority" && actionResult.result?.groups && (
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  CHRONOLOGICAL PROCUREMENT PHASING
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(actionResult.result.groups as ProcurementGroup[]).map((grp, gIdx) => {
                    const badgeStyles: Record<string, string> = {
                      "BUY NOW": "bg-rose-100 text-rose-800 border-rose-300",
                      "BUY NEXT": "bg-amber-100 text-amber-800 border-amber-300",
                      "BUY LATER": "bg-blue-100 text-blue-800 border-blue-300",
                      "DO NOT BUY YET": "bg-slate-200 text-slate-800 border-slate-300"
                    };

                    return (
                      <div key={gIdx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider border ${badgeStyles[grp.group] || "bg-slate-100"}`}>
                            {grp.group}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">{grp.description}</p>
                        <div className="space-y-2 pt-1">
                          {grp.items.map((it, itIdx) => (
                            <div key={itIdx} className="p-2.5 rounded-lg bg-white border border-slate-200/80 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-bold text-xs text-slate-900">{it.material}</span>
                                <span className="font-black text-xs text-[#ae2424] shrink-0">{it.estimatedQuantity}</span>
                              </div>
                              <p className="text-[11px] text-slate-600">{it.reason}</p>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                                <span>Stage: {it.constructionStage}</span>
                                {renderEvidenceBadge(it.evidenceLevel)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ACTION-SPECIFIC MODULE: PROJECT COMPLETENESS AUDIT */}
            {actionResult.action === "missing_information" && actionResult.result?.completenessPercent !== undefined && (
              <div className="space-y-4 pt-2">
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      PROJECT COMPLETENESS
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Benchmarked against Nigerian COREN &amp; statutory planning approval guidelines.
                    </p>
                  </div>
                  <div className="text-center sm:text-right shrink-0">
                    <span className="text-4xl font-black text-[#ae2424]">
                      {actionResult.result.completenessPercent}%
                    </span>
                    <span className="text-xs text-slate-400 block font-semibold">Completeness</span>
                  </div>
                </div>

                {/* Most Important Next Document Alert */}
                {actionResult.result.mostImportantNextDocument && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-medium flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-black uppercase tracking-wide block">
                        MOST IMPORTANT NEXT DOCUMENT: {actionResult.result.mostImportantNextDocument}
                      </span>
                      <p className="text-amber-900">
                        Commissioning this document will eliminate structural hazards and prevent costly redesigns during construction.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ACTION-SPECIFIC MODULE: REBAR STRUCTURAL SAFETY CHECK */}
            {actionResult.action === "rebar_requirement" && actionResult.result?.status === "STRUCTURAL_DATA_REQUIRED" && (
              <div className="p-5 rounded-xl bg-rose-50 border border-rose-300 space-y-3">
                <div className="flex items-center gap-2 text-rose-900 font-black text-sm uppercase tracking-wide">
                  <ShieldAlert className="w-5 h-5 text-rose-700" />
                  <span>SAFETY-FIRST ENFORCEMENT: ZERO FABRICATION OF STRUCTURAL QUANTITIES</span>
                </div>
                <p className="text-xs text-rose-950 leading-relaxed font-medium">
                  {actionResult.result.guidance}
                </p>
                <div className="pt-2">
                  <p className="text-xs font-black text-rose-900 uppercase tracking-wide mb-2">
                    MISSING STRUCTURAL DOCUMENTS REQUIRED TO CALCULATE REBAR:
                  </p>
                  <ul className="list-disc list-inside text-xs text-rose-900 space-y-1 font-medium">
                    {(actionResult.result.missingRequirements || []).map((m: string, idx: number) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* 5. SHUREFIRE KNOWLEDGE USED (Only relevant sources) */}
            {actionResult.shurefireSources.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    SHUREFIRE KNOWLEDGE USED
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    768-D Vector Retrieval Grounding
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {actionResult.shurefireSources.map((src, idx) => (
                    <a
                      key={idx}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between gap-2.5 group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-mono text-slate-400 truncate">{src.domain}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                            {Math.round(src.similarity * 100)}% match
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-[#ae2424] transition-colors line-clamp-2">
                          {src.title}
                        </p>
                        {src.excerpt && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 italic">
                            "{src.excerpt}"
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-end text-[11px] text-slate-400 group-hover:text-[#ae2424]">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 6. EVIDENCE & CONFIDENCE SUMMARY TALLY */}
            {actionResult.evidenceSummary && (
              <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                    EVIDENCE &amp; CONFIDENCE SUMMARY
                  </span>
                  <div>{renderConfidenceBadge(actionResult.confidence)}</div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-lg font-black text-emerald-800 block">
                      {actionResult.evidenceSummary.foundInDocument}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight">FOUND IN DOC</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                    <span className="text-lg font-black text-indigo-800 block">
                      {actionResult.evidenceSummary.calculated}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-tight">CALCULATED</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                    <span className="text-lg font-black text-blue-800 block">
                      {actionResult.evidenceSummary.retrievedFromShurefire}
                    </span>
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-tight">RETRIEVED</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <span className="text-lg font-black text-amber-800 block">
                      {actionResult.evidenceSummary.estimated}
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">ESTIMATED</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-300">
                    <span className="text-lg font-black text-slate-700 block">
                      {actionResult.evidenceSummary.assumed}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">ASSUMED</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                    <span className="text-lg font-black text-rose-800 block">
                      {actionResult.evidenceSummary.unknown}
                    </span>
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-tight">UNKNOWN</span>
                  </div>
                </div>
              </div>
            )}

            {/* 7. IMPORTANT NOTE / PROFESSIONAL DISCLAIMER */}
            <div className="p-4 rounded-xl bg-slate-100/90 border border-slate-300 text-xs text-slate-700 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900">Important Professional Note: </span>
                {actionResult.importantNote}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>
          Calculations verified by Shurefire Construction Engineering Engine.
        </p>
        <p>&copy; {new Date().getFullYear()} Shurefire. All rights reserved.</p>
      </footer>
    </div>
  );
}
