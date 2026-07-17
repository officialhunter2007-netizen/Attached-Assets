# نُخبة — تطبيق الطالب (Android)

تطبيق Android مبني كـ **Trusted Web Activity (TWA)** يُشغّل منصة [learnukhba.com](https://learnukhba.com) داخل Chrome على الهاتف.

## لماذا TWA وليس WebView؟

| الميزة | TWA | WebView |
|--------|-----|---------|
| Service Worker + Push Notifications | ✅ يعمل نيتياً | ❌ لا يعمل |
| أداء | ✅ Chrome engine | ⚠️ محدود |
| PWA features (install, offline) | ✅ | ❌ |
| الكاميرا والميكروفون | ✅ تلقائياً | ⚠️ يحتاج إعداد |

---

## متطلبات البناء

- **Android Studio** Hedgehog 2023.1.1+ أو أحدث
- **JDK 17** (يأتي مع Android Studio)
- **Android SDK** API 34
- اتصال بالإنترنت (لتحميل Gradle dependencies)

---

## البناء من Android Studio

```bash
# 1. افتح مجلد المشروع في Android Studio:
File → Open → apps/nukhba-student/

# 2. انتظر مزامنة Gradle (تلقائية)

# 3. ابنِ Debug APK:
Build → Build Bundle(s) / APK(s) → Build APK(s)

# 4. الملف في:
app/build/outputs/apk/debug/app-debug.apk
```

---

## البناء من سطر الأوامر

```bash
cd apps/nukhba-student

# Linux / macOS
chmod +x gradlew
./gradlew assembleDebug

# Windows
gradlew.bat assembleDebug
```

---

## الخطوة الحاسمة: Digital Asset Links (TWA Verification)

لكي يعمل التطبيق كـ TWA حقيقي (بدون شريط عنوان Chrome) يجب:

### 1. احصل على SHA-256 fingerprint لـ keystore الإنتاجي:

```bash
# Debug keystore (للتطوير فقط):
keytool -list -v \
  -alias androiddebugkey \
  -keystore ~/.android/debug.keystore \
  -storepass android -keypass android \
  | grep "SHA256"

# Release keystore (للإنتاج):
keytool -list -v \
  -alias YOUR_KEY_ALIAS \
  -keystore path/to/your.jks \
  | grep "SHA256"
```

### 2. حدّث الملف:
```
artifacts/nukhba/public/.well-known/assetlinks.json
```
استبدل `REPLACE_WITH_YOUR_SHA256_FINGERPRINT` بالقيمة من الخطوة 1.

### 3. تحقق من الرابط بعد النشر:
```
https://learnukhba.com/.well-known/assetlinks.json
```

---

## إنشاء Release APK للنشر على Google Play

```bash
# 1. أنشئ keystore للإنتاج (مرة واحدة فقط):
keytool -genkey -v \
  -keystore nukhba-release.jks \
  -alias nukhba \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# 2. أضف signing config في app/build.gradle:
android {
    signingConfigs {
        release {
            storeFile file('../nukhba-release.jks')
            storePassword 'YOUR_STORE_PASSWORD'
            keyAlias 'nukhba'
            keyPassword 'YOUR_KEY_PASSWORD'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}

# 3. ابنِ:
./gradlew assembleRelease

# 4. APK في:
app/build/outputs/apk/release/app-release.apk
```

---

## بناء تلقائي عبر GitHub Actions

كل push إلى `main` يبني APK ويرفعه كـ artifact تلقائياً.
راجع: `.github/workflows/build-apk.yml`

---

## معلومات التطبيق

| | |
|---|---|
| Package Name | `com.learnukhba.student` |
| Min SDK | 24 (Android 7.0) |
| Target SDK | 34 (Android 14) |
| URL | `https://learnukhba.com` |
| Type | Trusted Web Activity (TWA) |
