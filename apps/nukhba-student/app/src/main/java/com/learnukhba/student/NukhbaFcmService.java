package com.learnukhba.student;

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
 * خدمة إشعارات FCM لتطبيق الطالب.
 *
 * تعرض إشعاراً نظامياً عند وصول رسالة من الخادم
 * (مثل: درس جديد، رد المعلم، تحديث المنهج).
 */
public class NukhbaFcmService extends FirebaseMessagingService {

    private static final String TAG = "NukhbaStudentFcm";
    private static final String CHANNEL_ID   = "student_alerts";
    private static final String CHANNEL_NAME = "تنبيهات نُخبة";
    private static final int    NOTIFICATION_ID = 2001;

    static final String PREFS_NAME         = "nukhba_student_fcm";
    static final String PREF_PENDING_TOKEN = "pending_fcm_token";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        super.onMessageReceived(message);

        String title = "نُخبة";
        String body  = "";

        if (message.getNotification() != null) {
            if (message.getNotification().getTitle() != null)
                title = message.getNotification().getTitle();
            if (message.getNotification().getBody() != null)
                body = message.getNotification().getBody();
        }
        if (body.isEmpty() && message.getData().containsKey("body"))
            body = message.getData().get("body");
        if (message.getData().containsKey("title"))
            title = message.getData().get("title");

        showNotification(title, body);
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "FCM token refreshed — saving for WebView registration");
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putString(PREF_PENDING_TOKEN, token).apply();
    }

    private void showNotification(String title, String body) {
        NotificationManager manager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("إشعارات منصة نُخبة التعليمية");
            ch.enableVibration(true);
            manager.createNotificationChannel(ch);
        }

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 0, intent,
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pi);

        manager.notify(NOTIFICATION_ID, builder.build());
    }
}
