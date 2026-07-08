"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("pwa-install-dismissed");
    if (stored) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Hide if already installed (standalone mode)
  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShow(false);
    }
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShow(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "true");
  }

  if (!show || dismissed) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t bg-white p-4 shadow-lg",
        "flex items-center justify-between gap-3",
        "animate-in slide-in-from-bottom"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-amber-600 flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium">Install Tractor OCR</p>
          <p className="text-xs text-muted-foreground">
            Add to your home screen for quick access
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={handleDismiss}>
          <X className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={handleInstall}>
          Install
        </Button>
      </div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
