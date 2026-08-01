/**
 * حارس سرعة المعلّم الذكي — يمنع الإرسال السريع فقط
 *
 * الآلية: تتبّع تواقيت آخر 10 رسائل لكل طالب.
 *   - 6+ رسائل/دقيقة → تحذير مع تأخير 10 ثواني
 *   - 10+ رسائل/دقيقة → تأخير 30 ثانية
 *   - 15+ رسائل/دقيقة → تأخير 60 ثانية
 *
 * لا يوجد تحليل محتوى، لا عقوبات تراكمية، لا حظر دائم.
 * السجل يُمسح بعد 15 دقيقة من آخر نشاط.
 */

const TTL_MS = 15 * 60_000;

interface RateState {
  timestamps: number[];
  cooldownUntil: number;
}

const state = new Map<number, RateState>();

setInterval(() => {
  const now = Date.now();
  for (const [uid, s] of state) {
    const last = s.timestamps[s.timestamps.length - 1] ?? 0;
    if (now - last > TTL_MS) state.delete(uid);
  }
}, 5 * 60_000).unref();

function getState(uid: number): RateState {
  let s = state.get(uid);
  if (!s) {
    s = { timestamps: [], cooldownUntil: 0 };
    state.set(uid, s);
  }
  return s;
}

function countRecent(ts: number[], windowMs: number): number {
  const cutoff = Date.now() - windowMs;
  return ts.filter(t => t > cutoff).length;
}

export interface RateCheckResult {
  allowed: boolean;
  warning?: string;
  cooldownMs?: number;
  severity: "ok" | "slow_down" | "blocked";
}

export function checkTeachAbuse(uid: number, _message: string): RateCheckResult {
  const s = getState(uid);
  const now = Date.now();

  // تأخير نشط؟
  if (s.cooldownUntil > now) {
    const remaining = Math.ceil((s.cooldownUntil - now) / 1000);
    return {
      allowed: false,
      warning: `الرجاء التمهّل — أرسل رسالتك التالية بعد ${remaining} ثانية.`,
      cooldownMs: s.cooldownUntil - now,
      severity: "blocked",
    };
  }

  // سجّل التوقيت
  s.timestamps.push(now);
  if (s.timestamps.length > 15) s.timestamps.shift();

  const rpm = countRecent(s.timestamps, 60_000);

  if (rpm > 10) {
    s.cooldownUntil = now + 90_000;
    return {
      allowed: false,
      warning: "سرعة إرسال عالية جداً — انتظر دقيقة ونصف قبل الرسالة التالية.",
      cooldownMs: 90_000,
      severity: "blocked",
    };
  }

  if (rpm > 7) {
    s.cooldownUntil = now + 40_000;
    return {
      allowed: false,
      warning: "سرعة إرسال عالية — انتظر 40 ثانية قبل الرسالة التالية.",
      cooldownMs: 40_000,
      severity: "blocked",
    };
  }

  if (rpm > 4) {
    s.cooldownUntil = now + 15_000;
    return {
      allowed: false,
      warning: "أنت ترسل بسرعة — انتظر 15 ثانية من فضلك.",
      cooldownMs: 15_000,
      severity: "slow_down",
    };
  }

  return { allowed: true, severity: "ok" };
}

export function resetTeachAbuse(uid: number): void {
  state.delete(uid);
}

export function getTeachAbuseState(uid: number): RateState | null {
  return state.get(uid) ?? null;
}

export function getAbuseList(): Array<{ uid: number; rpm: number; blocked: boolean }> {
  const list: Array<{ uid: number; rpm: number; blocked: boolean }> = [];
  const now = Date.now();
  for (const [uid, s] of state) {
    const rpm = countRecent(s.timestamps, 60_000);
    if (rpm >= 3 || s.cooldownUntil > now) {
      list.push({ uid, rpm, blocked: s.cooldownUntil > now });
    }
  }
  return list.sort((a, b) => b.rpm - a.rpm);
}
