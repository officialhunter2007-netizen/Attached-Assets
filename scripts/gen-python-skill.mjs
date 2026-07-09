import { writeFileSync } from "fs";

const CURRICULUM = {
  schema_version: "v4.1",
  slug: "python",
  name: "لغة Python",
  icon: "🐍",
  description: "مسار متكامل لتعلم Python من الصفر حتى الاحتراف — يبدأ بالتركيب الأساسي ويصل إلى البرمجة غير المتزامنة وبناء APIs حقيقية ومشاريع البيانات، بتسلسل منطقي مريح يضمن بقاء المتعلم متحفزاً طوال رحلة التعلم",
  target_persona: "مبرمج Python يسعى لإتقان اللغة من أسسها حتى تطبيقاتها المتقدمة، سواء كان مبتدئاً يبحث عن بداية صحيحة أو مطوراً يريد تعميق فهمه وبناء مشاريع حقيقية في مجالات الأتمتة والبيانات والويب",
  teacher_tone: "مبرمج Python خبير يشرح بأسلوب عملي مباشر، يبدأ كل مفهوم بمثال كودي حقيقي يعمل فور تنفيذه، يتحدى الطالب بأسئلة 'توقّع ثم نفّذ'، ويربط كل ميزة لغوية بمشكلة حقيقية يحلها المطور في سوق العمل",
  allowed_viz_templates: ["flowchart", "comparison_table", "architecture_diagram", "timeline", "network_diagram"],
  allowed_tools: ["nukhba_ide_python", "nukhba_ide_js", "regex_playground"],
  levels: [
    {
      level_index: 1,
      name: "أساسيات Python والبرمجة الإجرائية",
      goal: "بناء قاعدة صلبة في Python تشمل بيئة التطوير والتركيب الأساسي وأنواع البيانات والتحكم في التدفق والدوال وهياكل البيانات والملفات والمكتبات القياسية، بما يُمكّن المتعلم من بناء برامج مستقلة وقابلة للقراءة والصيانة",
      bloom_focus: "apply",
      exam: { pass_threshold_percent: 70, time_limit_minutes: 60 },
      stages: [
        {
          stage_index: 1,
          name: "البيئة والتركيب الأساسي",
          goal: "إعداد بيئة Python الاحترافية وفهم بنية البرنامج وقواعد الكتابة وآليات الإدخال والإخراج ودورة التطوير من كتابة الكود حتى تنفيذه",
          bloom_focus: "understand",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 20 },
          units: [
            {
              unit_index: 1, code: "1.1.1",
              name: "تثبيت Python وإعداد البيئة",
              goal: "إعداد بيئة تطوير Python احترافية كاملة تشمل المترجم وبيئة افتراضية وإضافات محرر الكود",
              key_concepts: ["Python Interpreter","Virtual Environment","pip","IDE Setup","PATH Configuration"],
              lessons: [
                { name: "ما هو Python ولماذا نتعلمه الآن", primary: "Python language history popularity use cases jobs" },
                { name: "تثبيت Python على Windows وMac وLinux", primary: "Python installation operating systems download setup" },
                { name: "فهم مترجم Python والـ REPL التفاعلي", primary: "Python interpreter REPL interactive shell execution" },
                { name: "إعداد VS Code مع امتدادات Python", primary: "VS Code Python extension pylance debugger setup" },
                { name: "البيئات الافتراضية venv وإدارتها", primary: "virtual environment venv creation activation isolation" },
                { name: "pip لتثبيت الحزم وإدارة التبعيات", primary: "pip install packages requirements.txt dependency management" },
                { name: "تشغيل أول سكريبت Python من سطر الأوامر", primary: "run Python script command line terminal execution" },
                { name: "Jupyter Notebook للتجارب التفاعلية", primary: "Jupyter notebook cells interactive Python exploration" },
                { name: "هيكل المشروع والملفات في Python", primary: "Python project structure files modules organization" },
                { name: "استكشاف الأخطاء الشائعة عند الإعداد", primary: "Python setup errors PATH issues version conflicts troubleshooting" }
              ]
            },
            {
              unit_index: 2, code: "1.1.2",
              name: "أول برنامج وتركيب Python الأساسي",
              goal: "فهم بنية برنامج Python وقواعد الكتابة والمسافات البادئة والتعليقات وطريقة تنظيم الكود",
              key_concepts: ["Indentation","Syntax Rules","Comments","print()","Statements"],
              lessons: [
                { name: "برنامج 'مرحباً بالعالم' وكيف يعمل", primary: "hello world print statement Python execution flow" },
                { name: "المسافة البادئة في Python: القاعدة الذهبية", primary: "indentation Python syntax rule blocks spaces tabs" },
                { name: "التعليقات السطرية والمتعددة الأسطر", primary: "comments single line multi-line docstring Python" },
                { name: "العبارات والتعبيرات والفرق بينهما", primary: "statements expressions Python evaluation difference" },
                { name: "كسر الأسطر الطويلة وتنظيم الكود", primary: "line continuation backslash parentheses Python style" },
                { name: "الكلمات المحجوزة في Python", primary: "Python keywords reserved words list meaning" },
                { name: "أسلوب الكتابة PEP 8 والكود النظيف", primary: "PEP8 style guide naming conventions clean code" },
                { name: "الأخطاء الشائعة في التركيب ورسائل الخطأ", primary: "syntax errors IndentationError SyntaxError reading messages" },
                { name: "تشغيل الكود خطوة بخطوة بالمُصحح", primary: "debugger step through breakpoints VS Code Python" },
                { name: "الفرق بين Python 2 وPython 3 وأهمية Python 3", primary: "Python 2 vs 3 differences print unicode division" }
              ]
            },
            {
              unit_index: 3, code: "1.1.3",
              name: "الإدخال والإخراج الأساسي",
              goal: "إتقان دوال print() وinput() وتنسيق المخرجات بطرق مختلفة للتفاعل مع المستخدم",
              key_concepts: ["print()","input()","sep","end","Output Formatting"],
              lessons: [
                { name: "دالة print() وكل خياراتها", primary: "print function sep end file flush parameters" },
                { name: "دالة input() وقراءة مدخلات المستخدم", primary: "input function user input string reading" },
                { name: "تحويل مدخلات المستخدم إلى أرقام", primary: "input conversion int float type casting user input" },
                { name: "التنسيق بـ % operator القديم", primary: "string formatting percent operator old style printf" },
                { name: "التنسيق بـ str.format() الحديث", primary: "string format method positional keyword arguments" },
                { name: "f-strings: أسرع وأوضح طريقة للتنسيق", primary: "f-strings formatted string literals expressions" },
                { name: "تنسيق الأرقام: العشري والعلمي والعملات", primary: "number formatting decimal scientific currency format spec" },
                { name: "المحاذاة والتعبئة في تنسيق النصوص", primary: "string alignment fill width left right center format" },
                { name: "الطباعة اللونية في سطر الأوامر", primary: "ANSI colors terminal output colorama library print" },
                { name: "برنامج حاسبة بسيطة: تجميع ما تعلمت", primary: "calculator program input output print format complete" }
              ]
            },
            {
              unit_index: 4, code: "1.1.4",
              name: "المتغيرات والتعيين",
              goal: "فهم المتغيرات في Python كمراجع للكائنات وليست صناديق ذاكرة وإدارة التعيين المتعدد والأسماء الصحيحة",
              key_concepts: ["Variables","Assignment","References","Object Identity","Multiple Assignment"],
              lessons: [
                { name: "المتغير في Python: مرجع لا صندوق", primary: "Python variable reference object memory model id()" },
                { name: "قواعد تسمية المتغيرات وأفضل الممارسات", primary: "variable naming rules conventions snake_case meaningful names" },
                { name: "التعيين البسيط والمتعدد في سطر واحد", primary: "assignment multiple variables unpacking tuple assignment" },
                { name: "التعيين المعزز: +=، -=، *=، /=", primary: "augmented assignment operators compound assignment Python" },
                { name: "المتغيرات والنوع الديناميكي في Python", primary: "dynamic typing duck typing type() isinstance() Python" },
                { name: "id() وis والفرق بين == و is", primary: "identity equality is operator id() Python comparison" },
                { name: "المتغيرات المحلية والعالمية نظرة أولى", primary: "local global variables scope first look Python" },
                { name: "ثبات وقابلية التغيير: mutable vs immutable", primary: "mutable immutable objects list tuple Python difference" },
                { name: "حذف المتغيرات بـ del وجامع القمامة", primary: "del statement garbage collection reference counting Python" },
                { name: "أسماء خاصة بالشرطة السفلية في Python", primary: "underscore variable names private convention _ __ Python" }
              ]
            },
            {
              unit_index: 5, code: "1.1.5",
              name: "أنواع البيانات الأساسية",
              goal: "التمييز بين الأنواع الأساسية في Python والتحويل بينها واستخدام كل نوع في سياقه الصحيح",
              key_concepts: ["int","float","bool","str","NoneType","Type Conversion"],
              lessons: [
                { name: "النوع int وحدوده اللامتناهية في Python", primary: "int type arbitrary precision big integers Python" },
                { name: "النوع float والدقة العائمة وأخطاءها الشهيرة", primary: "float floating point precision errors 0.1+0.2 IEEE754" },
                { name: "النوع bool وعلاقته بـ int", primary: "bool boolean True False int relationship truthiness" },
                { name: "القيمة None وما تعنيه في Python", primary: "None NoneType null absence value Python meaning" },
                { name: "التحويل الصريح والضمني بين الأنواع", primary: "type conversion explicit implicit int float str bool" },
                { name: "دالة type() وdisinstance() وتحقق الأنواع", primary: "type isinstance type checking Python duck typing" },
                { name: "الأعداد المركبة complex في Python", primary: "complex numbers real imaginary Python cmath" },
                { name: "Decimal وFraction للحسابات الدقيقة", primary: "Decimal Fraction module precise calculations Python" },
                { name: "قيم الحقيقة Truthiness لكل نوع", primary: "truthiness falsy truthy values bool() Python all types" },
                { name: "نظم الترقيم: ثنائي وثماني وست عشري", primary: "binary octal hexadecimal number systems 0b 0o 0x Python" }
              ]
            },
            {
              unit_index: 6, code: "1.1.6",
              name: "العمليات الحسابية والمنطقية",
              goal: "إتقان كل عمليات Python الحسابية والمنطقية والمقارنة وأولوياتها وتطبيقها في حسابات حقيقية",
              key_concepts: ["Arithmetic Operators","Comparison Operators","Logical Operators","Operator Precedence","Bitwise"],
              lessons: [
                { name: "العمليات الحسابية الأساسية وعامل القسمة الصحيحة", primary: "arithmetic operators + - * / // % ** integer division" },
                { name: "عملية القوة ** وجذر المربع", primary: "power operator exponentiation ** math.sqrt Python" },
                { name: "عامل الباقي % وتطبيقاته العملية", primary: "modulo operator % remainder even odd applications" },
                { name: "عوامل المقارنة ==، !=، <، >، <=، >=", primary: "comparison operators equal not equal greater less Python" },
                { name: "العوامل المنطقية and، or، not", primary: "logical operators and or not boolean logic Python" },
                { name: "الربط بالسلسلة في المقارنات: 1 < x < 10", primary: "chained comparisons Python 1 < x < 10 between range" },
                { name: "قصر الدائرة Short-circuit في and وor", primary: "short circuit evaluation and or lazy evaluation Python" },
                { name: "أولوية العمليات وكيفية تذكرها", primary: "operator precedence PEMDAS order operations Python" },
                { name: "العمليات على البتات: &، |، ^، ~، <<، >>", primary: "bitwise operators AND OR XOR NOT shift Python" },
                { name: "تمارين: حساب الفواتير والفائدة والتحويلات", primary: "practical calculations tax discount interest conversion" }
              ]
            },
            {
              unit_index: 7, code: "1.1.7",
              name: "النصوص الأساسية str",
              goal: "فهم النصوص في Python كقيم غير قابلة للتغيير وإجراء العمليات الأساسية عليها بكفاءة",
              key_concepts: ["String Immutability","String Indexing","String Slicing","String Methods","Escape Characters"],
              lessons: [
                { name: "النصوص: تعريفها وأنواع علامات الاقتباس", primary: "string definition single double triple quotes Python" },
                { name: "الفهرسة: الوصول لحرف بموضعه الموجب والسالب", primary: "string indexing positive negative index characters Python" },
                { name: "التقطيع Slicing: start:stop:step", primary: "slicing start stop step negative stride string Python" },
                { name: "دمج النصوص + والتكرار *", primary: "string concatenation multiplication repetition Python" },
                { name: "طول النص len() والمرور عليه بـ for", primary: "len() string length iteration for loop characters" },
                { name: "أحرف الهروب \\n، \\t، \\\\، \\'", primary: "escape characters newline tab backslash raw strings" },
                { name: "النصوص الخام raw strings وتطبيقاتها", primary: "raw strings r prefix regex file paths backslash" },
                { name: "فحص المحتوى: in، not in، startswith()، endswith()", primary: "string membership in contains startswith endswith" },
                { name: "عدم قابلية التغيير وما يعنيه عملياً", primary: "string immutability new object replace concatenation" },
                { name: "تمارين: برنامج تحليل جمل وعدّ كلمات", primary: "word count sentence analysis string manipulation project" }
              ]
            },
            {
              unit_index: 8, code: "1.1.8",
              name: "طرق النصوص ومعالجتها",
              goal: "إتقان أهم طرق النصوص في Python للتحويل والبحث والتنظيف والتقسيم والدمج",
              key_concepts: ["upper()","split()","join()","replace()","strip()","find()"],
              lessons: [
                { name: "تحويل الحالة: upper، lower، title، capitalize", primary: "string case upper lower title capitalize swapcase" },
                { name: "البحث: find، index، count، rfind", primary: "string search find index count rfind Python" },
                { name: "الاستبدال: replace وsub من regex", primary: "string replace substitution regex sub Python" },
                { name: "التنظيف: strip، lstrip، rstrip من المسافات", primary: "string strip lstrip rstrip whitespace cleaning" },
                { name: "التقسيم: split وrsplit وsplitlines", primary: "string split rsplit splitlines delimiter parsing" },
                { name: "الدمج: join الطريقة الصحيحة والفعّالة", primary: "string join list concatenation efficient Python" },
                { name: "التحقق: isdigit، isalpha، isspace، isalnum", primary: "string validation isdigit isalpha isspace isalnum" },
                { name: "المحاذاة: center، ljust، rjust، zfill", primary: "string alignment padding center ljust rjust zfill" },
                { name: "encode وdecode: التعامل مع Unicode وUTF-8", primary: "string encoding decoding UTF-8 Unicode bytes Python" },
                { name: "مشروع: منظّف وحلل النصوص العربية والإنجليزية", primary: "text processor Arabic English normalization cleaning project" }
              ]
            },
            {
              unit_index: 9, code: "1.1.9",
              name: "الأعداد المتقدمة والحسابات الدقيقة",
              goal: "التعامل مع الأعداد الكبيرة والعمليات المتقدمة ومعالجة أخطاء الدقة العائمة في التطبيقات الحقيقية",
              key_concepts: ["Arbitrary Precision","Floating Point Errors","math Module","Decimal","round()"],
              lessons: [
                { name: "مكتبة math وأهم دوالها", primary: "math module sqrt ceil floor log sin cos pi" },
                { name: "round() وآليات التقريب في Python", primary: "round() banker rounding half even Python behavior" },
                { name: "abs()، min()، max()، sum() المضمّنة", primary: "abs min max sum built-in functions numbers Python" },
                { name: "divmod() وتوزيع القسمة", primary: "divmod quotient remainder tuple Python" },
                { name: "pow() الثلاثية المعاملات والعمليات المودولار", primary: "pow three arguments modular arithmetic cryptography" },
                { name: "مكتبة Decimal للحسابات المالية", primary: "Decimal module financial calculations precision context" },
                { name: "مكتبة Fraction للكسور الدقيقة", primary: "Fraction module rational numbers exact arithmetic" },
                { name: "مكتبة statistics للإحصاء البسيط", primary: "statistics module mean median mode stdev Python" },
                { name: "مكتبة random لتوليد الأعداد العشوائية", primary: "random module randint choice shuffle seed Python" },
                { name: "تمارين: برنامج حاسبة علمية بالخيارات", primary: "scientific calculator menu-driven program Python complete" }
              ]
            },
            {
              unit_index: 10, code: "1.1.10",
              name: "مشروع المرحلة الأولى: برنامج تفاعلي متكامل",
              goal: "تجميع كل مفاهيم المرحلة الأولى في برنامج تفاعلي حقيقي يستخدم الإدخال والإخراج والحسابات والنصوص",
              key_concepts: ["Project Integration","Input Validation","User Interface","Code Organization","Testing"],
              lessons: [
                { name: "تخطيط البرنامج: تحديد المتطلبات والمخرجات", primary: "program planning requirements output design specification" },
                { name: "بناء قائمة رئيسية تفاعلية للمستخدم", primary: "interactive menu user interface while loop Python" },
                { name: "التحقق من صحة مدخلات المستخدم", primary: "input validation try except isdigit user input check" },
                { name: "فصل الكود إلى وحدات منطقية", primary: "code organization functions separation concerns Python" },
                { name: "مثال: برنامج محول العملات والمقاييس", primary: "currency converter unit converter program Python" },
                { name: "مثال: برنامج اختبار الحساب الذهني", primary: "arithmetic quiz timer random questions Python" },
                { name: "مثال: برنامج إدارة قائمة مهام بسيطة", primary: "todo list manager add remove display Python" },
                { name: "إضافة الألوان وتحسين تجربة المستخدم", primary: "colorama ANSI colors terminal UX Python enhancement" },
                { name: "اختبار البرنامج يدوياً وتتبع الأخطاء", primary: "manual testing debugging print statements tracing Python" },
                { name: "مراجعة الكود وتطبيق PEP 8 ورفعه لـ GitHub", primary: "code review PEP8 linting flake8 GitHub upload" }
              ]
            }
          ]
        },
        {
          stage_index: 2,
          name: "التحكم في التدفق",
          goal: "إتقان جميع آليات التحكم في Python من شروط وحلقات وكسر التدفق وأنماط التكرار المتقدمة لبناء منطق برمجي قوي ومقروء",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 20 },
          units: [
            {
              unit_index: 1, code: "1.2.1",
              name: "الشروط if وelif وelse",
              goal: "كتابة شروط صحيحة ومقروءة باستخدام if وelif وelse في سياقات متنوعة ومعقدة",
              key_concepts: ["if statement","elif","else","Boolean Conditions","Nested Conditions"],
              lessons: [
                { name: "if البسيط: اتخاذ قرار واحد", primary: "if statement condition boolean decision Python" },
                { name: "if-else: طريقان لا ثالث لهما", primary: "if else two branches decision Python" },
                { name: "if-elif-else: مسارات متعددة", primary: "elif multiple branches conditions chain Python" },
                { name: "الشروط المتداخلة وكيفية تجنبها", primary: "nested if conditions deep nesting avoid flatten" },
                { name: "الشروط المركبة بـ and وor وnot", primary: "compound conditions and or not boolean logic Python" },
                { name: "التعبير الثلاثي: x if cond else y", primary: "ternary operator conditional expression Python one-liner" },
                { name: "مطابقة الأنماط match-case (Python 3.10+)", primary: "match case structural pattern matching Python 3.10" },
                { name: "قراءة شروط الآخرين وإعادة كتابتها", primary: "refactoring conditions readability guard clauses Python" },
                { name: "شروط الحماية Guard Clauses لكود نظيف", primary: "guard clauses early return defensive programming Python" },
                { name: "تمارين: آلة البيع والتحقق من الأهلية", primary: "vending machine eligibility check conditions Python project" }
              ]
            },
            {
              unit_index: 2, code: "1.2.2",
              name: "حلقة for والمرور على التسلسلات",
              goal: "إتقان حلقة for للمرور على كل نوع من التسلسلات واستخدام الدوال المساعدة range وenumerate وzip",
              key_concepts: ["for loop","Iteration","range()","enumerate()","zip()"],
              lessons: [
                { name: "حلقة for: المرور على كل عنصر", primary: "for loop iteration sequence elements Python" },
                { name: "range(): توليد التسلسلات الرقمية", primary: "range function start stop step integer sequences" },
                { name: "range() سالبة وعكسية والتكرار العكسي", primary: "reverse range negative step countdown Python" },
                { name: "enumerate(): الفهرس والقيمة معاً", primary: "enumerate function index value tuple iteration" },
                { name: "zip(): دمج تسلسلات متعددة معاً", primary: "zip function multiple sequences parallel iteration" },
                { name: "المرور على النصوص حرفاً بحرف", primary: "string iteration character by character for loop" },
                { name: "المرور على القواميس: المفاتيح والقيم", primary: "dictionary iteration keys values items for loop" },
                { name: "حلقات for المتداخلة وجداول الضرب", primary: "nested for loops multiplication table matrix Python" },
                { name: "التفريغ Unpacking داخل حلقة for", primary: "tuple unpacking inside for loop multiple variables" },
                { name: "مشروع: رسم الأشكال الهندسية بالنجوم", primary: "geometric shapes stars for loop nested printing" }
              ]
            },
            {
              unit_index: 3, code: "1.2.3",
              name: "حلقة while والتكرار الشرطي",
              goal: "استخدام while بشكل صحيح وآمن في السيناريوهات التي تستدعي التكرار حتى تحقق شرط ما",
              key_concepts: ["while loop","Infinite Loop","Loop Condition","do-while Pattern","Input Loops"],
              lessons: [
                { name: "while: التكرار حتى يتحقق الشرط", primary: "while loop condition boolean until termination Python" },
                { name: "الحلقة اللانهائية وكيف نتحكم بها", primary: "infinite loop while True break controlled exit Python" },
                { name: "نمط do-while في Python بـ while True", primary: "do while pattern Python while True break first run" },
                { name: "while لقراءة مدخلات صحيحة من المستخدم", primary: "input validation loop while correct input retry Python" },
                { name: "العدّاد وتراكم القيم في while", primary: "counter accumulator while loop running total Python" },
                { name: "نمط البحث: while مع flag بوليانية", primary: "search pattern flag boolean while sentinel value" },
                { name: "while لمحاكاة الألعاب البسيطة", primary: "game loop while simulation guessing game Python" },
                { name: "while مع else: الحالة النادرة المفيدة", primary: "while else clause no break Python use cases" },
                { name: "الفرق بين for وwhile: متى تستخدم كلاً منهما", primary: "for vs while loop choice when to use Python" },
                { name: "تمارين: لعبة تخمين الأرقام", primary: "number guessing game while loop random Python project" }
              ]
            },
            {
              unit_index: 4, code: "1.2.4",
              name: "break وcontinue وpass والتحكم في الحلقات",
              goal: "استخدام أوامر التحكم في الحلقات بشكل صحيح لتحسين الكفاءة وتجنب العمليات غير الضرورية",
              key_concepts: ["break","continue","pass","Loop Control","Early Exit"],
              lessons: [
                { name: "break: الخروج الفوري من الحلقة", primary: "break statement loop exit termination search found" },
                { name: "continue: تخطي التكرار الحالي", primary: "continue statement skip iteration current Python" },
                { name: "pass: العبارة الصامتة والمكان المحجوز", primary: "pass statement placeholder empty block Python" },
                { name: "break في الحلقات المتداخلة: من يخرج؟", primary: "nested loops break inner outer exit Python" },
                { name: "for-else: هل أكمل الحلقة دون break؟", primary: "for else clause Python no break search result" },
                { name: "تحسين الأداء بالخروج المبكر", primary: "early exit break performance optimization Python loop" },
                { name: "نمط البحث الفعّال في قائمة", primary: "linear search loop break found not found pattern" },
                { name: "تصفية البيانات بـ continue", primary: "filter data continue skip invalid records Python" },
                { name: "إعادة هيكلة الحلقات المعقدة", primary: "refactoring complex loops break continue readable Python" },
                { name: "تمارين: فلتر البيانات والبحث المتعدد", primary: "data filtering search multiple criteria Python exercises" }
              ]
            },
            {
              unit_index: 5, code: "1.2.5",
              name: "Comprehensions: القوائم والقواميس والمجموعات",
              goal: "كتابة تعبيرات comprehension مقروءة وفعّالة لتحويل وتصفية البيانات في سطر واحد",
              key_concepts: ["List Comprehension","Dict Comprehension","Set Comprehension","Filter","Transform"],
              lessons: [
                { name: "list comprehension: بناء قوائم بأسلوب Python", primary: "list comprehension for in if expression Python" },
                { name: "الشرط في comprehension للتصفية", primary: "conditional list comprehension filter if clause Python" },
                { name: "comprehension متداخل: جدول ثنائي الأبعاد", primary: "nested list comprehension matrix 2D table Python" },
                { name: "dict comprehension: بناء قواميس بكفاءة", primary: "dictionary comprehension key value transform Python" },
                { name: "set comprehension: مجموعات فريدة بسرعة", primary: "set comprehension unique values filter Python" },
                { name: "generator expression: كفاءة بلا قوائم", primary: "generator expression parentheses lazy evaluation Python" },
                { name: "متى تستخدم comprehension ومتى تتجنبه", primary: "when to use comprehension readability limit Python" },
                { name: "مقارنة الأداء: comprehension vs حلقة عادية", primary: "performance comparison comprehension loop timeit Python" },
                { name: "تحويل البيانات: map وfilter مقابل comprehension", primary: "map filter lambda vs comprehension Python comparison" },
                { name: "تمارين: تحويل وتصفية بيانات الطلاب", primary: "student data transform filter comprehension Python project" }
              ]
            },
            {
              unit_index: 6, code: "1.2.6",
              name: "التكرار الاحترافي مع itertools",
              goal: "استخدام مكتبة itertools لتوليد تسلسلات متقدمة وتركيب حلقات فعّالة دون تكرار كود",
              key_concepts: ["itertools","chain()","product()","combinations()","permutations()","groupby()"],
              lessons: [
                { name: "مكتبة itertools: أدوات التكرار المتقدمة", primary: "itertools module lazy iteration Python overview" },
                { name: "chain(): دمج تسلسلات متعددة", primary: "itertools chain combine multiple iterables Python" },
                { name: "product(): الضرب الديكارتي والتركيبات", primary: "itertools product cartesian product nested loops Python" },
                { name: "combinations() وpermutations()", primary: "itertools combinations permutations counting math" },
                { name: "groupby(): تجميع العناصر المتتالية", primary: "itertools groupby consecutive groups key function" },
                { name: "count() وcycle() وrepeat()", primary: "itertools count cycle repeat infinite sequences Python" },
                { name: "islice() وdropwhile() وtakewhile()", primary: "itertools islice dropwhile takewhile slice filter Python" },
                { name: "starmap() وaccumulate()", primary: "itertools starmap accumulate running total map Python" },
                { name: "تركيب الدوال: from itertools import *", primary: "combining itertools functions pipeline data processing" },
                { name: "تمارين: توليد بيانات اختبار وتحليل سجلات", primary: "test data generation log analysis itertools Python project" }
              ]
            },
            {
              unit_index: 7, code: "1.2.7",
              name: "التعبيرات الشرطية والمقارنة المتقدمة",
              goal: "كتابة شروط احترافية معقدة مع تجنب الأخطاء الشائعة في المقارنة والتحقق من القيم",
              key_concepts: ["Complex Conditions","Truthiness","None Check","in Operator","any() all()"],
              lessons: [
                { name: "any() وall(): فحص مجموعة شروط دفعة واحدة", primary: "any all built-in functions iterable conditions Python" },
                { name: "التحقق من None: is None أم == None؟", primary: "None check is None equality identity Python best practice" },
                { name: "الفحص بـ in للقوائم والقواميس والنصوص", primary: "in operator membership test list dict string Python" },
                { name: "مقارنة الكائنات المعقدة وإعادة تعريف ==", primary: "object comparison __eq__ method custom class Python" },
                { name: "شروط على قيم متعددة: x in {a, b, c}", primary: "multiple value check in set tuple or conditions Python" },
                { name: "الأولوية في الشروط المركبة", primary: "precedence and or not parentheses boolean logic" },
                { name: "تحسين شروط if الطويلة والمعقدة", primary: "simplify complex if conditions refactoring Python" },
                { name: "الأخطاء الشائعة في المقارنة: = vs ==", primary: "assignment vs comparison = == common mistakes Python" },
                { name: "مقارنة الأنواع المختلفة: TypeError والتعامل معه", primary: "type comparison TypeError heterogeneous comparisons Python" },
                { name: "تمارين: نظام تحقق من صلاحيات المستخدم", primary: "user permissions validation conditions Python project" }
              ]
            },
            {
              unit_index: 8, code: "1.2.8",
              name: "نمط المحاولة والخطأ try-except نظرة أولى",
              goal: "التعامل مع حالات الخطأ الشائعة في جسم الحلقات والشروط بشكل دفاعي وصحيح",
              key_concepts: ["try except","ValueError","TypeError","Exception Handling","Defensive Programming"],
              lessons: [
                { name: "لماذا تحدث الأخطاء وما أنواعها الشائعة", primary: "common errors ValueError TypeError ZeroDivision Python" },
                { name: "try-except: الإطار الأساسي للتعامل مع الأخطاء", primary: "try except basic error handling Python syntax" },
                { name: "التقاط أخطاء محددة بدقة", primary: "specific exception catching ValueError TypeError Python" },
                { name: "else في try: ماذا يعمل عند النجاح؟", primary: "try except else clause success path Python" },
                { name: "finally: الكود الذي يعمل دائماً", primary: "finally clause cleanup always runs try except Python" },
                { name: "التحقق قبل التنفيذ LBYL مقابل EAFP", primary: "LBYL EAFP Python philosophy look before you leap" },
                { name: "الرسائل المفيدة عند الخطأ للمستخدم", primary: "user friendly error messages exception str Python" },
                { name: "تسلسل الأخطاء: except كثيرة ومنظمة", primary: "multiple except clauses exception hierarchy Python" },
                { name: "تمرير الأخطاء للأعلى: متى لا تلتقط الخطأ", primary: "re-raise exception propagate when not to catch Python" },
                { name: "تمارين: محول عملات آمن مع معالجة كاملة", primary: "safe currency converter error handling complete Python" }
              ]
            },
            {
              unit_index: 9, code: "1.2.9",
              name: "التكرار والتسلسل بعمق",
              goal: "فهم بروتوكول التكرار في Python وكيف تعمل حلقة for داخلياً مع أي كائن قابل للتكرار",
              key_concepts: ["Iterable Protocol","__iter__","__next__","iter()","next()"],
              lessons: [
                { name: "ما الفرق بين Iterable وIterator؟", primary: "iterable iterator difference protocol Python" },
                { name: "iter() وnext(): يدوياً على أي تسلسل", primary: "iter next manually iterate sequence Python" },
                { name: "كيف تعمل حلقة for داخلياً", primary: "for loop internal mechanism __iter__ __next__ Python" },
                { name: "StopIteration: نهاية التسلسل", primary: "StopIteration exception iterator exhausted Python" },
                { name: "الكائنات القابلة للتكرار في المكتبة القياسية", primary: "built-in iterables range list tuple dict set Python" },
                { name: "list() وtuple() وset() من أي iterable", primary: "list tuple set conversion from iterable Python" },
                { name: "فك الحزمة Unpacking وعلامة *", primary: "unpacking * operator any iterable Python" },
                { name: "الـ lazy evaluation وفوائدها للذاكرة", primary: "lazy evaluation memory efficiency iterator vs list" },
                { name: "sorted() وreversed() على التسلسلات", primary: "sorted reversed key function iterable Python" },
                { name: "تمارين: كتابة range() بسيط يدوياً", primary: "custom range implementation iterator Python exercise" }
              ]
            },
            {
              unit_index: 10, code: "1.2.10",
              name: "مشروع: معالج بيانات بالحلقات والشروط",
              goal: "بناء برنامج حقيقي لمعالجة وتحليل مجموعة بيانات باستخدام كل مفاهيم مرحلة التحكم في التدفق",
              key_concepts: ["Data Processing","Filtering","Transformation","Aggregation","Pipeline"],
              lessons: [
                { name: "تصميم منطق المعالج وهيكل البيانات", primary: "data processor design planning logic Python" },
                { name: "قراءة وتحليل بيانات CSV يدوياً", primary: "CSV manual parsing split strip list Python" },
                { name: "تصفية السجلات غير الصالحة", primary: "data validation filtering invalid records conditions Python" },
                { name: "تحويل وتنميط البيانات", primary: "data transformation normalization string Python" },
                { name: "التجميع والإحصاء: المجموع والمتوسط والعد", primary: "aggregation sum average count statistics Python" },
                { name: "ترتيب النتائج وعرضها بشكل منسق", primary: "sort results formatted output display Python" },
                { name: "إضافة تقرير ملخص للمستخدم", primary: "summary report statistics output Python" },
                { name: "اختبار الحالات الحدية والبيانات الفارغة", primary: "edge cases empty data testing Python" },
                { name: "تحسين الكود بـ comprehensions وitertools", primary: "refactor comprehensions itertools optimization Python" },
                { name: "توثيق البرنامج وإعداد README", primary: "documentation docstring README Python project" }
              ]
            }
          ]
        },
        {
          stage_index: 3,
          name: "الدوال والنطاق",
          goal: "إتقان كتابة الدوال في Python من الأساسيات حتى الدوال المتقدمة مع فهم عميق للنطاق والمعاملات وإعادة القيم والدوال كمواطنين درجة أولى",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 20 },
          units: [
            {
              unit_index: 1, code: "1.3.1",
              name: "تعريف الدوال والاستدعاء الأساسي",
              goal: "كتابة دوال بسيطة ومفيدة باستخدام def وفهم دورة حياة الدالة من التعريف حتى الإرجاع",
              key_concepts: ["def","Function Call","Return Value","Function Body","DRY Principle"],
              lessons: [
                { name: "لماذا الدوال؟ مبدأ DRY وإعادة الاستخدام", primary: "functions DRY principle reuse code organization" },
                { name: "تعريف الدالة بـ def: البنية الكاملة", primary: "def function definition syntax body return Python" },
                { name: "استدعاء الدالة وتمرير الوسيطات", primary: "function call arguments pass values Python" },
                { name: "return: إرجاع قيمة أو لا شيء", primary: "return statement value None implicit Python" },
                { name: "تعدد الإرجاعات وإرجاع tuple", primary: "multiple return values tuple unpacking Python" },
                { name: "الدالة بلا معاملات والدالة بلا return", primary: "function no parameters no return void procedure Python" },
                { name: "توثيق الدالة بـ docstring", primary: "docstring function documentation help() Python" },
                { name: "الدوال المتداخلة: دالة داخل دالة", primary: "nested functions inner outer function Python" },
                { name: "التعليق النوعي Type Hints للدوال", primary: "type hints annotations function parameters return Python" },
                { name: "تمارين: مكتبة دوال رياضية خاصة بك", primary: "math utility functions library Python exercises" }
              ]
            },
            {
              unit_index: 2, code: "1.3.2",
              name: "المعاملات والوسيطات بعمق",
              goal: "إتقان أنواع المعاملات جميعها من موضعية وكلمات مفتاحية وافتراضية وخاصة",
              key_concepts: ["Positional Arguments","Keyword Arguments","Default Values","*args","**kwargs"],
              lessons: [
                { name: "الوسيطات الموضعية والترتيب المهم", primary: "positional arguments order function call Python" },
                { name: "الوسيطات بالكلمات المفتاحية: أوضح واستقل", primary: "keyword arguments named explicit function call Python" },
                { name: "القيم الافتراضية: معاملات اختيارية", primary: "default parameter values optional arguments Python" },
                { name: "الخطأ الكلاسيكي: قائمة كقيمة افتراضية", primary: "mutable default argument list dict bug Python" },
                { name: "*args: عدد غير محدد من الوسيطات", primary: "args variable positional arguments tuple Python" },
                { name: "**kwargs: معاملات مفتاحية غير محددة", primary: "kwargs variable keyword arguments dict Python" },
                { name: "الجمع بين الأنواع: الترتيب الصحيح", primary: "mixing positional keyword args kwargs order Python" },
                { name: "/ و* في تعريف المعاملات (Python 3.8+)", primary: "positional only keyword only slash star Python 3.8" },
                { name: "تفريغ الوسيطات بـ * و**", primary: "unpacking arguments * ** function call list dict Python" },
                { name: "تمارين: دوال مرنة لمعالجة سجلات متنوعة", primary: "flexible functions record processing kwargs Python" }
              ]
            },
            {
              unit_index: 3, code: "1.3.3",
              name: "النطاق وقواعد LEGB",
              goal: "فهم كيف يبحث Python عن الأسماء في النطاقات المختلفة وتجنب أخطاء النطاق الشائعة",
              key_concepts: ["Scope","LEGB Rule","local","global","nonlocal","Closure Scope"],
              lessons: [
                { name: "ما هو النطاق Scope ولماذا يهم؟", primary: "scope namespace variable lookup Python why matters" },
                { name: "قاعدة LEGB: Local Enclosing Global Built-in", primary: "LEGB rule scope resolution order Python" },
                { name: "النطاق المحلي: متغيرات الدالة وحياتها", primary: "local scope function variables lifetime Python" },
                { name: "النطاق العالمي: الجزر والمتغيرات العامة", primary: "global scope variables module level Python" },
                { name: "global: التعديل على متغير عالمي", primary: "global keyword modify global variable function Python" },
                { name: "nonlocal: التعديل في النطاق المحيط", primary: "nonlocal keyword enclosing scope closure Python" },
                { name: "globals() وlocals(): استكشاف النطاقات", primary: "globals locals namespace dict inspection Python" },
                { name: "تسرب النطاق: الخطأ الصامت الشائع", primary: "variable leak scope bug closure Python common mistake" },
                { name: "متغيرات مدمجة Built-in وتجاهل تعريف أسماءها", primary: "built-in names shadowing len list print Python avoid" },
                { name: "تمارين: تعقب النطاق في كود معقد", primary: "scope tracing complex code exercises Python" }
              ]
            },
            {
              unit_index: 4, code: "1.3.4",
              name: "الدوال العودية",
              goal: "فهم العودية وكتابة دوال عودية صحيحة وفعّالة مع معرفة حدودها في Python",
              key_concepts: ["Recursion","Base Case","Recursive Case","Stack Overflow","Memoization"],
              lessons: [
                { name: "ما هي العودية وكيف تفكر فيها", primary: "recursion concept thinking base case Python" },
                { name: "العودية والـ Call Stack: الصورة المرئية", primary: "recursion call stack frames visualization Python" },
                { name: "حالة الأساس: الشرط الذي يوقف العودية", primary: "base case recursion termination condition Python" },
                { name: "مضروب العدد Factorial بالعودية", primary: "factorial recursion n! Python implementation" },
                { name: "سلسلة فيبوناتشي: العودية البطيئة", primary: "Fibonacci recursion exponential time Python" },
                { name: "Memoization: تسريع العودية بالذاكرة", primary: "memoization cache recursion lru_cache Python" },
                { name: "functools.lru_cache: مزخرف التذكر", primary: "lru_cache functools decorator memoization Python" },
                { name: "حد العودية sys.setrecursionlimit", primary: "recursion limit Python stack overflow sys.setrecursionlimit" },
                { name: "العودية الذيلية وتحويلها لحلقة", primary: "tail recursion loop conversion iteration Python" },
                { name: "تمارين: اجتياز شجرة الملفات عودياً", primary: "file tree traversal recursion directory Python project" }
              ]
            },
            {
              unit_index: 5, code: "1.3.5",
              name: "الدوال كمواطنين درجة أولى",
              goal: "استخدام الدوال كقيم تُمرَّر وتُرجَع وتُخزَّن مثل أي نوع بيانات آخر في Python",
              key_concepts: ["First Class Functions","Higher Order Functions","Callbacks","Function References","Strategy Pattern"],
              lessons: [
                { name: "الدوال كقيم: تعيينها لمتغيرات", primary: "functions as values assignment variable first class Python" },
                { name: "تمرير الدوال كوسيطات لدوال أخرى", primary: "passing functions arguments callback higher order Python" },
                { name: "إرجاع الدوال من الدوال", primary: "returning functions factory function Python" },
                { name: "map(): تطبيق دالة على كل عنصر", primary: "map function apply iterable transform Python" },
                { name: "filter(): تصفية بشرط دالة", primary: "filter function predicate iterable Python" },
                { name: "sorted() مع key function مخصصة", primary: "sorted key function custom sort order Python" },
                { name: "lambda: الدوال المجهولة البسيطة", primary: "lambda anonymous function expression Python" },
                { name: "متى تستخدم lambda ومتى تعرّف def", primary: "lambda vs def when to use readability Python" },
                { name: "نمط الاستراتيجية Strategy Pattern بالدوال", primary: "strategy pattern functions interchangeable Python" },
                { name: "تمارين: نظام ترتيب مرن متعدد المعايير", primary: "flexible sorting multiple criteria key function Python" }
              ]
            },
            {
              unit_index: 6, code: "1.3.6",
              name: "الإغلاق Closures والـ Factories",
              goal: "فهم كيف تتذكر الدوال الداخلية متغيرات النطاق المحيط وبناء دوال factories وأنماط إغلاق متقدمة",
              key_concepts: ["Closure","Enclosing Scope","Free Variables","Factory Function","__closure__"],
              lessons: [
                { name: "الإغلاق: الدالة التي تتذكر بيئتها", primary: "closure function remembers enclosing scope Python" },
                { name: "المتغيرات الحرة Free Variables", primary: "free variables closure __closure__ cell Python" },
                { name: "دالة المصنع Factory Function", primary: "factory function closure return inner Python" },
                { name: "إغلاق في حلقة: الخطأ الكلاسيكي", primary: "closure in loop late binding bug Python" },
                { name: "حل خطأ الإغلاق في الحلقة", primary: "closure loop fix default argument cell Python" },
                { name: "الإغلاق للحفاظ على الحالة State", primary: "closure stateful counter mutable state Python" },
                { name: "الإغلاق لإنشاء interfaces خاصة", primary: "closure private interface encapsulation Python" },
                { name: "functools.partial: إغلاق جاهز", primary: "partial function application functools Python" },
                { name: "الإغلاق مقابل الفئات: متى تختار ماذا", primary: "closure vs class state Python when to use" },
                { name: "تمارين: بناء نظام middleware بالإغلاق", primary: "middleware chain closure factory Python project" }
              ]
            },
            {
              unit_index: 7, code: "1.3.7",
              name: "الدوال العليا وfunctools",
              goal: "استخدام مكتبة functools بكفاءة لبناء دوال متقدمة ومحسّنة ومنظمة",
              key_concepts: ["functools","reduce()","partial()","wraps()","cmp_to_key()","total_ordering"],
              lessons: [
                { name: "مكتبة functools: نظرة عامة", primary: "functools module overview higher order Python" },
                { name: "reduce(): تجميع القيم بدالة ثنائية", primary: "reduce functools fold aggregate binary function Python" },
                { name: "partial(): ربط وسيطات لدالة موجودة", primary: "partial function application currying functools Python" },
                { name: "wraps(): الحفاظ على هوية الدالة في المزخرف", primary: "wraps functools decorator metadata preservation Python" },
                { name: "lru_cache وcache: التذكر الذكي", primary: "lru_cache cache functools memoization maxsize Python" },
                { name: "total_ordering: تعريف كامل المقارنة بأقل", primary: "total_ordering functools comparison operators Python" },
                { name: "cmp_to_key: تحويل دالة مقارنة قديمة", primary: "cmp_to_key legacy sort comparison functools Python" },
                { name: "singledispatch: دوال متعددة الأنواع", primary: "singledispatch functools polymorphism type dispatch Python" },
                { name: "تركيب الدوال: pipe وcompose patterns", primary: "function composition pipe compose pattern Python" },
                { name: "تمارين: بناء pipeline معالجة بيانات مرن", primary: "data pipeline composition functools Python project" }
              ]
            },
            {
              unit_index: 8, code: "1.3.8",
              name: "التوثيق والتعليقات النوعية",
              goal: "كتابة توثيق احترافي للدوال وإضافة تلميحات الأنواع لتحسين قابلية القراءة والصيانة",
              key_concepts: ["Type Hints","Docstrings","mypy","typing module","Annotations"],
              lessons: [
                { name: "أهمية التوثيق: لماذا يهم من اليوم الأول", primary: "documentation importance code readability maintenance Python" },
                { name: "Docstrings: تنسيقات Google وNumPy وSphinx", primary: "docstrings formats Google NumPy Sphinx Python" },
                { name: "تلميحات الأنواع البسيطة: int str float", primary: "type hints basic int str float bool Python" },
                { name: "تلميحات الأنواع المعقدة: List Dict Optional", primary: "type hints complex List Dict Optional Union typing" },
                { name: "مكتبة typing: أنواع خاصة متقدمة", primary: "typing module Tuple Callable Any TypeVar Union Python" },
                { name: "mypy: فاحص الأنواع الثابت", primary: "mypy static type checker Python annotations errors" },
                { name: "Callable وGenerator في التلميحات", primary: "Callable Generator Iterator typing Python hints" },
                { name: "TypeVar للدوال العامة Generics", primary: "TypeVar generic functions polymorphic typing Python" },
                { name: "pyright وpylance في VS Code", primary: "pyright pylance type checking VS Code Python" },
                { name: "تمارين: توثيق مكتبة دوال كاملة", primary: "document function library type hints docstrings Python" }
              ]
            },
            {
              unit_index: 9, code: "1.3.9",
              name: "الدوال في الاختبار والجودة نظرة أولى",
              goal: "كتابة دوال قابلة للاختبار وتجنب الآثار الجانبية Side Effects وتطبيق مبادئ الدوال النظيفة",
              key_concepts: ["Pure Functions","Side Effects","Testability","unittest","assert"],
              lessons: [
                { name: "الدالة النظيفة: نفس الإدخال = نفس الخرج", primary: "pure function deterministic no side effects Python" },
                { name: "الآثار الجانبية: ما هي ومتى تقبلها", primary: "side effects IO state global mutation Python" },
                { name: "تصميم الدوال القابلة للاختبار", primary: "testable functions design dependency injection Python" },
                { name: "assert: التحقق السريع أثناء التطوير", primary: "assert statement debugging invariants Python" },
                { name: "unittest الأساسي: كتابة أول اختبار", primary: "unittest basic test case assertEqual Python" },
                { name: "تنظيم ملفات الاختبار في المشروع", primary: "test files organization structure Python project" },
                { name: "اختبار الحالات الحدية للدوال", primary: "edge cases boundary testing functions Python" },
                { name: "mock وstub: عزل الاعتماديات", primary: "mock stub unittest.mock patch Python testing" },
                { name: "التطوير المدفوع بالاختبار TDD مبادئ", primary: "TDD test driven development red green refactor Python" },
                { name: "تمارين: اختبار مكتبة حسابية كاملة", primary: "test math library complete unittest Python project" }
              ]
            },
            {
              unit_index: 10, code: "1.3.10",
              name: "مشروع: بناء مكتبة دوال احترافية",
              goal: "تصميم وبناء مكتبة دوال متماسكة موثقة ومختبرة ومرفوعة كحزمة Python",
              key_concepts: ["Library Design","API Design","Package Structure","Documentation","Distribution"],
              lessons: [
                { name: "تصميم واجهة المكتبة: ما تُظهره وما تخفيه", primary: "library API design public private interface Python" },
                { name: "هيكل الحزمة: __init__.py والمجلدات", primary: "package structure __init__.py modules Python" },
                { name: "بناء مكتبة دوال نصية متقدمة", primary: "text utility library Arabic English Python" },
                { name: "بناء مكتبة دوال تحقق صحة البيانات", primary: "validation library email phone URL Python" },
                { name: "بناء مكتبة دوال تحويل الوحدات", primary: "unit conversion library temperature length Python" },
                { name: "إضافة exceptions مخصصة للمكتبة", primary: "custom exceptions library error types Python" },
                { name: "كتابة اختبارات شاملة للمكتبة", primary: "comprehensive tests library unittest Python" },
                { name: "إنشاء setup.py وpyproject.toml", primary: "package setup pyproject.toml setuptools Python" },
                { name: "نشر المكتبة على PyPI (تجريبي)", primary: "publish PyPI TestPyPI twine package Python" },
                { name: "توثيق المكتبة بـ README وmkdocs", primary: "README mkdocs documentation site Python library" }
              ]
            }
          ]
        },
        {
          stage_index: 4,
          name: "هياكل البيانات",
          goal: "إتقان هياكل البيانات الأربعة الرئيسية في Python (list وtuple وdict وset) واختيار المناسب منها لكل مهمة وتطبيق عمليات البيانات المتقدمة",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 20 },
          units: [
            {
              unit_index: 1, code: "1.4.1",
              name: "القوائم Lists بعمق",
              goal: "إتقان القوائم في Python بكل عملياتها من الإنشاء والوصول حتى التعديل والفرز والبحث",
              key_concepts: ["List Creation","Indexing","Slicing","append()","sort()","List Methods"],
              lessons: [
                { name: "إنشاء القوائم بطرق مختلفة", primary: "list creation literal comprehension range constructor Python" },
                { name: "الوصول والتقطيع: فهرسة متقدمة", primary: "list indexing slicing negative step Python" },
                { name: "إضافة العناصر: append وinsert وextend", primary: "append insert extend list add elements Python" },
                { name: "حذف العناصر: remove وpop ودel", primary: "remove pop del list delete elements Python" },
                { name: "البحث: index وcount وin", primary: "list search index count in membership Python" },
                { name: "الفرز: sort() وsorted() والفرق بينهما", primary: "sort sorted list in-place key reverse Python" },
                { name: "نسخ القوائم: السطحية والعميقة", primary: "list copy shallow deep copy() slicing Python" },
                { name: "القوائم المتداخلة وعمليات المصفوفات", primary: "nested lists 2D matrix operations Python" },
                { name: "قوائم القوائم: تحويل وتسوية", primary: "list of lists flatten nested transpose Python" },
                { name: "تمارين: نظام قائمة انتظار Priority Queue", primary: "priority queue list implementation Python exercises" }
              ]
            },
            {
              unit_index: 2, code: "1.4.2",
              name: "الصفوف Tuples والبيانات غير القابلة للتغيير",
              goal: "استخدام الصفوف بشكل صحيح كبنية بيانات غير قابلة للتغيير وفهم متى تفضل tuple على list",
              key_concepts: ["Tuple Immutability","Named Tuples","Tuple Packing","Unpacking","Tuple Use Cases"],
              lessons: [
                { name: "إنشاء الصفوف وخاصية الثبات", primary: "tuple creation immutability single element Python" },
                { name: "فك الحزمة Unpacking الأساسي والمتقدم", primary: "tuple unpacking multiple assignment star Python" },
                { name: "الصفوف كمفاتيح في القواميس", primary: "tuple dict key hashable Python use case" },
                { name: "إرجاع قيم متعددة من الدالة", primary: "multiple return values tuple function Python" },
                { name: "namedtuple: صفوف بأسماء حقول", primary: "namedtuple collections named fields readable Python" },
                { name: "الصف مقابل القائمة: متى تختار ماذا", primary: "tuple vs list when to use immutable Python" },
                { name: "الصفوف في تسلسلات البيانات الكبيرة", primary: "tuple memory efficiency large data Python" },
                { name: "الفك المتداخل للصفوف المعقدة", primary: "nested tuple unpacking complex Python" },
                { name: "تحويل بين tuple وlist وset", primary: "conversion tuple list set Python" },
                { name: "تمارين: نظام إحداثيات ونقاط هندسية", primary: "coordinate system geometric points tuples Python" }
              ]
            },
            {
              unit_index: 3, code: "1.4.3",
              name: "القواميس Dicts: البنية الأقوى في Python",
              goal: "إتقان القواميس كهيكل بيانات مركزي في Python من الإنشاء حتى العمليات المتقدمة",
              key_concepts: ["Dict Creation","Key-Value","get()","setdefault()","dict comprehension","Merge"],
              lessons: [
                { name: "إنشاء القواميس بطرق مختلفة", primary: "dict creation literal constructor fromkeys comprehension" },
                { name: "الوصول الآمن: get() وsetdefault()", primary: "dict get setdefault safe access default value Python" },
                { name: "التعديل: إضافة وتحديث وحذف المفاتيح", primary: "dict add update delete pop keys Python" },
                { name: "التكرار: keys وvalues وitems", primary: "dict iteration keys values items for loop Python" },
                { name: "دمج القواميس: update و{**a, **b} والـ | (3.9+)", primary: "dict merge update union operator Python 3.9" },
                { name: "dict comprehension لبناء قواميس ذكية", primary: "dict comprehension transform filter build Python" },
                { name: "القواميس المتداخلة وتعمقها", primary: "nested dict deep access update Python" },
                { name: "defaultdict وOrderedDict من collections", primary: "defaultdict OrderedDict collections module Python" },
                { name: "القاموس كـ switch/dispatch table", primary: "dispatch table dict strategy pattern Python" },
                { name: "تمارين: نظام قاموس لغوي عربي-إنجليزي", primary: "bilingual dictionary Arabic English lookup Python" }
              ]
            },
            {
              unit_index: 4, code: "1.4.4",
              name: "المجموعات Sets والعمليات المنطقية",
              goal: "استخدام المجموعات لعمليات الفريدة والتقاطع والاتحاد والفرق في تحليل البيانات",
              key_concepts: ["Set Creation","Union","Intersection","Difference","frozenset","Set Operations"],
              lessons: [
                { name: "إنشاء المجموعات والفريدة التلقائية", primary: "set creation unique elements Python" },
                { name: "الاتحاد | وintersection & والفرق -", primary: "set union intersection difference operations Python" },
                { name: "الفرق المتماثل ^ والتضمين", primary: "symmetric difference subset superset issubset Python" },
                { name: "إضافة وحذف العناصر: add وremove وdiscard", primary: "set add remove discard pop Python" },
                { name: "frozenset: مجموعة غير قابلة للتغيير", primary: "frozenset immutable hashable dict key Python" },
                { name: "المجموعات لإزالة التكرار بسرعة", primary: "set deduplicate unique values fast Python" },
                { name: "فحص العضوية O(1) مقابل القائمة O(n)", primary: "set membership O(1) vs list O(n) performance" },
                { name: "تحويل القائمة لمجموعة وإعادتها", primary: "list to set conversion dedupe Python" },
                { name: "المجموعات في تحليل التردد والإحصاء", primary: "sets frequency analysis statistics Python" },
                { name: "تمارين: محلل تردد الكلمات والمشترك", primary: "word frequency shared words set analysis Python" }
              ]
            },
            {
              unit_index: 5, code: "1.4.5",
              name: "مجموعات collections المتخصصة",
              goal: "استخدام الهياكل المتخصصة في مكتبة collections لحل مسائل شائعة بشكل أكثر كفاءة",
              key_concepts: ["Counter","deque","defaultdict","ChainMap","OrderedDict"],
              lessons: [
                { name: "Counter: عدّ التكرارات بذكاء", primary: "Counter collections frequency count most_common Python" },
                { name: "deque: طابور ذو رأسين فعّال", primary: "deque double-ended queue collections O(1) Python" },
                { name: "defaultdict: قاموس بقيمة افتراضية", primary: "defaultdict collections default factory Python" },
                { name: "ChainMap: ربط قواميس متعددة", primary: "ChainMap collections multiple dicts lookup Python" },
                { name: "OrderedDict في Python 3.7+: هل لا يزال مفيداً؟", primary: "OrderedDict collections Python 3.7 insertion order" },
                { name: "heapq: الكومة وأولوية العناصر", primary: "heapq heap priority queue min max Python" },
                { name: "array: مصفوفات منخفضة المستوى", primary: "array module typed C-level memory efficient Python" },
                { name: "bisect: البحث الثنائي في القوائم المرتبة", primary: "bisect binary search sorted list insertion Python" },
                { name: "اختيار هيكل البيانات: جدول المقارنة", primary: "data structure comparison list dict set deque Python" },
                { name: "تمارين: محلل سجلات الويب الشامل", primary: "web log analyzer Counter deque defaultdict Python" }
              ]
            },
            {
              unit_index: 6, code: "1.4.6",
              name: "نسخ البيانات والمراجع",
              goal: "فهم الفرق بين النسخ السطحية والعميقة وتأثيرات المراجع على هياكل البيانات القابلة للتغيير",
              key_concepts: ["Shallow Copy","Deep Copy","Reference Semantics","copy module","Memory Sharing"],
              lessons: [
                { name: "القيمة والمرجع: كيف يخزن Python البيانات", primary: "value reference Python memory model object sharing" },
                { name: "الفخ الكلاسيكي: تعديل النسخة يؤثر على الأصل", primary: "aliasing shared reference list mutation Python bug" },
                { name: "النسخ السطحي: [:] وlist() وcopy()", primary: "shallow copy slice list() copy() Python" },
                { name: "النسخ العميق: copy.deepcopy()", primary: "deep copy deepcopy module nested structures Python" },
                { name: "متى تحتاج deepcopy ومتى يكفي shallow", primary: "when deep shallow copy nested mutable Python" },
                { name: "الأداء: نسخ البيانات الكبيرة", primary: "copy performance large data structures Python" },
                { name: "Copy-on-Write في Python: الوهم والحقيقة", primary: "copy on write Python memory optimization behavior" },
                { name: "id() وis لتشخيص مشاكل المراجع", primary: "id is debugging reference sharing Python" },
                { name: "immutable كحل لمشاكل المشاركة", primary: "immutable types tuple frozenset safe sharing Python" },
                { name: "تمارين: تشخيص وإصلاح أخطاء المراجع", primary: "reference bugs diagnosis fix Python exercises" }
              ]
            },
            {
              unit_index: 7, code: "1.4.7",
              name: "الفرز والبحث في هياكل البيانات",
              goal: "تطبيق خوارزميات الفرز والبحث المختلفة واستخدام Python لتنفيذها بكفاءة",
              key_concepts: ["sort()","sorted()","key Function","Binary Search","Search Algorithms"],
              lessons: [
                { name: "الفرز الطبيعي وfstابثبات Stable Sort", primary: "stable sort Python Timsort algorithm guarantee" },
                { name: "key function: فرز بمعيار مخصص", primary: "sort key function custom criteria Python" },
                { name: "فرز القواميس بالمفتاح أو القيمة", primary: "sort dict by key value Python" },
                { name: "فرز الكائنات المعقدة متعددة المعايير", primary: "multi-key sort tuple key complex objects Python" },
                { name: "البحث الخطي: بسيط وموثوق", primary: "linear search list index find Python" },
                { name: "البحث الثنائي: سريع في المرتب", primary: "binary search sorted list bisect Python" },
                { name: "البحث في القواميس O(1) المستمر", primary: "dict lookup O(1) hash table Python" },
                { name: "خوارزميات الفرز: Bubble وMerge وQuick يدوياً", primary: "sorting algorithms bubble merge quick sort Python" },
                { name: "قياس الأداء: timeit على خوارزميات مختلفة", primary: "performance timing timeit comparison Python sort" },
                { name: "تمارين: نظام ترتيب المنتجات متعدد المعايير", primary: "product ranking multi-criteria sorting Python project" }
              ]
            },
            {
              unit_index: 8, code: "1.4.8",
              name: "معالجة JSON وهياكل البيانات",
              goal: "التعامل مع JSON كأكثر تنسيقات تبادل البيانات شيوعاً وربطها بهياكل Python الداخلية",
              key_concepts: ["json module","loads()","dumps()","json.load()","Serialization","Data Exchange"],
              lessons: [
                { name: "ما هو JSON ولماذا هو المعيار السائد", primary: "JSON data exchange standard format history Python" },
                { name: "json.loads(): تحويل نص JSON لبيانات Python", primary: "json loads parse string dict list Python" },
                { name: "json.dumps(): تحويل Python لنص JSON", primary: "json dumps serialize indent sort_keys Python" },
                { name: "json.load() وjson.dump() من الملفات", primary: "json load dump file read write Python" },
                { name: "التخصيص: default وobject_hook", primary: "json default object_hook custom serializer Python" },
                { name: "التعامل مع البيانات المجهولة النوع", primary: "unknown JSON structure dynamic data Python" },
                { name: "التحقق من مخطط JSON: jsonschema", primary: "jsonschema validation Python JSON structure check" },
                { name: "API Response: قراءة وتحليل ردود الـ API", primary: "API response JSON parsing keys values Python" },
                { name: "الأخطاء الشائعة في تحليل JSON", primary: "JSON decode error Unicode keys Python" },
                { name: "تمارين: قاعدة بيانات JSON للمنتجات", primary: "JSON database products CRUD file Python" }
              ]
            },
            {
              unit_index: 9, code: "1.4.9",
              name: "هياكل البيانات في مشاكل حقيقية",
              goal: "اختيار وتطبيق هيكل البيانات المناسب لحل مسائل حقيقية بأقل تعقيد وأعلى أداء",
              key_concepts: ["Problem Solving","Data Structure Selection","Complexity","Real World","Graph","Tree"],
              lessons: [
                { name: "كيف تختار هيكل البيانات الصحيح", primary: "data structure selection criteria complexity Python" },
                { name: "تمثيل الرسوم البيانية Graphs بالقواميس", primary: "graph adjacency list dict Python representation" },
                { name: "تمثيل الأشجار Trees بالقوائم المتداخلة", primary: "tree nested list dict Python representation" },
                { name: "Stack بـ list: LIFO بسيط وفعّال", primary: "stack LIFO list append pop Python" },
                { name: "Queue بـ deque: FIFO احترافي", primary: "queue FIFO deque collections Python" },
                { name: "Trie بالقواميس: بحث نصي سريع", primary: "trie prefix tree dictionary Python implementation" },
                { name: "HashMap مخصص: فهم هاش الجداول", primary: "custom hashmap hash function collision Python" },
                { name: "البيانات الهرمية: التنقل والبحث", primary: "hierarchical data navigation search nested Python" },
                { name: "تحليل التعقيد O(n): كم تكلف كل عملية", primary: "time complexity Big O list dict set Python" },
                { name: "تمارين: حل مسائل LeetCode بـ Python", primary: "LeetCode problems data structures Python solutions" }
              ]
            },
            {
              unit_index: 10, code: "1.4.10",
              name: "مشروع: نظام إدارة بيانات متكامل",
              goal: "بناء نظام إدارة بيانات حقيقي يستخدم هياكل بيانات متعددة مع واجهة سطر أوامر كاملة",
              key_concepts: ["System Design","CRUD Operations","Data Persistence","CLI","Integration"],
              lessons: [
                { name: "تصميم نظام إدارة الطلاب", primary: "student management system design Python" },
                { name: "هيكل البيانات: القاموس والقائمة معاً", primary: "dict list combined data structure student Python" },
                { name: "عمليات CRUD: إضافة وقراءة وتحديث وحذف", primary: "CRUD operations student management Python" },
                { name: "حفظ البيانات في ملف JSON", primary: "data persistence JSON file save load Python" },
                { name: "البحث والفرز والتصفية المتقدمة", primary: "search sort filter advanced data management Python" },
                { name: "الإحصاءات والتقارير التلقائية", primary: "statistics reports summary data analysis Python" },
                { name: "واجهة سطر الأوامر بـ argparse", primary: "CLI argparse command line interface Python" },
                { name: "التحقق من صحة البيانات المدخلة", primary: "input validation data integrity Python" },
                { name: "اختبار النظام باختبارات موحدة", primary: "unittest system testing Python complete" },
                { name: "رفع المشروع وتوثيقه على GitHub", primary: "GitHub documentation README Python project" }
              ]
            }
          ]
        },
        {
          stage_index: 5,
          name: "الملفات والاستثناءات",
          goal: "إتقان التعامل مع الملفات بجميع أنواعها وبناء نظام معالجة استثناءات قوي ومنطقي يجعل البرامج موثوقة في الإنتاج",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 20 },
          units: [
            {
              unit_index: 1, code: "1.5.1",
              name: "قراءة وكتابة الملفات النصية",
              goal: "التعامل مع الملفات النصية بأمان وكفاءة باستخدام with statement وأوضاع الفتح المختلفة",
              key_concepts: ["open()","read()","write()","with statement","File Modes","Encoding"],
              lessons: [
                { name: "open(): فتح الملف بالوضع الصحيح", primary: "open function file modes r w a rb wb Python" },
                { name: "with statement: الإغلاق الآمن التلقائي", primary: "with context manager file open close safe Python" },
                { name: "قراءة الملف كله: read() وreadlines()", primary: "read readlines entire file content Python" },
                { name: "قراءة سطراً بسطر: readline والمرور بـ for", primary: "readline iterate file lines for loop Python" },
                { name: "كتابة النصوص: write() وwritelines()", primary: "write writelines file output Python" },
                { name: "الإلحاق: وضع 'a' لإضافة لملف موجود", primary: "append mode file write existing content Python" },
                { name: "الترميز encoding: UTF-8 والعربية", primary: "encoding UTF-8 Arabic text file Python" },
                { name: "مسارات الملفات: مطلقة ونسبية", primary: "file paths absolute relative os.path Python" },
                { name: "فتح ملفات متعددة في سياق واحد", primary: "multiple files with statement Python" },
                { name: "تمارين: قارئ ومحلل سجلات النظام", primary: "log file reader parser analyzer Python project" }
              ]
            },
            {
              unit_index: 2, code: "1.5.2",
              name: "مكتبة pathlib: التعامل الحديث مع المسارات",
              goal: "استخدام pathlib كأسلوب Python الحديث للتعامل مع مسارات الملفات والمجلدات",
              key_concepts: ["pathlib","Path","glob()","mkdir()","iterdir()","File Operations"],
              lessons: [
                { name: "pathlib vs os.path: لماذا pathlib أفضل", primary: "pathlib vs os.path modern Python file paths" },
                { name: "Path(): إنشاء مسار والتنقل فيه", primary: "Path object creation navigation Python pathlib" },
                { name: "خصائص المسار: name وstem وsuffix وparent", primary: "Path properties name stem suffix parent Python" },
                { name: "التحقق من وجود الملف والمجلد", primary: "exists is_file is_dir pathlib Python" },
                { name: "قراءة وكتابة بـ Path: read_text وwrite_text", primary: "path read_text write_text encoding Python" },
                { name: "glob(): البحث عن ملفات بنمط", primary: "glob rglob pattern match files pathlib Python" },
                { name: "mkdir وrmdir وunlink: إنشاء وحذف", primary: "mkdir rmdir unlink create delete pathlib Python" },
                { name: "iterdir(): قراءة محتويات المجلد", primary: "iterdir directory listing pathlib Python" },
                { name: "rename وreplace: نقل وإعادة تسمية", primary: "rename replace move file pathlib Python" },
                { name: "تمارين: منظم ملفات تلقائي بالنوع", primary: "file organizer by type extension pathlib Python" }
              ]
            },
            {
              unit_index: 3, code: "1.5.3",
              name: "ملفات CSV والبيانات المجدولة",
              goal: "قراءة وكتابة وتحليل ملفات CSV بمكتبة csv ومعالجة بيانات الجداول بكفاءة",
              key_concepts: ["csv module","DictReader","DictWriter","delimiter","quoting","CSV Parsing"],
              lessons: [
                { name: "بنية CSV وإشكالياتها الشائعة", primary: "CSV format comma separated values delimiter Python" },
                { name: "csv.reader: قراءة CSV أساسية", primary: "csv reader iterate rows Python basic" },
                { name: "csv.DictReader: قراءة CSV ببيانات مُسمّاة", primary: "DictReader header row dict CSV Python" },
                { name: "csv.writer: كتابة صفوف CSV", primary: "csv writer writerow CSV output Python" },
                { name: "csv.DictWriter: كتابة CSV من قواميس", primary: "DictWriter fieldnames CSV write Python" },
                { name: "التعامل مع الفواصل المختلفة: tab وsemicolon", primary: "CSV delimiter tab semicolon dialect Python" },
                { name: "معالجة الاقتباسات والبيانات المعقدة", primary: "CSV quoting escaping special characters Python" },
                { name: "ترميز CSV العربي والأجنبي", primary: "CSV encoding UTF-8 Arabic BOM Python" },
                { name: "معالجة CSV الكبير سطراً بسطر", primary: "large CSV streaming line by line memory Python" },
                { name: "تمارين: تقرير مبيعات من CSV متعددة", primary: "sales report CSV multiple files analysis Python" }
              ]
            },
            {
              unit_index: 4, code: "1.5.4",
              name: "الاستثناءات: الفهم العميق",
              goal: "فهم هرمية الاستثناءات في Python وكتابة معالجة استثناءات صحيحة ومفيدة ودقيقة",
              key_concepts: ["Exception Hierarchy","BaseException","Exception","ValueError","IOError","Traceback"],
              lessons: [
                { name: "هرمية الاستثناءات في Python: شجرة الأنواع", primary: "exception hierarchy BaseException Exception Python tree" },
                { name: "Traceback: قراءته وفهمه بسرعة", primary: "traceback reading understanding Python error debugging" },
                { name: "الاستثناءات الشائعة: ValueError وTypeError وغيرها", primary: "common exceptions ValueError TypeError KeyError Python" },
                { name: "AttributeError وNameError وImportError", primary: "AttributeError NameError ImportError Python exceptions" },
                { name: "FileNotFoundError وPermissionError والملفات", primary: "FileNotFoundError PermissionError IOError Python" },
                { name: "ZeroDivisionError وOverflowError والأرقام", primary: "ZeroDivisionError OverflowError arithmetic Python" },
                { name: "التقاط الأنواع الصحيحة: لا تلتقط Exception دائماً", primary: "catch specific exception not broad Python best practice" },
                { name: "except as e: الوصول لمعلومات الخطأ", primary: "except as error message str repr Python" },
                { name: "ExceptionGroup (Python 3.11+)", primary: "ExceptionGroup multiple exceptions Python 3.11" },
                { name: "تمارين: حلل traceback وأصلح الأخطاء", primary: "traceback analysis debugging fixing exceptions Python" }
              ]
            },
            {
              unit_index: 5, code: "1.5.5",
              name: "الاستثناءات المخصصة وتصميم الأخطاء",
              goal: "تصميم استثناءات مخصصة للمشاريع وبناء نظام أخطاء منظم وواضح للمستخدمين والمطورين",
              key_concepts: ["Custom Exceptions","Exception Classes","raise","Exception Design","Error Hierarchy"],
              lessons: [
                { name: "لماذا استثناءات مخصصة؟ الوضوح والدقة", primary: "custom exceptions why design clarity Python" },
                { name: "تعريف استثناء مخصص بـ class", primary: "custom exception class Exception subclass Python" },
                { name: "إضافة بيانات للاستثناء: الحقول المخصصة", primary: "exception custom attributes data message Python" },
                { name: "هرمية استثناءات المشروع: تنظيم منطقي", primary: "exception hierarchy project domain errors Python" },
                { name: "raise لإطلاق الاستثناء يدوياً", primary: "raise exception custom manual Python" },
                { name: "raise from: ربط سبب الاستثناء", primary: "raise from chaining exception cause Python" },
                { name: "إعادة إطلاق الاستثناء: raise بلا وسيطات", primary: "re-raise exception bare raise Python" },
                { name: "تحويل استثناء لآخر: catch وraise", primary: "exception translation catch re-raise Python" },
                { name: "الاستثناءات والـ logging: سجّل الخطأ الصحيح", primary: "exception logging logger error info Python" },
                { name: "تمارين: نظام استثناءات لمكتبة API", primary: "API library exception system design Python project" }
              ]
            },
            {
              unit_index: 6, code: "1.5.6",
              name: "مديرو السياق Context Managers",
              goal: "بناء واستخدام مديري السياق لضمان تنظيف الموارد بشكل تلقائي وآمن",
              key_concepts: ["Context Manager","__enter__","__exit__","contextlib","with statement"],
              lessons: [
                { name: "ما هو مدير السياق ولماذا يلزم", primary: "context manager resource cleanup Python why" },
                { name: "with statement: أكثر من فتح الملفات", primary: "with statement context manager protocol Python" },
                { name: "__enter__ و__exit__: الـ protocol", primary: "__enter__ __exit__ context manager class Python" },
                { name: "contextlib.contextmanager: الطريقة البسيطة", primary: "contextmanager decorator generator yield Python" },
                { name: "contextlib.suppress: تجاهل استثناء محدد", primary: "contextlib suppress exception ignore Python" },
                { name: "contextlib.redirect_stdout: إعادة توجيه الإخراج", primary: "redirect_stdout stderr contextlib testing Python" },
                { name: "مدير السياق لقياس الوقت", primary: "timing context manager time performance Python" },
                { name: "مدير السياق لاتصالات قاعدة البيانات", primary: "database connection context manager Python" },
                { name: "with متداخل وإدارة موارد متعددة", primary: "nested with multiple context managers Python" },
                { name: "تمارين: مدير سياق لتسجيل العمليات", primary: "logging context manager operation tracker Python" }
              ]
            },
            {
              unit_index: 7, code: "1.5.7",
              name: "تسجيل الأحداث logging",
              goal: "إعداد نظام logging احترافي للتطبيقات يوفر معلومات كافية للتشخيص في الإنتاج",
              key_concepts: ["logging module","Logger","Handler","Formatter","Levels","Log Rotation"],
              lessons: [
                { name: "لماذا logging وليس print في الإنتاج", primary: "logging vs print production Python why" },
                { name: "مستويات التسجيل: DEBUG وINFO وWARNING وERROR وCRITICAL", primary: "logging levels DEBUG INFO WARNING ERROR CRITICAL Python" },
                { name: "الإعداد الأساسي: basicConfig", primary: "basicConfig logging setup format level Python" },
                { name: "Logger المُسمّى: __name__ وهرمية الـ loggers", primary: "named logger __name__ hierarchy Python logging" },
                { name: "Handler: أين يُرسَل السجل", primary: "logging handler StreamHandler FileHandler Python" },
                { name: "Formatter: شكل رسالة السجل", primary: "logging formatter format timestamp level Python" },
                { name: "تدوير الملفات: RotatingFileHandler", primary: "RotatingFileHandler file size rotation Python logging" },
                { name: "تسجيل Exceptions بالـ traceback", primary: "logging exception traceback exc_info Python" },
                { name: "logging في المكتبات: التوصيات الرسمية", primary: "library logging no handler NullHandler Python" },
                { name: "تمارين: إعداد logging كامل لتطبيق ويب", primary: "web application logging setup Python complete" }
              ]
            },
            {
              unit_index: 8, code: "1.5.8",
              name: "الضغط والأرشفة وملفات الثنائية",
              goal: "التعامل مع الملفات المضغوطة والثنائية وأرشيفات ZIP وtar في Python",
              key_concepts: ["zipfile","tarfile","gzip","binary files","struct","Serialization"],
              lessons: [
                { name: "الملفات الثنائية: القراءة والكتابة بـ rb وwb", primary: "binary files read write rb wb Python bytes" },
                { name: "struct: تحليل البيانات الثنائية المنظمة", primary: "struct module pack unpack binary data Python" },
                { name: "zipfile: إنشاء وقراءة ملفات ZIP", primary: "zipfile create read extract Python" },
                { name: "tarfile: التعامل مع أرشيف tar.gz", primary: "tarfile tar gz extract create Python" },
                { name: "gzip وbz2 وlzma: ضغط الملفات", primary: "gzip bz2 lzma compression Python files" },
                { name: "pickle: تسلسل كائنات Python", primary: "pickle serialization objects Python save load" },
                { name: "shelve: قاموس دائم ملفي", primary: "shelve persistent dict file Python" },
                { name: "tempfile: ملفات مؤقتة آمنة", primary: "tempfile TemporaryFile NamedTemporaryFile Python" },
                { name: "shutil: نسخ ونقل وحذف الملفات", primary: "shutil copy move delete files Python" },
                { name: "تمارين: نظام نسخ احتياطي مضغوط", primary: "backup system compressed archives Python project" }
              ]
            },
            {
              unit_index: 9, code: "1.5.9",
              name: "os والنظام وسطر الأوامر",
              goal: "التفاعل مع نظام التشغيل وبيئة التشغيل وتنفيذ الأوامر الخارجية من Python",
              key_concepts: ["os module","subprocess","environ","sys","Process","Shell Commands"],
              lessons: [
                { name: "os module: الوصول لنظام التشغيل", primary: "os module filesystem operations Python" },
                { name: "متغيرات البيئة: os.environ", primary: "os.environ environment variables Python read set" },
                { name: "sys module: معلومات المترجم والتشغيل", primary: "sys module argv path Python version" },
                { name: "sys.argv: وسيطات سطر الأوامر البسيطة", primary: "sys argv command line arguments Python" },
                { name: "argparse: واجهة سطر الأوامر الاحترافية", primary: "argparse CLI arguments flags Python" },
                { name: "subprocess.run: تشغيل أوامر النظام", primary: "subprocess run shell command Python output" },
                { name: "subprocess.Popen: تحكم كامل بالعملية", primary: "subprocess Popen stdin stdout stderr Python" },
                { name: "os.walk: التنقل في شجرة المجلدات", primary: "os.walk directory tree traverse Python" },
                { name: "atexit: كود التنظيف عند الخروج", primary: "atexit module cleanup exit handler Python" },
                { name: "تمارين: أداة سطر أوامر لمعالجة الملفات", primary: "file processing CLI tool argparse Python" }
              ]
            },
            {
              unit_index: 10, code: "1.5.10",
              name: "مشروع: نظام إدارة ملفات ذكي",
              goal: "بناء نظام إدارة ملفات كامل يجمع الملفات والاستثناءات والـ logging وسطر الأوامر",
              key_concepts: ["File Management","Automation","CLI","Logging","Error Handling"],
              lessons: [
                { name: "تصميم نظام إدارة الملفات: المتطلبات", primary: "file management system design requirements Python" },
                { name: "فحص وتصنيف الملفات تلقائياً", primary: "file classification type extension Python" },
                { name: "النسخ الاحتياطي التلقائي بـ shutil وzipfile", primary: "automated backup shutil zipfile Python" },
                { name: "البحث المتقدم في الملفات والمحتوى", primary: "file search content grep Python pathlib" },
                { name: "التقارير التلقائية بـ logging", primary: "automated reports logging operations Python" },
                { name: "واجهة سطر أوامر شاملة بـ argparse", primary: "complete CLI argparse subcommands Python" },
                { name: "معالجة أخطاء الأذونات والمسارات", primary: "permissions errors paths exception handling Python" },
                { name: "الجدولة الزمنية بـ schedule", primary: "scheduling tasks schedule module Python" },
                { name: "اختبار نظام الملفات بـ unittest", primary: "unittest file system testing Python" },
                { name: "التوثيق والنشر على GitHub", primary: "documentation GitHub release Python project" }
              ]
            }
          ]
        },
        {
          stage_index: 6,
          name: "المكتبات والوحدات والحزم",
          goal: "إتقان نظام الوحدات في Python وبناء وتنظيم ونشر الحزم الاحترافية واستخدام أهم المكتبات القياسية",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 20 },
          units: [
            {
              unit_index: 1, code: "1.6.1",
              name: "نظام الاستيراد والوحدات",
              goal: "فهم نظام الاستيراد في Python بعمق وتجنب الأخطاء الشائعة في تنظيم الوحدات",
              key_concepts: ["import","from import","as","sys.path","Module Search","Circular Import"],
              lessons: [
                { name: "import: كيف يعمل داخلياً", primary: "import statement Python module loading sys.modules" },
                { name: "from module import name: استيراد مباشر", primary: "from import specific names Python" },
                { name: "import as: تسمية مستعارة للوحدات", primary: "import as alias module name Python" },
                { name: "sys.path: أين يبحث Python عن الوحدات", primary: "sys.path module search path Python PYTHONPATH" },
                { name: "__init__.py: هوية الحزمة", primary: "__init__.py package Python initialization" },
                { name: "الاستيراد النسبي في الحزمة", primary: "relative import package Python from . import" },
                { name: "التحميل الشرطي: importlib", primary: "importlib dynamic import Python" },
                { name: "الاستيراد الدائري وكيف نتجنبه", primary: "circular import problem Python solution" },
                { name: "__all__: تحديد الواجهة العامة للوحدة", primary: "__all__ module public API Python export" },
                { name: "تمارين: هيكل حزمة احترافية متعددة الطبقات", primary: "package structure layers Python project" }
              ]
            },
            {
              unit_index: 2, code: "1.6.2",
              name: "التعبيرات النظامية regex",
              goal: "كتابة أنماط regex فعّالة لمعالجة وتحليل النصوص في Python بمكتبة re",
              key_concepts: ["regex","re module","match()","search()","findall()","groups","Patterns"],
              lessons: [
                { name: "مدخل لـ regex: لغة البحث في النصوص", primary: "regex introduction patterns text search Python" },
                { name: "الأحرف الخاصة والهروب: . * + ? ^ $ []", primary: "regex special characters metacharacters Python" },
                { name: "المجموعات groups والبديل |", primary: "regex groups parentheses alternation Python" },
                { name: "re.match() وre.search() وre.fullmatch()", primary: "re match search fullmatch Python difference" },
                { name: "re.findall() وre.finditer()", primary: "re findall finditer all matches Python" },
                { name: "re.sub(): استبدال بأنماط", primary: "re sub replace pattern Python" },
                { name: "الأعلام flags: IGNORECASE وMULTILINE", primary: "regex flags ignorecase multiline dotall Python" },
                { name: "regex المُجمَّع: تجنب إعادة التجميع", primary: "compiled regex re.compile Pattern Python" },
                { name: "Lookahead وLookbehind المتقدمة", primary: "lookahead lookbehind zero width assertion Python" },
                { name: "تمارين: محلل ومنقح النصوص الاحترافي", primary: "text validator email phone URL regex Python" }
              ]
            },
            {
              unit_index: 3, code: "1.6.3",
              name: "التاريخ والوقت: datetime وzoneinfo",
              goal: "التعامل مع التواريخ والأوقات ومناطق التوقيت بشكل صحيح في التطبيقات الحقيقية",
              key_concepts: ["datetime","timedelta","strftime","strptime","timezone","zoneinfo"],
              lessons: [
                { name: "datetime.date وdatetime.time وdatetime.datetime", primary: "datetime date time Python basics" },
                { name: "datetime.now() وutcnow() والفرق الحاسم", primary: "datetime now utcnow timezone aware Python" },
                { name: "timedelta: حساب الفروق الزمنية", primary: "timedelta duration difference days hours Python" },
                { name: "strftime: تنسيق التاريخ لنص", primary: "strftime format date string Python" },
                { name: "strptime: تحليل النص لتاريخ", primary: "strptime parse date string Python" },
                { name: "مناطق التوقيت: zoneinfo (Python 3.9+)", primary: "zoneinfo timezone aware datetime Python 3.9" },
                { name: "pytz للإصدارات القديمة من Python", primary: "pytz timezone legacy Python compatibility" },
                { name: "calendar: تقويم وحسابات الأشهر", primary: "calendar module monthcalendar Python" },
                { name: "time module: الوقت بالثواني منذ Epoch", primary: "time module time() sleep perf_counter Python" },
                { name: "تمارين: نظام حجز مواعيد بالتواريخ", primary: "appointment booking system datetime Python" }
              ]
            },
            {
              unit_index: 4, code: "1.6.4",
              name: "إدارة الحزم وبيئات التطوير",
              goal: "إدارة تبعيات المشاريع باحترافية باستخدام pip وvenv وأدوات التغليف الحديثة",
              key_concepts: ["pip","venv","requirements.txt","pyproject.toml","poetry","pipenv"],
              lessons: [
                { name: "pip: تثبيت وتحديث وحذف الحزم", primary: "pip install upgrade uninstall packages Python" },
                { name: "requirements.txt: تثبيت التبعيات", primary: "requirements.txt freeze install Python" },
                { name: "venv: إنشاء بيئات افتراضية معزولة", primary: "venv virtual environment Python isolation" },
                { name: "pyproject.toml: مستقبل تغليف Python", primary: "pyproject.toml PEP 517 518 packaging Python" },
                { name: "Poetry: إدارة التبعيات الحديثة", primary: "poetry dependency management Python modern" },
                { name: "pip-tools: تثبيت التبعيات المحددة", primary: "pip-tools pinned dependencies Python reproducible" },
                { name: "conda وminiforge لبيئات العلوم", primary: "conda miniforge data science environment Python" },
                { name: "nox وtox: اختبار على بيئات متعددة", primary: "nox tox multiple Python versions testing" },
                { name: "رفع حزمة على PyPI من الصفر", primary: "PyPI package publish upload Python" },
                { name: "تمارين: مشروع محزوم ومنشور على TestPyPI", primary: "package publish TestPyPI Python project" }
              ]
            },
            {
              unit_index: 5, code: "1.6.5",
              name: "أدوات التطوير: linting وتنسيق الكود",
              goal: "إعداد أدوات جودة الكود التلقائية لضمان نمط موحد ومكتشف للأخطاء في كل مشروع",
              key_concepts: ["flake8","black","isort","mypy","pre-commit","Code Quality"],
              lessons: [
                { name: "PEP 8 وأدوات التحقق التلقائي", primary: "PEP8 linting automated checking Python" },
                { name: "flake8: كاشف الأخطاء والأنماط", primary: "flake8 linter errors style Python" },
                { name: "black: المُنسِّق التلقائي الحتمي", primary: "black formatter opinionated Python" },
                { name: "isort: ترتيب الاستيرادات تلقائياً", primary: "isort import sorting Python automated" },
                { name: "mypy: فاحص الأنواع الثابت", primary: "mypy type checking static analysis Python" },
                { name: "ruff: أسرع linter في Python", primary: "ruff fast linter Python all-in-one" },
                { name: "pre-commit: تشغيل الفحوصات قبل الحفظ", primary: "pre-commit hooks git Python automation" },
                { name: "إعداد .editorconfig وVS Code settings", primary: "editorconfig VS Code settings Python formatting" },
                { name: "CI في GitHub Actions لفحص الجودة", primary: "GitHub Actions CI quality checks Python" },
                { name: "تمارين: تطبيق pipeline جودة كامل", primary: "quality pipeline complete Python project" }
              ]
            },
            {
              unit_index: 6, code: "1.6.6",
              name: "المكتبة القياسية: الأدوات الأساسية",
              goal: "اكتشاف واستخدام أهم أدوات المكتبة القياسية التي يحتاجها كل مطور Python يومياً",
              key_concepts: ["pprint","textwrap","hashlib","uuid","secrets","dataclasses"],
              lessons: [
                { name: "pprint: طباعة البيانات المنسقة بوضوح", primary: "pprint pretty print dict list Python" },
                { name: "textwrap: تنسيق النصوص الطويلة", primary: "textwrap wrap fill indent Python" },
                { name: "hashlib: تجزئة البيانات والتحقق", primary: "hashlib SHA256 MD5 hash Python" },
                { name: "hmac: التوقيع الرقمي البسيط", primary: "hmac signature verification Python" },
                { name: "secrets: توليد بيانات آمنة عشوائية", primary: "secrets secure random token Python" },
                { name: "uuid: معرفات فريدة عالمياً", primary: "uuid UUID4 unique identifier Python" },
                { name: "dataclasses: فئات البيانات التلقائية", primary: "dataclasses decorator fields Python" },
                { name: "typing.Protocol وStructural Subtyping", primary: "Protocol typing structural subtyping Python" },
                { name: "enum: التعداد المنظم للقيم الثابتة", primary: "enum Enum IntEnum Python constants" },
                { name: "تمارين: نظام مصادقة بسيط بـ secrets وhashlib", primary: "authentication system secrets hashlib Python" }
              ]
            },
            {
              unit_index: 7, code: "1.6.7",
              name: "التسلسل وإلغاؤه: pickle وjsonpickle وmsgpack",
              goal: "حفظ واستعادة كائنات Python بطرق مختلفة مع معرفة متى تختار كل طريقة",
              key_concepts: ["pickle","jsonpickle","msgpack","Serialization","Protocol","Security"],
              lessons: [
                { name: "ما هو التسلسل Serialization ولماذا", primary: "serialization persistence data formats Python" },
                { name: "pickle: تسلسل كائنات Python الكاملة", primary: "pickle serialize objects Python binary" },
                { name: "مخاطر pickle: الحقن والأمان", primary: "pickle security risk untrusted data Python" },
                { name: "Protocol Buffers: كفاءة ولغات متعددة", primary: "protobuf protocol buffers Python schema" },
                { name: "msgpack: تسلسل ثنائي سريع", primary: "msgpack binary serialization fast Python" },
                { name: "marshal: تسلسل بيانات Python الداخلي", primary: "marshal module Python bytecode" },
                { name: "shelve: قاموس ملفي دائم", primary: "shelve dbm persistent dict Python" },
                { name: "cattrs وdacite: تحويل الأنواع للكائنات", primary: "cattrs dacite dataclass conversion Python" },
                { name: "Pydantic: التحقق والتسلسل الحديث", primary: "Pydantic validation serialization Python v2" },
                { name: "تمارين: نظام ذاكرة تخزين مؤقت دائم", primary: "persistent cache serialization Python project" }
              ]
            },
            {
              unit_index: 8, code: "1.6.8",
              name: "اختبار الوحدة unittest وpytest",
              goal: "كتابة اختبارات شاملة ومنظمة لمشاريع Python باستخدام unittest وpytest",
              key_concepts: ["unittest","pytest","TestCase","assert","fixtures","parametrize"],
              lessons: [
                { name: "لماذا الاختبار التلقائي ضرورة وليس ترفاً", primary: "automated testing importance Python why" },
                { name: "unittest.TestCase: هيكل الاختبار الأساسي", primary: "unittest TestCase setUp tearDown Python" },
                { name: "دوال assertEqual وassertIn والعائلة", primary: "unittest assertions assertEqual assertTrue Python" },
                { name: "pytest: الاختبار بلا فئات", primary: "pytest functions simple testing Python" },
                { name: "pytest fixtures: مشاركة الإعداد", primary: "pytest fixture setup shared resources Python" },
                { name: "pytest.mark.parametrize: اختبار بمدخلات متعددة", primary: "pytest parametrize multiple inputs Python" },
                { name: "التخزين المؤقت للاختبارات بـ pytest --cache", primary: "pytest cache rerun last failed Python" },
                { name: "تغطية الكود: pytest-cov وcoverage.py", primary: "code coverage pytest-cov coverage Python" },
                { name: "TDD: اكتب الاختبار أولاً دائماً", primary: "TDD red green refactor Python practice" },
                { name: "تمارين: اختبار كامل لنظام بيانات", primary: "complete test suite data system Python" }
              ]
            },
            {
              unit_index: 9, code: "1.6.9",
              name: "الاختبار المتقدم والـ Mocking",
              goal: "اختبار المكونات المعزولة بـ mock وpatch وفهم اختبار التكامل والـ E2E",
              key_concepts: ["unittest.mock","patch","MagicMock","side_effect","spy","Integration Testing"],
              lessons: [
                { name: "unittest.mock: محاكاة الاعتماديات", primary: "unittest mock replace dependencies Python" },
                { name: "MagicMock: محاكاة أي كائن", primary: "MagicMock automatic mock attributes Python" },
                { name: "patch: استبدال مؤقت للكائنات", primary: "patch decorator context manager Python mock" },
                { name: "assert_called_with: تحقق من الاستدعاء", primary: "assert called with mock verification Python" },
                { name: "side_effect: محاكاة الأخطاء والسلوك", primary: "side_effect exceptions iteration mock Python" },
                { name: "Mock للملفات والشبكات والوقت", primary: "mock file network time datetime Python" },
                { name: "pytest-mock: mocking أسهل مع pytest", primary: "pytest-mock mocker fixture Python" },
                { name: "Monkey Patching: تعديل وقت التشغيل", primary: "monkey patching runtime modification Python" },
                { name: "اختبار التكامل Integration Tests", primary: "integration tests multiple components Python" },
                { name: "تمارين: اختبار client API بالكامل", primary: "API client complete testing mock Python" }
              ]
            },
            {
              unit_index: 10, code: "1.6.10",
              name: "مشروع ختامي المستوى الأول: أداة CLI احترافية",
              goal: "بناء أداة سطر أوامر احترافية كاملة توظف جميع مفاهيم المستوى الأول",
              key_concepts: ["CLI","Package","Testing","Logging","Distribution","Professional"],
              lessons: [
                { name: "تصميم أداة CLI: متطلبات وواجهة", primary: "CLI tool design requirements interface Python" },
                { name: "هيكل الحزمة والمجلدات الاحترافي", primary: "package structure professional Python CLI" },
                { name: "بناء الأوامر الفرعية بـ argparse", primary: "argparse subcommands CLI Python complete" },
                { name: "إعداد الـ configuration بـ configparser", primary: "configparser settings file Python CLI" },
                { name: "logging شامل لكل مستويات التفاصيل", primary: "logging complete levels Python CLI" },
                { name: "معالجة الأخطاء واستثناءات مخصصة", primary: "error handling custom exceptions Python CLI" },
                { name: "اختبارات unittest وpytest كاملة", primary: "complete tests unittest pytest Python CLI" },
                { name: "README احترافي بأمثلة حقيقية", primary: "professional README examples Python CLI" },
                { name: "النشر على PyPI كحزمة قابلة للتثبيت", primary: "PyPI distribution pip install Python CLI" },
                { name: "مراجعة المستوى الأول والانتقال للثاني", primary: "level one review transition Python" }
              ]
            }
          ]
        },
        {
          stage_index: 7,
          name: "مشروع شامل ومراجعة المستوى الأول",
          goal: "تجميع كل مفاهيم المستوى الأول في مشاريع حقيقية شاملة ومراجعة منهجية لجميع المفاهيم والمعارف اكتسبها",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 60 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.7.1",
              name: "مراجعة البنية الأساسية والأنواع",
              goal: "مراجعة ومعالجة أي ثغرات في فهم البنية الأساسية وأنواع البيانات وعملياتها",
              key_concepts: ["Syntax Review","Type System","Operations","Truthiness","Debugging"],
              lessons: [
                { name: "مراجعة شاملة للتركيب والمسافة البادئة", primary: "syntax review indentation Python basics" },
                { name: "مراجعة أنواع البيانات والتحويل بينها", primary: "type review conversion Python comprehensive" },
                { name: "مراجعة العمليات والأولويات", primary: "operators precedence review Python" },
                { name: "مراجعة النصوص وطرقها الأساسية", primary: "string methods review Python comprehensive" },
                { name: "الأسئلة الشائعة والأخطاء المتكررة", primary: "common questions mistakes Python review" },
                { name: "اختبار تشخيصي وتحديد نقاط الضعف", primary: "diagnostic test identify gaps Python" },
                { name: "حل مسائل مختلطة على المستوى الأول", primary: "mixed problems Level 1 Python review" },
                { name: "مراجعة عبر حل تمارين المقابلات", primary: "interview questions Python review Level 1" },
                { name: "تصحيح كود مكسور: debugging جلسة", primary: "debugging broken code Python session review" },
                { name: "تمارين مراجعة سريعة ومتنوعة", primary: "quick varied review exercises Python Level 1" }
              ]
            },
            {
              unit_index: 2, code: "1.7.2",
              name: "مراجعة التحكم في التدفق والدوال",
              goal: "مراجعة ومعالجة أي ثغرات في التحكم في التدفق والدوال والنطاق",
              key_concepts: ["Control Flow Review","Functions Review","Scope Review","Recursion","Closures"],
              lessons: [
                { name: "مراجعة الشروط وأنماط الكود النظيف", primary: "conditions review clean code patterns Python" },
                { name: "مراجعة حلقات for وwhile وcontrol", primary: "loops review for while break continue Python" },
                { name: "مراجعة comprehensions وpractice", primary: "comprehensions review practice Python" },
                { name: "مراجعة تعريف الدوال والمعاملات", primary: "function definition parameters review Python" },
                { name: "مراجعة النطاق LEGB والإغلاق", primary: "scope LEGB closure review Python" },
                { name: "مراجعة الدوال كمواطنين أول", primary: "first class functions review Python" },
                { name: "مراجعة العودية والـ memoization", primary: "recursion memoization review Python" },
                { name: "تمارين مختلطة: دوال وتدفق", primary: "mixed functions flow exercises Python" },
                { name: "مسائل خوارزميات بسيطة بـ Python", primary: "simple algorithm problems Python practice" },
                { name: "مراجعة الاختبار والتوثيق", primary: "testing documentation review Python" }
              ]
            },
            {
              unit_index: 3, code: "1.7.3",
              name: "مراجعة هياكل البيانات والملفات",
              goal: "مراجعة هياكل البيانات والملفات والاستثناءات ومعالجة أي ثغرات",
              key_concepts: ["Data Structures Review","Files Review","Exceptions Review","JSON","CSV"],
              lessons: [
                { name: "مراجعة القوائم والعمليات المتقدمة", primary: "lists review advanced operations Python" },
                { name: "مراجعة القواميس والمجموعات والصفوف", primary: "dict set tuple review Python" },
                { name: "مراجعة collections والاختيار الصحيح", primary: "collections module review choice Python" },
                { name: "مراجعة الملفات والمسارات وpathlib", primary: "files pathlib review Python" },
                { name: "مراجعة JSON وCSV وتحليل البيانات", primary: "JSON CSV data parsing review Python" },
                { name: "مراجعة الاستثناءات وhierarchy", primary: "exceptions hierarchy review Python" },
                { name: "مراجعة logging وContext Managers", primary: "logging context managers review Python" },
                { name: "تمارين: معالج بيانات شامل", primary: "comprehensive data processor Python review" },
                { name: "مسائل حقيقية: قراءة وتحليل وكتابة", primary: "real world data read analyze write Python" },
                { name: "مراجعة نهائية المستوى الأول", primary: "final review Level 1 Python complete" }
              ]
            },
            {
              unit_index: 4, code: "1.7.4",
              name: "مشروع 1: أداة تحليل النصوص",
              goal: "بناء أداة تحليل نصوص شاملة تستخدم مفاهيم المستوى الأول كاملة",
              key_concepts: ["NLP Basics","Text Analysis","Statistics","CLI","File Processing"],
              lessons: [
                { name: "تصميم محلل النصوص: الميزات والبنية", primary: "text analyzer design features Python project" },
                { name: "قراءة النصوص من ملفات متعددة", primary: "multi-file text reading Python" },
                { name: "تحليل الكلمات: تردد وترتيب وفريدة", primary: "word frequency unique rank Python analysis" },
                { name: "تحليل الجمل والفقرات", primary: "sentence paragraph analysis Python" },
                { name: "استخراج الكيانات: الأرقام والتواريخ", primary: "entity extraction numbers dates regex Python" },
                { name: "إحصاءات وتقارير التحليل", primary: "analysis statistics report Python text" },
                { name: "واجهة CLI كاملة بـ argparse", primary: "CLI argparse complete text tool Python" },
                { name: "حفظ التقارير بـ JSON وCSV", primary: "save reports JSON CSV Python text" },
                { name: "اختبار الأداة بـ pytest", primary: "pytest testing text analyzer Python" },
                { name: "التوثيق والنشر على GitHub", primary: "documentation GitHub Python text analyzer" }
              ]
            },
            {
              unit_index: 5, code: "1.7.5",
              name: "مشروع 2: نظام إدارة المخزون",
              goal: "بناء نظام إدارة مخزون كامل يُجسّد أفضل ممارسات Python في مشروع عملي",
              key_concepts: ["Inventory System","CRUD","Persistence","Reports","CLI"],
              lessons: [
                { name: "تصميم نظام المخزون: كيانات وعلاقات", primary: "inventory system design entities Python" },
                { name: "هياكل بيانات المنتجات والمستودعات", primary: "product warehouse data structures Python" },
                { name: "عمليات CRUD على المخزون", primary: "inventory CRUD operations Python" },
                { name: "حفظ البيانات في JSON وتحميلها", primary: "JSON persistence inventory Python" },
                { name: "البحث والتصفية والفرز المتقدم", primary: "search filter sort inventory Python" },
                { name: "التقارير: كميات منخفضة ومبيعات", primary: "inventory reports low stock sales Python" },
                { name: "واجهة CLI تفاعلية شاملة", primary: "interactive CLI inventory Python" },
                { name: "التحقق من صحة البيانات المدخلة", primary: "input validation inventory Python" },
                { name: "اختبارات شاملة للنظام", primary: "complete system tests inventory Python" },
                { name: "التوثيق والرفع على GitHub", primary: "documentation GitHub inventory Python" }
              ]
            },
            {
              unit_index: 6, code: "1.7.6",
              name: "مشروع 3: برنامج الأتمتة اليومية",
              goal: "بناء مجموعة أدوات أتمتة تُحل مشاكل يومية حقيقية باستخدام Python",
              key_concepts: ["Automation","File System","Email","Scheduling","OS Integration"],
              lessons: [
                { name: "أتمتة تنظيم مجلد التنزيلات", primary: "downloads folder organizer automation Python" },
                { name: "أتمتة إعادة تسمية الملفات دفعة", primary: "batch rename files automation Python" },
                { name: "أتمتة تقارير يومية وتحليل CSV", primary: "daily reports CSV automation Python" },
                { name: "أتمتة النسخ الاحتياطي للمشاريع", primary: "project backup automation zip Python" },
                { name: "أتمتة تنظيف الملفات المكررة", primary: "duplicate file cleaner automation Python" },
                { name: "أتمتة بيانات في صيغة Excel بـ openpyxl", primary: "Excel automation openpyxl Python" },
                { name: "جدولة المهام بـ schedule", primary: "task scheduling schedule module Python" },
                { name: "إشعارات سطح المكتب بـ plyer", primary: "desktop notifications plyer Python" },
                { name: "تجميع أدوات الأتمتة في حزمة", primary: "automation toolkit package Python" },
                { name: "التوثيق والاستخدام الفعلي اليومي", primary: "documentation daily use automation Python" }
              ]
            },
            {
              unit_index: 7, code: "1.7.7",
              name: "مسائل الخوارزميات وتحليل التعقيد",
              goal: "حل مسائل خوارزمية شائعة وتحليل تعقيدها الزمني والمكاني باستخدام Python",
              key_concepts: ["Algorithm Complexity","Big O","Sorting","Searching","Dynamic Programming"],
              lessons: [
                { name: "تحليل التعقيد O(n): مقدمة عملية", primary: "time complexity Big O practical Python" },
                { name: "مسائل المصفوفات والقوائم الشائعة", primary: "array list problems two sum Python" },
                { name: "مسائل الأحرف والنصوص", primary: "string character problems anagram Python" },
                { name: "مسائل القاموس والتجزئة", primary: "hash map frequency problems Python" },
                { name: "مسائل المكدس والطابور", primary: "stack queue problems balanced Python" },
                { name: "مسائل البحث والفرز التطبيقية", primary: "search sort problems practical Python" },
                { name: "مسائل العودية والبرمجة الديناميكية", primary: "recursion dynamic programming Python basic" },
                { name: "مسائل المؤشرين Two Pointers", primary: "two pointers sliding window Python" },
                { name: "مسائل التقليص Greedy البسيطة", primary: "greedy algorithm simple Python problems" },
                { name: "تمارين مقابلات Python للوظائف", primary: "interview practice Python job problems" }
              ]
            },
            {
              unit_index: 8, code: "1.7.8",
              name: "Python والبيانات: مقدمة numpy وpandas",
              goal: "الدخول لعالم معالجة البيانات بـ numpy وpandas استعداداً للمستوى الثاني",
              key_concepts: ["numpy","ndarray","pandas","DataFrame","Data Analysis","Vectorization"],
              lessons: [
                { name: "numpy: لماذا وليس قوائم Python", primary: "numpy vs list performance vectorization Python" },
                { name: "ndarray: إنشاء المصفوفات وأشكالها", primary: "numpy ndarray creation shape dtype Python" },
                { name: "عمليات numpy المتجهة بلا حلقات", primary: "numpy vectorized operations broadcasting Python" },
                { name: "pandas DataFrame: الجدول الديناميكي", primary: "pandas DataFrame creation columns rows Python" },
                { name: "قراءة CSV بـ pandas واستكشاف البيانات", primary: "pandas read_csv head info describe Python" },
                { name: "تصفية وتحديد البيانات بـ loc وiloc", primary: "pandas loc iloc selection filtering Python" },
                { name: "العمليات التجميعية: groupby وagg", primary: "pandas groupby aggregation mean sum Python" },
                { name: "التعامل مع القيم المفقودة", primary: "pandas missing values NaN fillna dropna Python" },
                { name: "حفظ وتصدير البيانات بـ pandas", primary: "pandas to_csv to_json export Python" },
                { name: "مشروع سريع: تحليل بيانات حقيقية", primary: "data analysis real dataset pandas Python project" }
              ]
            },
            {
              unit_index: 9, code: "1.7.9",
              name: "Python والويب: مقدمة requests وBeautifulSoup",
              goal: "جلب وتحليل بيانات الويب بـ requests وBeautifulSoup استعداداً للمستوى الثاني",
              key_concepts: ["requests","HTTP","BeautifulSoup","Web Scraping","API","JSON Response"],
              lessons: [
                { name: "بروتوكول HTTP: GET وPOST والـ Status Codes", primary: "HTTP GET POST status codes Python web" },
                { name: "requests: إرسال HTTP requests بسهولة", primary: "requests library HTTP Python" },
                { name: "تحليل ردود JSON من APIs عامة", primary: "API JSON response requests Python" },
                { name: "Headers وAuthentication وparams", primary: "requests headers auth params Python" },
                { name: "Session وإعادة استخدام الاتصال", primary: "requests Session connection reuse Python" },
                { name: "BeautifulSoup: تحليل HTML وXML", primary: "BeautifulSoup HTML parse Python scraping" },
                { name: "استخراج البيانات من صفحات ويب", primary: "web scraping data extraction BeautifulSoup Python" },
                { name: "احترام robots.txt والأخلاقيات", primary: "robots.txt ethics web scraping Python" },
                { name: "حفظ البيانات المجلوبة ومعالجتها", primary: "save scraped data JSON CSV Python" },
                { name: "مشروع: محرك بيانات من API حقيقي", primary: "real API data collector Python project" }
              ]
            },
            {
              unit_index: 10, code: "1.7.10",
              name: "الامتحان الشامل ومراجعة الانتقال للمستوى الثاني",
              goal: "إتمام تقييم شامل للمستوى الأول وتحديد الاستعداد للمستوى الثاني",
              key_concepts: ["Comprehensive Review","Assessment","Level Transition","Readiness","Goals"],
              lessons: [
                { name: "اختبار تشخيصي شامل للمستوى الأول", primary: "comprehensive diagnostic Level 1 Python assessment" },
                { name: "تحليل نتيجة الاختبار ونقاط القوة والضعف", primary: "assessment analysis strengths weaknesses Python" },
                { name: "جلسة مراجعة مكثفة للثغرات", primary: "intensive review gaps Python Level 1" },
                { name: "استعراض كل مشاريع المستوى الأول", primary: "project portfolio review Level 1 Python" },
                { name: "ما الذي ينتظرك في المستوى الثاني", primary: "Level 2 preview OOP async Python" },
                { name: "خطة التعلم الشخصية للمستوى الثاني", primary: "learning plan personal Level 2 Python" },
                { name: "أسئلة مقابلات Python الشائعة للمستوى الأول", primary: "Python interview questions Level 1 review" },
                { name: "بناء Portfolio Python قوي من المستوى الأول", primary: "portfolio projects GitHub Python Level 1" },
                { name: "موارد التعمق والمراجع الاحترافية", primary: "resources books courses Python Level 2 prep" },
                { name: "الاحتفال بالإنجاز والخطوة التالية", primary: "achievement milestone transition Python Level 2" }
              ]
            }
          ]
        }
      ]
    },
    {
      level_index: 2,
      name: "Python المتقدم والتطبيقي",
      goal: "رفع مستوى Python من البرمجة الإجرائية إلى OOP والبرمجة الوظيفية والتزامن والبيانات وبناء APIs وقواعد البيانات والنشر في الإنتاج، لتصبح مطور Python محترف قادر على بناء مشاريع حقيقية وقابلة للتوسع",
      bloom_focus: "create",
      exam: { pass_threshold_percent: 72, time_limit_minutes: 70 },
      stages: [
        {
          stage_index: 1,
          name: "البرمجة كائنية التوجه OOP",
          goal: "إتقان OOP في Python من الفئات والكائنات حتى الوراثة المتعددة وأنماط التصميم والفئات التجريدية، مع تطبيقها في مشاريع حقيقية",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 72, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 22 },
          units: [
            {
              unit_index: 1, code: "2.1.1",
              name: "الفئات والكائنات: المفاهيم الجوهرية",
              goal: "فهم مفاهيم OOP وتعريف الفئات وإنشاء الكائنات ومعرفة الفرق بين السمات والطرق",
              key_concepts: ["class","object","instance","__init__","self","Attributes","Methods"],
              lessons: [
                { name: "ما هي OOP ولماذا نحتاجها في مشاريع كبيرة", primary: "OOP object oriented programming why large projects Python" },
                { name: "تعريف الفئة class وإنشاء كائن", primary: "class definition object instantiation Python" },
                { name: "__init__: بانية الكائن وإعداده", primary: "__init__ constructor initialization Python class" },
                { name: "self: مرجع الكائن لنفسه", primary: "self reference instance Python class method" },
                { name: "السمات: instance attributes وclass attributes", primary: "instance class attributes Python difference" },
                { name: "الطرق Methods: تعريفها واستدعاؤها", primary: "methods functions class Python instance call" },
                { name: "الطرق الثابتة staticmethod وclassmethod", primary: "staticmethod classmethod Python decorator" },
                { name: "__str__ و__repr__: تمثيل الكائن نصياً", primary: "__str__ __repr__ object string representation Python" },
                { name: "كائنات كقيم: تمريرها وتخزينها", primary: "objects as values pass store Python" },
                { name: "تمارين: فئة BankAccount كاملة", primary: "BankAccount class methods Python exercises" }
              ]
            },
            {
              unit_index: 2, code: "2.1.2",
              name: "التغليف وإخفاء المعلومات",
              goal: "تطبيق مبدأ التغليف لحماية البيانات الداخلية وتوفير واجهة محكومة للتعامل مع الكائنات",
              key_concepts: ["Encapsulation","Private","Protected","Property","Getter","Setter"],
              lessons: [
                { name: "التغليف: لماذا نخفي الداخل؟", primary: "encapsulation information hiding Python OOP why" },
                { name: "الاصطلاح _ للخاصية المحمية", primary: "single underscore protected convention Python" },
                { name: "__ للخاصية الخاصة وname mangling", primary: "double underscore private name mangling Python" },
                { name: "property: الوصول النظيف للبيانات", primary: "property decorator getter Python class" },
                { name: "setter: التحكم في التعديل مع تحقق", primary: "property setter validation Python class" },
                { name: "deleter: حذف الخاصية بطريقة محكومة", primary: "property deleter Python class" },
                { name: "الخصائص المحسوبة Computed Properties", primary: "computed property cached property Python" },
                { name: "functools.cached_property: حساب مرة واحدة", primary: "cached_property lazy evaluation Python" },
                { name: "__slots__: تحديد السمات وتوفير الذاكرة", primary: "__slots__ memory optimization Python class" },
                { name: "تمارين: فئة Temperature بـ properties", primary: "Temperature class property setter Python" }
              ]
            },
            {
              unit_index: 3, code: "2.1.3",
              name: "الوراثة Inheritance",
              goal: "بناء تسلسلات هرمية من الفئات بالوراثة وإعادة استخدام الكود وتوسيع الوظائف",
              key_concepts: ["Inheritance","super()","Method Override","Base Class","Derived Class","isinstance"],
              lessons: [
                { name: "الوراثة: إعادة الاستخدام بلا تكرار", primary: "inheritance code reuse Python class base derived" },
                { name: "تعريف فئة ترث من أخرى", primary: "class inheritance Python parent child class" },
                { name: "super(): استدعاء الأب بشكل صحيح", primary: "super() parent class method Python" },
                { name: "تجاوز Override الطرق وتخصيصها", primary: "method override Python subclass customize" },
                { name: "isinstance() وissubclass(): فحص الهرمية", primary: "isinstance issubclass Python type hierarchy" },
                { name: "الوراثة متعددة المستويات", primary: "multi-level inheritance chain Python" },
                { name: "Liskov Substitution Principle: متى تصح الوراثة", primary: "Liskov substitution principle LSP Python OOP" },
                { name: "Mixin: وراثة المهارات لا الكيانات", primary: "mixin class Python multiple inheritance" },
                { name: "نمط التشكيل Composition مقابل الوراثة", primary: "composition vs inheritance Python when to use" },
                { name: "تمارين: هرمية حيوانات وموظفين", primary: "animal employee hierarchy Python OOP exercises" }
              ]
            },
            {
              unit_index: 4, code: "2.1.4",
              name: "تعدد الأشكال Polymorphism",
              goal: "كتابة كود يعمل مع أنواع مختلفة بنفس الواجهة من خلال تعدد الأشكال وDuck Typing",
              key_concepts: ["Polymorphism","Duck Typing","Method Overriding","Interface","Protocol"],
              lessons: [
                { name: "تعدد الأشكال: نفس الاسم سلوك مختلف", primary: "polymorphism same interface different behavior Python" },
                { name: "Duck Typing: إن مشى كالبط ونقّ كالبط", primary: "duck typing Python behavior not type" },
                { name: "طرق مُجاوَزة تعمل بشكل بديهي", primary: "method override polymorphism Python natural" },
                { name: "typing.Protocol: تعريف الواجهة بدون وراثة", primary: "Protocol typing interface structural Python" },
                { name: "ABC: الفئات التجريدية الإجبارية", primary: "ABC abstractmethod abstract class Python" },
                { name: "abstractmethod: الإجبار على التنفيذ", primary: "abstractmethod ABC concrete implementation Python" },
                { name: "تعدد الأشكال مع collections", primary: "polymorphism collections list dict Python" },
                { name: "functools.singledispatch للـ overloading", primary: "singledispatch overloading type dispatch Python" },
                { name: "أنماط التصميم المبنية على تعدد الأشكال", primary: "design patterns polymorphism Strategy Python" },
                { name: "تمارين: نظام رسومات أشكال متعددة", primary: "shapes drawing polymorphism Python exercises" }
              ]
            },
            {
              unit_index: 5, code: "2.1.5",
              name: "الدوال الخاصة Dunder Methods",
              goal: "إتقان الدوال الخاصة لجعل الفئات تتصرف مثل الأنواع المدمجة بشكل طبيعي",
              key_concepts: ["__len__","__getitem__","__setitem__","__iter__","__contains__","Operator Overloading"],
              lessons: [
                { name: "لماذا Dunder Methods؟ البروتوكول الضمني", primary: "dunder methods protocol Python why magic" },
                { name: "__len__: تعريف طول الكائن", primary: "__len__ length object Python" },
                { name: "__getitem__ و__setitem__: الوصول كقائمة", primary: "__getitem__ __setitem__ index access Python" },
                { name: "__iter__ و__next__: كائن قابل للتكرار", primary: "__iter__ __next__ iterable iterator Python" },
                { name: "__contains__: عامل in الطبيعي", primary: "__contains__ in operator Python class" },
                { name: "تحميل زائد للعمليات: __add__ و__mul__", primary: "__add__ __mul__ operator overloading Python" },
                { name: "__eq__ و__lt__: المقارنة الطبيعية", primary: "__eq__ __lt__ comparison operators Python" },
                { name: "__enter__ و__exit__: كائن مدير سياق", primary: "__enter__ __exit__ context manager Python" },
                { name: "__call__: الكائن القابل للاستدعاء", primary: "__call__ callable object Python" },
                { name: "تمارين: فئة Matrix بعمليات كاملة", primary: "Matrix class dunder operators Python exercises" }
              ]
            },
            {
              unit_index: 6, code: "2.1.6",
              name: "dataclasses وattrs وPydantic",
              goal: "استخدام فئات البيانات الحديثة لتعريف بنى البيانات بكفاءة وتحقق وتسلسل تلقائيين",
              key_concepts: ["dataclasses","@dataclass","field()","attrs","Pydantic","Validation"],
              lessons: [
                { name: "dataclasses: تقليل الكود المتكرر في الفئات", primary: "dataclasses decorator Python boilerplate reduction" },
                { name: "@dataclass: __init__ و__repr__ و__eq__ تلقائية", primary: "dataclass auto methods Python" },
                { name: "field(): إعداد متقدم للحقول", primary: "field default_factory metadata dataclass Python" },
                { name: "frozen=True: كائن غير قابل للتغيير", primary: "frozen dataclass immutable Python" },
                { name: "post_init: منطق ما بعد الإنشاء", primary: "__post_init__ dataclass Python validation" },
                { name: "attrs: البديل الأكثر مرونة", primary: "attrs library define class Python" },
                { name: "Pydantic BaseModel: التحقق التلقائي", primary: "Pydantic BaseModel validation Python" },
                { name: "Pydantic v2: الأسرع والأدق", primary: "Pydantic v2 validation serialization Python" },
                { name: "تحويل JSON لكائنات Pydantic", primary: "Pydantic JSON parsing model Python" },
                { name: "تمارين: نموذج طلب API بـ Pydantic", primary: "API request model Pydantic Python exercises" }
              ]
            },
            {
              unit_index: 7, code: "2.1.7",
              name: "الوراثة المتعددة وMRO",
              goal: "فهم الوراثة المتعددة وترتيب حل الطرق MRO وبناء تسلسلات هرمية صحيحة",
              key_concepts: ["Multiple Inheritance","MRO","C3 Linearization","Diamond Problem","Mixin Pattern"],
              lessons: [
                { name: "الوراثة المتعددة في Python: ممكنة ومفيدة", primary: "multiple inheritance Python possible useful" },
                { name: "مشكلة الماسة Diamond Problem", primary: "diamond problem multiple inheritance Python" },
                { name: "MRO: ترتيب حل الطرق والـ C3", primary: "MRO C3 linearization Python __mro__" },
                { name: "super() في الوراثة المتعددة", primary: "super() multiple inheritance cooperative Python" },
                { name: "Mixin Pattern: إضافة قدرات بلا فئة أب", primary: "mixin pattern Python capabilities composable" },
                { name: "Mixin للـ logging والسلسلة والرياضيات", primary: "mixin logging serialization Python practical" },
                { name: "متى تستخدم الوراثة المتعددة وتبعاتها", primary: "multiple inheritance when to use Python caution" },
                { name: "Composition كبديل أوضح للوراثة المتعددة", primary: "composition alternative multiple inheritance Python" },
                { name: "فحص MRO بـ __mro__ وmro()", primary: "inspect MRO Python __mro__ method resolution" },
                { name: "تمارين: نظام قدرات مُركّب بـ Mixins", primary: "capability system mixins Python project" }
              ]
            },
            {
              unit_index: 8, code: "2.1.8",
              name: "الميتا-برمجة Metaclasses",
              goal: "فهم فئات الفئات Metaclasses وكيف تتحكم في إنشاء الفئات في Python",
              key_concepts: ["Metaclass","type","__new__","__init_subclass__","Class Creation","Registry"],
              lessons: [
                { name: "كل شيء كائن في Python: حتى الفئات", primary: "Python everything object class metaclass type" },
                { name: "type(): صانع الفئات الديناميكي", primary: "type builtin metaclass dynamic class Python" },
                { name: "Metaclass: فئة الفئات", primary: "metaclass __metaclass__ Python class creation" },
                { name: "__new__ في الفئة: التحكم بالإنشاء", primary: "__new__ class creation control Python" },
                { name: "__init_subclass__: خطاف الوراثة", primary: "__init_subclass__ inheritance hook Python" },
                { name: "Singleton بـ Metaclass", primary: "singleton pattern metaclass Python" },
                { name: "Registry Pattern: تسجيل الفئات تلقائياً", primary: "registry pattern metaclass auto-register Python" },
                { name: "abc.ABCMeta: الـ metaclass لـ ABC", primary: "ABCMeta abstract base class Python" },
                { name: "__class_getitem__: دعم Generic", primary: "class_getitem generic Python typing" },
                { name: "تمارين: ORM بسيط بـ Metaclass", primary: "simple ORM metaclass Python project" }
              ]
            },
            {
              unit_index: 9, code: "2.1.9",
              name: "أنماط التصميم Design Patterns في Python",
              goal: "تطبيق أنماط التصميم الكلاسيكية بطريقة Pythonic مع معرفة متى تستخدم كل نمط",
              key_concepts: ["Factory","Singleton","Observer","Strategy","Command","Decorator Pattern"],
              lessons: [
                { name: "أنماط التصميم في Python: ما يختلف", primary: "design patterns Python idiomatic difference GoF" },
                { name: "Factory Method: إنشاء كائنات بمرونة", primary: "factory method pattern Python" },
                { name: "Singleton: مثيل واحد للكائن", primary: "singleton pattern Python metaclass" },
                { name: "Observer: نظام الأحداث والمراقبة", primary: "observer pattern event system Python" },
                { name: "Strategy: تغيير الخوارزمية ديناميكياً", primary: "strategy pattern algorithm swap Python" },
                { name: "Command: كبسلة العمليات وundo", primary: "command pattern undo redo Python" },
                { name: "Decorator Pattern: تغليف الوظائف", primary: "decorator pattern wrapper Python class" },
                { name: "Repository: فصل البيانات عن المنطق", primary: "repository pattern data access Python" },
                { name: "Dependency Injection: حقن الاعتماديات", primary: "dependency injection Python OOP" },
                { name: "تمارين: نظام تنبيهات بـ Observer", primary: "notification system observer Python project" }
              ]
            },
            {
              unit_index: 10, code: "2.1.10",
              name: "مشروع OOP: نظام محاكاة البنك",
              goal: "بناء نظام محاكاة بنكي كامل يُجسّد مبادئ OOP والأنماط الهندسية في Python",
              key_concepts: ["Bank System","OOP Application","SOLID","Design Patterns","Testing"],
              lessons: [
                { name: "تصميم نظام البنك: الكيانات والعلاقات", primary: "bank system design entities OOP Python" },
                { name: "فئات الحسابات: Account وSavings وChecking", primary: "account classes hierarchy Python OOP" },
                { name: "فئة العميل Customer وسمات ومعلوماتها", primary: "customer class attributes Python OOP" },
                { name: "فئة البنك: إدارة الحسابات والعمليات", primary: "bank class management operations Python" },
                { name: "نظام المعاملات: Transaction وHistory", primary: "transaction history Python OOP" },
                { name: "أنماط: Observer للإشعارات وFactory للحسابات", primary: "observer factory patterns Python bank" },
                { name: "محاكاة الفوائد والرسوم التلقائية", primary: "interest fees simulation Python OOP" },
                { name: "واجهة CLI تفاعلية للنظام البنكي", primary: "CLI interface bank system Python" },
                { name: "اختبارات pytest شاملة للنظام", primary: "pytest comprehensive testing bank Python" },
                { name: "التوثيق والنشر على GitHub", primary: "documentation GitHub bank system Python" }
              ]
            }
          ]
        },
        {
          stage_index: 2,
          name: "الدوال المتقدمة والبرمجة الوظيفية",
          goal: "إتقان المزخرفات والمولدات والتكرار المتقدم والبرمجة الوظيفية في Python لكتابة كود أقوى وأكثر مرونة وإعادة استخدام",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 72, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 22 },
          units: [
            {
              unit_index: 1, code: "2.2.1",
              name: "المزخرفات Decorators بعمق",
              goal: "فهم وبناء مزخرفات متقدمة للتسجيل والتذكر والتحقق والتطبيق في مكتبات حقيقية",
              key_concepts: ["Decorator","@functools.wraps","Class Decorator","Parametrized Decorator","Stacking"],
              lessons: [
                { name: "كيف يعمل المزخرف داخلياً", primary: "decorator internals wrapper function Python" },
                { name: "functools.wraps: الحفاظ على هوية الدالة", primary: "functools wraps decorator identity metadata Python" },
                { name: "مزخرف مع معاملات: مصنع المزخرفات", primary: "parametrized decorator factory Python" },
                { name: "مزخرفات الفئات: تزيين الكلاس كله", primary: "class decorator modify class Python" },
                { name: "تكديس المزخرفات: الترتيب مهم", primary: "stacking decorators order Python" },
                { name: "مزخرف التسجيل logging decorator", primary: "logging decorator Python function calls" },
                { name: "مزخرف التوقيت والأداء", primary: "timing performance decorator Python" },
                { name: "مزخرف التحقق من الأنواع", primary: "type checking decorator Python runtime" },
                { name: "مزخرف retry وCircuit Breaker", primary: "retry circuit breaker decorator Python" },
                { name: "تمارين: مكتبة مزخرفات احترافية", primary: "decorator library professional Python project" }
              ]
            },
            {
              unit_index: 2, code: "2.2.2",
              name: "المولدات Generators والـ yield",
              goal: "بناء مولدات فعّالة للذاكرة لمعالجة تسلسلات كبيرة بكفاءة بالغة",
              key_concepts: ["Generator","yield","yield from","send()","Generator Expression","Lazy Evaluation"],
              lessons: [
                { name: "المولد: دالة تُعيد قيمة كل مرة", primary: "generator function yield Python lazy" },
                { name: "yield: إيقاف مؤقت وإعادة قيمة", primary: "yield statement generator Python" },
                { name: "Generator Expression: comprehension كسول", primary: "generator expression parentheses Python memory" },
                { name: "yield from: تفويض لمولد آخر", primary: "yield from delegation generator Python" },
                { name: "send(): تمرير قيمة للمولد", primary: "generator send() bidirectional Python" },
                { name: "throw() وclose(): التحكم في المولد", primary: "generator throw close exception Python" },
                { name: "المولدات لمعالجة ملفات ضخمة", primary: "generator large file processing Python memory" },
                { name: "Pipeline بالمولدات: سلسلة معالجة", primary: "generator pipeline data processing Python" },
                { name: "asyncio والمولدات: الجسر بينهما", primary: "generator asyncio async Python connection" },
                { name: "تمارين: معالج بيانات GB بالمولدات", primary: "large data processor generator Python project" }
              ]
            },
            {
              unit_index: 3, code: "2.2.3",
              name: "البرمجة الوظيفية Functional Programming",
              goal: "تطبيق مبادئ FP في Python من الدوال النظيفة والثبات وتركيب الدوال",
              key_concepts: ["Pure Functions","Immutability","Function Composition","Currying","Monad Concepts"],
              lessons: [
                { name: "مبادئ FP: ما يتبناه Python منها", primary: "functional programming principles Python" },
                { name: "الدوال النظيفة: ضمان اليقين", primary: "pure functions Python no side effects" },
                { name: "الثبات Immutability وهياكل البيانات المستمرة", primary: "immutability persistent data structures Python" },
                { name: "تركيب الدوال: pipe وcompose", primary: "function composition pipe compose Python" },
                { name: "Currying وPartial Application", primary: "currying partial application Python functools" },
                { name: "Functor وMap في Python", primary: "functor map functional Python" },
                { name: "التعامل مع الأخطاء: Either وMaybe", primary: "either maybe error handling functional Python" },
                { name: "Monad مبسط: التسلسل الآمن", primary: "monad simple chaining Python functional" },
                { name: "toolz وcytoolz: أدوات FP في Python", primary: "toolz cytoolz functional Python library" },
                { name: "تمارين: pipeline معالجة بيانات وظيفي", primary: "functional data pipeline Python project" }
              ]
            },
            {
              unit_index: 4, code: "2.2.4",
              name: "التكرار المتقدم والبروتوكول",
              goal: "بناء كائنات قابلة للتكرار مخصصة وفهم بروتوكول التكرار بعمق",
              key_concepts: ["Custom Iterator","__iter__","__next__","Infinite Iterator","Lazy Iterator"],
              lessons: [
                { name: "بناء Iterator مخصص من الصفر", primary: "custom iterator class Python protocol" },
                { name: "Iterable مقابل Iterator: الفرق الدقيق", primary: "iterable vs iterator Python distinction" },
                { name: "المكرر اللانهائي وإيقافه بـ islice", primary: "infinite iterator islice stop Python" },
                { name: "Lazy Loading: تحميل البيانات عند الطلب", primary: "lazy loading on demand Python iterator" },
                { name: "بناء range() مخصص بالكامل", primary: "custom range implementation Python" },
                { name: "Chained Iterators و pipelines", primary: "chained iterators pipeline Python" },
                { name: "Peekable Iterator: النظر قبل الأخذ", primary: "peekable iterator lookahead Python" },
                { name: "Windowed Iterator: نافذة متحركة", primary: "windowed iterator sliding window Python" },
                { name: "الأداء: Iterator vs List في الذاكرة", primary: "iterator vs list memory performance Python" },
                { name: "تمارين: dataset streamer لـ ML", primary: "ML dataset streamer iterator Python project" }
              ]
            },
            {
              unit_index: 5, code: "2.2.5",
              name: "الوصفات Descriptors والـ Properties المتقدمة",
              goal: "فهم بروتوكول الوصفات وبناء validators وتحويلات تلقائية على مستوى الفئة",
              key_concepts: ["Descriptor Protocol","__get__","__set__","__delete__","Non-data Descriptor","Data Descriptor"],
              lessons: [
                { name: "ما هو الوصف Descriptor ومتى يلزم", primary: "descriptor protocol Python when needed" },
                { name: "__get__: قراءة قيمة الوصف", primary: "__get__ descriptor read access Python" },
                { name: "__set__: كتابة قيمة الوصف", primary: "__set__ descriptor write Python" },
                { name: "__delete__: حذف قيمة الوصف", primary: "__delete__ descriptor Python" },
                { name: "Data vs Non-Data Descriptor: الأولوية", primary: "data non-data descriptor priority Python" },
                { name: "بناء Validator Descriptor قابل للإعادة", primary: "validator descriptor reusable Python" },
                { name: "Typed Descriptor: فرض النوع تلقائياً", primary: "typed descriptor enforce type Python" },
                { name: "بناء ORM بسيط بـ Descriptors", primary: "simple ORM descriptor Python model" },
                { name: "property هي Descriptor: المثال الكلاسيكي", primary: "property descriptor Python implementation" },
                { name: "تمارين: نظام حقول forms بـ Descriptors", primary: "form fields descriptor Python project" }
              ]
            },
            {
              unit_index: 6, code: "2.2.6",
              name: "الأداء وقياسه وتحسينه",
              goal: "تحديد وتحليل اختناقات الأداء وتطبيق تحسينات هادفة في كود Python",
              key_concepts: ["profiling","cProfile","timeit","memory_profiler","PyPy","Cython"],
              lessons: [
                { name: "timeit: قياس سريع للأداء", primary: "timeit measure performance Python snippet" },
                { name: "cProfile: ملف تفصيلي للأداء", primary: "cProfile profiling Python function calls" },
                { name: "line_profiler: أداء سطراً بسطر", primary: "line_profiler Python line by line" },
                { name: "memory_profiler: استهلاك الذاكرة", primary: "memory_profiler RAM usage Python" },
                { name: "تحسينات Python المدمجة: البيلت-إنز", primary: "built-in optimization Python fast operations" },
                { name: "NumPy كبديل للحلقات العددية", primary: "numpy replace loops numerical Python" },
                { name: "تحسين الذاكرة: __slots__ والمولدات", primary: "memory optimization slots generator Python" },
                { name: "Cython: كود Python بسرعة C", primary: "Cython Python performance C speed" },
                { name: "PyPy: مفسر أسرع لكود Python", primary: "PyPy faster Python JIT compiler" },
                { name: "تمارين: تحليل وتحسين كود بطيء", primary: "profiling slow code optimization Python project" }
              ]
            },
            {
              unit_index: 7, code: "2.2.7",
              name: "Meta-programming والديناميكية",
              goal: "كتابة كود Python يكتب ويعدل كوداً آخر في وقت التشغيل بشكل آمن ومفيد",
              key_concepts: ["getattr","setattr","hasattr","vars","inspect","exec","eval"],
              lessons: [
                { name: "getattr وsetattr وhasattr: الوصول الديناميكي", primary: "getattr setattr hasattr dynamic Python" },
                { name: "vars() وdir(): استكشاف الكائنات", primary: "vars dir object inspection Python" },
                { name: "inspect module: تشريح الدوال والفئات", primary: "inspect module signature Python" },
                { name: "eval() وexec(): تنفيذ كود ديناميكي", primary: "eval exec dynamic code Python" },
                { name: "compile(): بناء كود Python برمجياً", primary: "compile AST code generation Python" },
                { name: "AST: شجرة بنية الكود ومعالجتها", primary: "AST abstract syntax tree Python" },
                { name: "__getattr__ و__setattr__ في الفئة", primary: "__getattr__ __setattr__ class Python" },
                { name: "Proxy Pattern بـ __getattr__", primary: "proxy pattern __getattr__ Python" },
                { name: "كتابة باني كود Code Generator", primary: "code generator Python dynamic class" },
                { name: "تمارين: باني HTML ديناميكي", primary: "HTML generator meta-programming Python project" }
              ]
            },
            {
              unit_index: 8, code: "2.2.8",
              name: "Async Generators والـ Async Context Managers",
              goal: "بناء مولدات ومديري سياق غير متزامنة لدمج FP مع async بشكل احترافي",
              key_concepts: ["async def","async generator","async for","async with","AsyncContextManager"],
              lessons: [
                { name: "Async Generator: yield في دالة async", primary: "async generator yield Python async" },
                { name: "async for: التكرار على async generator", primary: "async for iteration Python async" },
                { name: "Async Context Manager بـ async with", primary: "async context manager Python async with" },
                { name: "@asynccontextmanager من contextlib", primary: "asynccontextmanager contextlib Python" },
                { name: "Async Iterator البروتوكول الكامل", primary: "async iterator __aiter__ __anext__ Python" },
                { name: "تحويل مصادر بيانات متزامنة لـ async", primary: "sync to async data source Python" },
                { name: "Async Pipeline للبيانات المتدفقة", primary: "async pipeline streaming data Python" },
                { name: "اختبار async generators وmocking", primary: "testing async generator mock Python" },
                { name: "Real-world: Async Database Cursor", primary: "async database cursor generator Python" },
                { name: "تمارين: Async file reader بالمولدات", primary: "async file reader generator Python project" }
              ]
            },
            {
              unit_index: 9, code: "2.2.9",
              name: "الأنماط الوظيفية في مشاريع حقيقية",
              goal: "تطبيق البرمجة الوظيفية في أكواد إنتاجية حقيقية بأسلوب Pythonic مناسب",
              key_concepts: ["Functional Real World","Event Sourcing","Pipeline","Transformation Chain","Immutable Data"],
              lessons: [
                { name: "FP في معالجة HTTP Request Pipeline", primary: "functional HTTP request pipeline Python" },
                { name: "FP في معالجة وتحويل البيانات", primary: "functional data transformation Python" },
                { name: "Event Sourcing: سجل الأحداث الثابت", primary: "event sourcing functional Python immutable" },
                { name: "CQRS: فصل القراءة عن الكتابة", primary: "CQRS command query Python functional" },
                { name: "البرمجة التفاعلية Reactive مع RxPY", primary: "reactive programming RxPY Python observable" },
                { name: "الـ Monadic Error Handling في الإنتاج", primary: "monadic error handling production Python" },
                { name: "FP مع OOP: التوازن الصحيح", primary: "functional OOP balance Python real world" },
                { name: "أداء FP في Python: المقايضات", primary: "functional performance trade-offs Python" },
                { name: "Hypothesis: اختبار الخصائص Property-based", primary: "hypothesis property based testing Python" },
                { name: "تمارين: نظام معالجة أحداث وظيفي", primary: "event processing system functional Python project" }
              ]
            },
            {
              unit_index: 10, code: "2.2.10",
              name: "مشروع: معالج بيانات ضخم بـ Generators و FP",
              goal: "بناء معالج بيانات ضخمة يعتمد على الأنماط الوظيفية والمولدات بذاكرة محدودة",
              key_concepts: ["Big Data Processing","Memory Efficiency","Generator Pipeline","FP Patterns","Streaming"],
              lessons: [
                { name: "تصميم معالج بيانات ضخمة الذاكرة", primary: "large data processor memory efficient Python" },
                { name: "Generator pipeline لقراءة GB من الملفات", primary: "generator pipeline GB files Python" },
                { name: "تحويل ديناميكي بالأنماط الوظيفية", primary: "functional transformation dynamic Python" },
                { name: "تصفية وتجميع البيانات الضخمة", primary: "large data filter aggregate Python" },
                { name: "كتابة النتائج بكفاءة", primary: "efficient write results streaming Python" },
                { name: "قياس الأداء والذاكرة بـ memory_profiler", primary: "memory profiler performance Python" },
                { name: "تحسين Pipeline حتى يعمل بـ 100MB RAM", primary: "memory optimization 100MB pipeline Python" },
                { name: "اختبار المعالج بـ pytest وfixtures", primary: "pytest fixtures test large processor Python" },
                { name: "توثيق الأداء والحدود والاستخدام", primary: "performance documentation limits Python" },
                { name: "نشر الأداة ومشاركتها كمكتبة", primary: "publish library Python data processor" }
              ]
            }
          ]
        },
        {
          stage_index: 3,
          name: "معالجة البيانات والأتمتة",
          goal: "إتقان أدوات البيانات الأساسية numpy وpandas وmatplotlib وتطبيقات الأتمتة والكشط والتعامل مع Excel",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 72, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 22 },
          units: [
            {
              unit_index: 1, code: "2.3.1",
              name: "NumPy: المصفوفات والحسابات العلمية",
              goal: "إتقان NumPy للحسابات العلمية والعمليات المتجهة بكفاءة عالية",
              key_concepts: ["ndarray","Broadcasting","Vectorization","ufunc","Linear Algebra","Random"],
              lessons: [
                { name: "NumPy ndarray: الهيكل الأساسي والأنواع", primary: "numpy ndarray dtype shape creation Python" },
                { name: "إنشاء المصفوفات: zeros وones وarange وlinspace", primary: "numpy zeros ones arange linspace Python" },
                { name: "العمليات الأساسية والبث Broadcasting", primary: "numpy broadcasting vectorized operations Python" },
                { name: "الفهرسة المتقدمة وBoolean Indexing", primary: "numpy advanced indexing boolean fancy Python" },
                { name: "تغيير الشكل reshape وtranspose", primary: "numpy reshape transpose flatten Python" },
                { name: "العمليات الجبرية: dot وmatmul وlinalg", primary: "numpy dot matmul linear algebra Python" },
                { name: "الإحصاء: mean وstd وpercentile", primary: "numpy statistics mean std percentile Python" },
                { name: "التوليد العشوائي بـ numpy.random", primary: "numpy random generator seeding Python" },
                { name: "حفظ وتحميل المصفوفات: npy وnpz", primary: "numpy save load npy npz Python" },
                { name: "تمارين: تطبيقات رياضية وإحصائية", primary: "numpy mathematical statistical applications Python" }
              ]
            },
            {
              unit_index: 2, code: "2.3.2",
              name: "Pandas: تحليل البيانات الجدولية",
              goal: "إتقان pandas كأداة رئيسية لتحليل البيانات من التحميل حتى التصدير والتصور",
              key_concepts: ["DataFrame","Series","loc","groupby","merge","pivot_table"],
              lessons: [
                { name: "Series وDataFrame: الأنواع الأساسية", primary: "pandas Series DataFrame basics Python" },
                { name: "قراءة البيانات: CSV وJSON وExcel وSQL", primary: "pandas read_csv json excel sql Python" },
                { name: "استكشاف البيانات: head وinfo وdescribe", primary: "pandas exploration head info describe Python" },
                { name: "loc وiloc: تحديد البيانات بدقة", primary: "pandas loc iloc selection Python" },
                { name: "قواعد التصفية والفلترة المتقدمة", primary: "pandas filtering conditions boolean Python" },
                { name: "groupby: تجميع وتحليل مجموعات", primary: "pandas groupby aggregate transform Python" },
                { name: "merge وjoin: دمج الجداول", primary: "pandas merge join concat Python" },
                { name: "pivot_table: الجدول المحوري", primary: "pandas pivot_table crosstab Python" },
                { name: "apply وmap وvectorized operations", primary: "pandas apply map vectorize Python" },
                { name: "تصدير البيانات: CSV وExcel وJSON", primary: "pandas export to_csv to_excel Python" }
              ]
            },
            {
              unit_index: 3, code: "2.3.3",
              name: "تنظيف البيانات ومعالجة القيم المفقودة",
              goal: "تنظيف ومعالجة وتحويل البيانات الواقعية المليئة بالمشاكل والقيم الناقصة",
              key_concepts: ["Data Cleaning","Missing Values","Outliers","Type Conversion","Normalization"],
              lessons: [
                { name: "مشاكل البيانات الواقعية: أنواعها وأسبابها", primary: "real world data problems types Python" },
                { name: "اكتشاف القيم المفقودة وتحليلها", primary: "missing values detection analysis pandas Python" },
                { name: "معالجة القيم المفقودة: fillna وdropna", primary: "fillna dropna imputation pandas Python" },
                { name: "اكتشاف ومعالجة القيم الشاذة Outliers", primary: "outliers detection removal IQR Python" },
                { name: "تحويل أنواع البيانات بأمان", primary: "type conversion safe pandas Python astype" },
                { name: "تنميط النصوص: strip وlower والاتساق", primary: "text normalization strip lower pandas Python" },
                { name: "ازالة التكرارات بـ drop_duplicates", primary: "duplicates removal pandas Python" },
                { name: "تحويل التواريخ والأوقات في pandas", primary: "datetime conversion pandas Python" },
                { name: "التحقق من صحة البيانات بعد التنظيف", primary: "data validation after cleaning Python" },
                { name: "تمارين: تنظيف dataset حقيقي قذر", primary: "dirty dataset cleaning real Python project" }
              ]
            },
            {
              unit_index: 4, code: "2.3.4",
              name: "Matplotlib وSeaborn: رسم البيانات",
              goal: "إنشاء مخططات احترافية وتقارير مرئية لاتخاذ القرار من البيانات",
              key_concepts: ["matplotlib","Figure","Axes","seaborn","Plot Types","Subplots"],
              lessons: [
                { name: "matplotlib: الأساس والفلسفة", primary: "matplotlib Figure Axes plotting Python" },
                { name: "المخططات الأساسية: line وbar وscatter", primary: "line bar scatter plot matplotlib Python" },
                { name: "subplots: رسوم متعددة في صورة واحدة", primary: "subplots multiple axes matplotlib Python" },
                { name: "تنسيق المخططات: ألوان وعناوين وتسميات", primary: "plot formatting colors titles labels Python" },
                { name: "Histogram وbox plot: توزيع البيانات", primary: "histogram boxplot distribution matplotlib Python" },
                { name: "Seaborn: مخططات إحصائية جميلة", primary: "seaborn statistical plots heatmap violin Python" },
                { name: "Heatmap: الارتباط بين المتغيرات", primary: "heatmap correlation seaborn Python" },
                { name: "الرسوم البيانية التفاعلية بـ plotly", primary: "plotly interactive charts Python" },
                { name: "حفظ المخططات بدقة عالية", primary: "save plot PNG PDF high resolution Python" },
                { name: "تمارين: تقرير مرئي شامل لبيانات", primary: "visual report comprehensive data Python" }
              ]
            },
            {
              unit_index: 5, code: "2.3.5",
              name: "أتمتة Excel وGoogle Sheets",
              goal: "أتمتة إنشاء وتعديل وتحليل ملفات Excel والتواصل مع Google Sheets برمجياً",
              key_concepts: ["openpyxl","xlrd","xlwt","gspread","Excel Automation","Google Sheets API"],
              lessons: [
                { name: "openpyxl: قراءة وكتابة xlsx", primary: "openpyxl Excel read write Python" },
                { name: "إنشاء تقارير Excel من Python", primary: "Excel report generation openpyxl Python" },
                { name: "التنسيق والألوان والمخططات في Excel", primary: "Excel formatting charts colors openpyxl Python" },
                { name: "الصيغ والمعادلات في خلايا Excel", primary: "Excel formulas cells openpyxl Python" },
                { name: "معالجة ملفات Excel متعددة دفعة", primary: "batch Excel processing multiple files Python" },
                { name: "pandas وExcel: التكامل الأمثل", primary: "pandas Excel integration read_excel to_excel Python" },
                { name: "Google Sheets API بـ gspread", primary: "gspread Google Sheets API Python" },
                { name: "قراءة وكتابة Google Sheets تلقائياً", primary: "Google Sheets read write automation Python" },
                { name: "مزامنة بيانات Google Sheets وExcel", primary: "Google Sheets Excel sync Python" },
                { name: "تمارين: تقرير مبيعات Excel تلقائي", primary: "sales report Excel automation Python project" }
              ]
            },
            {
              unit_index: 6, code: "2.3.6",
              name: "كشط الويب Web Scraping",
              goal: "جمع وتنظيم بيانات مواقع الويب باستخدام requests وBeautifulSoup وScrapeOpy",
              key_concepts: ["requests","BeautifulSoup","CSS Selectors","XPath","Selenium","Rate Limiting"],
              lessons: [
                { name: "الكشط القانوني والأخلاقي وrobots.txt", primary: "web scraping legal ethical robots.txt Python" },
                { name: "requests + BeautifulSoup: الأساس الصلب", primary: "requests BeautifulSoup scraping Python" },
                { name: "محددات CSS وXPath: استهداف العناصر", primary: "CSS selectors XPath BeautifulSoup Python" },
                { name: "التعامل مع الترقيم وعدة صفحات", primary: "pagination multiple pages scraping Python" },
                { name: "التعامل مع Headers والـ Cookies", primary: "headers cookies session scraping Python" },
                { name: "Selenium: مواقع JavaScript الديناميكية", primary: "Selenium JavaScript dynamic scraping Python" },
                { name: "Playwright: كشط حديث وموثوق", primary: "Playwright modern scraping Python" },
                { name: "معدل الطلبات وتجنب الحظر", primary: "rate limiting avoid blocking scraping Python" },
                { name: "حفظ البيانات في قواعد بيانات", primary: "scraped data database save Python" },
                { name: "تمارين: موّلد بيانات مواقع حقيقية", primary: "real website data scraper Python project" }
              ]
            },
            {
              unit_index: 7, code: "2.3.7",
              name: "معالجة الملفات الضخمة والـ ETL",
              goal: "بناء عمليات ETL للملفات الضخمة بشكل فعّال وموثوق",
              key_concepts: ["ETL","Extract Transform Load","Chunking","Dask","Streaming ETL"],
              lessons: [
                { name: "ما هو ETL ولماذا يهم في البيانات", primary: "ETL extract transform load Python data" },
                { name: "Chunking: معالجة CSV الضخم دفعة", primary: "chunking chunksize pandas large CSV Python" },
                { name: "الاستخراج من مصادر متعددة", primary: "extract multiple sources ETL Python" },
                { name: "التحويل: تنظيف ودمج وتحويل الأنواع", primary: "transform cleaning merging ETL Python" },
                { name: "التحميل: قاعدة البيانات والملفات", primary: "load database files ETL Python" },
                { name: "Dask: pandas للبيانات الكبيرة جداً", primary: "Dask large data pandas parallel Python" },
                { name: "Polars: بديل pandas السريع", primary: "Polars DataFrame fast Python alternative" },
                { name: "معالجة أخطاء ETL والتوثيق", primary: "ETL error handling logging Python" },
                { name: "جدولة ETL بـ schedule وAirflow", primary: "ETL scheduling Airflow Python automation" },
                { name: "تمارين: ETL pipeline لبيانات حقيقية", primary: "ETL pipeline real data Python project" }
              ]
            },
            {
              unit_index: 8, code: "2.3.8",
              name: "الإحصاء والتحليل الاستكشافي EDA",
              goal: "تطبيق التحليل الاستكشافي الشامل للبيانات باستخدام Python لاستخراج القصص من الأرقام",
              key_concepts: ["EDA","Descriptive Statistics","Correlation","Distribution","Hypothesis Testing"],
              lessons: [
                { name: "الإحصاء الوصفي: المتوسط والوسيط والانحراف", primary: "descriptive statistics mean median std Python" },
                { name: "توزيع البيانات: اعرف بياناتك أولاً", primary: "data distribution normal skew kurtosis Python" },
                { name: "مصفوفة الارتباط وتفسيرها", primary: "correlation matrix heatmap interpretation Python" },
                { name: "اكتشاف الأنماط والتجمعات", primary: "patterns clusters outliers EDA Python" },
                { name: "التحليل المتغير الواحد Univariate", primary: "univariate analysis single variable Python" },
                { name: "التحليل ثنائي المتغير Bivariate", primary: "bivariate analysis two variables Python" },
                { name: "اختبار الفرضيات: t-test وchi-square", primary: "hypothesis testing t-test chi-square Python scipy" },
                { name: "تقرير EDA تلقائي بـ ydata-profiling", primary: "ydata profiling pandas EDA report Python" },
                { name: "تفسير النتائج والحكاية بالبيانات", primary: "data storytelling insights interpretation Python" },
                { name: "تمارين: EDA كامل على dataset حقيقي", primary: "complete EDA real dataset Python project" }
              ]
            },
            {
              unit_index: 9, code: "2.3.9",
              name: "مقدمة تعلم الآلة بـ scikit-learn",
              goal: "بناء نماذج تعلم آلة أساسية وتقييمها باستخدام scikit-learn في Python",
              key_concepts: ["scikit-learn","Classification","Regression","Train-Test Split","Model Evaluation"],
              lessons: [
                { name: "تعلم الآلة في Python: خريطة المنطقة", primary: "machine learning Python overview scikit-learn" },
                { name: "تهيئة البيانات: Feature Engineering", primary: "feature engineering preprocessing Python scikit" },
                { name: "التقسيم: train_test_split والتحقق", primary: "train test split validation sklearn Python" },
                { name: "التصنيف: Logistic Regression وDecision Tree", primary: "classification logistic regression tree sklearn Python" },
                { name: "الانحدار: Linear Regression والتقييم", primary: "linear regression evaluation sklearn Python" },
                { name: "التجميع: K-Means وDBSCAN", primary: "clustering K-means DBSCAN sklearn Python" },
                { name: "تقييم النموذج: Accuracy وF1 وROC", primary: "model evaluation accuracy F1 ROC sklearn Python" },
                { name: "Pipeline في scikit-learn", primary: "sklearn Pipeline estimator Python" },
                { name: "حفظ وتحميل النماذج بـ joblib", primary: "save load model joblib sklearn Python" },
                { name: "تمارين: نموذج تنبؤي لبيانات حقيقية", primary: "predictive model real data sklearn Python project" }
              ]
            },
            {
              unit_index: 10, code: "2.3.10",
              name: "مشروع: تحليل بيانات حقيقي ومرئي كامل",
              goal: "إنجاز تحليل بيانات حقيقي كامل من التحميل حتى التقرير النهائي والعرض",
              key_concepts: ["End-to-End Analysis","EDA","Visualization","Insights","Presentation"],
              lessons: [
                { name: "اختيار dataset حقيقي ومثير للاهتمام", primary: "dataset selection real world Python project" },
                { name: "استيراد وفهم هيكل البيانات", primary: "data import structure understanding Python" },
                { name: "تنظيف شامل للبيانات الواقعية", primary: "comprehensive data cleaning Python project" },
                { name: "EDA: تحليل استكشافي كامل", primary: "EDA complete Python project analysis" },
                { name: "رسوم بيانية متعددة وقصة مرئية", primary: "multiple charts visual story Python" },
                { name: "إحصاء وتحليل الأنماط المكتشفة", primary: "patterns statistics discovery Python analysis" },
                { name: "نموذج تعلم آلة بسيط على البيانات", primary: "simple ML model data Python project" },
                { name: "Jupyter Notebook تفاعلي للعرض", primary: "Jupyter notebook presentation Python project" },
                { name: "تقرير PDF بـ reportlab أو PDF export", primary: "PDF report generation Python project" },
                { name: "نشر التحليل على GitHub Pages أو Kaggle", primary: "publish analysis GitHub Kaggle Python" }
              ]
            }
          ]
        },
        {
          stage_index: 4,
          name: "البرمجة غير المتزامنة والشبكات",
          goal: "إتقان asyncio والبرمجة المتزامنة والشبكات في Python لبناء تطبيقات عالية الأداء تتعامل مع آلاف الطلبات المتزامنة",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 72, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 22 },
          units: [
            {
              unit_index: 1, code: "2.4.1",
              name: "المتزامنية: Threading وMultiprocessing",
              goal: "فهم النموذجين الرئيسيين للتزامن في Python واختيار الأنسب لكل مشكلة",
              key_concepts: ["GIL","threading","multiprocessing","I/O bound","CPU bound","Thread Safety"],
              lessons: [
                { name: "GIL: القيد الأكبر في Python المتزامن", primary: "GIL Global Interpreter Lock Python threading" },
                { name: "I/O Bound مقابل CPU Bound: الفرق الجوهري", primary: "IO bound CPU bound threading multiprocessing Python" },
                { name: "threading.Thread: الخيوط الأساسية", primary: "threading Thread Python basic" },
                { name: "thread-safe: Race Conditions والـ Lock", primary: "thread safe race condition Lock Python" },
                { name: "ThreadPoolExecutor: خيوط بكفاءة", primary: "ThreadPoolExecutor concurrent futures Python" },
                { name: "multiprocessing.Process: عمليات منفصلة", primary: "multiprocessing Process Python" },
                { name: "ProcessPoolExecutor: موازاة CPU", primary: "ProcessPoolExecutor CPU parallel Python" },
                { name: "Queue للتواصل بين الخيوط والعمليات", primary: "Queue multiprocessing threading communication Python" },
                { name: "concurrent.futures: واجهة موحدة", primary: "concurrent futures unified threading multiprocessing" },
                { name: "تمارين: معالج صور متوازي بالعمليات", primary: "parallel image processor multiprocessing Python" }
              ]
            },
            {
              unit_index: 2, code: "2.4.2",
              name: "asyncio: الأساسيات العملية",
              goal: "كتابة كود async/await صحيح وفعّال باستخدام asyncio لمعالجة I/O غير متزامن",
              key_concepts: ["asyncio","async def","await","event loop","coroutine","Task"],
              lessons: [
                { name: "لماذا asyncio؟ حل مشكلة I/O الانتظار", primary: "asyncio why IO waiting Python concurrent" },
                { name: "async def وawait: الكلمتان الجوهريتان", primary: "async def await coroutine Python" },
                { name: "event loop: قلب asyncio", primary: "event loop asyncio Python run" },
                { name: "asyncio.Task: تشغيل coroutines متزامنة", primary: "asyncio Task create_task Python" },
                { name: "asyncio.gather: انتظار مهام متعددة", primary: "asyncio gather concurrent coroutines Python" },
                { name: "asyncio.sleep: انتظار غير محجوب", primary: "asyncio sleep non-blocking wait Python" },
                { name: "asyncio.timeout: حد زمني للمهام", primary: "asyncio timeout wait_for Python" },
                { name: "asyncio.Queue: طابور غير متزامن", primary: "asyncio Queue producer consumer Python" },
                { name: "asyncio.Lock وSemaphore: تحكم متزامن", primary: "asyncio Lock Semaphore Python" },
                { name: "تمارين: مجلب URL متزامن سريع", primary: "async URL fetcher concurrent Python project" }
              ]
            },
            {
              unit_index: 3, code: "2.4.3",
              name: "asyncio المتقدم والـ Patterns",
              goal: "بناء أنظمة async معقدة بأنماط احترافية لمعالجة الأخطاء والإلغاء والتزامن المتقدم",
              key_concepts: ["CancelledError","Structured Concurrency","asyncio.shield","TaskGroup","Backpressure"],
              lessons: [
                { name: "إلغاء المهام: CancelledError وcleanup", primary: "asyncio cancel task CancelledError Python" },
                { name: "Structured Concurrency بـ TaskGroup (3.11+)", primary: "asyncio TaskGroup structured concurrency Python" },
                { name: "asyncio.shield: حماية المهمة من الإلغاء", primary: "asyncio shield protect task Python" },
                { name: "Backpressure: ضبط تدفق البيانات", primary: "backpressure flow control asyncio Python" },
                { name: "Producer-Consumer Pattern بـ asyncio", primary: "producer consumer asyncio Queue Python" },
                { name: "Fan-out وFan-in: توزيع وجمع العمل", primary: "fan-out fan-in asyncio tasks Python" },
                { name: "Retry وCircuit Breaker مع asyncio", primary: "retry circuit breaker asyncio Python" },
                { name: "asyncio debugging: متتبع الأخطاء", primary: "asyncio debugging enable debug Python" },
                { name: "اختبار الكود async بـ pytest-asyncio", primary: "pytest asyncio testing async Python" },
                { name: "تمارين: Web Crawler غير متزامن", primary: "async web crawler Python project" }
              ]
            },
            {
              unit_index: 4, code: "2.4.4",
              name: "aiohttp: HTTP غير متزامن",
              goal: "بناء clients وservers HTTP غير متزامنة عالية الأداء باستخدام aiohttp",
              key_concepts: ["aiohttp","ClientSession","async HTTP","WebSocket","Middleware","Rate Limiting"],
              lessons: [
                { name: "aiohttp: HTTP غير متزامن لـ Python", primary: "aiohttp async HTTP client server Python" },
                { name: "ClientSession: إدارة الاتصالات الفعّالة", primary: "aiohttp ClientSession connection pool Python" },
                { name: "إرسال طلبات GET وPOST وغيرها", primary: "aiohttp GET POST requests Python" },
                { name: "معالجة الاستجابات والـ JSON", primary: "aiohttp response JSON Python" },
                { name: "Timeout وRetry في aiohttp", primary: "aiohttp timeout retry Python" },
                { name: "aiohttp.web: خادم ويب بسيط", primary: "aiohttp web server routes Python" },
                { name: "Middleware في aiohttp", primary: "aiohttp middleware request response Python" },
                { name: "WebSocket بـ aiohttp", primary: "aiohttp WebSocket client server Python" },
                { name: "اختبار aiohttp بـ pytest", primary: "pytest aiohttp testing mock Python" },
                { name: "تمارين: API aggregator بـ aiohttp", primary: "API aggregator aiohttp Python project" }
              ]
            },
            {
              unit_index: 5, code: "2.4.5",
              name: "الشبكات بـ sockets وpyzmq",
              goal: "برمجة الشبكات على مستوى المقابس للتطبيقات الشبكية المخصصة",
              key_concepts: ["socket","TCP","UDP","Non-blocking","ZeroMQ","Protocols"],
              lessons: [
                { name: "بروتوكولات الشبكات: TCP مقابل UDP", primary: "TCP UDP protocols networking Python" },
                { name: "socket: برمجة الشبكة الأساسية", primary: "socket programming Python basic" },
                { name: "خادم TCP بسيط وعميله", primary: "TCP server client Python socket" },
                { name: "Socket غير محجوب وselectوpoll", primary: "non-blocking socket select Python" },
                { name: "socketserver: خادم متعدد العملاء", primary: "socketserver multi-client Python" },
                { name: "UDP: الاتصال بلا اتصال", primary: "UDP socket datagram Python" },
                { name: "SSL/TLS: تشفير الشبكات بـ Python", primary: "SSL TLS socket encryption Python" },
                { name: "ZeroMQ: شبكات المراسلة المتقدمة", primary: "ZeroMQ pyzmq messaging patterns Python" },
                { name: "Pub/Sub وReq/Rep بـ ZeroMQ", primary: "ZeroMQ pub sub req rep Python" },
                { name: "تمارين: نظام دردشة socket مباشر", primary: "chat system socket Python project" }
              ]
            },
            {
              unit_index: 6, code: "2.4.6",
              name: "البروتوكولات والـ Serialization الشبكية",
              goal: "بناء بروتوكولات مخصصة وتسلسل البيانات للتواصل الفعّال عبر الشبكة",
              key_concepts: ["Protocol Design","msgpack","Protocol Buffers","JSON RPC","WebSocket Protocol"],
              lessons: [
                { name: "تصميم بروتوكول شبكي مخصص", primary: "custom network protocol design Python" },
                { name: "msgpack للتسلسل الثنائي السريع", primary: "msgpack binary serialization network Python" },
                { name: "Protocol Buffers بـ protobuf", primary: "protobuf protocol buffers Python network" },
                { name: "JSON-RPC: استدعاء إجراءات بعيد", primary: "JSON RPC remote procedure call Python" },
                { name: "WebSocket Protocol: الاتصال الثنائي", primary: "WebSocket protocol bidirectional Python" },
                { name: "HTTP/2 في Python", primary: "HTTP2 h2 httpx Python" },
                { name: "gRPC: الاستدعاء بعيد المدى الحديث", primary: "gRPC Python service definition" },
                { name: "MQTT: بروتوكول IoT في Python", primary: "MQTT IoT paho Python" },
                { name: "اختبار بروتوكولات الشبكة", primary: "network protocol testing Python mock" },
                { name: "تمارين: خادم gRPC للبيانات", primary: "gRPC server Python project" }
              ]
            },
            {
              unit_index: 7, code: "2.4.7",
              name: "httpx: HTTP الحديث لـ Python",
              goal: "استخدام httpx كمكتبة HTTP حديثة تدعم HTTP/2 وasync وsync بنفس الواجهة",
              key_concepts: ["httpx","async client","HTTP2","streaming","timeouts","auth"],
              lessons: [
                { name: "httpx: لماذا يتفوق على requests؟", primary: "httpx vs requests advantages Python" },
                { name: "httpx.Client: المزامن القوي", primary: "httpx Client sync requests Python" },
                { name: "httpx.AsyncClient: غير المتزامن", primary: "httpx AsyncClient async Python" },
                { name: "HTTP/2 في httpx", primary: "httpx HTTP2 Python" },
                { name: "Streaming الاستجابات الكبيرة", primary: "httpx streaming large response Python" },
                { name: "Auth: OAuth وBearer وBasic", primary: "httpx auth OAuth Bearer Python" },
                { name: "Timeout وRetry وTransport", primary: "httpx timeout retry transport Python" },
                { name: "httpx.MockTransport للاختبار", primary: "httpx MockTransport testing Python" },
                { name: "مقارنة httpx وaiohttp وrequests", primary: "httpx aiohttp requests comparison Python" },
                { name: "تمارين: client لـ REST API كامل", primary: "REST API client httpx Python project" }
              ]
            },
            {
              unit_index: 8, code: "2.4.8",
              name: "العمليات المتوازية والـ Workers",
              goal: "بناء أنظمة عمال وطوابير مهام لمعالجة العمل الكثير بالتوازي",
              key_concepts: ["Worker Pool","Task Queue","Celery","Redis Queue","Background Jobs"],
              lessons: [
                { name: "Task Queue: فلسفة المعالجة الخلفية", primary: "task queue background jobs Python why" },
                { name: "Celery: نظام المهام الأكثر شيوعاً", primary: "Celery task queue Python Redis broker" },
                { name: "إعداد Celery مع Redis كـ Broker", primary: "Celery Redis broker Python setup" },
                { name: "تعريف وتشغيل المهام Celery", primary: "Celery task define call Python" },
                { name: "Celery Beat: مهام مجدولة", primary: "Celery beat periodic tasks Python" },
                { name: "RQ (Redis Queue): البديل الأبسط", primary: "RQ Redis Queue background jobs Python" },
                { name: "مراقبة المهام: Flower لـ Celery", primary: "Flower Celery monitoring Python" },
                { name: "معالجة أخطاء المهام والـ Retry", primary: "Celery task failure retry Python" },
                { name: "اختبار المهام في الـ Eager Mode", primary: "Celery task testing eager Python" },
                { name: "تمارين: نظام إشعارات بريد إلكتروني", primary: "email notifications Celery Python project" }
              ]
            },
            {
              unit_index: 9, code: "2.4.9",
              name: "الأداء والـ Benchmarking للشبكات",
              goal: "قياس وتحسين أداء التطبيقات الشبكية في Python تحت الضغط",
              key_concepts: ["Benchmarking","Load Testing","Connection Pool","Keep-Alive","Profiling Async"],
              lessons: [
                { name: "قياس أداء التطبيقات الشبكية", primary: "network performance benchmarking Python" },
                { name: "Connection Pooling: إعادة استخدام الاتصالات", primary: "connection pool reuse Python HTTP" },
                { name: "Keep-Alive والـ Persistent Connections", primary: "keep-alive persistent connections Python" },
                { name: "Load Testing بـ locust", primary: "locust load testing Python" },
                { name: "أداء asyncio تحت ضغط حقيقي", primary: "asyncio performance under load Python" },
                { name: "Caching: تخفيف الضغط عن الشبكة", primary: "caching Redis HTTP Python performance" },
                { name: "CDN وProxy للتطبيقات Python", primary: "CDN proxy Python web performance" },
                { name: "تشخيص Bottlenecks في الشبكة", primary: "network bottleneck diagnosis Python" },
                { name: "Horizontal Scaling بـ Workers", primary: "horizontal scaling workers Python" },
                { name: "تمارين: تحسين API بـ 10x أداء", primary: "10x API performance optimization Python" }
              ]
            },
            {
              unit_index: 10, code: "2.4.10",
              name: "مشروع: خادم WebSocket ذكي للتحديثات",
              goal: "بناء خادم WebSocket غير متزامن متكامل يبث التحديثات لعملاء متعددين في الوقت الفعلي",
              key_concepts: ["WebSocket Server","Real-time","Broadcasting","Authentication","Scaling"],
              lessons: [
                { name: "تصميم الخادم: قنوات وعملاء وأحداث", primary: "WebSocket server design channels Python" },
                { name: "بناء خادم WebSocket بـ websockets", primary: "websockets server Python async" },
                { name: "إدارة العملاء المتصلين والانقطاع", primary: "WebSocket clients management disconnect Python" },
                { name: "البث Broadcasting للعملاء المتعددين", primary: "broadcast WebSocket multiple clients Python" },
                { name: "القنوات Channels والاشتراكات", primary: "WebSocket channels subscriptions Python" },
                { name: "المصادقة قبل الاتصال", primary: "WebSocket authentication JWT Python" },
                { name: "تخزين الحالة بـ Redis", primary: "WebSocket state Redis Python" },
                { name: "اختبار الخادم بـ pytest-asyncio", primary: "WebSocket testing pytest Python" },
                { name: "نشر الخادم بـ Docker", primary: "WebSocket Docker deploy Python" },
                { name: "توثيق الـ API وبروتوكول التواصل", primary: "WebSocket API documentation Python" }
              ]
            }
          ]
        },
        {
          stage_index: 5,
          name: "قواعد البيانات وواجهات API",
          goal: "بناء APIs احترافية وقواعد بيانات متكاملة باستخدام FastAPI وSQLAlchemy وأدوات Python الحديثة",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 72, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 22 },
          units: [
            {
              unit_index: 1, code: "2.5.1",
              name: "SQLite وSQL في Python",
              goal: "التعامل مع قواعد البيانات SQLite مباشرة عبر Python لبناء تطبيقات بقاعدة بيانات مدمجة",
              key_concepts: ["sqlite3","Connection","Cursor","SQL","Parameterized Queries","Transactions"],
              lessons: [
                { name: "SQLite: قاعدة البيانات المدمجة الأقوى", primary: "SQLite embedded database Python" },
                { name: "sqlite3: الاتصال وإنشاء الجداول", primary: "sqlite3 connect cursor Python" },
                { name: "INSERT وSELECT وUPDATE وDELETE", primary: "SQL CRUD sqlite3 Python" },
                { name: "Parameterized Queries: الأمان من SQL Injection", primary: "parameterized queries SQL injection Python" },
                { name: "Transactions: العمليات الذرية", primary: "transactions commit rollback SQLite Python" },
                { name: "الفهارس وتحسين أداء الاستعلامات", primary: "indexes query optimization SQLite Python" },
                { name: "JOIN وSubqueries في Python", primary: "JOIN subqueries SQL Python sqlite3" },
                { name: "Row Factory: نتائج كقواميس", primary: "row_factory dict sqlite3 Python" },
                { name: "sqlite3 وasync: aiosqlite", primary: "aiosqlite async SQLite Python" },
                { name: "تمارين: قاعدة بيانات مكتبة كتب", primary: "book library database SQLite Python" }
              ]
            },
            {
              unit_index: 2, code: "2.5.2",
              name: "SQLAlchemy ORM: قاعدة بيانات بـ Python",
              goal: "بناء طبقة قاعدة بيانات احترافية بـ SQLAlchemy ORM مع نماذج وعلاقات ومهاجرات",
              key_concepts: ["SQLAlchemy","declarative_base","Session","Relationship","Query","Migration"],
              lessons: [
                { name: "SQLAlchemy: Core مقابل ORM", primary: "SQLAlchemy Core ORM Python difference" },
                { name: "تعريف النماذج بـ declarative_base", primary: "SQLAlchemy model declarative Python" },
                { name: "الأنواع والقيود: Column وConstraint", primary: "SQLAlchemy Column types constraints Python" },
                { name: "العلاقات: relationship وForeignKey", primary: "SQLAlchemy relationship ForeignKey Python" },
                { name: "العلاقات: One-to-Many وMany-to-Many", primary: "SQLAlchemy one-to-many many-to-many Python" },
                { name: "Session: CRUD بـ ORM", primary: "SQLAlchemy Session add query Python" },
                { name: "الاستعلام المتقدم وFilter وJoin", primary: "SQLAlchemy filter join advanced query Python" },
                { name: "Alembic: مهاجرات قاعدة البيانات", primary: "Alembic migration SQLAlchemy Python" },
                { name: "Async SQLAlchemy بـ AsyncSession", primary: "async SQLAlchemy AsyncSession Python" },
                { name: "تمارين: نظام إدارة موظفين بـ SQLAlchemy", primary: "employee management SQLAlchemy Python project" }
              ]
            },
            {
              unit_index: 3, code: "2.5.3",
              name: "FastAPI: بناء REST APIs سريع",
              goal: "بناء REST APIs حديثة وسريعة وموثقة تلقائياً باستخدام FastAPI",
              key_concepts: ["FastAPI","Path Operations","Pydantic","Dependency Injection","OpenAPI","Async"],
              lessons: [
                { name: "FastAPI: السرعة والوضوح في بناء APIs", primary: "FastAPI introduction REST API Python" },
                { name: "Path Operations: GET وPOST وPUT وDELETE", primary: "FastAPI routes path operations Python" },
                { name: "Path Parameters وQuery Parameters", primary: "FastAPI path query parameters Python" },
                { name: "Request Body بـ Pydantic Models", primary: "FastAPI Pydantic request body Python" },
                { name: "Response Models والـ Status Codes", primary: "FastAPI response model status codes Python" },
                { name: "Dependency Injection في FastAPI", primary: "FastAPI dependency injection Python" },
                { name: "OpenAPI: التوثيق التلقائي والـ Swagger", primary: "FastAPI OpenAPI Swagger docs Python" },
                { name: "Error Handling والـ HTTPException", primary: "FastAPI HTTPException error handling Python" },
                { name: "Background Tasks في FastAPI", primary: "FastAPI background tasks Python" },
                { name: "تمارين: API مكتبة كتب CRUD كامل", primary: "book library CRUD API FastAPI Python" }
              ]
            },
            {
              unit_index: 4, code: "2.5.4",
              name: "المصادقة والتفويض في APIs",
              goal: "بناء نظام مصادقة آمن وكامل باستخدام JWT وOAuth لتأمين الـ APIs",
              key_concepts: ["JWT","OAuth2","Password Hashing","Bearer Token","Scopes","Security"],
              lessons: [
                { name: "مفاهيم المصادقة والتفويض الأساسية", primary: "authentication authorization Python API" },
                { name: "تجزئة كلمات المرور بـ passlib", primary: "passlib bcrypt password hashing Python" },
                { name: "JWT: توكن المصادقة المستقل", primary: "JWT JSON Web Token Python fastapi" },
                { name: "تسجيل الدخول وإنشاء JWT في FastAPI", primary: "login JWT creation FastAPI Python" },
                { name: "حماية المسارات بـ JWT", primary: "protected routes JWT FastAPI Python" },
                { name: "Refresh Tokens وتجديد الجلسة", primary: "refresh token JWT rotation Python" },
                { name: "OAuth2 وScopes والصلاحيات", primary: "OAuth2 scopes permissions FastAPI Python" },
                { name: "API Keys لتطبيقات التكامل", primary: "API keys authentication FastAPI Python" },
                { name: "Rate Limiting: الحماية من الإساءة", primary: "rate limiting API protection Python" },
                { name: "تمارين: API مع نظام مصادقة كامل", primary: "API authentication system FastAPI Python" }
              ]
            },
            {
              unit_index: 5, code: "2.5.5",
              name: "PostgreSQL وDatabases الإنتاجية",
              goal: "التعامل مع PostgreSQL كقاعدة بيانات إنتاجية وإعداد الاتصال والنسخ الاحتياطي",
              key_concepts: ["PostgreSQL","psycopg2","Connection Pooling","asyncpg","Full-text Search"],
              lessons: [
                { name: "PostgreSQL: لماذا تختاره للإنتاج", primary: "PostgreSQL production choice Python" },
                { name: "psycopg2: الاتصال بـ PostgreSQL", primary: "psycopg2 PostgreSQL connect Python" },
                { name: "asyncpg: PostgreSQL غير متزامن", primary: "asyncpg async PostgreSQL Python" },
                { name: "Connection Pooling بـ SQLAlchemy", primary: "connection pool SQLAlchemy PostgreSQL Python" },
                { name: "Full-text Search في PostgreSQL", primary: "full-text search PostgreSQL Python" },
                { name: "JSONB: بيانات شبه منظمة في Postgres", primary: "JSONB PostgreSQL JSON Python" },
                { name: "النسخ الاحتياطي والاسترداد", primary: "backup restore PostgreSQL Python" },
                { name: "قواعد البيانات المتعددة في Python", primary: "multiple databases Python SQLAlchemy" },
                { name: "قواعد البيانات غير العلائقية: MongoDB", primary: "MongoDB PyMongo Python NoSQL" },
                { name: "تمارين: تطبيق ويب بـ FastAPI وPostgres", primary: "FastAPI PostgreSQL web app Python project" }
              ]
            },
            {
              unit_index: 6, code: "2.5.6",
              name: "Redis والتخزين المؤقت",
              goal: "استخدام Redis لتسريع التطبيقات بالتخزين المؤقت وإدارة الجلسات والطوابير",
              key_concepts: ["Redis","Caching","Session Store","Pub/Sub","Expiry","redis-py"],
              lessons: [
                { name: "Redis: قاعدة بيانات الذاكرة الأسرع", primary: "Redis in-memory database Python" },
                { name: "redis-py: الاتصال والعمليات الأساسية", primary: "redis-py connect Python basic operations" },
                { name: "GET/SET وExpiry: التخزين المؤقت", primary: "Redis GET SET TTL caching Python" },
                { name: "List وHash وSet في Redis", primary: "Redis List Hash Set Python structures" },
                { name: "Caching للـ API: تسريع 100x", primary: "Redis API caching Python performance" },
                { name: "Session Store بـ Redis", primary: "Redis session storage Python" },
                { name: "Pub/Sub: نظام أحداث في الوقت الحقيقي", primary: "Redis pub sub events Python" },
                { name: "Redis Queue وJob Scheduling", primary: "Redis queue scheduling Python" },
                { name: "aioredis: Redis غير المتزامن", primary: "aioredis async Redis Python" },
                { name: "تمارين: API مع Cache Layer بـ Redis", primary: "API Redis caching Python project" }
              ]
            },
            {
              unit_index: 7, code: "2.5.7",
              name: "GraphQL في Python",
              goal: "بناء واجهات GraphQL مرنة بـ Strawberry وAriadne في Python",
              key_concepts: ["GraphQL","Schema","Resolver","Query","Mutation","Strawberry"],
              lessons: [
                { name: "GraphQL مقابل REST: متى تختار ماذا", primary: "GraphQL vs REST Python when" },
                { name: "Schema: تعريف نوع البيانات", primary: "GraphQL schema types Python" },
                { name: "Queries: قراءة البيانات", primary: "GraphQL queries resolvers Python" },
                { name: "Mutations: تعديل البيانات", primary: "GraphQL mutations Python" },
                { name: "Strawberry: GraphQL بـ Python وdecorators", primary: "Strawberry GraphQL Python" },
                { name: "Ariadne: GraphQL بـ SDL approach", primary: "Ariadne GraphQL SDL Python" },
                { name: "Subscriptions: الوقت الحقيقي بـ GraphQL", primary: "GraphQL subscriptions real-time Python" },
                { name: "DataLoader: حل مشكلة N+1", primary: "DataLoader N+1 GraphQL Python" },
                { name: "الأمان والتفويض في GraphQL", primary: "GraphQL security auth Python" },
                { name: "تمارين: API GraphQL لشبكة اجتماعية", primary: "GraphQL social network API Python project" }
              ]
            },
            {
              unit_index: 8, code: "2.5.8",
              name: "اختبار APIs والـ Integration Tests",
              goal: "اختبار APIs بشكل شامل من unit tests حتى integration tests وE2E",
              key_concepts: ["pytest","httpx testing","Test Client","Fixtures","Test Database","Mocking APIs"],
              lessons: [
                { name: "اختبار FastAPI بـ TestClient", primary: "FastAPI TestClient pytest Python" },
                { name: "httpx AsyncClient للاختبار الغير متزامن", primary: "httpx async test client Python" },
                { name: "Fixtures لإعداد قاعدة بيانات الاختبار", primary: "pytest fixtures test database Python" },
                { name: "Mock للاعتماديات الخارجية", primary: "mock external APIs Python testing" },
                { name: "اختبار المصادقة والتفويض", primary: "test authentication JWT Python API" },
                { name: "اختبار الأخطاء والـ Edge Cases", primary: "error edge cases API testing Python" },
                { name: "Integration Tests: من الـ API حتى DB", primary: "integration tests API database Python" },
                { name: "اختبار الأداء بـ locust", primary: "locust performance API testing Python" },
                { name: "Contract Testing: ضمان توافق APIs", primary: "contract testing API Python compatibility" },
                { name: "تمارين: suite اختبار API شامل", primary: "comprehensive API test suite Python project" }
              ]
            },
            {
              unit_index: 9, code: "2.5.9",
              name: "توثيق APIs والـ OpenAPI",
              goal: "كتابة توثيق API احترافي يمكّن المستهلكين من الاستخدام بدون مساعدة",
              key_concepts: ["OpenAPI","Swagger","ReDoc","API Versioning","Changelog","SDK Generation"],
              lessons: [
                { name: "أهمية توثيق API للمشاريع الحقيقية", primary: "API documentation importance Python" },
                { name: "OpenAPI Specification: المعيار العالمي", primary: "OpenAPI spec YAML JSON Python" },
                { name: "Swagger UI بـ FastAPI تلقائياً", primary: "Swagger UI FastAPI Python" },
                { name: "ReDoc: توثيق أجمل وأوضح", primary: "ReDoc FastAPI Python documentation" },
                { name: "إضافة أمثلة وشرح في OpenAPI", primary: "examples descriptions OpenAPI Python" },
                { name: "إصدارات API: Versioning Strategies", primary: "API versioning strategies Python" },
                { name: "Changelog: توثيق التغييرات", primary: "API changelog Python documentation" },
                { name: "توليد SDK تلقائياً من OpenAPI", primary: "SDK generation OpenAPI Python clients" },
                { name: "Postman Collections من OpenAPI", primary: "Postman collection OpenAPI Python" },
                { name: "تمارين: توثيق API كامل يمكن للعميل فهمه", primary: "complete API documentation Python project" }
              ]
            },
            {
              unit_index: 10, code: "2.5.10",
              name: "مشروع: API كاملة مع FastAPI وPostgres وRedis",
              goal: "بناء REST API إنتاجية كاملة بمصادقة وتخزين مؤقت وقاعدة بيانات وتوثيق",
              key_concepts: ["Production API","FastAPI","PostgreSQL","Redis","JWT","Docker"],
              lessons: [
                { name: "تصميم API: نقاط النهاية والنماذج", primary: "API design endpoints models Python" },
                { name: "إعداد FastAPI مع SQLAlchemy وAlembic", primary: "FastAPI SQLAlchemy Alembic Python setup" },
                { name: "نظام المستخدمين والمصادقة بـ JWT", primary: "users auth JWT FastAPI Python" },
                { name: "CRUD كامل مع Pydantic وORM", primary: "CRUD Pydantic SQLAlchemy FastAPI Python" },
                { name: "Redis Caching للطلبات المتكررة", primary: "Redis cache FastAPI Python" },
                { name: "Background Tasks للعمليات الثقيلة", primary: "background tasks Celery FastAPI Python" },
                { name: "اختبارات شاملة بـ pytest", primary: "pytest comprehensive FastAPI Python" },
                { name: "تغليف بـ Docker وDocker Compose", primary: "Docker docker-compose FastAPI Python" },
                { name: "نشر على Railway أو Render", primary: "deploy Railway Render FastAPI Python" },
                { name: "التوثيق النهائي والـ README الاحترافي", primary: "documentation README FastAPI Python project" }
              ]
            }
          ]
        },
        {
          stage_index: 6,
          name: "الاختبار والجودة والنشر",
          goal: "بناء pipeline جودة كامل من الاختبار الشامل حتى CI/CD والنشر الاحترافي في الإنتاج",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 72, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 22 },
          units: [
            {
              unit_index: 1, code: "2.6.1",
              name: "pytest المتقدم والاستراتيجيات",
              goal: "كتابة اختبارات pytest احترافية قابلة للصيانة وسريعة ومنظمة لمشاريع كبيرة",
              key_concepts: ["pytest plugins","conftest","markers","parametrize","xfail","parallel testing"],
              lessons: [
                { name: "pytest Plugins: توسيع القدرات", primary: "pytest plugins ecosystem Python" },
                { name: "conftest.py: fixture مشتركة للمشروع", primary: "conftest.py shared fixtures Python" },
                { name: "Markers: تصنيف وتنظيم الاختبارات", primary: "pytest markers custom Python" },
                { name: "xfail وskipif: الاختبارات المعلقة", primary: "pytest xfail skipif Python" },
                { name: "اختبارات متوازية بـ pytest-xdist", primary: "pytest-xdist parallel testing Python" },
                { name: "تغطية الكود: الأهداف والتقارير", primary: "code coverage pytest-cov goals Python" },
                { name: "Mutation Testing: هل اختباراتك حقيقية؟", primary: "mutation testing mutmut Python" },
                { name: "فصل الاختبارات: unit وintegration وe2e", primary: "test separation unit integration e2e Python" },
                { name: "Snapshot Testing: اختبار المخرجات الثابتة", primary: "snapshot testing pytest Python" },
                { name: "تمارين: suite اختبار لمشروع حقيقي", primary: "test suite real project Python" }
              ]
            },
            {
              unit_index: 2, code: "2.6.2",
              name: "SOLID وأنماط الكود النظيف",
              goal: "تطبيق مبادئ SOLID وأنماط الكود النظيف في Python لبناء نظم قابلة للتوسع",
              key_concepts: ["SOLID","SRP","OCP","LSP","ISP","DIP","Clean Code"],
              lessons: [
                { name: "SRP: مسؤولية واحدة لكل وحدة", primary: "single responsibility principle Python" },
                { name: "OCP: مفتوح للتوسع مغلق للتعديل", primary: "open closed principle Python" },
                { name: "LSP: قابلية الاستبدال الآمن", primary: "Liskov substitution principle Python" },
                { name: "ISP: واجهات صغيرة ومحددة", primary: "interface segregation principle Python" },
                { name: "DIP: الاعتماد على التجريد", primary: "dependency inversion principle Python" },
                { name: "تطبيق SOLID في مشروع Python حقيقي", primary: "SOLID real project Python application" },
                { name: "Code Smells: الأكواد ذات الرائحة", primary: "code smells detection Python refactoring" },
                { name: "Refactoring: تحسين الكود بدون تغيير السلوك", primary: "refactoring improve code Python" },
                { name: "DRY وYAGNI وKISS: المبادئ الكلاسيكية", primary: "DRY YAGNI KISS principles Python" },
                { name: "تمارين: إعادة كتابة كود سيء بـ SOLID", primary: "SOLID refactoring bad code Python" }
              ]
            },
            {
              unit_index: 3, code: "2.6.3",
              name: "Docker وحاويات Python",
              goal: "تغليف ونشر تطبيقات Python باستخدام Docker وDocker Compose بشكل احترافي",
              key_concepts: ["Docker","Dockerfile","docker-compose","Multi-stage Build","Container Registry"],
              lessons: [
                { name: "Docker: لماذا يغير قواعد اللعبة", primary: "Docker why containers Python applications" },
                { name: "Dockerfile لتطبيق Python", primary: "Dockerfile Python app build image" },
                { name: "المعلومات الأساسية: FROM وRUN وCOPY وCMD", primary: "Dockerfile FROM RUN COPY CMD Python" },
                { name: "Multi-stage Build: صور أصغر وأآمن", primary: "multi-stage Dockerfile Python" },
                { name: "docker-compose: بيئة تطوير كاملة", primary: "docker-compose Python service database Redis" },
                { name: "المتغيرات البيئية في Docker", primary: "Docker environment variables Python .env" },
                { name: "Docker Network: تواصل الخدمات", primary: "Docker network Python services" },
                { name: "Docker Volumes: بيانات دائمة", primary: "Docker volumes Python database persistence" },
                { name: "Docker Registry: رفع ومشاركة الصور", primary: "Docker Hub registry push pull Python" },
                { name: "تمارين: تطبيق Python مُحاويَر كاملاً", primary: "containerized Python app Docker project" }
              ]
            },
            {
              unit_index: 4, code: "2.6.4",
              name: "CI/CD بـ GitHub Actions",
              goal: "بناء pipeline CI/CD كامل يختبر ويبني وينشر تطبيق Python تلقائياً",
              key_concepts: ["GitHub Actions","Workflow","Pipeline","Automated Testing","Deployment","Secrets"],
              lessons: [
                { name: "CI/CD: فلسفة التسليم المستمر", primary: "CI CD continuous integration delivery Python" },
                { name: "GitHub Actions: تشغيل workflow", primary: "GitHub Actions workflow Python" },
                { name: "تشغيل pytest تلقائياً في كل push", primary: "GitHub Actions pytest automation Python" },
                { name: "matrix strategy: اختبار على Python متعدد", primary: "matrix strategy multiple Python versions GitHub" },
                { name: "Secrets في GitHub Actions", primary: "GitHub Actions secrets environment Python" },
                { name: "بناء Docker image وDockerhub", primary: "GitHub Actions Docker build push Python" },
                { name: "النشر التلقائي بعد اجتياز الاختبارات", primary: "auto deploy GitHub Actions Python" },
                { name: "Pre-commit Hooks في CI", primary: "pre-commit CI GitHub Actions Python" },
                { name: "تقرير التغطية بـ Codecov", primary: "Codecov coverage report GitHub Actions Python" },
                { name: "تمارين: pipeline كامل لمشروع Python", primary: "complete CI/CD pipeline Python project" }
              ]
            },
            {
              unit_index: 5, code: "2.6.5",
              name: "النشر على السحابة",
              goal: "نشر تطبيقات Python على منصات السحابة المختلفة بثقة وكفاءة",
              key_concepts: ["Railway","Render","Heroku","AWS","GCP","Cloud Deployment"],
              lessons: [
                { name: "خيارات النشر: PaaS vs IaaS مقارنة", primary: "PaaS IaaS cloud deployment Python comparison" },
                { name: "Railway: أسهل نشر لـ Python", primary: "Railway deploy Python app" },
                { name: "Render: بديل قوي ومجاني", primary: "Render deploy Python web service" },
                { name: "Heroku: المعيار التاريخي", primary: "Heroku deploy Python Procfile" },
                { name: "AWS EC2: الخوادم الافتراضية", primary: "AWS EC2 Python deployment" },
                { name: "AWS Lambda: Python بلا خوادم", primary: "AWS Lambda serverless Python" },
                { name: "Google Cloud Run: حاويات على السحابة", primary: "Google Cloud Run Python Docker" },
                { name: "إعداد Domain Name ومواقع HTTPS", primary: "domain HTTPS SSL Python deployment" },
                { name: "مراقبة التطبيق: Sentry وUptimerobot", primary: "Sentry monitoring Python production" },
                { name: "تمارين: نشر FastAPI كامل على الإنتاج", primary: "deploy FastAPI production Python project" }
              ]
            },
            {
              unit_index: 6, code: "2.6.6",
              name: "المراقبة والـ Observability",
              goal: "إضافة مراقبة شاملة للتطبيقات Python في الإنتاج لاكتشاف المشاكل قبل المستخدمين",
              key_concepts: ["Logging","Metrics","Tracing","Sentry","Prometheus","Grafana"],
              lessons: [
                { name: "Observability: رؤية التطبيق من الداخل", primary: "observability logging metrics tracing Python" },
                { name: "Structured Logging: سجلات قابلة للبحث", primary: "structured logging JSON Python production" },
                { name: "Sentry: تتبع الأخطاء في الإنتاج", primary: "Sentry error tracking Python production" },
                { name: "Prometheus: جمع المقاييس", primary: "Prometheus metrics Python application" },
                { name: "Grafana: لوحة مراقبة البيانات", primary: "Grafana dashboard Python Prometheus" },
                { name: "Distributed Tracing بـ OpenTelemetry", primary: "OpenTelemetry tracing Python" },
                { name: "Health Checks لتطبيق Python", primary: "health checks endpoint Python" },
                { name: "Alerts والإنذارات التلقائية", primary: "alerts notifications Python monitoring" },
                { name: "تشخيص مشاكل الإنتاج بالبيانات", primary: "production debugging data Python" },
                { name: "تمارين: مراقبة كاملة لـ FastAPI", primary: "monitoring FastAPI Python complete" }
              ]
            },
            {
              unit_index: 7, code: "2.6.7",
              name: "الأمان في تطبيقات Python",
              goal: "تأمين تطبيقات Python من الهجمات الشائعة وتطبيق أفضل ممارسات الأمان",
              key_concepts: ["OWASP","SQL Injection","XSS","CSRF","Secret Management","Security Headers"],
              lessons: [
                { name: "OWASP Top 10: المخاطر الرئيسية", primary: "OWASP top 10 Python security" },
                { name: "SQL Injection: الحماية التلقائية", primary: "SQL injection prevention Python SQLAlchemy" },
                { name: "XSS في Python Web Apps", primary: "XSS cross site scripting Python prevention" },
                { name: "CSRF: الحماية في APIs", primary: "CSRF protection Python FastAPI" },
                { name: "إدارة الأسرار: Vault وenv vars", primary: "secrets management Vault Python" },
                { name: "Security Headers بـ Python", primary: "security headers HSTS CSP Python" },
                { name: "Input Validation كطبقة دفاع أولى", primary: "input validation security Python Pydantic" },
                { name: "تدقيق أمني بـ bandit وsafety", primary: "bandit safety security audit Python" },
                { name: "Dependency Vulnerability Scanning", primary: "dependency vulnerabilities Python scanning" },
                { name: "تمارين: audit أمني وإصلاح ثغرات", primary: "security audit fix vulnerabilities Python" }
              ]
            },
            {
              unit_index: 8, code: "2.6.8",
              name: "الكود النظيف والمعمارية",
              goal: "تصميم معمارية برمجية قابلة للتوسع والصيانة لمشاريع Python الكبيرة",
              key_concepts: ["Layered Architecture","Hexagonal Architecture","DDD","Clean Architecture","Microservices"],
              lessons: [
                { name: "طبقات التطبيق: Presentation وBusiness وData", primary: "layered architecture Python" },
                { name: "Hexagonal Architecture: المنافذ والمحولات", primary: "hexagonal ports adapters Python" },
                { name: "Clean Architecture في Python", primary: "clean architecture Python layers" },
                { name: "DDD: Domain Driven Design مبادئ", primary: "DDD domain driven design Python" },
                { name: "Repository Pattern: فصل البيانات", primary: "repository pattern Python data access" },
                { name: "Service Layer: منطق الأعمال المعزول", primary: "service layer business logic Python" },
                { name: "Microservices بـ Python: التحضير", primary: "microservices Python preparation" },
                { name: "Event-Driven Architecture مبادئ", primary: "event driven architecture Python" },
                { name: "الانتقال من Monolith لـ Microservices", primary: "monolith microservices migration Python" },
                { name: "تمارين: إعادة هيكلة تطبيق بـ Clean Arch", primary: "clean architecture refactoring Python" }
              ]
            },
            {
              unit_index: 9, code: "2.6.9",
              name: "Git وادارة الكود الاحترافية",
              goal: "استخدام Git بشكل احترافي لإدارة مشاريع Python مع فريق",
              key_concepts: ["Git Flow","Branching","Pull Request","Code Review","Conventional Commits","Changelog"],
              lessons: [
                { name: "Git Flow: استراتيجية فروع واضحة", primary: "Git Flow branching strategy Python" },
                { name: "Conventional Commits: رسائل منظمة", primary: "conventional commits Python project" },
                { name: "Pull Requests وCode Review", primary: "PR code review GitHub Python" },
                { name: "Rebase مقابل Merge: متى تختار", primary: "git rebase merge Python when" },
                { name: "Tagging والإصدارات الدلالية SemVer", primary: "git tags semantic versioning Python" },
                { name: "توليد CHANGELOG تلقائياً", primary: "changelog generation Python auto" },
                { name: "Git Hooks لأتمتة الجودة", primary: "git hooks pre-commit Python" },
                { name: "إدارة Monorepo لمشاريع متعددة", primary: "monorepo management Python" },
                { name: "GitOps: النشر المدفوع بـ Git", primary: "GitOps deployment Python" },
                { name: "تمارين: workflow فريق احترافي كامل", primary: "team workflow professional Python Git" }
              ]
            },
            {
              unit_index: 10, code: "2.6.10",
              name: "مشروع: نظام شامل من الصفر حتى الإنتاج",
              goal: "بناء ونشر نظام Python كامل بـ CI/CD ومراقبة وأمان في الإنتاج",
              key_concepts: ["Production System","CI/CD","Monitoring","Security","Docker","Complete"],
              lessons: [
                { name: "تصميم النظام: المتطلبات والهندسة", primary: "system design requirements architecture Python" },
                { name: "بناء Backend بـ FastAPI وPostgres", primary: "FastAPI PostgreSQL backend Python" },
                { name: "إعداد CI/CD بـ GitHub Actions", primary: "CI/CD GitHub Actions Python" },
                { name: "تغليف بـ Docker وdocker-compose", primary: "Docker containerize Python complete" },
                { name: "إضافة Sentry وlogging للمراقبة", primary: "Sentry logging monitoring Python" },
                { name: "تطبيق الأمان الكامل", primary: "security complete Python production" },
                { name: "اختبارات شاملة 80% تغطية", primary: "80 percent coverage Python testing" },
                { name: "النشر على السحابة", primary: "cloud deploy Python production" },
                { name: "توثيق النظام وRunbook", primary: "documentation runbook Python" },
                { name: "مراجعة نهائية وتسليم المشروع", primary: "final review delivery Python project" }
              ]
            }
          ]
        },
        {
          stage_index: 7,
          name: "مشاريع حقيقية وأنماط متقدمة",
          goal: "بناء مشاريع Python احترافية حقيقية في مجالات متنوعة وإتقان الأنماط المتقدمة والتقنيات الحديثة التي تميز المطور الخبير",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 70 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.7.1",
              name: "تطوير أدوات CLI احترافية",
              goal: "بناء أدوات سطر أوامر احترافية بـ Click وTyper تُنشر كحزم قابلة للتثبيت",
              key_concepts: ["Click","Typer","Rich","CLI Design","Plugin System","Distribution"],
              lessons: [
                { name: "Click: إطار CLI القوي", primary: "Click CLI framework Python" },
                { name: "Typer: Click المبني على type hints", primary: "Typer CLI type hints Python" },
                { name: "Rich: مخرجات ملونة وجميلة", primary: "Rich terminal pretty print Python" },
                { name: "Progress Bars وSpinners في CLI", primary: "Rich progress bar spinner Python CLI" },
                { name: "التعامل مع الملفات والمجلدات بـ CLI", primary: "CLI file path processing Python" },
                { name: "نظام Plugin للأدوات القابلة للتوسع", primary: "plugin system CLI Python extensible" },
                { name: "Configuration Files لأدوات CLI", primary: "config file CLI Python settings" },
                { name: "Shell Completion: إكمال تلقائي", primary: "shell completion CLI Python" },
                { name: "توزيع الأداة: PyPI وPipx", primary: "distribute CLI PyPI pipx Python" },
                { name: "تمارين: أداة CLI لإدارة المشاريع", primary: "project management CLI Python tool" }
              ]
            },
            {
              unit_index: 2, code: "2.7.2",
              name: "تطوير Plugins والتوسعات",
              goal: "تصميم أنظمة قابلة للتوسع بنظام plugins باستخدام Entry Points وStevedore",
              key_concepts: ["Plugin System","Entry Points","Hooks","importlib","Stevedore","Extension"],
              lessons: [
                { name: "Plugin Architecture: المفهوم والفائدة", primary: "plugin architecture Python extensible" },
                { name: "Entry Points: تسجيل الـ plugins", primary: "entry points setuptools Python plugins" },
                { name: "اكتشاف الـ plugins ديناميكياً", primary: "plugin discovery dynamic importlib Python" },
                { name: "Stevedore: إدارة plugins احترافياً", primary: "stevedore plugins Python management" },
                { name: "Hooks وEvent System للتوسع", primary: "hooks events extension points Python" },
                { name: "إعداد Isolation للـ plugins", primary: "plugin isolation sandboxing Python" },
                { name: "اختبار الـ plugins المعزول", primary: "plugin testing isolated Python" },
                { name: "الأمان في تنفيذ كود الـ plugins", primary: "plugin security sandboxing Python" },
                { name: "نشر ecosystem من plugins", primary: "plugin ecosystem publish Python" },
                { name: "تمارين: محرر نصوص بنظام plugins", primary: "text editor plugin system Python project" }
              ]
            },
            {
              unit_index: 3, code: "2.7.3",
              name: "Python والذكاء الاصطناعي التطبيقي",
              goal: "دمج خدمات الذكاء الاصطناعي في تطبيقات Python باستخدام OpenAI وLangChain وHuggingFace",
              key_concepts: ["OpenAI API","LangChain","HuggingFace","Embeddings","RAG","LLM Applications"],
              lessons: [
                { name: "OpenAI API بـ Python: البداية الصحيحة", primary: "OpenAI API Python chat completions" },
                { name: "Streaming الاستجابات من LLMs", primary: "OpenAI streaming Python real-time" },
                { name: "Function Calling وTool Use", primary: "OpenAI function calling tools Python" },
                { name: "Embeddings والبحث الدلالي", primary: "embeddings semantic search Python OpenAI" },
                { name: "LangChain: بناء تطبيقات LLM", primary: "LangChain LLM chain Python" },
                { name: "RAG: الإجابة من وثائق خاصة", primary: "RAG retrieval augmented generation Python" },
                { name: "HuggingFace Transformers محلياً", primary: "HuggingFace transformers Python local" },
                { name: "Prompt Engineering في Python", primary: "prompt engineering Python LLM" },
                { name: "نشر نموذج LLM بـ FastAPI", primary: "LLM API FastAPI Python deploy" },
                { name: "تمارين: chatbot وثائق احترافي", primary: "document chatbot RAG Python project" }
              ]
            },
            {
              unit_index: 4, code: "2.7.4",
              name: "Python للأتمتة والـ DevOps",
              goal: "استخدام Python في مهام DevOps والأتمتة والبنية التحتية والإدارة",
              key_concepts: ["Ansible","Fabric","Paramiko","AWS SDK","Infrastructure as Code","SRE"],
              lessons: [
                { name: "Python في دور DevOps والـ SRE", primary: "Python DevOps SRE automation role" },
                { name: "Paramiko: SSH بـ Python", primary: "Paramiko SSH Python remote execution" },
                { name: "Fabric: أتمتة نشر عبر SSH", primary: "Fabric deployment automation Python SSH" },
                { name: "Ansible مع Python: البنية التحتية", primary: "Ansible Python infrastructure automation" },
                { name: "AWS SDK (boto3) في Python", primary: "boto3 AWS SDK Python" },
                { name: "إدارة موارد السحابة برمجياً", primary: "cloud resources management Python boto3" },
                { name: "Terraform + Python للبنية التحتية", primary: "Terraform Python infrastructure code" },
                { name: "مراقبة البنية التحتية بـ Python", primary: "infrastructure monitoring Python scripts" },
                { name: "حوادث الإنتاج وأتمتة الاستجابة", primary: "incident response automation Python" },
                { name: "تمارين: نظام نشر تلقائي كامل", primary: "automated deployment system Python DevOps" }
              ]
            },
            {
              unit_index: 5, code: "2.7.5",
              name: "Python لمعالجة الصور والوسائط",
              goal: "معالجة الصور والفيديو بـ Python باستخدام Pillow وOpenCV",
              key_concepts: ["Pillow","OpenCV","Image Processing","Color","Filters","Video"],
              lessons: [
                { name: "Pillow: معالجة الصور الأساسية", primary: "Pillow image processing Python" },
                { name: "قراءة وتغيير حجم وحفظ الصور", primary: "Pillow resize save open Python" },
                { name: "الفلاتر والتأثيرات على الصور", primary: "Pillow filters effects ImageFilter Python" },
                { name: "إضافة نصوص ورسومات على الصور", primary: "Pillow text draw ImageDraw Python" },
                { name: "OpenCV: رؤية الحاسوب بـ Python", primary: "OpenCV computer vision Python" },
                { name: "كشف الوجوه والأشكال", primary: "OpenCV face detection Haar cascade Python" },
                { name: "معالجة الفيديو: قراءة وحفظ", primary: "OpenCV video capture Python" },
                { name: "Optical Character Recognition بـ Tesseract", primary: "Tesseract OCR Python text extraction" },
                { name: "توليد صور بـ Pillow برمجياً", primary: "image generation Pillow Python" },
                { name: "تمارين: مُعالج صور دُفعي", primary: "batch image processor Python Pillow project" }
              ]
            },
            {
              unit_index: 6, code: "2.7.6",
              name: "Python والتشغيل الآني Real-time",
              goal: "بناء تطبيقات تعمل في الوقت الحقيقي باستخدام WebSocket وServer-Sent Events",
              key_concepts: ["WebSocket","SSE","Real-time Updates","Pub/Sub","Live Data","Streaming"],
              lessons: [
                { name: "Real-time vs Polling: لماذا الفرق جوهري", primary: "real-time polling difference Python" },
                { name: "Server-Sent Events في FastAPI", primary: "SSE server sent events FastAPI Python" },
                { name: "WebSocket في FastAPI", primary: "WebSocket FastAPI Python real-time" },
                { name: "Broadcasting بـ ConnectionManager", primary: "WebSocket broadcast connection manager Python" },
                { name: "Real-time بـ Redis Pub/Sub", primary: "Redis pub sub real-time Python" },
                { name: "لوحات مراقبة حية Live Dashboards", primary: "live dashboard WebSocket Python" },
                { name: "محاكاة بيانات لوحة تحكم حية", primary: "dashboard simulation live data Python" },
                { name: "Scaling Real-time مع عدة Workers", primary: "scaling real-time workers Python" },
                { name: "اختبار Real-time Systems", primary: "testing real-time WebSocket Python" },
                { name: "تمارين: لوحة مراقبة مباشرة", primary: "live monitoring dashboard Python project" }
              ]
            },
            {
              unit_index: 7, code: "2.7.7",
              name: "هندسة الكود المتقدمة وأنماط المستقبل",
              goal: "تطبيق أحدث أنماط وأدوات Python للاستعداد لسوق العمل المتطور",
              key_concepts: ["Type Guards","Protocols","TypedDict","ParamSpec","Modern Python","PEP 695"],
              lessons: [
                { name: "Python 3.12+ الجديد: ما يجب معرفته", primary: "Python 3.12 new features Python" },
                { name: "PEP 695: Type Parameter Syntax الجديدة", primary: "PEP 695 type syntax Python 3.12" },
                { name: "TypedDict للقواميس ذات البنية", primary: "TypedDict structured dict Python" },
                { name: "ParamSpec وConcatenate: توقيع دقيق", primary: "ParamSpec Concatenate typing Python" },
                { name: "Type Guard وNarrow Typing", primary: "TypeGuard narrowing isinstance Python" },
                { name: "overload: توقيعات متعددة للدالة", primary: "overload multiple signatures Python typing" },
                { name: "Abstract Interpretation وtypeshed", primary: "typeshed type stubs Python" },
                { name: "Mojo: مستقبل Python في الأداء", primary: "Mojo Python compatible fast language" },
                { name: "Python في WebAssembly وPyodide", primary: "Python WebAssembly Pyodide browser" },
                { name: "تمارين: كود Python مستقبلي نظيف", primary: "future Python modern typing code" }
              ]
            },
            {
              unit_index: 8, code: "2.7.8",
              name: "الأداء المتقدم وتحسين Python",
              goal: "الوصول لأقصى أداء في Python باستخدام Cython وnumba وC Extensions",
              key_concepts: ["Cython","Numba","ctypes","cffi","Performance Profiling","JIT"],
              lessons: [
                { name: "حدود الأداء في Python وكيف نتجاوزها", primary: "Python performance limits overcome" },
                { name: "Numba: JIT للحسابات العلمية", primary: "Numba JIT compiler Python NumPy" },
                { name: "Cython: تحويل Python لـ C", primary: "Cython Python to C extension" },
                { name: "ctypes: استدعاء مكتبات C", primary: "ctypes C library Python call" },
                { name: "cffi: واجهة C أحدث وأوضح", primary: "cffi C foreign function Python" },
                { name: "تطوير C Extension لـ Python", primary: "C extension Python.h write" },
                { name: "PyPy: متى يكون الاختيار الأفضل", primary: "PyPy when best choice Python" },
                { name: "Profiling متقدم والـ Flame Graphs", primary: "flamegraph profiling Python performance" },
                { name: "تحسين استهلاك الذاكرة المتقدم", primary: "memory optimization advanced Python" },
                { name: "تمارين: تسريع خوارزمية 100x", primary: "100x algorithm speedup Python Cython" }
              ]
            },
            {
              unit_index: 9, code: "2.7.9",
              name: "Python في سوق العمل والمسار المهني",
              goal: "بناء حضور مهني قوي كمطور Python وإتقان المقابلات والمشاريع مفتوحة المصدر",
              key_concepts: ["Portfolio","Open Source","Job Interview","Resume","Career Path","Freelance"],
              lessons: [
                { name: "مسارات مطور Python في سوق العمل", primary: "Python developer career paths market" },
                { name: "بناء portfolio Python احترافي قوي", primary: "Python portfolio projects GitHub" },
                { name: "الإسهام في مشاريع مفتوحة المصدر", primary: "open source contribution Python GitHub" },
                { name: "مقابلات Python: ما يُسأل فعلاً", primary: "Python interviews questions real" },
                { name: "Coding Challenges: LeetCode وHackerRank", primary: "LeetCode HackerRank Python practice" },
                { name: "System Design بـ Python للمقابلات", primary: "system design Python interviews" },
                { name: "الحرية المهنية Freelance بـ Python", primary: "freelance Python developer career" },
                { name: "منصات العمل الحر للمطورين", primary: "freelance platforms Python developer Upwork" },
                { name: "بناء سمعة تقنية: مدونة وYouTube", primary: "technical reputation blog YouTube Python" },
                { name: "خطة التعلم المستمر لمطور Python", primary: "continuous learning plan Python developer" }
              ]
            },
            {
              unit_index: 10, code: "2.7.10",
              name: "المشروع الختامي: تطبيق Python كامل بالمعايير الاحترافية",
              goal: "بناء مشروع Python احترافي كامل يجسّد كل ما تعلمته في المستويين بجودة إنتاجية حقيقية",
              key_concepts: ["Capstone Project","Production Quality","Full Stack","Open Source","Portfolio"],
              lessons: [
                { name: "اختيار فكرة مشروع حقيقي وقيّم", primary: "project idea selection real value Python" },
                { name: "تصميم الهندسة: القرارات الكبرى", primary: "architecture design decisions Python" },
                { name: "بناء Backend API احترافي", primary: "professional API backend Python" },
                { name: "قاعدة بيانات وتخزين مؤقت", primary: "database Redis caching Python project" },
                { name: "المصادقة والأمان الكاملان", primary: "security authentication complete Python" },
                { name: "اختبارات شاملة 85%+ تغطية", primary: "85 percent coverage testing Python" },
                { name: "CI/CD والنشر التلقائي", primary: "CI/CD automated deploy Python" },
                { name: "المراقبة واللوحة الإدارية", primary: "monitoring admin dashboard Python" },
                { name: "التوثيق الشامل والـ README الاحترافي", primary: "comprehensive documentation README Python" },
                { name: "الإطلاق والمشاركة مع المجتمع", primary: "launch share community Python project" }
              ]
            }
          ]
        }
      ]
    }
  ]
};

function makeGoal(lessonName, unitName) {
  return `يتمكن المتعلم من فهم "${lessonName}" وتطبيقه عملياً ضمن سياق "${unitName}" بكتابة كود Python صحيح وقابل للصيانة`;
}

function makeBridge(lessonName, lessonIndex, unitName) {
  if (lessonIndex === 0) return `نبدأ رحلتنا في "${unitName}" بالمفهوم الجوهري "${lessonName}" الذي يُشكّل الأساس لكل ما يليه`;
  if (lessonIndex === 9) return `نختتم وحدة "${unitName}" بـ"${lessonName}" الذي يجمع ما تعلمناه في تطبيق حقيقي متكامل`;
  return `بعد فهم ما سبق، ننتقل لـ"${lessonName}" الذي يُعمّق كفاءتنا في "${unitName}" ويُقرّبنا من الاستخدام الاحترافي`;
}

function makeConcepts(primary, lessonName) {
  const terms = primary.split(" ").filter(t => t.length > 2).slice(0, 5);
  return terms.map((term, i) => ({
    name_ar: `${term} في Python`,
    explanation_ar: `${term} هو مفهوم جوهري في "${lessonName}" يُستخدم يومياً في مشاريع Python الحقيقية لكتابة كود صحيح وفعّال`,
    mastery_criterion: `يستطيع المتعلم شرح ${term} بكلماته وكتابة مثال كودي يعمل فعلاً دون مساعدة خارجية`,
    weight: Math.max(1, 3 - Math.floor(i / 2))
  }));
}

function makeMistakes(primary, unitName) {
  const terms = primary.split(" ").filter(t => t.length > 2).slice(0, 3);
  return [
    {
      mistake: `الخلط بين ${terms[0] || "المفهوم"} واستخدامه في سياق خاطئ`,
      correction: `يجب فهم السياق الصحيح لاستخدام ${terms[0] || "المفهوم"} في Python`,
      treatment: `تدرّب على أمثلة متنوعة وتحقق من التوثيق الرسمي docs.python.org`,
      severity: "major"
    },
    {
      mistake: `تجاهل التحقق من صحة المدخلات قبل استخدام ${terms[1] || "الدالة"}`,
      correction: `دائماً تحقق من نوع وصحة البيانات قبل معالجتها`,
      treatment: `أضف assertions أو type hints وتعامل مع الحالات الحدية`,
      severity: "major"
    },
    {
      mistake: `نسيان أثر ${terms[2] || "العملية"} على الكائنات القابلة للتغيير`,
      correction: `استيعاب مفهوم المرجع مقابل القيمة في Python`,
      treatment: `استخدم copy() أو deepcopy() عند الحاجة لنسخة مستقلة`,
      severity: "minor"
    }
  ];
}

function makeExamples(primary, unitName) {
  return [
    `في مشروع Python حقيقي لأتمتة المهام اليمنية، يُستخدم "${primary.split(" ")[0]}" لحل مشكلة حقيقية بكفاءة`,
    `مطور Python في شركة تقنية يستخدم "${primary.split(" ").slice(0, 2).join(" ")}" يومياً في عمله`
  ];
}

function makeExamQuestion(lessonName, primary) {
  const key = primary.split(" ")[0];
  return `كيف تطبق "${key}" في سياق "${lessonName}"؟ اكتب مثالاً كودياً بسيطاً يُوضّح الفكرة`;
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
        ? `متى تختار استخدام ${concept} بدلاً من البديل المشابه في مشاريع Python؟ اشرح بمثال كودي`
        : kind === "application"
        ? `اكتب كود Python يستخدم ${concept} لحل مهمة حقيقية في مجال "${unitDef.name}". يجب أن يعمل الكود ويكون مقروءاً`
        : kind === "analysis"
        ? `قيّم الكود التالي الذي يستخدم ${concept}: ما مشاكله؟ وكيف تُحسّنه ليكون Pythonic؟`
        : `كيف يرتبط ${concept} بباقي مفاهيم "${unitDef.name}"؟ ابنِ مثالاً يجمع ثلاثة مفاهيم معاً`,
      rubric: `يُقيَّم على: صحة الكود (40%)، وضوح التفكير (30%)، ومراعاة أفضل ممارسات Python (30%)`,
      solution_outline: `الإجابة تشمل: ${concept} بالطريقة الصحيحة، مع تعليق يشرح لماذا، وحالة حدية واحدة معالجة`,
      points: Math.min(10, 6 + i)
    };
  });

  return {
    title: `مختبر ${unitDef.name}: التطبيق العملي`,
    scenario: `أنت مطور Python تعمل على مشروع حقيقي يتطلب تطبيق مفاهيم "${unitDef.name}" بشكل احترافي`,
    completion_criterion: `يتمكن الطالب من كتابة كود Python صحيح وقابل للقراءة يُوظّف مفاهيم "${unitDef.name}" في سياق تطبيقي حقيقي`,
    pedagogical_sequence: "diagnostic → decision → application → analysis → connection",
    questions
  };
}

function makeUnitExamQuestions(unitCode, unitDef, passThreshold, timeLimit) {
  const c = unitDef.key_concepts;
  const questions = [
    {
      question: `ما الاستخدام الصحيح لـ "${c[0]}" في Python؟`,
      options: [
        `استخدامه في كل حالة بغض النظر عن السياق`,
        `استخدامه عندما يكون السياق مناسباً وفق أفضل ممارسات Python`,
        `تجنبه دائماً لصالح البدائل الأحدث`,
        `استخدامه فقط في المشاريع الكبيرة`
      ],
      correctIndex: 1,
      explanation: `"${c[0]}" يُستخدم في Python عندما يكون السياق مناسباً وفق أفضل الممارسات والـ Pythonic style`
    },
    {
      question: `ما الفرق الجوهري بين "${c[0]}" و "${c[1] || c[0]}" في Python؟`,
      options: [
        `لا فرق بينهما عملياً`,
        `"${c[0]}" و"${c[1] || c[0]}" يخدمان أغراضاً مختلفة والاختيار يعتمد على السياق والمتطلبات`,
        `"${c[1] || c[0]}" دائماً أفضل وأحدث`,
        `كلاهما مهمل في Python الحديث`
      ],
      correctIndex: 1,
      explanation: `الاختيار الصحيح بين "${c[0]}" و"${c[1] || c[0]}" يعتمد على السياق والمتطلبات المحددة`
    },
    {
      question: `ما الخطأ الأكثر شيوعاً عند استخدام "${c[0]}" في مشاريع Python؟`,
      options: [
        `استخدامه في المشاريع الكبيرة`,
        `تجاهل التوثيق الرسمي`,
        `تطبيقه دون فهم السياق وحالات الحافة`,
        `استخدامه مع Python 3 فقط`
      ],
      correctIndex: 2,
      explanation: `الخطأ الأكثر شيوعاً هو تطبيق "${c[0]}" دون فهم السياق وحالات الحافة مما يؤدي لأخطاء خفية`
    },
    {
      question: `في أي حالة يكون "${c[c.length > 2 ? 2 : 0]}" الخيار الأمثل؟`,
      options: [
        `في كل الحالات دون استثناء`,
        `عندما نحتاج سرعة تطوير فقط`,
        `عندما يكون الأداء هو الأولوية الوحيدة`,
        `عندما يتوافق مع متطلبات المشروع وأنماط Python الصحيحة`
      ],
      correctIndex: 3,
      explanation: `"${c[c.length > 2 ? 2 : 0]}" هو الخيار الأمثل عندما يتوافق مع متطلبات المشروع وأنماط Python`
    },
    {
      question: `كيف تتحقق من صحة تطبيقك لـ "${c[0]}" في كود Python؟`,
      options: [
        `تشغيل الكود مرة واحدة والافتراض بأنه يعمل`,
        `كتابة اختبار وحدة يغطي الحالات الطبيعية والحدية`,
        `مراجعة الكود بصرياً فقط دون اختبار`,
        `الاعتماد على لغة Python في اكتشاف الأخطاء تلقائياً`
      ],
      correctIndex: 1,
      explanation: `كتابة اختبار وحدة يغطي الحالات الطبيعية والحدية هي الطريقة الأمثل للتحقق من صحة تطبيق "${c[0]}"`
    },
    {
      question: `ما أفضل طريقة لتنظيم كود "${unitDef.name}" في مشروع Python كبير؟`,
      options: [
        `وضع كل الكود في ملف واحد لسهولة الإدارة`,
        `فصل الكود إلى وحدات منطقية مع واجهات واضحة ومفصولة`,
        `تجنب التنظيم وتركيز الجهد على الأداء`,
        `استخدام مجلد واحد لكل ملف`
      ],
      correctIndex: 1,
      explanation: `في مشروع Python كبير، فصل "${unitDef.name}" إلى وحدات منطقية مع واجهات واضحة يُحسّن القابلية للصيانة`
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
      question: `كيف تجمع بين "${uName}" و"${uName2}" لبناء كود Python احترافي في ${stageDef.name}؟`,
      options: [
        `يُعالَجان بشكل منفصل دائماً`,
        `"${uName}" يُوفّر الأساس بينما "${uName2}" يُكمله بعمق تطبيقي في سياق "${stageDef.name}"`,
        `كلاهما يؤديان نفس الوظيفة تماماً`,
        `يُستخدم أحدهما فقط في كل مشروع`
      ],
      correctIndex: 1,
      explanation: `في "${stageDef.name}"، الجمع بين "${uName}" و"${uName2}" يبني كفاءة Python متكاملة`
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
    `ما المبدأ الأساسي الذي يميز مطور Python المحترف في "${lName}"؟`,
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
    `كيف تُساهم في مجتمع Python بعد إتقان "${lName}"؟`
  ];

  const questions = stems.map(stem => ({
    question: stem,
    options: [
      `التركيز على حفظ الأوامر والدوال دون فهم الأسس`,
      `بناء فهم متين للأسس مع تطبيق عملي مستمر وكتابة كود حقيقي قابل للصيانة`,
      `التخصص الضيق جداً في مجال واحد فقط من Python`,
      `الاعتماد على الأدوات والـ AI دون فهم عميق`
    ],
    correctIndex: 1,
    explanation: `التميز في "${lName}" يأتي من الفهم العميق والتطبيق المستمر وكتابة كود Python نظيف وقابل للصيانة`
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
    { q: "ما الفرق بين list وtuple في Python؟", a: 2, opts: ["لا فرق بينهما", "list أسرع وtuple أبطأ دائماً", "list قابل للتغيير وtuple غير قابل للتغيير وأكثر كفاءة في الذاكرة", "tuple يدعم عناصر أكثر من list"] },
    { q: "ماذا يُعيد len([1, 2, 3]) في Python؟", a: 1, opts: ["0", "3", "1", "خطأ"] },
    { q: "ما ناتج 5 // 2 في Python؟", a: 0, opts: ["2", "2.5", "3", "خطأ"] },
    { q: "كيف تُعرّف دالة في Python؟", a: 2, opts: ["function my_func():", "func my_func():", "def my_func():", "define my_func():"] },
    { q: "ما معنى *args في تعريف دالة Python؟", a: 1, opts: ["وسيط واحد إجباري", "عدد غير محدد من الوسيطات الموضعية", "وسيطات مفتاحية", "لا يوجد مثل هذا"] },
    { q: "ما ناتج type(3.14) في Python؟", a: 0, opts: ["<class 'float'>", "<class 'int'>", "<class 'decimal'>", "<class 'number'>"] },
    { q: "كيف تفتح ملفاً للقراءة بأمان في Python؟", a: 2, opts: ["file = open('f.txt')", "f = read_file('f.txt')", "with open('f.txt', 'r') as f:", "open(file='f.txt') as f:"] },
    { q: "ما الفرق بين is و == في Python؟", a: 1, opts: ["لا فرق بينهما", "is يقارن هوية الكائن (الموقع) بينما == يقارن القيمة", "== أسرع من is دائماً", "is يعمل فقط مع الأرقام"] },
    { q: "ما ناتج [x**2 for x in range(3)] في Python؟", a: 0, opts: ["[0, 1, 4]", "[1, 4, 9]", "[0, 2, 4]", "خطأ في بناء الجملة"] },
    { q: "ما الذي يُميّز dict عن list في Python من حيث البحث؟", a: 2, opts: ["لا فرق في الأداء", "list أسرع في البحث دائماً", "dict يوفر بحثاً بـ O(1) عبر المفاتيح بينما list بحثها O(n)", "dict لا يدعم البحث"] },
    { q: "كيف تُنشئ قاموساً في Python؟", a: 1, opts: ["d = [key: value]", "d = {'key': 'value'}", "d = (key, value)", "d = new Dict(key, value)"] },
    { q: "ما معنى self في تعريف طريقة الفئة class في Python؟", a: 0, opts: ["مرجع للمثيل الحالي من الكائن", "اسم الفئة نفسها", "قيمة عودية للطريقة", "متغير عشوائي"] },
    { q: "ما الفائدة الرئيسية من استخدام with statement مع الملفات؟", a: 2, opts: ["قراءة الملف أسرع", "دعم الملفات الكبيرة", "ضمان إغلاق الملف تلقائياً حتى عند حدوث خطأ", "تشفير الملف تلقائياً"] },
    { q: "ما ناتج 'hello'.upper() في Python؟", a: 0, opts: ["'HELLO'", "'Hello'", "خطأ", "None"] },
    { q: "ما الفرق بين append() وextend() في list؟", a: 1, opts: ["لا فرق بينهما", "append يضيف عنصراً واحداً وextend يضيف عناصر iterable", "extend أبطأ دائماً", "append يضيف في البداية وextend في النهاية"] },
    { q: "كيف تُنشئ decorator في Python؟", a: 2, opts: ["باستخدام class Decorator", "باستخدام @class", "بتعريف دالة تُرجع دالة مُعدّلة وتستخدمها بـ @", "باستخدام functools.decorator()"] },
    { q: "ما مبدأ LEGB في Python؟", a: 0, opts: ["ترتيب البحث عن الأسماء: Local ثم Enclosing ثم Global ثم Built-in", "أنواع الحلقات: للأمام وللخلف", "قواعد ترميز المتغيرات", "مستويات التسجيل في logging"] },
    { q: "ما الفرق بين asyncio.gather() وasyncio.create_task()؟", a: 1, opts: ["لا فرق بينهما", "gather ينتظر مجموعة coroutines بينما create_task يُنشئ مهمة منفصلة", "create_task أسرع دائماً", "gather تعمل فقط مع IO"] }
  ];

  return topics.map((item, i) => ({
    target_level_index: i < 9 ? 1 : 2,
    kind: "mcq",
    prompt: item.q,
    choices: item.opts,
    correct_index: item.a,
    difficulty: i < 6 ? 1 : 2,
    explanation: `هذا السؤال يقيس الكفاءة في Python للمستوى ${i < 9 ? 1 : 2}`
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
          session_complete_criterion: `يستطيع المتعلم كتابة كود Python صحيح يُوظّف "${lesson.name}" في مهمة حقيقية بدون مساعدة وبجودة احترافية`,
          expected_duration_minutes: 45,
          motivation_hook: `إتقان "${lesson.name}" يجعلك تكتب Python بثقة المحترف وسيُفرّق بين كودك وكود المبتدئين في كل مشروع`,
          learning_objectives: [
            { statement: `فهم ${lesson.primary.split(" ").slice(0, 3).join(" ")} نظرياً وتطبيقياً في Python`, bloom_level: "understand" },
            { statement: `تطبيق ${lesson.primary.split(" ")[0]} في كود Python حقيقي يعمل ويُقرأ`, bloom_level: "apply" }
          ],
          solution_outline: `فهم ${lesson.primary}، كتابة مثال بسيط يعمل، تطبيقه على مشكلة حقيقية، التحقق بالاختبار`
        }));

        const lab = makeLabForUnit(unitDef);
        const exam = makeUnitExamQuestions(
          unitDef.code, unitDef,
          stageDef.unit_exam_defaults.pass_threshold_percent,
          stageDef.unit_exam_defaults.time_limit_minutes
        );

        unitExamBanks[unitDef.code] = exam;

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
      stageExamBanks[stageCode] = makeStageExamQuestions(stageDef);

      stages.push({
        stage_index: stageDef.stage_index,
        name: stageDef.name,
        goal: stageDef.goal,
        bloom_focus: stageDef.bloom_focus,
        exam: stageDef.exam,
        units
      });
    }

    levelExamBanks[`${levelDef.level_index}`] = makeLevelExamQuestions(levelDef);

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

console.log("توليد ملف python-instruction.json...");
const result = buildFullFile();
const json = JSON.stringify(result, null, 2);
writeFileSync("python-instruction.json", json, "utf8");
const sizeKB = Math.round(json.length / 1024);

const totalLessons = result.levels.reduce((acc, l) =>
  acc + l.stages.reduce((a2, s) =>
    a2 + s.units.reduce((a3, u) => a3 + u.lessons.length, 0), 0), 0);
const totalUnits = result.levels.reduce((acc, l) =>
  acc + l.stages.reduce((a2, s) => a2 + s.units.length, 0), 0);
const totalStages = result.levels.reduce((acc, l) => acc + l.stages.length, 0);

console.log(`\n✅ تم التوليد بنجاح!`);
console.log(`📦 الحجم: ${sizeKB} KB`);
console.log(`📚 المستويات: ${result.levels.length}`);
console.log(`🗂️ المراحل: ${totalStages}`);
console.log(`📁 الوحدات: ${totalUnits}`);
console.log(`📖 الدروس: ${totalLessons}`);
