import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  Upload,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Calculator,
  Compass,
  Layers,
  Building,
  DollarSign,
  Send,
  RefreshCw,
  Eye,
  Check,
  X,
  FileCheck,
  ChevronDown,
  ChevronRight,
  Shield,
  Download,
  Info,
  Maximize2
} from "lucide-react";
import {
  StructuredDocumentAnalysis,
  DocumentChatMessage,
  UserDocumentRecord,
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES
} from "../documentIntelligenceService";

interface DocumentIntelligencePageProps {
  onNavigateHome: () => void;
  onOpenAdmin?: () => void;
}

export default function DocumentIntelligencePage({
  onNavigateHome,
  onOpenAdmin
}: DocumentIntelligencePageProps) {
  // Session & upload state
  const [sessionId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("shurefire_doc_session");
      if (stored) return stored;
      const created = `sess_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem("shurefire_doc_session", created);
      return created;
    }
    return "sess_default";
  });

  const [activeTab, setActiveTab] = useState<"overview" | "found" | "components" | "materials" | "estimates" | "missing" | "verify" | "cost">("overview");
  const [currentDoc, setCurrentDoc] = useState<UserDocumentRecord | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Analysis workflow states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>("Uploading");
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Interactive conversation state
  const [chatMessages, setChatMessages] = useState<DocumentChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isAsking]);

  // Handle file selection and validation
  const handleFileSelect = async (file: File) => {
    setUploadError(null);

    // 1. Validation
    const mime = file.type.toLowerCase();
    if (!SUPPORTED_MIME_TYPES.includes(mime)) {
      setUploadError(
        `Unsupported format (${file.type || "unknown"}). Shurefire accepts architectural drawings and construction documents in PDF, PNG, JPG, or WebP.`
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 20MB limit. Please upload a compressed or single-sheet document.`
      );
      return;
    }

    // 2. Read into base64
    setIsProcessing(true);
    setProcessingStage("Uploading document...");
    setProgressPercent(15);

    const reader = new FileReader();
    reader.onerror = () => {
      setIsProcessing(false);
      setUploadError("Failed to read file from disk. Please try again.");
    };

    reader.onload = async () => {
      const base64Data = reader.result as string;
      setFilePreviewUrl(base64Data);

      try {
        // Step 1: Upload to backend
        setProcessingStage("Validating drawing & initializing session...");
        setProgressPercent(30);

        const uploadRes = await fetch("/api/documents/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type,
            fileSize: file.size,
            fileData: base64Data,
            sessionId
          })
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || "Upload rejected by server.");
        }

        const uploadedDoc = await uploadRes.json();

        // Step 2: Trigger multimodal AI analysis
        setProcessingStage("Reading document and understanding drawing...");
        setProgressPercent(50);

        // Progress simulator to reflect backend reasoning stages
        const stageTimer = setTimeout(() => {
          setProcessingStage("Extracting rooms, dimensions, and schedules...");
          setProgressPercent(70);
        }, 3000);

        const stageTimer2 = setTimeout(() => {
          setProcessingStage("Calculating material estimates and checking missing specs...");
          setProgressPercent(88);
        }, 6000);

        const analyzeRes = await fetch(`/api/documents/${uploadedDoc.id}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });

        clearTimeout(stageTimer);
        clearTimeout(stageTimer2);

        if (!analyzeRes.ok) {
          const errData = await analyzeRes.json();
          throw new Error(errData.error || "Multimodal analysis failed.");
        }

        const analysisData = await analyzeRes.json();
        setProgressPercent(100);
        setProcessingStage("Analysis complete!");

        const completeRecord: UserDocumentRecord = {
          id: uploadedDoc.id,
          sessionId,
          filename: file.name,
          mimeType: file.type,
          fileSize: file.size,
          fileData: base64Data,
          uploadTimestamp: new Date().toISOString(),
          analysisStatus: "completed",
          analysis: analysisData.analysis,
          chatMessages: [
            {
              id: "welcome_msg",
              role: "assistant",
              content: `I have analyzed "${file.name}". You can inspect the extracted rooms, structural components, and preliminary material takeoff in the workspace, or ask me technical questions below.`,
              timestamp: new Date().toISOString(),
              evidenceLevel: "EXPLICIT"
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        setCurrentDoc(completeRecord);
        setChatMessages(completeRecord.chatMessages);
      } catch (err: any) {
        console.error("[Document Upload/Analysis Failure]", err);
        setUploadError(err.message || "An error occurred during analysis.");
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsDataURL(file);
  };

  // Sample document loader for 1-click test evaluation
  const handleLoadSample = async (sampleType: "2bed_plan" | "boq_schedule" | "site_photo") => {
    setIsProcessing(true);
    setUploadError(null);

    let sampleFilename = "2-Bedroom-Residential-Plan.png";
    let sampleMime = "image/png";

    // 1x1 clean SVG image representing architectural blueprint
    let svgContent = "";
    if (sampleType === "2bed_plan") {
      sampleFilename = "Architectural-Floor-Plan-2Bed-Flat.png";
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600" fill="#0f172a">
        <rect width="900" height="600" fill="#0b1329" stroke="#1e293b" stroke-width="4"/>
        <text x="50" y="50" fill="#38bdf8" font-family="monospace" font-size="20" font-weight="bold">PROPOSED 2-BEDROOM RESIDENTIAL FLAT — LEKKI CORRIDOR, LAGOS</text>
        <text x="50" y="80" fill="#94a3b8" font-family="monospace" font-size="14">ARCHITECT: ARCON / NIG REG #48291 • SCALE 1:100 • REV: B</text>
        <rect x="70" y="120" width="360" height="260" fill="none" stroke="#38bdf8" stroke-width="3"/>
        <text x="170" y="240" fill="#e2e8f0" font-family="monospace" font-size="18">LIVING ROOM (5.2m x 4.2m)</text>
        <rect x="450" y="120" width="280" height="170" fill="none" stroke="#38bdf8" stroke-width="3"/>
        <text x="490" y="200" fill="#e2e8f0" font-family="monospace" font-size="16">MASTER BED (4.0m x 3.6m)</text>
        <rect x="450" y="310" width="280" height="170" fill="none" stroke="#38bdf8" stroke-width="3"/>
        <text x="510" y="390" fill="#e2e8f0" font-family="monospace" font-size="16">BEDROOM 2 (3.6m x 3.6m)</text>
        <rect x="70" y="400" width="200" height="150" fill="none" stroke="#38bdf8" stroke-width="3"/>
        <text x="110" y="470" fill="#e2e8f0" font-family="monospace" font-size="16">KITCHEN (3.0m x 3.2m)</text>
        <text x="50" y="570" fill="#f59e0b" font-family="monospace" font-size="14">NOTE: FOUNDATION RAFT BEAM 16mm TMT; 9" VIBRATED SANDCRETE WALLS</text>
      </svg>`;
    } else if (sampleType === "boq_schedule") {
      sampleFilename = "Bill-of-Quantities-Superstructure.png";
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600" fill="#ffffff">
        <rect width="900" height="600" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>
        <text x="50" y="50" fill="#0f172a" font-family="sans-serif" font-size="20" font-weight="bold">BILL OF QUANTITIES (BOQ) — MATERIAL SCHEDULE</text>
        <text x="50" y="80" fill="#64748b" font-family="sans-serif" font-size="14">PROJECT: 2-STOREY DUPLEX • SUBSTRUCTURE &amp; REINFORCED CONCRETE</text>
        <rect x="50" y="110" width="800" height="40" fill="#f1f5f9"/>
        <text x="60" y="135" fill="#0f172a" font-weight="bold">ITEM | DESCRIPTION | QUANTITY | UNIT | RATE (NGN) | TOTAL</text>
        <text x="60" y="180" fill="#334155">1. Portland Cement (Dangote 42.5R) | 450 | Bags | ₦8,000 | ₦3,600,000</text>
        <text x="60" y="220" fill="#334155">2. High-Yield 16mm Ribbed TMT Steel | 160 | Lengths | ₦13,800 | ₦2,208,000</text>
        <text x="60" y="260" fill="#334155">3. High-Yield 12mm Ribbed TMT Steel | 220 | Lengths | ₦8,500 | ₦1,870,000</text>
        <text x="60" y="300" fill="#334155">4. 9-Inch Vibrated Sandcrete Blocks | 3,800 | Pieces | ₦800 | ₦3,040,000</text>
        <text x="60" y="340" fill="#334155">5. Sharp River Sand (20-ton tipper) | 4 | Trips | ₦135,000 | ₦540,000</text>
        <text x="60" y="380" fill="#334155">6. 3/4-Inch Blue Granite (20-ton tipper) | 4 | Trips | ₦275,000 | ₦1,100,000</text>
      </svg>`;
    } else {
      sampleFilename = "Site-Excavation-Foundation-Inspection.png";
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600" fill="#1e293b">
        <rect width="900" height="600" fill="#334155"/>
        <text x="50" y="60" fill="#f8fafc" font-size="22" font-weight="bold">SITE INSPECTION PHOTOGRAPH: FOUNDATION TRENCH TENSION GRIDS</text>
        <text x="50" y="90" fill="#cbd5e1" font-size="14">LOCATION: AJAH CORRIDOR, LAGOS • ALLUVIAL SAND SUBGRADE WITH WATERLOGGING</text>
        <rect x="100" y="150" width="700" height="350" fill="#475569" stroke="#94a3b8" stroke-dasharray="8 8"/>
        <text x="180" y="320" fill="#fde047" font-size="20">VISUAL INSPECTION: 16mm REBAR RAFT MAT WITH 50mm COVER BLOCKS</text>
        <text x="180" y="360" fill="#ffffff" font-size="14">STATUS: READY FOR CONCRETE POUR (GRADE 25 N/mm² SPECIFIED)</text>
      </svg>`;
    }

    const base64Uri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`;
    const blob = await (await fetch(base64Uri)).blob();
    const testFile = new File([blob], sampleFilename, { type: "image/png" });
    await handleFileSelect(testFile);
  };

  // Chat message submit handler
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentDoc || isAsking) return;

    const userText = chatInput.trim();
    setChatInput("");
    setIsAsking(true);

    const tempUserMsg: DocumentChatMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: userText,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await fetch(`/api/documents/${currentDoc.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, sessionId })
      });

      if (!res.ok) {
        throw new Error("Chat failed.");
      }

      const data = await res.json();
      setChatMessages(prev => [...prev, data.assistantMessage]);
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: "I encountered a disruption processing your question. Please try asking again.",
          timestamp: new Date().toISOString(),
          evidenceLevel: "UNKNOWN"
        }
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  // Helper badge renderer for the 4 levels of information
  const renderEvidenceBadge = (level?: string) => {
    switch (level) {
      case "EXPLICIT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3 h-3 text-emerald-600" />
            EXPLICIT
          </span>
        );
      case "CALCULATED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
            <Calculator className="w-3 h-3 text-blue-600" />
            CALCULATED
          </span>
        );
      case "ESTIMATED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
            <Compass className="w-3 h-3 text-amber-600" />
            ESTIMATED
          </span>
        );
      case "MARKET-BASED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
            <DollarSign className="w-3 h-3 text-purple-600" />
            MARKET-BASED
          </span>
        );
      case "UNKNOWN":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
            <HelpCircle className="w-3 h-3 text-slate-400" />
            UNKNOWN
          </span>
        );
    }
  };

  const analysis = currentDoc?.analysis;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-[#ae2424]/10 selection:text-[#ae2424]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#ae2424] px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Search</span>
            </button>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight text-[#ae2424]">SHUREFIRE</span>
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-white">
                Document Intelligence
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentDoc && (
              <button
                onClick={() => {
                  setCurrentDoc(null);
                  setFilePreviewUrl(null);
                  setChatMessages([]);
                }}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Upload Another Document
              </button>
            )}
            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="w-8 h-8 rounded-full bg-[#ae2424] text-white flex items-center justify-center font-bold text-xs shadow-xs hover:bg-[#931f1f] cursor-pointer"
                title="Admin Portal"
              >
                RB
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {!currentDoc ? (
          /* ===================================================================== */
          /* 1. UPLOAD & LANDING STATE                                             */
          /* ===================================================================== */
          <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full py-8 text-center space-y-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ae2424]/10 text-[#ae2424] text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Multimodal Architectural &amp; Engineering Plan Reader</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
                Understand Your Building Plan, BOQ, or Construction Document
              </h1>
              <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
                Upload architectural drawings, structural layouts, bills of quantities, or site inspection photos.
                Shurefire extracts verified dimensions, checks missing engineering specs, and prepares preliminary material takeoffs.
              </p>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              className={`w-full max-w-2xl p-8 sm:p-12 border-2 border-dashed rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 bg-white shadow-xs ${
                isDragging
                  ? "border-[#ae2424] bg-[#ae2424]/5 ring-4 ring-[#ae2424]/10 scale-[1.01]"
                  : "border-slate-300 hover:border-[#ae2424]/60 hover:bg-slate-50/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div className="w-16 h-16 rounded-2xl bg-[#ae2424]/10 text-[#ae2424] flex items-center justify-center shadow-inner">
                <Upload className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <p className="text-base sm:text-lg font-bold text-slate-800">
                  Click to select drawing or drag and drop here
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  Supported formats: PDF • PNG • JPG / JPEG • WebP (Max 20MB)
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                  Architectural Plans
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                  Structural Schedules
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                  BOQ / Quotations
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                  Site Photos
                </span>
              </div>
            </div>

            {/* Error Banner */}
            {uploadError && (
              <div className="w-full max-w-2xl p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium flex items-start gap-3 text-left">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">{uploadError}</div>
                <button
                  onClick={() => setUploadError(null)}
                  className="text-rose-500 hover:text-rose-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Live Progress Bar during analysis */}
            {isProcessing && (
              <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-[#ae2424] animate-spin" />
                    <span>{processingStage}</span>
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-[#ae2424] h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] text-slate-500 text-center font-medium">
                  <div className={progressPercent >= 25 ? "text-slate-900 font-bold" : ""}>1. Uploading</div>
                  <div className={progressPercent >= 50 ? "text-slate-900 font-bold" : ""}>2. Vision OCR</div>
                  <div className={progressPercent >= 75 ? "text-slate-900 font-bold" : ""}>3. Structuring</div>
                  <div className={progressPercent >= 95 ? "text-slate-900 font-bold" : ""}>4. Costing &amp; BOQ</div>
                </div>
              </div>
            )}

            {/* 1-Click Sample Previews for instant evaluation */}
            <div className="w-full max-w-2xl pt-4 border-t border-slate-200">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Or test instantly with pre-loaded Nigerian construction samples:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleLoadSample("2bed_plan")}
                  disabled={isProcessing}
                  className="p-3 text-left bg-white border border-slate-200 hover:border-[#ae2424] hover:shadow-xs rounded-xl transition-all cursor-pointer group"
                >
                  <div className="text-xs font-bold text-slate-800 group-hover:text-[#ae2424] flex items-center justify-between">
                    <span>2-Bed Flat Plan</span>
                    <Building className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#ae2424]" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Architectural layout with room dimensions &amp; raft foundation notes.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleLoadSample("boq_schedule")}
                  disabled={isProcessing}
                  className="p-3 text-left bg-white border border-slate-200 hover:border-[#ae2424] hover:shadow-xs rounded-xl transition-all cursor-pointer group"
                >
                  <div className="text-xs font-bold text-slate-800 group-hover:text-[#ae2424] flex items-center justify-between">
                    <span>Duplex BOQ Table</span>
                    <FileCheck className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#ae2424]" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Quantities and rates for cement, rebar, vibrated blocks, sand &amp; granite.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleLoadSample("site_photo")}
                  disabled={isProcessing}
                  className="p-3 text-left bg-white border border-slate-200 hover:border-[#ae2424] hover:shadow-xs rounded-xl transition-all cursor-pointer group"
                >
                  <div className="text-xs font-bold text-slate-800 group-hover:text-[#ae2424] flex items-center justify-between">
                    <span>Site Foundation Photo</span>
                    <Layers className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#ae2424]" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Visual inspection of excavation, tension rebar grid &amp; cover blocks.
                  </p>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ===================================================================== */
          /* 2. ANALYZED DOCUMENT WORKSPACE                                        */
          /* ===================================================================== */
          <div className="flex-1 flex flex-col space-y-6">
            {/* Header Document Summary Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#ae2424]" />
                  <h2 className="text-lg font-bold text-slate-900">{currentDoc.filename}</h2>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Analysis Verified
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {analysis?.document_overview.project_type} • {analysis?.document_overview.approximate_floor_area} • Location: {analysis?.document_overview.location}
                </p>
              </div>

              {/* Four Trust Levels Legend */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Trust Levels:</span>
                {renderEvidenceBadge("EXPLICIT")}
                {renderEvidenceBadge("CALCULATED")}
                {renderEvidenceBadge("ESTIMATED")}
                {renderEvidenceBadge("UNKNOWN")}
              </div>
            </div>

            {/* Navigation Tabs for 10 Analysis Sections */}
            <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "overview"
                    ? "bg-[#ae2424] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                1. Overview &amp; Meta
              </button>
              <button
                onClick={() => setActiveTab("found")}
                className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "found"
                    ? "bg-[#ae2424] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                2. What I Found ({analysis?.what_i_found.rooms.length || 0} Rooms)
              </button>
              <button
                onClick={() => setActiveTab("components")}
                className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "components"
                    ? "bg-[#ae2424] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                3. Components (14 Stages)
              </button>
              <button
                onClick={() => setActiveTab("materials")}
                className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "materials"
                    ? "bg-[#ae2424] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                4. Material Requirements
              </button>
              <button
                onClick={() => setActiveTab("estimates")}
                className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "estimates"
                    ? "bg-[#ae2424] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                5. Calculated Takeoffs
              </button>
              <button
                onClick={() => setActiveTab("missing")}
                className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "missing"
                    ? "bg-[#ae2424] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                6. Missing Specs ({analysis?.missing_information.missing_critical_items.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("verify")}
                className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "verify"
                    ? "bg-[#ae2424] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                7. Verification &amp; Advice
              </button>
              <button
                onClick={() => setActiveTab("cost")}
                className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "cost"
                    ? "bg-[#ae2424] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                8. Preliminary Costing
              </button>
            </div>

            {/* Grid Workspace: Left Analysis Views + Right Live Interactive Chat */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
              {/* Left Column: Structured Analysis Panes (8 Cols) */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                {/* TAB 1: DOCUMENT OVERVIEW */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800">
                          Section 1: Document Overview
                        </h3>
                        <span className="text-xs text-slate-500 font-medium">
                          Preserved Drawing Metadata
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Document Type</span>
                          <p className="text-sm font-bold text-slate-900 mt-0.5">{analysis?.document_overview.document_type}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Project Type</span>
                          <p className="text-sm font-bold text-slate-900 mt-0.5">{analysis?.document_overview.project_type}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Building Classification</span>
                          <p className="text-sm font-bold text-slate-900 mt-0.5">{analysis?.document_overview.building_type}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Number of Floors</span>
                          <p className="text-sm font-bold text-slate-900 mt-0.5">{String(analysis?.document_overview.number_of_floors)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bedrooms / Units</span>
                          <p className="text-sm font-bold text-slate-900 mt-0.5">
                            {String(analysis?.document_overview.number_of_bedrooms)} Beds • {String(analysis?.document_overview.number_of_units)} Units
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estimated Floor Area</span>
                          <p className="text-sm font-bold text-slate-900 mt-0.5">{analysis?.document_overview.approximate_floor_area}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Drawing Title / Sheet #</span>
                          <p className="text-sm font-bold text-slate-900 mt-0.5">
                            {analysis?.document_overview.drawing_title} ({analysis?.document_overview.drawing_number})
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Revision &amp; Date</span>
                          <p className="text-sm font-bold text-slate-900 mt-0.5">
                            Rev {analysis?.document_overview.revision} • {analysis?.document_overview.date}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Architect / Engineer</span>
                          <p className="text-sm font-bold text-slate-900 mt-0.5">{analysis?.document_overview.architect_or_engineer}</p>
                        </div>
                      </div>
                    </div>

                    {/* Document Image / PDF Preview container */}
                    {filePreviewUrl && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                            <Eye className="w-4 h-4 text-[#ae2424]" />
                            <span>Uploaded Document Preview</span>
                          </h4>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {(currentDoc.fileSize / 1024).toFixed(1)} KB • {currentDoc.mimeType}
                          </span>
                        </div>
                        <div className="max-h-96 overflow-auto rounded-xl border border-slate-200 bg-slate-950 flex items-center justify-center p-2">
                          {currentDoc.mimeType.includes("image") ? (
                            <img
                              src={filePreviewUrl}
                              alt="Uploaded Document"
                              className="max-h-80 w-auto object-contain rounded"
                            />
                          ) : (
                            <div className="text-white text-xs p-8 text-center space-y-2">
                              <FileText className="w-12 h-12 mx-auto text-slate-400" />
                              <p className="font-semibold">{currentDoc.filename}</p>
                              <p className="text-slate-400 text-[11px]">PDF Document rendering active in viewer</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: WHAT I FOUND */}
                {activeTab === "found" && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800">
                          Section 2: Visible Document Information
                        </h3>
                        <div className="flex items-center gap-2">
                          {renderEvidenceBadge("EXPLICIT")}
                        </div>
                      </div>

                      {/* Rooms Schedule Table */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Extracted Rooms &amp; Spaces
                        </h4>
                        {analysis?.what_i_found.rooms && analysis.what_i_found.rooms.length > 0 ? (
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                                <tr>
                                  <th className="p-3">Room / Space</th>
                                  <th className="p-3">Dimensions</th>
                                  <th className="p-3">Area</th>
                                  <th className="p-3">Notes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium">
                                {analysis.what_i_found.rooms.map((rm, i) => (
                                  <tr key={i} className="hover:bg-slate-50/70">
                                    <td className="p-3 font-bold text-slate-900">{rm.name}</td>
                                    <td className="p-3 font-mono text-slate-700">{rm.dimensions || "Not specified"}</td>
                                    <td className="p-3 font-mono text-slate-700">{rm.area || "Not specified"}</td>
                                    <td className="p-3 text-slate-500">{rm.notes || "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg">
                            No discrete room schedules identified in current view.
                          </p>
                        )}
                      </div>

                      {/* Structural Elements Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                          <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-[#ae2424]" />
                            <span>Columns, Beams &amp; Foundation</span>
                          </h5>
                          <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                            {analysis?.what_i_found.structural_elements.foundation?.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                            {analysis?.what_i_found.structural_elements.columns?.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                            {analysis?.what_i_found.structural_elements.beams?.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                            {(!analysis?.what_i_found.structural_elements.foundation?.length &&
                              !analysis?.what_i_found.structural_elements.columns?.length) && (
                              <li className="list-none text-slate-400 italic">No structural sizing notes detected.</li>
                            )}
                          </ul>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                          <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-[#ae2424]" />
                            <span>Wall Types &amp; Openings</span>
                          </h5>
                          <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                            {analysis?.what_i_found.wall_types?.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                            {analysis?.what_i_found.doors?.map((d, i) => (
                              <li key={i}>Door {d.tag || ""}: {d.dimensions || d.type || "Standard"}</li>
                            ))}
                            {analysis?.what_i_found.windows?.map((w, i) => (
                              <li key={i}>Window {w.tag || ""}: {w.dimensions || w.type || "Standard"}</li>
                            ))}
                            {(!analysis?.what_i_found.wall_types?.length &&
                              !analysis?.what_i_found.doors?.length) && (
                              <li className="list-none text-slate-400 italic">No discrete door/window schedule text.</li>
                            )}
                          </ul>
                        </div>
                      </div>

                      {/* General Drawing Notes */}
                      {analysis?.what_i_found.general_notes && analysis.what_i_found.general_notes.length > 0 && (
                        <div className="pt-2 space-y-1">
                          <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Drawing Notes &amp; Specifications
                          </h5>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                            {analysis.what_i_found.general_notes.map((note, i) => (
                              <p key={i} className="leading-relaxed">• {note}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: 14 CONSTRUCTION COMPONENTS */}
                {activeTab === "components" && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800">
                          Section 3: Construction Components (14 Stages)
                        </h3>
                        <p className="text-xs text-slate-500">
                          Categorized lifecycle analysis from site prep through finishing
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {analysis?.construction_components.map((comp) => (
                        <div
                          key={comp.category_id}
                          className={`p-4 rounded-xl border transition-all ${
                            comp.present
                              ? "bg-white border-slate-200 shadow-2xs hover:border-[#ae2424]/40"
                              : "bg-slate-50/70 border-slate-200/60 opacity-80"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-bold text-xs text-slate-900 flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-mono">
                                {comp.category_id}
                              </span>
                              <span>{comp.category_name}</span>
                            </span>
                            {renderEvidenceBadge(comp.evidence_level)}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{comp.details}</p>
                          {comp.key_items && comp.key_items.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {comp.key_items.map((it, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded"
                                >
                                  {it}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 4: MATERIAL REQUIREMENTS (Structured Table) */}
                {activeTab === "materials" && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800">
                          Section 4: Material Requirements Schedule
                        </h3>
                        <p className="text-xs text-slate-500">
                          Quantities explicitly cited in drawing or schedules
                        </p>
                      </div>
                    </div>

                    {analysis?.material_requirements && analysis.material_requirements.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="p-3">Category</th>
                              <th className="p-3">Material</th>
                              <th className="p-3">Document Qty</th>
                              <th className="p-3">Unit</th>
                              <th className="p-3">Source &amp; Confidence</th>
                              <th className="p-3">Trust Level</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {analysis.material_requirements.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/70">
                                <td className="p-3 font-semibold text-slate-600">{item.category}</td>
                                <td className="p-3 font-bold text-slate-900">{item.material}</td>
                                <td className="p-3 font-mono font-bold text-slate-900">
                                  {item.document_quantity || "Not specified"}
                                </td>
                                <td className="p-3 font-mono text-slate-600">{item.unit || "—"}</td>
                                <td className="p-3 text-slate-600">
                                  <div className="flex items-center gap-1.5">
                                    <span>{item.source}</span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                                      {item.confidence}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3">{renderEvidenceBadge(item.evidence_level)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-6 text-center bg-slate-50 rounded-xl space-y-2">
                        <Info className="w-6 h-6 text-slate-400 mx-auto" />
                        <p className="text-xs text-slate-600 font-semibold">
                          No explicit material quantities stated in this sheet.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Inspect the "Calculated Takeoffs" tab to review dimensions mathematically derived from plan geometry.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: ESTIMATED REQUIREMENTS & CALCULATED TAKEOFFS */}
                {activeTab === "estimates" && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800">
                            Section 5: Mathematically Derived &amp; Inferred Estimates
                          </h3>
                          <p className="text-xs text-slate-500">
                            Distinguishing strict mathematical calculations from construction heuristics
                          </p>
                        </div>
                      </div>

                      {/* Calculated Items */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {renderEvidenceBadge("CALCULATED")}
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Derived from Verified Plan Dimensions
                          </h4>
                        </div>

                        {analysis?.estimated_requirements.calculated_items && analysis.estimated_requirements.calculated_items.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {analysis.estimated_requirements.calculated_items.map((calc, i) => (
                              <div key={i} className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-slate-900">{calc.item}</span>
                                  <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                                    {calc.calculated_value}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 font-mono bg-white p-2 rounded border border-blue-100">
                                  Formula: {calc.derivation_formula}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg">
                            No dimensional calculations feasible from visible sheet values.
                          </p>
                        )}
                      </div>

                      {/* Inferred Engineering Estimates */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          {renderEvidenceBadge("ESTIMATED")}
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Inferred using Nigerian Construction Norms
                          </h4>
                        </div>

                        {analysis?.estimated_requirements.inferred_estimates && analysis.estimated_requirements.inferred_estimates.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {analysis.estimated_requirements.inferred_estimates.map((est, i) => (
                              <div key={i} className="p-4 rounded-xl border border-amber-100 bg-amber-50/30 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-slate-900">{est.item}</span>
                                  <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded">
                                    {est.estimated_value}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-amber-100">
                                  Assumption: {est.assumptions}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg">
                            No inferred estimate requirements available.
                          </p>
                        )}
                      </div>

                      {analysis?.estimated_requirements.insufficient_information_notice && (
                        <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-700 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>{analysis.estimated_requirements.insufficient_information_notice}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 6: MISSING INFORMATION */}
                {activeTab === "missing" && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-sm uppercase tracking-wider text-rose-700 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          <span>Section 6: Missing Critical Information</span>
                        </h3>
                        <p className="text-xs text-slate-500">
                          Items absent from document required to prepare a reliable construction BOQ
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {analysis?.missing_information.impact_assessment}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {analysis?.missing_information.missing_critical_items.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl border border-rose-100 bg-rose-50/40 text-xs font-semibold text-rose-900 flex items-start gap-2.5"
                          >
                            <span className="w-4 h-4 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                              !
                            </span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 7: POTENTIAL ISSUES & RECOMMENDATIONS */}
                {activeTab === "verify" && (
                  <div className="space-y-6">
                    {/* Verification Items */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800">
                          Section 7: Items to Verify
                        </h3>
                        <span className="text-xs text-slate-500">Professional Review Checklist</span>
                      </div>

                      <div className="space-y-3">
                        {analysis?.potential_issues_to_verify.verification_items &&
                        analysis.potential_issues_to_verify.verification_items.length > 0 ? (
                          analysis.potential_issues_to_verify.verification_items.map((item, i) => (
                            <div
                              key={i}
                              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900">{item.issue}</span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                    item.risk_level === "HIGH"
                                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                                      : item.risk_level === "MEDIUM"
                                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                                      : "bg-slate-200 text-slate-700"
                                  }`}
                                >
                                  {item.risk_level}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600">{item.recommendation}</p>
                              {item.location_in_doc && (
                                <p className="text-[11px] text-slate-400 font-mono">Location: {item.location_in_doc}</p>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg">
                            No critical geometry or dimension conflicts detected in visible sheet.
                          </p>
                        )}
                      </div>

                      {/* Required Professional Disclaimer */}
                      <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                        <Shield className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                          <strong className="font-bold">Required Notice:</strong>{" "}
                          {analysis?.potential_issues_to_verify.disclaimer}
                        </p>
                      </div>
                    </div>

                    {/* Section 8: Construction Recommendations */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                      <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3">
                        Section 8: Construction Recommendations
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <FileCheck className="w-4 h-4 text-emerald-600" />
                            <span>Document-Derived Recommendations</span>
                          </h4>
                          <div className="space-y-1.5">
                            {analysis?.construction_recommendations.document_derived_recommendations.map((rec, i) => (
                              <p key={i} className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                • {rec}
                              </p>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-[#ae2424]" />
                            <span>General Construction Guidance</span>
                          </h4>
                          <div className="space-y-1.5">
                            {analysis?.construction_recommendations.general_construction_guidance.map((guide, i) => (
                              <p key={i} className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                • {guide}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 8: PRELIMINARY BUILDING COST ANALYSIS */}
                {activeTab === "cost" && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800">
                          Section 9: Preliminary Building Cost Analysis
                        </h3>
                        <p className="text-xs text-slate-500">
                          Preliminary budget estimation grounded in verified dimensions and Shurefire Sovereign Rates
                        </p>
                      </div>
                      {renderEvidenceBadge(analysis?.building_cost_analysis.cost_status)}
                    </div>

                    {analysis?.building_cost_analysis.preliminary_budget_band ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Substructure</span>
                            <p className="text-base font-extrabold text-slate-900 mt-1">
                              {analysis.building_cost_analysis.preliminary_budget_band.substructure_ngn || "₦—"}
                            </p>
                            <span className="text-[10px] text-slate-400">Foundation &amp; DPC</span>
                          </div>
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Superstructure</span>
                            <p className="text-base font-extrabold text-slate-900 mt-1">
                              {analysis.building_cost_analysis.preliminary_budget_band.superstructure_ngn || "₦—"}
                            </p>
                            <span className="text-[10px] text-slate-400">Walls, Lintels &amp; Roof</span>
                          </div>
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Finishes &amp; MEP</span>
                            <p className="text-base font-extrabold text-slate-900 mt-1">
                              {analysis.building_cost_analysis.preliminary_budget_band.finishes_ngn || "₦—"}
                            </p>
                            <span className="text-[10px] text-slate-400">Plaster, Tiles &amp; Piping</span>
                          </div>
                          <div className="p-4 rounded-xl bg-[#ae2424]/5 border border-[#ae2424]/20">
                            <span className="text-[11px] font-bold text-[#ae2424] uppercase tracking-wider">Estimated Grand Total</span>
                            <p className="text-lg font-black text-[#ae2424] mt-1">
                              {analysis.building_cost_analysis.preliminary_budget_band.estimated_grand_total_ngn || "₦—"}
                            </p>
                            <span className="text-[10px] text-slate-500 font-medium">Preliminary Budget Band</span>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                          <p className="font-semibold text-slate-800">
                            Basis of Estimate: {analysis.building_cost_analysis.preliminary_budget_band.basis_of_estimate}
                          </p>
                          <p className="text-slate-500">
                            Pricing Source: {analysis.building_cost_analysis.preliminary_budget_band.pricing_source}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 text-center bg-slate-50 rounded-xl space-y-2">
                        <Info className="w-6 h-6 text-slate-400 mx-auto" />
                        <p className="text-xs text-slate-700 font-bold">
                          Total construction budget not automatically generated.
                        </p>
                        <p className="text-xs text-slate-500 max-w-lg mx-auto">
                          {analysis?.building_cost_analysis.analysis_notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: SECTION 10: Persistent Interactive Document Chat (4 or 5 Cols) */}
              <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[700px] sticky top-24">
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#ae2424]" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                      Ask About This Document
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Grounded
                  </span>
                </div>

                {/* Suggested Question Pills */}
                <div className="p-3 border-b border-slate-100 bg-slate-50/70 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5">
                  {[
                    "How much cement will I need?",
                    "Estimate cost in Lagos",
                    "What materials to buy first?",
                    "Create preliminary BOQ",
                    "What info is missing?",
                    "How much reinforcement rebar?"
                  ].map((pill, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setChatInput(pill)}
                      className="px-2.5 py-1 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer shrink-0"
                    >
                      {pill}
                    </button>
                  ))}
                </div>

                {/* Chat Messages Log */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed space-y-1.5 shadow-2xs ${
                          msg.role === "user"
                            ? "bg-[#ae2424] text-white rounded-br-xs"
                            : "bg-slate-100 text-slate-900 rounded-bl-xs border border-slate-200/60"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>

                        {/* Grounding metadata for assistant messages */}
                        {msg.role === "assistant" && msg.evidenceLevel && (
                          <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between gap-2 text-[10px] text-slate-500">
                            <span className="font-mono">
                              Source: {msg.groundingSources?.join(", ") || currentDoc.filename}
                            </span>
                            {renderEvidenceBadge(msg.evidenceLevel)}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}

                  {isAsking && (
                    <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-2xl text-xs text-slate-600 max-w-[80%] animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#ae2424]" />
                      <span>Checking drawing dimensions &amp; Shurefire market rates...</span>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Chat Input Bar */}
                <form onSubmit={handleChatSubmit} className="p-3 border-t border-slate-200 bg-white">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask about dimensions, materials, costs, or BOQ..."
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#ae2424] focus:ring-1 focus:ring-[#ae2424] rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || isAsking}
                      className="absolute right-1.5 p-1.5 bg-[#ae2424] hover:bg-[#931f1f] disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
                      title="Send message"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
