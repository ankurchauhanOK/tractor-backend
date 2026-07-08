"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCw, Scan, Loader2 } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onRetake?: () => void;
  processing?: boolean;
}

export function CameraCapture({ onCapture, onRetake, processing }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async (mode: "environment" | "user") => {
    stopCamera();
    setError(null);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError("Camera access denied or unavailable. Please use image upload instead.");
    }
  }, []);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  useEffect(() => {
    startCamera(facingMode);
    return () => stopCamera();
  }, [facingMode, startCamera]);

  function handleVideoReady() {
    setCameraReady(true);
  }

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const blobUrl = canvas.toDataURL("image/jpeg", 0.95);
    setCapturedImage(blobUrl);
    stopCamera();

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
      }
    }, "image/jpeg", 0.95);
  }

  function handleRetake() {
    setCapturedImage(null);
    onRetake?.();
    startCamera(facingMode);
  }

  function handleSwitchCamera() {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-red-300 bg-red-50 p-12">
        <Camera className="mb-4 h-12 w-12 text-red-400" />
        <p className="text-center text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (capturedImage) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="relative flex items-center justify-center overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          onCanPlay={handleVideoReady}
          className={`w-full max-h-[400px] object-contain ${cameraReady ? "opacity-100" : "opacity-0"}`}
        />
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleSwitchCamera} disabled={!cameraReady} className="flex-1">
          <RotateCw className="mr-2 h-4 w-4" />
          Switch Camera
        </Button>
        <Button onClick={handleCapture} disabled={!cameraReady || processing} className="flex-1">
          {processing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Camera className="mr-2 h-4 w-4" />
          )}
          Capture Photo
        </Button>
      </div>
    </div>
  );
}
