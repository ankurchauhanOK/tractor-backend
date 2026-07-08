"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getBatch,
  listEntries,
  createExport,
  getExportDownloadUrl,
  updateEntry,
  archiveBatch,
  restoreBatch,
  type Batch,
  type Inspection,
  type InspectionStatus,
} from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Loader2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Archive,
  RotateCw,
  Download,
  FileDown,
  RefreshCw,
} from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  uploaded: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  queued: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  processing: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  ocr_completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  needs_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  verified: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  exported: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const BATCH_STATUS_COLORS: Record<string, string> = {
  uploading: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  queued: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  processing: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  waiting_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed_with_errors: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const BATCH_STATUS_LABELS: Record<string, string> = {
  uploading: "Uploading",
  queued: "Queued",
  processing: "Processing",
  waiting_review: "Needs Review",
  completed: "Completed",
  completed_with_errors: "Completed w/ Errors",
  cancelled: "Cancelled",
};

export default function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const batchId = Number(id);

  const [batch, setBatch] = useState<Batch | null>(null);
  const [entries, setEntries] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [batchData, entriesData] = await Promise.all([
          getBatch(batchId),
          listEntries(),
        ]);
        if (!batchData) {
          setError("Batch not found");
          return;
        }
        setBatch(batchData);
        if (entriesData) {
          setEntries(entriesData.filter((e) => e.batch_id === batchId));
        }
      } catch {
        setError("Failed to load batch details");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [batchId]);

  async function handleExport(format: "xlsx" | "pdf") {
    setExporting(format);
    const result = await createExport(batchId, format);
    setExporting(null);
    if (result) {
      toast.success(`${format.toUpperCase()} export created`);
    } else {
      toast.error("Failed to create export");
    }
  }

  async function handleArchive() {
    setArchiving(true);
    const result = await archiveBatch(batchId);
    setArchiving(false);
    if (result) {
      toast.success("Batch archived");
      const updated = await getBatch(batchId);
      if (updated) setBatch(updated);
    } else {
      toast.error("Failed to archive batch");
    }
  }

  async function handleRestore() {
    const result = await restoreBatch(batchId);
    if (result) {
      toast.success("Batch restored");
      const updated = await getBatch(batchId);
      if (updated) setBatch(updated);
    } else {
      toast.error("Failed to restore batch");
    }
  }

  // Stats derived from entries
  const totalPages = batch?.total_pages ?? entries.length;
  const processed = entries.filter((e) => e.status && e.status !== "uploaded" && e.status !== "queued").length;
  const verified = entries.filter((e) => e.status === "verified").length;
  const failed = entries.filter((e) => e.status === "failed").length;
  const needsReview = entries.filter((e) => e.status === "needs_review" || e.needs_review).length;
  const progress = totalPages > 0 ? Math.round((processed / totalPages) * 100) : 0;

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-muted" />
            ))}
          </div>
          <div className="h-64 rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="flex-1 p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="mb-4 size-12 text-destructive" />
            <p className="text-lg font-medium">{error || "Batch not found"}</p>
            <Button className="mt-6" variant="outline" onClick={() => router.push("/batches")}>
              <ArrowLeft className="mr-2 size-4" />
              Back to Batches
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isArchived = !!batch.deleted_at;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon-sm" onClick={() => router.push("/batches")}>
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-mono tracking-tight">{batch.batch_no}</h1>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BATCH_STATUS_COLORS[batch.status ?? ""] || ""}`}>
                  {BATCH_STATUS_LABELS[batch.status ?? ""] || batch.status}
                </span>
                {isArchived && (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    Archived
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {batch.factory_name && `${batch.factory_name}`}
                {batch.plant_name && ` / ${batch.plant_name}`}
                {batch.line_name && ` / Line ${batch.line_name}`}
                {batch.created_at && ` \u2022 ${new Date(batch.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Button variant="outline" size="sm" disabled={exporting === "xlsx"} onClick={() => handleExport("xlsx")}>
              {exporting === "xlsx" ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <FileSpreadsheet className="mr-1.5 size-3.5" />}
              Export XLSX
            </Button>
            <Button variant="outline" size="sm" disabled={exporting === "pdf"} onClick={() => handleExport("pdf")}>
              {exporting === "pdf" ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <FileText className="mr-1.5 size-3.5" />}
              Export PDF
            </Button>
            {isArchived ? (
              <Button variant="outline" size="sm" onClick={handleRestore}>
                <RotateCw className="mr-1.5 size-3.5" />
                Restore
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled={archiving} onClick={handleArchive}>
                {archiving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Archive className="mr-1.5 size-3.5" />}
                Archive
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push(`/verify?batch_id=${batch.id}`)}>
              <Eye className="mr-1.5 size-3.5" />
              Open in Verify
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Pages</p>
              <p className="text-2xl font-bold mt-1 tabular-nums">{totalPages}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Processed</p>
              <p className="text-2xl font-bold mt-1 tabular-nums">{processed}</p>
              {totalPages > 0 && (
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-amber-600 transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Verified</p>
              <p className="text-2xl font-bold mt-1 tabular-nums text-green-600">{verified}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Needs Review</p>
              <p className="text-2xl font-bold mt-1 tabular-nums text-amber-600">{needsReview}</p>
            </CardContent>
          </Card>
        </div>

        {/* Summary details */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Operator</span>
                <p className="font-medium">{batch.operator || "\u2014"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Scanner</span>
                <p className="font-medium">{batch.scanner_name || "\u2014"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Avg Confidence</span>
                <p className="font-medium">{batch.average_confidence != null ? `${batch.average_confidence.toFixed(1)}%` : "\u2014"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Failed Pages</span>
                <p className="font-medium text-red-600">{failed || "\u2014"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">OCR Version</span>
                <p className="font-medium font-mono text-xs">{batch.ocr_version || "\u2014"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">File Size</span>
                <p className="font-medium">{batch.file_size_bytes ? `${(batch.file_size_bytes / (1024 * 1024)).toFixed(1)} MB` : "\u2014"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created</span>
                <p className="font-medium">{batch.created_at ? new Date(batch.created_at).toLocaleString("en-IN") : "\u2014"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Updated</span>
                <p className="font-medium">{batch.updated_at ? new Date(batch.updated_at).toLocaleString("en-IN") : "\u2014"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inspections Table */}
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b">
              <h3 className="text-sm font-medium">Pages / Inspections ({entries.length})</h3>
            </div>
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileDown className="mb-3 size-8 text-muted-foreground/40" />
                <p className="text-sm">No inspections found for this batch.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-9 px-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Page</th>
                      <th className="h-9 px-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="h-9 px-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Tractor No</th>
                      <th className="h-9 px-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Engine No</th>
                      <th className="h-9 px-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Chassis No</th>
                      <th className="h-9 px-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Inspector</th>
                      <th className="h-9 px-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">Confidence</th>
                      <th className="h-9 px-3 text-right w-24 font-medium text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-3 font-mono text-xs">{entry.page_number}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[entry.status ?? ""] || "bg-slate-100 text-slate-700"}`}>
                            {entry.status ?? "Unknown"}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs max-w-[120px] truncate">{entry.tractor_no || "\u2014"}</td>
                        <td className="p-3 font-mono text-xs max-w-[120px] truncate">{entry.engine_no || "\u2014"}</td>
                        <td className="p-3 font-mono text-xs max-w-[120px] truncate">{entry.chassis_no || "\u2014"}</td>
                        <td className="p-3 text-xs">{entry.inspector || "\u2014"}</td>
                        <td className="p-3 text-right tabular-nums text-xs">
                          {entry.confidence_scores && Object.keys(entry.confidence_scores).length > 0
                            ? `${(Object.values(entry.confidence_scores).reduce((a, b) => a + b, 0) / Object.values(entry.confidence_scores).length).toFixed(1)}%`
                            : "\u2014"}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => router.push(`/review/${entry.id}`)}
                              title="Review"
                            >
                              {entry.status === "needs_review" ? (
                                <AlertTriangle className="size-3.5 text-amber-500" />
                              ) : (
                                <Eye className="size-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => router.push(`/verify/${entry.id}`)}
                              title="Verify"
                            >
                              <CheckCircle2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
