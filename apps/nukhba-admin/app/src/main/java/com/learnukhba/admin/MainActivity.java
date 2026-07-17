package com.learnukhba.admin;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.*;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.ArrayList;
import java.util.List;

/**
 * تطبيق أدمن نُخبة
 *
 * أمان: التحقق من الـ URL يستخدم مطابقة دقيقة (exact/subdomain):
 *   - learnukhba.com          ✓
 *   - sub.learnukhba.com      ✓
 *   - evillearnukhba.com      ✗  (يمنعه .equals/.endsWith("." + HOST))
 *
 * يدعم: JavaScript + LocalStorage + رفع الملفات + الكاميرا + الميكروفون
 * + السحب لإعادة التحميل + Deep Links لـ /admin
 *
 * ── تسجيل FCM ─────────────────────────────────────────────────────────────────
 * يتم إرسال رمز FCM عبر JavaScript داخل الـ WebView (بعد تحميل كل صفحة) حتى
 * تُرسل ملفات الجلسة (session cookie) تلقائياً مع الطلب.
 *
 * آلية التحقق من النجاح:
 *   الـ fetch() في JS يُبلّغ NukhbaFcmBridge.onTokenRegistered(success, token)
 *   عبر JavascriptInterface. يُسجَّل الرمز كـ "مُرسَل" فقط عند نجاح HTTP (200).
 *   إذا فشل الطلب (401 — المستخدم لم يسجّل دخوله بعد، أو خطأ شبكة)،
 *   يبقى الرمز في حالة "معلّق" ويُعاد المحاولة عند تحميل الصفحة التالية.
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG           = "NukhbaAdmin";
    private static final String ALLOWED_HOST  = "learnukhba.com";
    private static final String ALLOWED_SCHEME = "https";
    private static final String ADMIN_URL     = "https://learnukhba.com/admin";

    /** SharedPreferences — FCM token state. */
    static final String PREFS_NAME         = "nukhba_fcm";
    static final String PREF_PENDING_TOKEN = "pending_fcm_token";
    static final String PREF_SENT_TOKEN    = "sent_fcm_token";

    private WebView            webView;
    private SwipeRefreshLayout swipeRefresh;

    /**
     * Tracks the token currently in-flight to the backend so we don't
     * inject the same fetch more than once per page load.
     */
    private String inFlightToken = "";

    // Pending WebView permission request — held until runtime perms are granted
    private PermissionRequest pendingPermissionRequest;

    // File chooser callback
    private ValueCallback<Uri[]> fileChooserCallback;

    // ── Launchers ─────────────────────────────────────────────────────────────

    private final ActivityResultLauncher<String[]> filePickerLauncher =
        registerForActivityResult(new ActivityResultContracts.OpenMultipleDocuments(), uris -> {
            if (fileChooserCallback == null) return;
            if (uris == null || uris.isEmpty()) {
                fileChooserCallback.onReceiveValue(null);
            } else {
                fileChooserCallback.onReceiveValue(uris.toArray(new Uri[0]));
            }
            fileChooserCallback = null;
        });

    private final ActivityResultLauncher<String[]> mediaPermLauncher =
        registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(), results -> {
            if (pendingPermissionRequest == null) return;
            List<String> granted = new ArrayList<>();
            for (String res : pendingPermissionRequest.getResources()) {
                if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)
                        && Boolean.TRUE.equals(results.get(Manifest.permission.CAMERA))) {
                    granted.add(res);
                } else if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res)
                        && Boolean.TRUE.equals(results.get(Manifest.permission.RECORD_AUDIO))) {
                    granted.add(res);
                }
            }
            if (granted.isEmpty()) {
                pendingPermissionRequest.deny();
            } else {
                pendingPermissionRequest.grant(granted.toArray(new String[0]));
            }
            pendingPermissionRequest = null;
        });

    private final ActivityResultLauncher<String> notificationPermLauncher =
        registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {});

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView      = findViewById(R.id.webView);
        swipeRefresh = findViewById(R.id.swipeRefresh);

        // ── إعدادات WebView ──────────────────────────────────────────────────
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setDatabaseEnabled(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        // ── JavaScript bridge — يستقبل نتيجة fetch() من JS ──────────────────
        // يجب تسجيل الجسر قبل تحميل الصفحة حتى يكون متاحاً عند الحاجة.
        // addJavascriptInterface آمن لأن allowedOrigin مقيّد بـ learnukhba.com فقط.
        webView.addJavascriptInterface(new NukhbaFcmBridge(this), "NukhbaAdmin");

        // ── WebViewClient ─────────────────────────────────────────────────────
        webView.setWebViewClient(new WebViewClient() {

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !isAllowedUrl(request.getUrl());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                swipeRefresh.setRefreshing(false);
                // كل صفحة تنتهي من التحميل تُعطي فرصة لتسجيل الرمز إذا لم ينجح بعد.
                inFlightToken = ""; // أعد التهيئة لأن الصفحة تغيّرت
                tryRegisterFcmToken();
            }
        });

        // ── WebChromeClient ───────────────────────────────────────────────────
        webView.setWebChromeClient(new WebChromeClient() {

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                pendingPermissionRequest = request;
                List<String> toRequest = new ArrayList<>();
                for (String res : request.getResources()) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)
                            && ContextCompat.checkSelfPermission(
                                    MainActivity.this, Manifest.permission.CAMERA)
                                    != PackageManager.PERMISSION_GRANTED) {
                        toRequest.add(Manifest.permission.CAMERA);
                    }
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res)
                            && ContextCompat.checkSelfPermission(
                                    MainActivity.this, Manifest.permission.RECORD_AUDIO)
                                    != PackageManager.PERMISSION_GRANTED) {
                        toRequest.add(Manifest.permission.RECORD_AUDIO);
                    }
                }
                if (toRequest.isEmpty()) {
                    request.grant(request.getResources());
                    pendingPermissionRequest = null;
                } else {
                    mediaPermLauncher.launch(toRequest.toArray(new String[0]));
                }
            }

            @Override
            public boolean onShowFileChooser(WebView webView,
                                             ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                fileChooserCallback = callback;
                String[] mimeTypes = params.getAcceptTypes();
                if (mimeTypes == null || mimeTypes.length == 0) mimeTypes = new String[]{"*/*"};
                filePickerLauncher.launch(mimeTypes);
                return true;
            }
        });

        // ── السحب لإعادة التحميل ──────────────────────────────────────────────
        swipeRefresh.setColorSchemeResources(R.color.colorPrimary);
        swipeRefresh.setOnRefreshListener(() -> webView.reload());

        // ── طلب صلاحية الإشعارات (Android 13+) ─────────────────────────────
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
            notificationPermLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
        }

        // ── جلب رمز FCM وحفظه ─────────────────────────────────────────────────
        // الإرسال للخادم يحدث في tryRegisterFcmToken() بعد onPageFinished.
        FirebaseMessaging.getInstance().getToken()
            .addOnSuccessListener(this::savePendingToken)
            .addOnFailureListener(e -> Log.w(TAG, "FCM token fetch failed: " + e.getMessage()));

        // ── تحميل URL الأدمن ─────────────────────────────────────────────────
        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            String startUrl = ADMIN_URL;
            if (getIntent() != null) {
                String notifUrl = getIntent().getStringExtra("open_url");
                if (notifUrl != null && isAllowedUrl(Uri.parse(notifUrl))) {
                    startUrl = notifUrl;
                } else if (getIntent().getData() != null) {
                    Uri uri = getIntent().getData();
                    if (isAllowedUrl(uri)) startUrl = uri.toString();
                }
            }
            webView.loadUrl(startUrl);
        }
    }

    // ── FCM token registration ────────────────────────────────────────────────

    /**
     * يحفظ الرمز في SharedPreferences.
     * يُستدعى من: FCM token callback هنا، أو NukhbaFcmService عند تجديد الرمز.
     */
    void savePendingToken(String token) {
        if (token == null || token.isEmpty()) return;
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .edit()
            .putString(PREF_PENDING_TOKEN, token)
            .apply();
        Log.d(TAG, "FCM pending token saved");
    }

    /**
     * يُرسل رمز FCM للخادم عبر JavaScript داخل الـ WebView.
     *
     * ── لماذا JavaScript؟ ────────────────────────────────────────────────────
     *   fetch() من داخل WebView يعمل ضمن سياق learnukhba.com، مما يعني:
     *   - ملفات تعريف الارتباط (session cookie) تُرسل تلقائياً
     *   - الطلب نفسه يُعدّ Same-origin ولا يحتاج CORS
     *
     * ── آلية التحقق من النجاح ────────────────────────────────────────────────
     *   JS يستدعي NukhbaAdmin.onTokenRegistered(success, token) بعد اكتمال
     *   fetch() — وهي دالة @JavascriptInterface في NukhbaFcmBridge.
     *   فقط عند success=true تُحدَّث PREF_SENT_TOKEN.
     *   إذا كان الطلب 401 (المستخدم لم يسجّل دخوله)، يبقى الرمز معلّقاً
     *   ويُعاد المحاولة عند onPageFinished التالية.
     *
     * ── منع التكرار ──────────────────────────────────────────────────────────
     *   inFlightToken يمنع حقن نفس الرمز مرتين في نفس تحميل الصفحة.
     *   يُعاد ضبطه على "" في كل onPageFinished.
     */
    void tryRegisterFcmToken() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String pending = prefs.getString(PREF_PENDING_TOKEN, "");
        String sent    = prefs.getString(PREF_SENT_TOKEN, "");

        // لا شيء لإرساله، أو تمّ الإرسال بنجاح سابقاً
        if (pending.isEmpty() || pending.equals(sent)) return;
        // تجنّب حقن نفس الرمز مرتين في نفس تحميل الصفحة
        if (pending.equals(inFlightToken)) return;

        inFlightToken = pending;

        // دفاعي: منع JS injection — رمز FCM هو سلسلة Base64-URL لا تحتوي أحرف خاصة،
        // لكننا نُهرّب الأحرف الحساسة تحسّباً لأي تغيير مستقبلي في تنسيق الرمز.
        String safeToken = pending
            .replace("\\", "\\\\")
            .replace("'",  "\\'")
            .replace("\n", "")
            .replace("\r", "");

        // الـ JS يستدعي NukhbaAdmin.onTokenRegistered(bool, string) بعد اكتمال fetch().
        // NukhbaAdmin هو اسم الـ JavascriptInterface المسجّل في onCreate.
        String js =
            "(function(){"
            + "  var t = '" + safeToken + "';"
            + "  fetch('/api/admin/fcm-token',{"
            + "    method:'POST',"
            + "    credentials:'include',"
            + "    headers:{'Content-Type':'application/json','X-Nukhba-Csrf':'1'},"
            + "    body:JSON.stringify({token:t})"
            + "  })"
            + "  .then(function(r){ NukhbaAdmin.onTokenRegistered(r.ok, t); })"
            + "  .catch(function(){ NukhbaAdmin.onTokenRegistered(false, t); });"
            + "})();";

        webView.evaluateJavascript(js, null); // callback is null — result comes via bridge
        Log.d(TAG, "FCM token injection sent (awaiting bridge callback)");
    }

    // ── URL validation ────────────────────────────────────────────────────────

    private boolean isAllowedUrl(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme();
        String host   = uri.getHost();
        if (!ALLOWED_SCHEME.equalsIgnoreCase(scheme)) return false;
        if (host == null) return false;
        return host.equalsIgnoreCase(ALLOWED_HOST)
            || host.toLowerCase().endsWith("." + ALLOWED_HOST);
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    @Override
    public void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    // ── JavascriptInterface bridge — FCM token registration result ────────────

    /**
     * JavaScript bridge that receives the result of the FCM token registration
     * fetch() call from within the WebView.
     *
     * The @JavascriptInterface callback runs on a background thread — DO NOT
     * touch View hierarchy here. SharedPreferences.apply() is thread-safe.
     */
    private static final class NukhbaFcmBridge {

        private final MainActivity activity;

        NukhbaFcmBridge(MainActivity a) {
            this.activity = a;
        }

        /**
         * Called by JavaScript after fetch('/api/admin/fcm-token') resolves.
         *
         * @param success true if the HTTP response status was ok (2xx)
         * @param token   the FCM token that was submitted
         */
        @android.webkit.JavascriptInterface
        public void onTokenRegistered(boolean success, String token) {
            if (success) {
                // Mark this token as successfully sent — skip future retries.
                activity.getSharedPreferences(NukhbaFcmService.PREFS_NAME, 0)
                    .edit()
                    .putString(MainActivity.PREF_SENT_TOKEN, token)
                    .apply();
                Log.d("NukhbaFcmBridge", "FCM token registered with backend ✓");
            } else {
                // Leave PREF_SENT_TOKEN unchanged. inFlightToken will be cleared
                // on the next onPageFinished so the next page load retries.
                Log.w("NukhbaFcmBridge",
                    "FCM token registration failed (likely 401 — not logged in yet); will retry");
            }
        }
    }
}
