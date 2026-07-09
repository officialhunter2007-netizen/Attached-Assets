# Prompt: توليد ملف تعليمات تطوير Mobile v4.1 لمنصة نُخبة

---

## دورك

أنت مهندس منهج خبير في تطوير تطبيقات الجوال. مهمتك إنشاء **ملف تعليمات v4.1 كامل لتخصص تطوير Mobile** يُنشر على منصة تعليمية ذكية.

### شروط النجاح الصارمة
1. JSON صالح — `JSON.parse()` بدون استثناء.
2. لا خطأ يمنع النشر في المدقق.
3. كل كود في prerequisites/enables موجود فعلاً.
4. كل معمل: **بالضبط 5 أسئلة** (diagnostic, decision, application, analysis, connection).
5. كل MCQ: choices ≥ 2 وcorrect_index صالح.
6. لا دورات في الـ prerequisites.
7. **جميع identifiers في الكود Dart/Flutter/JS بالإنجليزية**.

---

## هيكل الملف

```
3 مستويات × 7 مراحل × 9 وحدات × 10 دروس = 1,890 درس
لكل وحدة: معمل واحد (5 أسئلة)
بنوك أسئلة: unit_banks + stage_banks + level_banks
اختبار تحديد مستوى: 18 سؤالاً
```

**اللغة الأساسية للمنهج: Flutter/Dart** (متعدد المنصات)، مع جانب React Native في المستوى الثالث.

---

## مخطط المنهج الكامل

### المستوى الأول: أساسيات تطوير تطبيقات الجوال

| # | اسم المرحلة | الموضوع الجوهري |
|---|---|---|
| 1.1 | مدخل للعالم المتنقل | تطور تطبيقات الجوال، Native vs Cross-Platform، بيئة Flutter، Dart كلغة، أول تطبيق |
| 1.2 | لغة Dart الأساسية | الأنواع والمتغيرات، الدوال وOOP في Dart، Null Safety، Generics، Futures وStreams مقدمة |
| 1.3 | Flutter Widgets الأساسية | Stateless vs Stateful، MaterialApp وScaffold، Text وImage وIcon، Row وColumn وStack، ListView |
| 1.4 | التخطيط والتصميم (Layout) | Flex وExpanded وFlexible، Container وPadding وMargin، Responsive Design، MediaQuery، LayoutBuilder |
| 1.5 | التنقل بين الشاشات | Navigator 2.0، Named Routes، go_router، الـ Arguments بين الشاشات، Deep Linking |
| 1.6 | إدارة الحالة | setState الأساسي، Provider، Riverpod أساسيات، متى تستخدم كل منهم |
| 1.7 | مشروع شامل للمستوى الأول | تطبيق محادثة محلي أو تطبيق متجر بسيط بـ Navigation وState وUI متكامل |

### المستوى الثاني: Flutter المتقدم وخدمات الباكاند

| # | اسم المرحلة | الموضوع الجوهري |
|---|---|---|
| 2.1 | الشبكات والـ API | http وDio، JSON Serialization، Error Handling، Interceptors، Authentication Headers |
| 2.2 | قواعد البيانات المحلية | SQLite بـ sqflite، Hive وIsar، SharedPreferences، الكاش المحلي وOffline First |
| 2.3 | Firebase وBaaS | Firebase Auth، Firestore، Cloud Storage، FCM للإشعارات، Remote Config |
| 2.4 | الرسوم المتحركة | Implicit Animations، Explicit Animations، AnimationController، Hero Animation، Lottie |
| 2.5 | الأداء والتحسين | Widget Rebuild Optimization، const Widgets، ListView.builder، Flutter DevTools Profiling |
| 2.6 | اختبار التطبيقات | Unit Tests في Dart، Widget Tests، Integration Tests، Golden Tests |
| 2.7 | مشروع تطبيقي متكامل | تطبيق متكامل مع API حقيقي + Firebase + Auth + Offline Mode + Animations |

### المستوى الثالث: التطوير المتقدم والنشر

| # | اسم المرحلة | الموضوع الجوهري |
|---|---|---|
| 3.1 | Flutter المتقدم | Custom Painters، Platform Channels، Isolates للعمليات الثقيلة، Shader والـ GPU |
| 3.2 | React Native كإطار ثانٍ | RN Architecture New، JSX وComponents، StyleSheet، Navigation بـ react-navigation |
| 3.3 | معمارية التطبيقات الكبيرة | Clean Architecture في Flutter، BLoC Pattern عميق، Feature-Sliced Design، Module System |
| 3.4 | الأمن في تطبيقات الجوال | Certificate Pinning، Secure Storage، Obfuscation، Root Detection، OWASP Mobile Top 10 |
| 3.5 | النشر والتوزيع | App Store Connect، Google Play Console، Fastlane، CI/CD للجوال، Beta Testing |
| 3.6 | الذكاء الاصطناعي في الجوال | TFLite على الجهاز، ML Kit، On-Device LLM، الكاميرا والتعرف على الصور |
| 3.7 | مشروع التخرج | تطبيق إنتاجي شامل: Clean Architecture + Multiple Flavors + CI/CD + Store Submission |

---

## المخطط التفصيلي — المستوى 1

### المرحلة 1.1 — مدخل للعالم المتنقل (9 وحدات)

| الوحدة | الاسم | الدروس الـ10 |
|---|---|---|
| 1.1.1 | ما هو تطوير الجوال وما أهميته؟ | تطور الجوال من Nokia للـ Smartphone، Native Android (Java/Kotlin) مقدمة، Native iOS (Swift) مقدمة، Cross-Platform: فلسفة Write Once Run Anywhere، Flutter وDart: قصة Google، React Native وJavaScript، مقارنة الأداء: Native vs Flutter vs RN، حصص السوق العالمي والعربي، أكثر التطبيقات ربحاً وما قصتها، لماذا Flutter الخيار الأمثل للبداية |
| 1.1.2 | تثبيت Flutter وإعداد البيئة | تثبيت Flutter SDK على Windows وMac وLinux، Android Studio وإعداد الـ Emulator، VS Code مع Flutter extension، flutter doctor وحل المشاكل، إعداد مشروع جديد: flutter create، هيكل مشروع Flutter: lib وpubspec.yaml، Hot Reload وHot Restart الفرق، تشغيل على Android Emulator وiOS Simulator، تشغيل على جهاز حقيقي، Flutter DevTools نظرة أولى |
| 1.1.3 | أول تطبيق Flutter | ما هو Widget: كل شيء في Flutter هو Widget، MaterialApp: نقطة البداية، Scaffold: الهيكل العام، AppBar وBody وFloatingActionButton، Text: أبسط Widget، ElevatedButton وonPressed، setState: تغيير الحالة، Counter App: الكود الأصلي وفهمه، تعديل التطبيق وملاحظة Hot Reload، بناء تطبيق Hello World مخصص |
| 1.1.4 | pubspec.yaml وإدارة الحزم | ما هو pubspec.yaml وبنيته، إضافة Package من pub.dev، flutter pub get وpub add، الفرق بين dependencies وdev_dependencies، إصدارات الحزم: Semantic Versioning في Dart، Assets: إضافة صور وخطوط وملفات، Fonts: Google Fonts وخطوط عربية، Environment: SDK Version Constraints، حل تعارضات الحزم، أشهر الحزم في Flutter |
| 1.1.5 | Git مع Flutter | .gitignore لمشروع Flutter، إعداد remote وأول push، ما يُرفع وما لا يُرفع (build/، .dart_tool/)، Flutter مع monorepo، Conventional Commits في مشاريع Dart، git hooks وdart format + dart analyze، GitHub Actions لـ Flutter مقدمة، التعاون في Team: branching strategy، مراجعة Pull Request لكود Flutter، changelog ووcHANGELOG.md |
| 1.1.6 | أساليب تصميم تطبيقات الجوال | Material Design 3: المبادئ والمكونات، Human Interface Guidelines (Apple HIG)، الفرق بين Android وiOS في الـ UX، Typography: الخطوط وأحجامها في الجوال، Color System: Primary وSecondary وSurface، Dark Mode: الدعم من البداية، Accessibility في الجوال: TalkBack وVoiceOver، التخطيط للشاشات المختلفة (Phone/Tablet/Fold)، Gesture Navigation: Swipe وTap وLongPress، تمثيل الشاشات بـ Figma قبل الكود |
| 1.1.7 | لغة Dart: نظرة سريعة | Dart كلغة مؤهلة للـ Production، AOT وJIT compilation في Flutter، Type System: Strongly Typed، أهم الفروق عن Java وJavaScript، المكتبة القياسية dart:core، Dart Null Safety: المفهوم العام، Async الأساسي: Future وasync/await، Dart SDK مقابل Flutter SDK، DartPad للتجربة السريعة، مجتمع Dart والـ pub.dev |
| 1.1.8 | قراءة كود Flutter الحالي | قراءة الـ Flutter Samples الرسمية، فهم Widget tree بـ DevTools، استخدام الـ Flutter Inspector، قراءة كود مكتبات مفتوحة المصدر، تتبع setState وإعادة البناء، فهم الـ BuildContext، debug Prints وتتبع الـ State، FlutterError وكيف تقرأها، قراءة pubspec.lock، الـ Flutter Source Code: كيف تُطلق على الـ Widget الداخلية |
| 1.1.9 | مجتمع Flutter والموارد | pub.dev: كيف تبحث وتُقيّم، pub points وليكس scores وpopularity، Flutter Favorites: المكتبات الرسمية المُوصى بها، FlutterDev Discord وReddit، المجتمع العربي: مجموعات وقنوات، مساهمة في Flutter Open Source، قراءة CHANGELOG.md للمكتبات، مواكبة تحديثات Flutter، استخدام DartPad في التعلم، مسار تعلم Flutter بعد هذا المنهج |

### المرحلة 1.2 — لغة Dart الأساسية (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.2.1 | الأنواع والمتغيرات: var وfinal وconst |
| 1.2.2 | الدوال: Named Parameters وArrow Functions |
| 1.2.3 | OOP في Dart: Classes وConstructors |
| 1.2.4 | Null Safety: ?, !, late |
| 1.2.5 | Collections: List وMap وSet |
| 1.2.6 | Generics والـ Type Parameters |
| 1.2.7 | Error Handling: try/catch/finally |
| 1.2.8 | Futures وasync/await |
| 1.2.9 | Streams: أساس الـ Reactive Programming |

### المرحلة 1.3 — Flutter Widgets الأساسية (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.3.1 | Stateless Widget: البنية والاستخدام |
| 1.3.2 | Stateful Widget: State وsetState |
| 1.3.3 | Text وRichText وTextStyle |
| 1.3.4 | Image وAssetImage وNetworkImage |
| 1.3.5 | Container وDecoration |
| 1.3.6 | Row وColumn والـ Alignment |
| 1.3.7 | Stack وPositioned |
| 1.3.8 | ListView وGridView |
| 1.3.9 | Form وTextField والتحقق |

### المرحلة 1.4 — التخطيط والتصميم (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.4.1 | Flex وExpanded وFlexible |
| 1.4.2 | Padding وMargin وSizedBox |
| 1.4.3 | Card وListTile |
| 1.4.4 | AppBar وBottomNavigationBar |
| 1.4.5 | Drawer وEndDrawer |
| 1.4.6 | MediaQuery والـ Screen Size |
| 1.4.7 | LayoutBuilder والـ Constraints |
| 1.4.8 | CustomScrollView وSlivers |
| 1.4.9 | ThemeData والـ Color Scheme |

### المرحلة 1.5 — التنقل بين الشاشات (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.5.1 | Navigator.push وpop البسيط |
| 1.5.2 | Named Routes وRouteSettings |
| 1.5.3 | go_router: الإعداد والاستخدام |
| 1.5.4 | تمرير البيانات بين الشاشات |
| 1.5.5 | Bottom Tab Navigation |
| 1.5.6 | Nested Navigation |
| 1.5.7 | Deep Links والـ URL Schemes |
| 1.5.8 | Back Button Handling |
| 1.5.9 | Transitions المخصصة |

### المرحلة 1.6 — إدارة الحالة (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.6.1 | متى تحتاج State Management؟ |
| 1.6.2 | InheritedWidget: الأساس |
| 1.6.3 | Provider: الإعداد والاستخدام |
| 1.6.4 | Consumer وSelector في Provider |
| 1.6.5 | Riverpod: النهج الحديث |
| 1.6.6 | StateNotifier في Riverpod |
| 1.6.7 | BLoC: مقدمة وBlocProvider |
| 1.6.8 | مقارنة Provider/Riverpod/BLoC |
| 1.6.9 | Anti-Patterns في State Management |

---

### المستوى 2 — المرحلة 2.1: الشبكات والـ API (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.1.1 | HTTP في Flutter: http package |
| 2.1.2 | Dio: الميزات المتقدمة |
| 2.1.3 | JSON Serialization: json_serializable |
| 2.1.4 | Interceptors والـ Logging |
| 2.1.5 | Authentication: Bearer Tokens وRefresh |
| 2.1.6 | Error Handling وRetry Logic |
| 2.1.7 | Pagination وInfinite Scroll |
| 2.1.8 | WebSocket في Flutter |
| 2.1.9 | GraphQL في Flutter: Ferry وGraphQL Flutter |

### المستوى 2 — المرحلة 2.2: قواعد البيانات المحلية (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.2.1 | SharedPreferences: المفتاح-القيمة |
| 2.2.2 | SQLite بـ sqflite |
| 2.2.3 | Drift (Moor): ORM احترافي |
| 2.2.4 | Hive: قاعدة بيانات خفيفة |
| 2.2.5 | Isar: الجيل الجديد |
| 2.2.6 | Offline First: استراتيجية التصميم |
| 2.2.7 | Background Sync وWorkManager |
| 2.2.8 | File System: تخزين الملفات |
| 2.2.9 | Secure Storage: flutter_secure_storage |

### المستوى 2 — المرحلة 2.3: Firebase وBaaS (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.3.1 | Firebase Setup وFlutterFire CLI |
| 2.3.2 | Firebase Auth: Email/Google/Apple |
| 2.3.3 | Cloud Firestore: CRUD وQueries |
| 2.3.4 | Firestore Real-time Streams |
| 2.3.5 | Firebase Storage: رفع الملفات |
| 2.3.6 | FCM: الإشعارات الـ Push |
| 2.3.7 | Firebase Remote Config |
| 2.3.8 | Firebase Analytics وCrashlytics |
| 2.3.9 | Supabase كبديل مفتوح المصدر |

### المستوى 2 — المرحلة 2.4: الرسوم المتحركة (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.4.1 | Implicit Animations: AnimatedContainer |
| 2.4.2 | AnimatedList وAnimatedOpacity |
| 2.4.3 | AnimationController والـ Tween |
| 2.4.4 | CurvedAnimation والـ Curves |
| 2.4.5 | Hero Animation |
| 2.4.6 | PageView والـ Transitions |
| 2.4.7 | Lottie: Animations من After Effects |
| 2.4.8 | Rive: تفاعلية متقدمة |
| 2.4.9 | Gesture Animations |

### المستوى 2 — المرحلة 2.5: الأداء والتحسين (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.5.1 | Flutter DevTools: Timeline وMemory |
| 2.5.2 | Widget Rebuild المشكلة والحل |
| 2.5.3 | const Widgets: متى وكيف |
| 2.5.4 | ListView.builder مقابل ListView |
| 2.5.5 | RepaintBoundary والـ Layers |
| 2.5.6 | Image Caching: cached_network_image |
| 2.5.7 | Isolates للعمليات الثقيلة |
| 2.5.8 | App Size Optimization |
| 2.5.9 | Startup Time Optimization |

### المستوى 2 — المرحلة 2.6: اختبار التطبيقات (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.6.1 | Unit Testing في Dart |
| 2.6.2 | Widget Testing: pump وfind |
| 2.6.3 | Mocking بـ Mocktail |
| 2.6.4 | Integration Testing في Flutter |
| 2.6.5 | Golden Tests: Snapshot Testing |
| 2.6.6 | BLoC Testing |
| 2.6.7 | Code Coverage في Flutter |
| 2.6.8 | CI/CD للـ Tests: GitHub Actions |
| 2.6.9 | Performance Testing بـ DevTools |

---

### المستوى 3 — المرحلة 3.1: Flutter المتقدم (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.1.1 | Custom Painter: الرسم من الصفر |
| 3.1.2 | Platform Channels: التواصل مع Native |
| 3.1.3 | Method Channels وEvent Channels |
| 3.1.4 | Isolates وCompute: المعالجة الموازية |
| 3.1.5 | Flutter Rendering Pipeline |
| 3.1.6 | Shader وFragment Shader |
| 3.1.7 | FFI: التواصل مع مكتبات C |
| 3.1.8 | Desktop Support: Windows وMacOS |
| 3.1.9 | Flutter Web: الفرص والحدود |

### المستوى 3 — المرحلة 3.2: React Native (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.2.1 | React Native: المعمارية الجديدة (JSI/Fabric) |
| 3.2.2 | Expo: البداية السريعة |
| 3.2.3 | Components وStyleSheet |
| 3.2.4 | State Management في RN: Zustand |
| 3.2.5 | Navigation بـ react-navigation |
| 3.2.6 | Native Modules في RN |
| 3.2.7 | RN مقابل Flutter: متى تختار كلاً |
| 3.2.8 | RN في الإنتاج: تجارب شركات |
| 3.2.9 | Expo Modules API |

### المستوى 3 — المرحلة 3.3: معمارية التطبيقات الكبيرة (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.3.1 | Clean Architecture في Flutter |
| 3.3.2 | BLoC عميق: Events وStates وTransitions |
| 3.3.3 | Cubit مقابل BLoC |
| 3.3.4 | Feature-Sliced Design |
| 3.3.5 | Dependency Injection: GetIt وRiverpod |
| 3.3.6 | Module System وLazy Loading |
| 3.3.7 | Monorepo لمشاريع Flutter |
| 3.3.8 | Multi-Flavors: Dev وStaging وProd |
| 3.3.9 | Feature Flags والتحكم عن بُعد |

### المستوى 3 — المرحلة 3.4: الأمن في تطبيقات الجوال (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.4.1 | OWASP Mobile Top 10 |
| 3.4.2 | Certificate Pinning |
| 3.4.3 | Secure Storage والـ Keychain |
| 3.4.4 | Code Obfuscation في Flutter |
| 3.4.5 | Root/Jailbreak Detection |
| 3.4.6 | Biometric Authentication |
| 3.4.7 | Anti-Tampering والـ Integrity Check |
| 3.4.8 | Data Encryption في التطبيق |
| 3.4.9 | Penetration Testing للجوال |

### المستوى 3 — المرحلة 3.5: النشر والتوزيع (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.5.1 | App Store Connect: إعداد وNشر |
| 3.5.2 | Google Play Console: إعداد ونشر |
| 3.5.3 | Code Signing: Certificates وProvisioning |
| 3.5.4 | Fastlane: أتمتة النشر |
| 3.5.5 | CI/CD للجوال: Codemagic وBitrise |
| 3.5.6 | Beta Testing: TestFlight وPlay Internal |
| 3.5.7 | Semantic Versioning للتطبيقات |
| 3.5.8 | Crashlytics وMonitoring في Prod |
| 3.5.9 | App Store Optimization (ASO) |

### المستوى 3 — المرحلة 3.6: الذكاء الاصطناعي في الجوال (9 وحدات)

| الوحدة | الاسم |
|---|---|
| 3.6.1 | ML Kit: التعرف على الصور والنصوص |
| 3.6.2 | TFLite على الجهاز |
| 3.6.3 | Camera وImage Processing |
| 3.6.4 | Speech Recognition وTTS |
| 3.6.5 | On-Device LLM: المفهوم والأدوات |
| 3.6.6 | ChatGPT API في تطبيقات الجوال |
| 3.6.7 | Gemini API في Flutter |
| 3.6.8 | AR في تطبيقات الجوال |
| 3.6.9 | مستقبل AI في الجوال |

---

## اختبار تحديد المستوى (18 سؤالاً)

| # | target_level_index | target_unit_code | الموضوع |
|---|---|---|---|
| 1 | 1 | 1.1.2 | تثبيت Flutter وإعداد البيئة |
| 2 | 1 | 1.2.1 | var وfinal وconst في Dart |
| 3 | 1 | 1.2.4 | Null Safety |
| 4 | 1 | 1.3.1 | Stateless vs Stateful |
| 5 | 1 | 1.3.6 | Row وColumn |
| 6 | 1 | 1.4.1 | Expanded وFlexible |
| 7 | 1 | 1.5.1 | Navigator.push |
| 8 | 1 | 1.6.3 | Provider |
| 9 | 1 | 1.6.7 | BLoC مقدمة |
| 10 | 2 | 2.1.2 | Dio والـ Interceptors |
| 11 | 2 | 2.2.1 | SharedPreferences |
| 12 | 2 | 2.3.3 | Firestore CRUD |
| 13 | 2 | 2.4.1 | Implicit Animations |
| 14 | 2 | 2.5.3 | const Widgets |
| 15 | 3 | 3.1.2 | Platform Channels |
| 16 | 3 | 3.3.1 | Clean Architecture |
| 17 | 3 | 3.4.2 | Certificate Pinning |
| 18 | 3 | 3.5.4 | Fastlane |

---

## هيكل JSON المطلوب

```json
{
  "schema_version": "v4.1",
  "specialty": {
    "slug": "mobile-dev",
    "name": "تطوير تطبيقات الجوال",
    "icon": "📱",
    "description": "مسار شامل من مفاهيم الجوال حتى بناء ونشر تطبيقات إنتاجية بـ Flutter — يُخرج مطوراً قادراً على بناء تطبيقات جميلة وآمنة لـ Android وiOS",
    "target_persona": "مطور مبتدئ أو متوسط يريد دخول عالم الجوال المتعدد المنصات باستخدام Flutter كلغة رئيسية",
    "teacher_tone": "مطور متحمس يشارك أسرار الإنتاج الحقيقي ويُظهر كيف تُبنى التطبيقات التي نستخدمها يومياً",
    "allowed_viz_templates": ["flowchart", "architecture_diagram", "comparison_table", "tree_diagram"],
    "allowed_tools": ["nukhba_ide_js"],
    "glossary": []
  },
  "levels": [],
  "exam_banks": { "unit_banks": {}, "stage_banks": {}, "level_banks": {} },
  "placement_test_questions": []
}
```

---

## قواعد التحقق الصارمة

```
level_index:  1, 2, 3
stage_index:  1..7 داخل كل مستوى
unit_index:   1..9 داخل كل مرحلة
lesson_index: 1..10 داخل كل وحدة
كود الوحدة:  "L.S.U"
كود الدرس:   "L.S.U.N"
```

- كل معمل: 5 أسئلة بالضبط — diagnostic, decision, application, analysis, connection.
- كل MCQ: choices ≥ 2 وcorrect_index صالح.
- كل bridge_sentence ≥ 10 كلمات.
- جميع identifiers في كود Dart بالإنجليزية.

---

## قائمة التحقق النهائية

- [ ] JSON.parse() بدون استثناء
- [ ] slug = "mobile-dev"
- [ ] 3 × 7 × 9 × 10 = 1,890 درس
- [ ] كل معمل: 5 أسئلة من 5 أنواع مختلفة
- [ ] كل كود في prerequisites موجود فعلاً
- [ ] لا دورات في الروابط
- [ ] جميع identifiers في Dart/Flutter بالإنجليزية
- [ ] exam_banks: unit + stage + level
- [ ] 18 سؤال placement وكل target_unit_code موجود
