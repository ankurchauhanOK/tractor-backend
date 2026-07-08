const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export type SpeechRecognitionState = "idle" | "recording";

export interface SpeechServiceConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface SpeechService {
  start: () => void;
  stop: () => void;
  abort: () => void;
  onResult: ((text: string) => void) | null;
  onError: ((error: string) => void) | null;
  onStateChange: ((state: SpeechRecognitionState) => void) | null;
}

function getSupportedMimeType(): string | null {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/wav",
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

export function isSpeechSupported(): boolean {
  return !!(
    typeof window !== "undefined" &&
    navigator.mediaDevices?.getUserMedia
  );
}

export function createSpeechService(
  config?: SpeechServiceConfig
): SpeechService {
  let state: SpeechRecognitionState = "idle";
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];

  const service: SpeechService = {
    onResult: null,
    onError: null,
    onStateChange: null,

    async start() {
      if (!isSpeechSupported()) {
        service.onError?.(
          "Voice recording is not supported in this browser."
        );
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        const msg =
          (err as DOMException).name === "NotAllowedError"
            ? "Microphone access denied. Please allow microphone permissions."
            : "No microphone found. Please check your device.";
        service.onError?.(msg);
        return;
      }

      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        service.onError?.("No supported audio format found in this browser.");
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
        return;
      }

      chunks = [];
      recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        state = "idle";
        service.onStateChange?.(state);

        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
          stream = null;
        }

        const blob = new Blob(chunks, { type: mimeType });
        chunks = [];

        if (blob.size === 0) {
          service.onError?.("No speech detected. Please try again.");
          return;
        }

        try {
          const formData = new FormData();
          formData.append(
            "file",
            blob,
            `recording.${mimeType.split("/")[1].split(";")[0] || "webm"}`
          );

          const res = await fetch(`${API_BASE}/speech-to-text`, {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            throw new Error(`Server error: ${res.status}`);
          }

          const data = await res.json();

          if (data.text) {
            service.onResult?.(data.text);
          } else {
            service.onError?.("No speech detected. Please try again.");
          }
        } catch {
          service.onError?.(
            "Failed to transcribe audio. Check your connection and try again."
          );
        }
      };

      recorder.onerror = () => {
        service.onError?.("Recording failed. Please try again.");
      };

      state = "recording";
      service.onStateChange?.(state);
      recorder.start();
    },

    stop() {
      if (recorder && recorder.state === "recording") {
        recorder.stop();
      }
    },

    abort() {
      if (recorder && recorder.state === "recording") {
        recorder.stop();
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
      chunks = [];
      state = "idle";
      service.onStateChange?.(state);
    },
  };

  return service;
}
