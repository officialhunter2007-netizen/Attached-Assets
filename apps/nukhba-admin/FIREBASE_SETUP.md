# إعداد Firebase لإشعارات الأدمن

تطبيق الأدمن يستخدم **Firebase Cloud Messaging (FCM)** لإرسال إشعارات فورية
عند وصول طلبات اشتراك جديدة.

---

## الخطوة 1 — إنشاء مشروع Firebase

1. افتح [Firebase Console](https://console.firebase.google.com)
2. أنشئ مشروعاً جديداً (أو استخدم مشروعاً قائماً)
3. أضف **تطبيق Android** بـ:
   - Package name: `com.learnukhba.admin`
   - App nickname: Nukhba Admin

---

## الخطوة 2 — إضافة `google-services.json`

بعد تسجيل التطبيق، نزّل ملف `google-services.json` وضعه في:

```
apps/nukhba-admin/app/google-services.json
```

> ⚠️ **لا تُلتزم هذا الملف في Git** — أضف السطر التالي إلى `.gitignore`:
> ```
> apps/nukhba-admin/app/google-services.json
> ```

---

## الخطوة 3 — متغيرات البيئة للخادم

يحتاج الخادم إلى اثنين من **Replit Secrets**:

| Secret | القيمة |
|--------|--------|
| `FCM_PROJECT_ID` | معرّف مشروع Firebase (مثال: `nukhba-admin-1234`) |
| `FCM_SERVICE_ACCOUNT_KEY` | محتوى ملف JSON لـ Service Account (انظر أدناه) |

### كيف تحصل على Service Account Key

1. في Firebase Console → Project Settings → **Service accounts**
2. اختر **Firebase Admin SDK** ← **Generate new private key**
3. انسخ محتوى ملف JSON كاملاً والصقه في Secret `FCM_SERVICE_ACCOUNT_KEY`

---

## الخطوة 4 — إنشاء قناة الإشعارات (تلقائي)

عند تشغيل التطبيق أول مرة تُنشأ قناة `admin_alerts` تلقائياً.
لا يلزم أي إعداد يدوي.

---

## كيف يعمل النظام

```
طالب يرسل طلب اشتراك
         │
         ▼
   /api/subscriptions/request
         │
         ▼
  sendFcmToAdmins() ← يجلب tokens من admin_fcm_tokens
         │
         ▼
   FCM HTTP v1 API (google-auth-library)
         │
         ▼
   NukhbaFcmService.onMessageReceived()
         │
         ▼
   إشعار Android ← يفتح /admin/subscriptions عند النقر
```

---

## اختبار الإشعارات

بعد تثبيت التطبيق على جهاز حقيقي:

```bash
# تحقق من أن الرمز وصل للخادم
curl -s https://learnukhba.com/api/admin/fcm-token \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Cookie: <admin-session>" \
  -H "X-Nukhba-Csrf: 1" \
  -d '{"token":"TEST_TOKEN"}'
```

يمكنك أيضاً إرسال إشعار اختباري مباشرةً من Firebase Console:
**Cloud Messaging → Send test message → Enter FCM registration token**
