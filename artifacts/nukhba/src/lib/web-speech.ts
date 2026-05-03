// Voice helpers for the teacher chat. As of May 2026 both directions are
// served by cloud OpenAI APIs through the api-server (POST /api/voice/tts
// and /api/voice/stt). The browser's native Web Speech API is kept ONLY as
// a silent fallback for TTS when the network call fails — it is no longer
// used for STT at all because its in-browser quality (especially Arabic +
// embedded English technical terms) was the source of repeated user
// complaints, and it doesn't work on Firefox / Samsung Internet / in-app
// browsers.

// ──────────────────────────────────────────────────────────────────────────
// TTS — text → audio playback
// ──────────────────────────────────────────────────────────────────────────

let activeAudio: HTMLAudioElement | null = null;
let activeAbort: AbortController | null = null;
let activeListeners: Array<() => void> = [];

export function isSpeechSynthesisSupported(): boolean {
  // We always support TTS now — the cloud route is available to every
  // logged-in user. The legacy callsites still ask this question to decide
  // whether to render the speaker button, so keep it returning true.
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
  onEnd?: () => void;
  onError?: (msg: string) => void;
}

/**
 * Speak `text` aloud via the cloud TTS endpoint. Returns `true` if a
 * playback attempt was kicked off (the audio is fetched + played
 * asynchronously). Any in-flight playback is cancelled first.
 *
 * Falls back to the native `speechSynthesis` API only when the network
 * call fails (offline, 503, etc.) so the speaker button still produces
 * something audible instead of silently doing nothing.
 */
export function speakText(text: string, opts?: SpeakOptions): boolean {
  if (!text || typeof window === "undefined") return false;
  stopSpeaking();
  if (opts?.onEnd) activeListeners.push(opts.onEnd);

  const ctrl = new AbortController();
  activeAbort = ctrl;

  fetch("/api/voice/tts", {
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
      } catch (playErr: any) {
        // Autoplay blocked or other playback issue.
        URL.revokeObjectURL(url);
        if (activeAudio === audio) activeAudio = null;
        opts?.onError?.(playErr?.message || "تعذّر تشغيل الصوت");
        notifyEnded();
      }
    })
    .catch((err) => {
      if (ctrl.signal.aborted) return;
      // Network or server failure → degrade to browser TTS so the user
      // still hears something, even if it's the lower-quality voice.
      const fallback = fallbackToBrowserTts(text, { rate: opts?.rate, pitch: opts?.pitch });
      if (!fallback) {
        opts?.onError?.(err?.message || "فشل تجهيز الصوت");
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

// ──────────────────────────────────────────────────────────────────────────
// STT — microphone → cloud transcription
// ──────────────────────────────────────────────────────────────────────────

export function isMediaRecorderSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    !!navigator?.mediaDevices?.getUserMedia
  );
}

// Legacy alias kept so `subject.tsx` doesn't have to change its
// rendering condition. We now answer "yes" whenever the modern
// `MediaRecorder` API is present — i.e. on every modern Chrome / Safari
// / Firefox / Samsung browser, including the in-app webviews that the
// previous `webkitSpeechRecognition` check was excluding.
export function isSpeechRecognitionSupported(): boolean {
  return isMediaRecorderSupported();
}

export interface RecognitionHandle {
  /** Stop recording, upload the audio, and emit the final transcript. */
  stop: () => void;
  /** Force-cancel without sending audio (e.g. component unmount). */
  cancel: () => void;
}

export interface RecognitionOptions {
  /** Hard cap on recording length, in milliseconds. Defaults to 60 s. */
  maxDurationMs?: number;
  /**
   * Called repeatedly while the audio is being captured / uploaded with
   * the elapsed millisecond count. Lets the UI render a live counter
   * without re-implementing its own timer.
   */
  onProgress?: (elapsedMs: number) => void;
  /** Called when transcription finishes successfully. `isFinal` is always true. */
  onResult: (transcript: string, isFinal: boolean) => void;
  /** Called on permission denial, network failure, server error, etc. */
  onError?: (msg: string) => void;
  /** Always called after stop/cancel/error so callers can reset UI state. */
  onEnd?: () => void;
  /** Lifecycle hook fired once the upload starts (mic stream closed). */
  onUploading?: () => void;
}

/**
 * Begin recording from the microphone. The returned handle's `stop()`
 * uploads the captured audio to `/api/voice/stt` and surfaces the final
 * transcript via `onResult`. `cancel()` aborts everything without
 * uploading.
 *
 * Returns `null` if the browser doesn't support `MediaRecorder` or the
 * user denies the microphone permission — `onError` is invoked first.
 */
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

  // Pick a MIME the browser actually supports — Safari produces mp4/m4a,
  // Chrome/Firefox produce webm. Letting the browser default kicks in
  // when our preferred type isn't supported.
  const preferred = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  const supported = preferred.find(
    (t) => typeof MediaRecorder !== "undefined" && (MediaRecorder as any).isTypeSupported?.(t),
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
      // Short-circuit on EITHER cancelled OR stopped: if the user pressed
      // the mic button a second time (= stop) before getUserMedia resolved
      // we must NOT actually open the recorder, otherwise the UI shows
      // "transcribing..." forever waiting on a recorder that no one will
      // ever ask to stop. Same path as cancel — just don't fire onResult.
      if (cancelled || stopped) {
        try { s.getTracks().forEach(t => t.stop()); } catch {}
        // The stop() handler already cleared `recordingHandle` and set
        // `isTranscribing=true` optimistically; reset that to idle.
        if (stopped && !cancelled) {
          opts.onError?.("تم إلغاء التسجيل قبل أن يبدأ الميكروفون.");
        }
        opts.onEnd?.();
        return;
      }
      stream = s;
      try {
        recorder = supported ? new MediaRecorder(s, { mimeType: supported }) : new MediaRecorder(s);
      } catch (err: any) {
        finishWithError(err?.message || "فشل بدء التسجيل.");
        return;
      }

      recorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onerror = (ev: any) => {
        finishWithError(ev?.error?.message || "حدث خطأ في التسجيل.");
      };
      recorder.onstop = () => {
        cleanupStreams();
        if (cancelled) return;
        const mime = recorder?.mimeType || supported || "audio/webm";
        const blob = new Blob(chunks, { type: mime });
        if (blob.size === 0) {
          opts.onError?.("لم يتم تسجيل أي صوت — تأكد من السماح بالميكروفون.");
          opts.onEnd?.();
          return;
        }
        opts.onUploading?.();
        const fd = new FormData();
        // The extension is informational only — the server picks the real
        // extension from the MIME type — but it makes server-side logs
        // easier to grep when debugging.
        const ext = mime.includes("mp4") ? "m4a"
          : mime.includes("ogg") ? "ogg"
          : mime.includes("wav") ? "wav"
          : "webm";
        fd.append("audio", blob, `recording.${ext}`);

        fetch("/api/voice/stt", { method: "POST", body: fd, credentials: "include" })
          .then(async (resp) => {
            if (!resp.ok) {
              let detail = "";
              try { detail = (await resp.json())?.message || ""; } catch {}
              throw new Error(detail || `HTTP ${resp.status}`);
            }
            return resp.json();
          })
          .then((data) => {
            const text = (data?.text || "").toString().trim();
            if (!text) {
              opts.onError?.("لم يتعرّف النظام على أي كلام في التسجيل.");
            } else {
              opts.onResult(text, true);
            }
            opts.onEnd?.();
          })
          .catch((err) => {
            opts.onError?.(err?.message || "تعذّر تحويل الصوت إلى نص.");
            opts.onEnd?.();
          });
      };

      try {
        recorder.start();
      } catch (err: any) {
        finishWithError(err?.message || "فشل بدء التسجيل.");
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
    .catch((err: any) => {
      const code = err?.name || err?.code || "";
      const msg = code === "NotAllowedError" || code === "PermissionDeniedError"
        ? "تم رفض الإذن للوصول إلى الميكروفون. فعّله من إعدادات المتصفح."
        : code === "NotFoundError"
          ? "لم يُعثر على ميكروفون متّصل."
          : (err?.message || "تعذّر فتح الميكروفون.");
      finishWithError(msg);
    });

  return handle;
}
