import { useRef, useState, useCallback } from "react";

export type RecorderStatus = "idle" | "requesting" | "recording" | "stopped" | "error";

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export function useLiveRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeTypeRef = useRef("");

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setStatus("requesting");
    setErrorMsg("");
    setRecordedFile(null);
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      setErrorMsg("Microphone access denied. Please allow microphone access and try again.");
      setStatus("error");
      return;
    }

    streamRef.current = stream;
    const mimeType = getSupportedMimeType();
    mimeTypeRef.current = mimeType;

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      const mt = mimeTypeRef.current || "audio/webm";
      const ext = mt.includes("webm") ? "webm" : mt.includes("ogg") ? "ogg" : "m4a";
      const blob = new Blob(chunksRef.current, { type: mt });
      const file = new File([blob], `live-session-${Date.now()}.${ext}`, { type: mt });
      setRecordedFile(file);
      setStatus("stopped");
    };

    // Flush a chunk every 10 s so memory pressure stays flat for long sessions
    recorder.start(10_000);
    setStatus("recording");
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1_000);
  }, []);

  const reset = useCallback(() => {
    stop();
    setRecordedFile(null);
    setElapsedSeconds(0);
    setStatus("idle");
    chunksRef.current = [];
  }, [stop]);

  return { status, elapsedSeconds, recordedFile, errorMsg, start, stop, reset };
}
