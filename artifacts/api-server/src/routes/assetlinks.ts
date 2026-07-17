/**
 * Digital Asset Links — GET /.well-known/assetlinks.json
 *
 * مطلوب لـ:
 * - TWA (Trusted Web Activity) verification — تطبيق الطالب
 * - Android App Links (Verified Deep Links)
 *
 * بعد بناء APK الإنتاجي، استبدل REPLACE_WITH_YOUR_SHA256_FINGERPRINT
 * بالـ fingerprint الفعلي للـ keystore:
 *
 *   keytool -list -v -alias YOUR_KEY_ALIAS -keystore your.jks
 *
 * أو من GitHub Actions (debug keystore):
 *   keytool -list -v -alias androiddebugkey \
 *     -keystore ~/.android/debug.keystore \
 *     -storepass android -keypass android | grep SHA256
 */
import { Router, type IRouter } from "express";

const router: IRouter = Router();

const STUDENT_PACKAGE = "com.learnukhba.student";
const ADMIN_PACKAGE   = "com.learnukhba.admin";

// استبدل بـ SHA-256 fingerprint الفعلي لكل تطبيق بعد بناء APK الإنتاجي
const STUDENT_FINGERPRINT = process.env.ANDROID_STUDENT_CERT_FINGERPRINT
  ?? "REPLACE_WITH_YOUR_SHA256_FINGERPRINT";
const ADMIN_FINGERPRINT = process.env.ANDROID_ADMIN_CERT_FINGERPRINT
  ?? "REPLACE_WITH_YOUR_SHA256_FINGERPRINT";

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
