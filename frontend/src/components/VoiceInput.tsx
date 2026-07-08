"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createSpeechService,
  isSpeechSupported,
  type SpeechRecognitionState,
} from "@/lib/speech";
import { toast } from "sonner";

interface VoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  onEmptyField?: (transcript: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function VoiceInput({
  value,
  onChange,
  onEmptyField,
  placeholder,
  className,
  disabled,
}: VoiceInputProps) {
  const [speechState, setSpeechState] = useState<SpeechRecognitionState>("idle");
  const [showSuccess, setShowSuccess] = useState(false);
  const serviceRef = useRef<ReturnType<typeof createSpeechService> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      serviceRef.current?.abort();
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const handleMicClick = useCallback(() => {
    if (disabled || !isSpeechSupported()) return;

    if (speechState === "recording") {
      serviceRef.current?.stop();
      return;
    }

    serviceRef.current?.abort();

    const service = createSpeechService({ language: "en-IN" });
    serviceRef.current = service;

    service.onStateChange = setSpeechState;

    service.onResult = (transcript) => {
      if (!value && onEmptyField) {
        onEmptyField(transcript);
      } else {
        onChange(transcript);
      }
      setShowSuccess(true);
      toast.success("Voice correction applied.");
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(
        () => setShowSuccess(false),
        1500
      );
    };

    service.onError = (msg) => toast.error(msg);

    service.start();
  }, [disabled, speechState, value, onChange, onEmptyField]);

  const isRecording = speechState === "recording";

  return (
    <div className={cn("relative", className)}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {!disabled && isSpeechSupported() && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7",
            isRecording && "text-red-500",
            showSuccess && "text-green-500"
          )}
          onClick={handleMicClick}
          title={
            isRecording
              ? "Tap to stop recording"
              : "Tap to speak a correction"
          }
        >
          {showSuccess ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Mic className={cn("h-4 w-4", isRecording && "animate-pulse")} />
          )}
        </Button>
      )}
    </div>
  );
}
