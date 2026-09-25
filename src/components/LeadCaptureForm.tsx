import React, { useState } from "react";
import { db, handleFirestoreError, OperationType } from "../firebase.js";
import { doc, setDoc } from "firebase/firestore";
import { 
  CheckCircle2, 
  Send, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Sparkles, 
  ShieldCheck, 
  NotebookPen,
  Clock,
  ExternalLink,
  ChevronRight
} from "lucide-react";

interface LeadCaptureFormProps {
  initialMaterials?: string;
  initialCategory?: string;
  initialRegion?: string;
  sourceContext?: string;
}

export function LeadCaptureForm({ 
  initialMaterials = "", 
  initialCategory = "", 
  initialRegion = "", 
  sourceContext = "Core Search Section" 
}: LeadCaptureFormProps) {
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState(initialRegion || "Lagos");
  const [category, setCategory] = useState(initialCategory || "Cement & Binders");
  const [materialsNeeded, setMaterialsNeeded] = useState(initialMaterials || "");
  const [projectStage, setProjectStage] = useState("planning");
  const [timeline, setTimeline] = useState("immediate");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setErrorMsg("Please provide your Name and WhatsApp phone number.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const cleanTime = Date.now();
    const cleanRand = Math.random().toString(36).substring(2, 9);
    const leadId = `ld_${cleanTime}_${cleanRand}`;

    const payload = {
      id: leadId,
      name: name.trim().substring(0, 150),
      phone: phone.trim().substring(0, 50),
      email: email.trim() ? email.trim().substring(0, 150) : "no-email@shurefire.com",
      category: category || "General Sourcing",
      region: region || "Lagos",
      materialsNeeded: (materialsNeeded.trim() || `Sourcing query: ${category}`).substring(0, 3000),
      projectStage: projectStage || "planning",
      timeline: timeline || "immediate",
      source: sourceContext.substring(0, 400),
      status: "new",
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "leads", leadId), payload);
      setIsSuccess(true);
      console.log(`[Shurefire Network Sourcing Engine] Successfully logged Lead: ${leadId}`);
    } catch (err) {
      console.error("[Shurefire Network Sourcing Engine] Failed to dispatch sourcing document: ", err);
      try {
        handleFirestoreError(err, OperationType.CREATE, `leads/${leadId}`);
      } catch (formattedErr: any) {
        setErrorMsg("Sourcing server timed out. Please retry or contact direct partner desk.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 shadow-lg shadow-slate-100 rounded-3xl overflow-hidden" id="verified_sourcing_widget">
      
      {/* Premium Crimson Header */}
      <div className="bg-slate-50/70 p-5 sm:p-6 text-slate-900 flex items-center justify-between gap-4 select-none border-b border-slate-150">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#B91C1C]/10 rounded-xl text-[#B91C1C] border border-[#B91C1C]/20">
            <Sparkles className="h-5 w-5 animate-pulse-subtle" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-[#B91C1C] uppercase tracking-widest block font-mono">Nigeria Wholesalers Initiative</span>
            <h3 className="text-base font-sans font-bold tracking-tight text-slate-900">Direct Factory-Price Match</h3>
          </div>
        </div>
        
        <span className="text-[10px] font-extrabold uppercase tracking-widest bg-[#B91C1C] text-white px-2.5 py-1 rounded">
          Save 15-22%
        </span>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        
        <p className="text-xs text-slate-500 leading-relaxed font-normal">
          This system is integrated with the sovereign <strong className="text-slate-800 font-bold">SHUREFIRE Wholesale Directory</strong> representing certified block makers, steel yards, and importers in Nigeria. By submitting your specs below, you bypass middleman markup and get matched with verified depot desks for direct delivery.
        </p>

        {isSuccess ? (
          <div className="space-y-5 py-4 text-center animate-fade-in">
            <div className="mx-auto h-12 w-12 rounded-full bg-[#B91C1C]/10 text-[#B91C1C] flex items-center justify-center border border-[#B91C1C]/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            
            <div className="space-y-2">
              <h4 className="text-base font-sans font-bold text-slate-900">RFQ Logged in Supplier Network!</h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Your materials requirement has been loaded directly into the SHUREFIRE Wholesaler network. A registered merchant matching your selection in <strong className="text-slate-900 font-semibold">{region}</strong> will contact you via <strong className="text-slate-900 font-semibold">WhatsApp ({phone})</strong> to deliver off-market wholesale cash pricing.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-600 text-xs text-left max-w-md mx-auto space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-[#B91C1C]" />
                <span>Verify Wholesaler Directory Direct:</span>
              </div>
              <p className="leading-normal text-slate-500">
                Don't want to wait? You can search validated merchant rosters, dial wholesale desks, or get instant assistance on the SHUREFIRE central terminal.
              </p>
              
              <a 
                href="http://shurefire.com.ng" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B91C1C] hover:text-red-700 mt-1 hover:underline group"
              >
                <span>Visit SHUREFIRE Sourcing Gateway</span>
                <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>

            <button
              onClick={() => setIsSuccess(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 underline cursor-pointer"
            >
              Submit Another Quote Request
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Your Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Your Name</label>
                <div className="relative flex items-center">
                  <User className="absolute left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kolawole Alabi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-450 focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/30 text-xs font-medium focus:border-[#B91C1C]"
                  />
                </div>
              </div>

              {/* Active WhatsApp */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Active WhatsApp (Callback)</label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +234 803 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-450 focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/30 text-xs font-medium focus:border-[#B91C1C]"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Email Address (Optional)</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="e.g. kolawole@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-450 focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/30 text-xs font-medium focus:border-[#B91C1C]"
                  />
                </div>
              </div>

              {/* Location State */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Location State</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/30 text-xs font-medium focus:border-[#B91C1C] cursor-pointer"
                >
                  <option value="Lagos" className="bg-white">Lagos State Hub</option>
                  <option value="Abuja" className="bg-white">Abuja (Dei-Dei Hub)</option>
                  <option value="Port Harcourt" className="bg-white">Port Harcourt Hub</option>
                  <option value="Kano" className="bg-white">Kano (Sabon Gari Hub)</option>
                  <option value="Kaduna" className="bg-white">Kaduna Region</option>
                  <option value="Enugu" className="bg-white">Enugu Sourcing</option>
                  <option value="Ibadan" className="bg-white">Ibadan Logistics Hub</option>
                </select>
              </div>

              {/* Major Category */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Major Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/30 text-xs font-medium focus:border-[#B91C1C] cursor-pointer"
                >
                  <option value="Cement & Binders" className="bg-white">Cement & Ground Binders</option>
                  <option value="Steel & Rebars" className="bg-white">Reinforced Steel & Rebars</option>
                  <option value="Blocks & Aggregates" className="bg-white">Sand, Granite & Hollow Blocks</option>
                  <option value="Roofing & Ceiling" className="bg-white">Aluminium Slabs & Wood</option>
                  <option value="Tiles & Finishing" className="bg-white">Tiling Finishing & Plaster</option>
                  <option value="Electrical & Wiring" className="bg-white">Electrical Cables & Piping</option>
                  <option value="Plumbing & Sanitary" className="bg-white">Plumbing Conduit & Valves</option>
                </select>
              </div>

              {/* Project Stage */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Project Stage</label>
                <select
                  value={projectStage}
                  onChange={(e) => setProjectStage(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/30 text-xs font-medium focus:border-[#B91C1C] cursor-pointer"
                >
                  <option value="planning" className="bg-white">Initial Sourcing Analysis</option>
                  <option value="foundation" className="bg-white">Active Foundation stage</option>
                  <option value="decking" className="bg-white">Active Concrete Decking</option>
                  <option value="finishing" className="bg-white">Finishing and Plasterwork</option>
                </select>
              </div>

              {/* Procurement Timeline */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Procurement Timeline</label>
                <select
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/30 text-xs font-medium focus:border-[#B91C1C] cursor-pointer"
                >
                  <option value="immediate" className="bg-white">Immediate Sourcing (7 days)</option>
                  <option value="twoweeks" className="bg-white">Sourcing within 2 weeks</option>
                  <option value="month" className="bg-white">Sourcing within 1 month</option>
                  <option value="research" className="bg-white">Just researching rates</option>
                </select>
              </div>

              {/* Describe items */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Describe items & quantities (or paste bill of quantities)</label>
                <div className="relative flex items-start">
                  <NotebookPen className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <textarea
                    rows={3}
                    placeholder="e.g. I need 450 bags of Dangote Cement, 12 tons of 16mm rebar delivered directly to my block in Lekki Scheme 2..."
                    value={materialsNeeded}
                    onChange={(e) => setMaterialsNeeded(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-450 focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/30 text-xs font-medium focus:border-[#B91C1C] leading-relaxed"
                  />
                </div>
              </div>

            </div>

            {errorMsg && (
              <p className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs leading-normal font-medium flex items-center gap-1.5">
                <span>⚠️</span> {errorMsg}
              </p>
            )}

            {/* Submit RFQ Trigger */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#B91C1C] hover:bg-[#991B1B] py-3 text-white rounded-xl text-xs font-bold shadow-md shadow-red-900/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 select-none uppercase tracking-wider"
            >
              {isSubmitting ? (
                <>
                  <Clock className="h-4 w-4 animate-spin text-white" />
                  <span>Configuring Wholesale Match...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 text-white" />
                  <span>Request Cheap Wholesale Quotes</span>
                </>
              )}
            </button>

            {/* Direct outbound link */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-450" />
                <span>Zero spam, direct merchant lookup</span>
              </span>
              <a 
                href="http://shurefire.com.ng" 
                target="_blank" 
                rel="noreferrer"
                className="text-[#B91C1C] hover:text-red-700 hover:underline font-bold flex items-center gap-1 group"
              >
                <span>Or dial wholesalers on shurefire.com.ng</span>
                <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
