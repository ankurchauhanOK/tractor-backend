"use client";

import { useState, useRef, useEffect, type DragEvent } from "react";
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
import { uploadPdf } from "@/lib/api";
import { toast } from "sonner";
import {
  Upload,
  FileImage,
  Loader2,
  Scan,
  Camera,
} from "lucide-react";
import { CameraCapture } from "@/components/camera-capture";

type Mode = "upload" | "camera";

export default function UploadPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    previewRef.current = preview;
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, [preview]);

  const MAX_SIZE = 500 * 1024 * 1024;

  function handleFile(file: File) {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Please select an image or PDF file.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("File exceeds 500 MB limit.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleCameraCapture(capturedFile: File) {
    if (capturedFile.size > MAX_SIZE) {
      toast.error("Captured image exceeds 500 MB limit.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(capturedFile);
    setPreview(URL.createObjectURL(capturedFile));
  }

  function handleRetake() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
  }

  function switchMode(newMode: Mode) {
    setMode(newMode);
    if (newMode === "upload") {
      if (preview) URL.revokeObjectURL(preview);
      setFile(null);
      setPreview(null);
    }
  }

  async function handleProcess() {
    if (!file) {
      toast.error("Please select an image first.");
      return;
    }
    setProcessing(true);
    try {
      const result = await uploadPdf(file);
      if (!result) {
        toast.error("Backend unavailable. Please try again.");
        return;
      }
      toast.success(`Batch ${result.batch_no} created with ${result.total_pages} pages!`);
      router.push(`/batches/${result.batch_id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to process image."
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex-1">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight">Upload Sheet</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload or capture an inspection sheet for OCR processing
        </p>
      </div>

      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6 flex rounded-lg border p-1 bg-muted">
          <button
            onClick={() => switchMode("upload")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mode === "upload"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="size-4" />
            Upload Image
          </button>
          <button
            onClick={() => switchMode("camera")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mode === "camera"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Camera className="size-4" />
            Use Camera
          </button>
        </div>

        {mode === "upload" ? (
          <Card>
            <CardHeader>
              <CardTitle>Select Image</CardTitle>
              <CardDescription>
                Drag & drop an inspection sheet image, or click to browse.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
                  dragOver
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                    : "border-border bg-background hover:border-muted-foreground/30"
                }`}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-80 rounded-lg object-contain"
                  />
                ) : (
                  <>
                    <FileImage className="mb-4 size-16 text-muted-foreground/40" />
                    <p className="text-lg font-medium text-muted-foreground">
                      Drag image here
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">or</p>
                    <Button variant="outline" className="mt-3" type="button">
                      Browse File
                    </Button>
                  </>
                )}
                <Input
                  ref={inputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>

              {file && (
                <div className="text-sm text-muted-foreground">
                  Selected: <span className="font-medium">{file.name}</span> (
                  {(file.size / 1024).toFixed(1)} KB)
                </div>
              )}

              <Button
                size="lg"
                className="w-full"
                disabled={!file || processing}
                onClick={handleProcess}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 size-5 animate-spin" />
                    Processing with OCR...
                  </>
                ) : (
                  <>
                    <Scan className="mr-2 size-5" />
                    Process with OCR
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Capture with Camera</CardTitle>
              <CardDescription>
                Position the inspection sheet in front of the camera and capture.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {preview ? (
                <>
                  <img
                    src={preview}
                    alt="Captured"
                    className="max-h-80 w-full rounded-lg object-contain"
                  />
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1"
                      onClick={handleRetake}
                    >
                      Retake
                    </Button>
                    <Button
                      size="lg"
                      className="flex-1"
                      disabled={processing}
                      onClick={handleProcess}
                    >
                      {processing ? (
                        <>
                          <Loader2 className="mr-2 size-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Scan className="mr-2 size-5" />
                          Process with OCR
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <CameraCapture
                  onCapture={handleCameraCapture}
                  onRetake={handleRetake}
                  processing={processing}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
