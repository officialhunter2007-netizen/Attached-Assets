/* =====================================================================
   نُخبة — Service Worker
   يستقبل إشعارات Web Push ويعرضها حتى لو كان التطبيق مغلقاً
   ===================================================================== */

const BASE_URL = "https://learnukhba.com";

// تثبيت فوري — لا تنتظر إغلاق التبويبات القديمة
self.addEventListener("install",  ()  => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// ── استقبال Push ──────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { title: "نُخبة", body: event.data ? event.data.text() : "" }; }

  const title   = data.title   || "نُخبة";
  const body    = data.body    || "";
  const url     = data.url     || "/";
  const icon    = data.icon    || "/icons/icon-192.png";
  const badge   = data.badge   || "/icons/badge-72.png";
  const image   = data.image   || undefined;   // صورة كبيرة اختيارية

  // tag فريد لكل إشعار لمنع الاستبدال الصامت
  const tag = data.tag || `nukhba-${Date.now()}`;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      image,             // يظهر كصورة كبيرة في أسفل الإشعار (أندرويد)
      dir:   "rtl",
      lang:  "ar",
      tag,
      vibrate:           [100, 50, 100],   // اهتزاز على أندرويد
      requireInteraction: false,
      silent: false,
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

// ── رسائل من الصفحة (طلب تجديد الاشتراك) ─────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// Fetch: شبكة أولاً
self.addEventListener("fetch", () => {});
