# Android Keystores

ملفات `.jks` في هذا المجلد **لا تُرفع للـ git** (موجودة في `.gitignore`).

## الـ Keystores الموجودة

| الملف | التطبيق | الـ Alias | الصلاحية |
|-------|---------|----------|---------|
| `nukhba-student.jks` | com.learnukhba.student | nukhba-student | 10000 يوم |
| `nukhba-admin.jks` | com.learnukhba.admin | nukhba-admin | 10000 يوم |

## SHA-256 Fingerprints (موجودة في assetlinks.json)

```
Student: DD:05:E6:2C:EB:1F:04:C6:04:CB:2D:55:70:EF:19:F8:23:D3:80:84:95:B0:51:C8:3E:6B:21:37:74:11:99:1B
Admin:   9B:97:46:13:91:F8:6E:4D:8B:91:93:29:FC:5A:46:9F:13:BD:E8:37:79:08:6F:1B:D0:C7:03:BF:37:90:C0:6B
```

## إضافة Keystores لـ GitHub Secrets (لبناء إنتاج موقَّع)

```bash
# Student
base64 -w 0 keystores/nukhba-student.jks
# انسخ الناتج → GitHub Secret: STUDENT_KEYSTORE_BASE64

# Admin  
base64 -w 0 keystores/nukhba-admin.jks
# انسخ الناتج → GitHub Secret: ADMIN_KEYSTORE_BASE64
```

ثم أضف هذه الـ Secrets في **Settings → Secrets and variables → Actions**:

- `STUDENT_KEYSTORE_BASE64`
- `STUDENT_KEYSTORE_PASSWORD`
- `STUDENT_KEY_ALIAS` = `nukhba-student`
- `STUDENT_KEY_PASSWORD`
- `ADMIN_KEYSTORE_BASE64`
- `ADMIN_KEYSTORE_PASSWORD`
- `ADMIN_KEY_ALIAS` = `nukhba-admin`
- `ADMIN_KEY_PASSWORD`

بعد إضافة الـ Secrets، أزل التعليق عن `build-release` job في `.github/workflows/build-apk.yml`.

## التحقق من TWA

بعد نشر الـ frontend، تحقق عبر:
https://developers.google.com/digital-asset-links/tools/generator

- **Site domain**: learnukhba.com
- **App package**: com.learnukhba.student
- **App fingerprint**: (الـ fingerprint أعلاه)
