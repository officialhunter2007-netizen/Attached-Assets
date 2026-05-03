// Voice helpers for the teacher chat. TTS hits POST /api/ai/tts (cloud
// OpenAI TTS); the browser's native speechSynthesis is kept as a silent
// fallback when the network call fails. STT records via MediaRecorder
// and uploads to POST /api/ai/stt (Whisper).

let activeAudio: HTMLAudioElement | null = null;
let activeAbort: AbortController | null = null;
let activeListeners: Array<() => void> = [];

export function isSpeechSynthesisSupported(): boolean {
  // Always supported now: the cloud route is available to every user.
  return true;
}

function notifyEnded(): void {
  for (const l of activeListeners.splice(0)) {
    try { l(); } catch {}
  }
}

function fallbackToBrowserTts(text: string, opts?: { rate?: number; pitch?: number }): boolean {
  if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") return false;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ar-SA";
    utter.rate = opts?.rate ?? 1;
    utter.pitch = opts?.pitch ?? 1;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => /^ar(-|_)/i.test(v.lang)) || voices.find(v => /arabic/i.test(v.name));
    if (v) utter.voice = v;
    utter.onend = notifyEnded;
    utter.onerror = notifyEnded;
    window.speechSynthesis.speak(utter);
    return true;
  } catch {
    notifyEnded();
    return false;
  }
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  voice?: string;
  onPlay?: () => void;
  onEnd?: () => void;
  onError?: (msg: string) => void;
}

export function speakText(text: string, opts?: SpeakOptions): boolean {
  if (!text || typeof window === "undefined") return false;
  stopSpeaking();
  if (opts?.onEnd) activeListeners.push(opts.onEnd);

  const ctrl = new AbortController();
  activeAbort = ctrl;

  fetch("/api/ai/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ text, voice: opts?.voice ?? "nova" }),
    signal: ctrl.signal,
  })
    .then(async (resp) => {
      if (!resp.ok) {
        let detail = "";
        try { detail = (await resp.json())?.message || ""; } catch {}
        throw new Error(detail || `HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      activeAudio = audio;
      audio.playbackRate = opts?.rate ?? 1;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (activeAudio === audio) activeAudio = null;
        notifyEnded();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (activeAudio === audio) activeAudio = null;
        notifyEnded();
      };
      try {
        await audio.play();
        opts?.onPlay?.();
      } catch (playErr) {
        URL.revokeObjectURL(url);
        if (activeAudio === audio) activeAudio = null;
        opts?.onError?.(playErr instanceof Error ? playErr.message : "تعذّر تشغيل الصوت");
        notifyEnded();
      }
    })
    .catch((err: unknown) => {
      if (ctrl.signal.aborted) return;
      const fallback = fallbackToBrowserTts(text, { rate: opts?.rate, pitch: opts?.pitch });
      if (fallback) {
        opts?.onPlay?.();
      } else {
        opts?.onError?.(err instanceof Error ? err.message : "فشل تجهيز الصوت");
        notifyEnded();
      }
    });

  return true;
}

export function stopSpeaking(): void {
  if (activeAbort) {
    try { activeAbort.abort(); } catch {}
    activeAbort = null;
  }
  if (activeAudio) {
    try { activeAudio.pause(); } catch {}
    try { activeAudio.src = ""; } catch {}
    activeAudio = null;
  }
  if (typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined") {
    try { window.speechSynthesis.cancel(); } catch {}
  }
  notifyEnded();
}

export function isSpeaking(): boolean {
  if (activeAudio && !activeAudio.paused && !activeAudio.ended) return true;
  if (typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined") {
    try { return window.speechSynthesis.speaking; } catch { return false; }
  }
  return false;
}

export function isMediaRecorderSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    !!navigator?.mediaDevices?.getUserMedia
  );
}

// Legacy alias preserved for existing callsites.
export function isSpeechRecognitionSupported(): boolean {
  return isMediaRecorderSupported();
}

export interface RecognitionHandle {
  stop: () => void;
  cancel: () => void;
}

export interface RecognitionOptions {
  maxDurationMs?: number;
  onProgress?: (elapsedMs: number) => void;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (msg: string) => void;
  onEnd?: () => void;
  onUploading?: () => void;
}

// Best-effort fallback when the cloud STT call fails. Uses the browser's
// `webkitSpeechRecognition` (Chrome / Edge / Samsung) or the standard
// `SpeechRecognition` to capture a single Arabic utterance. Returns
// `true` if a recognition session was successfully started so the caller
// can suppress the "transcription failed" toast.
function tryBrowserSpeechRecognitionFallback(opts: RecognitionOptions): boolean {
  if (typeof window === "undefined") return false;
  const Ctor = (window as unknown as {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }).SpeechRecognition ?? (window as unknown as {
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }).webkitSpeechRecognition;
  if (!Ctor) return false;
  try {
    const rec = new Ctor();
    rec.lang = "ar-SA";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev: SpeechRecognitionEvent) => {
      const transcript = ev.results?.[0]?.[0]?.transcript?.trim() || "";
      if (transcript) opts.onResult(transcript, true);
    };
    rec.onerror = () => { /* silently swallow — we already fell back */ };
    rec.start();
    return true;
  } catch {
    return false;
  }
}

export function startRecognition(opts: RecognitionOptions): RecognitionHandle | null {
  if (!isMediaRecorderSupported()) {
    opts.onError?.("متصفّحك لا يدعم التسجيل الصوتي. جرّب Chrome أو Safari الحديث.");
    opts.onEnd?.();
    return null;
  }

  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let stopped = false;
  let cancelled = false;
  let progressTimer: ReturnType<typeof setInterval> | null = null;
  let maxTimer: ReturnType<typeof setTimeout> | null = null;
  const startedAt = Date.now();
  const chunks: Blob[] = [];
  const maxDurationMs = opts.maxDurationMs ?? 60_000;

  const cleanupStreams = () => {
    if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
    if (maxTimer) { clearTimeout(maxTimer); maxTimer = null; }
    try { stream?.getTracks().forEach(t => t.stop()); } catch {}
    stream = null;
  };

  const finishWithError = (msg: string) => {
    cleanupStreams();
    opts.onError?.(msg);
    opts.onEnd?.();
  };

  const handle: RecognitionHandle = {
    stop: () => {
      if (stopped) return;
      stopped = true;
      try { recorder?.stop(); } catch { finishWithError("تعذّر إيقاف التسجيل."); }
    },
    cancel: () => {
      if (stopped) return;
      stopped = true;
      cancelled = true;
      try { recorder?.stop(); } catch {}
      cleanupStreams();
      opts.onEnd?.();
    },
  };

  const preferred = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/aac",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  const supported = preferred.find(
    (t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t),
  );

  navigator.mediaDevices
    .getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
    .then((s) => {
      // If toggle-off raced ahead of getUserMedia, drop the stream and bail.
      if (cancelled || stopped) {
        try { s.getTracks().forEach(t => t.stop()); } catch {}
        if (stopped && !cancelled) {
          opts.onError?.("تم إلغاء التسجيل قبل أن يبدأ الميكروفون.");
        }
        opts.onEnd?.();
        return;
      }
      stream = s;
      try {
        recorder = supported ? new MediaRecorder(s, { mimeType: supported }) : new MediaRecorder(s);
      } catch (err) {
        finishWithError(err instanceof Error ? err.message : "فشل بدء التسجيل.");
        return;
      }

      recorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onerror = (ev: Event) => {
        const e = (ev as Event & { error?: { message?: string } }).error;
        finishWithError(e?.message || "حدث خطأ في التسجيل.");
      };
      recorder.onstop = () => {
        cleanupStreams();
        if (cancelled) return;
        // Some Safari versions return an empty mimeType on the recorder
        // instance; fall back to the type we asked for, then to a sane
        // default so the upload always carries a recognised audio MIME.
        let mime = (recorder?.mimeType || "").trim() || supported || "audio/webm";
        if (!/^audio\//i.test(mime)) mime = "audio/webm";
        const blob = new Blob(chunks, { type: mime });
        if (blob.size === 0) {
          opts.onError?.("لم يتم تسجيل أي صوت — تأكد من السماح بالميكروفون.");
          opts.onEnd?.();
          return;
        }
        opts.onUploading?.();
        const fd = new FormData();
        const ext = mime.includes("mp4") || mime.includes("aac") || mime.includes("m4a") ? "m4a"
          : mime.includes("ogg") ? "ogg"
          : mime.includes("wav") ? "wav"
          : mime.includes("mpeg") || mime.includes("mp3") ? "mp3"
          : "webm";
        fd.append("audio", blob, `recording.${ext}`);

        fetch("/api/ai/stt", { method: "POST", body: fd, credentials: "include" })
          .then(async (resp) => {
            if (!resp.ok) {
              let detail = "";
              try { detail = (await resp.json())?.message || ""; } catch {}
              throw new Error(detail || `HTTP ${resp.status}`);
            }
            return resp.json();
          })
          .then((data: { text?: string }) => {
            const text = (data?.text || "").toString().trim();
            if (!text) {
              opts.onError?.("لم يتعرّف النظام على أي كلام في التسجيل.");
            } else {
              opts.onResult(text, true);
            }
            opts.onEnd?.();
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : "تعذّر تحويل الصوت إلى نص.";
            // Last-resort: try the browser's native SpeechRecognition so
            // the user still gets a transcript even if the cloud route
            // is down or the audio MIME was rejected.
            const fellBack = tryBrowserSpeechRecognitionFallback(opts);
            if (!fellBack) opts.onError?.(msg);
            opts.onEnd?.();
          });
      };

      try {
        recorder.start();
      } catch (err) {
        finishWithError(err instanceof Error ? err.message : "فشل بدء التسجيل.");
        return;
      }

      if (opts.onProgress) {
        progressTimer = setInterval(() => {
          opts.onProgress!(Date.now() - startedAt);
        }, 250);
      }
      maxTimer = setTimeout(() => {
        if (!stopped) handle.stop();
      }, maxDurationMs);
    })
    .catch((err: unknown) => {
      const e = err as { name?: string; code?: string; message?: string };
      const code = e?.name || e?.code || "";
      const msg = code === "NotAllowedError" || code === "PermissionDeniedError"
        ? "تم رفض الإذن للوصول إلى الميكروفون. فعّله من إعدادات المتصفح."
        : code === "NotFoundError"
          ? "لم يُعثر على ميكروفون متّصل."
          : (e?.message || "تعذّر فتح الميكروفون.");
      finishWithError(msg);
    });

  return handle;
}
