# Prompt: توليد ملف تعليمات JavaScript v4.1 لمنصة نُخبة

---

## دورك

أنت مهندس منهج خبير في تعليم البرمجة للويب. مهمتك إنشاء **ملف تعليمات v4.1 كامل للغة JavaScript** يُنشر مباشرةً على منصة تعليمية ذكية. يجب أن يكون الناتج:

- ملف JSON واحد صالح بنسبة 100% للنشر (لا أخطاء في المدقّق).
- ذو جودة علمية وعملية فائقة — كل مفهوم قابل للتطبيق الفوري في بناء مواقع وتطبيقات ويب حقيقية.
- بتسلسل منطقي مريح يُشجّع الطالب على الاستمرار (لا قفزات مفاجئة، كل وحدة تبني على ما قبلها).
- الأمثلة من الحياة اليومية العربية العامة (ليست مقيّدة بمنطقة جغرافية).
- **جميع أسماء المتغيرات والدوال والكلاسات في كود JavaScript تُكتب بالإنجليزية/اللاتينية حصراً** — حتى في الأمثلة التوضيحية. أي نص للمستخدم أو مخرجات الكود أو محتوى HTML/CSS يمكن أن يكون عربياً.

---

## هيكل الملف المطلوب

```
2 مستويات × 7 مراحل × 10 وحدات × 10 دروس = 1,400 درس
لكل وحدة: معمل واحد (5 أسئلة بأنواع محددة)
بنوك أسئلة لكل وحدة + كل مرحلة + كل مستوى
اختبار تحديد مستوى: 18 سؤالاً
```

---

## مخطط المنهج الكامل

### المستوى الأول: أساسيات JavaScript والبرمجة التفاعلية

| # | اسم المرحلة | الموضوع الجوهري |
|---|---|---|
| 1.1 | البيئة والتركيب | المتصفح vs Node.js, console, script tag, DevTools, syntax, variables |
| 1.2 | الأنواع والعمليات | primitive types, type coercion, operators, Math, String methods, comparison pitfalls |
| 1.3 | التحكم في التدفق | if/else, ternary, switch, for/while/do-while, break/continue, for...of/for...in |
| 1.4 | الدوال والنطاق | function declaration vs expression, arrow functions, scope, hoisting, closures intro |
| 1.5 | المصفوفات والكائنات | arrays (methods), objects (literals, access, methods), JSON, nested structures |
| 1.6 | DOM والتفاعل | querySelector, events, createElement, form handling, classList, localStorage |
| 1.7 | مشروع شامل للمستوى الأول | تطبيق تفاعلي كامل بدون frameworks — todo list / quiz app / calculator web |

### المستوى الثاني: JavaScript الحديثة والمتقدمة

| # | اسم المرحلة | الموضوع الجوهري |
|---|---|---|
| 2.1 | OOP في JavaScript | prototype chain, ES6 classes, inheritance, static, private fields (#), mixins |
| 2.2 | البرمجة الوظيفية | closures عميق, higher-order functions, map/filter/reduce, currying, composition |
| 2.3 | Async والشبكة | event loop, callbacks, promises, async/await, fetch API, error handling async |
| 2.4 | ES6+ الحديث | destructuring, spread/rest, template literals, modules (import/export), iterators, generators |
| 2.5 | Node.js والخادم | Node.js basics, fs/path, Express.js, REST APIs, middleware, npm ecosystem |
| 2.6 | الأدوات والجودة | Jest, Webpack/Vite, ESLint/Prettier, TypeScript مقدمة, npm scripts, CI basics |
| 2.7 | مشروع حقيقي شامل | Full-stack app: Express backend + Vanilla/React frontend + قاعدة بيانات |

---

## المخطط التفصيلي لكل مرحلة (10 وحدات × 10 دروس)

### المستوى 1

#### المرحلة 1.1 — البيئة والتركيب (10 وحدات)

| الوحدة | الاسم | الدروس الـ10 (مواضيع) |
|---|---|---|
| 1.1.1 | JavaScript والمتصفح: أين نكتب الكود؟ | ما هي JavaScript وأين تعمل، المتصفح كـ runtime environment، DevTools Console أداة أول مطور، script tag: داخلي vs خارجي، ترتيب تنفيذ السكريبت في HTML، defer vs async attributes، Node.js كبيئة تشغيل خارج المتصفح، نصب Node.js وأول ملف .js، console.log وأشقاؤه (warn/error/table/dir)، أخطاء الإعداد الشائعة وحلولها |
| 1.1.2 | التركيب الأساسي وبنية الكود | Statements وSemicolons: الإلزامي والاختياري، Case Sensitivity والأسماء المحجوزة، تعليقات // و/* */، whitespace وقراءة الكود، strict mode وfاستخدامه، Naming Conventions: camelCase vs PascalCase vs SCREAMING_SNAKE، ECMAScript الإصدارات (ES5/ES6/ESNext)، أسلوب الكتابة الجيد والـ Prettier، قراءة رسائل الخطأ في Console (SyntaxError/ReferenceError/TypeError)، أول سكريبت: برنامج ترحيب تفاعلي |
| 1.1.3 | المتغيرات: var vs let vs const | var ومشاكله (function scope, hoisting, re-declaration)، let وblock scope الآمن، const والثوابت والمراجع، لماذا const أولاً ثم let وتجنّب var، الـ Temporal Dead Zone (TDZ)، hoisting: كيف يرفع JavaScript إعلانات المتغيرات، تأثير Hoisting على الـ debugging، Immutability مع const ومصفوفات/كائنات، نطاق الرؤية scope chain، تعيين بالتدمير Destructuring Assignment نظرة أولى |
| 1.1.4 | الإدخال والإخراج في بيئات مختلفة | alert/confirm/prompt في المتصفح (وعيوبها)، console API الكاملة مع أمثلة، document.write ولماذا نتجنبه، قراءة المدخلات من HTML forms، إخراج في HTML عبر innerHTML وtextContent، readline في Node.js، process.argv لقراءة arguments، تنسيق الإخراج: template literals وJSON.stringify، إخراج للملف مع fs.writeFile، حساب سرعة التنفيذ بـ console.time |
| 1.1.5 | أدوات التطوير DevTools | Elements Panel: فحص وتعديل DOM live، Console Panel: تنفيذ وتجربة كود، Sources Panel: تصفّح ملفات المشروع، Breakpoints: وقف التنفيذ وفحص المتغيرات، Watch Expressions وCall Stack، Network Panel: رؤية طلبات HTTP، Application Panel: localStorage وCookies، Lighthouse: قياس الأداء والـ Accessibility، Mobile Simulation، الـ Debugger في VS Code بديلاً |
| 1.1.6 | Git وأدوات المشروع | Git أساسيات: init/add/commit/push، .gitignore لـ JavaScript (node_modules, .env)، npm init وملف package.json، npm install وإدارة التبعيات، الفرق بين dependencies وdevDependencies، npm scripts في package.json، Prettier وESLint للإعداد الأول، VS Code extensions للجافاسكريبت، هيكل مشروع JS احترافي، README.md للمشروع |
| 1.1.7 | الأخطاء وتصحيحها | أنواع الأخطاء: SyntaxError/ReferenceError/TypeError/RangeError، try/catch/finally أول نظرة، throw لرمي أخطاء مخصصة، Error object وخصائصه (message, stack)، console.error للتوثيق الصحيح، تتبع Stack Trace قراءة وتفسير، أفضل ممارسات الـ debugging: تبسيط المشكلة، Rubber Duck Debugging المفهوم، أخطاء الإنتاج vs التطوير، Window.onerror وunhandledrejection |
| 1.1.8 | تشغيل JavaScript في Node.js | Node.js vs Browser: الفرق في APIs المتاحة، REPL التفاعلي في Node.js، تشغيل ملف .js، Global objects: process, global, __dirname, __filename، وحدات Node.js المدمجة (path, os, fs نظرة أولى)، CommonJS modules: require وmodule.exports، Node.js Event Loop المبدئي، NPM registry والبحث عن packages، nodemon للتطوير بإعادة تشغيل تلقائية، أول server بسيط بـ http module |
| 1.1.9 | أسلوب الكود الجيد من البداية | Prettier إعداد وتفعيل، ESLint قواعد مقترحة للمبتدئ، أسماء معبّرة بلا تعليق، الدوال القصيرة والمركّزة، تجنّب الكود المتكرر (DRY)، الثوابت المسمّاة بدلاً من magic values، التعليقات: متى تكتب ومتى لا، Code Review: كيف تراجع كودك بنفسك، Refactoring مفهوم وتطبيق بسيط، الفرق بين كود يعمل وكود احترافي |
| 1.1.10 | مشروع مرحلة: بيئة احترافية كاملة | إعداد مشروع من الصفر بـ npm، إضافة ESLint + Prettier مع إعدادات مخصصة، هيكل مجلدات واضح (src/utils/tests)، Git repository مع commits ذات معنى، nodemon للتطوير، أول module مخصص بـ CommonJS، اختبار يدوي لكل وظيفة، توثيق JSDoc، نشر على GitHub، التقييم الذاتي بالمعايير المهنية |

#### المرحلة 1.2 — الأنواع والعمليات (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.2.1 | الأنواع البدائية: Number, String, Boolean, undefined, null, Symbol, BigInt |
| 1.2.2 | typeof والتحقق من الأنواع (pitfalls: typeof null) |
| 1.2.3 | Type Coercion الضمني: متى يحدث ولماذا؟ |
| 1.2.4 | العمليات الحسابية وفخاخ الأرقام (0.1+0.2, NaN, Infinity) |
| 1.2.5 | String methods الكاملة: slice, split, replace, template literals |
| 1.2.6 | المقارنة: == vs === والأخطاء الشائعة |
| 1.2.7 | العمليات المنطقية: &&, ||, ??, ! وShort-Circuit Evaluation |
| 1.2.8 | Math object: random, floor, ceil, round, min, max |
| 1.2.9 | Regular Expressions أساسيات في JavaScript |
| 1.2.10 | مشروع: محلل ومنظّف بيانات نصية |

#### المرحلة 1.3 — التحكم في التدفق (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.3.1 | if/else والشروط المركّبة |
| 1.3.2 | Ternary Operator والاستخدام المناسب |
| 1.3.3 | switch والحالات الافتراضية |
| 1.3.4 | for loop والمتغير i وأنماطه |
| 1.3.5 | while وdo-while ومتى نختار كلاً منهما |
| 1.3.6 | break وcontinue وlabels |
| 1.3.7 | for...of للمصفوفات والـ iterables |
| 1.3.8 | for...in للكائنات (وفخاخه) |
| 1.3.9 | أنماط التحكم: Guard Clause وEarly Return وTable-Driven |
| 1.3.10 | مشروع: محرك قرارات (Decision Engine) |

#### المرحلة 1.4 — الدوال والنطاق (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.4.1 | Function Declaration vs Expression |
| 1.4.2 | Arrow Functions: الصياغة ومتى نستخدمها |
| 1.4.3 | المعاملات: الافتراضية والـ Rest Parameters |
| 1.4.4 | Return values وتعدد المخرجات بالكائنات |
| 1.4.5 | Scope: Global vs Function vs Block |
| 1.4.6 | Hoisting الكامل: variables وfunctions |
| 1.4.7 | Closures: المفهوم والتطبيق |
| 1.4.8 | IIFE وحماية النطاق |
| 1.4.9 | Recursion في JavaScript |
| 1.4.10 | مشروع: مكتبة دوال Utility |

#### المرحلة 1.5 — المصفوفات والكائنات (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.5.1 | المصفوفات: إنشاء وأساسيات الوصول والطول |
| 1.5.2 | Array methods: push/pop/shift/unshift/splice/slice |
| 1.5.3 | Array methods التحويلية: map/filter/reduce/find/some/every |
| 1.5.4 | المصفوفات المتداخلة وflat/flatMap |
| 1.5.5 | الكائنات: بنية المفتاح-القيمة وطرق الوصول |
| 1.5.6 | Object methods: keys/values/entries/assign/freeze |
| 1.5.7 | Spread Operator وDestructuring (أولى) |
| 1.5.8 | JSON: parse/stringify والبيانات |
| 1.5.9 | Map وSet: متى نختارهما على Array/Object |
| 1.5.10 | مشروع: نظام بيانات طلاب كامل |

#### المرحلة 1.6 — DOM والتفاعل (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.6.1 | DOM: ما هو ولماذا هو مهم؟ |
| 1.6.2 | querySelector وquerySelectorAll وطرق الاختيار |
| 1.6.3 | تعديل المحتوى: textContent وinnerHTML |
| 1.6.4 | تعديل التنسيق: style وclassList |
| 1.6.5 | Events: addEventListener وأنواع الأحداث |
| 1.6.6 | Event Object وpreventDefault وstopPropagation |
| 1.6.7 | Forms: قراءة البيانات والتحقق منها |
| 1.6.8 | إنشاء عناصر ديناميكية وحذفها |
| 1.6.9 | localStorage وsessionStorage |
| 1.6.10 | مشروع: تطبيق تفاعلي كامل (Todo/Quiz) |

#### المرحلة 1.7 — مشروع شامل للمستوى الأول (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.7.1 | تحليل المتطلبات وتصميم البنية |
| 1.7.2 | هيكل HTML/CSS الأساسي للمشروع |
| 1.7.3 | وحدات JavaScript وتنظيم الكود |
| 1.7.4 | طبقة البيانات (Data Layer) |
| 1.7.5 | طبقة واجهة المستخدم (UI Layer) |
| 1.7.6 | ربط البيانات بالواجهة (Data Binding يدوي) |
| 1.7.7 | التحقق من المدخلات والأخطاء |
| 1.7.8 | localStorage للحفظ والاسترجاع |
| 1.7.9 | الاختبار اليدوي وإصلاح الأخطاء |
| 1.7.10 | التوثيق والنشر على GitHub Pages |

---

### المستوى 2

#### المرحلة 2.1 — OOP في JavaScript (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.1.1 | الكائنات والـ Prototype Chain |
| 2.1.2 | Constructor Functions والـ new keyword |
| 2.1.3 | ES6 Classes: بنية وأسلوب |
| 2.1.4 | Inheritance بـ extends وsuper |
| 2.1.5 | Static methods وproperties |
| 2.1.6 | Private Fields (#) وEncapsulation |
| 2.1.7 | Getters وSetters |
| 2.1.8 | Mixins وتركيب السلوكيات |
| 2.1.9 | Design Patterns: Factory وSingleton وObserver |
| 2.1.10 | مشروع: نظام إدارة بـ OOP كامل |

#### المرحلة 2.2 — البرمجة الوظيفية (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.2.1 | Closures عميق: حالة خاصة وذاكرة |
| 2.2.2 | Higher-Order Functions |
| 2.2.3 | map/filter/reduce: تعمّق وأنماط متقدمة |
| 2.2.4 | Function Composition وPipe |
| 2.2.5 | Currying وPartial Application |
| 2.2.6 | Pure Functions وSide Effects |
| 2.2.7 | Immutability ومعالجة البيانات بأمان |
| 2.2.8 | Memoization وتحسين الأداء |
| 2.2.9 | FP في سياق عملي (data pipelines) |
| 2.2.10 | مشروع: محرك تحليل بيانات وظيفي |

#### المرحلة 2.3 — Async والشبكة (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.3.1 | Event Loop والـ Call Stack وTask Queue |
| 2.3.2 | setTimeout وsetInterval |
| 2.3.3 | Callbacks ومشكلة Callback Hell |
| 2.3.4 | Promises: إنشاء وتسلسل |
| 2.3.5 | Promise.all/race/allSettled/any |
| 2.3.6 | async/await: كتابة Async كـ Sync |
| 2.3.7 | Fetch API وطلبات HTTP |
| 2.3.8 | معالجة أخطاء Async بأمان |
| 2.3.9 | AbortController وإلغاء الطلبات |
| 2.3.10 | مشروع: تطبيق بيانات حية من API |

#### المرحلة 2.4 — ES6+ الحديث (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.4.1 | Destructuring: Arrays وObjects |
| 2.4.2 | Spread وRest في كل السياقات |
| 2.4.3 | Template Literals المتقدمة (Tagged Templates) |
| 2.4.4 | ES Modules: import/export |
| 2.4.5 | Optional Chaining (?.) وNullish Coalescing (??) |
| 2.4.6 | Iterators والـ Protocol |
| 2.4.7 | Generators وfunction* |
| 2.4.8 | Symbol وWell-Known Symbols |
| 2.4.9 | Proxy وReflect |
| 2.4.10 | مشروع: مكتبة Utilities بـ ES6+ |

#### المرحلة 2.5 — Node.js والخادم (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.5.1 | Node.js Architecture وEvent-Driven |
| 2.5.2 | File System: قراءة وكتابة وإدارة الملفات |
| 2.5.3 | HTTP module: بناء Server من الصفر |
| 2.5.4 | Express.js: التثبيت والأساسيات |
| 2.5.5 | Express: Routes وMiddleware |
| 2.5.6 | REST API: GET/POST/PUT/DELETE |
| 2.5.7 | معالجة الطلبات: Body Parsing وValidation |
| 2.5.8 | قواعد البيانات مع Node (SQLite/MongoDB مقدمة) |
| 2.5.9 | Authentication: JWT أساسيات |
| 2.5.10 | مشروع: REST API كامل بـ Express |

#### المرحلة 2.6 — الأدوات والجودة (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.6.1 | اختبارات الوحدة: لماذا وكيف؟ |
| 2.6.2 | Jest: الأساسيات والـ Test Suites |
| 2.6.3 | Jest: Mocking وSpies |
| 2.6.4 | Testing Async Code بـ Jest |
| 2.6.5 | Webpack/Vite: bundling ولماذا نحتاجه |
| 2.6.6 | ESLint بإعدادات متقدمة |
| 2.6.7 | TypeScript مقدمة: Types وInterfaces |
| 2.6.8 | Performance Profiling في DevTools |
| 2.6.9 | npm publishing وإنشاء package خاص |
| 2.6.10 | CI/CD: GitHub Actions لـ JavaScript |

#### المرحلة 2.7 — مشروع حقيقي شامل (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.7.1 | تصميم النظام: Architecture وتقسيم المسؤوليات |
| 2.7.2 | إعداد Monorepo بـ npm workspaces |
| 2.7.3 | Backend: Express API مع قاعدة بيانات |
| 2.7.4 | Frontend: SPA بدون Framework (Vanilla JS) |
| 2.7.5 | Authentication من الصفر |
| 2.7.6 | Real-time بـ WebSockets |
| 2.7.7 | File Uploads والمعالجة |
| 2.7.8 | اختبارات E2E بـ Playwright |
| 2.7.9 | Deployment: Railway/Vercel/Render |
| 2.7.10 | التقديم النهائي: Documentation وRetrospective |

---

## المخطط الكامل للـ JSON المطلوب

```json
{
  "schema_version": "v4.1",
  "specialty": {
    "slug": "javascript",
    "name": "لغة JavaScript",
    "icon": "🟨",
    "description": "...",
    "target_persona": "...",
    "teacher_tone": "...",
    "allowed_viz_templates": ["flowchart", "comparison_table", "architecture_diagram", "timeline", "network_diagram"],
    "allowed_tools": ["nukhba_ide_js", "regex_playground"],
    "glossary": [...]
  },
  "levels": [
    {
      "level_index": 1,
      "name": "أساسيات JavaScript والبرمجة التفاعلية",
      "goal": "...",
      "bloom_focus": "apply",
      "exam": { "pass_threshold_percent": 70, "time_limit_minutes": 90 },
      "stages": [
        {
          "stage_index": 1,
          "name": "البيئة والتركيب",
          "goal": "...",
          "bloom_focus": "understand",
          "exam": { "pass_threshold_percent": 70, "time_limit_minutes": 45 },
          "units": [
            {
              "unit_index": 1,
              "name": "JavaScript والمتصفح: أين نكتب الكود؟",
              "goal": "...",
              "prerequisite_units": [],
              "enables_units": ["1.1.2"],
              "key_concepts": ["Browser Runtime", "DevTools", "script tag", "Node.js", "console API"],
              "motivation_hook": "...",
              "learning_objectives": [
                { "statement": "...", "bloom_level": "understand" }
              ],
              "exam": { "pass_threshold_percent": 70, "time_limit_minutes": 20 },
              "labs": [
                {
                  "lab_index": 1,
                  "title": "...",
                  "scenario": "...",
                  "completion_criterion": "...",
                  "pedagogical_sequence": "...",
                  "questions": [
                    { "kind": "diagnostic",  "prompt": "...", "rubric": "...", "solution_outline": "...", "points": 1 },
                    { "kind": "decision",    "prompt": "...", "rubric": "...", "solution_outline": "...", "points": 2 },
                    { "kind": "application", "prompt": "...", "rubric": "...", "solution_outline": "...", "points": 3 },
                    { "kind": "analysis",    "prompt": "...", "rubric": "...", "solution_outline": "...", "points": 2 },
                    { "kind": "connection",  "prompt": "...", "rubric": "...", "solution_outline": "...", "points": 2 }
                  ]
                }
              ],
              "lessons": [
                {
                  "lesson_index": 1,
                  "name": "ما هي JavaScript ولماذا هي لغة الويب الأولى؟",
                  "goal": "...",
                  "bridge_sentence": "...",
                  "prerequisite_lessons": [],
                  "enables_lessons": ["1.1.1.2"],
                  "motivation_hook": "...",
                  "learning_objectives": [
                    { "statement": "...", "bloom_level": "understand" }
                  ],
                  "concepts": [
                    {
                      "name": "JavaScript as the Language of the Web",
                      "explanation": "...",
                      "mastery_criterion": "...",
                      "weight": 2
                    }
                  ],
                  "common_mistakes": [
                    {
                      "mistake": "...",
                      "correction": "...",
                      "treatment": "...",
                      "severity": "major"
                    }
                  ],
                  "yemeni_examples": ["..."],
                  "final_check_question": "...",
                  "session_complete_criterion": "...",
                  "solution_outline": "...",
                  "expected_duration_minutes": 25,
                  "glossary": [
                    { "term": "Runtime Environment", "definition": "..." }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "exam_banks": {
    "unit_banks": { "1.1.1": { "variants": [[...]] } },
    "stage_banks": { "1.1": { "variants": [[...]] } },
    "level_banks": { "1": { "variants": [[...]] } }
  },
  "placement_test_questions": [...]
}
```

---

## قواعد التحقق الصارمة (أخطاء تمنع النشر)

### 1. قواعد الترقيم
- `level_index`: 1 للمستوى الأول، 2 للثاني. لا تكرار.
- `stage_index`: 1..7 داخل كل مستوى. لا تكرار داخل نفس المستوى.
- `unit_index`: 1..10 داخل كل مرحلة. لا تكرار داخل نفس المرحلة.
- `lesson_index`: 1..10 داخل كل وحدة. لا تكرار داخل نفس الوحدة.

### 2. رموز الوحدات والدروس
- كود الوحدة = `"L.S.U"` مثل `"1.1.1"` (المستوى.المرحلة.الوحدة)
- كود الدرس = `"L.S.U.Lesson"` مثل `"1.1.1.1"`
- كود المرحلة = `"L.S"` مثل `"1.1"`

### 3. قواعد الروابط (cross-references)
- **كل كود في `prerequisite_units`** يجب أن يوجد في الملف فعلاً.
- **كل كود في `enables_units`** يجب أن يوجد في الملف فعلاً.
- **كل كود في `prerequisite_lessons`** (في الدرس أو المعمل) يجب أن يوجد في الملف فعلاً.
- **كل كود في `enables_lessons`** يجب أن يوجد في الملف فعلاً.
- **لا دورات (cycles)** في رسم prerequisite_units أو prerequisite_lessons.

### 4. المعمل (Lab)
- كل وحدة يجب أن تحتوي **معملاً واحداً على الأقل**.
- كل معمل يحتوي **بالضبط 5 أسئلة**.
- الأنواع الـ5 تظهر **كل واحدة مرة واحدة فقط**:
  1. `diagnostic` — يكشف المعرفة المسبقة
  2. `decision` — يطلب اتخاذ قرار بين خيارات
  3. `application` — تطبيق عملي (كتابة كود)
  4. `analysis` — تحليل كود أو نتيجة
  5. `connection` — ربط بمفاهيم أخرى
- **لا يُسمح بتكرار نوع** في نفس المعمل.

### 5. أسئلة الاختيار من متعدد (MCQ)
- يجب أن تحتوي على `choices` بـ2 خيارات على الأقل.
- يجب أن تحتوي على `correct_index` صالح (0 ≤ correct_index < choices.length).

### 6. الحقول الإلزامية لكل درس
```
name, goal, bridge_sentence, prerequisite_lessons (array),
enables_lessons (array), concepts (min 1), common_mistakes (min 1),
yemeni_examples (min 1), final_check_question, session_complete_criterion
```

### 7. الحقول الإلزامية لكل مفهوم (concept)
```
name (فريد داخل الدرس الواحد), explanation, mastery_criterion
```

### 8. bridge_sentence ≥ 10 كلمات
### 9. pass_threshold_percent بين 40 و95

---

## اختبار تحديد المستوى (Placement Test)

أنتج **18 سؤالاً MCQ** بالتوزيع التالي:

| # | target_level_index | target_unit_code | الموضوع |
|---|---|---|---|
| 1 | 1 | 1.1.2 | التركيب الأساسي وVar/Let/Const |
| 2 | 1 | 1.2.1 | أنواع البيانات البدائية |
| 3 | 1 | 1.2.3 | Type Coercion والـ == |
| 4 | 1 | 1.3.1 | if/else وShort-Circuit |
| 5 | 1 | 1.3.7 | for...of وfor...in |
| 6 | 1 | 1.4.2 | Arrow Functions |
| 7 | 1 | 1.4.7 | Closures |
| 8 | 1 | 1.5.3 | map/filter/reduce |
| 9 | 1 | 1.6.2 | querySelector والـ DOM |
| 10 | 2 | 2.1.1 | Prototype Chain |
| 11 | 2 | 2.1.3 | ES6 Classes |
| 12 | 2 | 2.2.3 | Higher-Order Functions |
| 13 | 2 | 2.3.1 | Event Loop |
| 14 | 2 | 2.3.4 | Promises |
| 15 | 2 | 2.3.6 | async/await |
| 16 | 2 | 2.4.1 | Destructuring |
| 17 | 2 | 2.4.4 | ES Modules |
| 18 | 2 | 2.5.6 | REST API بـ Express |

---

## معايير الجودة العلمية والعملية

### الدرس المثالي
- **`goal`**: قدرة عملية قابلة للقياس ≥ 20 كلمة.
- **`bridge_sentence`**: جملة ربط بين الدرس السابق والحالي ≥ 10 كلمات.
- **`motivation_hook`**: لماذا يهمّ هذا الدرس في بناء مواقع وتطبيقات حقيقية.
- **`learning_objectives`**: 2-4 أهداف Bloom من understand → apply.
- **`concepts`**: 3-5 مفاهيم حقيقية:
  - `name`: بالإنجليزية أو اسم معبّر.
  - `explanation`: ≥ 30 كلمة مع مثال كودي مدمج.
  - `mastery_criterion`: ما يستطيع الطالب المتقن فعله.
  - `weight`: 1 عادي، 2 محوري، 3 أساسي جداً.
- **`common_mistakes`**: 1-3 أخطاء حقيقية مع:
  - `severity`: `"minor"` أسلوبي، `"major"` منطقي، `"critical"` (مثل: XSS، security holes، memory leaks).
- **`yemeni_examples`**: مثال عربي من الحياة اليومية (متاجر إلكترونية، نظم حجز، تطبيقات تعليم).
- **`final_check_question`**: سؤال عميق لا إجابته yes/no.
- **`session_complete_criterion`**: معيار واضح وقابل للقياس.
- **`solution_outline`**: إجابة نموذجية للـ final_check_question (للمعلم الذكي فقط).

### المعمل المثالي
- **`scenario`**: مشكلة ويب حقيقية ≥ 50 كلمة.
- **`application` question**: يطلب كتابة كود JavaScript يعمل فعلاً.
- **`analysis` question**: يُقدّم كوداً فيه خطأ أو سلوك غير متوقع.
- **`connection` question**: يربط الموضوع بـ DOM أو Async أو مفهوم قادم.

### بنك الأسئلة
- وحدة: **5-8 MCQ** per variant.
- مرحلة: **10-15 MCQ** per variant.
- مستوى: **15-20 MCQ** per variant.
- الخيارات الخاطئة (distractors): معقولة وقريبة (مثل: `==` vs `===`, `undefined` vs `null`).
- `explanation`: يشرح لماذا الإجابة صحيحة ولماذا الأخرى خاطئة.

---

## تعليمات الكود

- **جميع identifiers** في كود JavaScript **بالإنجليزية الخالصة**.
- النصوص المعروضة للمستخدم (داخل `console.log`, `alert`, HTML content) يمكن بالعربية.
- أمثلة صحيحة:
  ```javascript
  const studentName = "أحمد";
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  console.log(`مرحباً ${studentName}، مجموعك: ${totalScore}`);
  ```
- أمثلة خاطئة (لا تفعل):
  ```javascript
  const اسمالطالب = "أحمد";
  function احسبالمجموع(درجات) { }
  ```

---

## نموذج درس مكتمل

```json
{
  "lesson_index": 1,
  "name": "ما هي JavaScript ولماذا هي اللغة الأولى للويب؟",
  "goal": "يفهم الطالب المكانة الحقيقية لـ JavaScript في بناء الويب ويستطيع تمييز بيئات التشغيل المختلفة ويُعرّف الـ Runtime Environment وعلاقته بالمتصفح وNode.js",
  "bridge_sentence": "كل موقع تفتحه على الإنترنت الآن فيه JavaScript تعمل في الخلفية — سنكتشف لماذا هي الوحيدة التي تعمل داخل المتصفح مباشرةً وكيف خرجت للخادم أيضاً",
  "prerequisite_lessons": [],
  "enables_lessons": ["1.1.1.2"],
  "motivation_hook": "JavaScript هي اللغة الوحيدة التي تبني بها الواجهة والخادم وتطبيقات الموبايل والـ AI APIs — تعلّمها يفتح ثلاثة مسارات مهنية بلغة واحدة",
  "learning_objectives": [
    { "statement": "يشرح الطالب الفرق بين JavaScript في المتصفح وفي Node.js ويذكر بيئة تشغيل واحدة لكل منهما", "bloom_level": "understand" },
    { "statement": "يصنّف الطالب أمثلة تقنية شائعة (React, Express, Next.js) حسب بيئة تشغيلها", "bloom_level": "understand" },
    { "statement": "يستخدم الطالب console.log في المتصفح وفي Node.js لإخراج أول رسالة", "bloom_level": "apply" }
  ],
  "concepts": [
    {
      "name": "JavaScript Runtime Environment",
      "explanation": "الـ Runtime هو البيئة التي تُفسّر وتُنفّذ كود JavaScript. المتصفح (Chrome/Firefox) يملك Runtime يُوفّر APIs للـ DOM والـ Fetch والـ setTimeout. Node.js Runtime يُوفّر APIs للنظام (fs/http/process). الكود نفسه يمكن أن يعمل في كليهما إذا تجنّبت APIs البيئة المحددة.",
      "mastery_criterion": "يستطيع الطالب تحديد أي code snippet يعمل في المتصفح فقط أو Node.js فقط أو كليهما، ويُعلّل إجابته",
      "weight": 3
    },
    {
      "name": "JavaScript as the Only Native Browser Language",
      "explanation": "المتصفح يفهم ثلاثة أشياء فقط: HTML للهيكل، CSS للتصميم، JavaScript للسلوك. Python وJava وRuby لا تعمل في المتصفح مباشرةً. هذا جعل JavaScript حتمية لكل مطور ويب، ودفع لنشوء Node.js عام 2009 لتشغيلها خارجه.",
      "mastery_criterion": "يُجيب الطالب على سؤال 'لماذا لا يمكن استخدام Python في المتصفح مباشرةً؟' بشرح صحيح",
      "weight": 2
    },
    {
      "name": "The JavaScript Engine (V8, SpiderMonkey)",
      "explanation": "كل متصفح يحتوي محرك JavaScript: Chrome يستخدم V8 (نفسه في Node.js)، Firefox يستخدم SpiderMonkey. المحرك يُحوّل كود JavaScript إلى تعليمات تفهمها المعالج. V8 يستخدم JIT compilation لتسريع التنفيذ.",
      "mastery_criterion": "يُعرّف الطالب دور الـ JavaScript Engine ويذكر اسم محركَين مختلفَين",
      "weight": 1
    }
  ],
  "common_mistakes": [
    {
      "mistake": "الطالب يعتقد أن Node.js هو إطار عمل (framework) مثل React أو Express",
      "correction": "Node.js هو Runtime Environment — البيئة التي تُشغّل JavaScript خارج المتصفح. Express وNest.js هم frameworks تعمل فوق Node.js",
      "treatment": "استخدم التشبيه: Node.js كالأرض، Express كالبناية عليها. اسأل الطالب: هل تقود السيارة أم تقود المحرك؟",
      "severity": "major"
    },
    {
      "mistake": "خلط بين Java وJavaScript: الطالب يظن أن لهما علاقة قرابة",
      "correction": "Java وJavaScript لغتان مختلفتان تماماً — التسمية المشتركة تسويقية من التسعينيات. Java: compiled, statically typed, JVM. JavaScript: interpreted, dynamically typed, browser/Node",
      "treatment": "اسأل: 'ما الفرق بين السيارة والسجادة؟' — أحياناً الأسماء المتشابهة خادعة جداً",
      "severity": "minor"
    }
  ],
  "yemeni_examples": [
    "تطبيق توصيل الطعام الذي تستخدمه: الأزرار التفاعلية والخريطة الحية والإشعارات كلها JavaScript تعمل في متصفحك، بينما حساب الفاتورة ومعالجة الدفع يحدثان على خادم Node.js في الخلفية"
  ],
  "final_check_question": "زميلك يريد بناء موقع يعرض أسعار العملات لحظةً بلحظة. أي جزء من هذا الموقع سيكتبه بـ JavaScript في المتصفح وأي جزء على الخادم؟ علّل إجابتك.",
  "session_complete_criterion": "يستطيع الطالب شرح ما الذي يجعل JavaScript فريدة كلغة الويب، والتمييز بين بيئة المتصفح وNode.js، وكتابة console.log في كل منهما",
  "solution_outline": "جزء المتصفح: عرض الأسعار وتحديث الـ DOM لحظياً وأزرار التصفية. جزء الخادم (Node.js): الاتصال بـ API مزوّد أسعار العملات، حساب الفروق والنسب، إرسال البيانات للمتصفح عبر HTTP/WebSocket.",
  "expected_duration_minutes": 25,
  "glossary": [
    { "term": "Runtime Environment", "definition": "البيئة التي تُنفّذ الكود — توفر APIs ومحرك تفسير ونموذج تنفيذ" },
    { "term": "V8", "definition": "محرك JavaScript مفتوح المصدر من Google، يُستخدم في Chrome وNode.js" },
    { "term": "JIT Compilation", "definition": "Just-In-Time: تحويل الـ Bytecode لكود native وقت التشغيل لتسريع الأداء" }
  ]
}
```

---

## نموذج معمل مكتمل

```json
{
  "lab_index": 1,
  "title": "استكشاف بيئات JavaScript وأول تواصل بين المتصفح والـ Console",
  "scenario": "انضممت لفريق يطوّر لوحة تحكم لمتجر إلكتروني. مديرك الفني طلب منك التحقق من أن كودك يعمل بشكل صحيح في كلٍّ من المتصفح وNode.js، وأن تفهم الفرق بين بيئتَي التشغيل قبل الشروع في كتابة أي feature.",
  "completion_criterion": "يكتب الطالب سكريبت يعمل في Node.js ويُخرج معلومات البيئة، ويكتب نظيره للمتصفح بـ console.log، ويُفسّر الفروق بين المخرجَين",
  "pedagogical_sequence": "نبدأ بتشخيص ما يعرفه عن بيئات التشغيل، ثم نطلب منه اتخاذ قرار مُعلَّل حول أداة مناسبة، ثم التطبيق بكتابة كود حقيقي، ثم تحليل مخرجات غير متوقعة، وأخيراً ربط المفهوم بمشروع ويب حقيقي",
  "questions": [
    {
      "kind": "diagnostic",
      "prompt": "بكلامك الآن: ما الفرق بين تشغيل JavaScript في المتصفح وتشغيلها في Node.js؟ اكتب ما تعرفه حتى لو كان قليلاً.",
      "rubric": "يُقيَّم على: ذكر فكرة واحدة صحيحة على الأقل (المتصفح للـ DOM / Node للخادم / V8 مشترك)، الصياغة بكلماته لا تعريف محفوظ",
      "solution_outline": "المتصفح يوفّر window/document/DOM. Node.js يوفّر fs/http/process. كلاهما يشغّل JavaScript بـ V8 لكن مع APIs مختلفة.",
      "points": 1
    },
    {
      "kind": "decision",
      "prompt": "تريد كتابة كود يقرأ ملفاً من القرص الصلب. أين يجب أن يعمل هذا الكود: (أ) في المتصفح مباشرةً، (ب) في Node.js على الخادم، (ج) يعمل في كلا البيئتَين بنفس الكود؟ علّل.",
      "rubric": "الإجابة الصحيحة (ب) مع تعليل: المتصفح لا يملك fs module لأسباب أمنية. Node.js يملك require('fs'). الكود لن يعمل في المتصفح لأن API غير موجودة.",
      "solution_outline": "ب — Node.js فقط. المتصفح يمنع الوصول المباشر لنظام الملفات حمايةً للمستخدم. Node.js يُوفّر fs module للوصول للملفات من الخادم.",
      "points": 2
    },
    {
      "kind": "application",
      "prompt": "اكتب ملف index.js يعمل في Node.js ويُطبع: (1) إصدار Node.js باستخدام process.version، (2) نظام التشغيل باستخدام process.platform، (3) المسار الحالي باستخدام process.cwd(). نظّم الإخراج بشكل يقرأ.",
      "rubric": "استخدام process.version وprocess.platform وprocess.cwd() الصحيح، مخرجات منظمة ومقروءة، لا أخطاء syntax",
      "solution_outline": "console.log('Node version:', process.version); console.log('Platform:', process.platform); console.log('Directory:', process.cwd());",
      "points": 3
    },
    {
      "kind": "analysis",
      "prompt": "شغّل هذا الكود في Node.js وأخبرني ما الذي طلع:\nconsole.log(typeof window);\nتوقّعت 'object' لأن window كائن في المتصفح — لماذا طلع نتيجة مختلفة؟",
      "rubric": "يُلاحظ أن النتيجة 'undefined' في Node.js ويُفسّر: window غير موجود في Node.js لأنه API المتصفح فقط. يربط بمفهوم البيئة المختلفة.",
      "solution_outline": "typeof window في Node.js يُعطي 'undefined' لأن window object موجود فقط في بيئة المتصفح. في Node.js البديل هو global (لكنه مختلف أيضاً). هذا يُثبت أن APIs البيئتَين مختلفة.",
      "points": 2
    },
    {
      "kind": "connection",
      "prompt": "تعلّمنا أن JavaScript تعمل في المتصفح وNode.js. كيف يُمكّن هذا شركة مثل Netflix من استخدام JavaScript لبناء موقعها الكامل — الواجهة والخادم معاً — بفريق تطوير واحد يعرف لغة واحدة؟",
      "rubric": "يربط JavaScript Isomorphic/Universal مع تجربة المستخدم وكفاءة الفريق. يذكر مثلاً: React للمتصفح، Node.js/Express للخادم، نفس اللغة للطرفَين.",
      "solution_outline": "JavaScript Isomorphic: نفس اللغة في المتصفح (React/Vue) وعلى الخادم (Node.js). يقلل تكلفة التعلم والتنسيق بين الفريق. Netflix استخدم Node.js للـ Server-Side Rendering لتسريع أول تحميل للصفحة.",
      "points": 2
    }
  ]
}
```

---

## نموذج سؤال بنك اختبار (MCQ)

```json
{
  "kind": "mcq",
  "prompt": "ما النتيجة المتوقعة لتشغيل: console.log(typeof null) في JavaScript؟",
  "choices": [
    "null",
    "undefined",
    "object",
    "error"
  ],
  "correct_index": 2,
  "explanation": "typeof null يُعطي 'object' — هذا خطأ تاريخي في JavaScript من عام 1995 لم يتم تصحيحه للحفاظ على التوافق. null ليس كائناً لكن typeof يقول ذلك. للتحقق الصحيح من null استخدم: value === null",
  "difficulty": 2,
  "points": 1,
  "time_limit_seconds": 60
}
```

---

## الحجم المتوقع للملف النهائي

| العنصر | العدد |
|---|---|
| مستويات | 2 |
| مراحل | 14 (7 × 2) |
| وحدات | 140 (10 × 14) |
| دروس | 1,400 (10 × 140) |
| معامل | 140 (1 لكل وحدة) |
| أسئلة معامل | 700 (5 × 140) |
| بنوك وحدات | 140 |
| بنوك مراحل | 14 |
| بنوك مستويات | 2 |
| أسئلة تحديد المستوى | 18 |

الملف الكامل سيكون بين 7-12 ميجابايت. الناشر يدعم حتى 64MB.

---

## قائمة التحقق النهائية (يجب مراجعتها قبل تسليم الملف)

- [ ] `schema_version` = `"v4.1"`
- [ ] `specialty.slug` = `"javascript"` (lowercase, no spaces)
- [ ] عدد المستويات = 2، عدد المراحل في كل مستوى = 7
- [ ] عدد الوحدات في كل مرحلة = 10، عدد الدروس في كل وحدة = 10
- [ ] كل وحدة فيها معمل واحد على الأقل
- [ ] كل معمل فيه بالضبط 5 أسئلة بالأنواع: diagnostic, decision, application, analysis, connection (كل واحد مرة فقط)
- [ ] لا تكرار في الأنواع داخل نفس المعمل
- [ ] كل prerequisite_units/enables_units يشير لكود موجود فعلاً
- [ ] كل prerequisite_lessons/enables_lessons يشير لكود درس موجود فعلاً
- [ ] لا دورات (cycles) في روابط الوحدات أو الدروس
- [ ] كل MCQ فيه choices + correct_index صالح
- [ ] bridge_sentence ≥ 10 كلمات لكل درس
- [ ] أسئلة تحديد المستوى: 18 سؤالاً، target_level_index مناسب (1 أو 2)، target_unit_code موجود فعلاً
- [ ] بنوك الأسئلة موجودة للوحدات والمراحل والمستويات
- [ ] جميع identifiers في الكود JavaScript بالإنجليزية
- [ ] مجموع أوزان المفاهيم في كل درس > 0
- [ ] لا تكرار في أسماء المفاهيم داخل نفس الدرس
- [ ] الملف JSON صالح syntactically (بلا فواصل زائدة أو مفقودة)

---

## ملاحظات مهمة خاصة بـ JavaScript

1. **الأخطاء الخاصة بـ JS**: ركّز على pitfalls شائعة جداً (typeof null، == coercion، hoisting، this binding، async order) — هذه مصدر 80% من أخطاء المبتدئين.
2. **ES6+ في كل الأمثلة**: اكتب الكود بأسلوب حديث (const/let، arrow functions، template literals، destructuring) لا بـ ES5 القديم.
3. **Browser security**: أي مفهوم يمسّ الأمان (XSS، eval، innerHTML مع بيانات المستخدم) يجب أن يحمل `severity: "critical"` في common_mistakes.
4. **التسلسل المنطقي**: Closures تظهر في 1.4 لكن تُعمَّق في 2.2 — أشر في bridge_sentence للوحدات اللاحقة.
5. **الجودة أولاً**: لا تختصر في المحتوى. كل درس حقيقي، كل مثال قابل للتشغيل، كل مفهوم دقيق علمياً.
