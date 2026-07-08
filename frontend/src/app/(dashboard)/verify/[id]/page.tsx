"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { VoiceInput } from "@/components/VoiceInput";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getEntry,
  updateEntry,
  deleteEntry,
  type Inspection,
  type DefectItem,
} from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft,
  Trash2,
  Plus,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Expand,
  X,
  CheckCircle2,
  Scan,
} from "lucide-react";

const IMAGE_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace("/api", "");

function imageUrl(path: string | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${IMAGE_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

export default function VerifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [entry, setEntry] = useState<Inspection | null>(null);
  const [tractorNo, setTractorNo] = useState("");
  const [defects, setDefects] = useState<DefectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [date, setDate] = useState("");
  const [shift, setShift] = useState("A");
  const [lineNo, setLineNo] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [finalVerifiedBy, setFinalVerifiedBy] = useState("");
  const [status, setStatus] = useState("uploaded");

  useEffect(() => {
    getEntry(Number(id))
      .then((data) => {
        if (!data) {
          toast.error("Inspection not found");
          router.push("/");
          return;
        }
        setEntry(data);
        setTractorNo(data.tractor_no);
        setDefects(
          data.defects?.length
            ? data.defects
            : [{ text: "", verified: false }]
        );
        setDate(data.date || new Date().toISOString().split("T")[0]);
        setShift(data.shift || "A");
        setLineNo(data.line_no || "");
        setVerifiedBy(data.verified_by || "");
        setFinalVerifiedBy(data.final_verified_by || "");
        setStatus(data.status || "uploaded");
      })
      .catch(() => {
        toast.error("Failed to load inspection");
        router.push("/");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  function updateDefect(index: number, text: string) {
    setDefects((prev) =>
      prev.map((d, i) => (i === index ? { ...d, text } : d))
    );
  }

  function addDefect() {
    setDefects((prev) => [...prev, { text: "", verified: false }]);
  }

  function removeDefect(index: number) {
    setDefects((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const filtered = defects.filter((d) => d.text.trim());
      const nextStatus = status === "uploaded" || status === "ocr_completed" || status === "needs_review" ? "verified" : status;
      const updated = await updateEntry(Number(id), {
        tractor_no: tractorNo,
        defects: filtered,
        date,
        shift,
        line_no: lineNo,
        verified_by: verifiedBy,
        final_verified_by: finalVerifiedBy,
        status: nextStatus,
      });
      setEntry(updated);
      setStatus(nextStatus);
      toast.success("Inspection verified successfully!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save inspection."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteEntry(Number(id));
      toast.success("Inspection deleted.");
      router.push("/");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete inspection."
      );
    }
  }

  function zoomIn() {
    setZoom((z) => Math.min(z + 0.25, 3));
  }

  function zoomOut() {
    setZoom((z) => Math.max(z - 0.25, 0.5));
  }

  function rotateImage() {
    setRotation((r) => (r + 90) % 360);
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="border-b px-6 py-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Verify Defects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and correct OCR-extracted defects
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => router.push("/")}>
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={handleDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid gap-6 xl:grid-cols-2 max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Original Image</CardTitle>
              <CardDescription>
                The uploaded inspection sheet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative flex items-center justify-center overflow-hidden rounded-lg border bg-muted/30"
                   style={{ height: "clamp(300px, 50vh, 520px)" }}>
                {entry?.image_path_original || entry?.image_path_enhanced ? (
                  <img
                    src={imageUrl(entry.image_path_enhanced || entry.image_path_original)}
                    alt="Inspection sheet"
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transition: "transform 0.2s ease",
                    }}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Scan className="size-8 text-muted-foreground/40" />
                    <p className="text-sm">No inspection sheet image</p>
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={zoomOut} disabled={zoom <= 0.5}>
                  <ZoomOut className="size-4" />
                </Button>
                <span className="w-12 text-center text-sm font-medium tabular-nums text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
                <Button variant="outline" size="sm" onClick={zoomIn} disabled={zoom >= 3}>
                  <ZoomIn className="size-4" />
                </Button>
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={rotateImage}>
                  <RotateCw className="size-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setFullscreenOpen(true)}>
                  <Expand className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Extracted Details</CardTitle>
                <CardDescription>
                  Review and edit the information extracted from the sheet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label>Tractor ID *</Label>
                  <VoiceInput
                    value={tractorNo}
                    onChange={setTractorNo}
                    placeholder="Auto-detected tractor number"
                    className="font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Date *</Label>
                  <Input
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Shift</Label>
                  <div className="flex gap-1">
                    {["A", "B", "C"].map((s) => (
                      <Button
                        key={s}
                        variant={shift === s ? "default" : "outline"}
                        onClick={() => setShift(s)}
                        className="flex-1"
                        size="lg"
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uploaded">Uploaded</SelectItem>
                    <SelectItem value="ocr_completed">OCR Completed</SelectItem>
                    <SelectItem value="needs_review">Needs Review</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Line No</Label>
                  <Input
                    value={lineNo}
                    onChange={(e) => setLineNo(e.target.value)}
                    placeholder="e.g. L1"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Verified By</Label>
                  <VoiceInput
                    value={verifiedBy}
                    onChange={setVerifiedBy}
                    placeholder="Employee name"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Final Verified By</Label>
                  <VoiceInput
                    value={finalVerifiedBy}
                    onChange={setFinalVerifiedBy}
                    placeholder="Supervisor name"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Defects</CardTitle>
                <CardDescription>
                  Edit the defects detected from the inspection sheet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {defects.map((defect, index) => (
                  <div
                    key={index}
                    className="rounded-lg border p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Label className="text-amber-600 font-semibold">
                        Defect #{index + 1}
                      </Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDefect(index)}
                        disabled={defects.length === 1}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    <VoiceInput
                      value={defect.text}
                      onChange={(val) => updateDefect(index, val)}
                      onEmptyField={(transcript) => {
                        updateDefect(index, transcript);
                        addDefect();
                      }}
                      placeholder={`Describe defect #${index + 1}...`}
                    />
                  </div>
                ))}
                <Button variant="outline" onClick={addDefect} className="w-full">
                  <Plus className="mr-2 size-4" />
                  Add New Defect
                </Button>
              </CardContent>
            </Card>

            {entry?.raw_text && (
              <details className="text-sm text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">
                  Raw OCR output
                </summary>
                <pre className="mt-2 rounded-lg bg-muted/30 p-3 text-xs whitespace-pre-wrap border">
                  {entry.raw_text}
                </pre>
              </details>
            )}

            <Button
              size="lg"
              className="w-full"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 size-5" />
                  VERIFY & SAVE
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh]">
          <DialogHeader>
            <DialogTitle>Inspection Sheet — Full View</DialogTitle>
          </DialogHeader>
          {entry?.image_path_original || entry?.image_path_enhanced ? (
            <div className="flex items-center justify-center overflow-auto max-h-[80vh]">
              <img
                src={imageUrl(entry.image_path_enhanced || entry.image_path_original)}
                alt="Inspection sheet"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p className="text-sm">No inspection sheet image</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
