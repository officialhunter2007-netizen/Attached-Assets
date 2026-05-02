type AnyWindow = Window & {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
};

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as AnyWindow;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.speechSynthesis !== "undefined";
}

export interface RecognitionHandle {
  stop: () => void;
}

export function startRecognition(opts: {
  lang?: string;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (err: string) => void;
  onEnd?: () => void;
}): RecognitionHandle | null {
  if (!isSpeechRecognitionSupported()) {
    opts.onError?.("غير مدعوم في هذا المتصفح");
    return null;
  }
  const w = window as AnyWindow;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  try {
    const rec = new Ctor();
    rec.lang = opts.lang || "ar-SA";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (final) opts.onResult(final, true);
      else if (interim) opts.onResult(interim, false);
    };
    rec.onerror = (e: any) => opts.onError?.(e?.error || "خطأ غير معروف");
    rec.onend = () => opts.onEnd?.();
    rec.start();
    return { stop: () => { try { rec.stop(); } catch {} } };
  } catch (e: any) {
    opts.onError?.(e?.message || "فشل بدء التسجيل");
    return null;
  }
}

let pickedVoice: SpeechSynthesisVoice | null = null;
function pickArabicVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSynthesisSupported()) return null;
  if (pickedVoice) return pickedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;
  pickedVoice =
    voices.find(v => /^ar(-|_)/i.test(v.lang)) ||
    voices.find(v => /arabic/i.test(v.name)) ||
    voices[0];
  return pickedVoice;
}

export function speakText(text: string, opts?: { rate?: number; pitch?: number }): boolean {
  if (!isSpeechSynthesisSupported() || !text) return false;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ar-SA";
    utter.rate = opts?.rate ?? 1;
    utter.pitch = opts?.pitch ?? 1;
    const v = pickArabicVoice();
    if (v) utter.voice = v;
    window.speechSynthesis.speak(utter);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking(): void {
  if (!isSpeechSynthesisSupported()) return;
  try { window.speechSynthesis.cancel(); } catch {}
}

export function isSpeaking(): boolean {
  if (!isSpeechSynthesisSupported()) return false;
  return window.speechSynthesis.speaking;
}
