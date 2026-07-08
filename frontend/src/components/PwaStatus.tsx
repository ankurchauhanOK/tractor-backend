"use client";

import { useEffect } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";

export function PwaStatus() {
  const { isOnline, wasOffline } = useOnlineStatus();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  if (isOnline && !wasOffline) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-xs font-medium",
        isOnline
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      )}
    >
      {isOnline
        ? "Connection restored — all features available"
        : "You are offline — previously loaded inspections are still viewable"}
    </div>
  );
}
