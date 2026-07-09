# Prompt: توليد ملف تعليمات Java v4.1 لمنصة نُخبة

---

## دورك

أنت مهندس منهج خبير في تعليم البرمجة. مهمتك إنشاء **ملف تعليمات v4.1 كامل للغة Java** يُنشر مباشرةً على منصة تعليمية ذكية. يجب أن يكون الناتج:

- ملف JSON واحد صالح بنسبة 100% للنشر (لا أخطاء في المدقّق).
- ذو جودة علمية وعملية فائقة — كل مفهوم قابل للتطبيق الفوري في سوق العمل.
- بتسلسل منطقي مريح يُشجّع الطالب على الاستمرار (لا قفزات مفاجئة، كل وحدة تبني على ما قبلها).
- الأمثلة من الحياة اليومية العربية العامة (ليست مقيّدة بمنطقة جغرافية).
- **جميع أسماء المتغيرات والدوال والكلاس في الكود داخل Java تُكتب بالإنجليزية/اللاتينية حصراً** — حتى في الأمثلة التوضيحية. أي نص للمستخدم أو مخرجات الكود يمكن أن يكون عربياً.

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

### المستوى الأول: أساسيات Java والبرمجة الكائنية المبدئية

| # | اسم المرحلة | الموضوع الجوهري |
|---|---|---|
| 1.1 | البيئة والتركيب | JDK, JVM, JRE, Hello World, compilation, classpath |
| 1.2 | أنواع البيانات والعمليات | primitive types, wrapper classes, casting, operators, Math class |
| 1.3 | التحكم في التدفق | if/else, switch/switch expression (Java 14+), for/while/do-while, break/continue, enhanced for |
| 1.4 | الدوال والتوابع | method declaration, parameters, return types, overloading, recursion, varargs |
| 1.5 | المصفوفات والسلاسل | arrays (1D/2D), String class, StringBuilder, String methods, character operations |
| 1.6 | مدخل البرمجة كائنية التوجه | classes, objects, constructors, fields, this, encapsulation, getters/setters, static |
| 1.7 | مشروع شامل للمستوى الأول | student grade manager, library catalog, simple bank account — تطبيق كامل يجمع كل المستوى |

### المستوى الثاني: Java المتقدمة والتطبيقية

| # | اسم المرحلة | الموضوع الجوهري |
|---|---|---|
| 2.1 | OOP المتقدمة | inheritance, polymorphism, abstract classes, interfaces, method overriding, super, instanceof |
| 2.2 | الاستثناءات والملفات | try/catch/finally, checked vs unchecked, custom exceptions, File I/O, NIO.2 (Path, Files) |
| 2.3 | المجموعات والقوائم | Collections framework, List/ArrayList, Set/HashSet, Map/HashMap, LinkedList, Queue, Iterator, Comparable/Comparator |
| 2.4 | البرمجة الوظيفية | lambda expressions, functional interfaces, Stream API, Optional, method references |
| 2.5 | قواعد البيانات | JDBC, Connection/Statement/PreparedStatement, ResultSet, SQL injection prevention, basic DAO pattern |
| 2.6 | الاختبار والجودة والنشر | JUnit 5, assertions, mocking basics (Mockito intro), Maven/Gradle, JAR packaging, clean code principles |
| 2.7 | مشروع حقيقي شامل | REST API مع Spring Boot (أو نظام إدارة متكامل بدونه) — نهاية طبيعية تجمع المستويين |

---

## المخطط التفصيلي لكل مرحلة (10 وحدات × 10 دروس)

### المستوى 1

#### المرحلة 1.1 — البيئة والتركيب (10 وحدات)
| الوحدة | الاسم | الدروس الـ10 (مواضيع) |
|---|---|---|
| 1.1.1 | تثبيت Java وإعداد البيئة | ما هي Java ولماذا 30+ سنة رائدة، JDK vs JRE vs JVM، تثبيت JDK على Windows/Mac/Linux، إعداد JAVA_HOME وPATH، تثبيت IntelliJ IDEA/VS Code، فهم مترجم javac، تشغيل أول برنامج من terminal، هيكل ملف Java الأساسي، الحزم packages أول نظرة، أخطاء الإعداد الشائعة وحلولها |
| 1.1.2 | أول برنامج وبنية Java | برنامج Hello World بالتفصيل، main method لماذا public static void، الفئة Class والملف العلاقة الإجبارية، System.out.println vs print vs printf، تركيب Java: الأقواس والفاصلة المنقوطة، الكلمات المحجوزة reserved keywords، تعليقات // و/* */ و/** Javadoc، case sensitivity في Java، أسلوب الكتابة Java Naming Conventions، تشغيل الكود خطوة بخطوة بالمُصحح IDE |
| 1.1.3 | الإدخال والإخراج الأساسي | System.out و System.err، Scanner لقراءة المدخلات من لوحة المفاتيح، nextLine() vs next() vs nextInt() الفخاخ، تنسيق الإخراج بـ printf و String.format()، المحارف الخاصة escape sequences، تحويل النص لأرقام Integer.parseInt() Float.parseFloat()، التحقق من صحة المدخلات بـ hasNextInt()، BufferedReader كبديل سريع، برنامج آلة حاسبة تفاعلية بسيطة، معالجة InputMismatchException أول مرة |
| 1.1.4 | فهم JVM وآلية التنفيذ | JVM architecture: ClassLoader + Bytecode + JIT، مراحل: compile → load → verify → execute، فهم ملف .class وbytecode، Garbage Collection مبدئياً، Stack vs Heap أول نظرة، ClassNotFoundException سببه وعلاجه، runtime vs compile-time errors الفرق، نموذج الذاكرة في Java مقابل C/C++، JVM flags مفيدة -verbose:gc -Xmx، عرض Bytecode بـ javap |
| 1.1.5 | المتغيرات ونطاق الرؤية | local variables إعلان وتهيئة إجبارية، instance variables قيم افتراضية تلقائية، static variables مشتركة بين الكائنات، block scope داخل {  }، variable shadowing الفخ الشائع، final keyword للثوابت، نمط تسمية camelCase و UPPER_SNAKE_CASE، التهيئة قبل الاستخدام يُجبر عليها المترجم، lifetime المتغير في Stack، ترتيب التهيئة في Java |
| 1.1.6 | أدوات التطوير Maven مقدمة | لماذا نحتاج build tool، هيكل مشروع Maven القياسي، pom.xml البنية الأساسية، إضافة dependency وdownload تلقائي، mvn compile و mvn run والأوامر الأساسية، Maven repositories: local/central/remote، Maven Wrapper للتوافق بين الفرق، Gradle مقارنة سريعة وموضعه، إنشاء مشروع Maven من IntelliJ، أول مشروع منظم بأدوات احترافية |
| 1.1.7 | Git مع Java للمطور المبتدئ | لماذا Git ضرورة وليست اختياراً، git init و git add و git commit، .gitignore لـ Java (تجاهل target/ و.class)، git status و git log، GitHub/GitLab: رفع المشروع، branching: main و feature branches، دورة العمل الأساسية: code → stage → commit → push، تعارضات merge conflicts البسيطة، Git في IntelliJ IDE، README.md للمشروع |
| 1.1.8 | التوثيق والكود النظيف | Javadoc: @param @return @throws @author، توليد HTML documentation من IDE، أسماء معبّرة لا تحتاج تعليقاً، قاعدة وظيفة واحدة للميثود الواحدة، طول الدوال والفئات المناسب، تجنّب magic numbers استخدم constants، Code review: ماذا يبحث المراجع؟، Checkstyle و SpotBugs مقدمة، تحسين كود موجود بالـ refactoring، الفرق بين clean code وcode يعمل |
| 1.1.9 | البيئة الاحترافية IntelliJ IDEA | اختصارات لوحة المفاتيح الأساسية، Live Templates وCode Generation، Debugger: Breakpoints وStep Over وInspect Variables، Refactoring تلقائي: Rename وExtract Method، Quick Fix وInspections التلقائية، Run Configurations، Terminal المدمج، Version Control integration داخل IDE، Plugins المفيدة للمبتدئ، تخصيص البيئة للإنتاجية القصوى |
| 1.1.10 | مشروع ترحيبي: تطبيق تفاعلي صغير | تصميم برنامج "سجل المهام" Task List، أخذ المدخلات بـ Scanner وعرضها، تخزين مؤقت بـ Array، قائمة أوامر: add/list/delete/exit، تجميع كل ما تعلم في المرحلة، Git commit لكل خطوة، Javadoc على main method، رسالة خطأ واضحة للمستخدم، اختبار حالات الحافة (مصفوفة فارغة)، استعراض الكود مع النفس (self code review) |

#### المرحلة 1.2 — أنواع البيانات والعمليات (10 وحدات)
*(اتبع نفس نمط 10 دروس لكل وحدة)*
| الوحدة | الاسم |
|---|---|
| 1.2.1 | الأنواع البدائية الثمانية Primitive Types |
| 1.2.2 | Wrapper Classes والتحويل |
| 1.2.3 | العمليات الحسابية والمنطقية والمقارنة |
| 1.2.4 | Type Casting وتحويل الأنواع |
| 1.2.5 | فخاخ الأعداد الفاصلة Floating Point Pitfalls |
| 1.2.6 | BigDecimal وBigInteger للدقة العالية |
| 1.2.7 | Math class و Random و UUID |
| 1.2.8 | Enums في Java |
| 1.2.9 | الثنائيات Bitwise Operations |
| 1.2.10 | مشروع: آلة حاسبة علمية |

#### المرحلة 1.3 — التحكم في التدفق (10 وحدات)
| الوحدة | الاسم |
|---|---|
| 1.3.1 | if/else والشروط المركّبة |
| 1.3.2 | Ternary Operator و Short-Circuit |
| 1.3.3 | switch التقليدي |
| 1.3.4 | Switch Expressions (Java 14+) |
| 1.3.5 | حلقة for والـ Enhanced for |
| 1.3.6 | حلقة while و do-while |
| 1.3.7 | break و continue والتسميات |
| 1.3.8 | التكرار المتداخل Nested Loops |
| 1.3.9 | أنماط التحكم في التدفق (Guard Clause, Early Return) |
| 1.3.10 | مشروع: محلل نص وإحصائياته |

#### المرحلة 1.4 — الدوال والتوابع (10 وحدات)
| الوحدة | الاسم |
|---|---|
| 1.4.1 | إعلان الدوال والمعاملات والعائد |
| 1.4.2 | Pass by Value في Java |
| 1.4.3 | Method Overloading |
| 1.4.4 | Recursion الأساسي |
| 1.4.5 | Recursion المتقدم (Tail, Memoization) |
| 1.4.6 | Varargs وحجج متغيرة |
| 1.4.7 | static methods vs instance methods |
| 1.4.8 | أنماط تصميم الدوال (Helper, Factory) |
| 1.4.9 | Scope والـ Stack Frames |
| 1.4.10 | مشروع: مكتبة وظائف رياضية ونصية |

#### المرحلة 1.5 — المصفوفات والسلاسل (10 وحدات)
| الوحدة | الاسم |
|---|---|
| 1.5.1 | المصفوفات أحادية البعد |
| 1.5.2 | المصفوفات ثنائية البعد والمتعددة |
| 1.5.3 | Arrays class: sort, search, copy, fill |
| 1.5.4 | String: immutability وعمليات أساسية |
| 1.5.5 | String: البحث والمقارنة والتعديل |
| 1.5.6 | StringBuilder وStringBuffer |
| 1.5.7 | Regular Expressions أساسيات |
| 1.5.8 | String.format وtextblocks (Java 15+) |
| 1.5.9 | معالجة النصوص العربية Unicode |
| 1.5.10 | مشروع: محلل CSV بسيط |

#### المرحلة 1.6 — مدخل البرمجة كائنية التوجه (10 وحدات)
| الوحدة | الاسم |
|---|---|
| 1.6.1 | الفئة والكائن: من التصميم للتنفيذ |
| 1.6.2 | المنشئات Constructors وأنواعها |
| 1.6.3 | Encapsulation وprivate/public/protected |
| 1.6.4 | Getters وSetters وأنماطها |
| 1.6.5 | this keyword وتطبيقاته |
| 1.6.6 | static fields وstatic methods |
| 1.6.7 | Singleton Pattern (أول Design Pattern) |
| 1.6.8 | Object class وtoString, equals, hashCode |
| 1.6.9 | Record classes (Java 16+) |
| 1.6.10 | مشروع: نظام إدارة بيانات بسيط |

#### المرحلة 1.7 — مشروع شامل للمستوى الأول (10 وحدات)
| الوحدة | الاسم |
|---|---|
| 1.7.1 | تحليل المتطلبات وتصميم الكائنات |
| 1.7.2 | تصميم نموذج البيانات (Data Model) |
| 1.7.3 | طبقة التخزين بـ ArrayList |
| 1.7.4 | طبقة الخدمات Service Layer |
| 1.7.5 | واجهة سطر الأوامر CLI |
| 1.7.6 | التحقق من المدخلات (Validation Layer) |
| 1.7.7 | معالجة الأخطاء أول مرة |
| 1.7.8 | الحفظ والتحميل من ملف نصي |
| 1.7.9 | تحسين الأداء وإعادة هيكلة الكود |
| 1.7.10 | التوثيق الكامل والتسليم النهائي |

---

### المستوى 2

#### المرحلة 2.1 — OOP المتقدمة (10 وحدات)
| الوحدة | الاسم |
|---|---|
| 2.1.1 | Inheritance: extends وhierarchy |
| 2.1.2 | Method Overriding و@Override |
| 2.1.3 | super واستدعاء المنشئ الأب |
| 2.1.4 | Abstract Classes والدوال المجردة |
| 2.1.5 | Interfaces الأساسية |
| 2.1.6 | Interfaces المتقدمة (default, static, sealed - Java 17+) |
| 2.1.7 | Polymorphism وDynamic Dispatch |
| 2.1.8 | instanceof وPattern Matching (Java 16+) |
| 2.1.9 | Inner Classes وAnonymous Classes |
| 2.1.10 | مشروع: نظام رسوميات هندسية |

#### المرحلة 2.2 — الاستثناءات والملفات (10 وحدات)
| الوحدة | الاسم |
|---|---|
| 2.2.1 | Exception Hierarchy وأنواع الاستثناءات |
| 2.2.2 | try/catch/finally وترتيبها |
| 2.2.3 | throw وthrows |
| 2.2.4 | Custom Exceptions |
| 2.2.5 | Multi-catch وtry-with-resources |
| 2.2.6 | ملفات النص: FileReader وBufferedReader |
| 2.2.7 | ملفات النص: FileWriter وBufferedWriter |
| 2.2.8 | NIO.2: Path وFiles وFileSystem |
| 2.2.9 | Serialization وObjectInputStream/ObjectOutputStream |
| 2.2.10 | مشروع: نظام تسجيل Log متكامل |

#### المرحلة 2.3 — المجموعات والقوائم (10 وحدات)
| الوحدة | الاسم |
|---|---|
| 2.3.1 | Collections Framework نظرة عامة |
| 2.3.2 | List وArrayList وLinkedList |
| 2.3.3 | Set وHashSet وTreeSet وLinkedHashSet |
| 2.3.4 | Map وHashMap وTreeMap وLinkedHashMap |
| 2.3.5 | Queue وDeque وStack |
| 2.3.6 | Iterator وfor-each على Collections |
| 2.3.7 | Collections class: sort, shuffle, min, max |
| 2.3.8 | Comparable وComparator |
| 2.3.9 | Generics: الأنواع العامة |
| 2.3.10 | مشروع: نظام إدارة مخزون |

#### المرحلة 2.4 — البرمجة الوظيفية (10 وحدات)
| الوحدة | الاسم |
|---|---|
| 2.4.1 | Lambda Expressions |
| 2.4.2 | Functional Interfaces: Predicate, Function, Consumer, Supplier |
| 2.4.3 | Method References |
| 2.4.4 | Stream API أساسيات: filter, map, forEach |
| 2.4.5 | Stream API جمع: collect, reduce, count |
| 2.4.6 | Stream API متقدم: flatMap, distinct, sorted, limit |
| 2.4.7 | Optional لمعالجة null بأمان |
| 2.4.8 | Streams المتوازية Parallel Streams |
| 2.4.9 | Collectors المتقدمة: groupingBy, partitioningBy |
| 2.4.10 | مشروع: محرك تحليل بيانات بـ Streams |

#### المرحلة 2.5 — قواعد البيانات (10 وحدات)
| الوحدة | الاسم |
|---|---|
| 2.5.1 | JDBC ومكوناته الأساسية |
| 2.5.2 | Connection وDriverManager وإعداد قاعدة البيانات |
| 2.5.3 | Statement وتنفيذ SQL |
| 2.5.4 | PreparedStatement والحماية من SQL Injection |
| 2.5.5 | ResultSet وقراءة النتائج |
| 2.5.6 | Transactions وCommit وRollback |
| 2.5.7 | Connection Pooling مقدمة (HikariCP) |
| 2.5.8 | DAO Pattern التطبيق الكامل |
| 2.5.9 | ORM مقدمة: Hibernate و JPA مفاهيم |
| 2.5.10 | مشروع: نظام إدارة موظفين بقاعدة بيانات |

#### المرحلة 2.6 — الاختبار والجودة والنشر (10 وحدات)
| الوحدة | الاسم |
|---|---|
| 2.6.1 | لماذا الاختبار الآلي ضرورة لا رفاهية |
| 2.6.2 | JUnit 5: الأساسيات والتعليمات التوضيحية |
| 2.6.3 | Assertions وأنواعها في JUnit 5 |
| 2.6.4 | Parameterized Tests وTest Lifecycle |
| 2.6.5 | Mockito: مقدمة ومفهوم الـ Mocking |
| 2.6.6 | Code Coverage وSonarLint |
| 2.6.7 | Maven: compile وtest وpackage وdeploy |
| 2.6.8 | JAR وFAT JAR والتشغيل المستقل |
| 2.6.9 | Docker مقدمة: containerize تطبيق Java |
| 2.6.10 | CI/CD: GitHub Actions لـ Java |

#### المرحلة 2.7 — مشروع حقيقي شامل (10 وحدات)
| الوحدة | الاسم |
|---|---|
| 2.7.1 | مقدمة Spring Boot وأول REST API |
| 2.7.2 | Spring Boot: Controllers وRoutes |
| 2.7.3 | Spring Boot: Service Layer وDependency Injection |
| 2.7.4 | Spring Boot: JPA Repository وقاعدة البيانات |
| 2.7.5 | Spring Boot: Exception Handling العالمي |
| 2.7.6 | Spring Boot: Validation وDTO |
| 2.7.7 | Spring Boot: Security مقدمة (JWT أساسيات) |
| 2.7.8 | اختبار REST API بـ JUnit و MockMvc |
| 2.7.9 | التوثيق بـ Swagger/OpenAPI |
| 2.7.10 | النشر الكامل على Cloud (Railway/Render) |

---

## المخطط الكامل للـ JSON المطلوب

```json
{
  "schema_version": "v4.1",
  "specialty": {
    "slug": "java",
    "name": "لغة Java",
    "icon": "☕",
    "description": "...",
    "target_persona": "...",
    "teacher_tone": "...",
    "allowed_viz_templates": ["flowchart", "comparison_table", "architecture_diagram", "timeline", "class_diagram"],
    "allowed_tools": ["nukhba_ide_java"],
    "glossary": [...]
  },
  "levels": [
    {
      "level_index": 1,
      "name": "أساسيات Java والبرمجة كائنية التوجه المبدئية",
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
              "name": "تثبيت Java وإعداد البيئة",
              "goal": "...",
              "prerequisite_units": [],
              "enables_units": ["1.1.2"],
              "key_concepts": ["JDK", "JVM", "JRE", "JAVA_HOME", "classpath"],
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
                    { "kind": "diagnostic", "prompt": "...", "rubric": "...", "solution_outline": "...", "points": 1 },
                    { "kind": "decision",   "prompt": "...", "rubric": "...", "solution_outline": "...", "points": 2 },
                    { "kind": "application","prompt": "...", "rubric": "...", "solution_outline": "...", "points": 3 },
                    { "kind": "analysis",   "prompt": "...", "rubric": "...", "solution_outline": "...", "points": 2 },
                    { "kind": "connection", "prompt": "...", "rubric": "...", "solution_outline": "...", "points": 2 }
                  ]
                }
              ],
              "lessons": [
                {
                  "lesson_index": 1,
                  "name": "ما هي Java ولماذا هي رائدة منذ 30 عاماً",
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
                      "name": "Java Platform Independence",
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
                    { "term": "JVM", "definition": "..." }
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
    "unit_banks": {
      "1.1.1": {
        "variants": [
          [
            {
              "kind": "mcq",
              "prompt": "...",
              "choices": ["...", "...", "...", "..."],
              "correct_index": 2,
              "explanation": "...",
              "difficulty": 2,
              "points": 1,
              "time_limit_seconds": 60
            }
          ]
        ]
      }
    },
    "stage_banks": {
      "1.1": {
        "variants": [[...]]
      }
    },
    "level_banks": {
      "1": {
        "variants": [[...]]
      }
    }
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

### 4. المعامل (Lab)
- كل وحدة يجب أن تحتوي **معملاً واحداً على الأقل** (`labs` array فيها عنصر واحد على الأقل).
- كل معمل يحتوي **بالضبط 5 أسئلة**.
- الأنواع الـ5 يجب أن تظهر **كل واحدة مرة واحدة فقط** بالترتيب التالي:
  1. `diagnostic` — تشخيص ما يعرفه الطالب مسبقاً
  2. `decision` — يطلب اتخاذ قرار بين خيارات
  3. `application` — تطبيق عملي (كتابة كود أو حل مسألة)
  4. `analysis` — تحليل نتيجة أو كود موجود
  5. `connection` — ربط بمفاهيم أخرى أو توسيع
- **لا يُسمح بتكرار نوع** في نفس المعمل.

### 5. أسئلة الاختيار من متعدد (MCQ)
- يجب أن تحتوي على `choices` بـ2 خيارات على الأقل.
- يجب أن تحتوي على `correct_index` صالح (0 ≤ correct_index < choices.length).

### 6. الحقول الإلزامية لكل درس
```
name, goal, bridge_sentence, prerequisite_lessons (array, يمكن فارغاً),
enables_lessons (array, يمكن فارغاً), concepts (min 1), common_mistakes (min 1),
yemeni_examples (min 1), final_check_question, session_complete_criterion
```

### 7. الحقول الإلزامية لكل مفهوم (concept)
```
name (فريد داخل الدرس الواحد), explanation, mastery_criterion
```

### 8. bridge_sentence
- يجب أن تكون ≥ 10 كلمات (أقل من ذلك يُنتج تحذيراً).

### 9. pass_threshold_percent
- يجب أن تكون بين 40 و 95 (خارج هذا النطاق يُنتج تحذيراً).
- القيمة الموصى بها: 70 للوحدات والمراحل، 75 للمستويات.

---

## اختبار تحديد المستوى (Placement Test)

أنتج **18 سؤالاً MCQ** بالتوزيع التالي:

| # | target_level_index | target_unit_code | الموضوع |
|---|---|---|---|
| 1 | 1 | 1.1.2 | Java Hello World وبنية البرنامج |
| 2 | 1 | 1.2.1 | أنواع البيانات البدائية |
| 3 | 1 | 1.3.1 | شروط if/else |
| 4 | 1 | 1.3.5 | حلقات for |
| 5 | 1 | 1.4.1 | الدوال الأساسية |
| 6 | 1 | 1.4.3 | Overloading |
| 7 | 1 | 1.5.1 | المصفوفات |
| 8 | 1 | 1.6.1 | الكلاس والكائن |
| 9 | 1 | 1.6.3 | Encapsulation |
| 10 | 2 | 2.1.1 | Inheritance |
| 11 | 2 | 2.1.4 | Abstract Classes |
| 12 | 2 | 2.1.5 | Interfaces |
| 13 | 2 | 2.2.1 | Exceptions |
| 14 | 2 | 2.3.2 | ArrayList وList |
| 15 | 2 | 2.3.4 | HashMap وMap |
| 16 | 2 | 2.4.1 | Lambda Expressions |
| 17 | 2 | 2.4.4 | Stream API |
| 18 | 2 | 2.5.3 | JDBC وSQL |

---

## معايير الجودة العلمية والعملية

### الدرس المثالي
كل درس يجب أن:
- **`goal`**: يصف قدرة عملية قابلة للقياس ("يستطيع الطالب بعد هذا الدرس أن يكتب...")، ≥ 20 كلمة.
- **`bridge_sentence`**: جملة ربط بين الدرس السابق والحالي، ≥ 10 كلمات، تبني فضول الطالب.
- **`motivation_hook`** (v4.1): سبب عملي لماذا يهم هذا الدرس في سوق العمل العربي.
- **`learning_objectives`**: 2-4 أهداف Bloom واضحة، تتدرج من understand → apply.
- **`concepts`**: 3-5 مفاهيم حقيقية من الدرس. لكل مفهوم:
  - `name`: اسم المفهوم بالإنجليزية أو اسم ذو معنى.
  - `explanation`: شرح واضح ≥ 30 كلمة.
  - `mastery_criterion`: جملة تصف ما يستطيع فعله الطالب المتقن.
  - `weight`: 1 للمفاهيم العادية، 2 للمحورية، 3 للأساسية جداً.
- **`common_mistakes`**: 1-3 أخطاء حقيقية يقع فيها المتعلمون. لكل خطأ:
  - `mistake`: الخطأ الفعلي (مثال على الكود الخاطئ أو المفهوم المغلوط).
  - `correction`: الصحيح المقابل.
  - `treatment`: كيف يُشخّص المعلم الخطأ ويُصحّحه.
  - `severity`: `"minor"` للأسلوبي، `"major"` للمنطقي، `"critical"` للمؤثر على الأمان أو الصحة.
- **`yemeni_examples`**: مثال واحد على الأقل من الحياة اليومية العربية (تسوق، إدارة أعمال، تعليم، طب، بنوك). غير مرتبط بمنطقة جغرافية محددة.
- **`final_check_question`**: سؤال مفتوح يتحقق من فهم الطالب العميق، ليس مجرد "صح أم خطأ".
- **`session_complete_criterion`**: معيار واضح يعرف به الطالب أنه أتقن الدرس.
- **`solution_outline`** (v4.1): إجابة نموذجية للـ `final_check_question`، للمعلم الذكي فقط.

### المعمل المثالي
- **`title`**: اسم واضح يصف السيناريو الكامل.
- **`scenario`**: سيناريو واقعي ≥ 50 كلمة يصف مشكلة حقيقية يواجهها مطور Java.
- **`completion_criterion`**: معيار نجاح قابل للقياس.
- **`pedagogical_sequence`**: وصف كيف تتدرج الأسئلة الـ5 نحو الفهم الأعمق.
- الأسئلة:
  - `diagnostic`: يكشف المعرفة المسبقة، لا يُفترض مسبقاً أن الطالب يعرف الإجابة.
  - `decision`: يعرض سيناريوين أو ثلاثة ويطلب الاختيار المبرر.
  - `application`: يطلب كتابة كود Java حقيقي أو حل مسألة عملية.
  - `analysis`: يُقدّم كوداً فيه خطأ أو سلوك غير متوقع ويطلب التحليل.
  - `connection`: يربط موضوع الوحدة بوحدة سابقة أو بمجال تطبيقي أوسع.

### بنك الأسئلة المثالي
- كل وحدة: **variant واحد على الأقل** بـ **5-8 أسئلة MCQ**.
- كل مرحلة: **variant واحد على الأقل** بـ **10-15 سؤالاً MCQ**.
- كل مستوى: **variant واحد على الأقل** بـ **15-20 سؤالاً MCQ**.
- الخيارات الخاطئة (distractors) يجب أن تكون معقولة وقريبة من الصحيح.
- `explanation` لكل سؤال: اشرح لماذا الإجابة الصحيحة صحيحة وأين يخطئ الطالب عادةً.

---

## تعليمات الكود

- **جميع identifiers** (أسماء المتغيرات، الدوال، الكلاسات، المعاملات) في الكود Java **بالإنجليزية الخالصة**.
- كود Java في أمثلة الدروس يكتب في code blocks فقط (داخل backticks).
- المخرجات النصية للبرنامج (ما يُطبعه) يمكن أن تكون بالعربية.
- أمثلة صحيحة:
  ```java
  String studentName = "أحمد";
  int totalScore = 0;
  System.out.println("مرحباً " + studentName);
  ```

---

## نموذج درس مكتمل (قياسي)

```json
{
  "lesson_index": 1,
  "name": "ما هي Java ولماذا هي رائدة منذ 30 عاماً",
  "goal": "يفهم الطالب الأسباب الجوهرية لانتشار Java عالمياً ويستطيع توضيح الفرق بين JDK وJVM وJRE بشكل صحيح ويربط هذه المعرفة باختياره لتعلم Java",
  "bridge_sentence": "قبل أن نكتب أول سطر كود، نحتاج نفهم لماذا اخترنا Java من بين عشرات اللغات — وهذا الفهم هو ما يجعل كل قرار تصميمي في Java منطقياً لاحقاً",
  "prerequisite_lessons": [],
  "enables_lessons": ["1.1.1.2"],
  "motivation_hook": "Java تشغّل أنظمة البنوك والمستشفيات وتطبيقات Android في يدك — معرفة لماذا اختارتها هذه الأنظمة يجعلك مطوراً يفهم القرارات لا مجرد يكتب كوداً",
  "learning_objectives": [
    { "statement": "يشرح الطالب مفهوم WORA وكيف يجعل Java تعمل على أي منصة", "bloom_level": "understand" },
    { "statement": "يميّز الطالب بين JDK وJVM وJRE ويذكر دور كل منها", "bloom_level": "understand" },
    { "statement": "يذكر الطالب 3 مجالات حقيقية تستخدم Java في الإنتاج", "bloom_level": "remember" }
  ],
  "concepts": [
    {
      "name": "Write Once Run Anywhere (WORA)",
      "explanation": "مبدأ Java الأساسي: الكود يُترجم مرة واحدة إلى Bytecode يفهمه الـ JVM، وكل منصة (Windows/Linux/Mac/Android) تملك JVM خاصاً بها يُنفّذ نفس الـ Bytecode. لا حاجة لإعادة كتابة الكود لكل نظام.",
      "mastery_criterion": "يستطيع الطالب رسم مسار تنفيذ برنامج Java من الكود المصدري حتى التنفيذ على منصتين مختلفتين وشرح دور كل مكون",
      "weight": 3
    },
    {
      "name": "JDK vs JVM vs JRE",
      "explanation": "JDK (Java Development Kit): أدوات المطور — يتضمن المترجم javac والـ JRE. JRE (Java Runtime Environment): بيئة تشغيل — يتضمن الـ JVM والمكتبات القياسية. JVM (Java Virtual Machine): الآلة الافتراضية التي تنفّذ الـ Bytecode فعلياً.",
      "mastery_criterion": "يستطيع الطالب تحديد أي المكونات يحتاج للتطوير وأيها للتشغيل فقط، ويشرح العلاقة بين الثلاثة",
      "weight": 2
    },
    {
      "name": "Java Ecosystem والمجالات",
      "explanation": "Java تُستخدم في: Enterprise Applications (بنوك، تأمين)، Android Development، Big Data (Apache Hadoop/Spark)، Web Backends (Spring Boot)، Embedded Systems. سبب استمراريتها: Type Safety، Backward Compatibility، ونظام بيئي ضخم.",
      "mastery_criterion": "يربط الطالب Java بمجال مهني محدد يهمه ويصف استخدامها الفعلي فيه",
      "weight": 1
    }
  ],
  "common_mistakes": [
    {
      "mistake": "الطالب يخلط بين تثبيت JDK وJRE ويثبّت JRE فقط ثم يتفاجأ بعدم وجود مترجم javac",
      "correction": "للتطوير يجب تثبيت JDK الذي يشمل JRE بداخله، وJRE وحده يكفي فقط لتشغيل برامج Java المُترجمة مسبقاً",
      "treatment": "اسأل الطالب: 'ما الفرق بين المطوّر ومستخدم البرنامج؟' ثم اربط هذا بالفرق بين JDK وJRE",
      "severity": "major"
    },
    {
      "mistake": "الاعتقاد بأن Java بطيئة بسبب طبقة الـ JVM، والمقارنة غير العادلة مع C",
      "correction": "الـ JIT Compiler الحديث يُحوّل الـ Bytecode لكود مُحسَّن يعمل مقارباً للسرعة native في معظم التطبيقات",
      "treatment": "اشرح مفهوم الـ JIT بمثال بسيط: أول تشغيل أبطأ، والتكرار يُحسّنه تلقائياً",
      "severity": "minor"
    }
  ],
  "yemeni_examples": [
    "نظام تتبع الطلبات في متجر إلكتروني عربي — الـ backend الذي يحسب الشحن ويُحدّث المخزون كثيراً ما يُبنى بـ Java بسبب موثوقيتها في التحميل العالي"
  ],
  "final_check_question": "شرح لي بكلامك: لماذا يمكن تشغيل برنامج Java المُترجم على Windows وعلى Linux بدون إعادة ترجمته؟ ما الذي يجعل هذا ممكناً؟",
  "session_complete_criterion": "يستطيع الطالب شرح WORA بمثال حياتي، وتمييز JDK عن JRE عن JVM، وذكر مجالين يستخدمان Java في الإنتاج الفعلي",
  "solution_outline": "الجواب الصحيح يتضمن: (1) javac يُترجم الكود لـ Bytecode (.class) لا لكود native مباشرة، (2) كل نظام تشغيل يملك JVM خاصاً يقرأ نفس الـ Bytecode، (3) JIT يُحوّل الـ Bytecode لكود native وقت التشغيل لكل منصة على حدة",
  "expected_duration_minutes": 25,
  "glossary": [
    { "term": "JVM", "definition": "Java Virtual Machine — الآلة الافتراضية التي تنفّذ Bytecode جافا وتوفر بيئة تشغيل مستقلة عن نظام التشغيل" },
    { "term": "Bytecode", "definition": "الشكل الوسيط الذي ينتجه مترجم javac — ليس كوداً نصياً ولا كوداً native، بل تعليمات تفهمها JVM" },
    { "term": "WORA", "definition": "Write Once Run Anywhere — مبدأ Java الذي يتيح تشغيل نفس البرنامج على أي منصة تملك JVM" }
  ]
}
```

---

## نموذج معمل مكتمل

```json
{
  "lab_index": 1,
  "title": "تشخيص بيئة Java وأول برنامج يُطبع معلومات النظام",
  "scenario": "أنت مطور مبتدئ انضممت لفريق يعمل على مشروع Java. المدير الفني طلب منك التحقق من أن بيئتك مُعدّة بشكل صحيح وكتابة برنامج بسيط يُطبع معلومات Java المثبتة على جهازك. هذه المهمة الأولى تُحدد إذا أنت جاهز للعمل مع بقية الفريق.",
  "completion_criterion": "يكتب الطالب برنامج Java يتحقق من إصدار Java المثبت ويُطبع معلومات النظام الأساسية بشكل منظم",
  "pedagogical_sequence": "تبدأ بتشخيص ما يعرفه الطالب عن JVM، ثم نطلب منه اتخاذ قرار حول الأدوات، ثم تطبيق عملي بكتابة كود حقيقي، ثم تحليل مخرجات الكود، وأخيراً ربط بيئة Java بسياق عمل فعلي",
  "questions": [
    {
      "kind": "diagnostic",
      "prompt": "قبل أن نبدأ: ما الفرق بين JDK وJRE من منظورك الآن؟ اكتب ما تفهمه بكلامك، ولو كانت إجابتك 'لا أعرف' فهذا مقبول تماماً.",
      "rubric": "يُقيَّم على: الدقة المفاهيمية (JDK للتطوير / JRE للتشغيل)، الصياغة واضحة وغير مشتتة",
      "solution_outline": "JDK يشمل أدوات التطوير (javac, javadoc, jar) + JRE. JRE يشمل JVM + المكتبات القياسية. للتطوير: JDK. لتشغيل برامج جاهزة: JRE يكفي.",
      "points": 1
    },
    {
      "kind": "decision",
      "prompt": "زميلك يريد تشغيل برنامج Java مُترجم (.jar) على جهازه لكنه ليس مطوراً. ماذا تنصحه بتثبيت: (أ) JDK كامل، (ب) JRE فقط، (ج) لا شيء — Java تعمل بدون تثبيت. علّل إجابتك.",
      "rubric": "الإجابة الصحيحة (ب) مع تعليل واضح: JRE يكفي للتشغيل لأنه يحتوي JVM والمكتبات. JDK أكبر وغير ضروري إذا لم يكن يطوّر.",
      "solution_outline": "الإجابة: ب. JRE يحتوي JVM الذي ينفّذ .jar. JDK فيه أدوات إضافية للمطور (javac) غير ضرورية هنا. لا يمكن تشغيل Java بدون JVM.",
      "points": 2
    },
    {
      "kind": "application",
      "prompt": "اكتب برنامج Java يُطبع: (1) إصدار Java المثبت باستخدام System.getProperty(\"java.version\")، (2) اسم نظام التشغيل باستخدام System.getProperty(\"os.name\")، (3) المسار الحالي باستخدام System.getProperty(\"user.dir\").",
      "rubric": "class صحيح مع main method، استخدام System.getProperty() الصحيح للثلاث خصائص، مخرجات منسقة وواضحة",
      "solution_outline": "public class SystemInfo { public static void main(String[] args) { System.out.println(\"Java: \" + System.getProperty(\"java.version\")); System.out.println(\"OS: \" + System.getProperty(\"os.name\")); System.out.println(\"Dir: \" + System.getProperty(\"user.dir\")); } }",
      "points": 3
    },
    {
      "kind": "analysis",
      "prompt": "شغّل برنامجك وانظر للمخرجات. الآن أضف هذا السطر بعد الأسطر الثلاثة: System.out.println(\"Memory: \" + Runtime.getRuntime().totalMemory()); ما الرقم الذي طلع؟ وما الوحدة التي تعتقد أنه بها (bytes/KB/MB)؟",
      "rubric": "يشغّل الكود ويُلاحظ الرقم الكبير ويستنتج أنه بالـ bytes (ليس MB)، ويربط هذا بفهم تخصيص الذاكرة في JVM",
      "solution_outline": "الرقم بالـ bytes. المستخدم يتوقع MB لكن JVM يُعطي الذاكرة بالـ bytes. لتحويل لـ MB: قسّم على (1024*1024). هذا يُظهر أن JVM خصّص heap memory من البداية.",
      "points": 2
    },
    {
      "kind": "connection",
      "prompt": "ذكرنا أن Java تعمل على أي منصة بسبب JVM. كيف يرتبط هذا بمبدأ WORA الذي شرحناه؟ وما الفائدة العملية لفريق تطوير يعمل بعضه على Windows وبعضه على Mac؟",
      "rubric": "يربط System.getProperty() بالمنصة المختلفة، يشرح أن نفس .class يعمل على OS مختلف، يذكر فائدة للفريق",
      "solution_outline": "WORA يعني: نفس .class يعمل على Windows وMac وLinux بدون تعديل. الفائدة للفريق: المطور على Mac يُرسل .jar لزميله على Windows ويعمل مباشرة. هذا ما يجعل Java مناسبة للمشاريع الكبيرة بفرق موزعة.",
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
  "prompt": "ما الفرق الرئيسي بين JDK وJRE في Java؟",
  "choices": [
    "JDK للتشغيل فقط وJRE للتطوير",
    "JDK يشمل JRE مع إضافة أدوات التطوير كالمترجم javac",
    "JRE أسرع من JDK في التنفيذ",
    "لا فرق بينهما، كلاهما يُستخدم بنفس الطريقة"
  ],
  "correct_index": 1,
  "explanation": "JDK (Java Development Kit) يحتوي على JRE + أدوات التطوير (javac, javadoc, jar). JRE (Java Runtime Environment) يحتوي فقط على JVM والمكتبات القياسية لتشغيل البرامج المُترجمة. الخطأ الشائع هو الاعتقاد أن JRE كافٍ للتطوير.",
  "difficulty": 1,
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

---

## قائمة التحقق النهائية (يجب مراجعتها قبل تسليم الملف)

- [ ] `schema_version` = `"v4.1"`
- [ ] `specialty.slug` = `"java"` (lowercase, no spaces)
- [ ] عدد المستويات = 2، عدد المراحل في كل مستوى = 7
- [ ] عدد الوحدات في كل مرحلة = 10، عدد الدروس في كل وحدة = 10
- [ ] كل وحدة فيها معمل واحد بالضبط (أو أكثر، لكن واحد على الأقل)
- [ ] كل معمل فيه 5 أسئلة بالأنواع: diagnostic, decision, application, analysis, connection (كل واحد مرة)
- [ ] لا تكرار في الأنواع داخل نفس المعمل
- [ ] كل prerequisite_units/enables_units يشير لكود موجود فعلاً في الملف
- [ ] كل prerequisite_lessons/enables_lessons يشير لكود درس موجود فعلاً
- [ ] لا دورات (cycles) في روابط الوحدات أو الدروس
- [ ] كل MCQ فيه choices + correct_index صالح
- [ ] bridge_sentence ≥ 10 كلمات لكل درس
- [ ] أسئلة تحديد المستوى: 18 سؤالاً، target_level_index مناسب (1 أو 2)، target_unit_code موجود فعلاً
- [ ] بنوك الأسئلة موجودة للوحدات والمراحل والمستويات
- [ ] جميع identifiers في الكود Java بالإنجليزية
- [ ] مجموع أوزان المفاهيم في كل درس > 0
- [ ] لا تكرار في أسماء المفاهيم داخل نفس الدرس
- [ ] الملف JSON صالح syntactically (بلا فواصل زائدة أو مفقودة)

---

## ملاحظات مهمة

1. **الحجم**: الملف الكامل سيكون بين 7-12 ميجابايت. الناشر يدعم حتى 64MB.
2. **الجودة أولاً**: لا تختصر في المحتوى. كل درس حقيقي، كل مفهوم دقيق.
3. **التسلسل المنطقي**: كل وحدة تبني على الوحدة السابقة. الطالب الذي أكمل الوحدة السابقة يجب أن يشعر بأنه جاهز تماماً للوحدة الحالية.
4. **سوق العمل**: الأمثلة والمشاريع والمعامل يجب أن تعكس احتياجات سوق العمل التقني العربي الفعلي.
5. **الكود القابل للتشغيل**: أي كود في الأمثلة يجب أن يكون صحيحاً وقابلاً للتشغيل بدون تعديل.
6. **اللغة العربية**: كل المحتوى النصي بالعربية. المصطلحات التقنية تُكتب بالإنجليزية مع شرح عربي عند أول ذكر.
