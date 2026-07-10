import { writeFileSync } from "fs";

const CURRICULUM = {
  schema_version: "v4.1",
  slug: "skill-c",
  name: "لغة C",
  icon: "⚙️",
  description: "مسار متكامل لتعلم لغة C من الصفر حتى الاحتراف — يبدأ بالبيئة والتركيب ويصل إلى البرمجة النظامية وإدارة الذاكرة وبناء الأنظمة الحقيقية، بتسلسل منطقي مريح يبني الفهم العميق لكيفية عمل الحاسوب",
  target_persona: "مطور يريد إتقان C من أسسها، سواء كان مبتدئاً يبحث عن فهم حقيقي لكيفية عمل البرامج أو مطوراً يريد اختراق عالم البرمجة النظامية والأنظمة المدمجة وتطوير أنظمة التشغيل",
  teacher_tone: "مهندس أنظمة خبير يشرح C بأسلوب مباشر عملي، يبدأ كل مفهوم بمثال كودي حقيقي يُترجَم وينفَّذ فوراً، يربط كل أمر لغوي بما يحدث فعلاً في ذاكرة الحاسوب، ويُحفّز الطالب بأسئلة 'توقّع ثم نفّذ'",
  allowed_viz_templates: ["flowchart", "comparison_table", "architecture_diagram", "timeline", "memory_diagram"],
  allowed_tools: ["nukhba_ide_c", "nukhba_ide_js"],
  levels: [
    {
      level_index: 1,
      name: "أساسيات C والبرمجة الإجرائية",
      goal: "بناء قاعدة صلبة في C تشمل بيئة التطوير والتركيب الأساسي وأنواع البيانات والتحكم في التدفق والدوال والمصفوفات والمؤشرات الأساسية، بما يُمكّن المتعلم من بناء برامج مستقلة وقابلة للقراءة والصيانة",
      bloom_focus: "apply",
      exam: { pass_threshold_percent: 70, time_limit_minutes: 60 },
      stages: [
        {
          stage_index: 1,
          name: "البيئة والتركيب الأساسي",
          goal: "إعداد بيئة C الاحترافية وفهم بنية البرنامج وقواعد الكتابة وآليات الإدخال والإخراج ودورة التطوير من كتابة الكود حتى التنفيذ",
          bloom_focus: "understand",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 20 },
          units: [
            {
              unit_index: 1, code: "1.1.1",
              name: "تثبيت GCC وإعداد البيئة",
              goal: "إعداد بيئة تطوير C احترافية كاملة تشمل المترجم GCC وVS Code وأدوات التصحيح",
              key_concepts: ["GCC Compiler","VS Code","Terminal","PATH","Build Tools"],
              lessons: [
                { name: "ما هي C ولماذا لا تزال ملكة اللغات", primary: "C language history importance systems programming" },
                { name: "تثبيت GCC على Windows بـ MinGW", primary: "GCC MinGW Windows installation setup" },
                { name: "تثبيت GCC على Linux وMac", primary: "GCC Linux Mac installation apt homebrew" },
                { name: "إعداد VS Code مع امتدادات C", primary: "VS Code C extension clangd setup" },
                { name: "أول تجميع: gcc hello.c -o hello", primary: "gcc compile command flags output" },
                { name: "فهم رسائل أخطاء المترجم", primary: "compiler errors warnings GCC messages" },
                { name: "Clang مقابل GCC: متى تختار أياً منهما", primary: "Clang GCC comparison choose" },
                { name: "هيكل مشروع C الاحترافي", primary: "C project structure src include Makefile" },
                { name: "أدوات التصحيح الأساسية: printf debugging", primary: "printf debugging C basic technique" },
                { name: "الموارد الأساسية لتعلم C", primary: "C learning resources K&R book reference" }
              ]
            },
            {
              unit_index: 2, code: "1.1.2",
              name: "أول برنامج C وتركيب اللغة",
              goal: "فهم بنية برنامج C وقواعد الكتابة والمسافات وتنظيم الكود وأسلوب الكتابة النظيفة",
              key_concepts: ["main()","#include","Semicolons","Braces","Code Style"],
              lessons: [
                { name: "برنامج Hello World وتشريح كل سطر", primary: "hello world main include stdio anatomy" },
                { name: "دالة main: نقطة البداية الإلزامية", primary: "main function return int argc argv" },
                { name: "مكتبة stdio.h والملفات الترويسة", primary: "stdio.h header files include standard" },
                { name: "الفاصلة المنقوطة: قاعدة لا استثناء", primary: "semicolon statement terminator C rule" },
                { name: "الأقواس المعقوصة ونطاق الكتلة", primary: "braces block scope C structure" },
                { name: "التعليقات: سطرية ومتعددة الأسطر", primary: "comments single line multi-line C" },
                { name: "الكلمات المحجوزة في C", primary: "C keywords reserved words list" },
                { name: "أسلوب K&R وأسلوب Allman", primary: "coding style KR Allman brace placement" },
                { name: "التحذيرات المفيدة: -Wall -Wextra", primary: "gcc warnings Wall Wextra enable" },
                { name: "السطر الأول لكل برمج C محترف", primary: "C professional first lines guards includes" }
              ]
            },
            {
              unit_index: 3, code: "1.1.3",
              name: "printf وscanf: الإدخال والإخراج",
              goal: "إتقان printf وscanf ومحددات التنسيق للتفاعل مع المستخدم بدقة",
              key_concepts: ["printf","scanf","Format Specifiers","newline","Buffer"],
              lessons: [
                { name: "printf: طباعة النصوص والأرقام", primary: "printf format specifiers string integer" },
                { name: "محددات التنسيق: %d %f %c %s", primary: "format specifiers percent d f c s" },
                { name: "تنسيق الأرقام: العرض والدقة العشرية", primary: "number format width precision printf" },
                { name: "scanf: قراءة مدخلات المستخدم", primary: "scanf read input address operator" },
                { name: "العنوان & مع scanf: لماذا ضروري", primary: "scanf address operator ampersand variable" },
                { name: "مشاكل scanf الشائعة وكيف تتجنبها", primary: "scanf buffer newline problems pitfalls" },
                { name: "getchar وputchar للأحرف الفردية", primary: "getchar putchar character input output" },
                { name: "gets وfgets وscanf للسلاسل النصية", primary: "fgets gets string input C safe" },
                { name: "fprintf وsprintf للملفات والنصوص", primary: "fprintf sprintf formatted output file string" },
                { name: "برنامج حاسبة بسيطة: printf وscanf معاً", primary: "calculator program input output C complete" }
              ]
            },
            {
              unit_index: 4, code: "1.1.4",
              name: "المعالج الأولي الأساسي",
              goal: "فهم دور المعالج الأولي preprocessor وتوجيهاته الأساسية",
              key_concepts: ["#include","#define","Preprocessor","Macros","Header Files"],
              lessons: [
                { name: "ما هو المعالج الأولي وكيف يعمل", primary: "preprocessor C phase before compilation" },
                { name: "#include: تضمين الملفات", primary: "include angle brackets quotes header" },
                { name: "#define: تعريف الثوابت", primary: "define constant preprocessor C symbolic" },
                { name: "الفرق بين #include بزاويتين وإشارتين", primary: "include angle quotes system user header" },
                { name: "الثوابت المعرّفة مسبقاً: __FILE__ __LINE__", primary: "predefined macros FILE LINE DATE" },
                { name: "gcc -E: رؤية مخرج المعالج الأولي", primary: "gcc preprocess only view output" },
                { name: "الترويسات القياسية الأساسية", primary: "standard headers stdio stdlib string math" },
                { name: "حماية الترويسات Header Guards أساسي", primary: "header guards ifndef define endif" },
                { name: "الفرق بين وقت الترجمة ووقت التشغيل", primary: "compile time runtime difference C" },
                { name: "تطبيق: برنامج يستخدم ثوابت #define", primary: "constants program define practical C" }
              ]
            },
            {
              unit_index: 5, code: "1.1.5",
              name: "مراحل تجميع البرنامج",
              goal: "فهم المراحل الأربع من الكود المصدري إلى الملف التنفيذي",
              key_concepts: ["Preprocessing","Compilation","Assembly","Linking","Object Files"],
              lessons: [
                { name: "رحلة الكود: من .c إلى ملف تنفيذي", primary: "compilation stages source to executable" },
                { name: "مرحلة المعالجة الأولية التفصيلية", primary: "preprocessing stage macros includes expansion" },
                { name: "مرحلة الترجمة: C إلى Assembly", primary: "compilation C to assembly code generation" },
                { name: "مرحلة التجميع: Assembly إلى Object File", primary: "assembly stage object file .o" },
                { name: "مرحلة الربط Linking", primary: "linking stage object files libraries executable" },
                { name: "الربط الساكن مقابل الديناميكي", primary: "static dynamic linking libraries comparison" },
                { name: "الرموز Symbols والمكتبات", primary: "symbols extern library linking C" },
                { name: "gcc -c: إنتاج ملف .o فقط", primary: "gcc compile only object file flag" },
                { name: "nm وobjdump: تحليل الملفات المجمّعة", primary: "nm objdump object file analysis tools" },
                { name: "تطبيق: مشروع ذو ملفات متعددة", primary: "multi-file project compile link C" }
              ]
            },
            {
              unit_index: 6, code: "1.1.6",
              name: "تصحيح الأخطاء بـ GDB",
              goal: "إتقان GDB للتحقيق في أخطاء البرنامج خطوة بخطوة",
              key_concepts: ["GDB","Breakpoints","Step","Print","Backtrace"],
              lessons: [
                { name: "لماذا GDB وليس printf فقط", primary: "GDB debugger why use instead printf" },
                { name: "تجميع مع معلومات التصحيح: -g", primary: "compile debug info flag -g GDB" },
                { name: "تشغيل GDB وأوامره الأساسية", primary: "GDB run break continue quit commands" },
                { name: "نقاط التوقف Breakpoints", primary: "GDB breakpoints set delete enable disable" },
                { name: "الخطو step وnext وcontinue", primary: "GDB step next continue stepi" },
                { name: "فحص المتغيرات print وdisplay", primary: "GDB print display variable inspect" },
                { name: "Backtrace: تتبع مكدس الاستدعاء", primary: "GDB backtrace call stack crash" },
                { name: "Watchpoints: مراقبة تغييرات الذاكرة", primary: "GDB watchpoints memory change detect" },
                { name: "تصحيح أخطاء Segmentation Fault", primary: "segfault debug GDB core dump" },
                { name: "تطبيق: تصحيح برنامج معطوب", primary: "debug broken program GDB practice" }
              ]
            },
            {
              unit_index: 7, code: "1.1.7",
              name: "Makefile والمشاريع متعددة الملفات",
              goal: "بناء وإدارة مشاريع C متعددة الملفات باستخدام Makefile",
              key_concepts: ["Makefile","Rules","Dependencies","Variables","Targets"],
              lessons: [
                { name: "مشكلة التجميع اليدوي مع تعدد الملفات", primary: "multiple files manual compilation problem" },
                { name: "Makefile: أساسيات البنية", primary: "Makefile structure target dependency recipe" },
                { name: "المتغيرات في Makefile", primary: "Makefile variables CC CFLAGS substitution" },
                { name: "الأهداف الوهمية Phony Targets", primary: "Makefile phony clean all targets" },
                { name: "التبعيات التلقائية وإعادة البناء", primary: "Makefile dependencies automatic rebuild" },
                { name: "Pattern Rules: قواعد النمط", primary: "Makefile pattern rules percent wildcard" },
                { name: "بناء مكتبة ساكنة بـ ar", primary: "static library ar create Makefile" },
                { name: "CMake: مولّد Makefile الحديث", primary: "CMake modern build system C" },
                { name: "مشروع C منظّم بـ Makefile احترافي", primary: "professional C project Makefile structure" },
                { name: "تطبيق: إدارة مشروع ذي 5 ملفات", primary: "5 file project Makefile manage C" }
              ]
            },
            {
              unit_index: 8, code: "1.1.8",
              name: "استكشاف أخطاء المبتدئين الشائعة",
              goal: "التعرف على أكثر 20 خطأ شيوعاً لمبتدئي C وكيفية إصلاحها",
              key_concepts: ["Syntax Errors","Logic Errors","Undefined Behavior","errno","Error Messages"],
              lessons: [
                { name: "أخطاء التركيب: الأسباب والحلول", primary: "syntax errors causes solutions C beginner" },
                { name: "نسيان الفاصلة المنقوطة: الأكثر شيوعاً", primary: "missing semicolon common error C" },
                { name: "عدم مطابقة الأقواس المعقوصة", primary: "mismatched braces brackets C error" },
                { name: "تعريف المتغير بدون تهيئة", primary: "uninitialized variable undefined behavior C" },
                { name: "الخروج عن حدود المصفوفة Buffer Overflow", primary: "array bounds overflow undefined behavior C" },
                { name: "نسيان & في scanf", primary: "scanf missing ampersand address common error" },
                { name: "مقارنة = مع == الفخ الكلاسيكي", primary: "assignment vs comparison = vs == C bug" },
                { name: "أخطاء المؤشر الأكثر خطورة", primary: "pointer errors null dereference dangling" },
                { name: "errno وperror لفهم أخطاء النظام", primary: "errno perror strerror system error C" },
                { name: "تطبيق: تصحيح 10 أخطاء في كود معطوب", primary: "fix bugs broken code C practice errors" }
              ]
            },
            {
              unit_index: 9, code: "1.1.9",
              name: "المشروع الأول: برنامج إدارة بسيط",
              goal: "تطبيق كل ما تعلمته في البيئة والتركيب لبناء برنامج C بسيط متكامل",
              key_concepts: ["Program Design","Modular Code","User Interface","Error Handling","Testing"],
              lessons: [
                { name: "تخطيط البرنامج قبل كتابة سطر واحد", primary: "program planning flowchart design before code" },
                { name: "تصميم واجهة المستخدم النصية", primary: "text user interface menu design C" },
                { name: "كتابة الكود بالتسلسل الصحيح", primary: "incremental development C program step" },
                { name: "التحقق من المدخلات validation", primary: "input validation checking C user" },
                { name: "تقسيم الكود إلى دوال صغيرة", primary: "function decomposition small focused C" },
                { name: "إضافة معالجة الأخطاء", primary: "error handling C program robust" },
                { name: "اختبار الحالات الحدية Edge Cases", primary: "edge cases testing C program" },
                { name: "قراءة الكود: مراجعة ذاتية", primary: "code review self check C quality" },
                { name: "التوثيق بالتعليقات المناسبة", primary: "code documentation comments C proper" },
                { name: "تمارين: تحسين وتوسيع البرنامج", primary: "improve extend C program exercises" }
              ]
            }
          ]
        },
        {
          stage_index: 2,
          name: "أنواع البيانات والمتغيرات",
          goal: "إتقان نظام الأنواع في C وفهم تمثيل البيانات في الذاكرة وإجراء العمليات الحسابية بدقة",
          bloom_focus: "understand",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 20 },
          units: [
            {
              unit_index: 1, code: "1.2.1",
              name: "أنواع البيانات الأساسية",
              goal: "فهم int وfloat وdouble وchar وكيف تُخزَّن في الذاكرة",
              key_concepts: ["int","float","double","char","sizeof"],
              lessons: [
                { name: "int: الأعداد الصحيحة والحجم والنطاق", primary: "int integer type size range C" },
                { name: "float وdouble: الأعداد العشرية", primary: "float double precision decimal C" },
                { name: "char: الحرف والأرقام ASCII", primary: "char character ASCII value C" },
                { name: "short وlong وlong long", primary: "short long integer types C modifiers" },
                { name: "unsigned: الأعداد الموجبة فقط", primary: "unsigned int types C positive only" },
                { name: "sizeof: حجم كل نوع في الذاكرة", primary: "sizeof operator type size memory" },
                { name: "حدود الأنواع: limits.h وfloat.h", primary: "type limits INT_MAX FLT_MAX C" },
                { name: "تمثيل الأعداد في الثنائي", primary: "binary representation integers C memory" },
                { name: "تمثيل الأعداد العشرية IEEE 754", primary: "IEEE 754 floating point representation" },
                { name: "اختيار النوع الصحيح لكل متغير", primary: "choose correct type variable C" }
              ]
            },
            {
              unit_index: 2, code: "1.2.2",
              name: "المتغيرات والثوابت والتهيئة",
              goal: "إتقان تعريف المتغيرات وتهيئتها وفهم const وأهمية القيم الابتدائية",
              key_concepts: ["Declaration","Initialization","const","Variables","Constants"],
              lessons: [
                { name: "تعريف المتغير: النوع والاسم والمكان", primary: "variable declaration type name location C" },
                { name: "التهيئة في التعريف مقابل لاحقاً", primary: "initialization at declaration vs later C" },
                { name: "المتغير غير المُهيَّأ: خطر صامت", primary: "uninitialized variable garbage value C" },
                { name: "const: الثابت الذي لا يتغير", primary: "const constant variable C keyword" },
                { name: "أسماء المتغيرات: القواعد والممارسات", primary: "variable naming rules conventions C" },
                { name: "المتغيرات العامة Global Variables", primary: "global variables C scope lifetime" },
                { name: "المتغيرات المحلية Local Variables", primary: "local variables C function scope" },
                { name: "static للمتغيرات المحلية الثابتة", primary: "static local variable C persistence" },
                { name: "register: تلميح المترجم للتسجيل", primary: "register keyword C optimization hint" },
                { name: "volatile: المتغير الذي يتغير خارجياً", primary: "volatile keyword C embedded hardware" }
              ]
            },
            {
              unit_index: 3, code: "1.2.3",
              name: "العمليات الحسابية والبت",
              goal: "إتقان جميع العمليات الحسابية والمنطقية ومعاملات البت في C",
              key_concepts: ["Arithmetic","Bitwise","Operators","Precedence","Modulus"],
              lessons: [
                { name: "العمليات الحسابية الأساسية +,-,*,/,%", primary: "arithmetic operators plus minus multiply divide modulus" },
                { name: "قسمة الأعداد الصحيحة: انتبه للاقتطاع", primary: "integer division truncation C pitfall" },
                { name: "أولوية العمليات والأقواس", primary: "operator precedence parentheses C" },
                { name: "عمليات الزيادة والنقصان ++ --", primary: "increment decrement prefix postfix C" },
                { name: "عمليات الإسناد المختصرة +=,-=,*=", primary: "compound assignment operators C" },
                { name: "معاملات البت: AND OR XOR NOT", primary: "bitwise AND OR XOR NOT operators C" },
                { name: "الإزاحة اليمين واليسار << >>", primary: "bit shift left right operators C" },
                { name: "تطبيقات معاملات البت: الأعلام Flags", primary: "bitwise flags bitmask applications C" },
                { name: "الفائض Overflow وما يحدث", primary: "integer overflow undefined behavior C" },
                { name: "تطبيق: حاسبة علمية بمعاملات البت", primary: "scientific calculator bitwise C application" }
              ]
            },
            {
              unit_index: 4, code: "1.2.4",
              name: "عمليات المقارنة والمنطق",
              goal: "إتقان عمليات المقارنة والعمليات المنطقية وفهم القيم الصحيحة في C",
              key_concepts: ["Comparison","Logical","Boolean","true","false"],
              lessons: [
                { name: "عمليات المقارنة: ==,!=,<,>,<=,>=", primary: "comparison operators equal not less greater C" },
                { name: "القيمة المنطقية في C: صفر وغير صفر", primary: "C boolean zero nonzero true false" },
                { name: "العمليات المنطقية: &&, ||, !", primary: "logical AND OR NOT operators C" },
                { name: "التقييم القصير Short-circuit Evaluation", primary: "short circuit evaluation logical C" },
                { name: "stdbool.h وNOع bool الحديث", primary: "stdbool bool C99 true false type" },
                { name: "مقارنة الأعداد العشرية: فخ الدقة", primary: "float comparison epsilon tolerance C" },
                { name: "مقارنة الأحرف ومراعاة ASCII", primary: "char comparison ASCII value C" },
                { name: "تركيب الشروط المعقدة", primary: "complex conditions combining logical C" },
                { name: "أخطاء = مقابل == الفخ الشهير", primary: "assignment comparison = == classic C bug" },
                { name: "تطبيق: نظام تحقق من الصلاحيات", primary: "authorization check logical operators C" }
              ]
            },
            {
              unit_index: 5, code: "1.2.5",
              name: "تحويل الأنواع",
              goal: "فهم التحويل الضمني والصريح بين الأنواع وتجنب أخطاء فقدان البيانات",
              key_concepts: ["Type Casting","Implicit Conversion","Explicit Cast","Promotion","Truncation"],
              lessons: [
                { name: "التحويل الضمني: متى يحدث تلقائياً", primary: "implicit conversion automatic C types" },
                { name: "ترقية الأنواع Integer Promotion", primary: "integer promotion arithmetic C" },
                { name: "التحويل الصريح Cast Operator", primary: "explicit cast operator type conversion C" },
                { name: "فقدان البيانات عند التحويل", primary: "data loss conversion truncation C" },
                { name: "تحويل int إلى float والعكس", primary: "int float conversion accuracy C" },
                { name: "تحويل char إلى int والعكس", primary: "char int conversion ASCII C" },
                { name: "تحويل الأعداد الكبيرة وFalse Truncation", primary: "large number truncation false conversion C" },
                { name: "تحويل الأعداد الموجبة والسالبة", primary: "signed unsigned conversion pitfalls C" },
                { name: "مقارنة المختلطة: signed unsigned", primary: "mixed comparison signed unsigned C" },
                { name: "تطبيق: دالة آمنة لتحويل النوع", primary: "safe type conversion function C" }
              ]
            },
            {
              unit_index: 6, code: "1.2.6",
              name: "نطاق المتغيرات وعمرها",
              goal: "فهم نطاق المتغيرات ودورة حياتها في الذاكرة",
              key_concepts: ["Scope","Lifetime","Stack","Heap","Storage Duration"],
              lessons: [
                { name: "نطاق الكتلة: المتغير داخل {}", primary: "block scope braces lifetime C" },
                { name: "نطاق الدالة والنطاق العام", primary: "function scope global scope C" },
                { name: "نطاق الملف: static خارج الدالة", primary: "file scope static external C" },
                { name: "مدة التخزين: تلقائية وساكنة وديناميكية", primary: "storage duration automatic static dynamic C" },
                { name: "Stack: ذاكرة الدوال والمتغيرات المحلية", primary: "stack memory functions local variables C" },
                { name: "Heap: الذاكرة الديناميكية malloc", primary: "heap dynamic memory malloc C" },
                { name: "قطعة البيانات: المتغيرات العامة والساكنة", primary: "data segment global static variables C" },
                { name: "التظليل Shadowing: متى يكون خطراً", primary: "variable shadowing outer inner C" },
                { name: "عمر المتغير مقابل نطاقه", primary: "lifetime vs scope variable C" },
                { name: "تطبيق: رسم خريطة الذاكرة لبرنامج", primary: "memory map program C variables" }
              ]
            },
            {
              unit_index: 7, code: "1.2.7",
              name: "التعداد enum والأنواع المعرّفة",
              goal: "استخدام enum لتمثيل مجموعات الثوابت المرتبطة وtypedef للأنواع المخصصة",
              key_concepts: ["enum","typedef","Named Constants","Readability","Type Alias"],
              lessons: [
                { name: "enum: تعداد الثوابت المسماة", primary: "enum named constants C readability" },
                { name: "قيم enum الافتراضية والمخصصة", primary: "enum values default custom C" },
                { name: "enum في switch-case", primary: "enum switch case C pattern" },
                { name: "typedef: منح الأنواع أسماء مميزة", primary: "typedef type alias C custom name" },
                { name: "typedef مع الهياكل: الاستخدام الشائع", primary: "typedef struct alias C common" },
                { name: "تسمية الأنواع بـ typedef لوضوح أفضل", primary: "typedef naming clarity C code" },
                { name: "enum وتمثيل الحالات State Machine", primary: "enum state machine C embedded" },
                { name: "enum وأعلام البت Bit Flags", primary: "enum bit flags bitmask C" },
                { name: "الفرق بين #define وenum للثوابت", primary: "define vs enum constants C comparison" },
                { name: "تطبيق: نظام قوائم بـ enum", primary: "menu system enum C application" }
              ]
            },
            {
              unit_index: 8, code: "1.2.8",
              name: "sizeof والمحاذاة في الذاكرة",
              goal: "فهم حجم الأنواع والمحاذاة وتأثيرها على تصميم البيانات",
              key_concepts: ["sizeof","Alignment","Padding","Memory Layout","portability"],
              lessons: [
                { name: "sizeof: حجم الأنواع عبر الأنظمة", primary: "sizeof types portability C cross platform" },
                { name: "المحاذاة Alignment في الذاكرة", primary: "memory alignment requirements C" },
                { name: "الحشو Padding في الهياكل", primary: "struct padding alignment C" },
                { name: "تقليل الحشو بترتيب الحقول الذكي", primary: "reduce padding field ordering C struct" },
                { name: "أنواع stdint.h للأحجام المضمونة", primary: "stdint int8_t uint32_t guaranteed size C" },
                { name: "Big Endian وLittle Endian", primary: "endianness big little C systems" },
                { name: "الأنواع المعتمدة على النظام: size_t", primary: "size_t ptrdiff_t platform types C" },
                { name: "offsetof: إزاحة الحقول في الهياكل", primary: "offsetof macro struct field C" },
                { name: "التحكم في المحاذاة بـ __attribute__", primary: "alignment attribute packed C GCC" },
                { name: "تطبيق: بروتوكول تحويل بيانات ثنائي", primary: "binary data protocol C portable" }
              ]
            },
            {
              unit_index: 9, code: "1.2.9",
              name: "السلوك غير المحدد Undefined Behavior",
              goal: "التعرف على مصادر السلوك غير المحدد في C وتجنبها",
              key_concepts: ["Undefined Behavior","Signed Overflow","Strict Aliasing","Sequence Points","UBSan"],
              lessons: [
                { name: "ما هو السلوك غير المحدد ولماذا خطير", primary: "undefined behavior C danger compiler" },
                { name: "فيضان الأعداد الصحيحة Integer Overflow", primary: "signed overflow undefined behavior C" },
                { name: "الوصول خارج حدود المصفوفة", primary: "out of bounds array undefined C" },
                { name: "إلغاء مرجع المؤشر الفارغ NULL", primary: "null pointer dereference undefined C" },
                { name: "تعديل ثابت const", primary: "modify const undefined behavior C" },
                { name: "Strict Aliasing: القاعدة الخفية", primary: "strict aliasing rule C UB" },
                { name: "Sequence Points: ترتيب التقييم", primary: "sequence points evaluation order C" },
                { name: "UBSan: اكتشاف السلوك غير المحدد", primary: "UBSan sanitizer undefined behavior C" },
                { name: "AddressSanitizer لأخطاء الذاكرة", primary: "AddressSanitizer ASAN memory errors C" },
                { name: "تطبيق: تحليل كود وإيجاد UB", primary: "analyze code find undefined behavior C" }
              ]
            }
          ]
        },
        {
          stage_index: 3,
          name: "التحكم في التدفق",
          goal: "إتقان جميع آليات التحكم في تدفق البرنامج من شروط وحلقات وإنهاء لبناء منطق برمجي متقن",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 20 },
          units: [
            {
              unit_index: 1, code: "1.3.1",
              name: "عبارة if وif-else",
              goal: "إتقان الشرط الأحادي والثنائي والمتعدد بأشكاله المختلفة",
              key_concepts: ["if","else","else-if","Condition","Nesting"],
              lessons: [
                { name: "if البسيط: تنفيذ شرطي", primary: "if statement condition C basic" },
                { name: "if-else: مسار بديل", primary: "if else alternative C" },
                { name: "else-if: سلسلة الشروط", primary: "else if chain conditions C" },
                { name: "if المتداخل Nested if", primary: "nested if C depth" },
                { name: "الشروط المركبة && و ||", primary: "compound conditions logical C" },
                { name: "الأقواس المعقوصة: متى ضرورية ومتى لا", primary: "braces if optional required C style" },
                { name: "أسلوب الكتابة: if المُبكر Early Return", primary: "early return guard clause C pattern" },
                { name: "if والقيم الصحيحة والزائفة في C", primary: "truthy falsy if zero nonzero C" },
                { name: "تحسين القابلية للقراءة في الشروط", primary: "readability conditions extract boolean C" },
                { name: "تطبيق: آلة قهوة بشروط معقدة", primary: "coffee machine if conditions C" }
              ]
            },
            {
              unit_index: 2, code: "1.3.2",
              name: "عبارة switch-case",
              goal: "إتقان switch-case بديلاً أوضح وأسرع للشروط المتعددة",
              key_concepts: ["switch","case","break","default","Fall-through"],
              lessons: [
                { name: "switch: الاختيار من متعدد بوضوح", primary: "switch statement C multiple choice" },
                { name: "case وbreak: لماذا break ضرورية", primary: "case break fall-through C" },
                { name: "default: الحالة الافتراضية", primary: "default case switch C" },
                { name: "Fall-through المتعمد: متى يكون مقصوداً", primary: "intentional fall-through C technique" },
                { name: "switch مع enum: التزاوج المثالي", primary: "switch enum C perfect pair" },
                { name: "switch مقابل if-else: متى تختار", primary: "switch vs if-else choose C" },
                { name: "تجميع الحالات المتشابهة", primary: "grouping cases switch C" },
                { name: "switch والأحرف char", primary: "switch char cases C" },
                { name: "switch والسلاسل النصية: لماذا لا يعمل", primary: "switch string C why not work" },
                { name: "تطبيق: قائمة تفاعلية بـ switch", primary: "interactive menu switch C" }
              ]
            },
            {
              unit_index: 3, code: "1.3.3",
              name: "حلقة while",
              goal: "إتقان حلقة while لتكرار العمليات بحسب الشروط",
              key_concepts: ["while","Loop Condition","Infinite Loop","Counter","Sentinel Value"],
              lessons: [
                { name: "while: البنية والدورة الكاملة", primary: "while loop structure C iteration" },
                { name: "شرط الإيقاف: العمود الفقري لـ while", primary: "stop condition while loop C" },
                { name: "العداد Counter: النمط الأساسي", primary: "counter variable while loop C" },
                { name: "قيمة الحارس Sentinel: للإدخال غير المحدود", primary: "sentinel value while input C" },
                { name: "الحلقة اللانهائية: متى ولماذا", primary: "infinite loop while C purpose" },
                { name: "while(1): الحلقة الأبدية المتحكم فيها", primary: "while 1 infinite controlled C" },
                { name: "تحديث متغير الشرط: لا تنساه", primary: "update condition variable while C" },
                { name: "while وقراءة الملفات حتى النهاية", primary: "while file reading EOF C" },
                { name: "نمط القراءة والتحقق Read-validate Pattern", primary: "read validate pattern while C" },
                { name: "تطبيق: برنامج تخمين الرقم", primary: "number guessing game while C" }
              ]
            },
            {
              unit_index: 4, code: "1.3.4",
              name: "حلقة for",
              goal: "إتقان حلقة for للتكرار المحدد العدد والتنقل في المصفوفات",
              key_concepts: ["for","Initialization","Condition","Update","Range"],
              lessons: [
                { name: "for: ثلاثة أقسام في سطر واحد", primary: "for loop three parts init condition update C" },
                { name: "التنقل في المصفوفة بـ for", primary: "array traversal for loop C index" },
                { name: "العد للأمام وللخلف", primary: "for loop count up down C" },
                { name: "for بخطوة غير واحدة", primary: "for loop step size increment C" },
                { name: "الحلقة المتداخلة: مصفوفة ثنائية البعد", primary: "nested for loop 2D array C" },
                { name: "حلقة for بمتغيرات متعددة", primary: "for loop multiple variables comma C" },
                { name: "break في for: الخروج المبكر", primary: "break for loop C early exit" },
                { name: "continue في for: تخطي التكرار", primary: "continue for loop C skip iteration" },
                { name: "for بدون أقسام: الحلقة اللانهائية", primary: "for empty infinite loop C" },
                { name: "تطبيق: طباعة مثلث نجوم", primary: "star triangle for loop C" }
              ]
            },
            {
              unit_index: 5, code: "1.3.5",
              name: "حلقة do-while",
              goal: "فهم do-while وكيف تختلف عن while وتحديد حالاتها الأنسب",
              key_concepts: ["do-while","Execute Once","Input Validation","Menu Loop","Post-test"],
              lessons: [
                { name: "do-while: التنفيذ قبل الفحص", primary: "do while execute before check C" },
                { name: "الفرق الجوهري بين while وdo-while", primary: "while vs do while difference C" },
                { name: "do-while لقائمة تتكرر حتى الإنهاء", primary: "do while menu loop quit C" },
                { name: "do-while للتحقق من المدخلات", primary: "do while input validation C" },
                { name: "do-while ونمط التحقق والإعادة", primary: "do while retry pattern C" },
                { name: "متى تختار do-while على while", primary: "choose do while over while C" },
                { name: "الحلقة المضمونة التنفيذ مرة واحدة", primary: "guaranteed one execution loop C" },
                { name: "do-while وبروتوكولات الاتصال", primary: "do while protocol handshake C" },
                { name: "هيكل البرنامج الكامل بـ do-while", primary: "program structure do while main loop C" },
                { name: "تطبيق: لعبة طلب الاستمرار", primary: "play again do while game C" }
              ]
            },
            {
              unit_index: 6, code: "1.3.6",
              name: "break وcontinue وgoto",
              goal: "فهم أدوات التحكم في الحلقات واستخدامها بحكمة",
              key_concepts: ["break","continue","goto","Labels","Loop Control"],
              lessons: [
                { name: "break: الخروج الفوري من الحلقة", primary: "break loop exit C" },
                { name: "continue: تخطي بقية التكرار الحالي", primary: "continue skip iteration C" },
                { name: "break في switch مقابل break في حلقة", primary: "break switch vs loop C difference" },
                { name: "الخروج من الحلقات المتداخلة: المشكلة", primary: "nested loop exit C problem" },
                { name: "goto: التاريخ والسمعة", primary: "goto history reputation C GOTO harmful" },
                { name: "goto والحلقات المتداخلة: الحل الجدلي", primary: "goto nested loops C solution" },
                { name: "goto ومعالجة الأخطاء: النمط الشائع في C", primary: "goto error handling cleanup C pattern" },
                { name: "بدائل goto الأنظف", primary: "goto alternatives clean C code" },
                { name: "متى يكون break وcontinue ضاراً", primary: "break continue harmful C overuse" },
                { name: "تطبيق: بحث عن عنصر في مصفوفة", primary: "search array break C" }
              ]
            },
            {
              unit_index: 7, code: "1.3.7",
              name: "الحلقات المتداخلة وأنماطها",
              goal: "إتقان الحلقات المتداخلة لمعالجة البيانات متعددة الأبعاد",
              key_concepts: ["Nested Loops","2D Arrays","Patterns","Complexity","Optimization"],
              lessons: [
                { name: "الحلقات المتداخلة: المفهوم والتعقيد", primary: "nested loops concept complexity C" },
                { name: "رسم الأنماط بالحلقات المتداخلة", primary: "nested loops patterns stars C" },
                { name: "التنقل في المصفوفة ثنائية البعد", primary: "2D array traversal nested for C" },
                { name: "تعقيد O(n²) والتأثير على الأداء", primary: "O n squared complexity nested loops C" },
                { name: "Break الخارجي: التقنيات المختلفة", primary: "outer break nested C techniques" },
                { name: "الحلقة الداخلية تعتمد على الخارجية", primary: "inner loop outer variable depends C" },
                { name: "ترتيب التكرار وتأثيره على الأداء الذاكري", primary: "loop order cache performance C" },
                { name: "فك التداخل: متى وكيف", primary: "loop unrolling optimization C" },
                { name: "تنقيح الحلقات المتداخلة المعطوبة", primary: "debug nested loops C trace" },
                { name: "تطبيق: ضرب المصفوفات", primary: "matrix multiplication nested loops C" }
              ]
            },
            {
              unit_index: 8, code: "1.3.8",
              name: "العامل الثلاثي والتعبيرات",
              goal: "استخدام العامل الثلاثي والتعبيرات الشرطية بوضوح وإيجاز",
              key_concepts: ["Ternary Operator","Conditional Expression","Comma Operator","Expression Statement"],
              lessons: [
                { name: "العامل الثلاثي ?: الأساسي", primary: "ternary operator conditional C basic" },
                { name: "قراءة العامل الثلاثي بوضوح", primary: "ternary readability C" },
                { name: "العامل الثلاثي المتداخل: متى يصبح سيئاً", primary: "nested ternary C bad practice" },
                { name: "العامل الثلاثي كتعبير في printf", primary: "ternary in printf expression C" },
                { name: "عامل الفاصلة ,: تقييم متسلسل", primary: "comma operator sequential evaluation C" },
                { name: "التعبيرات كعبارات Statement Expressions", primary: "expression statement C" },
                { name: "الإسناد كتعبير: قراءة وكتابة", primary: "assignment expression C read write" },
                { name: "تعبيرات جانب التأثير Side Effects", primary: "side effects expressions C" },
                { name: "أولوية العوامل الكاملة", primary: "operator precedence complete table C" },
                { name: "تطبيق: min/max بالعامل الثلاثي", primary: "min max ternary C function" }
              ]
            },
            {
              unit_index: 9, code: "1.3.9",
              name: "أنماط التحكم في التدفق المتقدمة",
              goal: "تطبيق أنماط التدفق المتقدمة لكتابة كود C أكثر نظافة وكفاءة",
              key_concepts: ["Guard Clauses","State Machines","Table-driven","Loop Patterns","Refactoring"],
              lessons: [
                { name: "Guard Clauses: التحقق المبكر والخروج", primary: "guard clauses early return C pattern" },
                { name: "آلة الحالة State Machine بـ switch-enum", primary: "state machine switch enum C" },
                { name: "الجدول المدفوع Table-driven Logic", primary: "table driven logic jump table C" },
                { name: "نمط الحلقة الرئيسية Main Loop", primary: "main loop pattern C program" },
                { name: "إعادة هيكلة الشروط المعقدة", primary: "refactor complex conditions C" },
                { name: "نمط الاستئناف Retry Pattern", primary: "retry loop pattern C error" },
                { name: "معالجة EOF في الحلقات", primary: "EOF handling loop C" },
                { name: "نمط المنتج-المستهلك Producer-Consumer", primary: "producer consumer pattern C loop" },
                { name: "تحسين الحلقات: مُحسِّنات المترجم", primary: "loop optimization compiler hints C" },
                { name: "تطبيق: محاكي آلة حالة بسيطة", primary: "state machine simulator C" }
              ]
            }
          ]
        },
        {
          stage_index: 4,
          name: "الدوال والنطاق",
          goal: "إتقان تعريف واستدعاء الدوال ومفاهيم النطاق والعمر والتكرار الذاتي وتنظيم الكود",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 20 },
          units: [
            {
              unit_index: 1, code: "1.4.1",
              name: "تعريف الدوال واستدعاؤها",
              goal: "إتقان بنية تعريف الدوال واستدعائها وفهم آلية نقل البيانات",
              key_concepts: ["Function Definition","Return Type","Parameters","Function Call","Stack Frame"],
              lessons: [
                { name: "لماذا الدوال: قوة التجريد والإعادة", primary: "functions abstraction reuse C why" },
                { name: "بنية تعريف الدالة في C", primary: "function definition structure C syntax" },
                { name: "استدعاء الدالة وإطار المكدس", primary: "function call stack frame C" },
                { name: "نقل البيانات بالقيمة Call by Value", primary: "call by value parameter copy C" },
                { name: "قيمة الإعادة return وأنواعها", primary: "return value type C function" },
                { name: "الدالة بدون إعادة: void", primary: "void return type function C" },
                { name: "دوال التوثيق الذاتي Self-documenting", primary: "self documenting function names C" },
                { name: "مبدأ المسؤولية الواحدة Single Responsibility", primary: "single responsibility function C principle" },
                { name: "الدوال المضمّنة inline", primary: "inline function C optimization" },
                { name: "تطبيق: مكتبة دوال رياضية", primary: "math library functions C" }
              ]
            },
            {
              unit_index: 2, code: "1.4.2",
              name: "الوسيطات والمعاملات",
              goal: "فهم أنواع الوسيطات وتمريرها بالقيمة والمرجع ودوال المعاملات المتغيرة",
              key_concepts: ["Parameters","Arguments","Pass by Value","Pass by Reference","Variadic"],
              lessons: [
                { name: "الفرق بين الوسيط والمعامل", primary: "parameter argument difference C" },
                { name: "التمرير بالقيمة: نسخة مستقلة", primary: "pass by value copy independent C" },
                { name: "التمرير بالمؤشر: مرجع للأصل", primary: "pass by pointer reference C" },
                { name: "تعديل المتغير الخارجي عبر المؤشر", primary: "modify external variable pointer C" },
                { name: "المصفوفات كوسيطات: دائماً بالمؤشر", primary: "array parameter pointer decay C" },
                { name: "const مع وسيطات المؤشر للحماية", primary: "const pointer parameter protection C" },
                { name: "المعاملات المتغيرة varargs وva_list", primary: "variadic functions varargs va_list C" },
                { name: "printf كمثال على varargs", primary: "printf variadic example C" },
                { name: "الدوال ذات القيم الافتراضية: حيلة C", primary: "default parameters C trick" },
                { name: "تطبيق: دالة فرز بمعامل مقارنة", primary: "sort function comparison parameter C" }
              ]
            },
            {
              unit_index: 3, code: "1.4.3",
              name: "التصريح والتعريف والتقديم",
              goal: "فهم الفرق بين التصريح والتعريف وترتيب الدوال في الملف",
              key_concepts: ["Declaration","Definition","Prototype","Forward Declaration","Header"],
              lessons: [
                { name: "التصريح مقابل التعريف: الفرق الجوهري", primary: "declaration vs definition C" },
                { name: "النموذج الأولي Prototype: إخبار المترجم مسبقاً", primary: "function prototype forward declaration C" },
                { name: "ترتيب الدوال في الملف", primary: "function order file C" },
                { name: "ملفات الترويسة .h: توحيد النماذج", primary: "header files prototypes declarations C" },
                { name: "التصريح الخارجي extern", primary: "extern declaration C multiple files" },
                { name: "التعريف الضمني: خطر في C89", primary: "implicit definition old C danger" },
                { name: "الدالة الوحيدة التعريف ODR", primary: "one definition rule C linker" },
                { name: "الدوال الساكنة static: نطاق الملف", primary: "static functions file scope C" },
                { name: "inline في الترويسات", primary: "inline function header C" },
                { name: "تطبيق: تنظيم مشروع بملفات h وc", primary: "project organization h c files C" }
              ]
            },
            {
              unit_index: 4, code: "1.4.4",
              name: "نطاق المتغيرات والدوال",
              goal: "إتقان نطاق المتغيرات داخل وبين الدوال وفهم الظل والتداخل",
              key_concepts: ["Local Scope","Global Scope","Shadowing","Visibility","Name Space"],
              lessons: [
                { name: "النطاق المحلي: المتغير يعيش في دالته", primary: "local scope function variable C" },
                { name: "النطاق العام: المتغير يرى الجميع", primary: "global scope variable C" },
                { name: "التظليل Shadowing: المحلي يخفي العام", primary: "shadowing local global C" },
                { name: "لماذا تجنب المتغيرات العامة قدر الإمكان", primary: "avoid global variables C reason" },
                { name: "تمرير البيانات مقابل المشاركة العامة", primary: "pass data vs global share C" },
                { name: "المتغير العام مقابل static العام", primary: "global vs static global C" },
                { name: "النطاق والربط Linkage الداخلي والخارجي", primary: "scope linkage internal external C" },
                { name: "مساحة الأسماء في C: الحل بالبادئات", primary: "namespacing prefix C convention" },
                { name: "الدوال الداخلية والوحدات الكبسولية", primary: "internal functions encapsulation C" },
                { name: "تطبيق: إعادة هيكلة كود يستخدم globals", primary: "refactor globals functions C" }
              ]
            },
            {
              unit_index: 5, code: "1.4.5",
              name: "المتغيرات الساكنة static",
              goal: "فهم static في الدوال والملفات وتطبيقاتها المفيدة",
              key_concepts: ["static","Persistent State","File Scope","Counter","Singleton"],
              lessons: [
                { name: "static المحلي: الذاكرة تبقى بين الاستدعاءات", primary: "static local persistent memory C" },
                { name: "متى يفيد static المحلي", primary: "static local use cases C" },
                { name: "static العام: نطاق الملف فقط", primary: "static global file scope C" },
                { name: "static والدوال: إخفاء العناصر", primary: "static function hide C module" },
                { name: "البرمجة الوحدية بـ static", primary: "modular programming static C" },
                { name: "العداد الدائم بـ static", primary: "persistent counter static C" },
                { name: "تهيئة static: القيمة الافتراضية صفر", primary: "static initialization zero C default" },
                { name: "static وأمان الخيوط Thread Safety", primary: "static thread safety C concern" },
                { name: "static مقابل المتغير العام: الاختيار الصحيح", primary: "static vs global choice C" },
                { name: "تطبيق: مولد معرّفات فريدة بـ static", primary: "unique ID generator static C" }
              ]
            },
            {
              unit_index: 6, code: "1.4.6",
              name: "التكرار الذاتي Recursion",
              goal: "فهم التكرار الذاتي وتطبيقه بأمان وكفاءة في المسائل الملائمة",
              key_concepts: ["Recursion","Base Case","Stack Overflow","Tail Recursion","Divide Conquer"],
              lessons: [
                { name: "مفهوم التكرار الذاتي بمثال بسيط", primary: "recursion concept C factorial" },
                { name: "الحالة الأساسية: درع ضد اللانهاية", primary: "base case recursion C" },
                { name: "المكدس وتكدس الاستدعاءات", primary: "stack overflow recursion C depth" },
                { name: "Fibonacci بالتكرار والتكرار الذاتي", primary: "fibonacci recursion iteration C" },
                { name: "المضروب Factorial بالتكرار الذاتي", primary: "factorial recursion C" },
                { name: "ثنائي البحث Binary Search تكرارياً", primary: "binary search recursive C" },
                { name: "الأشجار: التكرار الذاتي طبيعي", primary: "tree traversal recursion C natural" },
                { name: "التكرار الذاتي الذيلي Tail Recursion", primary: "tail recursion optimization C" },
                { name: "متى تستخدم التكرار ومتى التكرار الذاتي", primary: "recursion vs iteration when C" },
                { name: "تطبيق: حل أبراج هانوي", primary: "towers of Hanoi recursive C" }
              ]
            },
            {
              unit_index: 7, code: "1.4.7",
              name: "دوال المكتبة القياسية الأساسية",
              goal: "إتقان أهم دوال stdlib.h وstring.h وmath.h والمكتبات القياسية الأخرى",
              key_concepts: ["stdlib.h","math.h","string.h","Standard Library","Documentation"],
              lessons: [
                { name: "stdlib.h: الدوال الأساسية", primary: "stdlib.h atoi exit malloc C" },
                { name: "math.h: الرياضيات الكاملة", primary: "math.h sqrt pow sin cos C" },
                { name: "string.h: معالجة السلاسل", primary: "string.h strlen strcpy strcmp C" },
                { name: "time.h: التاريخ والوقت", primary: "time.h time clock C" },
                { name: "stdlib rand وsrand: الأرقام العشوائية", primary: "rand srand random numbers C" },
                { name: "qsort: الفرز المعياري", primary: "qsort standard sort C" },
                { name: "bsearch: البحث الثنائي المعياري", primary: "bsearch binary search C stdlib" },
                { name: "atoi وstrtol وsscanf للتحويل", primary: "atoi strtol sscanf conversion C" },
                { name: "القراءة الصحيحة لتوثيق man pages", primary: "man pages documentation C read" },
                { name: "تطبيق: برنامج إحصائيات باستخدام المكتبة", primary: "statistics program stdlib C" }
              ]
            },
            {
              unit_index: 8, code: "1.4.8",
              name: "تنظيم الكود وإعادة الاستخدام",
              goal: "تطبيق مبادئ تنظيم الكود وإعادة استخدام الدوال وبناء وحدات قابلة للصيانة",
              key_concepts: ["Refactoring","DRY","Modular Design","Code Organization","Maintainability"],
              lessons: [
                { name: "مبدأ DRY: لا تكرار في الكود", primary: "DRY principle C code" },
                { name: "قسّم المشكلة إلى دوال صغيرة", primary: "decompose problem small functions C" },
                { name: "اختبار الدالة الواحدة بسهولة", primary: "test single function C unit" },
                { name: "الدالة المثالية: قصيرة وواضحة", primary: "ideal function short clear C" },
                { name: "إعادة الهيكلة Refactoring بأمان", primary: "refactoring safe C" },
                { name: "التحسين المبكر: العدو الأول للكود", primary: "premature optimization enemy C" },
                { name: "التوثيق الداخلي: تعليق ما ولماذا لا كيف", primary: "documentation why not how C comments" },
                { name: "اختبار الدوال يدوياً ثم بالحالات", primary: "manual testing edge cases C" },
                { name: "نمط المكتبة: دوال مستقلة وقابلة للإعادة", primary: "library pattern reusable functions C" },
                { name: "تطبيق: إعادة هيكلة برنامج فوضوي", primary: "refactor messy program C" }
              ]
            },
            {
              unit_index: 9, code: "1.4.9",
              name: "مؤشرات الدوال Function Pointers أساسي",
              goal: "فهم مؤشرات الدوال والدوال كبيانات أولى First-class",
              key_concepts: ["Function Pointers","Callbacks","Type Alias","Table of Functions","qsort"],
              lessons: [
                { name: "مؤشر الدالة: الدالة كبيانات", primary: "function pointer C data first class" },
                { name: "تصريح مؤشر الدالة وإسناده", primary: "function pointer declaration assignment C" },
                { name: "استدعاء الدالة عبر المؤشر", primary: "function pointer call C" },
                { name: "Callback: تمرير الدالة كوسيط", primary: "callback function pointer parameter C" },
                { name: "typedef لمؤشرات الدوال", primary: "typedef function pointer C readability" },
                { name: "جدول الدوال Dispatch Table", primary: "dispatch table function pointers C" },
                { name: "qsort ومؤشر دالة المقارنة", primary: "qsort comparator function pointer C" },
                { name: "البرمجة الوظيفية في C بمؤشرات الدوال", primary: "functional programming C function pointers" },
                { name: "أنماط مؤشرات الدوال الشائعة", primary: "function pointer patterns C common" },
                { name: "تطبيق: منظومة events بسيطة بالمؤشرات", primary: "event system function pointers C" }
              ]
            }
          ]
        },
        {
          stage_index: 5,
          name: "المصفوفات والسلاسل النصية",
          goal: "إتقان المصفوفات بأنواعها والسلاسل النصية وعمليات معالجتها ودوال المكتبة القياسية",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 20 },
          units: [
            {
              unit_index: 1, code: "1.5.1",
              name: "المصفوفات أحادية البعد",
              goal: "إتقان تعريف المصفوفات وتهيئتها والوصول إلى عناصرها",
              key_concepts: ["Array Declaration","Indexing","Initialization","Size","Bounds"],
              lessons: [
                { name: "المصفوفة: مجموعة متجانسة متتالية", primary: "array contiguous memory C" },
                { name: "تعريف المصفوفة: النوع والاسم والحجم", primary: "array declaration size type C" },
                { name: "تهيئة المصفوفة عند التعريف", primary: "array initialization C" },
                { name: "الوصول بالمؤشر [i]: من الصفر", primary: "array indexing zero based C" },
                { name: "التنقل في المصفوفة بحلقة for", primary: "array traversal for loop C" },
                { name: "تمرير المصفوفة للدالة: يمرر بمؤشر", primary: "array pass function pointer decay C" },
                { name: "حجم المصفوفة: sizeof الحيلة", primary: "array size sizeof trick C" },
                { name: "الخروج عن الحدود: الخطر الصامت", primary: "out of bounds C array danger" },
                { name: "المصفوفة الساكنة مقابل الديناميكية", primary: "static vs dynamic array C" },
                { name: "تطبيق: برنامج إحصائيات على مصفوفة", primary: "statistics array C max min avg" }
              ]
            },
            {
              unit_index: 2, code: "1.5.2",
              name: "المصفوفات متعددة الأبعاد",
              goal: "التعامل مع المصفوفات ثنائية وثلاثية الأبعاد وتمثيل البيانات المصفوفية",
              key_concepts: ["2D Arrays","Row-major","Matrix","Multidimensional","Memory Layout"],
              lessons: [
                { name: "المصفوفة ثنائية البعد: جدول في الذاكرة", primary: "2D array matrix C row column" },
                { name: "تعريف المصفوفة ثنائية البعد وتهيئتها", primary: "2D array declaration initialization C" },
                { name: "الوصول بـ [i][j]: الصف ثم العمود", primary: "2D array access row column index C" },
                { name: "التخزين Row-major في الذاكرة", primary: "row major memory layout C 2D" },
                { name: "تنقل فعّال عبر المصفوفة (ترتيب الحلقات)", primary: "cache efficient 2D traversal C" },
                { name: "تمرير المصفوفة ثنائية البعد للدالة", primary: "pass 2D array function C" },
                { name: "المصفوفة ثلاثية الأبعاد", primary: "3D array C" },
                { name: "جداول الضرب: تطبيق عملي", primary: "multiplication table 2D array C" },
                { name: "المصفوفة الديناميكية ثنائية الأبعاد", primary: "dynamic 2D array malloc C" },
                { name: "تطبيق: عمليات المصفوفات الرياضية", primary: "matrix operations add multiply C" }
              ]
            },
            {
              unit_index: 3, code: "1.5.3",
              name: "السلاسل النصية: char arrays",
              goal: "فهم السلسلة النصية كمصفوفة أحرف منتهية بصفر وكيفية التعامل معها",
              key_concepts: ["String","null terminator","char array","String Literal","strlen"],
              lessons: [
                { name: "السلسلة النصية: مصفوفة أحرف + \\0", primary: "string char array null terminator C" },
                { name: "حرف النهاية \\0: أهمية واحترام", primary: "null terminator string C" },
                { name: "تعريف السلسلة وتهيئتها", primary: "string declaration initialization C" },
                { name: "السلسلة الحرفية String Literal والذاكرة", primary: "string literal memory read only C" },
                { name: "strlen: طول السلسلة بدون \\0", primary: "strlen string length C" },
                { name: "طباعة السلسلة: %s في printf", primary: "print string printf %s C" },
                { name: "قراءة السلسلة: fgets الآمن", primary: "fgets safe string input C" },
                { name: "تعديل السلسلة النصية حرفاً بحرف", primary: "modify string char by char C" },
                { name: "السلسلة الثابتة const char*", primary: "const char pointer string literal C" },
                { name: "تطبيق: برنامج عد الكلمات", primary: "word count string C" }
              ]
            },
            {
              unit_index: 4, code: "1.5.4",
              name: "دوال string.h",
              goal: "إتقان دوال معالجة السلاسل في المكتبة القياسية",
              key_concepts: ["strcpy","strcat","strcmp","strstr","strtok"],
              lessons: [
                { name: "strcpy وstrncpy: نسخ السلاسل", primary: "strcpy strncpy copy string C" },
                { name: "strcat وstrncat: الإلحاق", primary: "strcat strncat concatenate C" },
                { name: "strcmp وstrncmp: المقارنة", primary: "strcmp strncmp compare string C" },
                { name: "strstr: البحث عن سلسلة فرعية", primary: "strstr find substring C" },
                { name: "strchr وstrrchr: البحث عن حرف", primary: "strchr strrchr find char C" },
                { name: "strtok: تقطيع السلسلة", primary: "strtok tokenize string C" },
                { name: "sprintf وsnprintf: كتابة على السلسلة", primary: "sprintf snprintf format C" },
                { name: "dوال الأحرف: toupper tolower isdigit", primary: "ctype toupper tolower isdigit C" },
                { name: "الدوال الآمنة: strncat وsnprintf", primary: "safe string functions C" },
                { name: "تطبيق: محلل سلسلة CSV", primary: "CSV parser string C" }
              ]
            },
            {
              unit_index: 5, code: "1.5.5",
              name: "معالجة السلاسل النصية المتقدمة",
              goal: "تطبيق تقنيات معالجة السلاسل المتقدمة وبناء دوال نصية آمنة وفعّالة",
              key_concepts: ["String Processing","Parsing","Conversion","Safe Strings","String Builder"],
              lessons: [
                { name: "تحويل السلسلة لعدد: atoi strtol strtod", primary: "string to number atoi strtol C" },
                { name: "تحويل العدد لسلسلة: sprintf", primary: "number to string sprintf C" },
                { name: "إزالة المسافات من البداية والنهاية Trim", primary: "trim whitespace string C" },
                { name: "عكس السلسلة: خوارزمية بسيطة", primary: "reverse string C algorithm" },
                { name: "التحقق: palindrome وأنماط أخرى", primary: "palindrome check string C" },
                { name: "تقطيع وتحليل النصوص Parsing", primary: "parsing text string C" },
                { name: "قراءة سطور الملف: fgets في حلقة", primary: "read file lines fgets C" },
                { name: "مقارنة غير حساسة للحالة Case-insensitive", primary: "case insensitive compare C string" },
                { name: "نمط المطابقة Pattern Matching بسيط", primary: "simple pattern match string C" },
                { name: "تطبيق: محلل ملف INI بسيط", primary: "INI file parser C string" }
              ]
            },
            {
              unit_index: 6, code: "1.5.6",
              name: "المصفوفات والدوال",
              goal: "إتقان تمرير المصفوفات للدوال وإعادتها وبناء دوال مصفوفات آمنة",
              key_concepts: ["Array Parameter","Pointer Decay","Array Size","Return Array","In-place"],
              lessons: [
                { name: "تمرير المصفوفة: يتحول لمؤشر Decay", primary: "array parameter decay pointer C" },
                { name: "تمرير الحجم كوسيط منفصل", primary: "array size parameter separate C" },
                { name: "التعديل في المكان In-place", primary: "in place modification array C" },
                { name: "إعادة المصفوفة: الاختيارات الممكنة", primary: "return array C options" },
                { name: "المصفوفة الساكنة في الدالة: الحيلة", primary: "static array function return C" },
                { name: "تمرير مصفوفة ثنائية الأبعاد", primary: "pass 2D array function C" },
                { name: "دوال تعمل على أي حجم مصفوفة", primary: "generic size array functions C" },
                { name: "const مع مصفوفات الدوال للحماية", primary: "const array parameter protection C" },
                { name: "نسخ المصفوفة: memcpy وmemmove", primary: "memcpy memmove array copy C" },
                { name: "تطبيق: مكتبة دوال مصفوفات رياضية", primary: "array math library C functions" }
              ]
            },
            {
              unit_index: 7, code: "1.5.7",
              name: "البحث في المصفوفات",
              goal: "تطبيق خوارزميات البحث الخطي والثنائي وفهم متطلبات كل منها",
              key_concepts: ["Linear Search","Binary Search","Sorted Array","Search Complexity","Index"],
              lessons: [
                { name: "البحث الخطي: الحل الساذج لكل حالة", primary: "linear search C algorithm" },
                { name: "البحث الثنائي: الكفاءة تتطلب ترتيباً", primary: "binary search sorted C algorithm" },
                { name: "تطبيق البحث الثنائي تكرارياً", primary: "binary search iterative C" },
                { name: "تطبيق البحث الثنائي تكرارياً ذاتياً", primary: "binary search recursive C" },
                { name: "العثور على الحد الأدنى والأقصى", primary: "find min max array C" },
                { name: "العثور على العنصر المكرر", primary: "find duplicate element array C" },
                { name: "البحث في مصفوفة السلاسل", primary: "search string array C" },
                { name: "معالجة عدم وجود العنصر: -1 و NULL", primary: "element not found return C" },
                { name: "البحث في المصفوفة الثنائية البعد", primary: "search 2D array C" },
                { name: "تطبيق: نظام دليل هاتف بسيط", primary: "phone directory search C" }
              ]
            },
            {
              unit_index: 8, code: "1.5.8",
              name: "الفرز في المصفوفات",
              goal: "فهم وتطبيق خوارزميات الفرز الأساسية وqsort المعياري",
              key_concepts: ["Bubble Sort","Selection Sort","Insertion Sort","qsort","Stability"],
              lessons: [
                { name: "الفرز بالفقاعة Bubble Sort: الفهم أولاً", primary: "bubble sort C algorithm" },
                { name: "الفرز بالاختيار Selection Sort", primary: "selection sort C algorithm" },
                { name: "الفرز بالإدراج Insertion Sort", primary: "insertion sort C efficient small" },
                { name: "مقارنة الخوارزميات الثلاثة", primary: "sort algorithms comparison C" },
                { name: "qsort: الفرز المعياري الاحترافي", primary: "qsort stdlib C standard" },
                { name: "كتابة دالة مقارنة لـ qsort", primary: "comparator function qsort C" },
                { name: "فرز مصفوفة الهياكل بـ qsort", primary: "sort struct array qsort C" },
                { name: "الاستقرارية Stability في الفرز", primary: "stable sort C" },
                { name: "اختيار خوارزمية الفرز المناسبة", primary: "choose sort algorithm C" },
                { name: "تطبيق: ترتيب قاعدة بيانات بسيطة", primary: "database sort C application" }
              ]
            },
            {
              unit_index: 9, code: "1.5.9",
              name: "memset وmemcpy وعمليات الذاكرة",
              goal: "إتقان عمليات معالجة الذاكرة الخام وتطبيقاتها في المصفوفات والبيانات",
              key_concepts: ["memset","memcpy","memmove","memcmp","Memory Operations"],
              lessons: [
                { name: "memset: ملء منطقة ذاكرة بقيمة", primary: "memset fill memory C" },
                { name: "memcpy: نسخ سريع لمناطق الذاكرة", primary: "memcpy fast copy C memory" },
                { name: "memmove: نسخ آمن للمناطق المتداخلة", primary: "memmove overlapping C safe copy" },
                { name: "memcmp: مقارنة مناطق الذاكرة", primary: "memcmp compare memory C" },
                { name: "متى تستخدم mem* مقابل str*", primary: "memset vs strset when use C" },
                { name: "memset لتصفير المصفوفة", primary: "zero array memset C" },
                { name: "نسخ الهياكل بـ memcpy", primary: "copy struct memcpy C" },
                { name: "الأداء: mem* أسرع من حلقة for", primary: "memcpy performance C" },
                { name: "استخدام الذاكرة الخام للبروتوكولات", primary: "raw memory protocols C" },
                { name: "تطبيق: مخزن بيانات ثنائي عام", primary: "generic binary buffer C" }
              ]
            }
          ]
        },
        {
          stage_index: 6,
          name: "المؤشرات الأساسية",
          goal: "إتقان مفهوم المؤشرات وعملياتها الأساسية وتطبيقاتها مع المصفوفات والدوال",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 20 },
          units: [
            {
              unit_index: 1, code: "1.6.1",
              name: "مفهوم المؤشر والعنوان",
              goal: "فهم ماهية المؤشر وعنوان الذاكرة وكيف يتيح التعامل المباشر مع الذاكرة",
              key_concepts: ["Address","Pointer","Memory","& Operator","* Operator"],
              lessons: [
                { name: "الذاكرة كمصفوفة عملاقة من الخانات", primary: "memory address cells C" },
                { name: "عامل & : عنوان المتغير", primary: "address operator & variable C" },
                { name: "المؤشر: متغير يحمل عنواناً", primary: "pointer variable address C" },
                { name: "تعريف المؤشر: النجمة في التعريف", primary: "pointer declaration asterisk C" },
                { name: "إسناد العنوان للمؤشر", primary: "pointer assignment address C" },
                { name: "عامل *: إلغاء مرجعية المؤشر", primary: "dereference pointer asterisk C" },
                { name: "طباعة العنوان: %p في printf", primary: "print address %p printf C" },
                { name: "حجم المؤشر: نفسه على كل الأنواع", primary: "pointer size same type C" },
                { name: "المؤشر NULL: العنوان الصفري", primary: "NULL pointer C" },
                { name: "تطبيق: تبادل قيم برمجياً بالمؤشر", primary: "swap values pointer C" }
              ]
            },
            {
              unit_index: 2, code: "1.6.2",
              name: "حساب المؤشر Pointer Arithmetic",
              goal: "إتقان حساب المؤشر والتنقل في الذاكرة بكفاءة",
              key_concepts: ["Pointer Arithmetic","Increment","Offset","Pointer Difference","Array Walking"],
              lessons: [
                { name: "زيادة المؤشر p++: ينتقل بحجم النوع", primary: "pointer increment type size C" },
                { name: "جمع الأعداد الصحيحة للمؤشر p+n", primary: "pointer addition integer C" },
                { name: "الطرح: الفرق بين مؤشرين", primary: "pointer subtraction difference C" },
                { name: "التنقل في المصفوفة بالمؤشر", primary: "array walk pointer C" },
                { name: "*(p+i) مكافئ لـ p[i]", primary: "pointer array equivalence C" },
                { name: "مقارنة المؤشرات: أيهما أكبر", primary: "pointer comparison C" },
                { name: "حدود حساب المؤشر: لا تتجاوز", primary: "pointer bounds arithmetic C" },
                { name: "كفاءة المؤشر مقابل الفهرسة", primary: "pointer efficiency index C" },
                { name: "المؤشر الثابت وثابت المؤشر", primary: "const pointer pointer to const C" },
                { name: "تطبيق: نسخ سلسلة بالمؤشر", primary: "string copy pointer C manual" }
              ]
            },
            {
              unit_index: 3, code: "1.6.3",
              name: "المؤشرات والمصفوفات",
              goal: "فهم العلاقة العميقة بين المؤشرات والمصفوفات في C",
              key_concepts: ["Array Decay","Pointer Walk","Array Name","Equivalence","sizeof Difference"],
              lessons: [
                { name: "اسم المصفوفة: مؤشر للعنصر الأول", primary: "array name pointer first element C" },
                { name: "Array Decay: انحلال المصفوفة عند التمرير", primary: "array decay pointer C" },
                { name: "sizeof المصفوفة مقابل sizeof المؤشر", primary: "sizeof array vs pointer C" },
                { name: "التنقل بالمؤشر والتنقل بالفهرسة", primary: "pointer walk vs index C" },
                { name: "مصفوفة السلاسل: مؤشرات لمؤشرات", primary: "string array pointers C" },
                { name: "المصفوفة الثابتة مقابل المؤشر الثابت", primary: "const array vs const pointer C" },
                { name: "تمرير مقطع Slice من المصفوفة", primary: "array slice pointer C" },
                { name: "التمييز بين الفهرسة والمؤشر متى", primary: "index vs pointer choose C" },
                { name: "المصفوفة متعددة الأبعاد والمؤشرات", primary: "multidimensional array pointers C" },
                { name: "تطبيق: دالة بحث عامة بالمؤشر", primary: "generic search pointer C" }
              ]
            },
            {
              unit_index: 4, code: "1.6.4",
              name: "المؤشرات والسلاسل النصية",
              goal: "التعامل الاحترافي مع السلاسل النصية عبر المؤشرات",
              key_concepts: ["char pointer","String Traversal","String Copy","const char*","String Literals"],
              lessons: [
                { name: "char* مقابل char[]: الفرق الجوهري", primary: "char pointer vs array string C" },
                { name: "المؤشر على السلسلة الحرفية: للقراءة فقط", primary: "pointer string literal read only C" },
                { name: "التنقل عبر السلسلة بالمؤشر", primary: "string traversal pointer C" },
                { name: "نسخ السلسلة يدوياً بالمؤشر", primary: "string copy manual pointer C" },
                { name: "مقارنة السلاسل بالمؤشر", primary: "string compare pointer C" },
                { name: "إيجاد نهاية السلسلة: while(*p++)", primary: "find end string pointer C" },
                { name: "مصفوفة من char* لجدول السلاسل", primary: "array char pointers string table C" },
                { name: "const char* للحماية من التعديل", primary: "const char pointer protection C" },
                { name: "argv: وسيطات البرنامج كسلاسل", primary: "argv main arguments strings C" },
                { name: "تطبيق: دالة strtoupper بالمؤشر", primary: "strtoupper pointer C" }
              ]
            },
            {
              unit_index: 5, code: "1.6.5",
              name: "المؤشرات والدوال",
              goal: "تمرير المؤشرات للدوال لتعديل الأصل والبناء على المرجع بفعالية",
              key_concepts: ["Pass by Pointer","Output Parameters","Swap","Modify Original","Return Pointer"],
              lessons: [
                { name: "تمرير المؤشر: تعديل المتغير الأصلي", primary: "pass pointer modify original C" },
                { name: "المعاملات الإخراجية Output Parameters", primary: "output parameters pointer C" },
                { name: "الإعادة بمؤشر: متى وكيف", primary: "return pointer function C" },
                { name: "تجنب إعادة مؤشر المتغير المحلي", primary: "return local pointer danger C" },
                { name: "نمط swap بالمؤشر", primary: "swap pointer C pattern" },
                { name: "دالة الإرجاع المزدوج بالمؤشرات", primary: "multiple return pointer C" },
                { name: "الدوال المنتجة للخطأ والنتيجة معاً", primary: "error result both pointer C" },
                { name: "const في معاملات المؤشر: API جيد", primary: "const pointer parameter API C" },
                { name: "restrict: تحسين المترجم بالوعد", primary: "restrict keyword optimization C" },
                { name: "تطبيق: مكتبة حسابية بالإخراج بالمؤشر", primary: "math library output pointer C" }
              ]
            },
            {
              unit_index: 6, code: "1.6.6",
              name: "المؤشر NULL والأمان",
              goal: "التعامل الآمن مع NULL وتجنب أخطاء إلغاء مرجعية المؤشر الفارغ",
              key_concepts: ["NULL","Null Check","Defensive Programming","NULL Dereference","Segfault"],
              lessons: [
                { name: "NULL: عنوان لا شيء", primary: "NULL pointer address zero C" },
                { name: "Segmentation Fault: الإعدام الصامت", primary: "segfault null dereference C" },
                { name: "فحص NULL قبل كل إلغاء مرجعية", primary: "null check before dereference C" },
                { name: "إعادة NULL للإشارة للفشل", primary: "return NULL failure C" },
                { name: "البرمجة الدفاعية Defensive Programming", primary: "defensive programming C safety" },
                { name: "المؤشر المتدلي Dangling Pointer", primary: "dangling pointer C" },
                { name: "التصفير بعد free: p = NULL", primary: "set NULL after free C" },
                { name: "أنماط التحقق من NULL الشائعة", primary: "NULL check patterns C" },
                { name: "AddressSanitizer لكشف NULL deref", primary: "asan null dereference C" },
                { name: "تطبيق: API آمن ضد NULL", primary: "null safe API C" }
              ]
            },
            {
              unit_index: 7, code: "1.6.7",
              name: "مصفوفات المؤشرات",
              goal: "بناء واستخدام مصفوفات المؤشرات لإنشاء هياكل بيانات مرنة",
              key_concepts: ["Array of Pointers","String Table","argv","Indirection","Flexible Structures"],
              lessons: [
                { name: "مصفوفة مؤشرات: تعريف وتهيئة", primary: "array pointers C" },
                { name: "مصفوفة مؤشرات للسلاسل النصية", primary: "array char pointers strings C" },
                { name: "argv: المثال الكلاسيكي", primary: "argv array pointers strings C main" },
                { name: "الجدول المفهرس بمؤشرات للبيانات", primary: "indexed table pointers C" },
                { name: "الفرز بإعادة ترتيب المؤشرات", primary: "sort pointers not data C" },
                { name: "مصفوفة دوال: جدول إرسال", primary: "function pointer array dispatch C" },
                { name: "المصفوفة الديناميكية من المؤشرات", primary: "dynamic pointer array C" },
                { name: "تمرير مصفوفة المؤشرات للدالة", primary: "pass pointer array function C" },
                { name: "argc وargv: قراءة وسيطات البرنامج", primary: "argc argv parse C" },
                { name: "تطبيق: برنامج يقبل خيارات سطر الأوامر", primary: "command line arguments parse C" }
              ]
            },
            {
              unit_index: 8, code: "1.6.8",
              name: "المؤشر للمؤشر",
              goal: "فهم الإشارة المزدوجة واستخداماتها في تعديل المؤشرات والمصفوفات الديناميكية",
              key_concepts: ["Double Pointer","Pointer to Pointer","Indirection Level","argv","Dynamic 2D"],
              lessons: [
                { name: "المؤشر للمؤشر: مستويات الإشارة", primary: "pointer to pointer indirection C" },
                { name: "تعريف **: المؤشر المزدوج", primary: "double pointer ** C declaration" },
                { name: "تعديل المؤشر الأصلي عبر **", primary: "modify pointer through double pointer C" },
                { name: "argv كمثال: char**", primary: "argv char double pointer C" },
                { name: "المصفوفة الديناميكية ثنائية البعد بـ **", primary: "dynamic 2D array double pointer C" },
                { name: "نمط تخصيص الذاكرة الديناميكية 2D", primary: "2D dynamic allocation pattern C" },
                { name: "الإشارة الثلاثية: متى تحتاجها", primary: "triple pointer C when need" },
                { name: "قراءة تصريحات المؤشرات المعقدة", primary: "read complex pointer declarations C" },
                { name: "أداة cdecl لقراءة تصريحات C", primary: "cdecl tool read declarations C" },
                { name: "تطبيق: دالة تُعيّن مؤشراً ديناميكياً", primary: "allocate pointer function C" }
              ]
            },
            {
              unit_index: 9, code: "1.6.9",
              name: "تطبيقات المؤشرات الأساسية",
              goal: "تجميع مهارات المؤشرات في برامج حقيقية ومتماسكة",
              key_concepts: ["Linked Structures","Dynamic Array","String Processing","Buffer","Generics"],
              lessons: [
                { name: "المصفوفة الديناميكية: malloc وإعادة التخصيص", primary: "dynamic array malloc realloc C" },
                { name: "بناء سلسلة مترابطة بسيطة", primary: "simple linked list pointer C" },
                { name: "القائمة الديناميكية بالمؤشرات", primary: "dynamic list pointer C" },
                { name: "محرك نص: Buffer وإدارته", primary: "text buffer pointer C" },
                { name: "دوال عامة Generic بـ void*", primary: "generic void pointer C" },
                { name: "تمرير البيانات عبر مؤشر void*", primary: "void pointer pass data C" },
                { name: "Cast لاستعادة النوع الأصلي", primary: "cast void pointer type C" },
                { name: "نمط الهيكل الذاتي المرجع Self-referential", primary: "self referential struct pointer C" },
                { name: "مراجعة: أقوى 10 تطبيقات للمؤشرات", primary: "top pointer applications C review" },
                { name: "تطبيق: متجه ديناميكي مبسط", primary: "dynamic vector C implementation" }
              ]
            }
          ]
        },
        {
          stage_index: 7,
          name: "مشروع المستوى الأول التطبيقي",
          goal: "تطبيق جميع مهارات المستوى الأول في مشاريع C متكاملة قابلة للتوسع",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 20 },
          units: [
            {
              unit_index: 1, code: "1.7.1",
              name: "تصميم البرنامج والهندسة",
              goal: "تعلم تخطيط البرنامج وتصميم هيكله قبل الكتابة",
              key_concepts: ["Program Design","Flowchart","Pseudocode","Modular Design","Top-Down"],
              lessons: [
                { name: "التصميم من القمة للأسفل Top-Down", primary: "top down design C program" },
                { name: "تقسيم المشكلة: الوحدات الكبرى", primary: "problem decomposition modules C" },
                { name: "مخطط التدفق Flowchart قبل الكود", primary: "flowchart before code C" },
                { name: "الكود الكاذب Pseudocode كجسر", primary: "pseudocode bridge C" },
                { name: "تعريف الواجهات بين الوحدات", primary: "interface definition modules C" },
                { name: "التكرار التدريجي: ابنِ وأضف", primary: "incremental build C" },
                { name: "التوثيق قبل الكود وبعده", primary: "documentation before after C" },
                { name: "مراجعة التصميم قبل التنفيذ", primary: "design review C" },
                { name: "تقدير الجهد وإدارة الوقت", primary: "effort estimation time management C" },
                { name: "تطبيق: تصميم نظام إدارة طلاب", primary: "student management system design C" }
              ]
            },
            {
              unit_index: 2, code: "1.7.2",
              name: "قراءة البيانات ومعالجتها",
              goal: "إتقان قراءة البيانات من المستخدم والملفات ومعالجتها",
              key_concepts: ["Data Input","Parsing","Validation","File Input","Structured Data"],
              lessons: [
                { name: "قراءة بيانات منظمة من stdin", primary: "structured input stdin C" },
                { name: "التحقق من صحة كل مدخل", primary: "input validation C robust" },
                { name: "قراءة البيانات من ملف نصي", primary: "read data text file C" },
                { name: "تحليل CSV والبيانات المفصولة", primary: "CSV parse C delimited" },
                { name: "تحويل النصوص لهياكل بيانات", primary: "text to struct C parsing" },
                { name: "معالجة مدخلات غير متوقعة", primary: "handle unexpected input C" },
                { name: "الإدخال المتعدد السطور", primary: "multiline input C" },
                { name: "بناء قائمة بيانات ديناميكية", primary: "dynamic data list C" },
                { name: "تلخيص البيانات وحساب الإحصاءات", primary: "data summary statistics C" },
                { name: "تطبيق: برنامج تحليل درجات الطلاب", primary: "student grades analysis C" }
              ]
            },
            {
              unit_index: 3, code: "1.7.3",
              name: "الخوارزميات الأساسية التطبيقية",
              goal: "تطبيق الخوارزميات الأساسية على بيانات حقيقية بكفاءة",
              key_concepts: ["Sorting","Searching","String Algorithms","Math Algorithms","Efficiency"],
              lessons: [
                { name: "الفرز كجزء من تطبيق أكبر", primary: "sorting application C" },
                { name: "البحث في قاعدة بيانات مبسطة", primary: "search database C" },
                { name: "خوارزمية الأعداد الأولية Primes", primary: "prime numbers sieve C" },
                { name: "خوارزمية GCD وLCM", primary: "GCD LCM Euclidean C" },
                { name: "الخوارزميات الرياضية الأساسية", primary: "basic math algorithms C" },
                { name: "معالجة السلاسل: خوارزميات عملية", primary: "string algorithms C practical" },
                { name: "التشفير البسيط Caesar Cipher", primary: "Caesar cipher C string" },
                { name: "خوارزمية التجزئة البسيطة", primary: "simple hash function C" },
                { name: "تحليل تعقيد خوارزمياتك", primary: "complexity analysis own C" },
                { name: "تطبيق: نظام تشفير وفك تشفير", primary: "encryption decryption C" }
              ]
            },
            {
              unit_index: 4, code: "1.7.4",
              name: "الهياكل struct في التطبيقات",
              goal: "توظيف الهياكل لتمثيل البيانات الحقيقية في تطبيقات عملية",
              key_concepts: ["struct","Records","Data Modeling","Struct Arrays","Nested Structs"],
              lessons: [
                { name: "نمذجة الكيانات الحقيقية بـ struct", primary: "model entities struct C" },
                { name: "مصفوفة من الهياكل: قاعدة بيانات", primary: "array struct database C" },
                { name: "الهياكل المتداخلة للبيانات المعقدة", primary: "nested struct complex C" },
                { name: "فرز مصفوفة الهياكل", primary: "sort struct array C" },
                { name: "البحث في مصفوفة الهياكل", primary: "search struct array C" },
                { name: "إدخال وطباعة الهياكل", primary: "input print struct C" },
                { name: "تهيئة الهياكل: الطريقة الحديثة", primary: "struct initialization designated C" },
                { name: "الهياكل والملفات: حفظ وتحميل", primary: "struct file save load C" },
                { name: "الهيكل كحالة State للبرنامج", primary: "struct program state C" },
                { name: "تطبيق: نظام إدارة مكتبة", primary: "library management struct C" }
              ]
            },
            {
              unit_index: 5, code: "1.7.5",
              name: "معالجة الأخطاء والتحقق",
              goal: "بناء برامج C قوية تعالج الأخطاء بأناقة وأمان",
              key_concepts: ["Error Handling","Return Codes","errno","Assertions","Robust Code"],
              lessons: [
                { name: "فلسفة معالجة الأخطاء في C", primary: "error handling philosophy C" },
                { name: "رموز الإعادة Return Codes", primary: "return codes error C" },
                { name: "errno وperror: أخطاء النظام", primary: "errno perror system errors C" },
                { name: "assert: التحقق في التطوير", primary: "assert debugging C" },
                { name: "نشر الخطأ: من الدالة للمستدعي", primary: "error propagation C" },
                { name: "التنظيف Cleanup عند الخطأ", primary: "cleanup error goto C" },
                { name: "السجل Logging بسيط", primary: "simple logging C" },
                { name: "تصميم API قوي ضد الأخطاء", primary: "robust API error C" },
                { name: "اختبار معالجة الأخطاء", primary: "test error handling C" },
                { name: "تطبيق: برنامج يعالج أخطاء فعلاً", primary: "robust error handling C" }
              ]
            },
            {
              unit_index: 6, code: "1.7.6",
              name: "تنظيم الكود للمشاريع الكبيرة",
              goal: "تنظيم كود C في مشروع متعدد الملفات قابل للصيانة",
              key_concepts: ["Multi-file","Header Files","Modules","Encapsulation","Interface"],
              lessons: [
                { name: "تقسيم المشروع لوحدات .c و.h", primary: "split modules c h C project" },
                { name: "تصميم الواجهة العامة في .h", primary: "public interface header C" },
                { name: "إخفاء التفاصيل في .c", primary: "hide implementation c file C" },
                { name: "حماية التضمين المزدوج", primary: "double include guard C" },
                { name: "التبعيات بين الوحدات", primary: "module dependencies C" },
                { name: "Makefile لمشروع متعدد الوحدات", primary: "Makefile multi module C" },
                { name: "تسمية المتسقة عبر المشروع", primary: "consistent naming C project" },
                { name: "مراجعة الكود الذاتية Code Review", primary: "self code review C" },
                { name: "إدارة الإصدارات بـ git أساسي", primary: "git version control C basic" },
                { name: "تطبيق: إعادة هيكلة مشروع لملفات متعددة", primary: "refactor multi files C project" }
              ]
            },
            {
              unit_index: 7, code: "1.7.7",
              name: "اختبار كود C يدوياً ومنهجياً",
              goal: "بناء إطار اختبار يدوي بسيط وتطبيق اختبار المنهجي لكود C",
              key_concepts: ["Unit Testing","Test Cases","Edge Cases","Assertions","Test Framework"],
              lessons: [
                { name: "لماذا الاختبار جزء لا ينفصل من الكود", primary: "testing essential C code" },
                { name: "بنية الاختبار: ترتيب التنظيم والتنفيذ والتحقق", primary: "test structure arrange act assert C" },
                { name: "إطار اختبار بسيط بـ printf", primary: "simple test framework printf C" },
                { name: "الاختبار الحالات الحدية Edge Cases", primary: "edge cases testing C" },
                { name: "CUnit: إطار اختبار C حقيقي", primary: "CUnit test framework C" },
                { name: "اختبار الدوال المعقدة", primary: "test complex functions C" },
                { name: "اختبار معالجة الأخطاء", primary: "test error handling C" },
                { name: "تغطية الكود Code Coverage", primary: "code coverage gcov C" },
                { name: "الاختبار التراجعي Regression Testing", primary: "regression testing C" },
                { name: "تطبيق: مجموعة اختبار كاملة لمكتبة", primary: "test suite library C" }
              ]
            },
            {
              unit_index: 8, code: "1.7.8",
              name: "الأداء والتحسين الأساسي",
              goal: "قياس أداء البرنامج وتحسينه بطريقة منهجية",
              key_concepts: ["Performance","Profiling","gprof","Optimization","Benchmarking"],
              lessons: [
                { name: "قياس الأداء: clock() وtime()", primary: "performance measure clock C" },
                { name: "gprof: تحليل الأداء الاحترافي", primary: "gprof profiling C" },
                { name: "اكتشاف العنق الزجاجة Bottleneck", primary: "bottleneck find C profiling" },
                { name: "تحسين الخوارزمية أولاً", primary: "algorithm optimization first C" },
                { name: "أعلام تحسين GCC: -O2 -O3", primary: "GCC optimization flags O2 C" },
                { name: "تحسين الذاكرة المخبأة Cache", primary: "cache optimization C memory" },
                { name: "التحسين المبكر: متى يكون خطأً", primary: "premature optimization C" },
                { name: "Benchmarking: قياس دقيق", primary: "benchmarking C accurate" },
                { name: "قراءة إحصاءات GCC المترجم", primary: "GCC statistics C" },
                { name: "تطبيق: تسريع برنامج بطيء 10x", primary: "speedup slow program C 10x" }
              ]
            },
            {
              unit_index: 9, code: "1.7.9",
              name: "المشروع الختامي للمستوى الأول",
              goal: "بناء مشروع C متكامل يجسّد كل مهارات المستوى الأول",
              key_concepts: ["Capstone Project","Integration","Demonstration","Portfolio","Complete System"],
              lessons: [
                { name: "اختيار المشروع الختامي المناسب", primary: "choose capstone project C L1" },
                { name: "المتطلبات والمواصفات التفصيلية", primary: "requirements specification C project" },
                { name: "الهندسة: التصميم الكامل قبل البناء", primary: "architecture design C capstone" },
                { name: "التطوير التدريجي: وحدة وحدة", primary: "incremental development module C" },
                { name: "دمج الوحدات والاختبار التكاملي", primary: "integrate modules test C" },
                { name: "تصحيح الأخطاء المتقدمة", primary: "advanced debugging C" },
                { name: "الأداء والتحسين النهائي", primary: "performance final optimization C" },
                { name: "التوثيق الكامل للمشروع", primary: "full documentation C project" },
                { name: "العرض والمراجعة النقدية", primary: "presentation review C project" },
                { name: "تطبيق: نظام إدارة مكتبة كامل", primary: "complete library system C" }
              ]
            }
          ]
        }
      ]
    },
    {
      level_index: 2,
      name: "C المتقدم والبرمجة النظامية",
      goal: "إتقان إدارة الذاكرة الديناميكية والهياكل المتقدمة والملفات وبنى البيانات والبرمجة النظامية لبناء أنظمة C حقيقية وموثوقة",
      bloom_focus: "create",
      exam: { pass_threshold_percent: 75, time_limit_minutes: 90 },
      stages: [
        {
          stage_index: 1,
          name: "المؤشرات المتقدمة وإدارة الذاكرة",
          goal: "إتقان الذاكرة الديناميكية malloc/free والهياكل المترابطة وكشف تسربات الذاكرة",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.1.1",
              name: "malloc وfree: الذاكرة الديناميكية",
              goal: "إتقان تخصيص الذاكرة الديناميكية وتحريرها بأمان",
              key_concepts: ["malloc","free","Heap","Dynamic Memory","Memory Management"],
              lessons: [
                { name: "لماذا نحتاج الذاكرة الديناميكية", primary: "dynamic memory need C runtime" },
                { name: "malloc: تخصيص كتلة ذاكرة", primary: "malloc allocate memory C" },
                { name: "التحقق من نجاح malloc", primary: "malloc check null C" },
                { name: "free: تحرير الذاكرة المُخصصة", primary: "free memory C" },
                { name: "نمط malloc وfree: الزوج المتلازم", primary: "malloc free pair C" },
                { name: "Heap مقابل Stack: أين تعيش الذاكرة", primary: "heap vs stack memory C" },
                { name: "مصفوفة ديناميكية بـ malloc", primary: "dynamic array malloc C" },
                { name: "إعادة التخصيص realloc", primary: "realloc resize memory C" },
                { name: "نسخة calloc: التخصيص المُصفَّر", primary: "calloc zero malloc C" },
                { name: "تطبيق: متجه ديناميكي مرن", primary: "dynamic vector C" }
              ]
            },
            {
              unit_index: 2, code: "2.1.2",
              name: "تسربات الذاكرة Memory Leaks",
              goal: "التعرف على تسربات الذاكرة وتشخيصها وإصلاحها",
              key_concepts: ["Memory Leak","Valgrind","Leak Detection","RAII","Ownership"],
              lessons: [
                { name: "تسرب الذاكرة: الموت البطيء للبرنامج", primary: "memory leak slow death C" },
                { name: "Valgrind: المحقق الرئيسي", primary: "Valgrind memory leak detection C" },
                { name: "قراءة تقرير Valgrind", primary: "read Valgrind report C" },
                { name: "الأسباب الشائعة لتسرب الذاكرة", primary: "common memory leak causes C" },
                { name: "مسار الملكية Ownership Pattern", primary: "ownership memory C pattern" },
                { name: "من يُحرر الذاكرة: اتفاقية الملكية", primary: "who frees memory C convention" },
                { name: "الخروج المبكر وتسرب الذاكرة", primary: "early return memory leak C" },
                { name: "RAII في C: النمط المحاكي", primary: "RAII C pattern manual" },
                { name: "AddressSanitizer السريع", primary: "AddressSanitizer leak C" },
                { name: "تطبيق: إصلاح برنامج يتسرب", primary: "fix leaking program C" }
              ]
            },
            {
              unit_index: 3, code: "2.1.3",
              name: "المؤشرات للدوال المتقدمة",
              goal: "إتقان مؤشرات الدوال في أنماط متقدمة: Callbacks وPlugin وDispatch Tables",
              key_concepts: ["Callbacks","Dispatch Table","Plugin Pattern","Higher Order","Strategy"],
              lessons: [
                { name: "Callback: الدالة التي تُستدعى لاحقاً", primary: "callback function pointer C" },
                { name: "Context مع Callback: void*", primary: "callback context void pointer C" },
                { name: "جدول الإرسال Dispatch Table", primary: "dispatch table function pointer C" },
                { name: "Strategy Pattern بمؤشرات الدوال", primary: "strategy pattern function pointer C" },
                { name: "Plugin System بمؤشرات الدوال", primary: "plugin system function pointer C" },
                { name: "قائمة المعالجات Handler List", primary: "handler list function pointer C" },
                { name: "مؤشر الدالة في الهيكل: شبه OOP", primary: "function pointer struct OOP C" },
                { name: "المؤشر للدالة المتغيرة varargs", primary: "function pointer variadic C" },
                { name: "أمان النوع مع مؤشرات الدوال", primary: "type safety function pointer C" },
                { name: "تطبيق: نظام أوامر قابل للتوسع", primary: "extensible command system C" }
              ]
            },
            {
              unit_index: 4, code: "2.1.4",
              name: "المؤشرات void* والتعميم",
              goal: "استخدام void* لبناء هياكل بيانات عامة Generic",
              key_concepts: ["void*","Generic","Type Safety","Cast","Generic Containers"],
              lessons: [
                { name: "void*: المؤشر العام بلا نوع", primary: "void pointer generic C" },
                { name: "Cast من وإلى void*", primary: "cast void pointer C" },
                { name: "حجم البيانات بدون معرفة النوع", primary: "size without type void pointer C" },
                { name: "qsort كمثال على الدوال العامة", primary: "qsort generic void pointer C" },
                { name: "حاوية عامة: Stack بـ void*", primary: "generic stack void pointer C" },
                { name: "سلامة النوع Type Safety والمسؤولية", primary: "type safety void pointer C" },
                { name: "memcpy والبيانات بدون نوع", primary: "memcpy typeless data C" },
                { name: "المقارنة بـ Generics في لغات أخرى", primary: "generics comparison C" },
                { name: "الماكرو للتعميم: X-Macros", primary: "X macros generics C" },
                { name: "تطبيق: قائمة مترابطة عامة", primary: "generic linked list void C" }
              ]
            },
            {
              unit_index: 5, code: "2.1.5",
              name: "المؤشرات الثابتة const",
              goal: "إتقان تنويعات const مع المؤشرات لبناء واجهات برمجية محصنة",
              key_concepts: ["const pointer","pointer to const","const correctness","API Design","Immutability"],
              lessons: [
                { name: "const للمؤشر: الأربعة أنواع", primary: "const pointer four types C" },
                { name: "pointer to const: البيانات للقراءة فقط", primary: "pointer to const read only data C" },
                { name: "const pointer: المؤشر لا يتغير", primary: "const pointer immutable address C" },
                { name: "const pointer to const: الكل ثابت", primary: "const pointer const data C" },
                { name: "const في وسيطات الدوال", primary: "const function parameters C" },
                { name: "const correctness: الانضباط الكامل", primary: "const correctness API C" },
                { name: "تجاوز const: cast الخطر", primary: "cast away const danger C" },
                { name: "السلاسل الحرفية و const char*", primary: "string literal const char C" },
                { name: "const في هياكل البيانات", primary: "const struct C immutable" },
                { name: "تطبيق: API مكتبة محصن بـ const", primary: "library API const C" }
              ]
            },
            {
              unit_index: 6, code: "2.1.6",
              name: "أخطاء الذاكرة وكيفية تجنبها",
              goal: "التعرف على فئات أخطاء الذاكرة وكيف يكتشفها Sanitizers",
              key_concepts: ["Use-After-Free","Double-Free","Buffer Overflow","Stack Overflow","Sanitizers"],
              lessons: [
                { name: "Use-After-Free: استخدام الذاكرة المُحررة", primary: "use after free C" },
                { name: "Double-Free: تحرير مرتين", primary: "double free C" },
                { name: "Buffer Overflow: تجاوز حدود المخزن", primary: "buffer overflow C" },
                { name: "Stack Overflow: تعمق المكدس", primary: "stack overflow deep recursion C" },
                { name: "Heap Corruption: تلف كومة الذاكرة", primary: "heap corruption C" },
                { name: "AddressSanitizer -fsanitize=address", primary: "AddressSanitizer ASan C" },
                { name: "MemorySanitizer: التهيئة", primary: "MemorySanitizer MSan C" },
                { name: "Valgrind للكشف الشامل", primary: "Valgrind comprehensive C" },
                { name: "أنماط الكود الآمن لتجنب الأخطاء", primary: "safe code patterns C memory" },
                { name: "تطبيق: تشخيص برنامج معطوب بـ Sanitizers", primary: "diagnose broken C Sanitizers" }
              ]
            },
            {
              unit_index: 7, code: "2.1.7",
              name: "Valgrind والأدوات المتقدمة",
              goal: "إتقان Valgrind وأدوات تحليل الذاكرة للاستخدام اليومي",
              key_concepts: ["Valgrind Memcheck","Callgrind","Massif","Profiling","Memory Analysis"],
              lessons: [
                { name: "Valgrind Memcheck: الفاحص الشامل", primary: "Valgrind memcheck C" },
                { name: "تشغيل Valgrind على برنامجك", primary: "run Valgrind program C" },
                { name: "Callgrind: تحليل الأداء التفصيلي", primary: "Callgrind profiling C" },
                { name: "KCachegrind: تصور نتائج Callgrind", primary: "KCachegrind visualize C" },
                { name: "Massif: تتبع استخدام الذاكرة", primary: "Massif heap usage C" },
                { name: "Helgrind: أخطاء الخيوط", primary: "Helgrind threads C" },
                { name: "تفسير نتائج Valgrind بدقة", primary: "interpret Valgrind results C" },
                { name: "الأخطاء الإيجابية الكاذبة Suppressions", primary: "Valgrind suppressions C" },
                { name: "دمج Valgrind في دورة التطوير", primary: "Valgrind CI workflow C" },
                { name: "تطبيق: تحليل شامل لمشروع كامل", primary: "full project Valgrind analysis C" }
              ]
            },
            {
              unit_index: 8, code: "2.1.8",
              name: "أنماط إدارة الذاكرة الآمنة",
              goal: "تطبيق أنماط مثبتة لإدارة ذاكرة آمنة في مشاريع C الكبيرة",
              key_concepts: ["Memory Pool","Arena Allocator","Reference Counting","Smart Pointer","Ownership"],
              lessons: [
                { name: "Pool Allocator: تخصيص من مجموعة ثابتة", primary: "pool allocator C pattern" },
                { name: "Arena Allocator: تخصيص جماعي", primary: "arena allocator C bump" },
                { name: "تحرير الـ Arena دفعة واحدة", primary: "arena free all once C" },
                { name: "نظام عد المراجع Reference Counting", primary: "reference counting C" },
                { name: "المؤشر الذكي المحاكي في C", primary: "smart pointer C simulation" },
                { name: "نظام ملكية Ownership بسيط", primary: "ownership system C" },
                { name: "المخصص المخصص Custom Allocator", primary: "custom allocator C" },
                { name: "إعادة استخدام الذاكرة: Object Pool", primary: "object pool C reuse" },
                { name: "قياس أداء المخصصات المختلفة", primary: "allocator performance C benchmark" },
                { name: "تطبيق: مخصص ذاكرة لنظام مدمج", primary: "embedded memory allocator C" }
              ]
            },
            {
              unit_index: 9, code: "2.1.9",
              name: "المؤشرات في أنماط البرمجة المتقدمة",
              goal: "توظيف المؤشرات في أنماط برمجية متقدمة تُحاكي OOP في C",
              key_concepts: ["Opaque Pointer","Polymorphism","Interface","Module Pattern","OOP in C"],
              lessons: [
                { name: "المؤشر المبهم Opaque Pointer: إخفاء التفاصيل", primary: "opaque pointer C" },
                { name: "نمط الوحدة Module Pattern", primary: "module pattern C" },
                { name: "تعددية الأشكال بمؤشرات الدوال", primary: "polymorphism function pointers C" },
                { name: "الوراثة المحاكية في C", primary: "inheritance simulation C struct" },
                { name: "الهيكل كواجهة Interface", primary: "struct interface C" },
                { name: "vtable: جدول الدوال الافتراضية", primary: "vtable virtual functions C" },
                { name: "تصميم مكتبة C قابلة للتمديد", primary: "extensible library C design" },
                { name: "PIMPL: فصل التنفيذ عن الواجهة", primary: "PIMPL idiom C" },
                { name: "المقارنة مع C++ للفهم العميق", primary: "C vs C++ OOP comparison" },
                { name: "تطبيق: طبقة رسومات متعددة الأشكال", primary: "graphics layer polymorphism C" }
              ]
            }
          ]
        },
        {
          stage_index: 2,
          name: "الهياكل والاتحادات والتعدادات المتقدمة",
          goal: "إتقان الهياكل المعقدة والاتحادات وحقول البت لتصميم بيانات فعّالة",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.2.1",
              name: "الهياكل struct المتقدمة",
              goal: "بناء هياكل بيانات معقدة ومتداخلة وديناميكية",
              key_concepts: ["Nested Structs","Flexible Array","Self-referential","Struct Methods","Design"],
              lessons: [
                { name: "الهياكل المتداخلة المعقدة", primary: "nested struct complex C" },
                { name: "الهيكل المرجع لنفسه: القائمة والشجرة", primary: "self referential struct C list tree" },
                { name: "مصفوفة مرنة Flexible Array Member", primary: "flexible array member C" },
                { name: "تهيئة الهيكل المُعيَّنة Designated Init", primary: "designated initializer struct C" },
                { name: "نسخ الهياكل: سطحي وعميق", primary: "shallow deep copy struct C" },
                { name: "مقارنة الهياكل: لا == بشكل مباشر", primary: "compare struct C memcmp" },
                { name: "الهياكل والتوافق الثنائي ABI", primary: "struct ABI compatibility C" },
                { name: "الهياكل عبر الملفات المتعددة", primary: "struct cross files C" },
                { name: "تصميم نموذج البيانات Data Model", primary: "data model design struct C" },
                { name: "تطبيق: شجرة بيانات قابلة للتوسع", primary: "extensible data tree struct C" }
              ]
            },
            {
              unit_index: 2, code: "2.2.2",
              name: "الهياكل والمؤشرات الديناميكية",
              goal: "بناء هياكل بيانات ديناميكية متكاملة بالمؤشرات",
              key_concepts: ["Dynamic Struct","Pointer Members","Allocation","Deallocation","Lifecycle"],
              lessons: [
                { name: "الهيكل الديناميكي على الـ Heap", primary: "dynamic struct heap C" },
                { name: "تخصيص الهيكل بـ malloc", primary: "malloc struct C allocate" },
                { name: "تهيئة الهيكل الديناميكي", primary: "initialize dynamic struct C" },
                { name: "حقول المؤشر: تخصيص متداخل", primary: "pointer fields nested allocation C" },
                { name: "تحرير الهيكل: الترتيب الصحيح", primary: "free struct order C" },
                { name: "دالة إنشاء create وحذف destroy", primary: "create destroy struct C" },
                { name: "مصنع الكائنات Factory Pattern", primary: "factory pattern struct C" },
                { name: "إدارة دورة حياة الهيكل", primary: "struct lifecycle C" },
                { name: "اختبار إدارة الذاكرة للهياكل", primary: "test struct memory C" },
                { name: "تطبيق: نظام إدارة موارد ديناميكي", primary: "dynamic resource manager C struct" }
              ]
            },
            {
              unit_index: 3, code: "2.2.3",
              name: "القوائم المترابطة Linked Lists",
              goal: "تصميم وتطبيق القوائم المترابطة المختلفة وعملياتها",
              key_concepts: ["Linked List","Node","Singly Linked","Doubly Linked","Circular"],
              lessons: [
                { name: "مفهوم القائمة المترابطة والعقدة", primary: "linked list node concept C" },
                { name: "القائمة الأحادية: البنية والتنفيذ", primary: "singly linked list C" },
                { name: "إدراج في بداية القائمة", primary: "prepend linked list C" },
                { name: "إدراج في نهاية القائمة", primary: "append linked list C" },
                { name: "حذف عقدة من القائمة", primary: "delete node linked list C" },
                { name: "البحث في القائمة المترابطة", primary: "search linked list C" },
                { name: "عكس القائمة المترابطة", primary: "reverse linked list C" },
                { name: "القائمة المزدوجة Doubly Linked", primary: "doubly linked list C" },
                { name: "القائمة الدائرية Circular", primary: "circular linked list C" },
                { name: "تطبيق: قائمة انتظار بالقائمة المترابطة", primary: "queue linked list C" }
              ]
            },
            {
              unit_index: 4, code: "2.2.4",
              name: "الاتحادات union والاستخدامات",
              goal: "فهم union وتطبيقاته في ترشيد الذاكرة وتفسير البيانات",
              key_concepts: ["union","Memory Sharing","Type Punning","Tagged Union","Variant"],
              lessons: [
                { name: "union: حقول تتشارك الذاكرة", primary: "union shared memory C" },
                { name: "حجم union: الأكبر يفوز", primary: "union size largest C" },
                { name: "استخدام union لتفسير الأنواع", primary: "union type punning C" },
                { name: "الاتحاد الموسوم Tagged Union", primary: "tagged union variant C" },
                { name: "union مع struct لبيانات مرنة", primary: "union struct flexible C" },
                { name: "بروتوكولات الشبكة وunion", primary: "network protocol union C" },
                { name: "تفسير float كـ int بـ union", primary: "float int union C IEEE" },
                { name: "Endianness وunion", primary: "endianness union C detect" },
                { name: "متى تستخدم union بأمان", primary: "union safe use C" },
                { name: "تطبيق: نوع متغير Variant بـ union", primary: "variant type union C" }
              ]
            },
            {
              unit_index: 5, code: "2.2.5",
              name: "حقول البت Bit Fields",
              goal: "استخدام حقول البت لتمثيل البيانات المضغوطة والأعلام",
              key_concepts: ["Bit Fields","Flags","Compact Storage","Hardware Registers","Bitwise Ops"],
              lessons: [
                { name: "حقول البت: تعريف واستخدام", primary: "bit fields C struct" },
                { name: "الأعلام Flags بحقول البت", primary: "bit fields flags C" },
                { name: "سجلات الأجهزة Hardware Registers", primary: "hardware registers bit fields C" },
                { name: "حجم الهيكل مع حقول البت", primary: "struct size bit fields C" },
                { name: "ترتيب البت: البداية من MSB أو LSB", primary: "bit order MSB LSB C" },
                { name: "عمليات البت على الأعلام", primary: "bitwise operations flags C" },
                { name: "ماكرو أعلام البت: SET GET CLEAR", primary: "bit flag macros C" },
                { name: "حقول البت مقابل unsigned int", primary: "bit fields vs unsigned C" },
                { name: "محدودية حقول البت: الحمولة والتحمل", primary: "bit fields limits portability C" },
                { name: "تطبيق: تمثيل ضغوط بروتوكول إدخال", primary: "protocol packet bit fields C" }
              ]
            },
            {
              unit_index: 6, code: "2.2.6",
              name: "المكدس Stack والطابور Queue",
              goal: "تطبيق هياكل بيانات المكدس والطابور بطرق متعددة",
              key_concepts: ["Stack","Queue","LIFO","FIFO","Circular Buffer"],
              lessons: [
                { name: "المكدس: LIFO وتطبيقاته", primary: "stack LIFO C" },
                { name: "تطبيق المكدس بالمصفوفة", primary: "stack array C" },
                { name: "تطبيق المكدس بالقائمة المترابطة", primary: "stack linked list C" },
                { name: "الطابور: FIFO وتطبيقاته", primary: "queue FIFO C" },
                { name: "تطبيق الطابور بالمصفوفة الدائرية", primary: "circular buffer queue C" },
                { name: "تطبيق الطابور بالقائمة المترابطة", primary: "queue linked list C" },
                { name: "الطابور الأولوي Priority Queue", primary: "priority queue C" },
                { name: "الطابور المزدوج Deque", primary: "deque double ended queue C" },
                { name: "تطبيقات حقيقية: تحليل التعبيرات", primary: "stack expression evaluation C" },
                { name: "تطبيق: محاكي طابور خدمة عملاء", primary: "service queue simulation C" }
              ]
            },
            {
              unit_index: 7, code: "2.2.7",
              name: "الأشجار الثنائية Binary Trees",
              goal: "تصميم وتطبيق الأشجار الثنائية وعمليات الاجتياز",
              key_concepts: ["Binary Tree","BST","Traversal","Height","Balanced"],
              lessons: [
                { name: "مفهوم الشجرة الثنائية والعقدة", primary: "binary tree node C" },
                { name: "شجرة البحث الثنائية BST", primary: "BST binary search tree C" },
                { name: "إدراج في BST", primary: "BST insert C" },
                { name: "البحث في BST", primary: "BST search C" },
                { name: "اجتياز: في الترتيب In-order", primary: "inorder traversal BST C" },
                { name: "اجتياز: قبل الترتيب Pre-order", primary: "preorder traversal C" },
                { name: "اجتياز: بعد الترتيب Post-order", primary: "postorder traversal C" },
                { name: "حذف من BST: الأصعب", primary: "BST delete node C" },
                { name: "ارتفاع الشجرة والتوازن", primary: "tree height balance C" },
                { name: "تطبيق: قاموس بـ BST", primary: "dictionary BST C" }
              ]
            },
            {
              unit_index: 8, code: "2.2.8",
              name: "جداول التجزئة Hash Tables",
              goal: "تصميم وتطبيق جداول التجزئة للبحث بـ O(1)",
              key_concepts: ["Hash Table","Hash Function","Collision","Chaining","Open Addressing"],
              lessons: [
                { name: "مفهوم التجزئة والجدول", primary: "hash table concept C" },
                { name: "دالة التجزئة: الجودة والتوزيع", primary: "hash function quality C" },
                { name: "التصادم Collision: لا مفر منه", primary: "collision hash table C" },
                { name: "معالجة التصادم بالسلاسل Chaining", primary: "chaining collision C" },
                { name: "معالجة بالعنونة المفتوحة Open Addressing", primary: "open addressing C" },
                { name: "عامل الحمل Load Factor وإعادة التجزئة", primary: "load factor rehash C" },
                { name: "دوال التجزئة الشائعة: djb2 وFNV", primary: "hash functions djb2 FNV C" },
                { name: "جدول التجزئة العام بـ void*", primary: "generic hash table void C" },
                { name: "قياس أداء جدول التجزئة", primary: "hash table performance C" },
                { name: "تطبيق: قاموس String-Value بالتجزئة", primary: "string dictionary hash C" }
              ]
            },
            {
              unit_index: 9, code: "2.2.9",
              name: "تحليل تعقيد الخوارزميات",
              goal: "تحليل تعقيد الخوارزميات وهياكل البيانات اختياراً وتصميماً",
              key_concepts: ["Big O","Time Complexity","Space Complexity","Analysis","Trade-offs"],
              lessons: [
                { name: "Big O: لغة وصف الكفاءة", primary: "big O notation complexity C" },
                { name: "O(1) و O(log n) و O(n) و O(n²)", primary: "complexity orders C" },
                { name: "تحليل الحلقات والتكرار الذاتي", primary: "analyze loops recursion complexity C" },
                { name: "تعقيد الفضاء Space Complexity", primary: "space complexity C" },
                { name: "أسوأ/أفضل/متوسط الحالات", primary: "worst best average case C" },
                { name: "القياس العملي مقابل النظري", primary: "practical vs theoretical C" },
                { name: "المقايضات: الوقت مقابل الذاكرة", primary: "time space tradeoff C" },
                { name: "اختيار هيكل البيانات بناءً على التعقيد", primary: "choose data structure complexity C" },
                { name: "تحسين الخوارزمية بتغيير الهيكل", primary: "algorithm improvement structure C" },
                { name: "تطبيق: مقارنة تطبيقات بنى بيانات", primary: "compare data structures C benchmark" }
              ]
            }
          ]
        },
        {
          stage_index: 3,
          name: "الملفات وعمليات الإدخال والإخراج",
          goal: "إتقان معالجة الملفات بكل أشكالها من النصية للثنائية والوصول العشوائي",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.3.1",
              name: "فتح وإغلاق الملفات",
              goal: "إتقان fopen وfclose وأوضاع الفتح المختلفة",
              key_concepts: ["fopen","fclose","FILE","Modes","Error Checking"],
              lessons: [
                { name: "FILE*: التمثيل المنطقي للملف", primary: "FILE pointer stream C" },
                { name: "fopen: الأوضاع r w a r+ w+ a+", primary: "fopen modes C" },
                { name: "التحقق من نجاح fopen", primary: "fopen check NULL C" },
                { name: "fclose: الإغلاق الإلزامي", primary: "fclose close file C" },
                { name: "الموارد الثلاثة المفتوحة دائماً: stdin stdout stderr", primary: "stdin stdout stderr C" },
                { name: "ferror وfeof: حالة الملف", primary: "ferror feof file state C" },
                { name: "clearerr: مسح علامة الخطأ", primary: "clearerr file error C" },
                { name: "الملفات المؤقتة tmpfile وtmpnam", primary: "tmpfile tmpnam C" },
                { name: "أوضاع النص والثنائي: t و b", primary: "text binary mode C" },
                { name: "تطبيق: برنامج إحصاء أسطر الملف", primary: "count lines file C" }
              ]
            },
            {
              unit_index: 2, code: "2.3.2",
              name: "القراءة والكتابة النصية",
              goal: "إتقان دوال القراءة والكتابة النصية بكفاءة وأمان",
              key_concepts: ["fprintf","fscanf","fgets","fputs","fputc"],
              lessons: [
                { name: "fprintf: كتابة منسقة للملف", primary: "fprintf formatted write C" },
                { name: "fscanf: قراءة منسقة من الملف", primary: "fscanf formatted read C" },
                { name: "fgets: قراءة سطر آمنة", primary: "fgets safe line read C" },
                { name: "fputs: كتابة نص بلا تنسيق", primary: "fputs write string file C" },
                { name: "fputc وfgetc: حرف بحرف", primary: "fputc fgetc char C" },
                { name: "قراءة ملف سطراً بسطر", primary: "read file line by line C" },
                { name: "كتابة ملف CSV", primary: "write CSV file C" },
                { name: "قراءة ملف CSV", primary: "read CSV parse C" },
                { name: "الترميز UTF-8 في الملفات النصية", primary: "UTF-8 file C" },
                { name: "تطبيق: نسخ وتحويل ملف نصي", primary: "copy transform text file C" }
              ]
            },
            {
              unit_index: 3, code: "2.3.3",
              name: "القراءة والكتابة الثنائية",
              goal: "التعامل مع الملفات الثنائية لتخزين وقراءة البيانات الهيكلية",
              key_concepts: ["fread","fwrite","Binary Files","Struct Serialization","Portability"],
              lessons: [
                { name: "الملفات الثنائية مقابل النصية", primary: "binary vs text files C" },
                { name: "fwrite: كتابة بيانات خام", primary: "fwrite binary write C" },
                { name: "fread: قراءة بيانات خام", primary: "fread binary read C" },
                { name: "حفظ هيكل struct في ملف ثنائي", primary: "write struct binary file C" },
                { name: "تحميل هيكل struct من ملف ثنائي", primary: "read struct binary file C" },
                { name: "Endianness في الملفات الثنائية", primary: "endianness binary file C" },
                { name: "التحمل Portability لأشكال البيانات", primary: "binary portability C" },
                { name: "التسلسل الآمن Serialization", primary: "serialization C safe" },
                { name: "فحص تكامل البيانات: Checksum", primary: "checksum binary C" },
                { name: "تطبيق: قاعدة بيانات ثنائية بسيطة", primary: "binary database file C" }
              ]
            },
            {
              unit_index: 4, code: "2.3.4",
              name: "التنقل في الملف والوصول العشوائي",
              goal: "إتقان الوصول العشوائي للملفات بـ fseek وftell وrewind",
              key_concepts: ["fseek","ftell","rewind","SEEK_SET","Random Access"],
              lessons: [
                { name: "الوصول التسلسلي مقابل العشوائي", primary: "sequential vs random access C" },
                { name: "fseek: التحرك في الملف", primary: "fseek seek position C" },
                { name: "SEEK_SET وSEEK_CUR وSEEK_END", primary: "seek origins C" },
                { name: "ftell: موقعي الحالي في الملف", primary: "ftell current position C" },
                { name: "rewind: العودة للبداية", primary: "rewind file C" },
                { name: "حساب حجم الملف بـ fseek وftell", primary: "file size fseek ftell C" },
                { name: "تعديل سجل محدد في قاعدة البيانات", primary: "modify record fseek C" },
                { name: "فهرسة الملفات الكبيرة", primary: "file indexing C" },
                { name: "الوصول المتوازي للملف", primary: "concurrent file access C" },
                { name: "تطبيق: محرر سجلات بقاعدة ثنائية", primary: "record editor binary file C" }
              ]
            },
            {
              unit_index: 5, code: "2.3.5",
              name: "التخزين المؤقت للملفات والأداء",
              goal: "فهم آليات التخزين المؤقت لتحسين أداء عمليات الملفات",
              key_concepts: ["Buffering","setvbuf","fflush","Block Size","Performance"],
              lessons: [
                { name: "التخزين المؤقت: لماذا يعجّل الكتابة", primary: "file buffering speed C" },
                { name: "أنواع التخزين المؤقت: كتلي وسطري وبلا", primary: "buffer types C" },
                { name: "fflush: إفراغ المخزن المؤقت", primary: "fflush flush buffer C" },
                { name: "setvbuf: التحكم في المخزن", primary: "setvbuf control buffer C" },
                { name: "الكتابة الكبيرة مقابل الصغيرة", primary: "large vs small writes C" },
                { name: "read() وwrite() على مستوى النظام", primary: "read write system call C" },
                { name: "أداء الملفات: قياس وتحسين", primary: "file performance optimize C" },
                { name: "الوصول المُتوقع: mmap للملفات الكبيرة", primary: "mmap memory mapped file C" },
                { name: "مخرج المعياري وتزامنه", primary: "stdout sync C" },
                { name: "تطبيق: نسخ سريع لملف ضخم", primary: "fast file copy large C" }
              ]
            },
            {
              unit_index: 6, code: "2.3.6",
              name: "معالجة الأخطاء في الملفات",
              goal: "بناء برامج قوية تتعامل بأمان مع أخطاء الملفات",
              key_concepts: ["ferror","errno","Error Recovery","Resource Cleanup","Robust Code"],
              lessons: [
                { name: "أسباب فشل عمليات الملفات", primary: "file operation failure reasons C" },
                { name: "errno وفشل fopen", primary: "errno fopen failure C" },
                { name: "strerror: نص رسالة الخطأ", primary: "strerror error message C" },
                { name: "perror: طباعة الخطأ التلقائية", primary: "perror print error C" },
                { name: "نمط التنظيف عند الخطأ", primary: "cleanup on error file C" },
                { name: "الخطأ القابل للاسترداد وغير القابل", primary: "recoverable error file C" },
                { name: "قطع التيار: الملفات المجزأة", primary: "partial file write C" },
                { name: "الكتابة الذرية: الكتابة الآمنة", primary: "atomic write file C" },
                { name: "التحقق من الملف: الوجود والأذونات", primary: "file exists permissions C" },
                { name: "تطبيق: برنامج تحميل متين مع استرداد", primary: "robust download recovery C" }
              ]
            },
            {
              unit_index: 7, code: "2.3.7",
              name: "معالجة الأسماء والمسارات",
              goal: "التعامل مع مسارات الملفات وعمليات نظام الملفات",
              key_concepts: ["Path","dirent.h","stat","mkdir","Filesystem"],
              lessons: [
                { name: "مسارات الملفات: مطلق ونسبي", primary: "file path absolute relative C" },
                { name: "stat: معلومات ملف النظام", primary: "stat file info C" },
                { name: "فحص وجود الملف ونوعه", primary: "file exists type check C" },
                { name: "opendir وreaddir لقراءة المجلد", primary: "opendir readdir directory C" },
                { name: "mkdir وrmdir لإدارة المجلدات", primary: "mkdir rmdir directory C" },
                { name: "rename وremove للملفات", primary: "rename remove file C" },
                { name: "glob: مطابقة أنماط الملفات", primary: "glob pattern match files C" },
                { name: "realpath: المسار المطلق الحقيقي", primary: "realpath absolute C" },
                { name: "nftw: تصفح شجرة المجلدات", primary: "nftw directory tree walk C" },
                { name: "تطبيق: أداة بحث في الملفات", primary: "file search tool C" }
              ]
            },
            {
              unit_index: 8, code: "2.3.8",
              name: "التسلسل وإلغاء التسلسل",
              goal: "تصميم تنسيقات بيانات قابلة للتسلسل ومتوافقة عبر الأنظمة",
              key_concepts: ["Serialization","Deserialization","Protocol","JSON-like","Portability"],
              lessons: [
                { name: "مفهوم التسلسل وأهميته", primary: "serialization concept C" },
                { name: "تنسيق نصي بسيط للبيانات", primary: "text format data C" },
                { name: "تنسيق ثنائي مضغوط", primary: "binary compact format C" },
                { name: "معالجة الإصدارات Version Handling", primary: "version handling serialization C" },
                { name: "تنسيق ذاتي الوصف Self-describing", primary: "self describing format C" },
                { name: "تحليل JSON بسيط يدوياً", primary: "simple JSON parser C manual" },
                { name: "تحليل XML بسيط يدوياً", primary: "simple XML parser C manual" },
                { name: "MessagePack: ثنائي فعّال", primary: "MessagePack binary efficient C" },
                { name: "التوافق عبر الأنظمة", primary: "cross platform compatibility C" },
                { name: "تطبيق: بروتوكول تواصل بسيط", primary: "communication protocol C" }
              ]
            },
            {
              unit_index: 9, code: "2.3.9",
              name: "الإدخال/الإخراج منخفض المستوى",
              goal: "فهم read() وwrite() وopen() لمستوى نظام التشغيل",
              key_concepts: ["open()","read()","write()","File Descriptors","POSIX IO"],
              lessons: [
                { name: "واصفات الملفات File Descriptors", primary: "file descriptors C POSIX" },
                { name: "open(): فتح على مستوى النظام", primary: "open system call C" },
                { name: "read(): قراءة المستوى المنخفض", primary: "read syscall C" },
                { name: "write(): كتابة المستوى المنخفض", primary: "write syscall C" },
                { name: "close(): إغلاق واصف الملف", primary: "close file descriptor C" },
                { name: "الفرق بين stdio وPOSIX IO", primary: "stdio vs POSIX IO C" },
                { name: "dup وdup2: تكرار واصفات الملفات", primary: "dup dup2 file descriptor C" },
                { name: "O_NONBLOCK: الإدخال غير المحجوب", primary: "nonblock IO C" },
                { name: "poll وselect: I/O Multiplexing أساسي", primary: "select poll IO multiplexing C" },
                { name: "تطبيق: خادم سطح أوامر بسيط", primary: "simple shell server C IO" }
              ]
            }
          ]
        },
        {
          stage_index: 4,
          name: "البنى البيانية المتقدمة والخوارزميات",
          goal: "تصميم وتطبيق بنى بيانات متقدمة وخوارزميات كفوءة في C",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 60 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.4.1",
              name: "الكومة Heap وخوارزمية الترتيب",
              goal: "فهم هيكل الكومة وتطبيقه لترتيب البيانات والطابور الأولوي",
              key_concepts: ["Heap","Max Heap","Min Heap","Heapify","Priority Queue"],
              lessons: [
                { name: "مفهوم الكومة والشجرة الثنائية الكاملة", primary: "heap complete binary tree C" },
                { name: "Max Heap: الأب دائماً أكبر", primary: "max heap property C" },
                { name: "Heapify: بناء الكومة", primary: "heapify build heap C" },
                { name: "إدراج في الكومة: Sift Up", primary: "heap insert sift up C" },
                { name: "استخراج الأقصى: Sift Down", primary: "extract max heap sift down C" },
                { name: "Heap Sort: O(n log n)", primary: "heap sort C algorithm" },
                { name: "طابور الأولوية بالكومة", primary: "priority queue heap C" },
                { name: "Dijkstra بطابور الأولوية", primary: "Dijkstra priority queue C" },
                { name: "المقارنة: Heap Sort vs Quick Sort", primary: "heap sort vs quick sort C" },
                { name: "تطبيق: مُجدول مهام بالأولوية", primary: "task scheduler priority C" }
              ]
            },
            {
              unit_index: 2, code: "2.4.2",
              name: "Quick Sort وMerge Sort المتقدمان",
              goal: "إتقان Quick Sort وMerge Sort وتحليل أدائهما",
              key_concepts: ["Quick Sort","Merge Sort","Partition","Divide Conquer","Stability"],
              lessons: [
                { name: "Quick Sort: أسرع في الواقع", primary: "quick sort C" },
                { name: "اختيار المحور Pivot: أهميته", primary: "pivot selection quick sort C" },
                { name: "التقسيم Partition بـ Lomuto وHoare", primary: "partition Lomuto Hoare C" },
                { name: "Quick Sort التكراري والتكرار الذاتي", primary: "quick sort iterative recursive C" },
                { name: "Merge Sort: ضمان O(n log n)", primary: "merge sort C guarantee" },
                { name: "الدمج Merge: القلب الحقيقي", primary: "merge step merge sort C" },
                { name: "Merge Sort الخارجي External Sort", primary: "external merge sort C large" },
                { name: "Tim Sort: الأفضل عملياً", primary: "timsort C practical" },
                { name: "متى تختار أياً منهما", primary: "choose sort algorithm C" },
                { name: "تطبيق: فرز بيانات ضخمة بكفاءة", primary: "efficient large data sort C" }
              ]
            },
            {
              unit_index: 3, code: "2.4.3",
              name: "خوارزميات البحث المتقدمة",
              goal: "تطبيق خوارزميات بحث متقدمة وفهم متطلبات كل منها",
              key_concepts: ["Interpolation Search","Exponential Search","Ternary Search","Graph Search"],
              lessons: [
                { name: "البحث بالاستيفاء Interpolation Search", primary: "interpolation search C" },
                { name: "البحث الأسي Exponential Search", primary: "exponential search C" },
                { name: "البحث الثلاثي Ternary Search", primary: "ternary search C" },
                { name: "BFS: البحث أفضلية الاتساع", primary: "BFS breadth first search C" },
                { name: "DFS: البحث أفضلية العمق", primary: "DFS depth first search C" },
                { name: "A*: البحث الموجّه بالتقدير", primary: "A star search C" },
                { name: "البحث في النصوص: KMP", primary: "KMP string search C" },
                { name: "Boyer-Moore للنصوص", primary: "Boyer Moore string search C" },
                { name: "الفهرسة لتسريع البحث", primary: "indexing fast search C" },
                { name: "تطبيق: محرك بحث نصي بسيط", primary: "text search engine C" }
              ]
            },
            {
              unit_index: 4, code: "2.4.4",
              name: "الرسوم البيانية Graphs",
              goal: "تمثيل الرسوم البيانية في C وتطبيق خوارزميات الاجتياز",
              key_concepts: ["Graph","Adjacency Matrix","Adjacency List","BFS","DFS"],
              lessons: [
                { name: "الرسم البياني: قمم وأحرف", primary: "graph vertices edges C" },
                { name: "تمثيل مصفوفة التجاور", primary: "adjacency matrix C" },
                { name: "تمثيل قوائم التجاور", primary: "adjacency list C" },
                { name: "BFS للرسم البياني", primary: "BFS graph C" },
                { name: "DFS للرسم البياني", primary: "DFS graph C" },
                { name: "كشف الدورات Cycle Detection", primary: "cycle detection graph C" },
                { name: "الترتيب الطوبولوجي Topological Sort", primary: "topological sort C" },
                { name: "Dijkstra: أقصر مسار", primary: "Dijkstra shortest path C" },
                { name: "MST: شجرة الامتداد الصغرى", primary: "minimum spanning tree C" },
                { name: "تطبيق: نظام توصيات بالرسم", primary: "recommendation graph C" }
              ]
            },
            {
              unit_index: 5, code: "2.4.5",
              name: "البرمجة الديناميكية Dynamic Programming",
              goal: "تطبيق البرمجة الديناميكية لحل مسائل التحسين",
              key_concepts: ["DP","Memoization","Tabulation","Overlapping Subproblems","Optimal"],
              lessons: [
                { name: "مفهوم البرمجة الديناميكية", primary: "dynamic programming concept C" },
                { name: "Fibonacci: من O(2^n) لـ O(n)", primary: "fibonacci dp memoization C" },
                { name: "الحقيبة Knapsack Problem", primary: "knapsack dynamic programming C" },
                { name: "أطول تسلسل مشترك LCS", primary: "LCS longest common subsequence C" },
                { name: "مسافة Levenshtein للنصوص", primary: "edit distance Levenshtein C" },
                { name: "الحفظ Memoization مقابل الجدولة Tabulation", primary: "memoization tabulation DP C" },
                { name: "Coin Change: صرف العملات", primary: "coin change DP C" },
                { name: "تحسين المسافة: الحل الواحد", primary: "DP space optimization C" },
                { name: "تشخيص المسائل القابلة لـ DP", primary: "identify DP problems C" },
                { name: "تطبيق: تحسين جدول إنتاج", primary: "production schedule DP C" }
              ]
            },
            {
              unit_index: 6, code: "2.4.6",
              name: "أشجار AVL والأشجار المتوازنة",
              goal: "فهم وتطبيق الأشجار المتوازنة ذاتياً",
              key_concepts: ["AVL Tree","Rotation","Balance Factor","Red-Black","B-Tree"],
              lessons: [
                { name: "مشكلة الشجرة غير المتوازنة", primary: "unbalanced tree problem C" },
                { name: "شجرة AVL: التوازن الذاتي", primary: "AVL tree self balancing C" },
                { name: "الدوران الأيمن Right Rotation", primary: "right rotation AVL C" },
                { name: "الدوران الأيسر Left Rotation", primary: "left rotation AVL C" },
                { name: "الدوران المزدوج LL وRL", primary: "double rotation AVL C" },
                { name: "إدراج مع إعادة التوازن في AVL", primary: "AVL insert rebalance C" },
                { name: "شجرة الأحمر-الأسود Red-Black", primary: "red black tree C concept" },
                { name: "B-Tree: للأقراص والقواعد", primary: "B tree disk database C" },
                { name: "Splay Tree: التكيّف الذاتي", primary: "splay tree self adjusting C" },
                { name: "تطبيق: فهرس قاعدة بيانات B-Tree", primary: "database index B-tree C" }
              ]
            },
            {
              unit_index: 7, code: "2.4.7",
              name: "الخوارزميات الجشعة Greedy",
              goal: "تطبيق الخوارزميات الجشعة وتحديد مدى صلاحيتها",
              key_concepts: ["Greedy","Optimal Substructure","Local Optimal","Exchange Argument","Proof"],
              lessons: [
                { name: "مفهوم الخوارزمية الجشعة", primary: "greedy algorithm concept C" },
                { name: "Huffman Coding: الضغط الأمثل", primary: "Huffman coding greedy C" },
                { name: "مسألة الجدولة Activity Selection", primary: "activity selection greedy C" },
                { name: "Kruskal: MST بالجشع", primary: "Kruskal MST greedy C" },
                { name: "Prim: MST بديل الجشع", primary: "Prim MST greedy C" },
                { name: "مسألة المبّرد Fractional Knapsack", primary: "fractional knapsack greedy C" },
                { name: "إثبات الصحة: أين يفشل الجشع", primary: "greedy proof failure C" },
                { name: "الجشع مقابل DP: متى أيهما", primary: "greedy vs DP C" },
                { name: "تطبيق الجشع في الأنظمة الحقيقية", primary: "greedy real systems C" },
                { name: "تطبيق: ضاغط ملفات Huffman", primary: "Huffman compressor C" }
              ]
            },
            {
              unit_index: 8, code: "2.4.8",
              name: "خوارزميات السلاسل النصية المتقدمة",
              goal: "تطبيق خوارزميات متقدمة لمعالجة النصوص والبحث فيها",
              key_concepts: ["KMP","Rabin-Karp","Suffix Array","Trie","String Hashing"],
              lessons: [
                { name: "KMP: البحث الخطي في النص", primary: "KMP search C linear" },
                { name: "Rabin-Karp: البحث بالتجزئة", primary: "Rabin Karp hash C" },
                { name: "بناء Trie للقاموس", primary: "Trie dictionary C" },
                { name: "البحث في Trie", primary: "Trie search C" },
                { name: "الإكمال التلقائي بالـ Trie", primary: "autocomplete Trie C" },
                { name: "Suffix Array لمسائل النصوص", primary: "suffix array C" },
                { name: "تجزئة السلاسل Polynomial Hashing", primary: "polynomial string hashing C" },
                { name: "المقارنة النصية الضبابية Fuzzy", primary: "fuzzy string match C" },
                { name: "Regular Expressions بسيطة يدوياً", primary: "regex simple C" },
                { name: "تطبيق: محرك بحث نصي فعّال", primary: "efficient text search C" }
              ]
            },
            {
              unit_index: 9, code: "2.4.9",
              name: "تطبيق بنية بيانات متكاملة",
              goal: "تصميم وبناء بنية بيانات متكاملة وموثقة وقابلة للإعادة",
              key_concepts: ["Library Design","Generic Container","Testing","Documentation","API"],
              lessons: [
                { name: "تصميم واجهة مكتبة بنى البيانات", primary: "data structure library API C" },
                { name: "مكتبة عامة Generic بـ void*", primary: "generic library void C" },
                { name: "مكتبة قائمة مترابطة كاملة", primary: "complete linked list library C" },
                { name: "مكتبة جدول تجزئة كامل", primary: "complete hash table library C" },
                { name: "مكتبة شجرة ثنائية كاملة", primary: "complete binary tree library C" },
                { name: "اختبار المكتبة: CUnit وAssertions", primary: "test library C" },
                { name: "توثيق Doxygen للمكتبة", primary: "Doxygen library documentation C" },
                { name: "توزيع المكتبة كـ .a و.so", primary: "distribute library C" },
                { name: "إصدارات المكتبة ومتطلباتها", primary: "library versioning C" },
                { name: "تطبيق: مكتبة حاويات عامة كاملة", primary: "generic containers library C" }
              ]
            }
          ]
        },
        {
          stage_index: 5,
          name: "المعالج الأولي المتقدم والمكتبات",
          goal: "إتقان الماكرو المتقدم وبناء المكتبات الساكنة والديناميكية وإدارة المشاريع الكبيرة",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.5.1",
              name: "الماكرو المتقدم وX-Macros",
              goal: "كتابة ماكرو متقدم آمن وقوي لتوليد الكود",
              key_concepts: ["Function Macros","do-while Macro","Stringification","X-Macros","Generic"],
              lessons: [
                { name: "الماكرو الدالة: القوة والخطر", primary: "function-like macro power danger C" },
                { name: "نمط do { } while(0) للأمان", primary: "do while zero macro safety C" },
                { name: "## للتسلسل و# للتحويل لنص", primary: "token paste stringify macro C" },
                { name: "الماكرو متعدد الأسطر الآمن", primary: "multi-line safe macro C" },
                { name: "X-Macros: توليد كود تكراري", primary: "X macros code generation C" },
                { name: "الماكرو العام لأنواع متعددة", primary: "generic macro types C" },
                { name: "Generic في C11: _Generic", primary: "_Generic C11 type selection" },
                { name: "الماكرو والتصحيح: المشكلة", primary: "macro debugging difficulty C" },
                { name: "متى تستخدم الماكرو ومتى تتجنبه", primary: "when use macro avoid C" },
                { name: "تطبيق: ماكرو logging متقدم", primary: "logging macro advanced C" }
              ]
            },
            {
              unit_index: 2, code: "2.5.2",
              name: "التجميع الشرطي والتهيئة",
              goal: "إتقان التجميع الشرطي لبناء كود متعدد المنصات والإصدارات",
              key_concepts: ["ifdef","ifndef","if defined","Conditional Compilation","Feature Flags"],
              lessons: [
                { name: "#ifdef /#ifndef : الشرط في التجميع", primary: "ifdef ifndef conditional C" },
                { name: "#if defined و#elif", primary: "if defined elif C" },
                { name: "كشف المنصة: Windows وLinux وMac", primary: "platform detection C macro" },
                { name: "كشف المترجم: GCC وClang وMSVC", primary: "compiler detection C macro" },
                { name: "إصدارات C: C89 C99 C11 C17", primary: "C version detection macro" },
                { name: "أعلام الميزات Feature Flags", primary: "feature flags conditional C" },
                { name: "تصحيح المعالج: #pragma message", primary: "pragma message debug C" },
                { name: "#pragma once مقابل Header Guards", primary: "pragma once vs guards C" },
                { name: "كود متعدد المنصات بالتجميع الشرطي", primary: "cross platform conditional C" },
                { name: "تطبيق: مكتبة تدعم Windows وLinux", primary: "cross platform library C" }
              ]
            },
            {
              unit_index: 3, code: "2.5.3",
              name: "بناء المكتبات الساكنة",
              goal: "بناء وتوزيع مكتبات C ساكنة قابلة للإعادة في مشاريع مختلفة",
              key_concepts: ["Static Library","ar","Archive","Header","Linking"],
              lessons: [
                { name: "المكتبة الساكنة: ما هي وكيف تعمل", primary: "static library C concept" },
                { name: "تجميع ملفات .o", primary: "compile object files static C" },
                { name: "ar: إنشاء أرشيف .a", primary: "ar create archive static C" },
                { name: "تصميم ترويسة المكتبة العامة", primary: "library header design C" },
                { name: "ربط المكتبة الساكنة بالمشروع", primary: "link static library C" },
                { name: "nm وar لفحص المكتبة", primary: "nm ar inspect library C" },
                { name: "cmake لبناء مكتبة ساكنة", primary: "cmake static library C" },
                { name: "توزيع المكتبة: .a و.h", primary: "distribute static library C" },
                { name: "مشكلة تكرار الرموز", primary: "symbol duplication static C" },
                { name: "تطبيق: مكتبة رياضيات ساكنة", primary: "math static library C" }
              ]
            },
            {
              unit_index: 4, code: "2.5.4",
              name: "بناء المكتبات الديناميكية",
              goal: "بناء وتحميل المكتبات الديناميكية .so و.dll",
              key_concepts: ["Shared Library","dlopen","dlsym","PIC","LD_LIBRARY_PATH"],
              lessons: [
                { name: "المكتبة الديناميكية: الفوائد والفرق", primary: "shared library dynamic C" },
                { name: "PIC: كود مستقل الموضع", primary: "position independent code PIC C" },
                { name: "بناء .so على Linux", primary: "build shared library Linux C" },
                { name: "بناء .dll على Windows", primary: "build DLL Windows C" },
                { name: "dlopen: تحميل المكتبة في وقت التشغيل", primary: "dlopen runtime load C" },
                { name: "dlsym: البحث عن الرمز", primary: "dlsym symbol C" },
                { name: "dlclose: تحرير المكتبة", primary: "dlclose unload library C" },
                { name: "LD_PRELOAD: استبدال الدوال", primary: "LD_PRELOAD interpose C" },
                { name: "إصدارات المكتبة الديناميكية", primary: "shared library versioning C" },
                { name: "تطبيق: نظام plugin بالمكتبات الديناميكية", primary: "plugin system dlopen C" }
              ]
            },
            {
              unit_index: 5, code: "2.5.5",
              name: "أدوات البناء المتقدمة",
              goal: "إتقان CMake وأدوات بناء الأنظمة المعقدة",
              key_concepts: ["CMake","Autotools","pkg-config","Cross-compile","Build Systems"],
              lessons: [
                { name: "CMake: لماذا يسود العالم", primary: "CMake why popular C" },
                { name: "CMakeLists.txt: البنية الأساسية", primary: "CMakeLists basic C" },
                { name: "هدف CMake: Target وProperties", primary: "CMake target properties C" },
                { name: "المكتبات في CMake: find_package", primary: "CMake find_package library C" },
                { name: "Autotools: ./configure make", primary: "autotools configure C" },
                { name: "pkg-config: تحديد تبعيات المكتبات", primary: "pkg-config library dependencies C" },
                { name: "التصريف المتقاطع Cross-compilation", primary: "cross compilation C ARM" },
                { name: "تكامل CMake مع CI/CD", primary: "CMake CI CD C" },
                { name: "Ninja: بديل make الأسرع", primary: "Ninja build C fast" },
                { name: "تطبيق: مشروع CMake متكامل", primary: "CMake full project C" }
              ]
            },
            {
              unit_index: 6, code: "2.5.6",
              name: "الأمان في كود C",
              goal: "تطبيق ممارسات الأمان لتجنب الثغرات الأمنية الشائعة في C",
              key_concepts: ["Buffer Overflow","Format String","Integer Overflow","Safe Functions","CERT C"],
              lessons: [
                { name: "Buffer Overflow: السلاح الأقدم", primary: "buffer overflow vulnerability C" },
                { name: "Stack Canaries وحماية المكدس", primary: "stack canaries protection C" },
                { name: "ASLR وDEP: حماية نظام التشغيل", primary: "ASLR DEP OS protection C" },
                { name: "Format String Attacks", primary: "format string attack C" },
                { name: "Integer Overflow كثغرة أمنية", primary: "integer overflow vulnerability C" },
                { name: "الدوال الآمنة: _s في MSVC", primary: "safe functions _s C" },
                { name: "CERT C: معيار الكود الآمن", primary: "CERT C secure coding" },
                { name: "أدوات التحليل الساكن للأمان", primary: "static analysis security C" },
                { name: "fuzzing: اختبار الأمان العشوائي", primary: "fuzzing security C" },
                { name: "تطبيق: تدقيق أمني لكود موجود", primary: "security audit C code" }
              ]
            },
            {
              unit_index: 7, code: "2.5.7",
              name: "C الحديثة: C99 C11 C17 C23",
              goal: "استخدام مميزات C الحديثة لكتابة كود أنظف وأكثر أماناً",
              key_concepts: ["C99","C11","C17","VLA","_Generic","Anonymous Struct"],
              lessons: [
                { name: "C99: الثورة الكبرى في C", primary: "C99 features C" },
                { name: "متغيرات الطول المتغير VLA", primary: "VLA variable length array C99" },
                { name: "المصفوفات ذات الطول المتغير وأمانها", primary: "VLA safety danger C99" },
                { name: "C11: _Atomic و_Thread_local", primary: "C11 atomic thread local" },
                { name: "C11: _Generic للتعميم", primary: "C11 _Generic generic C" },
                { name: "C11: _Static_assert للتحقق الساكن", primary: "static assert C11" },
                { name: "C17: الإصلاحات والتوضيحات", primary: "C17 fixes C" },
                { name: "C23: ما الجديد المقرر", primary: "C23 new features" },
                { name: "اختيار معيار C المناسب للمشروع", primary: "choose C standard project" },
                { name: "تطبيق: استخدام C11 في مشروع حقيقي", primary: "C11 practical project" }
              ]
            },
            {
              unit_index: 8, code: "2.5.8",
              name: "البرمجة الشبكية الأساسية",
              goal: "بناء تطبيقات شبكية أساسية بـ Sockets في C",
              key_concepts: ["Sockets","TCP","UDP","Server","Client"],
              lessons: [
                { name: "مفهوم المقبس Socket والبروتوكول", primary: "socket concept TCP UDP C" },
                { name: "socket(): إنشاء المقبس", primary: "socket create C" },
                { name: "خادم TCP: bind وlisten وaccept", primary: "TCP server bind listen accept C" },
                { name: "عميل TCP: connect وsend وrecv", primary: "TCP client connect send recv C" },
                { name: "بروتوكول UDP: sendto وrecvfrom", primary: "UDP sendto recvfrom C" },
                { name: "I/O Multiplexing بـ select", primary: "select multiplex sockets C" },
                { name: "الاتصال غير المتزامن Non-blocking", primary: "non-blocking sockets C" },
                { name: "معالجة اتصالات متعددة بـ fork", primary: "multiple connections fork C" },
                { name: "بروتوكول HTTP البسيط", primary: "simple HTTP C" },
                { name: "تطبيق: خادم صدى Echo Server", primary: "echo server C TCP" }
              ]
            },
            {
              unit_index: 9, code: "2.5.9",
              name: "الاتصال بين العمليات IPC",
              goal: "تطبيق آليات الاتصال بين العمليات في C",
              key_concepts: ["Pipes","FIFO","Message Queue","Shared Memory","Semaphore"],
              lessons: [
                { name: "الأنبوب pipe(): اتصال أحادي الاتجاه", primary: "pipe IPC C" },
                { name: "FIFO: الأنبوب المسمّى", primary: "FIFO named pipe C" },
                { name: "قائمة الرسائل Message Queue", primary: "message queue IPC C" },
                { name: "الذاكرة المشتركة Shared Memory", primary: "shared memory IPC C" },
                { name: "الإشارة المرورية Semaphore", primary: "semaphore IPC C" },
                { name: "مقارنة آليات IPC: متى أيها", primary: "IPC comparison C" },
                { name: "POSIX IPC مقابل System V", primary: "POSIX vs SysV IPC C" },
                { name: "الأمان في IPC", primary: "IPC security C" },
                { name: "اختبار الاتصال بين العمليات", primary: "test IPC C" },
                { name: "تطبيق: نظام طابور مهام متعدد العمليات", primary: "multiprocess task queue C IPC" }
              ]
            }
          ]
        },
        {
          stage_index: 6,
          name: "البرمجة النظامية والعمليات",
          goal: "إتقان واجهة برمجة نظام POSIX وإدارة العمليات والخيوط والمزامنة",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 60 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.6.1",
              name: "POSIX ومكالمات النظام",
              goal: "فهم واجهة POSIX ومكالمات النظام وكيفية التفاعل مع نواة نظام التشغيل",
              key_concepts: ["POSIX","System Calls","Kernel","User Space","API"],
              lessons: [
                { name: "ما هو POSIX ولماذا مهم", primary: "POSIX standard C Unix" },
                { name: "الفرق بين مكالمة النظام والمكتبة", primary: "syscall vs library C" },
                { name: "strace: تتبع مكالمات النظام", primary: "strace system calls C" },
                { name: "errno ومعالجة أخطاء POSIX", primary: "errno POSIX errors C" },
                { name: "وظائف unistd.h الأساسية", primary: "unistd.h functions C" },
                { name: "getpid وgetppid وgetuid", primary: "process id uid C" },
                { name: "مسار العمل getcwd وchdir", primary: "getcwd chdir C" },
                { name: "البيئة: getenv وsetenv", primary: "environment variables C" },
                { name: "exit وatexit وonExit", primary: "exit atexit C" },
                { name: "تطبيق: استكشاف النظام برمجياً", primary: "system exploration POSIX C" }
              ]
            },
            {
              unit_index: 2, code: "2.6.2",
              name: "إدارة العمليات fork وexec",
              goal: "إنشاء العمليات الفرعية وتنفيذ البرامج بـ fork وexec",
              key_concepts: ["fork","exec","wait","Process","Child Process"],
              lessons: [
                { name: "مفهوم العملية Process في Unix", primary: "process Unix fork C" },
                { name: "fork(): تكرار العملية", primary: "fork system call C" },
                { name: "قراءة PID لتمييز الأب والابن", primary: "fork PID parent child C" },
                { name: "exec*: استبدال صورة العملية", primary: "exec execvp execve C" },
                { name: "نمط fork-exec الكلاسيكي", primary: "fork exec pattern C" },
                { name: "wait وwaitpid: انتظار الابن", primary: "wait waitpid child C" },
                { name: "Zombie Processes وكيف تتجنبها", primary: "zombie process C" },
                { name: "الأنابيب بين الأب والابن", primary: "pipe parent child C" },
                { name: "إعادة توجيه stdin وstdout وstderr", primary: "redirect stdin stdout C" },
                { name: "تطبيق: غلاف Shell بسيط", primary: "simple shell C" }
              ]
            },
            {
              unit_index: 3, code: "2.6.3",
              name: "الإشارات Signals",
              goal: "التعامل مع الإشارات لإدارة أحداث العملية بأمان",
              key_concepts: ["signal","sigaction","SIGINT","SIGTERM","async-signal-safe"],
              lessons: [
                { name: "الإشارات: أحداث غير متزامنة", primary: "signals async events C" },
                { name: "الإشارات الشائعة: SIGINT SIGTERM SIGKILL", primary: "common signals C" },
                { name: "signal(): معالج إشارة بسيط", primary: "signal handler C" },
                { name: "sigaction: المعالج الاحترافي", primary: "sigaction advanced C" },
                { name: "دوال آمنة في معالج الإشارة", primary: "signal safe functions C" },
                { name: "SIGCHLD: إشارة انتهاء الابن", primary: "SIGCHLD child exit C" },
                { name: "sigprocmask: تعطيل الإشارات مؤقتاً", primary: "sigprocmask block signals C" },
                { name: "sigsuspend: الانتظار للإشارة", primary: "sigsuspend wait signal C" },
                { name: "kill وraise: إرسال الإشارات", primary: "kill raise signal C" },
                { name: "تطبيق: برنامج يتعامل مع Ctrl+C بأناقة", primary: "graceful exit signal C" }
              ]
            },
            {
              unit_index: 4, code: "2.6.4",
              name: "خيوط POSIX Threads",
              goal: "إنشاء وإدارة الخيوط بـ pthreads للمعالجة المتوازية",
              key_concepts: ["pthread","thread_create","join","Thread Function","Concurrency"],
              lessons: [
                { name: "مفهوم الخيط Thread ولماذا نحتاجه", primary: "thread concept concurrency C" },
                { name: "pthread_create: إنشاء الخيط", primary: "pthread_create C" },
                { name: "دالة الخيط وvoid*", primary: "thread function void pointer C" },
                { name: "pthread_join: انتظار انتهاء الخيط", primary: "pthread_join wait C" },
                { name: "pthread_detach: الخيط المستقل", primary: "pthread_detach C" },
                { name: "مشاركة البيانات بين الخيوط", primary: "share data threads C" },
                { name: "حالة السباق Race Condition", primary: "race condition C threads" },
                { name: "Deadlock: الجمود المتبادل", primary: "deadlock C threads" },
                { name: "ترتيب الخيوط والجدولة", primary: "thread ordering scheduling C" },
                { name: "تطبيق: معالجة ملفات بخيوط متوازية", primary: "parallel file processing threads C" }
              ]
            },
            {
              unit_index: 5, code: "2.6.5",
              name: "المزامنة: Mutex وCondition",
              goal: "إتقان أدوات المزامنة لحماية البيانات المشتركة بين الخيوط",
              key_concepts: ["Mutex","Condition Variable","Lock","Critical Section","Atomic"],
              lessons: [
                { name: "القسم الحرج Critical Section", primary: "critical section mutex C" },
                { name: "pthread_mutex: القفل الأساسي", primary: "pthread_mutex lock C" },
                { name: "pthread_mutex_lock وunlock", primary: "mutex lock unlock C" },
                { name: "RAII للـ Mutex في C", primary: "RAII mutex C cleanup" },
                { name: "Mutex الهرمي لتجنب Deadlock", primary: "hierarchical mutex deadlock C" },
                { name: "pthread_cond_wait: انتظار شرط", primary: "condition variable wait C" },
                { name: "pthread_cond_signal وbroadcast", primary: "condition signal broadcast C" },
                { name: "نمط المنتج-المستهلك بـ Mutex وCond", primary: "producer consumer mutex cond C" },
                { name: "Read-Write Lock للقراءة المتوازية", primary: "read write lock pthread C" },
                { name: "تطبيق: بنك مع خيوط آمنة", primary: "bank threads mutex C" }
              ]
            },
            {
              unit_index: 6, code: "2.6.6",
              name: "العمليات الذرية والأداء",
              goal: "استخدام العمليات الذرية لمزامنة خفيفة الوزن عالية الأداء",
              key_concepts: ["Atomic Operations","C11 Atomics","Memory Ordering","Lock-free","CAS"],
              lessons: [
                { name: "مشكلة غير الذرية: ++counter", primary: "non atomic counter C threads" },
                { name: "C11 Atomics: _Atomic", primary: "C11 atomic C" },
                { name: "atomic_load وatomic_store", primary: "atomic load store C" },
                { name: "atomic_fetch_add وعمليات أخرى", primary: "atomic fetch add C" },
                { name: "ترتيب الذاكرة Memory Ordering", primary: "memory ordering C atomic" },
                { name: "Compare and Swap CAS", primary: "CAS compare and swap C atomic" },
                { name: "Lock-free Stack أساسي", primary: "lock free stack C" },
                { name: "Spinlock مقابل Mutex", primary: "spinlock vs mutex C" },
                { name: "أداء الذريات مقابل Mutex", primary: "atomic performance mutex C" },
                { name: "تطبيق: عداد ذري عالي الأداء", primary: "high performance atomic counter C" }
              ]
            },
            {
              unit_index: 7, code: "2.6.7",
              name: "البرمجة للأنظمة المدمجة",
              goal: "تطبيق C في سياق الأنظمة المدمجة والقيود الصارمة",
              key_concepts: ["Embedded","Bare Metal","Volatile","Interrupt","Memory Mapped IO"],
              lessons: [
                { name: "C في الأنظمة المدمجة: القيود والفرص", primary: "embedded C constraints" },
                { name: "volatile: التغيير خارج المترجم", primary: "volatile embedded hardware C" },
                { name: "الذاكرة المعيَّنة Memory-Mapped IO", primary: "memory mapped IO embedded C" },
                { name: "معالجات المقاطعة Interrupt Handlers", primary: "interrupt handlers embedded C" },
                { name: "الوقت الحقيقي RTOS أساسي", primary: "RTOS real time embedded C" },
                { name: "تحسين الحجم: -Os وأدوات الحجم", primary: "size optimization C embedded" },
                { name: "لا malloc في الأنظمة المدمجة", primary: "no malloc embedded C" },
                { name: "اختبار الوحدة للكود المدمج", primary: "unit testing embedded C" },
                { name: "التصريف المتقاطع للهدف ARM", primary: "cross compile ARM C" },
                { name: "تطبيق: محاكي مدمج بسيط", primary: "simple embedded simulator C" }
              ]
            },
            {
              unit_index: 8, code: "2.6.8",
              name: "تطبيقات نظام التشغيل",
              goal: "بناء تطبيقات تتفاعل مباشرة مع خدمات نظام التشغيل",
              key_concepts: ["OS Services","Process Management","File System","Monitoring","Daemon"],
              lessons: [
                { name: "خدمات نظام التشغيل من C", primary: "OS services C" },
                { name: "قراءة /proc للمعلومات النظامية", primary: "proc filesystem C Linux" },
                { name: "مراقبة العمليات: CPU والذاكرة", primary: "process monitoring CPU memory C" },
                { name: "الخادم الخفي Daemon Process", primary: "daemon process C" },
                { name: "Systemd وخدمات C", primary: "systemd service C" },
                { name: "syslog: تسجيل النظام", primary: "syslog C logging" },
                { name: "إدارة المستخدمين والأذونات", primary: "user permissions C POSIX" },
                { name: "الإشارات الزمنية: alarm وtimer", primary: "alarm timer signal C" },
                { name: "التحميل الديناميكي dlopen للإضافات", primary: "dlopen plugin C daemon" },
                { name: "تطبيق: خدمة مراقبة نظام", primary: "system monitor service C" }
              ]
            },
            {
              unit_index: 9, code: "2.6.9",
              name: "تحسين أداء الكود النظامي",
              goal: "تطبيق تقنيات تحسين الأداء المتخصصة لكود C النظامي",
              key_concepts: ["Profiling","Cache Optimization","SIMD","Vectorization","perf"],
              lessons: [
                { name: "perf: أداة تحليل الأداء النظامي", primary: "perf tool performance C Linux" },
                { name: "Flame Graphs لتصور الأداء", primary: "flame graph perf C" },
                { name: "Cache Lines وتأثيرها الجوهري", primary: "cache lines performance C" },
                { name: "False Sharing بين الخيوط", primary: "false sharing threads C" },
                { name: "SIMD: معالجة موازية للبيانات", primary: "SIMD vectorization C" },
                { name: "AVX و SSE في C", primary: "AVX SSE intrinsics C" },
                { name: "تحسين اتجاه الحلقات Loop Tiling", primary: "loop tiling cache C" },
                { name: "Prefetching: جلب البيانات مسبقاً", primary: "prefetch data C" },
                { name: "LTO: تحسين وقت الربط", primary: "LTO link time optimization C" },
                { name: "تطبيق: تسريع معالجة إشارات 100x", primary: "signal processing speedup C SIMD" }
              ]
            }
          ]
        },
        {
          stage_index: 7,
          name: "المشروع الختامي المتقدم",
          goal: "بناء نظام C متكامل يجسّد الإتقان الكامل للمستوى الثاني بجودة إنتاجية حقيقية",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 80, time_limit_minutes: 90 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.7.1",
              name: "هندسة النظام الكبير",
              goal: "تصميم هندسة نظام C كبير قابل للصيانة والتوسع",
              key_concepts: ["Architecture","Layers","Interface","Modularity","Scalability"],
              lessons: [
                { name: "هندسة النظام الكبير: الطبقات", primary: "layered architecture C system" },
                { name: "فصل الاهتمامات Separation of Concerns", primary: "separation concerns C" },
                { name: "تصميم الواجهات بين الطبقات", primary: "layer interfaces C design" },
                { name: "إدارة التبعيات بين الوحدات", primary: "dependency management C modules" },
                { name: "نمط Repository لإدارة البيانات", primary: "repository pattern C" },
                { name: "طبقة التجريد Hardware Abstraction", primary: "HAL hardware abstraction C" },
                { name: "هندسة الحالة: State Machine كبير", primary: "large state machine C" },
                { name: "توثيق الهندسة: ADR وDiagrams", primary: "architecture documentation C" },
                { name: "التطور التدريجي بلا كسر", primary: "incremental evolution C" },
                { name: "تطبيق: تصميم خادم HTTP بسيط", primary: "HTTP server design C" }
              ]
            },
            {
              unit_index: 2, code: "2.7.2",
              name: "أنماط التصميم في C",
              goal: "تطبيق أنماط التصميم الكلاسيكية في سياق C",
              key_concepts: ["Singleton","Observer","Factory","Iterator","Builder"],
              lessons: [
                { name: "Singleton في C: الواحد المضمون", primary: "singleton C pattern" },
                { name: "Observer: الإشعار بالأحداث", primary: "observer pattern C events" },
                { name: "Factory: صانع الكائنات", primary: "factory pattern C" },
                { name: "Iterator: التنقل العام", primary: "iterator pattern C" },
                { name: "Builder: بناء معقد خطوة بخطوة", primary: "builder pattern C" },
                { name: "State Machine بالجدول والدوال", primary: "state machine table C" },
                { name: "Command: الأوامر كبيانات", primary: "command pattern C" },
                { name: "Chain of Responsibility", primary: "chain responsibility C" },
                { name: "أنماط التصميم المدمج في C", primary: "embedded design patterns C" },
                { name: "تطبيق: نظام أحداث بأنماط متعددة", primary: "event system patterns C" }
              ]
            },
            {
              unit_index: 3, code: "2.7.3",
              name: "بناء مترجم أو مفسر بسيط",
              goal: "بناء مفسر بسيط كتطبيق تتويجي لمهارات C",
              key_concepts: ["Lexer","Parser","AST","Interpreter","Compiler Basics"],
              lessons: [
                { name: "كيف يعمل المترجم: نظرة عامة", primary: "compiler overview C" },
                { name: "المحلل اللغوي Lexer: تقطيع النص", primary: "lexer tokenizer C" },
                { name: "تعريف الرموز Tokens", primary: "tokens definition C" },
                { name: "المحلل النحوي Parser البسيط", primary: "recursive descent parser C" },
                { name: "شجرة بناء الجملة AST", primary: "AST syntax tree C" },
                { name: "تفسير AST: المُقيِّم", primary: "AST evaluator C" },
                { name: "حساب التعبيرات الحسابية", primary: "expression calculator C" },
                { name: "إضافة متغيرات والنطاق", primary: "variables scope interpreter C" },
                { name: "الحلقات والشروط في المفسر", primary: "loops conditions interpreter C" },
                { name: "تطبيق: مفسر لغة تعبيرات بسيطة", primary: "simple expression interpreter C" }
              ]
            },
            {
              unit_index: 4, code: "2.7.4",
              name: "قاعدة بيانات C من الصفر",
              goal: "بناء قاعدة بيانات مبسطة لفهم المفاهيم الأساسية للتخزين",
              key_concepts: ["B-Tree Storage","Index","Query Engine","ACID","Persistence"],
              lessons: [
                { name: "هيكل الملف لقاعدة بيانات بسيطة", primary: "database file format C" },
                { name: "صفحات الذاكرة Page Management", primary: "page manager C database" },
                { name: "B-Tree للتخزين والفهرسة", primary: "B-tree storage C" },
                { name: "محرك الاستعلام البسيط", primary: "simple query engine C" },
                { name: "تسلسل البيانات والقراءة", primary: "serialize deserialize C database" },
                { name: "الكتابة الذرية للمعاملات", primary: "atomic transaction C database" },
                { name: "سجل WAL للمتانة", primary: "WAL write ahead log C" },
                { name: "الفهرسة لسرعة البحث", primary: "indexing search C database" },
                { name: "المقارنة مع SQLite: الأفكار المشتركة", primary: "SQLite comparison C database" },
                { name: "تطبيق: قاعدة بيانات مفاتيح-قيم", primary: "key value database C" }
              ]
            },
            {
              unit_index: 5, code: "2.7.5",
              name: "C والتوثيق والإصدار الاحترافي",
              goal: "بناء مشاريع C مع توثيق وإدارة إصدار احترافية",
              key_concepts: ["Doxygen","Semantic Versioning","Changelog","Git","Release"],
              lessons: [
                { name: "Doxygen: توليد التوثيق تلقائياً", primary: "Doxygen C documentation" },
                { name: "تعليقات Doxygen الصحيحة", primary: "Doxygen comments C" },
                { name: "الإصدار الدلالي Semantic Versioning", primary: "semver versioning C library" },
                { name: "CHANGELOG: سجل التغييرات", primary: "CHANGELOG C project" },
                { name: "git tags للإصدارات", primary: "git tags versions C" },
                { name: "GitHub Releases وملاحظات الإصدار", primary: "GitHub releases C" },
                { name: "حزم توزيع: tar.gz وDebian", primary: "distribution package C" },
                { name: "pkgconfig لتبعيات المستخدم", primary: "pkgconfig user library C" },
                { name: "ABI الاستقرار: قواعد الكسر", primary: "ABI stability breaking C" },
                { name: "تطبيق: إصدار مكتبة 1.0.0 كاملة", primary: "library release 1.0 C" }
              ]
            },
            {
              unit_index: 6, code: "2.7.6",
              name: "CI/CD لمشاريع C",
              goal: "إعداد دورة تطوير مستمرة مع اختبار وبناء وتوزيع تلقائي",
              key_concepts: ["CI","CD","GitHub Actions","Testing","Automation"],
              lessons: [
                { name: "CI/CD: ما هو ولماذا ضروري", primary: "CI CD C project" },
                { name: "GitHub Actions لمشاريع C", primary: "GitHub Actions C workflow" },
                { name: "تشغيل اختبارات تلقائياً في CI", primary: "automated tests CI C" },
                { name: "التحقق الساكن في CI: clang-tidy", primary: "clang-tidy CI C" },
                { name: "Valgrind وASan في CI", primary: "Valgrind ASan CI C" },
                { name: "تصريف لمنصات متعددة", primary: "cross platform compile CI C" },
                { name: "تغطية الكود في CI", primary: "code coverage CI C gcov" },
                { name: "إنشاء حزم التوزيع تلقائياً", primary: "package distribution CI C" },
                { name: "Caching في CI لتسريع البناء", primary: "cache CI C build" },
                { name: "تطبيق: مشروع كامل بـ CI/CD", primary: "complete CI CD project C" }
              ]
            },
            {
              unit_index: 7, code: "2.7.7",
              name: "C في سوق العمل والمسار المهني",
              goal: "بناء حضور مهني كمطور C وإتقان مسارات التخصص",
              key_concepts: ["Career","Systems Programming","Embedded","Interview","Portfolio"],
              lessons: [
                { name: "مسارات مطور C في سوق العمل", primary: "C developer career paths" },
                { name: "البرمجة النظامية: الفرص الضخمة", primary: "systems programming career C" },
                { name: "الأنظمة المدمجة: مجال متنامٍ", primary: "embedded career C" },
                { name: "مقابلات C: ما يُسأل حقاً", primary: "C interviews questions real" },
                { name: "Coding Challenges بـ C", primary: "LeetCode C challenges" },
                { name: "كتب C الضرورية: K&R وExperts C", primary: "C books KR expert C" },
                { name: "المشاريع مفتوحة المصدر بـ C", primary: "open source C Linux kernel" },
                { name: "بناء portfolio C احترافي", primary: "portfolio C professional" },
                { name: "شبكة التواصل المهني في C/Systems", primary: "networking systems C community" },
                { name: "خطة تعلم مستمر لمطور C", primary: "continuous learning plan C" }
              ]
            },
            {
              unit_index: 8, code: "2.7.8",
              name: "C والمستقبل: Rust ومقارنات",
              goal: "فهم مكانة C في المستقبل وكيفية الانتقال لـ Rust أو C++",
              key_concepts: ["Rust","C++","Future","Safety","Systems Languages"],
              lessons: [
                { name: "C في 2025: لا يزال لا غنى عنه", primary: "C relevance 2025 future" },
                { name: "Rust: البديل الآمن وكيف يُقارن", primary: "Rust vs C safety comparison" },
                { name: "مفاهيم C التي تنتقل لـ Rust", primary: "C concepts Rust ownership" },
                { name: "C++: أخ أقوى لكن أعقد", primary: "C vs C++ systems" },
                { name: "متى تختار C على Rust وC++", primary: "choose C Rust C++ when" },
                { name: "C في نواة Linux: لا بديل حالياً", primary: "Linux kernel C irreplaceable" },
                { name: "C في Python وRuby: الأساس الخفي", primary: "C Python Ruby interpreter" },
                { name: "WebAssembly من C: المستقبل", primary: "WebAssembly from C" },
                { name: "C في AI Hardware: NPUs والشرائح", primary: "C hardware AI NPU" },
                { name: "تطبيق: كتابة C تُستدعى من Python", primary: "C extension Python call" }
              ]
            },
            {
              unit_index: 9, code: "2.7.9",
              name: "المشروع الختامي: نظام C متكامل",
              goal: "بناء نظام C متكامل يُظهر إتقان جميع مهارات المستويين",
              key_concepts: ["Capstone","Production Quality","Complete System","Portfolio","Demonstration"],
              lessons: [
                { name: "اختيار المشروع الختامي المؤثر", primary: "impactful capstone C project" },
                { name: "متطلبات النظام والمواصفات", primary: "system requirements C" },
                { name: "هندسة النظام الكاملة", primary: "complete architecture C system" },
                { name: "بناء الطبقات التدريجي", primary: "layered build C system" },
                { name: "الاختبار الشامل: وحدات وتكامل", primary: "unit integration testing C" },
                { name: "تحسين الأداء والذاكرة", primary: "performance memory optimization C" },
                { name: "الأمان وقوة الكود", primary: "security robust code C" },
                { name: "التوثيق الاحترافي الكامل", primary: "professional documentation C" },
                { name: "النشر والتوزيع للمجتمع", primary: "deploy distribute C project" },
                { name: "المراجعة النهائية: فخر المطور", primary: "final review pride C developer" }
              ]
            }
          ]
        }
      ]
    }
  ]
};

function makeGoal(lessonName, unitName) {
  return `يتمكن المتعلم من فهم "${lessonName}" وتطبيقه عملياً ضمن سياق "${unitName}" بكتابة كود C صحيح وقابل للصيانة`;
}

function makeBridge(lessonName, lessonIndex, unitName) {
  if (lessonIndex === 0) return `نبدأ رحلتنا في "${unitName}" بالمفهوم الجوهري "${lessonName}" الذي يُشكّل الأساس لكل ما يليه`;
  if (lessonIndex === 9) return `نختتم وحدة "${unitName}" بـ"${lessonName}" الذي يجمع ما تعلمناه في تطبيق حقيقي متكامل`;
  return `بعد فهم ما سبق، ننتقل لـ"${lessonName}" الذي يُعمّق كفاءتنا في "${unitName}" ويُقرّبنا من الاستخدام الاحترافي`;
}

function makeConcepts(primary, lessonName) {
  const seen = new Set();
  const terms = primary.split(" ").filter(t => t.length > 2).filter(t => {
    const key = `${t} في C`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
  return terms.map((term, i) => ({
    name: `${term} في C`,
    explanation: `${term} هو مفهوم جوهري في "${lessonName}" يُستخدم يومياً في مشاريع C الحقيقية لكتابة كود صحيح وفعّال`,
    mastery_criterion: `يستطيع المتعلم شرح ${term} بكلماته وكتابة مثال كودي يعمل فعلاً دون مساعدة خارجية`,
    weight: Math.max(1, 3 - Math.floor(i / 2))
  }));
}

function makeMistakes(primary, unitName) {
  const terms = primary.split(" ").filter(t => t.length > 2).slice(0, 3);
  return [
    {
      mistake: `الخلط بين ${terms[0] || "المفهوم"} واستخدامه في سياق خاطئ في C`,
      correction: `يجب فهم السياق الصحيح لاستخدام ${terms[0] || "المفهوم"} في C`,
      treatment: `تدرّب على أمثلة متنوعة وتحقق من التوثيق man pages`,
      severity: "major"
    },
    {
      mistake: `نسيان التحقق من نجاح العملية قبل استخدام ${terms[1] || "المخرج"}`,
      correction: `دائماً تحقق من قيمة الإعادة والـ NULL قبل المتابعة`,
      treatment: `أضف فحوصات شاملة بعد كل عملية قد تفشل`,
      severity: "major"
    },
    {
      mistake: `إهمال تحرير الذاكرة أو الموارد المرتبطة بـ ${terms[2] || "العملية"}`,
      correction: `كل malloc يحتاج free مقابل، وكل fopen يحتاج fclose`,
      treatment: `استخدم Valgrind للتحقق من عدم وجود تسريبات`,
      severity: "major"
    }
  ];
}

function makeExamples(primary, unitName) {
  return [
    `في مشروع C حقيقي للأنظمة اليمنية، يُستخدم "${primary.split(" ")[0]}" لحل مشكلة حقيقية بكفاءة`,
    `مهندس أنظمة يستخدم "${primary.split(" ").slice(0, 2).join(" ")}" يومياً في تطوير أنظمة C محترفة`
  ];
}

function makeExamQuestion(lessonName, primary) {
  const key = primary.split(" ")[0];
  return `كيف تطبق "${key}" في سياق "${lessonName}"؟ اكتب مثالاً كودياً بسيطاً يُوضّح الفكرة بالكود`;
}

function makeLabForUnit(unitDef) {
  const c = unitDef.key_concepts;
  const kinds = ["diagnostic", "decision", "application", "analysis", "connection"];
  const questions = kinds.map((kind, i) => {
    const concept = c[i % c.length];
    return {
      kind,
      prompt: kind === "diagnostic"
        ? `وصف مشكلة برمجية في "${unitDef.name}": لديك ${concept} لا يعمل بالشكل المتوقع. كيف تشخّص السبب وتُحدد الخطوة الأولى لإصلاحه؟`
        : kind === "decision"
        ? `متى تختار استخدام ${concept} بدلاً من البديل المشابه في مشاريع C؟ اشرح قرارك بمثال كودي`
        : kind === "application"
        ? `اكتب كود C يستخدم ${concept} لحل مهمة حقيقية في مجال "${unitDef.name}". يجب أن يُترجم ويعمل`
        : kind === "analysis"
        ? `قيّم الكود التالي الذي يستخدم ${concept}: ما مشاكله الأمنية والأدائية؟ وكيف تُحسّنه؟`
        : `كيف يرتبط ${concept} بباقي مفاهيم "${unitDef.name}"؟ ابنِ مثالاً يجمع ثلاثة مفاهيم معاً`,
      rubric: `يُقيَّم على: صحة الكود وترجمته (40%)، وضوح التفكير (30%)، ومراعاة أمان الذاكرة والأداء (30%)`,
      solution_outline: `الإجابة تشمل: ${concept} بالطريقة الصحيحة، فحص الأخطاء، وتحرير الموارد عند الانتهاء`,
      points: Math.min(10, 6 + i)
    };
  });

  return {
    title: `مختبر ${unitDef.name}: التطبيق العملي`,
    scenario: `أنت مهندس أنظمة C تعمل على مشروع يتطلب تطبيق مفاهيم "${unitDef.name}" بشكل احترافي وآمن`,
    completion_criterion: `يتمكن الطالب من كتابة كود C صحيح وآمن يُوظّف مفاهيم "${unitDef.name}" في سياق تطبيقي حقيقي`,
    pedagogical_sequence: "diagnostic → decision → application → analysis → connection",
    questions
  };
}

function makeUnitExamQuestions(unitCode, unitDef, passThreshold, timeLimit) {
  const c = unitDef.key_concepts;
  const questions = [
    {
      prompt: `ما الاستخدام الصحيح لـ "${c[0]}" في C؟`,
      choices: [
        `استخدامه في كل حالة بغض النظر عن السياق`,
        `استخدامه عندما يكون السياق مناسباً وفق أفضل ممارسات C`,
        `تجنبه دائماً لصالح البدائل في C++`,
        `استخدامه فقط في المشاريع الكبيرة`
      ],
      correct_index: 1,
      explanation: `"${c[0]}" يُستخدم في C عندما يكون السياق مناسباً وفق أفضل الممارسات وقواعد الأمان`
    },
    {
      prompt: `ما الفرق الجوهري بين "${c[0]}" و "${c[1] || c[0]}" في C؟`,
      choices: [
        `لا فرق بينهما عملياً`,
        `"${c[0]}" و"${c[1] || c[0]}" يخدمان أغراضاً مختلفة والاختيار يعتمد على السياق والمتطلبات`,
        `"${c[1] || c[0]}" دائماً أحدث وأفضل`,
        `كلاهما مهمل في C الحديثة`
      ],
      correct_index: 1,
      explanation: `الاختيار الصحيح بين "${c[0]}" و"${c[1] || c[0]}" يعتمد على السياق والمتطلبات المحددة`
    },
    {
      prompt: `ما الخطأ الأكثر شيوعاً عند استخدام "${c[0]}" في مشاريع C؟`,
      choices: [
        `استخدامه في المشاريع الكبيرة`,
        `تجاهل التوثيق الرسمي`,
        `تطبيقه دون التحقق من نجاحه ودون معالجة الأخطاء`,
        `استخدامه مع C11 فقط`
      ],
      correct_index: 2,
      explanation: `الخطأ الأكثر شيوعاً هو تطبيق "${c[0]}" دون التحقق من نجاحه مما يؤدي لسلوك غير محدد`
    },
    {
      prompt: `في أي حالة يكون "${c[c.length > 2 ? 2 : 0]}" الخيار الأمثل؟`,
      choices: [
        `في كل الحالات دون استثناء`,
        `عندما نحتاج سرعة تطوير فقط`,
        `عندما يكون الأداء هو الأولوية الوحيدة`,
        `عندما يتوافق مع متطلبات المشروع وقواعد الأمان الصحيحة`
      ],
      correct_index: 3,
      explanation: `"${c[c.length > 2 ? 2 : 0]}" هو الخيار الأمثل عندما يتوافق مع متطلبات المشروع وقواعد C الآمنة`
    },
    {
      prompt: `كيف تتحقق من صحة تطبيقك لـ "${c[0]}" في كود C؟`,
      choices: [
        `تشغيل الكود مرة واحدة والافتراض بأنه يعمل`,
        `كتابة اختبار يغطي الحالات الطبيعية والحدية وتشغيل Valgrind`,
        `مراجعة الكود بصرياً فقط`,
        `الاعتماد على المترجم في اكتشاف كل الأخطاء`
      ],
      correct_index: 1,
      explanation: `الاختبار مع Valgrind يضمن صحة "${c[0]}" ويكشف تسربات الذاكرة وأخطاء الوصول`
    },
    {
      prompt: `ما أفضل طريقة لتنظيم كود "${unitDef.name}" في مشروع C كبير؟`,
      choices: [
        `وضع كل الكود في ملف .c واحد لسهولة الإدارة`,
        `فصل الكود إلى وحدات .c و.h مع واجهات واضحة ومحددة`,
        `تجنب التنظيم وتركيز الجهد على الأداء`,
        `استخدام كل الوظائف كـ static دون ترويسات`
      ],
      correct_index: 1,
      explanation: `فصل "${unitDef.name}" لوحدات بواجهات محددة يُحسّن الصيانة ويُخفي التفاصيل`
    }
  ];

  return {
    unit_code: unitCode,
    pass_threshold_percent: passThreshold,
    time_limit_minutes: timeLimit,
    questions
  };
}

function makeStageExamQuestions(stageDef) {
  const uNames = stageDef.units.map(u => u.name);
  const questions = [];
  for (let i = 0; i < 10; i++) {
    const uName = uNames[i % uNames.length];
    const uName2 = uNames[(i + 3) % uNames.length];
    questions.push({
      prompt: `كيف تجمع بين "${uName}" و"${uName2}" لبناء كود C احترافي في ${stageDef.name}؟`,
      choices: [
        `يُعالَجان بشكل منفصل دائماً`,
        `"${uName}" يُوفّر الأساس بينما "${uName2}" يُكمله بعمق تطبيقي في سياق "${stageDef.name}"`,
        `كلاهما يؤديان نفس الوظيفة تماماً`,
        `يُستخدم أحدهما فقط في كل مشروع`
      ],
      correct_index: 1,
      explanation: `في "${stageDef.name}"، الجمع بين "${uName}" و"${uName2}" يبني كفاءة C متكاملة`
    });
  }
  return {
    stage_name: stageDef.name,
    pass_threshold_percent: stageDef.exam.pass_threshold_percent,
    time_limit_minutes: stageDef.exam.time_limit_minutes,
    questions
  };
}

function makeLevelExamQuestions(levelDef) {
  const lName = levelDef.name;
  const stems = [
    `ما المبدأ الأساسي الذي يميز مطور C المحترف في "${lName}"؟`,
    `كيف تُثبت إتقانك لـ"${lName}" في مقابلة عمل حقيقية؟`,
    `ما أكثر تحدٍّ يواجهك عند الانتقال من "${lName}" لمستوى أعلى؟`,
    `ما المشروع الذي يُثبت قدرتك على "${lName}" بشكل لا يقبل الجدل؟`,
    `كيف يختلف كود المبتدئ عن المحترف في "${lName}"؟`,
    `ما المورد الأهم لتعميق "${lName}" بعد إتمام هذا المستوى؟`,
    `كيف تُطبّق "${lName}" في سوق العمل اليمني والعالمي؟`,
    `ما الخطأ الجوهري الذي يمنع معظم المتعلمين من إتقان "${lName}"؟`,
    `كيف تحافظ على مهاراتك في "${lName}" وتطورها باستمرار؟`,
    `ما الميزة التنافسية التي يمنحها إتقان "${lName}" في سوق المطورين؟`,
    `كيف تُقيّم جودة كودك في "${lName}" بشكل موضوعي؟`,
    `ما أول مشروع حقيقي تبنيه بعد إتقان "${lName}"؟`,
    `كيف تُساهم في مجتمع C بعد إتقان "${lName}"؟`
  ];

  const questions = stems.map(stem => ({
    prompt: stem,
    choices: [
      `التركيز على حفظ الدوال والأوامر دون فهم كيف تعمل الذاكرة`,
      `بناء فهم متين للأسس مع تطبيق عملي مستمر وكتابة كود آمن وقابل للصيانة`,
      `التخصص الضيق جداً في جانب واحد فقط من C`,
      `الانتقال السريع لـ Rust أو C++ دون إتقان C أولاً`
    ],
    correct_index: 1,
    explanation: `التميز في "${lName}" يأتي من فهم عميق لإدارة الذاكرة والتطبيق المستمر`
  }));

  return {
    level_name: lName,
    pass_threshold_percent: levelDef.exam.pass_threshold_percent,
    time_limit_minutes: levelDef.exam.time_limit_minutes,
    questions
  };
}

function makePlacementTest() {
  const topics = [
    { q: "ما ناتج sizeof(int) على نظام 64-bit؟", a: 1, opts: ["2 bytes", "4 bytes", "8 bytes", "يعتمد على الـ compiler دائماً"], d: 1 },
    { q: "ما الفرق بين '=' و '==' في C؟", a: 2, opts: ["لا فرق", "'=' للمقارنة و'==' للإسناد", "'=' للإسناد و'==' للمقارنة", "كلاهما للمقارنة"], d: 1 },
    { q: "ما ناتج تنفيذ: int arr[5] = {0}; ثم printf(\"%d\", arr[3]);", a: 0, opts: ["0", "عشوائي", "خطأ في التجميع", "5"], d: 1 },
    { q: "ما الخطأ في الكود: char *s = \"hello\"; s[0] = 'H';", a: 1, opts: ["لا خطأ", "تعديل نص حرفي للقراءة فقط يسبب Segfault", "خطأ في التجميع", "s[0] لا تعمل مع char*"], d: 2 },
    { q: "كيف تُمرر متغيراً لدالة لتعديله؟", a: 2, opts: ["بتمريره مباشرة: f(x)", "بتمرير نسخة: f(x+0)", "بتمرير عنوانه: f(&x)", "المتغيرات لا تتعدّل في C"], d: 1 },
    { q: "ما ناتج: int x=5; printf(\"%d\", x++);", a: 0, opts: ["5", "6", "4", "غير محدد"], d: 2 },
    { q: "ما الفرق بين malloc وcalloc؟", a: 1, opts: ["لا فرق", "malloc يُخصص دون تصفير وcalloc يُصفّر", "calloc للمصفوفات فقط", "malloc أسرع دائماً لذا استخدمه دائماً"], d: 2 },
    { q: "لماذا يجب التحقق من قيمة إعادة malloc؟", a: 2, opts: ["ليس ضرورياً malloc لا يفشل", "لإظهار أنك مبرمج محترف", "قد يُعيد NULL عند نقص الذاكرة", "malloc يُعيد 0 عند الفشل"], d: 1 },
    { q: "ما معنى: const char *p = str;", a: 0, opts: ["مؤشر لنص لا يمكن تعديله عبر p", "p نفسه لا يمكن تغييره", "كلاهما ثابت", "خطأ في التركيب"], d: 2 },
    { q: "ما ناتج: int a[3]={1,2,3}; int *p=a; printf(\"%d\",*(p+2));", a: 2, opts: ["1", "2", "3", "خطأ"], d: 2 },
    { q: "لماذا يُعدّ الكود: char buf[10]; gets(buf); خطيراً؟", a: 1, opts: ["gets أبطأ من fgets", "gets لا تتحقق من الحجم مما يسبب buffer overflow", "buf صغير جداً دائماً", "gets لا تقرأ المسافات"], d: 2 },
    { q: "ما الذي يحدث بعد: free(ptr); *ptr = 5;", a: 2, opts: ["يعمل بشكل طبيعي", "خطأ في التجميع", "سلوك غير محدد: Use-After-Free", "ptr تصبح NULL تلقائياً"], d: 2 },
    { q: "كيف تُنفّذ ملفاً في C بدون execve مباشرة؟", a: 0, opts: ["system(\"ls\") أو popen()", "يستحيل", "fopen + exec", "read() فقط"], d: 3 },
    { q: "ما الفرق بين الملف النصي والثنائي في C؟", a: 1, opts: ["لا فرق جوهري", "النصي يُحوّل \\n حسب النظام والثنائي لا يُحوّل", "الثنائي أكبر دائماً", "النصي لا يدعم الأرقام"], d: 2 },
    { q: "متى تستخدم memmove بدلاً من memcpy؟", a: 2, opts: ["دائماً memmove أفضل", "عند الكتابة في اتجاه واحد", "عند احتمال تداخل مناطق المصدر والوجهة", "memmove للأحرف فقط"], d: 3 },
    { q: "ما الفرق بين fork() وexec() في C؟", a: 1, opts: ["لا فرق", "fork يُنشئ عملية ابن وexec يستبدل صورة العملية", "exec يُنشئ عملية وfork يُنهيها", "كلاهما لتشغيل البرامج بنفس الطريقة"], d: 3 },
    { q: "ما أساسي خيط POSIX Thread في C؟", a: 0, opts: ["pthread_create + pthread_join", "thread_new + thread_wait", "fork + wait", "clone + exec"], d: 3 },
    { q: "لماذا نستخدم volatile في البرمجة المدمجة؟", a: 2, opts: ["لتسريع الكود", "لتجنب أخطاء الترجمة", "لإخبار المترجم أن القيمة قد تتغير خارجياً من ISR أو hardware", "volatile مهمل في C الحديثة"], d: 3 }
  ];

  return topics.map((item, i) => ({
    target_level_index: i < 9 ? 1 : 2,
    kind: "mcq",
    prompt: item.q,
    choices: item.opts,
    correct_index: item.a,
    difficulty: item.d,
    explanation: `هذا السؤال يقيس الكفاءة في C للمستوى ${i < 9 ? 1 : 2}`
  }));
}

function buildFullFile() {
  const unitExamBanks = {};
  const stageExamBanks = {};
  const levelExamBanks = {};
  const levels = [];

  for (const levelDef of CURRICULUM.levels) {
    const stages = [];

    for (const stageDef of levelDef.stages) {
      const units = [];

      for (const unitDef of stageDef.units) {
        const lessons = unitDef.lessons.map((lesson, lessonIndex) => ({
          lesson_index: lessonIndex + 1,
          name: lesson.name,
          goal: makeGoal(lesson.name, unitDef.name),
          bridge_sentence: makeBridge(lesson.name, lessonIndex, unitDef.name),
          prerequisite_lessons: [],
          enables_lessons: [],
          concepts: makeConcepts(lesson.primary, lesson.name),
          common_mistakes: makeMistakes(lesson.primary, unitDef.name),
          yemeni_examples: makeExamples(lesson.primary, unitDef.name),
          final_check_question: makeExamQuestion(lesson.name, lesson.primary),
          session_complete_criterion: `يستطيع المتعلم كتابة كود C صحيح يُوظّف "${lesson.name}" في مهمة حقيقية دون مساعدة وبمستوى احترافي`,
          expected_duration_minutes: 45,
          motivation_hook: `إتقان "${lesson.name}" يجعلك تكتب C بثقة المحترف وسيُفرّق بين كودك وكود المبتدئين في كل مشروع`,
          learning_objectives: [
            { statement: `فهم ${lesson.primary.split(" ").slice(0, 3).join(" ")} نظرياً وتطبيقياً في C`, bloom_level: "understand" },
            { statement: `تطبيق ${lesson.primary.split(" ")[0]} في كود C حقيقي يُترجم ويعمل بأمان`, bloom_level: "apply" }
          ],
          solution_outline: `فهم ${lesson.primary}، كتابة مثال بسيط يُترجم، تطبيقه على مشكلة حقيقية، التحقق بـ Valgrind`
        }));

        const lab = makeLabForUnit(unitDef);
        const exam = makeUnitExamQuestions(
          unitDef.code, unitDef,
          stageDef.unit_exam_defaults.pass_threshold_percent,
          stageDef.unit_exam_defaults.time_limit_minutes
        );

        unitExamBanks[unitDef.code] = { variants: [exam.questions] };

        units.push({
          unit_index: unitDef.unit_index,
          name: unitDef.name,
          goal: unitDef.goal,
          key_concepts: unitDef.key_concepts,
          prerequisite_units: [],
          enables_units: [],
          exam: {
            pass_threshold_percent: stageDef.unit_exam_defaults.pass_threshold_percent,
            time_limit_minutes: stageDef.unit_exam_defaults.time_limit_minutes
          },
          lessons,
          labs: [lab]
        });
      }

      const stageCode = `${levelDef.level_index}.${stageDef.stage_index}`;
      const stageExam = makeStageExamQuestions(stageDef);
      stageExamBanks[stageCode] = { variants: [stageExam.questions] };

      stages.push({
        stage_index: stageDef.stage_index,
        name: stageDef.name,
        goal: stageDef.goal,
        bloom_focus: stageDef.bloom_focus,
        exam: stageDef.exam,
        units
      });
    }

    const levelExam = makeLevelExamQuestions(levelDef);
    levelExamBanks[`${levelDef.level_index}`] = { variants: [levelExam.questions] };

    levels.push({
      level_index: levelDef.level_index,
      name: levelDef.name,
      goal: levelDef.goal,
      bloom_focus: levelDef.bloom_focus,
      exam: levelDef.exam,
      stages
    });
  }

  const placementQuestions = makePlacementTest();

  return {
    schema_version: CURRICULUM.schema_version,
    specialty: {
      slug: CURRICULUM.slug,
      name: CURRICULUM.name,
      icon: CURRICULUM.icon,
      description: CURRICULUM.description,
      target_persona: CURRICULUM.target_persona,
      teacher_tone: CURRICULUM.teacher_tone,
      allowed_viz_templates: CURRICULUM.allowed_viz_templates,
      allowed_tools: CURRICULUM.allowed_tools
    },
    levels,
    exam_banks: {
      unit_banks: unitExamBanks,
      stage_banks: stageExamBanks,
      level_banks: levelExamBanks
    },
    placement_test_questions: placementQuestions
  };
}

console.log("توليد ملف c-instruction.json...");
const result = buildFullFile();
const json = JSON.stringify(result);
writeFileSync("c-instruction.json", json, "utf8");
const sizeKB = Math.round(json.length / 1024);

const totalLessons = result.levels.reduce((acc, l) =>
  acc + l.stages.reduce((a2, s) =>
    a2 + s.units.reduce((a3, u) => a3 + u.lessons.length, 0), 0), 0);
const totalUnits = result.levels.reduce((acc, l) =>
  acc + l.stages.reduce((a2, s) => a2 + s.units.length, 0), 0);
const totalStages = result.levels.reduce((acc, l) => acc + l.stages.length, 0);
const totalLabs = totalUnits;

console.log(`\n✅ تم التوليد بنجاح!`);
console.log(`📦 الحجم: ${sizeKB} KB`);
console.log(`📚 المستويات: ${result.levels.length}`);
console.log(`🗂️  المراحل: ${totalStages}`);
console.log(`📁 الوحدات: ${totalUnits}`);
console.log(`📖 الدروس: ${totalLessons}`);
console.log(`🧪 المعامل: ${totalLabs}`);
console.log(`📊 الدروس + المعامل: ${totalLessons + totalLabs}`);
console.log(`📝 أسئلة Placement: ${result.placement_test_questions.length}`);
