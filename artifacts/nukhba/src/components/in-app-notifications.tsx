/**
 * InAppNotifications — إشعارات داخلية مباشرة
 * تظهر كلوحة مركزية في وسط الشاشة عند وجود إشعارات غير مقروءة.
 * يغلقها الطالب بنفسه بالضغط على X أو "تم".
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/lib/use-auth";
import { X, Bell } from "lucide-react";
import { useLocation } from "wouter";

interface InAppNotif {
  id: number;
  title: string;
  body: string;
  data?: { url?: string };
  read: boolean;
  created_at: string;
  expires_at?: string | null;
}

const POLL_INTERVAL = 20_000;

export function InAppNotifications() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<InAppNotif[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, navigate] = useLocation();

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return;
      const data: { notifications: InAppNotif[] } = await res.json();
      const unread = data.notifications.filter((n) => !n.read);
      setQueue((prev) => {
        // Only add notifications not already in queue
        const prevIds = new Set(prev.map((n) => n.id));
        const newOnes = unread.filter((n) => !prevIds.has(n.id));
        return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
      });
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    if (!user) { setQueue([]); return; }
    fetchUnread();
    timerRef.current = setInterval(fetchUnread, POLL_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [user, fetchUnread]);

  const dismiss = async (id: number) => {
    setQueue((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notifications/${id}/read`, {
      method: "POST",
      credentials: "include",
      headers: { "X-Nukhba-Csrf": "1" },
    }).catch(() => {});
  };

  // Show one notification at a time (the first in queue)
  const current = queue[0];
  if (!user || !current) return null;

  const hasLink = current.data?.url && current.data.url !== "/";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={() => dismiss(current.id)}
      />

      {/* Card */}
      <div
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-4"
        dir="rtl"
      >
        <div
          className="relative rounded-2xl border border-amber-400/25 shadow-2xl shadow-black/70 overflow-hidden"
          style={{ background: "rgba(8,12,24,0.98)" }}
        >
          {/* Glow accent */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

          {/* Close button */}
          <button
            onClick={() => dismiss(current.id)}
            className="absolute top-4 left-4 w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center gap-4">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <Bell className="w-7 h-7 text-amber-400" />
            </div>

            {/* Text */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white leading-snug">{current.title}</h3>
              {current.body && (
                <p className="text-sm text-white/65 leading-relaxed">{current.body}</p>
              )}
            </div>

            {/* Counter pill */}
            {queue.length > 1 && (
              <span className="text-[11px] text-amber-400/60 bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-1">
                {queue.length - 1} إشعار آخر ينتظر
              </span>
            )}

            {/* Actions */}
            <div className="flex gap-2 w-full mt-1">
              {hasLink && (
                <button
                  onClick={() => {
                    navigate(current.data!.url!);
                    dismiss(current.id);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300 text-sm font-semibold hover:bg-amber-400/25 transition-colors"
                >
                  فتح
                </button>
              )}
              <button
                onClick={() => dismiss(current.id)}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  hasLink
                    ? "flex-1 bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
                    : "w-full bg-white/8 border border-white/15 text-white/80 hover:bg-white/12"
                }`}
              >
                تم
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
