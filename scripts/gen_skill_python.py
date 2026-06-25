#!/usr/bin/env python3
"""skill-python — 3 مستويات — تسلسل منطقي"""
import json; from pathlib import Path; import random
random.seed(42)
def h(s): return sum(ord(c)*(i+1) for i,c in enumerate(str(s)))
OUT = Path("out/skill-python"); OUT.mkdir(parents=True, exist_ok=True)
def U(n,*l): return (n,list(l))
def S(n,g,*u): return (n,g,list(u))
def L(n,g,b,*s): return (n,g,b,list(s))

CURRICULUM = [
L("المستوى الأول: أساسيات Python","إتقان المتغيرات، الشروط، الحلقات، الدوال، هياكل البيانات","apply",
S("أساسيات Python","كتابة أول برنامج وفهم المنطق البرمجي",
U("تشغيل Python","تثبيت Python","أول برنامج: print","التعليقات","المتغيرات","أنواع البيانات","العمليات الحسابية","F-strings","input()","مشروع: حاسبة"),
U("المتغيرات والأنواع","int و float","str و bool","التحويل بين الأنواع","type()","العمليات على النصوص","تنسيق النصوص","أخطاء الأنواع","مشروع: مدقق"),
U("الجمل الشرطية","if, else","elif","تداخل الشروط","if مع in","match/case","التعبير الشرطي","أخطاء الشروط","مشروع: لعبة تخمين"),
U("الحلقات for","for مع range","for مع قوائم","enumerate()","List Comprehension","zip()","حلقات متداخلة","أداء الحلقات","مشروع: جدول ضرب"),
U("الحلقات while","while: الأساسيات","break","continue","while True","حلقة لا نهائية","while مع شرط","متى for ومتى while","مشروع: قارئ مدخلات"),
U("القوائم List","إنشاء","فهرسة","تقطيع Slicing","append, insert","remove, pop","sort, reverse","نسخ القوائم","مشروع: قائمة مهام"),
U("القواميس Dict","إنشاء","الوصول","get() الآمن","إضافة وتعديل","حذف","keys, values, items","Dict Comprehension","مشروع: دفتر هاتف"),
U("Tuple و Set","Tuple: ثابت","Set: فريد","عمليات Set","متى تستخدم؟","تحويلات","Frozenset","مشروع: إزالة تكرار"),
U("مشروع: نظام إدارة","تخطيط","قوائم وقواميس","إدخال بيانات","بحث","حفظ لملف","تحميل","عرض"),
),
S("الدوال والبرمجة المنظمة","كتابة دوال قابلة لإعادة الاستخدام",
U("تعريف الدوال","def","المعاملات","return","الوسائط الافتراضية","استدعاء الدوال","Docstrings","مشروع: مكتبة دوال"),
U("وسائط متقدمة","*args","**kwargs","keyword-only","positional-only","ترتيب المعاملات","unpacking","مشروع: دالة مرنة"),
U("lambda والدوال العليا","lambda","map()","filter()","sorted(key=)","reduce()","دوال كمعاملات","مشروع: معالجة بيانات"),
U("نطاق المتغيرات","local","enclosing","global","built-in","nonlocal","LEGB rule","مشروع: استكشاف Scope"),
U("Decorators","ما هو decorator؟","@syntax","decorator بمعاملات","functools.wraps","تطبيقات","مشروع: logging decorator"),
U("Generators و Iterators","yield","generator expression","iter()","next()","itertools","فوائد generators","مشروع: معالج ملفات"),
U("معالجة الأخطاء","try/except","except أنواع متعددة","else","finally","raise","assert","مشروع: تطبيق آمن"),
U("تنظيم الكود","modules","packages","__init__.py","import","__name__","venv","مشروع: هيكل مشروع"),
U("مشروع: مكتبة Python","تخطيط","تنفيذ","توثيق","اختبار","نشر","عرض"),
),
S("هياكل البيانات والخوارزميات","List, Dict, Set بعمق",
U("List Comprehensions","بناء","شرط","Nested","Dict Comp","Set Comp","Generator Expression","مشروع: تحويل"),
U("التقطيع بعمق","[start:stop:step]","تقطيع القوائم","تقطيع النصوص","نسخ","تعديل","slice objects","مشروع: تقطيع"),
U("فرز وتصفية","sorted()","key= lambda","reverse","itemgetter","filter()","itertools","مشروع: ترتيب"),
U("البحث","in","index()","find()","Linear Search","Binary Search","bisect","مشروع: بحث"),
U("خوارزميات الترتيب","Bubble Sort","Selection Sort","Insertion Sort","Merge Sort","Quick Sort","مقارنة","مشروع: ترتيب"),
U("التكرار الذاتي Recursion","Base Case","Recursive Case","factorial","fibonacci","tree traversal","مخاطر","مشروع: شجرة"),
U("المكدس والطابور","Stack: LIFO","Queue: FIFO","deque","list as stack","queue.Queue","تطبيقات","مشروع: متصفح"),
U("Hash Tables","dict داخلياً","hash()","collisions","set","defaultdict","Counter","مشروع: ترددات"),
U("مشروع: محلل نصوص","تخطيط","تنفيذ","تحسين","توثيق","عرض"),
),
S("العمل مع الملفات","قراءة وكتابة البيانات",
U("فتح وإغلاق الملفات","open()","modes","with statement","encoding","errors","مشروع: قارئ ملفات"),
U("قراءة الملفات","read()","readline()","readlines()","التكرار على الملف","مشروع: معالج نصوص"),
U("كتابة الملفات","write()","writelines()","append","طباعة لملف","مشروع: مولد تقارير"),
U("CSV","csv.reader()","csv.writer()","DictReader","DictWriter","dialects","مشروع: CSV"),
U("JSON","json.load()","json.dump()","json.loads()","json.dumps()","indent","مشروع: JSON"),
U("مسارات الملفات","os.path","pathlib","Path","mkdir","exists","glob","مشروع: مسارات"),
U("ملفات مضغوطة","zipfile","tarfile","gzip","shutil","مشروع: أرشيف"),
U("Pickle","dump","load","أمان","protocols","بدائل","مشروع: حفظ حالة"),
U("مشروع: نظام ملفات","تخطيط","تنفيذ","اختبار","توثيق","عرض"),
),
S("البرمجة كائنية التوجه OOP","Classes, Inheritance, Polymorphism",
U("Classes و Objects","class","__init__","self","attributes","methods","__str__","مشروع: أول كلاس"),
U("التغليف Encapsulation","public","_protected","__private","@property","setter","deleter","مشروع: تغليف"),
U("الوراثة Inheritance","extends","super()","method override","isinstance","issubclass","MRO","مشروع: وراثة"),
U("تعدد الأشكال","method overriding","duck typing","operator overloading","__add__","__eq__","مشروع: Polymorphism"),
U("الكلاسات المجردة","ABC","abstractmethod","interface","contract","مشروع: ABC"),
U("Composition","has-a","مقارنة مع Inheritance","delegation","مشروع: Composition"),
U("Magic Methods","__str__, __repr__","__eq__, __lt__","__len__, __getitem__","__enter__, __exit__","مشروع: Magic"),
U("Design Patterns","Singleton","Factory","Observer","Decorator","مشروع: Patterns"),
U("مشروع: نظام بنكي","تخطيط","كلاسات","علاقات","اختبار","عرض"),
),
S("مكتبات Python الأساسية","math, random, datetime, os, sys",
U("math","الدوال الرياضية","ثوابت","ceil, floor","log, exp","trigonometry","مشروع: حاسبة علمية"),
U("random","seed","randint","choice","shuffle","sample","random","مشروع: محاكاة"),
U("datetime","date","time","datetime","timedelta","strftime/strptime","مشروع: تقويم"),
U("os و sys","os.getcwd()","os.listdir()","sys.argv","sys.path","os.system","مشروع: أدوات نظام"),
U("collections","Counter","defaultdict","OrderedDict","deque","namedtuple","ChainMap","مشروع: Collections"),
U("itertools","count, cycle, repeat","chain","combinations","permutations","product","مشروع: Itertools"),
U("functools","lru_cache","partial","reduce","wraps","مشروع: Functools"),
U("re (Regex)","search, match","findall","groups","sub","compile","مشروع: Regex"),
U("مشروع: أداة مساعدة","تخطيط","تنفيذ","توثيق","عرض"),
),
S("مشروع المستوى: تطبيق متكامل","تطبيق كل مهارات المستوى",
U("تخطيط","فكرة","متطلبات","تصميم","خطة"),
U("هيكل البيانات","كلاسات","قواميس","قوائم","علاقات"),
U("واجهة المستخدم","قوائم","مدخلات","عرض","تفاعل"),
U("منطق التطبيق","دوال","معالجة","تحقق","حسابات"),
U("تخزين البيانات","ملفات","JSON","حفظ","تحميل"),
U("اختبار","حالات","أخطاء","تحسين","توثيق"),
U("توثيق","Docstrings","README","تعليقات","تنظيم"),
U("عرض","تحضير","Demo","شرح","تقييم"),
),
),
L("المستوى الثاني: برمجة Python المتقدمة","مكتبات متقدمة، تطبيقات، أداء","apply",
S("NumPy","الحوسبة العددية",
U("مقدمة NumPy","لماذا NumPy؟","array()","zeros, ones","arange, linspace","shape, dtype","مشروع: أول مصفوفة"),
U("عمليات المصفوفات","الفهرسة","التقطيع","Boolean Masking","Fancy Indexing","Broadcasting","مشروع: عمليات"),
U("الدوال الإحصائية","mean, median, std","sum, min, max","axis","percentile","corrcoef","مشروع: إحصاء"),
U("إعادة التشكيل","reshape","flatten, ravel","transpose","concatenate","split","مشروع: تشكيل"),
U("الجبر الخطي","dot, @","linalg.inv","linalg.det","linalg.eig","linalg.solve","مشروع: جبر"),
U("توليد أرقام","seed","rand, randn","randint","choice","shuffle","مشروع: محاكاة"),
U("توفير الذاكرة","views vs copies","memory layout","dtype optimization","مشروع: تحسين"),
U("NumPy في الممارسة","معالجة الصور","معالجة الإشارات","محاكاة","مشروع: تطبيق"),
U("مشروع: تحليل بـ NumPy","تخطيط","تنفيذ","تصور","توثيق","عرض"),
),
S("Pandas","تحليل البيانات",
U("مقدمة Pandas","Series","DataFrame","read_csv","head, info, describe","مشروع: أول DataFrame"),
U("الفهرسة والتصفية","loc, iloc","Boolean filtering","query()","isin()","مشروع: تصفية"),
U("تنظيف البيانات","isna, fillna, dropna","duplicated","astype","replace","مشروع: تنظيف"),
U("تعديل البيانات","إضافة أعمدة","rename","drop","apply","map","مشروع: تعديل"),
U("GroupBy","groupby().mean()","agg()","transform()","pivot_table","crosstab","مشروع: تجميع"),
U("دمج البيانات","merge","concat","join","how","suffixes","مشروع: دمج"),
U("السلاسل الزمنية","to_datetime","resample","rolling","shift","date_range","مشروع: زمني"),
U("تصدير وتنسيق","to_csv, to_excel","style","options","display","مشروع: تصدير"),
U("مشروع: تحليل بيانات","تخطيط","تنظيف","تحليل","تصور","عرض"),
),
S("Matplotlib و Seaborn","تصوير البيانات",
U("Matplotlib أساسيات","plot, scatter, bar","عناوين","محاور","figsize","savefig","مشروع: أول رسم"),
U("تخصيص الرسوم","ألوان","أنماط","markers","grid, legend","annotate","مشروع: تنسيق"),
U("Subplots","subplots()","مشاركة","tight_layout","أحجام","مشروع: Dashboard"),
U("الرسوم الإحصائية","hist, boxplot","bins","density","IQR","outliers","مشروع: إحصائي"),
U("Seaborn","histplot, kdeplot","boxplot, violinplot","barplot, countplot","scatterplot","مشروع: Seaborn"),
U("أنواع متقدمة","heatmap","pairplot","jointplot","FacetGrid","مشروع: متقدم"),
U("حفظ وتصدير","savefig","dpi","formats","bbox_inches","مشروع: تصدير"),
U("تصور تفاعلي","Plotly","px.scatter","px.line","hover","مشروع: تفاعلي"),
U("مشروع: Dashboard","تخطيط","بناء","تنسيق","عرض"),
),
S("تطوير الويب مع Flask","بناء تطبيقات ويب",
U("مقدمة Flask","تثبيت","أول تطبيق","Routes","Debug","مشروع: Hello"),
U("Routing","URL Parameters","Query Strings","Redirect","url_for","مشروع: Routes"),
U("Templates Jinja2","Variables","Loops","Conditions","Inheritance","مشروع: Templates"),
U("Forms","GET/POST","request.form","Validation","Flash Messages","مشروع: Forms"),
U("قواعد البيانات","SQLAlchemy","Models","Migrations","CRUD","مشروع: DB"),
U("Authentication","Flask-Login","Registration","Sessions","Password Hash","مشروع: Auth"),
U("REST API","JSON","Methods","Status Codes","Postman","مشروع: API"),
U("Deployment","Gunicorn","Environment","Debug=False","Requirements","مشروع: نشر"),
U("مشروع: تطبيق ويب","تخطيط","تطوير","نشر","عرض"),
),
S("العمل مع APIs","استهلاك وبناء APIs",
U("HTTP والطلبات","GET, POST","Headers","Status Codes","requests","مشروع: طلبات"),
U("REST APIs","Endpoints","JSON","Parameters","Authentication","مشروع: REST"),
U("استهلاك API","response.json()","Error Handling","Rate Limiting","Pagination","مشروع: استهلاك"),
U("بناء API مع Flask","Flask-RESTful","Marshmallow","Validation","Error Handling","مشروع: بناء"),
U("GraphQL","Strawberry","Queries","Mutations","Schema","مشروع: GraphQL"),
U("WebSockets","Flask-SocketIO","Events","Rooms","Real-time","مشروع: WebSockets"),
U("API Security","API Keys","JWT","OAuth 2.0","Rate Limiting","مشروع: أمان"),
U("API Documentation","OpenAPI","Swagger","Postman Docs","مشروع: توثيق"),
U("مشروع: API متكامل","تصميم","بناء","توثيق","نشر","عرض"),
),
S("اختبار البرمجيات","Unit Testing, TDD, pytest",
U("أساسيات الاختبار","لماذا نختبر؟","أنواع الاختبارات","Unit vs Integration","Test Pyramid","مشروع: أساسيات"),
U("unittest","TestCase","setUp, tearDown","assertEqual","assertRaises","مشروع: unittest"),
U("pytest","fixtures","parametrize","marks","plugins","conftest","مشروع: pytest"),
U("Mocking","unittest.mock","Mock, MagicMock","patch","side_effect","مشروع: Mock"),
U("Test-Driven Development","Red-Green-Refactor","كتابة test أولاً","فوائد TDD","مشروع: TDD"),
U("Code Coverage","coverage.py","تقارير","thresholds","CI integration","مشروع: Coverage"),
U("Integration Testing","Test Databases","API Testing","Selenium","مشروع: Integration"),
U("Continuous Testing","pre-commit hooks","CI/CD Tests","Automated Reports","مشروع: CI"),
U("مشروع: اختبر تطبيق","تخطيط","كتابة","تشغيل","تغطية","عرض"),
),
S("مشروع المستوى: تطبيق متكامل","تطبيق بمكتبات متعددة",
U("تخطيط","فكرة","متطلبات","معمارية","خطة"),
U("معالجة البيانات","استيراد","تنظيف","تحليل","Pandas"),
U("API Development","Endpoints","Auth","Validation","Flask"),
U("Frontend","Templates","CSS","JS","Bootstrap"),
U("اختبار","Unit","Integration","E2E","Coverage"),
U("توثيق","API Docs","README","Docstrings","Postman"),
U("نشر","Docker","Cloud","Domain","SSL"),
U("عرض","Demo","شرح","نتائج","تقييم"),
),
),
L("المستوى الثالث: تطبيقات ومشاريع Python","GUI, Data Science, Automation, Web Scraping","create",
S("واجهات المستخدم الرسومية","Tkinter, PyQt",
U("مقدمة Tkinter","Tk, Toplevel","Label, Button","Entry, Text","Pack, Grid","مشروع: أول نافذة"),
U("Widgets","Frame, LabelFrame","Checkbutton, Radiobutton","Listbox, Combobox","Scale, Spinbox","مشروع: Widgets"),
U("Layout Management","pack()","grid()","place()","Padding","Sticky","مشروع: تخطيط"),
U("Events","command","bind()","Event Types","lambda","مشروع: أحداث"),
U("Dialogs","messagebox","filedialog","colorchooser","simpledialog","مشروع: حوارات"),
U("Menu and Toolbar","Menu","Toolbar","Status Bar","Shortcuts","مشروع: قوائم"),
U("Canvas","رسم","صور","حركة","Animation","مشروع: رسم"),
U("PyQt/PySide","Qt Designer","Signals/Slots","Widgets","مشروع: PyQt"),
U("مشروع: تطبيق GUI","تصميم","تطوير","اختبار","عرض"),
),
S("تحليل البيانات و ML","scikit-learn, أساسيات التعلم الآلي",
U("استكشاف البيانات","تحميل","EDA","تصور","فرضيات","مشروع: استكشاف"),
U("Preprocessing","StandardScaler","OneHotEncoder","train_test_split","Pipeline","مشروع: Preprocess"),
U("Linear Regression","fit, predict","coef_, intercept_","R²","Residuals","مشروع: انحدار"),
U("Logistic Regression","Classification","predict_proba","Confusion Matrix","ROC","مشروع: تصنيف"),
U("Decision Trees","max_depth","feature_importances_","plot_tree","Overfitting","مشروع: شجرة"),
U("Random Forest","n_estimators","Bagging","OOB Score","مشروع: غابة"),
U("K-Means","n_clusters","Elbow Method","Silhouette","Centroids","مشروع: تجميع"),
U("Model Selection","Cross-Validation","GridSearchCV","Pipeline","Evaluation","مشروع: اختيار"),
U("مشروع: ML Pipeline","بيانات","Preprocess","نموذج","تقييم","عرض"),
),
S("Web Scraping","استخراج البيانات من الويب",
U("HTTP والطلبات","requests.get","Headers","User-Agent","Cookies","Sessions","مشروع: requests"),
U("BeautifulSoup","find, find_all","select","Navigating","Parsing","مشروع: BS4"),
U("استخراج البيانات","نصوص","جداول","روابط","صور","مشروع: استخراج"),
U("التعامل مع الصفحات","Pagination","URL Patterns","Delay","Throttling","مشروع: صفحات"),
U("Selenium","WebDriver","Click, Type","Wait","JavaScript","مشروع: Selenium"),
U("Scrapy","Spider","Item","Pipeline","Middleware","مشروع: Scrapy"),
U("أخلاقيات وقوانين","robots.txt","Rate Limiting","Terms of Service","Copyright","مشروع: أخلاقيات"),
U("تخزين البيانات","CSV","JSON","Database","Pandas","مشروع: تخزين"),
U("مشروع: Scraper","تخطيط","تنفيذ","تخزين","عرض"),
),
S("أتمتة المهام","Automation with Python",
U("أتمتة الملفات","shutil","os operations","File Organization","Bulk Rename","مشروع: ملفات"),
U("أتمتة البريد","smtplib","email","Templates","Attachments","مشروع: بريد"),
U("أتمتة Excel","openpyxl","Workbook","Styles","Formulas","مشروع: Excel"),
U("أتمتة PDF","PyPDF2","reportlab","Merge","Split","Extract","مشروع: PDF"),
U("جدولة المهام","schedule","time","APScheduler","Windows Task Scheduler","cron","مشروع: جدولة"),
U("مراقبة وتنبيهات","Watchdog","requests","Notifications","Logging","مشروع: مراقبة"),
U("أتمتة المتصفح","Selenium","Filling Forms","Screenshots","Downloads","مشروع: متصفح"),
U("أتمتة سطح المكتب","pyautogui","Keyboard","Mouse","Screenshots","مشروع: سطح مكتب"),
U("مشروع: أتمتة شاملة","تخطيط","تنفيذ","اختبار","نشر","عرض"),
),
S("تطبيقات قواعد البيانات","SQL و NoSQL مع Python",
U("SQLite","connect, cursor","execute","fetchone, fetchall","commits","مشروع: SQLite"),
U("SQLAlchemy ORM","Engine","Session","Models","Queries","Relationships","مشروع: ORM"),
U("PostgreSQL/MySQL","psycopg2","mysql-connector","Connection Pool","Parameters","مشروع: PG"),
U("MongoDB","pymongo","Documents","CRUD","Find, Aggregate","مشروع: Mongo"),
U("Redis","redis-py","Strings, Hashes","Lists, Sets","Pub/Sub","مشروع: Redis"),
U("Migration and Seeding","Alembic","Seeds","Backups","Restore","مشروع: Migration"),
U("Query Optimization","EXPLAIN","Indexing","N+1 Problem","Eager Loading","مشروع: تحسين"),
U("Database Design","Normalization","ERD","Relationships","Constraints","مشروع: تصميم"),
U("مشروع: نظام DB","تصميم","تطوير","تحسين","توثيق","عرض"),
),
S("تطبيقات متقدمة","Async, Performance, Security",
U("Async Python","asyncio","async/await","Tasks","Event Loop","مشروع: Async"),
U("Concurrency","threading","multiprocessing","GIL","Queue","مشروع: Concurrency"),
U("Performance","profiling","cProfile","memory_profiler","optimization","مشروع: أداء"),
U("Caching","functools.lru_cache","redis cache","Memoization","Invalidation","مشروع: Cache"),
U("Logging","logging module","Levels","Handlers","Formatters","Rotating","مشروع: Logging"),
U("Configuration","configparser",".env files","pydantic Settings","YAML","مشروع: Config"),
U("Security","hashlib","secrets","bcrypt","JWT","SQL Injection","مشروع: أمان"),
U("Packaging","setup.py","pyproject.toml","pip install","PyPI","مشروع: Packaging"),
U("مشروع: تطبيق إنتاجي","تخطيط","تطوير","تحسين","نشر","عرض"),
),
S("المشروع الختامي","تطبيق Python احترافي",
U("اختيار الفكرة","تحليل السوق","جدوى","نطاق","خطة"),
U("تصميم","معمارية","قاعدة بيانات","API","واجهة"),
U("تطوير","Sprint 1","Sprint 2","Sprint 3","دمج"),
U("اختبار","Unit","Integration","Performance","UAT"),
U("توثيق","README","API Docs","User Guide","Code Comments"),
U("نشر","Docker","CI/CD","Cloud","Domain"),
U("عرض","Demo","شرح تقني","نتائج","دروس"),
),
),
]

MISTAKES = [
("Data Leakage","Scaler قبل التقسيم = اختبار يتسرب = دقة وهمية.","اقسم أولاً. scaler.fit(X_train). scaler.transform(X_test).","Pipeline يمنع Data Leakage.","critical"),
("Overfitting","دقة تدريب 99%، اختبار 65%. النموذج حفظ ولم يتعلم.","تبسيط، Regularization، CV، EarlyStopping.","افحص الفجوة بين train و test.","critical"),
("عدم توحيد المقياس","متغير 1-1000 يسيطر على المسافات.","StandardScaler قبل K-Means, KNN, SVM, NN.","Trees لا تحتاج scaling.","major"),
("حلقات for مع Pandas","for على 100K: 5 ثوان. متجهة: 0.002 ثانية.","df['new'] = df['a'] + df['b'].","إذا كتبت for مع Pandas، توقف.","minor"),
("عدم استخدام Pipeline","خطوات يدوية = نسيان = Data Leakage.","Pipeline([('scaler',Scaler()),('model',Model())]).","Pipeline صديقك.","major"),
("نسيان with للملفات","ملف مفتوح ولا يغلق = تسرب موارد.","with open('file') as f: content = f.read().","مع with، يغلق تلقائياً.","minor"),
("استخدام mutable defaults","def f(lst=[]):  # خطر!","def f(lst=None): if lst is None: lst = [].","الوسائط الافتراضية تُقيّم مرة واحدة.","major"),
("نسيان return","دالة بلا return ترجع None.","تأكد من return في كل مسار.","إذا كانت الدالة يجب أن ترجع قيمة.","minor"),
]

def mb(p,c):return[f"الآن أتقنتَ {p}، نرتقي إلى {c}.",f"في الدرس السابق فككنا {p}. اليوم نبني عليه بـ {c}.",f"بعد {p}، {c} يسد الفجوة التالية.",f"{p} كان الأساس. {c} هو الطابق التالي.",][h(p+c)%4]

def gl(uc,lt,sn):
 ls=[];pv="المفاهيم الأساسية"
 for li,t in enumerate(lt,1):
  nm=2+(h(f"{uc}_{li}")%2);lm=[{"mistake":f"{m[0]}\n{m[1]}","correction":m[2],"treatment":m[3],"severity":m[4]} for m in [MISTAKES[(h(f"{uc}_{li}_{mi}"))%len(MISTAKES)] for mi in range(nm)]]
  ls.append({"lesson_index":li,"name":t,"goal":f"فهم وتطبيق {t}","bridge_sentence":mb(pv,t),"prerequisite_lessons":[] if li==1 else [f"{uc}.{li-1}"],"enables_lessons":[] if li==len(lt) else [f"{uc}.{li+1}"],"final_check_question":f"اشرح {t} بكلماتك. خطوات تطبيقه؟ أشهر خطأ؟","session_complete_criterion":f"يشرح {t} ويطبقه عملياً","yemeni_examples":[f"تطبيق عملي: {t}."],"expected_duration_minutes":30,"estimated_gem_cost":90,"solution_outline":f"خطوات {t}:\n1. فهم الأساس\n2. تطبيق عملي\n3. التجربة\n4. تحليل\n5. توثيق","motivation_hook":f"{t} — مهارة أساسية في Python.","learning_objectives":[{"statement":f"يفهم {t}","bloom_level":"understand"},{"statement":f"يطبق {t}","bloom_level":"apply"}],"glossary":[],"concepts":[{"name":t,"explanation":f"شرح وتطبيق عملي لـ {t} في سياق {sn}.","mastery_criterion":f"يشرح {t} ويطبقه","weight":1}],"common_mistakes":lm});pv=t
 return ls

def glab(uc,un,nl):
 return[{"lab_index":li,"title":f"معمل {un}: {'التشخيص' if li==1 else 'التطبيق'}","scenario":f"مشكلة في {un}. حللها.","completion_criterion":f"تحليل وحل","pedagogical_sequence":"diagnostic -> decision -> application -> analysis -> connection","prerequisite_lessons":[f"{uc}.{max(1,nl//2)}"],"allowed_tools":["text","code"],"questions":[{"kind":"diagnostic","prompt":f"خطوات تشخيص مشكلة في {un}؟","rubric":"ذكر 4 خطوات منطقية مع شرح","solution_outline":"جمع وتحليل وتحديد واقتراح","points":1},{"kind":"decision","prompt":f"خياران لحل في {un}. معاييرك؟","rubric":"ذكر معيارين مع تبرير","solution_outline":"الدقة والسرعة والتعقيد","points":1},{"kind":"application","prompt":f"اكتب كوداً يطبق {un}.","rubric":"كود صحيح يعمل","solution_outline":"استيراد وتطبيق","points":2},{"kind":"analysis","prompt":f"كود لـ {un} فيه 3 أخطاء.","rubric":"3 أخطاء مع تصحيح","solution_outline":"تحليل وتصحيح","points":1},{"kind":"connection","prompt":f"اربط {un} بمهارات سابقة.","rubric":"رابطان مع فكرة","solution_outline":"الربط وخطة","points":1}]} for li in range(1,3)]

def ge(c,s,n=10):
 q=[("Python نوع:",["مفسرة","مترجمة","Assembly","Bytecode فقط"],0,1,"Python لغة مفسرة."),("list vs tuple:",["list متغيرة","tuple متغيرة","لا فرق","كلاهما ثابت"],0,1,"list mutable، tuple immutable."),("Overfitting:",["يحفظ ولا يعمم","بسيط جداً","سريع","قليل بيانات"],0,2,"أداء تدريب ممتاز، فشل على بيانات جديدة."),("Cross-Validation:",["تقييم موثوق","تسريع","زيادة بيانات","تغيير"],0,2,"يقسم لـ k أجزاء."),("ReLU:",["ReLU","Sigmoid","Softmax","Linear"],0,2,"تحل Vanishing Gradient."),("df.describe():",["إحصائيات وصفية","حذف","رسم","تغيير"],0,1,"وصف إحصائي."),("Data Leakage:",["تسرب الاختبار","فقدان","تسرب ذاكرة","توقف"],0,2,"أخطر خطأ."),("StandardScaler:",["توحيد مقياس","زيادة","تسريع","تغيير"],0,1,"mean=0, std=1.")]
 vv=[]
 for v in range(3):vv.append([{"question_index":qi+1,"kind":"mcq","prompt":p,"choices":[f"{chr(1571+ci)})\u200f {ch}" for ci,ch in enumerate(c)],"correct_index":ci,"explanation":e,"difficulty":d,"points":1,"time_limit_seconds":60+d*30} for qi,(p,c,ci,d,e) in enumerate([q[(h(f"{s}_{v}_{qi}"))%len(q)] for qi in range(n)])])
 return{"code":s,"scope":c,"variants":vv}

def gp():
 q=[(1,"print(type(3.14)):",["<class 'float'>","<class 'int'>","<class 'str'>","<class 'bool'>"],0,1),(1,"list comprehension:",["[x for x in range(10)]","list(range)","for x in list","(x for x)"],0,1),(2,"df.describe():",["إحصائيات وصفية","حذف","رسم","تغيير"],0,1),(2,"np.mean():",["المتوسط","الوسيط","المجموع","المنوال"],0,1),(3,"Logistic Regression:",["تصنيف ثنائي","انحدار","تجميع","تخفيف أبعاد"],0,2)]
 return[{"target_level_index":l,"kind":"mcq","prompt":p,"choices":[f"{chr(1571+ci)})\u200f {c}" for ci,c in enumerate(c)],"correct_index":ci,"difficulty":d,"explanation":f"مستوى {l}"} for l,p,c,ci,d in q]*2

def main():
 print(f"\n{'='*60}\n  skill-python — Python\n{'='*60}\n")
 mt={"slug":"skill-python","name":"Python","icon":"🐍","desc":"منهج متكامل: من الأساسيات إلى التطبيقات المتقدمة.","scope":"professional_track","language":"ar","region":"YE","target_persona":"طالب يريد إتقان Python.","teacher_tone":"عملية ومباشرة.","viz":["python_trace","flowchart","scatter_plot","line_chart"],"tools":["text","code","image"],"glossary":[{"term":"Python","definition":"لغة برمجة مفسرة عالية المستوى"}]}
 rl=[];au=[];asc=[]
 for li,(ln,lg,lb,ss) in enumerate(CURRICULUM):
  lv=li+1;rs=[]
  for si,(sn,sg,us) in enumerate(ss):
   sv=si+1;sc=f"{lv}.{sv}";asc.append(sc);ru=[]
   for ui,(un,lt) in enumerate(us):
    lt=[t for t in lt if t and len(t)>=3];uv=ui+1;uc=f"{sc}.{uv}";au.append(uc)
    ls=gl(uc,lt,sn);la=glab(uc,un,len(ls))
    pr=[f"{sc}.{ui}"] if ui>0 else[];en=[f"{sc}.{ui+2}"] if ui<len(us)-1 else[]
    g=f"إتقان {un}";g=g if len(g)>=10 else f"إتقان {un} بشكل متقن"
    ru.append({"unit_index":uv,"name":un,"goal":g,"prerequisite_units":pr,"enables_units":en,"key_concepts":[lt[0][:20]],"motivation_hook":f"وحدة {un} — خطوتك نحو الاحتراف.","learning_objectives":[{"statement":f"يتقن {un}","bloom_level":"apply"}],"lessons":ls,"labs":la,"exam":{"pass_threshold_percent":60,"points":10,"time_limit_minutes":30}})
    print(f"  {uc}: {un[:50]} ({len(lt)} دروس)")
   rs.append({"stage_index":sv,"name":sn,"goal":sg,"bloom_focus":lb,"units":ru,"exam":{"pass_threshold_percent":60,"points":20,"time_limit_minutes":45}})
  rl.append({"level_index":lv,"name":ln,"goal":lg,"bloom_focus":lb,"stages":rs,"exam":{"pass_threshold_percent":60,"points":50,"time_limit_minutes":90}})
 print("\n  بنوك الامتحانات...")
 ub={c:ge(c,"unit",10) for c in au}
 sb={c:ge(c,"stage",15) for c in asc}
 lb={str(i):ge(str(i),"level",20) for i in range(1,len(rl)+1)}
 fn={"schema_version":"v4.1","specialty":{**mt,"yemeni_examples":["تطبيق عملي"]},"levels":rl,"exam_banks":{"unit_banks":ub,"stage_banks":sb,"level_banks":lb},"placement_test_questions":gp(),"publish_notes":"skill-python — تسلسل منطقي"}
 fp=OUT/"final.json"
 with open(fp,'w',encoding='utf-8') as f:json.dump(fn,f,ensure_ascii=False,indent=2)
 sz=fp.stat().st_size/(1024*1024);tl=sum(1 for l in rl for s in l['stages'] for u in s['units'] for _ in u['lessons'])
 print(f"\n  ✅ {sz:.1f} MB | {len(rl)} مستويات | {tl} درس\n")
if __name__=="__main__":main()
