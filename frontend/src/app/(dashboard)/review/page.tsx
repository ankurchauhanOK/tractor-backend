"use client";

import { useEffect, useState, Suspense } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listEntries, type Inspection } from "@/lib/api";
import {
  ClipboardCheck,
  Loader2,
  Eye,
  AlertCircle,
  RotateCw,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
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

function ReviewQueueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "needs_review");
  const [search, setSearch] = useState(searchParams.get("search") || "");

  useEffect(() => {
    setLoading(true);
    setError(null);
    listEntries()
      .then((data) => {
        if (!data) {
          setError("Backend unavailable.");
          return;
        }
        setEntries(data);
      })
      .catch(() => setError("Failed to load entries."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = entries.filter((e) => {
    if (statusFilter && e.status !== statusFilter) return false;
    if (search && !e.tractor_no?.toLowerCase().includes(search.toLowerCase()) && !String(e.batch_id).includes(search)) return false;
    return true;
  });

  const needsReviewCount = entries.filter((e) => e.status === "needs_review").length;
  const verifiedCount = entries.filter((e) => e.status === "verified").length;
  const failedCount = entries.filter((e) => e.status === "failed").length;

  return (
    <div className="flex-1">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Verify and correct OCR-extracted inspections
            </p>
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex gap-3 mb-3 flex-wrap">
          <button
            onClick={() => setStatusFilter("needs_review")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              statusFilter === "needs_review"
                ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <AlertTriangle className="size-3" />
            Needs Review ({needsReviewCount})
          </button>
          <button
            onClick={() => setStatusFilter("verified")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              statusFilter === "verified"
                ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/30 dark:text-green-400"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <CheckCircle2 className="size-3" />
            Verified ({verifiedCount})
          </button>
          <button
            onClick={() => setStatusFilter("failed")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              statusFilter === "failed"
                ? "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-400"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <XCircle className="size-3" />
            Failed ({failedCount})
          </button>
          <button
            onClick={() => setStatusFilter("")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              !statusFilter
                ? "border-foreground/30 bg-muted text-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            All ({entries.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by tractor no. or batch ID..."
            className="pl-8"
          />
        </div>
      </div>

      <div className="p-6">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg border p-4 animate-pulse">
                <div className="size-8 rounded bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-48 rounded bg-muted" />
                </div>
                <div className="h-6 w-20 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="mb-4 size-12 text-destructive" />
              <p className="text-lg font-medium">{error}</p>
              <Button className="mt-4" onClick={() => window.location.reload()}>
                <RotateCw className="mr-2 size-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && filtered.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ClipboardCheck className="mb-4 size-12 text-muted-foreground/40" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm mt-1">
                {statusFilter
                  ? `No inspections with status "${statusFilter}".`
                  : "No inspections found."}
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((entry) => {
              const lowestConf = entry.confidence_scores
                ? Math.min(...Object.values(entry.confidence_scores), 1)
                : 1;
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => router.push(`/review/${entry.id}`)}
                >
                  <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {entry.status === "verified" ? (
                      <CheckCircle2 className="size-5 text-green-500" />
                    ) : entry.status === "failed" ? (
                      <XCircle className="size-5 text-red-500" />
                    ) : (
                      <ClipboardCheck className="size-5 text-amber-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {entry.tractor_no || "Unidentified"}
                      </span>
                      {entry.needs_review && (
                        <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>Batch #{entry.batch_id}</span>
                      <span>Page {entry.page_number}</span>
                      {entry.shift && <span>Shift {entry.shift}</span>
                      }{entry.date && <span>{entry.date}</span>}
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                    {entry.confidence_scores && Object.keys(entry.confidence_scores).length > 0 && (
                      <span className={lowestConf < 0.7 ? "text-amber-600 font-medium" : ""}>
                        {Math.round(lowestConf * 100)}% min conf
                      </span>
                    )}
                    {entry.defects?.length > 0 && (
                      <span>{entry.defects.length} defect{entry.defects.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>

                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[entry.status ?? ""] || ""}`}>
                    {entry.status?.replace(/_/g, " ") || "Unknown"}
                  </span>

                  <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={null}>
      <ReviewQueueContent />
    </Suspense>
  );
}
