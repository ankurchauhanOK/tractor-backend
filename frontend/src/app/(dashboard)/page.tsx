"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listEntries, getDashboard, getLegacyExportUrl, type Inspection, type DashboardData } from "@/lib/api";
import {
  Upload,
  FileSpreadsheet,
  ClipboardCheck,
  Clock,
  Eye,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Layers,
} from "lucide-react";

const statusBadge = (status: string | null) => {
  const map: Record<string, { color: string; label: string }> = {
    verified: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", label: "Verified" },
    exported: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", label: "Exported" },
    ocr_completed: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "OCR Done" },
    needs_review: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", label: "Review" },
    processing: { color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", label: "Processing" },
    uploaded: { color: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400", label: "Uploaded" },
    failed: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", label: "Failed" },
  };
  const s = map[status ?? ""] || { color: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400", label: status ?? "Unknown" };
  return `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.color}`;
};

export default function DashboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<Inspection[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listEntries(),
      getDashboard(),
    ])
      .then(([entriesData, dashData]) => {
        if (entriesData) setEntries(entriesData);
        if (dashData) setDashboard(dashData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const summary = dashboard?.summary;

  return (
    <div className="flex-1">
      <div className="border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overview of inspection activity
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Batches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.total_batches ?? entries.length}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(summary?.total_pages ?? 0).toLocaleString()} total pages
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <AlertCircle className="size-3.5 text-amber-500" />
                Needs Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.review_pages ?? entries.filter((e) => e.needs_review).length}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {summary?.batches_needing_review ?? 0} batches affected
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-green-500" />
                Verified Pages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.verified_pages?.toLocaleString() ?? 0}
              </div>
              {summary?.average_confidence != null && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {summary.average_confidence.toFixed(1)}% avg confidence
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Layers className="size-3.5 text-blue-500" />
                Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.batches_today ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {summary?.pages_processed_today ?? 0} pages processed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Bar */}
        <div className="flex gap-3">
          <Button onClick={() => router.push("/upload")}>
            <Upload className="mr-1.5 size-4" />
            Upload PDF
          </Button>
          <Button variant="outline" onClick={() => router.push("/batches")}>
            <Layers className="mr-1.5 size-4" />
            View Batches
          </Button>
          <Button variant="outline" onClick={() => window.open(getLegacyExportUrl(), "_blank")}>
            <FileSpreadsheet className="mr-1.5 size-4" />
            Export All
          </Button>
        </div>

        {/* Recent Inspections Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="size-4 text-amber-600" />
              Recent Inspections
            </CardTitle>
            <CardDescription>
              View and manage processed inspection sheets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading...
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Upload className="mb-4 size-12 text-muted-foreground/40" />
                <p className="text-lg font-medium">No inspections yet</p>
                <p className="text-sm mt-1 text-center">
                  Upload your first inspection sheet to get started.
                </p>
                <Button className="mt-6" onClick={() => router.push("/upload")}>
                  <Upload className="mr-2 size-4" />
                  Upload Inspection Sheet
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch</TableHead>
                        <TableHead>Tractor No</TableHead>
                        <TableHead>Defects</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.slice(0, 20).map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            #{entry.batch_id}
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            {entry.tractor_no || "\u2014"}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {entry.defects?.map((d) => d.text).join("; ") || "\u2014"}
                          </TableCell>
                          <TableCell>
                            <span className={statusBadge(entry.status)}>
                              {entry.status ?? "Unknown"}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {entry.date || "\u2014"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/verify/${entry.id}`)}>
                              <Eye className="mr-1 size-4" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {entries.slice(0, 10).map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border bg-card p-5 space-y-3 active:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/verify/${entry.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-lg tracking-tight">
                          {entry.tractor_no || "\u2014"}
                        </span>
                        <span className={statusBadge(entry.status)}>
                          {entry.status ?? "Unknown"}
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {entry.defects?.map((d, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                            <span className="text-amber-600 mt-0.5 shrink-0">\u2022</span>
                            <span>{d.text}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-muted-foreground">
                          {entry.date || "\u2014"} &middot; Batch #{entry.batch_id}
                        </span>
                        <span className="flex items-center gap-1 text-sm font-medium text-amber-600">
                          View
                          <ChevronRight className="size-4" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
