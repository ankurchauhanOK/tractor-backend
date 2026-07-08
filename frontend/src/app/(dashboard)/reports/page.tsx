"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  listExports,
  createExport,
  getExportDownloadUrl,
  type Batch,
  type ExportRecord,
} from "@/lib/api";
import { toast } from "sonner";
import {
  Search,
  FileSpreadsheet,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  AlertCircle,
  RotateCw,
  X,
  FileText,
  Clock,
  Layers,
  Plus,
  ExternalLink,
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
  waiting_review: "Need Review",
  completed: "Completed",
  completed_with_errors: "Completed w/ Errors",
  cancelled: "Cancelled",
};

const PAGE_SIZES = [10, 25, 50, 100];

function ReportsPageContent() {
  const searchParams = useSearchParams();

  const [data, setData] = useState<{ total: number; page: number; page_size: number; total_pages: number; batches: Batch[] } | null>(null);
  const [batchExports, setBatchExports] = useState<Record<number, ExportRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [pageSize, setPageSize] = useState(Number(searchParams.get("page_size")) || 25);

  const [searchInput, setSearchInput] = useState(search);
  const searchRef = useRef<HTMLInputElement>(null);

  const [createDialogBatch, setCreateDialogBatch] = useState<number | null>(null);
  const [exportFormat, setExportFormat] = useState("xlsx");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSearchInput("");
        setSearch("");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listBatches({ page, page_size: pageSize, search: search || undefined });
      if (!result) {
        setError("Failed to load batches. Backend may be unavailable.");
        return;
      }
      setData(result);

      const exportMap: Record<number, ExportRecord[]> = {};
      await Promise.all(
        result.batches.map(async (b) => {
          const exports = await listExports(b.id);
          if (exports) exportMap[b.id] = exports.exports;
        })
      );
      setBatchExports(exportMap);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCreateExport() {
    if (!createDialogBatch) return;
    setCreating(true);
    try {
      const result = await createExport(createDialogBatch, exportFormat as "xlsx" | "pdf");
      if (result) {
        toast.success(`${exportFormat.toUpperCase()} export created`);
        setCreateDialogBatch(null);
        fetchData();
      } else {
        toast.error("Failed to create export");
      }
    } catch {
      toast.error("Failed to create export");
    } finally {
      setCreating(false);
    }
  }

  const totalPages = data?.total_pages ?? 1;
  const paginationStart = (page - 1) * pageSize + 1;
  const paginationEnd = Math.min(page * pageSize, data?.total ?? 0);

  return (
    <div className="flex-1 flex flex-col">
      {/* ─── Sticky Header ─── */}
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {data ? `${data.total} batch${data.total !== 1 ? "es" : ""} total` : "Generated export files"}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchRef}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by batch no..."
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
          </div>
        </div>
      </div>

      {/* ─── Content Area ─── */}
      <div className="flex-1 p-6">
        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg border p-4 animate-pulse">
                <div className="h-4 w-28 rounded bg-muted" />
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="flex-1" />
                <div className="h-4 w-16 rounded bg-muted" />
                <div className="h-4 w-16 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="mb-4 size-12 text-destructive" />
              <p className="text-lg font-medium">Failed to load reports</p>
              <p className="text-sm text-muted-foreground mt-1 mb-6">{error}</p>
              <Button onClick={fetchData}>
                <RotateCw className="mr-2 size-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty */}
        {!loading && !error && (!data || data.total === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileSpreadsheet className="mb-4 size-12 text-muted-foreground/40" />
              <p className="text-lg font-medium">
                {search ? "No batches match your search" : "No reports yet"}
              </p>
              <p className="text-sm mt-1">
                {search
                  ? "Try a different search term."
                  : "Export a batch to generate reports."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Data */}
        {!loading && !error && data && data.total > 0 && (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-10 px-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Batch No</th>
                      <th className="h-10 px-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="h-10 px-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">Exports</th>
                      <th className="h-10 px-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Created</th>
                      <th className="h-10 px-3 text-right w-56 font-medium text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.batches.map((batch) => {
                      const exports = batchExports[batch.id] || [];
                      const xlsxCount = exports.filter((e) => e.file_type === "xlsx").length;
                      const pdfCount = exports.filter((e) => e.file_type === "pdf").length;
                      return (
                        <tr key={batch.id} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-3">
                            <div className="font-mono text-sm font-medium">{batch.batch_no}</div>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[batch.status ?? ""] || "bg-slate-100 text-slate-700"}`}>
                              {STATUS_LABELS[batch.status ?? ""] || batch.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {xlsxCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                                  <FileSpreadsheet className="size-3 text-green-600" />
                                  {xlsxCount}
                                </span>
                              )}
                              {pdfCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                                  <FileText className="size-3 text-red-600" />
                                  {pdfCount}
                                </span>
                              )}
                              {exports.length === 0 && (
                                <span className="text-xs text-muted-foreground/50">&mdash;</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {batch.created_at
                              ? new Date(batch.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                              : "\u2014"}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {exports.length > 0 && (
                                <div className="flex items-center gap-0.5 mr-2">
                                  {exports.slice(0, 3).map((exp) => (
                                    <a
                                      key={exp.id}
                                      href={getExportDownloadUrl(exp.id)}
                                      download
                                      className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                                      title={`Download ${exp.file_type.toUpperCase()}`}
                                    >
                                      {exp.file_type === "xlsx" ? (
                                        <FileSpreadsheet className="size-3" />
                                      ) : (
                                        <FileText className="size-3" />
                                      )}
                                      <Download className="size-3" />
                                    </a>
                                  ))}
                                  {exports.length > 3 && (
                                    <span className="text-xs text-muted-foreground/50">+{exports.length - 3}</span>
                                  )}
                                </div>
                              )}
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => { setCreateDialogBatch(batch.id); setExportFormat("xlsx"); }}
                                title="Create Export"
                              >
                                <Plus className="size-3.5" />
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
              {data.batches.map((batch) => {
                const exports = batchExports[batch.id] || [];
                return (
                  <div key={batch.id} className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono font-bold text-sm truncate">{batch.batch_no}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {batch.created_at
                            ? new Date(batch.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                            : "\u2014"}
                        </p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[batch.status ?? ""] || ""}`}>
                        {STATUS_LABELS[batch.status ?? ""] || batch.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <FileSpreadsheet className="size-3" />
                        {exports.filter((e) => e.file_type === "xlsx").length} XLSX
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FileText className="size-3" />
                        {exports.filter((e) => e.file_type === "pdf").length} PDF
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t">
                      {exports.length > 0 && exports.slice(0, 2).map((exp) => (
                        <a
                          key={exp.id}
                          href={getExportDownloadUrl(exp.id)}
                          download
                          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Download className="size-3" />
                          {exp.file_type.toUpperCase()}
                        </a>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => { setCreateDialogBatch(batch.id); setExportFormat("xlsx"); }}
                      >
                        <Plus className="mr-1 size-3" />
                        Export
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
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

      {/* Create Export Dialog */}
      <Dialog open={createDialogBatch !== null} onOpenChange={(open) => { if (!open) setCreateDialogBatch(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Export</DialogTitle>
            <DialogDescription>
              Choose a format for the batch export file.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-3">
              <label className="text-sm font-medium">Export format</label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v ?? "xlsx")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="size-4 text-green-600" />
                      Excel (.xlsx)
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-red-600" />
                      PDF (.pdf)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogBatch(null)}>
              Cancel
            </Button>
            <Button
              disabled={creating}
              onClick={handleCreateExport}
            >
              {creating ? (
                <><Loader2 className="mr-2 size-4 animate-spin" /> Creating...</>
              ) : (
                <><Download className="mr-2 size-4" /> Create Export</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsPageContent />
    </Suspense>
  );
}
