package com.learnukhba.admin;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * FCM service for the Nukhba admin app.
 *
 * Handles two responsibilities:
 *  1. onMessageReceived — displays a system notification when a new subscription
 *     request arrives, even when the app is in the background / killed.
 *  2. onNewToken — whenever FCM rotates the device token, it is saved in
 *     SharedPreferences so MainActivity can pick it up on next launch and
 *     register it with the backend through the authenticated WebView session.
 */
public class NukhbaFcmService extends FirebaseMessagingService {

    private static final String TAG = "NukhbaFcm";
    private static final String CHANNEL_ID   = "admin_alerts";
    private static final String CHANNEL_NAME = "تنبيهات الأدمن";
    private static final int    NOTIFICATION_ID = 1001;

    // Shared with MainActivity
    static final String PREFS_NAME         = "nukhba_fcm";
    static final String PREF_PENDING_TOKEN = "pending_fcm_token";

    // ── Incoming message ──────────────────────────────────────────────────────

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        super.onMessageReceived(message);

        String title = "نُخبة — إشعار جديد";
        String body  = "";

        // Prefer the notification payload when present (shown automatically by
        // FCM when the app is in the foreground here; when backgrounded the
        // system tray handles it directly).
        if (message.getNotification() != null) {
            if (message.getNotification().getTitle() != null) {
                title = message.getNotification().getTitle();
            }
            if (message.getNotification().getBody() != null) {
                body = message.getNotification().getBody();
            }
        }

        // Fall back to data payload keys so a data-only message also shows up.
        if (body.isEmpty() && message.getData().containsKey("body")) {
            body = message.getData().get("body");
        }
        if (message.getData().containsKey("title")) {
            title = message.getData().get("title");
        }

        showNotification(title, body);
    }

    // ── Token refresh ─────────────────────────────────────────────────────────

    /**
     * Called by FCM when the token is first created or rotated.
     *
     * We intentionally do NOT upload the token directly here via HTTP because
     * this service has no access to the admin's authenticated session cookie.
     * Instead we save the new token in SharedPreferences; MainActivity will
     * send it to the backend via WebView.evaluateJavascript() after the page
     * loads, so the fetch() call automatically carries the session cookie.
     */
    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "FCM token refreshed — saving for next WebView registration");
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(PREF_PENDING_TOKEN, token)
            .apply();
    }

    // ── Notification display ──────────────────────────────────────────────────

    private void showNotification(String title, String body) {
        NotificationManager manager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        // Create the channel once (no-op if it already exists).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("إشعارات لوحة تحكم نُخبة");
            channel.enableVibration(true);
            manager.createNotificationChannel(channel);
        }

        // Tap → open the admin subscriptions page directly.
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("open_url", "https://learnukhba.com/admin/subscriptions");

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, intent,
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

        manager.notify(NOTIFICATION_ID, builder.build());
    }
}
