type TrackEvent = {
  type: string;
  path?: string;
  label?: string;
  detail?: Record<string, any>;
  ts?: number;
};

const QUEUE_KEY = "nukhba_track_q_v1";
const FLUSH_INTERVAL_MS = 6000;
const MAX_QUEUE = 60;
const MAX_LABEL_LEN = 160;

let queue: TrackEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let started = false;
let lastPath: string | null = null;
let lastClickAt = 0;

function loadQueue() {
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    if (raw) queue = JSON.parse(raw);
  } catch {}
}

function persistQueue() {
  try {
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {}
}

async function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  persistQueue();
  try {
    const res = await fetch("/api/track", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    });
    if (!res.ok && res.status !== 204) {
      // Re-queue on transient errors (but not on 401/403)
      if (res.status >= 500) {
        queue.unshift(...batch);
        persistQueue();
      }
    }
  } catch {
    // Network failure → re-queue once
    queue.unshift(...batch);
    persistQueue();
  }
}

export function trackEvent(type: string, opts?: { label?: string; path?: string; detail?: Record<string, any> }) {
  if (!started) return;
  const ev: TrackEvent = {
    type: String(type).slice(0, 64),
    path: opts?.path ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
    label: opts?.label ? String(opts.label).slice(0, MAX_LABEL_LEN) : undefined,
    detail: opts?.detail,
    ts: Date.now(),
  };
  queue.push(ev);
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  persistQueue();
}

export function trackPageView(path: string) {
  if (path === lastPath) return;
  lastPath = path;
  trackEvent("page_view", { path, label: path });
}

function describeElement(el: HTMLElement): string {
  // Prefer data-track / aria-label / title / text content
  const dataTrack = el.getAttribute("data-track");
  if (dataTrack) return dataTrack;
  const aria = el.getAttribute("aria-label");
  if (aria) return aria;
  const title = el.getAttribute("title");
  if (title) return title;
  const text = (el.textContent || "").trim().replace(/\s+/g, " ");
  if (text) return text.slice(0, MAX_LABEL_LEN);
  const tag = el.tagName.toLowerCase();
  return `<${tag}>`;
}

function findInteractiveAncestor(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  let cur: HTMLElement | null = target;
  for (let i = 0; i < 6 && cur; i++) {
    if (cur.hasAttribute("data-track")) return cur;
    const tag = cur.tagName.toLowerCase();
    if (tag === "button" || tag === "a") return cur;
    if (cur.getAttribute("role") === "button") return cur;
    cur = cur.parentElement;
  }
  return null;
}

function onGlobalClick(e: MouseEvent) {
  const now = Date.now();
  if (now - lastClickAt < 200) return; // de-dup rapid bubbles
  lastClickAt = now;
  const el = findInteractiveAncestor(e.target);
  if (!el) return;
  const tag = el.tagName.toLowerCase();
  const label = describeElement(el);
  const detail: Record<string, any> = { tag };
  if (tag === "a") {
    const href = (el as HTMLAnchorElement).getAttribute("href");
    if (href) detail.href = href.slice(0, 200);
  }
  trackEvent("click", { label, detail });
}

export function startActivityTracker() {
  if (started || typeof window === "undefined") return;
  started = true;
  loadQueue();

  // Initial page
  trackPageView(window.location.pathname);

  // Clicks
  window.addEventListener("click", onGlobalClick, { capture: true, passive: true });

  // Visibility change → flush before tab hides
  const onVisChange = () => {
    if (document.visibilityState === "hidden") {
      // sendBeacon if possible (synchronous-ish, survives unload)
      if (queue.length > 0 && navigator.sendBeacon) {
        try {
          const blob = new Blob([JSON.stringify({ events: queue })], { type: "application/json" });
          if (navigator.sendBeacon("/api/track", blob)) {
            queue = [];
            persistQueue();
          }
        } catch {}
      } else {
        flush();
      }
    }
  };
  document.addEventListener("visibilitychange", onVisChange);
  window.addEventListener("pagehide", onVisChange);

  // Periodic flush
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
}

export function stopActivityTracker() {
  if (!started) return;
  started = false;
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = null;
  window.removeEventListener("click", onGlobalClick, { capture: true } as any);
  // Final flush
  flush();
}
