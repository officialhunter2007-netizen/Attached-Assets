# Prompt: توليد ملف تعليمات C++ v4.1 لمنصة نُخبة

---

## دورك

أنت مهندس منهج خبير في تعليم C++. مهمتك إنشاء **ملف تعليمات v4.1 كامل للغة C++** يُنشر مباشرةً على منصة تعليمية ذكية. يجب أن يكون الناتج:

- ملف JSON واحد صالح بنسبة 100% للنشر (لا أخطاء في المدقّق).
- ذو جودة علمية وعملية فائقة — كل مفهوم قابل للتطبيق الفوري في تطوير برمجيات حقيقية.
- بتسلسل منطقي مريح من الإجرائية وصولاً للـ Modern C++ — لا قفزات مفاجئة.
- الأمثلة من الحياة اليومية العربية العامة (غير مقيّدة بمنطقة جغرافية).
- **جميع أسماء المتغيرات والدوال والكلاسات والأنواع في الكود C++ تُكتب بالإنجليزية/اللاتينية حصراً** — حتى في الأمثلة التوضيحية. أي نص مُطبَع للمستخدم أو تعليق توضيحي في الشرح يمكن أن يكون عربياً.

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

### المستوى الأول: أساسيات C++ والبرمجة الإجرائية

| # | اسم المرحلة | الموضوع الجوهري |
|---|---|---|
| 1.1 | البيئة والتركيب | GCC/Clang, CMake, compilation pipeline, Hello World, headers, namespaces |
| 1.2 | أنواع البيانات والعمليات | primitive types, sizeof, overflow, casting, numeric limits, operators |
| 1.3 | التحكم في التدفق | if/else, switch, for/while/do-while, range-for, break/continue |
| 1.4 | الدوال والنطاق | function declaration/definition, parameters (by value/ref/ptr), overloading, default args, inline |
| 1.5 | المصفوفات والمؤشرات والمراجع | C-arrays, pointers, pointer arithmetic, references, const correctness |
| 1.6 | الهياكل والتعدادات | struct, enum, enum class, union, typedef/using, simple ADTs |
| 1.7 | مشروع شامل للمستوى الأول | نظام إدارة قائمة (linked list يدوي أو نظام سجلات بـ structs وملفات) |

### المستوى الثاني: C++ الحديثة والمتقدمة

| # | اسم المرحلة | الموضوع الجوهري |
|---|---|---|
| 2.1 | OOP في C++ | classes, constructors/destructor, RAII, copy/move semantics, Rule of Three/Five |
| 2.2 | OOP المتقدمة | inheritance, virtual functions, polymorphism, abstract classes, interfaces via pure virtual |
| 2.3 | القوالب والـ STL | templates (function/class), STL containers (vector/map/set/queue), algorithms, iterators |
| 2.4 | Modern C++ (C++11-20) | smart pointers, lambdas, auto, range-for, structured bindings, concepts (C++20 intro) |
| 2.5 | إدارة الذاكرة والأداء | heap vs stack, new/delete, memory leaks, profiling, RAII revisited, move semantics عميق |
| 2.6 | الملفات وبناء المشاريع | fstream, string streams, CMake المتقدم, vcpkg, unit testing بـ Catch2/GTest |
| 2.7 | مشروع حقيقي شامل | محرّك لعبة نصية أو نظام إدارة مكتبة أو CLI tool احترافي يجمع كل المستويين |

---

## المخطط التفصيلي لكل مرحلة (10 وحدات × 10 دروس)

### المستوى 1

#### المرحلة 1.1 — البيئة والتركيب (10 وحدات)

| الوحدة | الاسم | الدروس الـ10 (مواضيع) |
|---|---|---|
| 1.1.1 | ما هو C++ ولماذا نتعلمه؟ | تاريخ C++ والسبب الجوهري لبقائه رائداً، C vs C++ الفروق الحقيقية، أين يُستخدم C++ الآن (OS/games/DB/embedded)، ISO standards: C++11/14/17/20/23، GCC vs Clang vs MSVC، تثبيت GCC على Windows (MinGW-w64/MSYS2)، تثبيت GCC/Clang على Linux/Mac، أول ملف .cpp وتجميعه يدوياً، فهم أخطاء التجميع (compiler errors vs linker errors)، أخطاء الإعداد الشائعة وحلولها |
| 1.1.2 | أول برنامج وبنية C++ | هيكل برنامج C++ الأساسي: preprocessor/main/return، #include والـ standard headers، الـ main function والعائد int، cout وcin وendl وإدارة الإخراج، أسلوب الكتابة: indentation وتسمية المعاملات، الكلمات المحجوزة في C++، التعليقات: // و/* */ و/// (Doxygen)، تعريف using namespace std متى يصح ومتى يُضرّ، تجميع بـ -Wall -Wextra -std=c++17، تشغيل من terminal وقراءة المخرجات |
| 1.1.3 | الإدخال والإخراج الأساسي | cout وoperator<< والتسلسل، cin وoperator>> وإدارة المدخلات، getline للأسطر الكاملة، cin.ignore وتنظيف الـ buffer، الفرق بين cin>> وgetline بعد بعض، printf/scanf مقابل cout/cin (متى كلٌّ منهما)، تنسيق الإخراج: setw/setfill/fixed/setprecision، cerr وclog للرسائل والأخطاء، التحقق من صحة المدخلات بـ cin.fail()، برنامج حاسبة تفاعلية بسيطة |
| 1.1.4 | CMake وهيكل المشروع الاحترافي | لماذا نحتاج Build System أصلاً؟، CMakeLists.txt الأساسي: cmake_minimum_required/project/add_executable، تنظيم المشروع: src/include/tests/docs، خطوات البناء: mkdir build && cmake .. && make، CMake Presets للإعدادات الجاهزة، إضافة مكتبة ثالثة عبر FetchContent، Ninja كـ generator أسرع من Make، VS Code مع CMake Tools extension، CLion IDE مقدمة سريعة، إنشاء مشروع احترافي من الصفر |
| 1.1.5 | Git مع C++ | git init وأول commit، .gitignore لـ C++ (build/ *.o *.exe *.out)، مفهوم branch وmerge، GitHub/GitLab: رفع المشروع، دورة العمل: feature branch → PR → merge، تعارضات merge conflicts وحلها، CMake + Git submodules للمكتبات، GitHub Actions لبناء C++ تلقائياً، التوثيق بـ Doxygen + GitHub Pages، أفضل ممارسات commit messages |
| 1.1.6 | المُصحّح Debugger | GDB أساسيات: breakpoint/run/next/step/print، تتبع Stack Trace عند Segmentation Fault، VS Code Debugger بالواجهة الرسومية، Valgrind للكشف عن memory leaks (Linux)، AddressSanitizer: أداة مدمجة في GCC/Clang، قراءة Core Dump، تقنية Rubber Duck Debugging، استخدام assert() للتحقق السريع، تحويل Warnings لـ Errors بـ -Werror، استراتيجية تقسيم الكود لعزل الخطأ |
| 1.1.7 | مكتبات C++ القياسية: نظرة عامة | ماذا يشمل C++ Standard Library، المجال <algorithm>: sort/find/count/transform، المجال <string>: عمليات النص، المجال <cmath>: الدوال الرياضية، المجال <chrono>: قياس الوقت والزمن، المجال <random>: الأرقام العشوائية الحديثة، مقدمة <filesystem> (C++17)، الفرق بين C headers (<cstdio>) وC++ headers، تصفح cppreference.com كمرجع، وثائق Compiler Explorer (godbolt.org) |
| 1.1.8 | أسلوب الكود الجيد في C++ | C++ Core Guidelines أهم القواعد، أسماء معبّرة لا تحتاج تعليقاً، Clang-Format للتنسيق التلقائي، Clang-Tidy للتحقق الاستاتيكي، الكود الـ const-correct من البداية، تفضيل المجال الضيق narrow scope، تجنّب magic numbers وGlobal variables، توثيق الـ public API بـ Doxygen، Self-documenting code مفهوم وتطبيق، الفرق بين كود يعمل وكود احترافي |
| 1.1.9 | أخطاء C++ الشائعة وأمانه | Undefined Behavior: ما هو ولماذا خطير جداً، Integer Overflow وآثاره المخفية، Dangling Pointer وكيف يحدث، Buffer Overflow الخطر الأمني، Use-After-Free سيناريوهات حقيقية، Stack Overflow: العودية اللانهائية، أخطاء الترتيب Initialization Order Fiasco، Strict Aliasing: ما لا يُقرأ، أدوات السلامة: sanitizers وstatic analysis، التطوير الدفاعي: assert وpreconditions |
| 1.1.10 | مشروع ترحيبي: CLI Tool صغير | تصميم أداة سطر أوامر بسيطة (حاسبة/محوّل وحدات)، قراءة argc/argv ومعالجتهم، هيكل ملفات منظم بـ CMake، git commits ذات معنى لكل feature، Doxygen على الدوال الرئيسية، التحقق من المدخلات وإخراج رسائل خطأ واضحة، اختبار حالات الحافة يدوياً، التوثيق في README.md، نشر على GitHub، مراجعة ذاتية بـ Core Guidelines |

#### المرحلة 1.2 — أنواع البيانات والعمليات (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.2.1 | الأنواع الأساسية: int, char, float, double, bool |
| 1.2.2 | sizeof وتمثيل البيانات في الذاكرة |
| 1.2.3 | Integer Overflow وUndersigned Types والحدود |
| 1.2.4 | Type Casting: static_cast / reinterpret_cast / const_cast |
| 1.2.5 | العمليات الحسابية والأسبقية |
| 1.2.6 | العمليات المنطقية والمقارنة والـ short-circuit |
| 1.2.7 | Bitwise Operations والأقنعة |
| 1.2.8 | auto وType Deduction (C++11) |
| 1.2.9 | std::numeric_limits والأنواع المحددة الحجم (int32_t) |
| 1.2.10 | مشروع: محوّل وحدات علمي |

#### المرحلة 1.3 — التحكم في التدفق (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.3.1 | if/else والشروط المركّبة |
| 1.3.2 | if constexpr وCompile-Time Decisions |
| 1.3.3 | switch وfall-through وbreak |
| 1.3.4 | حلقة for التقليدية |
| 1.3.5 | Range-based for (C++11) |
| 1.3.6 | while وdo-while ومتى نختار كلاً منهما |
| 1.3.7 | break وcontinue والتسميات |
| 1.3.8 | التكرار المتداخل وتعقيد O(n²) |
| 1.3.9 | أنماط التحكم: Guard Clause وEarly Return |
| 1.3.10 | مشروع: محرك قواعد (Rule Engine) |

#### المرحلة 1.4 — الدوال والنطاق (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.4.1 | إعلان الدوال وتعريفها والفصل في ملفين |
| 1.4.2 | تمرير بالقيمة (Pass by Value) |
| 1.4.3 | تمرير بالمرجع (Pass by Reference) |
| 1.4.4 | تمرير بالمؤشر (Pass by Pointer) |
| 1.4.5 | const References والمعاملات الفعّالة |
| 1.4.6 | Function Overloading وDefault Arguments |
| 1.4.7 | inline Functions |
| 1.4.8 | Recursion وStack Frames |
| 1.4.9 | Function Pointers وCallbacks أساسيات |
| 1.4.10 | مشروع: مكتبة دوال رياضية ونصية |

#### المرحلة 1.5 — المصفوفات والمؤشرات والمراجع (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.5.1 | C-Arrays: إعلان والوصول والحجم |
| 1.5.2 | تمرير المصفوفات للدوال |
| 1.5.3 | المؤشرات: الإعلان والـ dereferencing والـ address-of |
| 1.5.4 | Pointer Arithmetic |
| 1.5.5 | المصفوفات والمؤشرات: العلاقة الحقيقية |
| 1.5.6 | nullptr والتحقق من المؤشرات |
| 1.5.7 | المراجع References مقابل المؤشرات |
| 1.5.8 | const Pointers وPointers to const |
| 1.5.9 | المصفوفات ثنائية البعد والمتعددة |
| 1.5.10 | مشروع: محلل مصفوفات إحصائي |

#### المرحلة 1.6 — الهياكل والتعدادات (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.6.1 | struct: التعريف والاستخدام |
| 1.6.2 | تهيئة الهياكل وConstructors البسيطة |
| 1.6.3 | تمرير struct بالقيمة والمرجع |
| 1.6.4 | Nested Structs والتراكيب المعقدة |
| 1.6.5 | enum والـ enum class (C++11) |
| 1.6.6 | union والاستخدامات النادرة |
| 1.6.7 | typedef وusing alias |
| 1.6.8 | Bit Fields والهياكل المُحكمة |
| 1.6.9 | تصميم ADT (Abstract Data Type) ببساطة |
| 1.6.10 | مشروع: نظام بيانات طلاب بـ structs |

#### المرحلة 1.7 — مشروع شامل للمستوى الأول (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 1.7.1 | تحليل المتطلبات وتصميم البنية بـ structs |
| 1.7.2 | طبقة البيانات: Dynamic Array يدوي (new/delete) |
| 1.7.3 | عمليات CRUD: إضافة/قراءة/تحديث/حذف |
| 1.7.4 | واجهة سطر الأوامر (Menu-driven CLI) |
| 1.7.5 | التحقق من المدخلات وإدارة الأخطاء |
| 1.7.6 | الحفظ والتحميل من ملف نصي بـ fstream |
| 1.7.7 | الفرز والبحث: Selection Sort وLinear Search |
| 1.7.8 | Linked List يدوي كهيكل بيانات بديل |
| 1.7.9 | Valgrind/ASan للتحقق من عدم تسرب الذاكرة |
| 1.7.10 | التوثيق الكامل والتسليم النهائي |

---

### المستوى 2

#### المرحلة 2.1 — OOP في C++ (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.1.1 | الكلاس: الفرق عن struct وتحديد access specifiers |
| 2.1.2 | Constructor وDestructor وترتيب التنفيذ |
| 2.1.3 | Member Initializer List |
| 2.1.4 | Copy Constructor وCopy Assignment (Rule of Three) |
| 2.1.5 | Move Constructor وMove Assignment (Rule of Five) |
| 2.1.6 | RAII: Resource Acquisition Is Initialization |
| 2.1.7 | const member functions والـ mutable |
| 2.1.8 | static members وClass-level State |
| 2.1.9 | Operator Overloading |
| 2.1.10 | مشروع: String class من الصفر |

#### المرحلة 2.2 — OOP المتقدمة (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.2.1 | Inheritance: public/protected/private |
| 2.2.2 | Constructor Chaining في Inheritance |
| 2.2.3 | virtual functions وVirtual Table (vtable) |
| 2.2.4 | Pure Virtual Functions والكلاسات المجردة |
| 2.2.5 | Polymorphism وDynamic Dispatch |
| 2.2.6 | Virtual Destructor وأهميته |
| 2.2.7 | Multiple Inheritance والـ Diamond Problem |
| 2.2.8 | dynamic_cast وtype_info |
| 2.2.9 | Design Patterns: Strategy وObserver وFactory |
| 2.2.10 | مشروع: نظام رسوميات هندسية بـ Polymorphism |

#### المرحلة 2.3 — القوالب والـ STL (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.3.1 | Function Templates |
| 2.3.2 | Class Templates |
| 2.3.3 | Template Specialization |
| 2.3.4 | STL Containers: vector والاستخدام الفعّال |
| 2.3.5 | STL Containers: map وset وunordered_map |
| 2.3.6 | STL Containers: queue وstack وdeque |
| 2.3.7 | STL Algorithms: sort/find/transform/accumulate |
| 2.3.8 | Iterators: أنواعها والكتابة عليها |
| 2.3.9 | Custom Comparators مع STL |
| 2.3.10 | مشروع: محرك بيانات احصائي بـ STL |

#### المرحلة 2.4 — Modern C++ (C++11-20) (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.4.1 | Smart Pointers: unique_ptr |
| 2.4.2 | Smart Pointers: shared_ptr وweak_ptr |
| 2.4.3 | Lambda Expressions الكاملة |
| 2.4.4 | std::function وstd::bind |
| 2.4.5 | auto وdecltype وType Deduction المتقدم |
| 2.4.6 | Structured Bindings (C++17) وstd::tie |
| 2.4.7 | std::optional وstd::variant وstd::any |
| 2.4.8 | Ranges وViews (C++20 مقدمة) |
| 2.4.9 | Concepts (C++20 مقدمة) |
| 2.4.10 | مشروع: مكتبة Utilities بـ Modern C++ |

#### المرحلة 2.5 — إدارة الذاكرة والأداء (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.5.1 | Stack vs Heap: متى وكيف نختار |
| 2.5.2 | new وdelete وأنواع التخصيص |
| 2.5.3 | Memory Leaks: الكشف والعلاج |
| 2.5.4 | Move Semantics عميق: rvalue references |
| 2.5.5 | Perfect Forwarding وstd::forward |
| 2.5.6 | Custom Allocators مقدمة |
| 2.5.7 | Cache Locality وData-Oriented Design |
| 2.5.8 | Profiling: gprof وperf وFlameGraphs |
| 2.5.9 | Compiler Optimizations: -O2/-O3 وما تعنيه |
| 2.5.10 | مشروع: تحسين أداء برنامج بطيء |

#### المرحلة 2.6 — الملفات وبناء المشاريع (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.6.1 | fstream: قراءة وكتابة الملفات النصية |
| 2.6.2 | الملفات الثنائية: Binary I/O |
| 2.6.3 | String Streams: sstream وistringstream |
| 2.6.4 | Serialization: JSON/CSV بدون مكتبات |
| 2.6.5 | CMake المتقدم: Libraries وTargets |
| 2.6.6 | vcpkg وConan لإدارة المكتبات |
| 2.6.7 | اختبار الوحدات: Google Test أساسيات |
| 2.6.8 | اختبار الوحدات: Catch2 وBDD style |
| 2.6.9 | Code Coverage بـ gcov/lcov |
| 2.6.10 | CI/CD: GitHub Actions لـ C++ |

#### المرحلة 2.7 — مشروع حقيقي شامل (10 وحدات)

| الوحدة | الاسم |
|---|---|
| 2.7.1 | اختيار المشروع وتصميم Architecture |
| 2.7.2 | هيكل CMake متعدد الوحدات |
| 2.7.3 | طبقة البيانات بـ STL وSmart Pointers |
| 2.7.4 | طبقة المنطق بـ OOP والـ Patterns |
| 2.7.5 | واجهة CLI احترافية بـ argparse (أو يدوي) |
| 2.7.6 | Serialization: حفظ وتحميل بيانات المشروع |
| 2.7.7 | اختبارات وحدات لكل Component |
| 2.7.8 | Memory Safety: ASan وUBSan كاملاً |
| 2.7.9 | Performance Profiling والتحسين |
| 2.7.10 | التوثيق النهائي والنشر على GitHub |

---

## المخطط الكامل للـ JSON المطلوب

```json
{
  "schema_version": "v4.1",
  "specialty": {
    "slug": "cpp",
    "name": "لغة C++",
    "icon": "⚙️",
    "description": "...",
    "target_persona": "...",
    "teacher_tone": "...",
    "allowed_viz_templates": ["flowchart", "comparison_table", "architecture_diagram", "timeline", "memory_diagram"],
    "allowed_tools": ["nukhba_ide_cpp"],
    "glossary": [...]
  },
  "levels": [
    {
      "level_index": 1,
      "name": "أساسيات C++ والبرمجة الإجرائية",
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
              "name": "ما هو C++ ولماذا نتعلمه؟",
              "goal": "...",
              "prerequisite_units": [],
              "enables_units": ["1.1.2"],
              "key_concepts": ["Compilation Pipeline", "GCC", "ISO Standard", "Undefined Behavior"],
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
                  "name": "ما هو C++ ولماذا هو رائد منذ 40 عاماً؟",
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
                      "name": "C++ Compilation Pipeline",
                      "explanation": "...",
                      "mastery_criterion": "...",
                      "weight": 3
                    }
                  ],
                  "common_mistakes": [
                    {
                      "mistake": "...",
                      "correction": "...",
                      "treatment": "...",
                      "severity": "critical"
                    }
                  ],
                  "yemeni_examples": ["..."],
                  "final_check_question": "...",
                  "session_complete_criterion": "...",
                  "solution_outline": "...",
                  "expected_duration_minutes": 30,
                  "glossary": [
                    { "term": "Undefined Behavior", "definition": "..." }
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
- `level_index`: 1 للأول، 2 للثاني. لا تكرار.
- `stage_index`: 1..7 داخل كل مستوى. لا تكرار داخل نفس المستوى.
- `unit_index`: 1..10 داخل كل مرحلة. لا تكرار.
- `lesson_index`: 1..10 داخل كل وحدة. لا تكرار.

### 2. رموز الوحدات والدروس
- كود الوحدة = `"L.S.U"` مثل `"1.1.1"`
- كود الدرس = `"L.S.U.Lesson"` مثل `"1.1.1.1"`
- كود المرحلة = `"L.S"` مثل `"1.1"`

### 3. قواعد الروابط (cross-references)
- كل كود في `prerequisite_units` / `enables_units` / `prerequisite_lessons` / `enables_lessons` يجب أن يوجد في الملف فعلاً.
- **لا دورات (cycles)** في رسم prerequisite_units أو prerequisite_lessons.

### 4. المعمل (Lab)
- كل وحدة: معمل واحد على الأقل.
- كل معمل: **بالضبط 5 أسئلة** بهذه الأنواع مرة واحدة لكل نوع:
  1. `diagnostic`
  2. `decision`
  3. `application`
  4. `analysis`
  5. `connection`
- لا تكرار للنوع في نفس المعمل.

### 5. MCQ
- `choices` بـ ≥ 2 خيارات، `correct_index` صالح.

### 6. الحقول الإلزامية لكل درس
```
name, goal, bridge_sentence, prerequisite_lessons (array),
enables_lessons (array), concepts (min 1), common_mistakes (min 1),
yemeni_examples (min 1), final_check_question, session_complete_criterion
```

### 7. الحقول الإلزامية لكل مفهوم
```
name (فريد داخل الدرس), explanation, mastery_criterion
```

### 8. bridge_sentence ≥ 10 كلمات
### 9. pass_threshold_percent بين 40 و95

---

## اختبار تحديد المستوى (Placement Test)

أنتج **18 سؤالاً MCQ** بالتوزيع التالي:

| # | target_level_index | target_unit_code | الموضوع |
|---|---|---|---|
| 1 | 1 | 1.1.2 | بنية برنامج C++ الأساسية |
| 2 | 1 | 1.2.1 | أنواع البيانات البدائية |
| 3 | 1 | 1.2.3 | Integer Overflow وحدوده |
| 4 | 1 | 1.3.4 | حلقة for والـ Range-based for |
| 5 | 1 | 1.4.2 | Pass by Value مقابل Pass by Reference |
| 6 | 1 | 1.4.3 | Pass by Reference والمزالق |
| 7 | 1 | 1.5.3 | المؤشرات وعملية dereferencing |
| 8 | 1 | 1.5.4 | Pointer Arithmetic |
| 9 | 1 | 1.6.1 | struct والوصول للحقول |
| 10 | 2 | 2.1.1 | الكلاس ومحددات الوصول |
| 11 | 2 | 2.1.4 | Copy Constructor وRule of Three |
| 12 | 2 | 2.1.6 | RAII وإدارة الموارد |
| 13 | 2 | 2.2.3 | virtual functions وVtable |
| 14 | 2 | 2.3.4 | std::vector والاستخدام الفعّال |
| 15 | 2 | 2.3.5 | std::map وstd::unordered_map |
| 16 | 2 | 2.4.1 | unique_ptr وملكية الموارد |
| 17 | 2 | 2.4.3 | Lambda Expressions |
| 18 | 2 | 2.5.3 | Memory Leaks وأدوات الكشف |

---

## معايير الجودة العلمية والعملية

### الدرس المثالي
- **`goal`**: قدرة عملية قابلة للقياس ≥ 20 كلمة.
- **`bridge_sentence`**: تربط الدرس السابق بالحالي ≥ 10 كلمات وتبني فضول الطالب.
- **`motivation_hook`**: ما الضرر الحقيقي في الإنتاج لو لم يفهم هذا المفهوم (memory corruption, undefined behavior, security breach).
- **`concepts`**: 3-5 مفاهيم:
  - `weight: 3` للمفاهيم الأساسية جداً (كالـ Undefined Behavior، والـ RAII).
  - `weight: 2` للمحورية.
  - `weight: 1` للتكميلية.
- **`common_mistakes`**: أخطاء C++ الحرجة يُعطى عليها `severity: "critical"` (مثل: إهمال Virtual Destructor، نسيان delete، Dangling Reference، Integer Overflow صامت).
- **`yemeni_examples`**: أمثلة من مجالات المُضمّنة (embedded systems)، أنظمة التشغيل، الألعاب، معالجة البيانات — سياقات استخدام C++ الحقيقية.
- **`solution_outline`**: إجابة نموذجية للـ final_check_question مع كود صغير إن أمكن.

### المعمل المثالي لـ C++
- **`application`**: يطلب كتابة كود C++ يتجمّع ويعمل — مع ذكر standard المطلوب (مثل: `g++ -std=c++17`).
- **`analysis`**: يُقدّم كوداً فيه Undefined Behavior أو Memory Leak ويطلب التحليل.
- **`connection`**: يربط الموضوع بـ RAII أو Smart Pointers أو أمان الذاكرة في المستوى الثاني.

### بنك الأسئلة
- وحدة: **5-8 MCQ** per variant.
- مرحلة: **10-15 MCQ** per variant.
- مستوى: **15-20 MCQ** per variant.
- الخيارات الخاطئة: سيناريوهات Undefined Behavior الخادعة، أخطاء شائعة حقيقية.
- `explanation`: يشرح لماذا الإجابة الصحيحة صحيحة و**لماذا بالتحديد الأخطاء خاطئة**.

---

## تعليمات الكود

- **جميع identifiers** في كود C++ **بالإنجليزية الخالصة**.
- النصوص المُطبَعة للمستخدم يمكن بالعربية:
  ```cpp
  std::string studentName = "أحمد";
  int totalScore = 0;
  std::cout << "مرحباً " << studentName << "\n";
  ```
- ذكر compiler standard في كل مثال يستخدم C++11+:
  ```cpp
  // g++ -std=c++17 example.cpp -o example
  auto result = std::optional<int>{42};
  ```

---

## نموذج درس مكتمل

```json
{
  "lesson_index": 1,
  "name": "ما هو C++ ولماذا هو رائد منذ 40 عاماً؟",
  "goal": "يفهم الطالب الأسباب الجوهرية لاستمرار C++ في صدارة برمجيات الأداء العالي ويُميّز مراحل pipeline التجميع ويربط كل مرحلة بالملفات التي تُنتجها",
  "bridge_sentence": "قبل أن نكتب أي كود C++، نحتاج أن نفهم لماذا اختارت Google وMicrosoft وNASA هذه اللغة لأنظمتهم الأكثر حساسيةً — وهذا الفهم هو ما يُحوّل المبرمج من كاتب كود إلى مهندس حقيقي",
  "prerequisite_lessons": [],
  "enables_lessons": ["1.1.1.2"],
  "motivation_hook": "أي خطأ في إدارة الذاكرة قد يُسبب ثغرة أمنية في الإنتاج — من يفهم C++ يفهم كيف تعمل الأنظمة من الداخل، وهذه المعرفة لا تُقدَّر بثمن في سوق العمل",
  "learning_objectives": [
    { "statement": "يشرح الطالب المراحل الأربع لـ C++ Compilation Pipeline وما تُنتج كل مرحلة", "bloom_level": "understand" },
    { "statement": "يُميّز الطالب بين Compiler Error وLinker Error ويحدد سبب كل منهما", "bloom_level": "understand" },
    { "statement": "يذكر الطالب 3 مجالات صناعية تعتمد على C++ في الإنتاج مع تعليل الاختيار", "bloom_level": "remember" }
  ],
  "concepts": [
    {
      "name": "C++ Compilation Pipeline",
      "explanation": "الكود لا يُنفَّذ مباشرةً — يمر بأربع مراحل: (1) Preprocessing: المعالج يُحلّ #include و#define ويُنتج ملف .i، (2) Compilation: المترجم يُحوّل .i إلى Assembly (.s)، (3) Assembly: المُجمّع يُحوّل Assembly إلى Object Code (.o)، (4) Linking: الـ Linker يجمع الـ .o مع المكتبات لينتج الـ Executable. فهم هذا يُفسّر 90% من رسائل الخطأ الغامضة.",
      "mastery_criterion": "يستطيع الطالب رسم Pipeline التجميع بأسماء المراحل والملفات وشرح ما يفعله كل مرحلة بمثال",
      "weight": 3
    },
    {
      "name": "Zero-Cost Abstractions",
      "explanation": "مبدأ Bjarne Stroustrup: الأدوات التجريدية في C++ (templates, inline, constexpr) لا تُضيف تكلفة وقت التشغيل عند الاستخدام الصحيح. بخلاف Python حيث كل abstraction تكلف وقتاً إضافياً، C++ يُحوّل الـ abstractions لكود native محسَّن وقت التجميع.",
      "mastery_criterion": "يُعطي الطالب مثالاً على C++ abstraction لا يُضيف overhead وقت التشغيل ويقارنها بلغة مُفسَّرة",
      "weight": 2
    },
    {
      "name": "Undefined Behavior (UB) المفهوم",
      "explanation": "Undefined Behavior: كود C++ قانوني syntactically لكن سلوكه غير معرَّف في المعيار. المترجم يفترض أن UB لن يحدث فيُحسّن الكود بشكل خاطئ. أمثلة: integer overflow الموقّع، dereferencing nullptr، قراءة متغير غير مُهيَّأ. UB صامت: قد يعمل البرنامج بشكل طبيعي لسنوات ثم يفشل فجأة.",
      "mastery_criterion": "يُحدد الطالب مثالاً واحداً على Undefined Behavior ويشرح لماذا لا يُعطي المعيار ضماناً على سلوكه",
      "weight": 3
    }
  ],
  "common_mistakes": [
    {
      "mistake": "الطالب يظن أن Compiler Error وLinker Error نفس الشيء ويبحث في مكان خاطئ",
      "correction": "Compiler Error: خطأ في صياغة الكود أو نوع البيانات (يُصلَح في الملف .cpp). Linker Error (undefined reference): دالة مُعلَنة لكن غير مُعرَّفة في أي ملف (يُصلَح بإضافة ملف التعريف أو المكتبة)",
      "treatment": "اسأل: 'أين ظهر الخطأ؟ في مرحلة compile أم link؟' ثم ربط برسالة الخطأ الفعلية",
      "severity": "major"
    },
    {
      "mistake": "الطالب يكتب using namespace std في الـ header files ظناً أنه مريح",
      "correction": "using namespace std في headers يُلوّث namespace كل ملف يُضمّن هذا الـ header، وقد يُسبب تعارضات غير متوقعة في المشاريع الكبيرة. استخدمه فقط في ملفات .cpp وليس في .h",
      "treatment": "اشرح مشكلة الـ name collision بمثال: std::move() يمكن أن يتعارض مع move() من مكتبة أخرى",
      "severity": "major"
    },
    {
      "mistake": "الطالب يعتقد أن C++ آمن من ثغرات الذاكرة بسبب المترجم القوي",
      "correction": "C++ يُعطيك القوة الكاملة وبها المسؤولية الكاملة — Buffer Overflow وDangling Pointers ممكنة تماماً. الحماية تأتي من المبرمج والأدوات (ASan/Valgrind) لا من اللغة تلقائياً",
      "treatment": "أرِ مثالاً حقيقياً لـ Buffer Overflow في كود يبدو صحيحاً، واشرح كيف ASan يكشفه",
      "severity": "critical"
    }
  ],
  "yemeni_examples": [
    "أنظمة إدارة حركة المرور الذكية في المدن — الكود الذي يُحلّل بيانات الكاميرات ويُعدّل إشارات الضوء في الزمن الحقيقي يُبنى بـ C++ لأن أي تأخير بالميلي ثانية يُسبب اختناقاً مرورياً حقيقياً"
  ],
  "final_check_question": "زميلك يقول: 'كودي يُجمَّع بدون أخطاء إذاً هو صحيح 100%'. لماذا هذا الكلام خاطئ؟ اذكر نوعاً واحداً من المشاكل التي لا يكتشفها المترجم.",
  "session_complete_criterion": "يستطيع الطالب رسم Compilation Pipeline، وتمييز Compiler Error عن Linker Error، وشرح مفهوم Undefined Behavior بمثال واحد",
  "solution_outline": "الجواب الصحيح يتضمن: (1) المترجم يتحقق من Syntax وTypes فقط — لا يُنفّذ الكود، (2) Undefined Behavior أمثلة: integer overflow، dereferencing nullptr، استخدام متغير غير مُهيَّأ، (3) Runtime bugs: قسمة على صفر، index خارج المصفوفة، memory leaks — كلها تمر المترجم بدون أخطاء",
  "expected_duration_minutes": 30,
  "glossary": [
    { "term": "Undefined Behavior", "definition": "سلوك كود C++ لم يُعرَّف في معيار ISO — المترجم حر في فعل أي شيء بما فيه تعطّل البرنامج أو إنتاج نتائج خاطئة بصمت" },
    { "term": "Compilation Pipeline", "definition": "المراحل الأربع لتحويل كود C++ لـ Executable: Preprocessing → Compilation → Assembly → Linking" },
    { "term": "Zero-Cost Abstraction", "definition": "مبدأ C++: الأدوات التجريدية لا تُضيف تكلفة وقت التشغيل — تُحلّ وقت التجميع" }
  ]
}
```

---

## نموذج معمل مكتمل

```json
{
  "lab_index": 1,
  "title": "فهم Compilation Pipeline وتتبع الأخطاء من المصدر",
  "scenario": "انضممت لفريق يطوّر نظام embedded لإدارة مستشفى. أُعطيت كود C++ فيه أخطاء متعددة من أنواع مختلفة. مديرك الفني يريدك أن تُميّز بين أخطاء التجميع وأخطاء الـ Linker وتُصلحها بشكل منظم — هذه مهارة أساسية يُطلبها في أي interview C++.",
  "completion_criterion": "يُميّز الطالب بين Compiler Error وLinker Error ويُصلح مثالاً من كل نوع ويُخرج برنامجاً يعمل",
  "pedagogical_sequence": "نبدأ بتشخيص معرفة الطالب بمراحل التجميع، ثم نطلب قراراً حول نوع الخطأ، ثم تطبيق بتصحيح كود فعلي، ثم تحليل رسالة خطأ غامضة، وأخيراً ربط بأهمية الفهم العميق في المشاريع الكبيرة",
  "questions": [
    {
      "kind": "diagnostic",
      "prompt": "بكلامك: ما الذي يفعله المترجم (Compiler) بالضبط عندما تكتب g++ main.cpp -o program؟ إذا كانت إجابتك 'لا أعرف' فاكتب تخمينك.",
      "rubric": "يُقيَّم على: ذكر فكرة التحويل من نص لكود قابل للتنفيذ، أو ذكر مراحل (ولو جزئياً). الصدق في عدم المعرفة مقبول.",
      "solution_outline": "g++ يمر بأربع مراحل: Preprocessing (يُحلّ #include) → Compilation (يُحوّل .cpp لـ Assembly) → Assembly (يُحوّل لـ .o) → Linking (يجمع كل .o مع المكتبات). الناتج النهائي هو Executable يفهمه المعالج.",
      "points": 1
    },
    {
      "kind": "decision",
      "prompt": "انظر لهذا الخطأ: error: 'calculateArea' was not declared in this scope. هل هذا: (أ) Compiler Error لأن الدالة غير معرَّفة أصلاً في أي ملف، (ب) Linker Error لأن الدالة معلَنة لكن غير مُعرَّفة، (ج) Runtime Error يظهر عند التشغيل فقط؟ علّل.",
      "rubric": "الإجابة الصحيحة (أ) مع تعليل: 'not declared in this scope' يعني المترجم لم يرَ إعلاناً (declaration) لهذه الدالة في نطاق الاستخدام — هذا Compiler Error لا Linker Error.",
      "solution_outline": "أ — Compiler Error. 'not declared in this scope' = المترجم لا يعرف هذا الاسم. Linker Error يبدو: undefined reference to 'calculateArea' ويظهر بعد مرحلة Compilation.",
      "points": 2
    },
    {
      "kind": "application",
      "prompt": "اكتب برنامج C++ بسيط يُطبع: (1) اسمك باستخدام std::string، (2) سنة الميلاد كـ int، (3) العمر محسوباً (2025 - سنة_الميلاد). البرنامج يجب يتجمّع بـ: g++ -std=c++17 -Wall main.cpp",
      "rubric": "std::string صحيح، int للسنة، حساب العمر صحيح، -std=c++17 مُستخدم، لا warning بـ -Wall",
      "solution_outline": "#include <iostream>\n#include <string>\nint main() {\n    std::string name = \"أحمد\";\n    int birthYear = 2000;\n    int age = 2025 - birthYear;\n    std::cout << \"الاسم: \" << name << \"\\n\";\n    std::cout << \"سنة الميلاد: \" << birthYear << \"\\n\";\n    std::cout << \"العمر: \" << age << \"\\n\";\n    return 0;\n}",
      "points": 3
    },
    {
      "kind": "analysis",
      "prompt": "هذا الكود يُجمَّع بدون أخطاء لكن نتيجته غريبة. ما المشكلة؟\n```cpp\nint main() {\n    int a = 2000000000;\n    int b = 2000000000;\n    int result = a + b;\n    std::cout << result << \"\\n\";\n    return 0;\n}\n```",
      "rubric": "يُشخّص Integer Overflow: 2 مليار + 2 مليار يتجاوز حد int الموقَّع (~2.1 مليار). النتيجة Undefined Behavior. الحل: استخدام long long أو int64_t.",
      "solution_outline": "Integer Overflow لـ int الموقَّع هو Undefined Behavior في C++. القيمة المتوقعة (4 مليار) تتجاوز INT_MAX (~2.1B). الحل: long long result = (long long)a + b;",
      "points": 2
    },
    {
      "kind": "connection",
      "prompt": "تعلّمنا أن Undefined Behavior يمكن أن يحدث بصمت. كيف يرتبط هذا بسبب وجود أدوات مثل AddressSanitizer (ASan) وUndefinedBehaviorSanitizer (UBSan) في المشاريع الاحترافية؟ لماذا لا يكفي الاختبار العادي؟",
      "rubric": "يربط UB بصعوبة الاختبار التقليدي (UB قد يعمل على جهازك ويفشل على خادم الإنتاج)، يُقدّر ASan/UBSan كـ runtime detectors لا compiler time.",
      "solution_outline": "UB صامت يعني: الاختبار قد ينجح لأن المترجم اختار سلوكاً 'حظاً' صحيحاً في بيئتك. ASan يُضيف runtime checks تكشف memory errors. UBSan يكشف UB وقت التشغيل. في الإنتاج: UB قد يُستغل أمنياً حتى لو بدا الكود يعمل.",
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
  "prompt": "ما النتيجة المضمونة لتنفيذ هذا الكود في C++؟\n```cpp\nint x;\nstd::cout << x << \"\\n\";\n```",
  "choices": [
    "يطبع 0 دائماً لأن المترجم يُهيّئ المتغيرات تلقائياً",
    "Undefined Behavior — قيمة x غير محددة وقد يطبع أي شيء",
    "Compiler Error لأن x لم يُهيَّأ",
    "يطبع فارغاً لأن int يبدأ بقيمة فارغة"
  ],
  "correct_index": 1,
  "explanation": "قراءة متغير محلي غير مُهيَّأ هو Undefined Behavior في C++. المترجم لا يُهيّئ المتغيرات المحلية تلقائياً (بخلاف المتغيرات العالمية). قد تطبع 0 أحياناً (بالصدفة) أو أي قيمة من الذاكرة، لكن السلوك غير مضمون وقد يتغير بتغيير المترجم أو الـ optimization level.",
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

الملف الكامل بين 7-12 ميجابايت. الناشر يدعم حتى 64MB.

---

## قائمة التحقق النهائية

- [ ] `schema_version` = `"v4.1"`
- [ ] `specialty.slug` = `"cpp"` (lowercase, no spaces)
- [ ] عدد المستويات = 2، عدد المراحل = 7 لكل مستوى
- [ ] عدد الوحدات = 10 لكل مرحلة، عدد الدروس = 10 لكل وحدة
- [ ] كل وحدة فيها معمل واحد على الأقل
- [ ] كل معمل فيه 5 أسئلة بالأنواع: diagnostic, decision, application, analysis, connection (كل واحد مرة فقط)
- [ ] لا تكرار في الأنواع داخل نفس المعمل
- [ ] كل prerequisite_units/enables_units يشير لكود موجود فعلاً
- [ ] كل prerequisite_lessons/enables_lessons يشير لكود درس موجود فعلاً
- [ ] لا دورات (cycles) في روابط الوحدات أو الدروس
- [ ] كل MCQ فيه choices + correct_index صالح
- [ ] bridge_sentence ≥ 10 كلمات لكل درس
- [ ] أسئلة تحديد المستوى: 18 سؤالاً، target_unit_code موجود فعلاً
- [ ] بنوك الأسئلة موجودة للوحدات والمراحل والمستويات
- [ ] جميع identifiers في الكود C++ بالإنجليزية
- [ ] مجموع أوزان المفاهيم في كل درس > 0
- [ ] لا تكرار في أسماء المفاهيم داخل نفس الدرس
- [ ] الملف JSON صالح syntactically
- [ ] كل مثال كود C++ يذكر standard المطلوب (`-std=c++17` وما يلزم)

---

## ملاحظات مهمة خاصة بـ C++

1. **Undefined Behavior في كل مكان**: أي مفهوم مرتبط بـ UB يحمل `severity: "critical"`. UB ليس مجرد خطأ — قد يُشكّل ثغرة أمنية حقيقية.
2. **Modern C++ أولاً**: ابدأ بالأسلوب الحديث (smart pointers, RAII, range-for) لكن اشرح السبب التاريخي. لا تُعلّم `new/delete` كأسلوب افتراضي في المستوى الثاني.
3. **المقارنة بالـ C**: أوضح متى C++ أضاف تحسناً حقيقياً على C (RAII، templates، std::vector بدل C-arrays).
4. **الـ Compilation Pipeline**: كل خطأ غريب يُشرح بتتبعه للمرحلة الصحيحة في الـ pipeline.
5. **الأداء ليس مجانياً**: كل abstraction في C++ له تكلفة يجب شرحها — vtable overhead، cache misses، heap allocations.
6. **الجودة أولاً**: لا تختصر. كل درس علمياً دقيق، كل مثال كود يتجمّع بدون warnings بـ `-Wall -Wextra`.
