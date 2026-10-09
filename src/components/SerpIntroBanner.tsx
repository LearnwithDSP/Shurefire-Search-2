import React, { useState, useEffect } from "react";
import { X, Database, Sparkles, Layers } from "lucide-react";

export interface SerpIntroBannerProps {
  /** Optional class name to attach to the outer container */
  className?: string;
  /** Force visibility control from parent (if provided, overrides internal state) */
  isOpen?: boolean;
  /** Callback fired when user dismisses the banner */
  onDismiss?: () => void;
  /** Storage key to remember user dismissal. Defaults to "shurefire_serp_intro_dismissed" */
  storageKey?: string;
}

/**
 * Sovereign Construction Intelligence - SerpIntroBanner
 * 
 * Ultra-clean, compact, mature introductory banner component for the top
 * of the Shurefire Search Engine Results Page (SERP).
 * Explains engine architecture to new visitors in a high-level, human-readable way.
 */
export const SerpIntroBanner: React.FC<SerpIntroBannerProps> = ({
  className = "",
  isOpen,
  onDismiss,
  storageKey = "shurefire_serp_intro_dismissed"
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  });

  // Keep internal dismissal in sync with storage
  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // Ignore storage errors in restricted iframe environments
    }
    if (onDismiss) {
      onDismiss();
    }
  };

  // If controlled by parent prop isOpen, respect that; otherwise check isDismissed
  const visible = isOpen !== undefined ? isOpen : !isDismissed;

  if (!visible) {
    return null;
  }

  return (
    <aside
      aria-label="Engine Architecture Overview"
      className={`relative bg-[#ffffff] border border-[#e2e8f0] rounded-xl shadow-xs transition-all mb-5 overflow-hidden ${className}`}
    >
      {/* Subtle top accent rule in Shurefire red */}
      <div className="h-0.5 w-full bg-[#ae2424]" />

      <div className="px-4 py-3 sm:px-5 sm:py-3.5">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#e2e8f0]/80">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full bg-[#ae2424] shrink-0"
              aria-hidden="true"
            />
            <h2 className="text-xs sm:text-sm font-bold tracking-tight text-[#0f172a] uppercase">
              Sovereign Construction Intelligence
            </h2>
            <span className="hidden sm:inline-block text-[11px] text-[#64748b]">
              · Architectural Overview
            </span>
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss introductory banner"
            title="Dismiss this overview"
            className="p-1 rounded-md text-[#64748b] hover:text-[#0f172a] hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3 Short Pillars in Compact 3-Column Micro-Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 text-left">
          {/* Pillar 1: Verified Market Index */}
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 p-1 rounded-md bg-[#ae2424]/10 text-[#ae2424] shrink-0">
              <Database className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-semibold text-[#ae2424]">01</span>
                <h3 className="text-xs font-bold text-[#0f172a]">
                  Verified Market Index
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-[#64748b] leading-relaxed">
                Crawls live regional supplier price sheets, material spec sheets, and procurement standards.
              </p>
            </div>
          </div>

          {/* Pillar 2: Real-Time AI Synthesis */}
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 p-1 rounded-md bg-[#ae2424]/10 text-[#ae2424] shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-semibold text-[#ae2424]">02</span>
                <h3 className="text-xs font-bold text-[#0f172a]">
                  Real-Time AI Synthesis
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-[#64748b] leading-relaxed">
                Verified construction entries are synthesized into structured, highly readable reports instead of raw web links.
              </p>
            </div>
          </div>

          {/* Pillar 3: Deep Technical Context */}
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 p-1 rounded-md bg-[#ae2424]/10 text-[#ae2424] shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-semibold text-[#ae2424]">03</span>
                <h3 className="text-xs font-bold text-[#0f172a]">
                  Deep Technical Context
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-[#64748b] leading-relaxed">
                Search everything—from material prices and structural specifications to procurement timelines and compliance standards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default SerpIntroBanner;
