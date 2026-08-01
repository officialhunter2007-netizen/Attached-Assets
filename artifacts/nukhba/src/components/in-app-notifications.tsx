/**
 * In-App Notifications
 * Polls /api/notifications every 15 seconds and shows any new unread
 * notifications as toast banners — visible on any page the user is on.
 */
import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/use-auth";
import { toast } from "@/hooks/use-toast";

interface InAppNotif {
  id: number;
  title: string;
  body: string;
  data?: { url?: string; type?: string };
  read: boolean;
  created_at: string;
}

const POLL_INTERVAL = 15_000; // 15 seconds

export function InAppNotifications() {
  const { user } = useAuth();
  const seenIds = useRef<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    async function poll() {
      try {
        const res = await fetch("/api/notifications", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data: { notifications: InAppNotif[]; unreadCount: number } = await res.json();

        // Only show truly unread notifications we haven't shown yet
        const fresh = data.notifications.filter(
          (n) => !n.read && !seenIds.current.has(n.id)
        );
        if (fresh.length === 0) return;

        fresh.forEach((n) => seenIds.current.add(n.id));

        // Mark all as read on server (fire-and-forget)
        fetch("/api/notifications/read-all", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
          body: JSON.stringify({}),
        }).catch(() => {});

        // Show one toast per notification
        fresh.forEach((notif) => {
          toast({
            title: notif.title,
            description: notif.body || undefined,
            duration: 8000,
            className: [
              "bg-[rgba(10,15,30,0.97)] border border-amber-400/40",
              "text-white shadow-xl shadow-black/50 backdrop-blur-sm",
            ].join(" "),
          });
        });
      } catch {
        // network error — ignore silently
      }
    }

    // Poll immediately on login, then on interval
    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user]);

  return null;
}
