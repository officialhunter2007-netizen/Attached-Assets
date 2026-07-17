# نُخبة — Student App ProGuard Rules

# الحفاظ على مكتبة androidbrowserhelper
-keep class com.google.androidbrowserhelper.** { *; }
-keep class androidx.browser.** { *; }

# منع تجريد نماذج الـ JavaScript Interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
