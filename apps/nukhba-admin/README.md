# نُخبة — تطبيق الأدمن (Android)

تطبيق Android مبني كـ **WebView** يُشغّل لوحة إدارة [learnukhba.com/admin](https://learnukhba.com/admin).

## الميزات

- ✅ WebView كاملة مع JavaScript + Local Storage + IndexedDB
- ✅ دعم رفع الملفات
- ✅ الكاميرا والميكروفون (إذن تلقائي)
- ✅ السحب لإعادة التحميل (SwipeRefreshLayout)
- ✅ حفظ حالة التصفح عند تدوير الشاشة
- ✅ Deep Links — يفتح `/admin/*` مباشرةً
- ✅ يمنع فتح روابط خارجية (أمان)

---

## متطلبات البناء

- **Android Studio** Hedgehog 2023.1.1+ أو أحدث
- **JDK 17**
- **Android SDK** API 34

---

## البناء

```bash
cd apps/nukhba-admin

# Linux / macOS
chmod +x gradlew
./gradlew assembleDebug

# Windows
gradlew.bat assembleDebug

# APK في:
# app/build/outputs/apk/debug/app-debug.apk
```

---

## التثبيت على جهاز Android

```bash
# تأكد من تفعيل Developer Options + USB Debugging
adb install app/build/outputs/apk/debug/app-debug.apk
```

---

## ملاحظات أمنية

- التطبيق **يمنع** التنقل لأي موقع خارج `learnukhba.com`
- التحقق من صلاحية الأدمن يتم **من الخادم** (login required on `/admin`)
- لا تُوزّع APK الأدمن على متجر عام — وزّعه فقط للفريق الداخلي

---

## GitHub Actions

كل push إلى `main` يبني APK تلقائياً.
راجع: `.github/workflows/build-apk.yml`

---

## معلومات التطبيق

| | |
|---|---|
| Package Name | `com.learnukhba.admin` |
| Min SDK | 24 (Android 7.0) |
| Target SDK | 34 (Android 14) |
| URL | `https://learnukhba.com/admin` |
| Type | WebView |
