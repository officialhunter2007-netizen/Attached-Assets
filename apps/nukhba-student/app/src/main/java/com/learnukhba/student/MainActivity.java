package com.learnukhba.student;

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

public class MainActivity extends AppCompatActivity {

    private static final String ALLOWED_HOST   = "learnukhba.com";
    private static final String ALLOWED_SCHEME = "https";
    private static final String START_URL      = "https://learnukhba.com";

    private WebView            webView;
    private SwipeRefreshLayout swipeRefresh;

    private PermissionRequest    pendingPermissionRequest;
    private ValueCallback<Uri[]> fileChooserCallback;

    private final ActivityResultLauncher<String[]> filePickerLauncher =
        registerForActivityResult(new ActivityResultContracts.OpenMultipleDocuments(), uris -> {
            if (fileChooserCallback == null) return;
            fileChooserCallback.onReceiveValue(
                (uris == null || uris.isEmpty()) ? null : uris.toArray(new Uri[0]));
            fileChooserCallback = null;
        });

    private final ActivityResultLauncher<String[]> mediaPermLauncher =
        registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(), results -> {
            if (pendingPermissionRequest == null) return;
            List<String> granted = new ArrayList<>();
            for (String res : pendingPermissionRequest.getResources()) {
                if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)
                        && Boolean.TRUE.equals(results.get(Manifest.permission.CAMERA)))
                    granted.add(res);
                if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res)
                        && Boolean.TRUE.equals(results.get(Manifest.permission.RECORD_AUDIO)))
                    granted.add(res);
            }
            if (granted.isEmpty()) pendingPermissionRequest.deny();
            else pendingPermissionRequest.grant(granted.toArray(new String[0]));
            pendingPermissionRequest = null;
        });

    private final ActivityResultLauncher<String> notifPermLauncher =
        registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {});

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView      = findViewById(R.id.webView);
        swipeRefresh = findViewById(R.id.swipeRefresh);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setDatabaseEnabled(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

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

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                pendingPermissionRequest = request;
                List<String> toRequest = new ArrayList<>();
                for (String res : request.getResources()) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)
                            && ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                               != PackageManager.PERMISSION_GRANTED)
                        toRequest.add(Manifest.permission.CAMERA);
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res)
                            && ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                               != PackageManager.PERMISSION_GRANTED)
                        toRequest.add(Manifest.permission.RECORD_AUDIO);
                }
                if (toRequest.isEmpty()) {
                    request.grant(request.getResources());
                    pendingPermissionRequest = null;
                } else {
                    mediaPermLauncher.launch(toRequest.toArray(new String[0]));
                }
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                fileChooserCallback = callback;
                String[] mimeTypes = params.getAcceptTypes();
                if (mimeTypes == null || mimeTypes.length == 0) mimeTypes = new String[]{"*/*"};
                filePickerLauncher.launch(mimeTypes);
                return true;
            }
        });

        swipeRefresh.setColorSchemeResources(R.color.colorPrimary);
        swipeRefresh.setOnRefreshListener(() -> webView.reload());

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                   != PackageManager.PERMISSION_GRANTED)
            notifPermLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);

        if (savedInstanceState != null) webView.restoreState(savedInstanceState);
        else webView.loadUrl(START_URL);
    }

    private boolean isAllowedUrl(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme();
        String host   = uri.getHost();
        if (!ALLOWED_SCHEME.equalsIgnoreCase(scheme)) return false;
        if (host == null) return false;
        return host.equalsIgnoreCase(ALLOWED_HOST)
            || host.toLowerCase().endsWith("." + ALLOWED_HOST);
    }

    @Override
    public void onSaveInstanceState(@NonNull Bundle out) {
        super.onSaveInstanceState(out);
        webView.saveState(out);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
