"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  getEntry,
  updateEntry,
  listEntries,
  type Inspection,
  type DefectItem,
} from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Expand,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Save,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Scan,
  AlertCircle,
  RotateCcw,
  RefreshCw,
  GripHorizontal,
  FileText,
} from "lucide-react";

const IMAGE_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace("/api", "");

function imageUrl(path: string | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${IMAGE_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

function confColor(score: number | undefined | null): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 0.9) return "text-green-600";
  if (score >= 0.7) return "text-amber-600";
  return "text-red-600";
}

function confBg(score: number | undefined | null): string {
  if (score == null) return "";
  if (score >= 0.9) return "bg-green-50 dark:bg-green-950/20";
  if (score >= 0.7) return "bg-amber-50 dark:bg-amber-950/20";
  return "bg-red-50 dark:bg-red-950/20";
}

const FIELD_LABELS: Record<string, string> = {
  tractor_no: "Tractor No",
  engine_no: "Engine No",
  chassis_no: "Chassis No",
  inspector: "Inspector",
  date: "Date",
  shift: "Shift",
  line_no: "Line No",
};

export default function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  // Data
  const [entry, setEntry] = useState<Inspection | null>(null);
  const [batchPages, setBatchPages] = useState<Inspection[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editing
  const [tractorNo, setTractorNo] = useState("");
  const [engineNo, setEngineNo] = useState("");
  const [chassisNo, setChassisNo] = useState("");
  const [inspector, setInspector] = useState("");
  const [date, setDate] = useState("");
  const [shift, setShift] = useState("A");
  const [lineNo, setLineNo] = useState("");
  const [defects, setDefects] = useState<DefectItem[]>([]);
  const [status, setStatus] = useState<string>("uploaded");
  const [needsReview, setNeedsReview] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);

  // Image viewer
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [fitToScreen, setFitToScreen] = useState(true);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fetch inspection + batch siblings
  const fetchInspection = useCallback(async (inspectionId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEntry(inspectionId);
      if (!data) {
        setError("Inspection not found.");
        return;
      }
      setEntry(data);
      populateForm(data);
      setStatus(data.status || "uploaded");
      setNeedsReview(data.needs_review ?? false);

      // Fetch batch siblings
      const all = await listEntries();
      if (all) {
        const siblings = all.filter((e) => e.batch_id === data.batch_id)
          .sort((a, b) => (a.batch_page_index ?? 0) - (b.batch_page_index ?? 0));
        setBatchPages(siblings);
        const idx = siblings.findIndex((e) => e.id === inspectionId);
        setCurrentIndex(idx);
      }
    } catch {
      setError("Failed to load inspection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInspection(Number(id));
  }, [id, fetchInspection]);

  function isFieldLowConf(field: string): boolean {
    if (!entry?.confidence_scores) return false;
    const score = entry.confidence_scores[field];
    return score != null && score < 0.7;
  }

  function getFieldConfidence(field: string): number | null {
    return entry?.confidence_scores?.[field] ?? null;
  }

  function populateForm(data: Inspection) {
    setTractorNo(data.tractor_no || "");
    setEngineNo(data.engine_no || "");
    setChassisNo(data.chassis_no || "");
    setInspector(data.inspector || "");
    setDate(data.date || "");
    setShift(data.shift || "A");
    setLineNo(data.line_no || "");
    setDefects(data.defects?.length ? data.defects : [{ text: "", verified: false }]);
    setDirty(false);
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setSelectedField(null);
    setFitToScreen(true);
  }

  function getCurrentValues(): Record<string, string> {
    return { tractor_no: tractorNo, engine_no: engineNo, chassis_no: chassisNo, inspector, date, shift, line_no: lineNo };
  }

  function hasChanges(): boolean {
    if (!entry) return false;
    const vals = getCurrentValues();
    return (
      vals.tractor_no !== (entry.tractor_no || "") ||
      vals.engine_no !== (entry.engine_no || "") ||
      vals.chassis_no !== (entry.chassis_no || "") ||
      vals.inspector !== (entry.inspector || "") ||
      vals.date !== (entry.date || "") ||
      vals.shift !== (entry.shift || "A") ||
      vals.line_no !== (entry.line_no || "") ||
      JSON.stringify(defects) !== JSON.stringify(entry.defects || [{ text: "", verified: false }])
    );
  }

  function markDirty() {
    setDirty(hasChanges());
  }

  function updateDefect(index: number, text: string) {
    setDefects((prev) => prev.map((d, i) => (i === index ? { ...d, text } : d)));
    setTimeout(markDirty, 0);
  }

  function addDefect() {
    setDefects((prev) => [...prev, { text: "", verified: false }]);
    setTimeout(markDirty, 0);
  }

  function removeDefect(index: number) {
    setDefects((prev) => prev.filter((_, i) => i !== index));
    setTimeout(markDirty, 0);
  }

  // Auto-save
  useEffect(() => {
    if (!dirty || !entry) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => handleSave(true), 3000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [tractorNo, engineNo, chassisNo, inspector, date, shift, lineNo, defects, dirty, entry]);

  async function handleSave(isAuto = false) {
    if (!entry) return;
    if (!tractorNo.trim()) {
      if (!isAuto) toast.error("Tractor No is required.");
      return;
    }
    setSaving(true);
    try {
      const filtered = defects.filter((d) => d.text.trim());
      const updated = await updateEntry(entry.id, {
        tractor_no: tractorNo,
        engine_no: engineNo,
        chassis_no: chassisNo,
        inspector,
        date: date || undefined,
        shift,
        line_no: lineNo,
        defects: filtered,
        status,
      });
      if (updated) {
        setEntry(updated);
        setDirty(false);
        if (!isAuto) toast.success("Changes saved.");
      } else {
        if (!isAuto) toast.error("Failed to save.");
      }
    } catch {
      if (!isAuto) toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleVerify() {
    if (!entry) return;
    if (!tractorNo.trim()) {
      toast.error("Tractor No is required before verifying.");
      return;
    }
    setSaving(true);
    try {
      const filtered = defects.filter((d) => d.text.trim());
      const updated = await updateEntry(entry.id, {
        tractor_no: tractorNo,
        engine_no: engineNo,
        chassis_no: chassisNo,
        inspector,
        date: date || undefined,
        shift,
        line_no: lineNo,
        defects: filtered,
        status: "verified",
      });
      if (updated) {
        setEntry(updated);
        setStatus("verified");
        setNeedsReview(false);
        setDirty(false);
        toast.success("Marked as verified!");
      } else {
        toast.error("Failed to verify.");
      }
    } catch {
      toast.error("Failed to verify.");
    } finally {
      setSaving(false);
    }
  }

  async function handleNeedsReview() {
    if (!entry) return;
    setSaving(true);
    try {
      const updated = await updateEntry(entry.id, {
        status: "needs_review",
      });
      if (updated) {
        setEntry(updated);
        setStatus("needs_review");
        setNeedsReview(true);
        toast.success("Marked for review.");
      }
    } catch {
      toast.error("Failed to update.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!entry) return;
    setSaving(true);
    try {
      const updated = await updateEntry(entry.id, {
        status: "failed",
      });
      if (updated) {
        setEntry(updated);
        setStatus("failed");
        toast.success("Page rejected.");
      }
    } catch {
      toast.error("Failed to reject.");
    } finally {
      setSaving(false);
    }
  }

  // Navigation
  function goToPage(index: number) {
    if (index < 0 || index >= batchPages.length) return;
    const target = batchPages[index];
    router.push(`/review/${target.id}`);
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case "ArrowLeft": e.preventDefault(); goToPage(currentIndex - 1); break;
        case "ArrowRight": e.preventDefault(); goToPage(currentIndex + 1); break;
        case "+": case "=": e.preventDefault(); setZoom((z) => Math.min(z + 0.25, 4)); setFitToScreen(false); break;
        case "-": e.preventDefault(); setZoom((z) => Math.max(z - 0.25, 0.25)); setFitToScreen(false); break;
        case "r": e.preventDefault(); setRotation((r) => (r + 90) % 360); break;
        case "f": e.preventDefault(); setFitToScreen(true); setZoom(1); setRotation(0); setPan({ x: 0, y: 0 }); break;
        case "v": e.preventDefault(); if (dirty) handleSave(false).then(handleVerify); else handleVerify(); break;
        case "s": e.preventDefault(); handleSave(false); break;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, batchPages, zoom, rotation, dirty, tractorNo, engineNo, chassisNo, inspector, date, shift, lineNo, defects, status, entry]);

  // Image panning
  function onMouseDown(e: React.MouseEvent) {
    if (fitToScreen) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }

  function onMouseUp() {
    setIsPanning(false);
  }

  function onWheel(e: React.WheelEvent) {
    if (fitToScreen) setFitToScreen(false);
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.max(0.25, Math.min(4, z + delta)));
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="border-b px-6 py-4">
          <div className="h-6 w-48 rounded bg-muted animate-pulse" />
          <div className="h-4 w-32 rounded bg-muted animate-pulse mt-2" />
        </div>
        <div className="flex-1 grid grid-cols-[180px_1fr_380px] gap-0 p-0">
          <div className="border-r p-3 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-md bg-muted animate-pulse" />
            ))}
          </div>
          <div className="flex items-center justify-center bg-muted/20">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
          <div className="border-l p-4 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                <div className="h-8 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !entry) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 size-12 text-destructive" />
          <p className="text-lg font-medium">{error || "Inspection not found"}</p>
          <div className="flex gap-3 mt-6 justify-center">
            <Button variant="outline" onClick={() => router.push("/review")}>
              Back to Queue
            </Button>
            <Button onClick={() => fetchInspection(Number(id))}>
              <RefreshCw className="mr-2 size-4" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentPage = batchPages[currentIndex];
  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= batchPages.length - 1;

  return (
    <div className="flex-1 flex flex-col h-[calc(100dvh-3.5rem)]">
      {/* ─── Sticky Action Bar ─── */}
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 px-4 py-2 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => router.push("/review")}>
          <ArrowLeft className="mr-1 size-4" />
          Queue
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="size-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm truncate">{entry.tractor_no || "Unidentified"}</span>
          <Badge variant={status === "verified" ? "default" : status === "failed" ? "destructive" : status === "needs_review" ? "outline" : "secondary"} className="text-[10px] px-1.5 py-0">
            {status?.replace(/_/g, " ") || "Unknown"}
          </Badge>
        </div>
        <div className="flex-1" />
        {dirty && (
          <span className="text-xs text-amber-600 flex items-center gap-1">
            <AlertCircle className="size-3" />
            Unsaved changes
          </span>
        )}
        {saving && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" />
            Saving...
          </span>
        )}
        <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving || !dirty}>
          <Save className="mr-1 size-3.5" />
          Save
        </Button>
        <Button variant="default" size="sm" onClick={handleVerify} disabled={saving || !tractorNo.trim()}>
          <CheckCircle2 className="mr-1 size-3.5" />
          Verify
        </Button>
        <Button variant="outline" size="sm" onClick={handleNeedsReview} disabled={saving}>
          <AlertTriangle className="mr-1 size-3.5" />
          Review
        </Button>
        <Button variant="destructive" size="sm" onClick={handleReject} disabled={saving}>
          <XCircle className="mr-1 size-3.5" />
          Reject
        </Button>
      </div>

      {/* ─── Three-Column Layout ─── */}
      <div className="flex-1 grid grid-cols-[180px_1fr_380px] overflow-hidden">
        {/* ── Left: Page Navigator ── */}
        <div className="border-r overflow-y-auto bg-muted/20 p-2 space-y-2">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-xs font-medium text-muted-foreground">Pages</span>
            <span className="text-[10px] text-muted-foreground">{currentIndex + 1}/{batchPages.length}</span>
          </div>
          {batchPages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => goToPage(i)}
              className={`w-full rounded-lg border p-2 text-left transition-colors ${
                i === currentIndex
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-600"
                  : "border-border hover:bg-muted"
              } ${p.status === "verified" ? "opacity-60" : ""}`}
            >
              <div className="aspect-[3/4] rounded bg-muted mb-1 flex items-center justify-center overflow-hidden">
                {p.image_path_enhanced || p.image_path_original ? (
                  <img
                    src={imageUrl(p.image_path_enhanced || p.image_path_original)}
                    alt={`Page ${p.page_number}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Scan className="size-4 text-muted-foreground/40" />
                )}
              </div>
              <div className="text-[10px] font-medium truncate">
                {p.tractor_no || `Page ${p.page_number}`}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                {p.status === "verified" && <CheckCircle2 className="size-2.5 text-green-500" />}
                {p.needs_review && <AlertTriangle className="size-2.5 text-amber-500" />}
                {p.status === "failed" && <XCircle className="size-2.5 text-red-500" />}
                <span className="text-[10px] text-muted-foreground">{p.status?.replace(/_/g, " ")}</span>
              </div>
            </button>
          ))}
        </div>

        {/* ── Center: Image Viewer ── */}
        <div
          ref={imageContainerRef}
          className="relative overflow-hidden bg-muted/30 flex items-center justify-center"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
          style={{ cursor: isPanning ? "grabbing" : fitToScreen ? "default" : "grab" }}
        >
          {entry.image_path_enhanced || entry.image_path_original ? (
            <img
              src={imageUrl(entry.image_path_enhanced || entry.image_path_original)}
              alt="Inspection sheet"
              className="max-w-full max-h-full object-contain transition-transform duration-150"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              }}
              draggable={false}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Scan className="size-12 text-muted-foreground/30" />
              <p className="text-sm">No image available</p>
            </div>
          )}

          {/* Image controls overlay */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-lg border bg-background/90 backdrop-blur px-2 py-1.5 shadow-xs">
            <Button variant="ghost" size="icon-xs" onClick={() => { setZoom((z) => Math.max(z - 0.25, 0.25)); setFitToScreen(false); }}>
              <ZoomOut className="size-3.5" />
            </Button>
            <span className="text-xs tabular-nums w-10 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon-xs" onClick={() => { setZoom((z) => Math.min(z + 0.25, 4)); setFitToScreen(false); }}>
              <ZoomIn className="size-3.5" />
            </Button>
            <Separator orientation="vertical" className="h-4" />
            <Button variant="ghost" size="icon-xs" onClick={() => setRotation((r) => (r + 90) % 360)}>
              <RotateCw className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={() => { setFitToScreen(true); setZoom(1); setRotation(0); setPan({ x: 0, y: 0 }); }}>
              <Expand className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Right: Verification Panel ── */}
        <div className="border-l overflow-y-auto bg-background">
          <div className="p-4 space-y-5">
            {/* Page navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={isFirst} onClick={() => goToPage(currentIndex - 1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="flex-1 text-center text-sm text-muted-foreground">
                Page {currentIndex + 1} of {batchPages.length}
              </span>
              <Button variant="outline" size="sm" disabled={isLast} onClick={() => goToPage(currentIndex + 1)}>
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <Separator />

            {/* Fields */}
            <div className="space-y-4">
              {["tractor_no", "engine_no", "chassis_no", "inspector", "date", "shift", "line_no"].map((field) => {
                const conf = getFieldConfidence(field);
                const low = isFieldLowConf(field);
                const val = getCurrentValues()[field];
                return (
                  <div
                    key={field}
                    className={`space-y-1.5 rounded-lg p-3 -mx-1 transition-colors ${
                      selectedField === field ? "ring-1 ring-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10" : ""
                    } ${low ? confBg(conf) : ""}`}
                    onClick={() => setSelectedField(field)}
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">{FIELD_LABELS[field]}</label>
                      <span className={`text-[10px] font-medium ${confColor(conf)}`}>
                        {conf != null ? `${Math.round(conf * 100)}%` : "\u2014"}
                      </span>
                    </div>
                    {low && entry?.confidence_scores && (
                      <p className="text-[10px] text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="size-2.5" />
                        OCR: &ldquo;{(entry as any)[`${field}_original`] || entry[field as keyof Inspection] || ""}&rdquo;
                      </p>
                    )}
                    <Input
                      value={val}
                      onChange={(e) => {
                        const setters: Record<string, (v: string) => void> = {
                          tractor_no: setTractorNo, engine_no: setEngineNo,
                          chassis_no: setChassisNo, inspector: setInspector,
                          date: setDate, shift: setShift, line_no: setLineNo,
                        };
                        setters[field]?.(e.target.value);
                        markDirty();
                      }}
                      className={low ? "border-amber-400 focus-visible:border-amber-500" : ""}
                      placeholder={`Enter ${FIELD_LABELS[field].toLowerCase()}...`}
                    />
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Defects */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Defects</span>
                <span className="text-[10px] text-muted-foreground">{defects.filter((d) => d.text.trim()).length} total</span>
              </div>
              {defects.map((defect, index) => (
                <div key={index} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-amber-600">Defect #{index + 1}</span>
                    <Button variant="ghost" size="icon-xs" onClick={() => removeDefect(index)} disabled={defects.length === 1}>
                      <X className="size-3" />
                    </Button>
                  </div>
                  <Input
                    value={defect.text}
                    onChange={(e) => updateDefect(index, e.target.value)}
                    placeholder={`Describe defect #${index + 1}...`}
                  />
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={addDefect}>
                <Plus className="mr-1.5 size-3.5" />
                Add Defect
              </Button>
            </div>

            <Separator />

            {/* OCR Info */}
            <div className="space-y-2 text-xs text-muted-foreground">
              <h4 className="font-medium text-foreground">OCR Info</h4>
              <div className="flex justify-between">
                <span>Version</span>
                <span className="font-mono">{entry.ocr_version || "\u2014"}</span>
              </div>
              <div className="flex justify-between">
                <span>AI Model</span>
                <span className="font-mono">{entry.ai_version || "\u2014"}</span>
              </div>
              <div className="flex justify-between">
                <span>Retries</span>
                <span>{entry.retry_count}</span>
              </div>
              {entry.error_detail && (
                <div className="rounded bg-red-50 dark:bg-red-950/20 p-2 text-red-600 text-[10px]">
                  {entry.error_detail}
                </div>
              )}

              {/* Raw OCR toggle */}
              {entry.raw_text && (
                <details>
                  <summary className="cursor-pointer hover:text-foreground text-xs">Raw OCR output</summary>
                  <pre className="mt-1 rounded bg-muted p-2 text-[10px] whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {entry.raw_text}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
