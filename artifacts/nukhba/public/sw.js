/* =====================================================================
   نُخبة — Service Worker
   يستقبل إشعارات Web Push ويعرضها حتى لو كان التطبيق مغلقاً
   ===================================================================== */

const BASE_URL = "https://learnukhba.com";

// تثبيت فوري
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// ── استقبال Push ──────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { title: "نُخبة", body: event.data ? event.data.text() : "" }; }

  const title = data.title || "نُخبة";
  const body  = data.body  || "";
  const url   = data.url   || "/";
  const icon  = data.icon  || "/favicon.svg";
  const badge = data.badge || "/favicon.svg";

  event.waitUntil(
    self.registration.showNotification(title, {
      body, icon, badge,
      dir: "rtl",
      lang: "ar",
      tag: "nukhba-push",
      requireInteraction: false,
      data: { url },
    })
  );
});

// ── النقر على الإشعار ─────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/";
  const fullUrl   = targetUrl.startsWith("http") ? targetUrl : BASE_URL + targetUrl;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(BASE_URL) && "focus" in client) {
          client.navigate(fullUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(fullUrl);
    })
  );
});

// Fetch: شبكة أولاً (بدون cache عدوانية)
self.addEventListener("fetch", () => {});
