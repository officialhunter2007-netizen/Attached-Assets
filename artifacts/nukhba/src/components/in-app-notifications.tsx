/**
 * NotificationCenter — مركز الإشعارات الداخلية
 * زر ثابت يظهر للمستخدم على كل الصفحات.
 * يعرض الإشعارات غير المقروءة في لوحة منبثقة.
 * الإشعار لا يُحذف حتى يُغلقه المستخدم بنفسه أو ينتهي وقته أو يلغيه الأدمن.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/lib/use-auth";
import { Bell, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [notifs, setNotifs] = useState<InAppNotif[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, navigate] = useLocation();

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return;
      const data: { notifications: InAppNotif[] } = await res.json();
      setNotifs(data.notifications.filter((n) => !n.read));
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    if (!user) { setNotifs([]); return; }
    fetchUnread();
    timerRef.current = setInterval(fetchUnread, POLL_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [user, fetchUnread]);

  const dismiss = async (id: number) => {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notifications/${id}/read`, {
      method: "POST",
      credentials: "include",
      headers: { "X-Nukhba-Csrf": "1" },
    }).catch(() => {});
  };

  const dismissAll = async () => {
    setNotifs([]);
    setOpen(false);
    await fetch("/api/notifications/read-all", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
      body: JSON.stringify({}),
    }).catch(() => {});
  };

  if (!user || notifs.length === 0) return null;

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Bell button */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-end gap-2">
        {/* Panel */}
        {open && (
          <div
            className="mb-2 w-80 max-h-[70vh] overflow-y-auto rounded-2xl border border-white/15 shadow-2xl shadow-black/60 backdrop-blur-md flex flex-col"
            style={{ background: "rgba(8,12,24,0.97)" }}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="font-bold text-sm text-white">الإشعارات</span>
              <button
                onClick={dismissAll}
                className="text-[11px] text-amber-400/80 hover:text-amber-400 transition-colors"
              >
                مسح الكل
              </button>
            </div>

            {/* Items */}
            <div className="divide-y divide-white/5 flex-1">
              {notifs.map((n) => (
                <div key={n.id} className="px-4 py-3 flex gap-3 items-start group">
                  <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white leading-snug">{n.title}</p>
                    {n.body && (
                      <p className="text-xs text-white/60 mt-0.5 leading-relaxed">{n.body}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-white/35">
                        {new Date(n.created_at).toLocaleString("ar", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                      {n.data?.url && n.data.url !== "/" && (
                        <button
                          onClick={() => { navigate(n.data!.url!); dismiss(n.id); setOpen(false); }}
                          className="flex items-center gap-0.5 text-[10px] text-amber-400/70 hover:text-amber-400"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          فتح
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => dismiss(n.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-white/70 shrink-0 mt-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bell */}
        <Button
          onClick={() => setOpen((v) => !v)}
          size="icon"
          className="relative w-12 h-12 rounded-full shadow-lg shadow-black/50 border border-amber-400/40"
          style={{ background: "rgba(10,15,30,0.95)" }}
        >
          <Bell className="w-5 h-5 text-amber-400" />
          {notifs.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
              {notifs.length > 9 ? "9+" : notifs.length}
            </span>
          )}
        </Button>
      </div>
    </>
  );
}
