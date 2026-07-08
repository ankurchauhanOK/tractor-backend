"use client";

import { useEffect, useState, useCallback, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listBatches,
  archiveBatch,
  createExport,
  type Batch,
  type BatchStatus,
  type PaginatedBatches,
} from "@/lib/api";
import { toast } from "sonner";
import {
  Search,
  Layers,
  Plus,
  Loader2,
  Eye,
  FileSpreadsheet,
  Archive,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  Square,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  AlertCircle,
  RotateCw,
  Trash2,
  X,
  Filter,
  CheckSquare,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  uploading: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  queued: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  processing: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  waiting_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed_with_errors: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  uploading: "Uploading",
  queued: "Queued",
  processing: "Processing",
  waiting_review: "Review",
  completed: "Completed",
  completed_with_errors: "Completed w/ Errors",
  cancelled: "Cancelled",
};

type SortField = "batch_no" | "created_at" | "status" | "total_pages" | "average_confidence";
type SortDir = "asc" | "desc";

const PAGE_SIZES = [10, 25, 50, 100];

const STATUSES: BatchStatus[] = [
  "uploading",
  "queued",
  "processing",
  "waiting_review",
  "completed",
  "completed_with_errors",
  "cancelled",
];

function BatchesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [data, setData] = useState<PaginatedBatches | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & filters
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "");
  const [factoryFilter, setFactoryFilter] = useState(searchParams.get("factory") || "");
  const [yearFilter, setYearFilter] = useState(searchParams.get("year") || "");

  // Pagination
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [pageSize, setPageSize] = useState(Number(searchParams.get("page_size")) || 25);

  // Sort
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [lastClicked, setLastClicked] = useState<number | null>(null);

  // Dialogs
  const [archiveConfirmId, setArchiveConfirmId] = useState<number | null>(null);
  const [bulkArchiving, setBulkArchiving] = useState(false);
  const [bulkExporting, setBulkExporting] = useState(false);

  // Search ref for keyboard shortcut
  const searchRef = useRef<HTMLInputElement>(null);

  // Debounced search
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Keyboard shortcut: Cmd+K to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSearchInput("");
        setSearch("");
        setSelected(new Set());
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch batches
  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listBatches({
        page,
        page_size: pageSize,
        status: statusFilter || undefined,
        factory: factoryFilter || undefined,
        year: yearFilter ? Number(yearFilter) : undefined,
        search: search || undefined,
      });
      if (!result) {
        setError("Failed to load batches. Backend may be unavailable.");
        return;
      }
      setData(result);
      setSelected(new Set());
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, factoryFilter, yearFilter, search]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Sort handler
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const sortedBatches = useMemo(() => {
    if (!data?.batches) return [];
    return [...data.batches].sort((a, b) => {
      const aVal = a[sortField] ?? "";
      const bVal = b[sortField] ?? "";
      const cmp = typeof aVal === "string" ? aVal.localeCompare(String(bVal)) : Number(aVal) - Number(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortField, sortDir]);

  // Selection
  function toggleSelect(id: number, shiftKey = false) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (shiftKey && lastClicked !== null) {
        const ids = sortedBatches.map((b) => b.id);
        const start = ids.indexOf(lastClicked);
        const end = ids.indexOf(id);
        if (start !== -1 && end !== -1) {
          const [from, to] = start < end ? [start, end] : [end, start];
          for (let i = from; i <= to; i++) {
            next.has(ids[i]) ? next.delete(ids[i]) : next.add(ids[i]);
          }
        }
      } else {
        next.has(id) ? next.delete(id) : next.add(id);
      }
      return next;
    });
    setLastClicked(id);
  }

  function toggleSelectAll() {
    if (selected.size === sortedBatches.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sortedBatches.map((b) => b.id)));
    }
  }

  // Bulk archive
  async function handleBulkArchive() {
    setBulkArchiving(true);
    let success = 0;
    for (const id of selected) {
      const result = await archiveBatch(id);
      if (result) success++;
    }
    setBulkArchiving(false);
    setArchiveConfirmId(null);
    setSelected(new Set());
    toast.success(`Archived ${success} of ${selected.size} batches`);
    fetchBatches();
  }

  // Bulk export
  async function handleBulkExport() {
    setBulkExporting(true);
    let success = 0;
    for (const id of selected) {
      const result = await createExport(id, "xlsx");
      if (result) success++;
    }
    setBulkExporting(false);
    toast.success(`Exported ${success} of ${selected.size} batches`);
  }

  // Quick archive
  async function handleQuickArchive(id: number) {
    const result = await archiveBatch(id);
    if (result) {
      toast.success(`Batch archived`);
      fetchBatches();
    } else {
      toast.error("Failed to archive batch");
    }
    setArchiveConfirmId(null);
  }

  // Quick export
  async function handleQuickExport(id: number) {
    const result = await createExport(id, "xlsx");
    if (result) {
      toast.success("Export created");
    } else {
      toast.error("Failed to create export");
    }
  }

  // Pagination controls
  const totalPages = data?.total_pages ?? 1;
  const paginationStart = (page - 1) * pageSize + 1;
  const paginationEnd = Math.min(page * pageSize, data?.total ?? 0);

  // Sort icon
  function SortIcon(field: SortField) {
    if (sortField !== field) return <ArrowUpDown className="size-3 text-muted-foreground/50" />;
    return sortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />;
  }

  // Progress percentage
  function progress(b: Batch) {
    if (!b.total_pages) return 0;
    return Math.round(((b.processed_pages ?? 0) / b.total_pages) * 100);
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* ─── Sticky Header ─── */}
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Batches</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {data ? `${data.total} batch${data.total !== 1 ? "es" : ""} total` : "Manage inspection batches"}
              </p>
            </div>
            <Button onClick={() => router.push("/upload")}>
              <Plus className="mr-1.5 size-4" />
              New Batch
            </Button>
          </div>

          {/* ── Search + Filters ── */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchRef}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by batch no. or operator...  "
                className="pl-8 pr-10"
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(""); setSearch(""); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
              <kbd className="absolute right-8 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground pointer-events-none">
                {navigator.platform?.includes("Mac") ? "\u2318" : "Ctrl+"}K
              </kbd>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? ""); setPage(1); }}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="text"
                placeholder="Factory..."
                value={factoryFilter}
                onChange={(e) => { setFactoryFilter(e.target.value); setPage(1); }}
                className="w-32"
              />

              <Input
                type="number"
                placeholder="Year..."
                value={yearFilter}
                onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
                className="w-24"
              />

              {(search || statusFilter || factoryFilter || yearFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch(""); setSearchInput("");
                    setStatusFilter(""); setFactoryFilter("");
                    setYearFilter(""); setPage(1);
                  }}
                >
                  <RefreshCw className="mr-1 size-3.5" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Bulk Actions Bar ── */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 px-6 py-2 border-t bg-muted/50">
            <CheckSquare className="size-4 text-amber-600" />
            <span className="text-sm font-medium">{selected.size} selected</span>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              disabled={bulkExporting}
              onClick={handleBulkExport}
            >
              <Download className="mr-1.5 size-3.5" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={bulkArchiving}
              onClick={() => setArchiveConfirmId(-1)}
            >
              <Archive className="mr-1.5 size-3.5" />
              Archive
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* ─── Content Area ─── */}
      <div className="flex-1 p-6">
        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg border p-4 animate-pulse">
                <div className="size-4 rounded bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-4 w-16 rounded bg-muted" />
                <div className="flex-1" />
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-4 w-16 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="mb-4 size-12 text-destructive" />
              <p className="text-lg font-medium">Failed to load batches</p>
              <p className="text-sm text-muted-foreground mt-1 mb-6">{error}</p>
              <Button onClick={fetchBatches}>
                <RotateCw className="mr-2 size-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && (!data || data.total === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Layers className="mb-4 size-12 text-muted-foreground/40" />
              <p className="text-lg font-medium">
                {search || statusFilter || factoryFilter || yearFilter
                  ? "No batches match your filters"
                  : "No batches yet"}
              </p>
              <p className="text-sm mt-1">
                {search || statusFilter || factoryFilter || yearFilter
                  ? "Try adjusting your search or filter criteria."
                  : "Upload a PDF to create your first batch."}
              </p>
              {!search && !statusFilter && !factoryFilter && !yearFilter && (
                <Button className="mt-6" onClick={() => router.push("/upload")}>
                  <Plus className="mr-2 size-4" />
                  Create First Batch
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Data Table */}
        {!loading && !error && data && data.total > 0 && (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-10 px-3 text-left w-10">
                        <button onClick={toggleSelectAll} className="flex items-center justify-center size-5">
                          {selected.size === sortedBatches.length && sortedBatches.length > 0 ? (
                            <Check className="size-4 text-amber-600" />
                          ) : (
                            <Square className="size-4 text-muted-foreground" />
                          )}
                        </button>
                      </th>
                      <th className="h-10 px-3 text-left">
                        <button onClick={() => handleSort("batch_no")} className="flex items-center gap-1.5 font-medium text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
                          Batch {SortIcon("batch_no")}
                        </button>
                      </th>
                      <th className="h-10 px-3 text-left">
                        <button onClick={() => handleSort("status")} className="flex items-center gap-1.5 font-medium text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
                          Status {SortIcon("status")}
                        </button>
                      </th>
                      <th className="h-10 px-3 text-left">
                        <span className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Progress</span>
                      </th>
                      <th className="h-10 px-3 text-right">
                        <button onClick={() => handleSort("total_pages")} className="flex items-center gap-1.5 font-medium text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground ml-auto">
                          Pages {SortIcon("total_pages")}
                        </button>
                      </th>
                      <th className="h-10 px-3 text-right">
                        <button onClick={() => handleSort("average_confidence")} className="flex items-center gap-1.5 font-medium text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground ml-auto">
                          Confidence {SortIcon("average_confidence")}
                        </button>
                      </th>
                      <th className="h-10 px-3 text-left">
                        <span className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Factory</span>
                      </th>
                      <th className="h-10 px-3 text-left">
                        <button onClick={() => handleSort("created_at")} className="flex items-center gap-1.5 font-medium text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
                          Created {SortIcon("created_at")}
                        </button>
                      </th>
                      <th className="h-10 px-3 text-right w-40">
                        <span className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBatches.map((batch) => {
                      const isSelected = selected.has(batch.id);
                      const pct = progress(batch);
                      return (
                        <tr
                          key={batch.id}
                          className={`border-b transition-colors hover:bg-muted/50 cursor-pointer ${
                            isSelected ? "bg-amber-50/50 dark:bg-amber-950/10" : ""
                          }`}
                          onClick={() => router.push(`/batches/${batch.id}`)}
                        >
                          <td className="p-3 w-10" onClick={(e) => e.stopPropagation()}>
                            <button onClick={(e) => { e.stopPropagation(); toggleSelect(batch.id, e.shiftKey); }} className="flex items-center justify-center size-5">
                              {isSelected ? (
                                <Check className="size-4 text-amber-600" />
                              ) : (
                                <Square className="size-4 text-muted-foreground/50" />
                              )}
                            </button>
                          </td>
                          <td className="p-3 font-mono text-sm font-medium">
                            {batch.batch_no}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[batch.status ?? ""] || "bg-slate-100 text-slate-700"}`}>
                              {STATUS_LABELS[batch.status ?? ""] || batch.status}
                            </span>
                          </td>
                          <td className="p-3 min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-amber-600 transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                                {batch.processed_pages ?? 0}/{batch.total_pages}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right tabular-nums text-sm">
                            {batch.total_pages}
                          </td>
                          <td className="p-3 text-right tabular-nums text-sm">
                            {batch.average_confidence != null
                              ? `${batch.average_confidence.toFixed(1)}%`
                              : "\u2014"}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground max-w-[120px] truncate">
                            {batch.factory_name || "\u2014"}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {batch.created_at
                              ? new Date(batch.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                              : "\u2014"}
                          </td>
                          <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon-sm" onClick={() => router.push(`/batches/${batch.id}`)} title="View">
                                <Eye className="size-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => router.push(`/verify?batch_id=${batch.id}`)} title="Verify">
                                <Check className="size-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => handleQuickExport(batch.id)} title="Export">
                                <FileSpreadsheet className="size-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => setArchiveConfirmId(batch.id)} title="Archive">
                                <Archive className="size-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {sortedBatches.map((batch) => {
                const isSelected = selected.has(batch.id);
                const pct = progress(batch);
                return (
                  <div
                    key={batch.id}
                    className={`rounded-xl border bg-card p-4 space-y-3 active:bg-muted/50 transition-colors cursor-pointer ${
                      isSelected ? "ring-2 ring-amber-500/50" : ""
                    }`}
                    onClick={() => router.push(`/batches/${batch.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <button onClick={(e) => { e.stopPropagation(); toggleSelect(batch.id); }} className="shrink-0">
                          {isSelected ? (
                            <Check className="size-4 text-amber-600" />
                          ) : (
                            <Square className="size-4 text-muted-foreground/50" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <p className="font-mono font-bold text-sm truncate">{batch.batch_no}</p>
                          <p className="text-xs text-muted-foreground truncate">{batch.factory_name || "No factory"}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[batch.status ?? ""] || ""}`}>
                        {STATUS_LABELS[batch.status ?? ""] || batch.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-amber-600 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {batch.processed_pages ?? 0}/{batch.total_pages}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{batch.created_at ? new Date(batch.created_at).toLocaleDateString("en-IN") : "\u2014"}</span>
                      <span>
                        {batch.average_confidence != null ? `${batch.average_confidence.toFixed(1)}% conf.` : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={() => router.push(`/batches/${batch.id}`)}>
                        <Eye className="mr-1 size-3.5" />
                        View
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={() => handleQuickExport(batch.id)}>
                        <FileSpreadsheet className="mr-1 size-3.5" />
                        Export
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={() => setArchiveConfirmId(batch.id)}>
                        <Archive className="mr-1 size-3.5" />
                        Archive
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Pagination ── */}
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline">
                  Showing {paginationStart}\u2013{paginationEnd} of {data.total}
                </span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger size="sm" className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((s) => (
                      <SelectItem key={s} value={String(s)}>{s} / page</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" disabled={page <= 1} onClick={() => setPage(1)} title="First page">
                  <ChevronsLeft className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} title="Previous page">
                  <ChevronLeft className="size-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "ghost"}
                        size="icon-sm"
                        onClick={() => setPage(pageNum)}
                        className="text-xs"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button variant="ghost" size="icon-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} title="Next page">
                  <ChevronRight className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" disabled={page >= totalPages} onClick={() => setPage(totalPages)} title="Last page">
                  <ChevronsRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Archive Confirmation Dialog ── */}
      <Dialog open={archiveConfirmId !== null} onOpenChange={(open) => { if (!open) setArchiveConfirmId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Batch</DialogTitle>
            <DialogDescription>
              {archiveConfirmId === -1
                ? `Are you sure you want to archive ${selected.size} selected batch${selected.size !== 1 ? "es" : ""}?`
                : "Are you sure you want to archive this batch? It can be restored later."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={bulkArchiving}
              onClick={archiveConfirmId === -1 ? handleBulkArchive : () => handleQuickArchive(archiveConfirmId!)}
            >
              {bulkArchiving ? (
                <><Loader2 className="mr-2 size-4 animate-spin" /> Archiving...</>
              ) : (
                <><Archive className="mr-2 size-4" /> Archive</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BatchesPage() {
  return (
    <Suspense fallback={null}>
      <BatchesPageContent />
    </Suspense>
  );
}
