import React, { useState, useMemo } from "react";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Database,
  Sparkles,
  Filter,
  Copy,
  Check,
  RefreshCw,
  Plus
} from "lucide-react";
import type { KnowledgeRecord } from "./AdminDashboard";

export interface KnowledgeTableProps {
  records: KnowledgeRecord[];
  isLoading?: boolean;
  onViewRecord?: (record: KnowledgeRecord) => void;
  onDeleteRecord?: (id: string) => Promise<void> | void;
  onCrawlClick?: () => void;
  onAddClick?: () => void;
  onRefresh?: () => void;
  className?: string;
}

type SortField = "title" | "material_category" | "embedding" | "updatedAt";
type SortDirection = "asc" | "desc";

export const KnowledgeTable: React.FC<KnowledgeTableProps> = ({
  records,
  isLoading = false,
  onViewRecord,
  onDeleteRecord,
  onCrawlClick,
  onAddClick,
  onRefresh,
  className = ""
}) => {
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [embeddingFilter, setEmbeddingFilter] = useState<"All" | "Embedded" | "Pending">("All");

  // Sorting States
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // UI States
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Extract all unique categories present in records + standard categories
  const availableCategories = useMemo(() => {
    const standard = ["Cement", "Rebar & Steel", "Aggregates & Sand", "Roofing", "Procurement Standards"];
    const fromRecords = records.map(r => r.material_category).filter(Boolean);
    const combined = Array.from(new Set([...standard, ...fromRecords]));
    return combined.sort();
  }, [records]);

  // Counts for filters
  const counts = useMemo(() => {
    const embeddedCount = records.filter(r => r.has_embedding || r.embedding_dim === 768).length;
    const pendingCount = records.length - embeddedCount;
    return {
      total: records.length,
      embedded: embeddedCount,
      pending: pendingCount
    };
  }, [records]);

  // Handle Sort Change
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "title" || field === "material_category" ? "asc" : "desc");
    }
    setCurrentPage(1);
  };

  // Copy Record ID to clipboard
  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Delete wrapper with local loading state
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDeleteRecord) return;
    setDeletingId(id);
    try {
      await onDeleteRecord(id);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter and Sort Pipeline
  const filteredAndSortedRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // 1. Filter
    const filtered = records.filter(record => {
      // Category filter
      if (selectedCategory !== "All" && record.material_category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      // Embedding filter
      const isEmbedded = record.has_embedding || record.embedding_dim === 768;
      if (embeddingFilter === "Embedded" && !isEmbedded) return false;
      if (embeddingFilter === "Pending" && isEmbedded) return false;

      // Search text filter
      if (q) {
        const titleMatch = record.title?.toLowerCase().includes(q);
        const contentMatch = record.content?.toLowerCase().includes(q);
        const catMatch = record.material_category?.toLowerCase().includes(q);
        const urlMatch = record.url?.toLowerCase().includes(q);
        const idMatch = record.id?.toLowerCase().includes(q);
        if (!titleMatch && !contentMatch && !catMatch && !urlMatch && !idMatch) {
          return false;
        }
      }

      return true;
    });

    // 2. Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "title":
          comparison = (a.title || "").localeCompare(b.title || "");
          break;
        case "material_category":
          comparison = (a.material_category || "").localeCompare(b.material_category || "");
          break;
        case "embedding": {
          const aEmb = a.has_embedding || a.embedding_dim === 768 ? 1 : 0;
          const bEmb = b.has_embedding || b.embedding_dim === 768 ? 1 : 0;
          comparison = aEmb - bEmb;
          break;
        }
        case "updatedAt":
        default: {
          const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
          comparison = aTime - bTime;
          break;
        }
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [records, searchQuery, selectedCategory, embeddingFilter, sortField, sortDirection]);

  // Pagination Math
  const totalRecords = filteredAndSortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRecords = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredAndSortedRecords.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedRecords, validCurrentPage, pageSize]);

  const hasActiveFilters = searchQuery !== "" || selectedCategory !== "All" || embeddingFilter !== "All";

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setEmbeddingFilter("All");
    setCurrentPage(1);
  };

  const getHostname = (urlStr?: string) => {
    if (!urlStr) return null;
    try {
      const u = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
      return u.hostname.replace(/^www\./, "");
    } catch {
      return urlStr.slice(0, 24);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. TOP TOOLBAR: Search, Category, Embedding, Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search knowledge by title, content keywords, source URL, or ID..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#ae2424] focus:ring-3 focus:ring-[#ae2424]/10 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns & Quick CTAs */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline">
                Category:
              </span>
              <select
                value={selectedCategory}
                onChange={e => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200 text-xs font-medium text-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-[#ae2424] transition-colors cursor-pointer"
              >
                <option value="All">All Categories ({records.length})</option>
                {availableCategories.map(cat => {
                  const catCount = records.filter(r => r.material_category?.toLowerCase() === cat.toLowerCase()).length;
                  return (
                    <option key={cat} value={cat}>
                      {cat} ({catCount})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Embedding Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline">
                Status:
              </span>
              <select
                value={embeddingFilter}
                onChange={e => {
                  setEmbeddingFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200 text-xs font-medium text-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-[#ae2424] transition-colors cursor-pointer"
              >
                <option value="All">All Embedding States ({counts.total})</option>
                <option value="Embedded">768D Vectorized ({counts.embedded})</option>
                <option value="Pending">Pending Embedding ({counts.pending})</option>
              </select>
            </div>

            {/* Refresh Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                title="Refresh Records"
                className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#ae2424]" : ""}`} />
              </button>
            )}

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-2.5 py-1.5 text-xs font-medium text-[#ae2424] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-rose-100"
              >
                <X className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Summary & Record Counts */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-700">
              {totalRecords} {totalRecords === 1 ? "record" : "records"} found
            </span>
            {hasActiveFilters && (
              <span className="text-slate-400">
                (filtered from {records.length} total in public.knowledge_base)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span>{counts.embedded} Vectorized (768D)</span>
            </div>
            {counts.pending > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                <span>{counts.pending} Pending</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN TABLE CONTAINER */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Table Header with interactive column sorting */}
            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 select-none">
              <tr>
                {/* Column: Title & Spec Content */}
                <th
                  onClick={() => handleSort("title")}
                  className="py-3 px-4 font-semibold text-slate-700 hover:bg-slate-100/60 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Title & Content Overview</span>
                    <span className="text-slate-400 group-hover:text-slate-700">
                      {sortField === "title" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5 text-[#ae2424]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-[#ae2424]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                      )}
                    </span>
                  </div>
                </th>

                {/* Column: Category */}
                <th
                  onClick={() => handleSort("material_category")}
                  className="py-3 px-4 font-semibold text-slate-700 hover:bg-slate-100/60 transition-colors cursor-pointer group w-[170px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Category</span>
                    <span className="text-slate-400 group-hover:text-slate-700">
                      {sortField === "material_category" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5 text-[#ae2424]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-[#ae2424]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                      )}
                    </span>
                  </div>
                </th>

                {/* Column: Source Origin */}
                <th className="py-3 px-4 font-semibold text-slate-700 w-[180px]">
                  <span>Source URL</span>
                </th>

                {/* Column: Vector Status */}
                <th
                  onClick={() => handleSort("embedding")}
                  className="py-3 px-4 font-semibold text-slate-700 hover:bg-slate-100/60 transition-colors cursor-pointer group w-[160px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Embedding State</span>
                    <span className="text-slate-400 group-hover:text-slate-700">
                      {sortField === "embedding" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5 text-[#ae2424]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-[#ae2424]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                      )}
                    </span>
                  </div>
                </th>

                {/* Column: Updated Date */}
                <th
                  onClick={() => handleSort("updatedAt")}
                  className="py-3 px-4 font-semibold text-slate-700 hover:bg-slate-100/60 transition-colors cursor-pointer group w-[140px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Updated</span>
                    <span className="text-slate-400 group-hover:text-slate-700">
                      {sortField === "updatedAt" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5 text-[#ae2424]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-[#ae2424]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                      )}
                    </span>
                  </div>
                </th>

                {/* Column: Actions */}
                <th className="py-3 px-4 font-semibold text-slate-700 text-right w-[110px]">
                  <span>Actions</span>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                // Loading Skeleton Rows
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="py-3.5 px-4 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-4 bg-slate-200 rounded w-20" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-4 bg-slate-200 rounded w-28" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-4 bg-slate-200 rounded w-24" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-4 bg-slate-200 rounded w-16" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-6 bg-slate-200 rounded w-12 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : paginatedRecords.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-slate-100 text-slate-400">
                        <Database className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-800">
                        No Knowledge Records Found
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {hasActiveFilters
                          ? "No records matched your search query or filter criteria. Try resetting your filters."
                          : "No construction technical specifications have been stored in the knowledge base yet."}
                      </p>
                      <div className="pt-2 flex items-center justify-center gap-2">
                        {hasActiveFilters ? (
                          <button
                            onClick={clearAllFilters}
                            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
                          >
                            Clear Filters
                          </button>
                        ) : (
                          <>
                            {onCrawlClick && (
                              <button
                                onClick={onCrawlClick}
                                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#ae2424] hover:bg-[#961f1f] rounded-lg cursor-pointer"
                              >
                                Crawl First Source
                              </button>
                            )}
                            {onAddClick && (
                              <button
                                onClick={onAddClick}
                                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
                              >
                                Manual Entry
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                // Data Rows
                paginatedRecords.map(record => {
                  const isEmbedded = record.has_embedding || record.embedding_dim === 768;
                  const hostname = getHostname(record.url);
                  const isBeingDeleted = deletingId === record.id;
                  const isCopied = copiedId === record.id;

                  return (
                    <tr
                      key={record.id}
                      onClick={() => onViewRecord && onViewRecord(record)}
                      className={`hover:bg-slate-50/70 transition-colors cursor-pointer group ${
                        isBeingDeleted ? "opacity-40 pointer-events-none" : ""
                      }`}
                    >
                      {/* Title & Preview */}
                      <td className="py-3 px-4 max-w-[340px]">
                        <div className="flex flex-col gap-0.5">
                          <div
                            className="font-semibold text-slate-900 group-hover:text-[#ae2424] transition-colors truncate text-xs"
                            title={record.title}
                          >
                            {record.title}
                          </div>

                          {/* Content Snippet */}
                          {record.content && (
                            <p className="text-[11px] text-slate-500 truncate line-clamp-1">
                              {record.content}
                            </p>
                          )}

                          {/* ID with Copy action */}
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-mono">
                            <span>ID: {record.id.slice(0, 16)}...</span>
                            <button
                              type="button"
                              onClick={e => handleCopyId(record.id, e)}
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                              title={isCopied ? "Copied ID!" : "Copy Record ID"}
                            >
                              {isCopied ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-700 text-xs">
                          {record.material_category || "General"}
                        </span>
                      </td>

                      {/* Source URL */}
                      <td className="py-3 px-4 max-w-[180px]">
                        {record.url ? (
                          <a
                            href={record.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-slate-600 hover:text-[#ae2424] inline-flex items-center gap-1 font-mono text-[11px] truncate max-w-full"
                            title={record.url}
                          >
                            <span className="truncate">{hostname}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">
                            Manual Spec
                          </span>
                        )}
                      </td>

                      {/* Embedding State */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isEmbedded ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-mono text-[11px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>768D Vectorized</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-600 font-mono text-[11px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span>Pending Embed</span>
                          </div>
                        )}
                      </td>

                      {/* Updated Date */}
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {record.updatedAt || record.createdAt ? (
                          <span>
                            {new Date(record.updatedAt || record.createdAt || "").toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                        ) : (
                          <span>Recent</span>
                        )}
                      </td>

                      {/* Row Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={e => e.stopPropagation()}
                        >
                          {/* View details */}
                          <button
                            type="button"
                            onClick={() => onViewRecord && onViewRecord(record)}
                            title="View Record Details"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Delete from Supabase */}
                          {onDeleteRecord && (
                            <button
                              type="button"
                              onClick={e => handleDelete(record.id, e)}
                              disabled={isBeingDeleted}
                              title="Delete from Supabase public.knowledge_base"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 3. PAGINATION FOOTER */}
        <div className="py-3 px-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600">
          {/* Showing stats */}
          <div className="flex items-center gap-3">
            <span>
              Showing{" "}
              <strong className="text-slate-800">
                {totalRecords > 0 ? (validCurrentPage - 1) * pageSize + 1 : 0}
              </strong>{" "}
              to{" "}
              <strong className="text-slate-800">
                {Math.min(validCurrentPage * pageSize, totalRecords)}
              </strong>{" "}
              of <strong className="text-slate-800">{totalRecords}</strong> records
            </span>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
              <span className="text-[11px] text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 text-xs text-slate-700 rounded px-1.5 py-0.5 focus:outline-none focus:border-[#ae2424] cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1">
            {/* First Page */}
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={validCurrentPage <= 1}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200 rounded disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Previous Page */}
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={validCurrentPage <= 1}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-md disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            {/* Page Number Indicator */}
            <div className="px-2.5 font-mono text-[11px] text-slate-700">
              Page <span className="font-semibold">{validCurrentPage}</span> of{" "}
              <span className="font-semibold">{totalPages}</span>
            </div>

            {/* Next Page */}
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={validCurrentPage >= totalPages}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-md disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Last Page */}
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage >= totalPages}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200 rounded disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeTable;
