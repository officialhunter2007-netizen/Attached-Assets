package com.learnukhba.admin;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.*;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
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
 */
public class MainActivity extends AppCompatActivity {

    private static final String ALLOWED_HOST = "learnukhba.com";
    private static final String ALLOWED_SCHEME = "https";
    private static final String ADMIN_URL = "https://learnukhba.com/admin";

    private WebView            webView;
    private SwipeRefreshLayout swipeRefresh;

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

    // Requests CAMERA + RECORD_AUDIO at runtime before granting WebView media perms
    private final ActivityResultLauncher<String[]> mediaPermLauncher =
        registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(), results -> {
            if (pendingPermissionRequest == null) return;
            // Grant only the resources for which permission was actually granted
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

    @SuppressLint("SetJavaScriptEnabled")
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

        // ── WebViewClient — التنقل والأخطاء ──────────────────────────────────
        webView.setWebViewClient(new WebViewClient() {

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !isAllowedUrl(request.getUrl());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                swipeRefresh.setRefreshing(false);
            }
        });

        // ── WebChromeClient — الصلاحيات ورفع الملفات ─────────────────────────
        webView.setWebChromeClient(new WebChromeClient() {

            /**
             * يطلب صلاحيات الكاميرا/الميكروفون من نظام Android أولاً،
             * ثم يمنح WebView فقط ما تمت الموافقة عليه.
             */
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
                    // الصلاحيات ممنوحة مسبقاً — امنحها مباشرةً
                    request.grant(request.getResources());
                    pendingPermissionRequest = null;
                } else {
                    // اطلب صلاحيات Android أولاً؛ النتيجة في mediaPermLauncher
                    mediaPermLauncher.launch(toRequest.toArray(new String[0]));
                }
            }

            @Override
            public boolean onShowFileChooser(WebView webView,
                                             ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                fileChooserCallback = callback;
                String[] mimeTypes = params.getAcceptTypes();
                if (mimeTypes == null || mimeTypes.length == 0) {
                    mimeTypes = new String[]{"*/*"};
                }
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

        // ── تحميل URL الأدمن ─────────────────────────────────────────────────
        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            // تحقق من deep link أولاً (intent URL مسموح به فقط)
            String startUrl = ADMIN_URL;
            if (getIntent() != null && getIntent().getData() != null) {
                Uri uri = getIntent().getData();
                if (isAllowedUrl(uri)) {
                    startUrl = uri.toString();
                }
            }
            webView.loadUrl(startUrl);
        }
    }

    // ── URL validation — دقيق وآمن ───────────────────────────────────────────

    /**
     * يسمح فقط بـ:
     *   https://learnukhba.com/...
     *   https://*.learnukhba.com/...
     *
     * يمنع صراحةً:
     *   http:// (غير مشفر)
     *   https://evillearnukhba.com/ (suffix match خاطئ)
     *   https://learnukhba.com.evil.com/ (مزيف)
     */
    private boolean isAllowedUrl(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme();
        String host   = uri.getHost();
        if (!ALLOWED_SCHEME.equalsIgnoreCase(scheme)) return false;
        if (host == null) return false;
        return host.equalsIgnoreCase(ALLOWED_HOST)
            || host.toLowerCase().endsWith("." + ALLOWED_HOST);
    }

    // ── أزرار التنقل ──────────────────────────────────────────────────────────

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
}
