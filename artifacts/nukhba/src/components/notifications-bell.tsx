import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, X } from "lucide-react";
import { useLocation } from "wouter";

type Notification = {
  id: number;
  type: string;
  title: string;
  body: string;
  data: any;
  read: boolean;
  created_at: string;
};

const NOTIF_SOUND_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA...";

function playNotifSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 60000;
  if (diff < 1) return "الآن";
  if (diff < 60) return `${Math.floor(diff)} دقيقة`;
  if (diff < 1440) return `${Math.floor(diff / 60)} ساعة`;
  return `${Math.floor(diff / 1440)} يوم`;
}

function getNotifIcon(type: string) {
  if (type === "room_invite") return "💻";
  if (type === "join_request") return "👋";
  if (type === "support") return "💬";
  return "🔔";
}

// ── Push subscribe helper (يُستدعى عند نقرة المستخدم) ────────────────────────
async function subscribeToPush(): Promise<"granted" | "denied" | "error"> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "error";
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "denied";

    const keyRes = await fetch("/api/push/vapid-public-key", { credentials: "include" });
    const { publicKey } = await keyRes.json();
    if (!publicKey) return "error";

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    // إلغاء القديم المنتهي إن وُجد
    if (sub?.expirationTime != null && sub.expirationTime < Date.now() + 60_000) {
      await sub.unsubscribe();
      sub = null;
    }
    if (!sub) {
      const raw = (s: string) => {
        const p = "=".repeat((4 - (s.length % 4)) % 4);
        const b = (s + p).replace(/-/g, "+").replace(/_/g, "/");
        return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
      };
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: raw(publicKey) });
    }

    await fetch("/api/push/subscribe", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
      body: JSON.stringify({ subscription: sub.toJSON(), meta: {} }),
    });
    return "granted";
  } catch { return "error"; }
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const prevUnreadRef = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  // حالة الإشعارات
  const [pushStatus, setPushStatus] = useState<"unknown" | "granted" | "denied" | "unsupported">("unknown");
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) { setPushStatus("unsupported"); return; }
    if (Notification.permission === "granted") setPushStatus("granted");
    else if (Notification.permission === "denied") setPushStatus("denied");
    else setPushStatus("unknown");
  }, []);

  const handleEnablePush = async () => {
    setSubscribing(true);
    const result = await subscribeToPush();
    setPushStatus(result === "granted" ? "granted" : result === "denied" ? "denied" : "unknown");
    setSubscribing(false);
  };

  const fetchNotifs = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications", { credentials: "include" });
      if (!r.ok) return;
      const d = await r.json();
      const newUnread = d.unreadCount ?? 0;
      if (newUnread > prevUnreadRef.current && prevUnreadRef.current >= 0) {
        playNotifSound();
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("نُخبة — إشعار جديد", {
            body: d.notifications?.[0]?.title ?? "لديك إشعار جديد",
            icon: "/favicon.svg",
          });
        }
      }
      prevUnreadRef.current = newUnread;
      setUnread(newUnread);
      setNotifs(d.notifications ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 20000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const markRead = async (id: number) => {
    await fetch(`/api/notifications/${id}/read`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnread((c) => Math.max(0, c - 1));
    prevUnreadRef.current = Math.max(0, prevUnreadRef.current - 1);
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    prevUnreadRef.current = 0;
  };

  const handleNotifClick = (notif: Notification) => {
    markRead(notif.id);
    setOpen(false);
    const data = notif.data ?? {};
    if (notif.type === "room_invite" || notif.type === "join_request") {
      if (data.roomId) navigate(`/coding-room/${data.roomId}`);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-full transition-colors"
        style={{
          background: open ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.05)",
          border: open ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Bell className="w-4 h-4" style={{ color: unread > 0 ? "#F59E0B" : "rgba(255,255,255,0.4)" }} />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-0.5"
              style={{ boxShadow: "0 0 8px rgba(239,68,68,0.5)" }}
            >
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-10 w-80 rounded-2xl overflow-hidden z-50"
            style={{
              background: "rgba(8,12,22,0.98)",
              border: "1px solid rgba(245,158,11,0.15)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)",
            }}
            dir="rtl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <span className="text-sm font-black text-white">الإشعارات</span>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] flex items-center gap-1 transition-colors hover:text-amber-300"
                  style={{ color: "#F59E0B" }}
                >
                  <Check className="w-3 h-3" />
                  قراءة الكل
                </button>
              )}
            </div>

            {/* زر تفعيل إشعارات الهاتف/المتصفح */}
            {pushStatus !== "unsupported" && pushStatus !== "granted" && (
              <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <button
                  onClick={handleEnablePush}
                  disabled={subscribing || pushStatus === "denied"}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: pushStatus === "denied"
                      ? "rgba(239,68,68,0.08)"
                      : "rgba(245,158,11,0.12)",
                    border: pushStatus === "denied"
                      ? "1px solid rgba(239,68,68,0.25)"
                      : "1px solid rgba(245,158,11,0.3)",
                    color: pushStatus === "denied" ? "#f87171" : "#F59E0B",
                    opacity: subscribing ? 0.7 : 1,
                  }}
                >
                  {subscribing ? (
                    "جاري التفعيل…"
                  ) : pushStatus === "denied" ? (
                    "🔕 الإشعارات محظورة — افتح إعدادات المتصفح"
                  ) : (
                    "🔔 فعّل إشعارات المتصفح"
                  )}
                </button>
              </div>
            )}

            <div className="max-h-80 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="text-center py-10 text-white/25 text-sm">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  لا توجد إشعارات
                </div>
              ) : (
                notifs.map((n) => (
                  <motion.div
                    key={n.id}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                    onClick={() => handleNotifClick(n)}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer border-b transition-colors"
                    style={{
                      borderColor: "rgba(255,255,255,0.04)",
                      background: !n.read ? "rgba(245,158,11,0.04)" : "transparent",
                    }}
                  >
                    <span className="text-base shrink-0 mt-0.5">{getNotifIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-bold leading-snug ${n.read ? "text-white/50" : "text-white/85"}`}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1" />
                        )}
                      </div>
                      {n.body && (
                        <p className="text-[11px] text-white/30 mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-[10px] text-white/20 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
