/**
 * Digital Asset Links — GET /.well-known/assetlinks.json
 *
 * مطلوب لـ:
 * - TWA (Trusted Web Activity) verification — تطبيق الطالب
 * - Android App Links (Verified Deep Links)
 *
 * Fingerprints محسوبة من keystores/nukhba-student.jks و keystores/nukhba-admin.jks
 * (مُوَلَّدة بـ RSA-2048 / validity 10000 days)
 *
 * لإنتاج APK موقَّع:
 *   1. base64 -w 0 keystores/nukhba-student.jks  → STUDENT_KEYSTORE_BASE64 (GitHub Secret)
 *   2. أزل التعليق عن build-release job في .github/workflows/build-apk.yml
 *   3. أضف باقي الـ secrets (STUDENT_KEYSTORE_PASSWORD / STUDENT_KEY_ALIAS / ...)
 *
 * التحقق: https://developers.google.com/digital-asset-links/tools/generator
 *   Site domain: learnukhba.com
 *   App package: com.learnukhba.student
 */
import { Router, type IRouter } from "express";

const router: IRouter = Router();

const STUDENT_PACKAGE = "com.learnukhba.student";
const ADMIN_PACKAGE   = "com.learnukhba.admin";

// Fingerprints من keystores المُوَلَّدة في keystores/ (gitignored)
// القيم الافتراضية هي fingerprints keystores الإنتاج الفعلية
const STUDENT_FINGERPRINT = process.env.ANDROID_STUDENT_CERT_FINGERPRINT
  ?? "DD:05:E6:2C:EB:1F:04:C6:04:CB:2D:55:70:EF:19:F8:23:D3:80:84:95:B0:51:C8:3E:6B:21:37:74:11:99:1B";
const ADMIN_FINGERPRINT = process.env.ANDROID_ADMIN_CERT_FINGERPRINT
  ?? "9B:97:46:13:91:F8:6E:4D:8B:91:93:29:FC:5A:46:9F:13:BD:E8:37:79:08:6F:1B:D0:C7:03:BF:37:90:C0:6B";

router.get("/.well-known/assetlinks.json", (_req: any, res: any) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: STUDENT_PACKAGE,
        sha256_cert_fingerprints: [STUDENT_FINGERPRINT],
      },
    },
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: ADMIN_PACKAGE,
        sha256_cert_fingerprints: [ADMIN_FINGERPRINT],
      },
    },
  ]);
});

export default router;
