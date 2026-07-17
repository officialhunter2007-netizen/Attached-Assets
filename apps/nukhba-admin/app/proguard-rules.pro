# نُخبة — Admin App ProGuard Rules

# الحفاظ على MainActivity وكل الـ WebView callbacks
-keep class com.learnukhba.admin.** { *; }

-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
