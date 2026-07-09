import { writeFileSync } from "fs";

const CURRICULUM = {
  schema_version: "v4.1",
  slug: "uni-datascience",
  name: "علوم البيانات",
  icon: "📊",
  description: "مسار احترافي متكامل في علوم البيانات يبدأ من Python والإحصاء والرياضيات ويصل إلى نماذج التعلم العميق وLLMs وMLOps وقيادة فرق البيانات، وفق أحدث معايير الصناعة ومتطلبات سوق العمل العالمي",
  target_persona: "عالم بيانات يسعى للتأهل الكامل من الأسس الرياضية والبرمجية إلى تصميم نماذج ذكاء اصطناعي إنتاجية وقيادة مشاريع البيانات في الشركات والمؤسسات",
  teacher_tone: "خبير علوم بيانات يجمع بين عمق الرياضيات وعملية البرمجة وحدّة التفكير التحليلي، يبدأ كل مفهوم بسؤال حقيقي من الواقع اليمني أو العالمي ثم يبني الحل خطوة بخطوة، ويربط كل نموذج بقرار تجاري فعلي",
  allowed_viz_templates: ["flowchart", "comparison_table", "timeline", "architecture_diagram", "network_diagram", "scatter_plot"],
  allowed_tools: ["nukhba_ide_python", "nukhba_ide_js", "regex_playground"],
  levels: [
    {
      level_index: 1,
      name: "أساسيات علوم البيانات",
      goal: "بناء أساس صلب في Python والإحصاء والرياضيات وSQL وتنظيف البيانات وتصويرها، بما يُهيّئ المتعلم للتعامل مع البيانات الحقيقية وبناء أول نماذج تعلم آلي",
      bloom_focus: "understand",
      exam: { pass_threshold_percent: 65, time_limit_minutes: 70 },
      stages: [
        {
          stage_index: 1,
          name: "Python لعلوم البيانات",
          goal: "إتقان Python من منظور تحليل البيانات: NumPy وPandas والبرمجة الوظيفية والأداء",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.1.1",
              name: "Python الأساسي من منظور البيانات",
              goal: "إعادة بناء أسس Python بتركيز كامل على معالجة البيانات والكفاءة",
              key_concepts: ["List Comprehension","Generator Expressions","Dictionary Operations","Unpacking","Type Hints"],
              lessons: [
                { name: "قوائم Python ومعالجة البيانات: List Comprehensions", primary: "list comprehensions and generators for data" },
                { name: "القواميس والمجموعات: هياكل بيانات Python الأساسية", primary: "dict and set operations for data processing" },
                { name: "Unpacking والمتغيرات المتعددة في Python", primary: "tuple unpacking and multiple assignment" },
                { name: "الدوال من الدرجة الأولى: lambda وmap وfilter", primary: "functional programming in Python" },
                { name: "Type Hints وMyPy: كود Python أوضح", primary: "Python type hints and type checking" },
                { name: "Iterators وGenerators: معالجة الكميات الضخمة", primary: "iterators and generators for large data" },
                { name: "Context Managers وwith: إدارة الموارد", primary: "context managers for resource management" },
                { name: "Decorators: إضافة قدرات لدوالك", primary: "Python decorators for data pipelines" },
                { name: "Dataclasses وNamedTuples: هياكل بيانات مخصصة", primary: "dataclasses and namedtuples for structured data" }
              ]
            },
            {
              unit_index: 2, code: "1.1.2",
              name: "NumPy: الحوسبة العددية السريعة",
              goal: "إتقان NumPy للحساب الرقمي الكفء كأساس لكل مكتبات علوم البيانات",
              key_concepts: ["ndarray","Broadcasting","Vectorization","Fancy Indexing","Linear Algebra Ops"],
              lessons: [
                { name: "ndarray: قلب NumPy وأنواع البيانات", primary: "NumPy ndarray creation and dtypes" },
                { name: "الفهرسة والتقطيع: الوصول للبيانات بكفاءة", primary: "NumPy indexing slicing and boolean masks" },
                { name: "Broadcasting: العمليات على مصفوفات مختلفة الأبعاد", primary: "NumPy broadcasting rules and applications" },
                { name: "Vectorization: تسريع الحسابات بلا حلقات", primary: "NumPy vectorization vs Python loops" },
                { name: "عمليات المصفوفات: جمع وضرب ومعكوس", primary: "NumPy matrix operations and linear algebra" },
                { name: "Fancy Indexing وBoolean Masking", primary: "NumPy fancy indexing and masking" },
                { name: "دوال الإحصاء والرياضيات في NumPy", primary: "NumPy statistical and mathematical functions" },
                { name: "حفظ وتحميل المصفوفات: npy وnpz وtxt", primary: "NumPy array serialization formats" },
                { name: "NumPy في الممارسة: تحليل مجموعة بيانات حقيقية", primary: "NumPy real-world data analysis project" }
              ]
            },
            {
              unit_index: 3, code: "1.1.3",
              name: "Pandas: تحليل البيانات الجدولية",
              goal: "إتقان Pandas لقراءة وتحويل وتحليل البيانات الجدولية بكفاءة عالية",
              key_concepts: ["DataFrame","Series","GroupBy","Merge/Join","Apply"],
              lessons: [
                { name: "DataFrame وSeries: هيكل بيانات Pandas", primary: "Pandas DataFrame and Series fundamentals" },
                { name: "قراءة البيانات: CSV وExcel وJSON وSQL", primary: "Pandas data reading from multiple sources" },
                { name: "الفهرسة: loc وiloc والفهرسة المنطقية", primary: "Pandas loc iloc and boolean indexing" },
                { name: "GroupBy: تجميع البيانات وحساب الإحصاءات", primary: "Pandas groupby aggregation patterns" },
                { name: "Merge وJoin وConcat: دمج مجموعات البيانات", primary: "Pandas merge join concat operations" },
                { name: "Apply وMap وTransform: تحويل البيانات", primary: "Pandas apply map transform functions" },
                { name: "Pivot Tables وCrossTab: تقارير متقدمة", primary: "Pandas pivot tables and crosstab" },
                { name: "Time Series في Pandas: تحليل البيانات الزمنية", primary: "Pandas time series analysis" },
                { name: "تحسين أداء Pandas: Vectorization والأنواع الصحيحة", primary: "Pandas performance optimization" }
              ]
            },
            {
              unit_index: 4, code: "1.1.4",
              name: "التعامل مع الملفات وتنسيقات البيانات",
              goal: "قراءة ومعالجة وكتابة مختلف تنسيقات البيانات الشائعة في مشاريع البيانات الحقيقية",
              key_concepts: ["JSON","CSV","Parquet","Excel","XML/HTML Parsing"],
              lessons: [
                { name: "JSON: قراءة وكتابة وتحليل البيانات المتداخلة", primary: "JSON parsing and nested data flattening" },
                { name: "CSV وTSV: الخيارات المتقدمة والترميزات", primary: "CSV advanced options and encoding issues" },
                { name: "Parquet وArrow: تنسيقات البيانات العمودية", primary: "Parquet format for analytical workloads" },
                { name: "Excel متعدد الأوراق: قراءة وكتابة متقدمة", primary: "Excel multi-sheet read write with openpyxl" },
                { name: "XML وHTML Parsing بـBeautifulSoup", primary: "XML and HTML parsing for data extraction" },
                { name: "API REST: جلب البيانات من الويب بـrequests", primary: "REST API data fetching with Python requests" },
                { name: "Web Scraping أخلاقي بـrequests وBeautifulSoup", primary: "Ethical web scraping for data collection" },
                { name: "PDF وWord: استخراج النص من المستندات", primary: "PDF and Word document text extraction" },
                { name: "بناء مُحمِّل بيانات موحّد قابل لإعادة الاستخدام", primary: "Reusable data loader design pattern" }
              ]
            },
            {
              unit_index: 5, code: "1.1.5",
              name: "البرمجة الوظيفية لأنابيب البيانات",
              goal: "كتابة أنابيب معالجة بيانات نظيفة وقابلة للاختبار باستخدام مبادئ البرمجة الوظيفية",
              key_concepts: ["Pure Functions","Immutability","functools","toolz","Pipeline Pattern"],
              lessons: [
                { name: "الدوال النقية والآثار الجانبية في معالجة البيانات", primary: "pure functions and side effects in data pipelines" },
                { name: "functools: reduce وpartial ولru_cache", primary: "functools for data transformation" },
                { name: "itertools: مجموعات وتقاطعات وتجميعات", primary: "itertools for data combinations and grouping" },
                { name: "تكوين الدوال: Pipeline بدون تعقيد", primary: "function composition pipeline pattern" },
                { name: "Error Handling في أنابيب البيانات", primary: "error handling strategies in data pipelines" },
                { name: "Lazy Evaluation: معالجة ملايين الصفوف دون استنزاف الذاكرة", primary: "lazy evaluation for large dataset processing" },
                { name: "اختبار دوال معالجة البيانات بـpytest", primary: "pytest for data transformation testing" },
                { name: "Logging وObservability في أنابيب البيانات", primary: "logging and observability in data pipelines" },
                { name: "مشروع: بناء أنبوب ETL بسيط قابل للاختبار", primary: "end-to-end ETL pipeline with tests" }
              ]
            },
            {
              unit_index: 6, code: "1.1.6",
              name: "البيئات الافتراضية وإدارة المكتبات",
              goal: "إتقان إدارة بيئات Python لضمان استنساخية مشاريع البيانات",
              key_concepts: ["venv","conda","pip","requirements.txt","pyproject.toml"],
              lessons: [
                { name: "venv: إنشاء البيئات المعزولة وإدارتها", primary: "Python venv for project isolation" },
                { name: "conda: إدارة البيئات والمكتبات العلمية", primary: "conda environment management for data science" },
                { name: "pip وpip-tools: تثبيت المكتبات وتثبيت الإصدارات", primary: "pip and pip-tools dependency pinning" },
                { name: "requirements.txt وpyproject.toml: توثيق التبعيات", primary: "dependency documentation standards" },
                { name: "Docker لمشاريع البيانات: حاويات قابلة للاستنساخ", primary: "Docker containers for reproducible data science" },
                { name: "Jupyter Notebooks: البيئة التفاعلية لعلوم البيانات", primary: "Jupyter notebook best practices" },
                { name: "nbconvert وPapermill: تشغيل Notebooks آلياً", primary: "Jupyter automation with nbconvert and Papermill" },
                { name: "VS Code لعلوم البيانات: الإضافات والإعدادات", primary: "VS Code data science setup and extensions" },
                { name: "Git لمشاريع البيانات: تتبع الكود والبيانات", primary: "Git for data science projects" }
              ]
            },
            {
              unit_index: 7, code: "1.1.7",
              name: "SciPy وStatsmodels: الإحصاء التطبيقي",
              goal: "تطبيق الاختبارات الإحصائية والنمذجة الإحصائية عملياً بـPython",
              key_concepts: ["Hypothesis Testing","ANOVA","Regression","Confidence Intervals","SciPy Stats"],
              lessons: [
                { name: "SciPy.stats: توزيعات الاحتمالية واختبارات الفرضيات", primary: "SciPy statistical distributions and tests" },
                { name: "T-test وZ-test: متى وكيف تستخدمها", primary: "T-test and Z-test implementation in Python" },
                { name: "Chi-Square وFisher's Exact: اختبار الاستقلالية", primary: "chi-square and Fisher exact tests" },
                { name: "ANOVA: مقارنة متوسطات متعددة المجموعات", primary: "ANOVA analysis with scipy and statsmodels" },
                { name: "الانحدار الخطي بـstatsmodels: التفسير الكامل", primary: "statsmodels linear regression interpretation" },
                { name: "فترات الثقة ومستوى الدلالة: الفهم العميق", primary: "confidence intervals and significance levels" },
                { name: "قوة الاختبار وحجم العيّنة: تجنّب الخطأ المنهجي", primary: "statistical power and sample size calculation" },
                { name: "Bootstrapping: تقدير الثقة بدون افتراضات توزيع", primary: "bootstrapping for confidence estimation" },
                { name: "مشروع: تحليل A/B Test كامل بـPython", primary: "complete A/B test analysis with Python" }
              ]
            },
            {
              unit_index: 8, code: "1.1.8",
              name: "أداء Python: التحسين والموازاة",
              goal: "تحسين أداء كود Python لمعالجة البيانات الكبيرة بكفاءة",
              key_concepts: ["Profiling","Cython","Numba","Multiprocessing","Memory Optimization"],
              lessons: [
                { name: "Profiling: إيجاد اختناقات الأداء بـcProfile وline_profiler", primary: "Python performance profiling tools" },
                { name: "Numba: تسريع الكود العددي بـJIT Compilation", primary: "Numba JIT compilation for numerical code" },
                { name: "Multiprocessing: موازاة مهام CPU-Bound", primary: "Python multiprocessing for CPU-bound tasks" },
                { name: "concurrent.futures وasyncio: المهام المتوازية", primary: "concurrent.futures and asyncio for data tasks" },
                { name: "تحسين استهلاك الذاكرة في Pandas وNumPy", primary: "memory optimization for large DataFrames" },
                { name: "Dask: Pandas ذو الحجم الكبير", primary: "Dask for out-of-core data processing" },
                { name: "Polars: بديل Pandas الأسرع لمجموعات البيانات الكبيرة", primary: "Polars DataFrame library comparison with Pandas" },
                { name: "Caching: تخزين نتائج العمليات المكلفة", primary: "caching strategies for expensive computations" },
                { name: "قياس الأداء وتوثيقه: Benchmarking", primary: "systematic performance benchmarking" }
              ]
            },
            {
              unit_index: 9, code: "1.1.9",
              name: "مشروع Python الشامل: تحليل بيانات من الصفر",
              goal: "توحيد كل مهارات Python المكتسبة في مشروع تحليل بيانات حقيقي كامل",
              key_concepts: ["Project Structure","ETL Pipeline","Analysis Report","Code Quality","Documentation"],
              lessons: [
                { name: "تصميم هيكل مشروع علوم البيانات الاحترافي", primary: "professional data science project structure" },
                { name: "جمع البيانات: API والكشط وملفات محلية", primary: "data collection from APIs scraping and files" },
                { name: "خط أنابيب التنظيف والتحويل الكامل", primary: "full data cleaning and transformation pipeline" },
                { name: "التحليل الاستكشافي التلقائي بـpandas-profiling", primary: "automated EDA with pandas profiling" },
                { name: "التحليل الإحصائي وصياغة الفرضيات", primary: "statistical analysis and hypothesis formulation" },
                { name: "التصوير التوضيحي لنتائج التحليل", primary: "visualization for analysis communication" },
                { name: "كتابة تقرير البيانات: الإيجاز والوضوح", primary: "data analysis report writing" },
                { name: "Code Review: جودة الكود في مشاريع البيانات", primary: "code quality standards in data science" },
                { name: "نشر المشروع على GitHub وتوثيقه", primary: "GitHub project documentation and deployment" }
              ]
            }
          ]
        },
        {
          stage_index: 2,
          name: "الإحصاء والاحتمالات",
          goal: "بناء عمق رياضي-إحصائي حقيقي يجعل المتعلم يفهم النماذج من الداخل لا من السطح",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.2.1",
              name: "الإحصاء الوصفي والمقاييس الأساسية",
              goal: "توصيف البيانات بدقة وفهم ما تقوله الأرقام فعلاً",
              key_concepts: ["Mean/Median/Mode","Variance","Skewness","Kurtosis","Outlier Detection"],
              lessons: [
                { name: "الوسط الحسابي والوسيط والمنوال: متى يُستخدم كل منهم", primary: "mean median mode choice in context" },
                { name: "التباين والانحراف المعياري: قياس التشتت", primary: "variance and standard deviation calculation" },
                { name: "الارتواء والتفلطح: شكل التوزيع", primary: "skewness and kurtosis interpretation" },
                { name: "المربعات الرباعية وboxplot: تحديد الشواذ", primary: "quartiles boxplot and outlier detection" },
                { name: "الارتباط: Pearson وSpearman وKendall", primary: "correlation coefficients selection" },
                { name: "التغاير Covariance وما يعنيه للبيانات", primary: "covariance in data analysis" },
                { name: "الإحصاء الوصفي لبيانات التصنيف والفئات", primary: "descriptive statistics for categorical data" },
                { name: "المجموعات الجزئية والتجميعات المتعددة", primary: "grouped descriptive statistics" },
                { name: "تقرير إحصائي تلقائي بـPandas وSciPy", primary: "automated statistical report with Python" }
              ]
            },
            {
              unit_index: 2, code: "1.2.2",
              name: "نظرية الاحتمالات والتوزيعات",
              goal: "إتقان الاحتمالات والتوزيعات كأساس لكل نماذج التعلم الآلي",
              key_concepts: ["Conditional Probability","Bayes Theorem","Discrete Distributions","Continuous Distributions","CLT"],
              lessons: [
                { name: "الاحتمال الشرطي: P(A|B) ومتى يهم", primary: "conditional probability and independence" },
                { name: "مبرهنة بايز: التحديث بضوء الأدلة الجديدة", primary: "Bayes theorem and applications" },
                { name: "التوزيع الثنائي Binomial: نجاح أو فشل", primary: "binomial distribution and applications" },
                { name: "توزيع Poisson: أحداث نادرة في وقت معين", primary: "Poisson distribution for rare events" },
                { name: "التوزيع الطبيعي: لماذا هو في كل مكان", primary: "normal distribution properties and applications" },
                { name: "مبرهنة حد المركزي: لماذا تعمل الإحصاءات", primary: "central limit theorem intuition and proof" },
                { name: "توزيع Uniform وExponential وGamma", primary: "uniform exponential gamma distributions" },
                { name: "محاكاة التوزيعات بـNumPy: Monte Carlo", primary: "distribution simulation with NumPy" },
                { name: "اختيار التوزيع المناسب لبياناتك", primary: "distribution selection guide for real data" }
              ]
            },
            {
              unit_index: 3, code: "1.2.3",
              name: "اختبار الفرضيات الإحصائية",
              goal: "تطبيق اختبارات الفرضيات الصحيحة لاتخاذ قرارات مبنية على البيانات",
              key_concepts: ["Null Hypothesis","P-value","Type I/II Error","Statistical Power","Multiple Testing"],
              lessons: [
                { name: "الفرضية الصفرية والبديلة: بناء الاختبار الصحيح", primary: "null and alternative hypothesis formulation" },
                { name: "القيمة الاحتمالية P-value: التفسير الصحيح", primary: "p-value interpretation and common mistakes" },
                { name: "خطأ النوع الأول والثاني: المبادلة الحتمية", primary: "type I and type II error trade-off" },
                { name: "قوة الاختبار الإحصائي وتحديد حجم العيّنة", primary: "statistical power analysis and sample size" },
                { name: "اختبارات أحادية وثنائية الذيل: متى يُستخدم كل", primary: "one-tailed vs two-tailed tests" },
                { name: "مشكلة المقارنات المتعددة وتصحيح Bonferroni", primary: "multiple testing correction methods" },
                { name: "اختبارات بارامترية ولابارامترية: الاختيار الصحيح", primary: "parametric vs non-parametric test selection" },
                { name: "ANOVA وPost-Hoc Tests: مقارنة مجموعات متعددة", primary: "ANOVA and post-hoc analysis" },
                { name: "مشروع: اتخاذ قرار A/B Test في منتج رقمي", primary: "A/B test decision making project" }
              ]
            },
            {
              unit_index: 4, code: "1.2.4",
              name: "الإحصاء البايزي التطبيقي",
              goal: "تطبيق الاستدلال البايزي كمنهج تفكير بديل للإحصاء التكراري",
              key_concepts: ["Prior Distribution","Posterior","Likelihood","Credible Intervals","PyMC"],
              lessons: [
                { name: "الإحصاء التكراري مقابل البايزي: الفلسفة", primary: "frequentist vs Bayesian philosophy" },
                { name: "التوزيع السابق Prior: معرفتك قبل البيانات", primary: "prior distribution selection and elicitation" },
                { name: "الاشتقاق البايزي: تحديث المعتقدات", primary: "Bayesian updating with likelihood" },
                { name: "التوزيع اللاحق Posterior: الإجابة البايزية", primary: "posterior distribution computation" },
                { name: "فترات المصداقية Credible Intervals مقابل الثقة", primary: "credible intervals vs confidence intervals" },
                { name: "اختيار النموذج البايزي وعامل Bayes", primary: "Bayesian model selection and Bayes factor" },
                { name: "PyMC: النمذجة البايزية الاحتمالية بـPython", primary: "PyMC probabilistic programming" },
                { name: "MCMC: أخذ العيّنات من التوزيعات المعقدة", primary: "MCMC sampling methods" },
                { name: "مشروع: نمذجة بايزية لمشكلة تجارية حقيقية", primary: "Bayesian business problem modeling" }
              ]
            },
            {
              unit_index: 5, code: "1.2.5",
              name: "الإحصاء متعدد المتغيرات",
              goal: "تحليل العلاقات بين متغيرات متعددة وفهم التباين المشترك والإسقاط",
              key_concepts: ["Multivariate Normal","Covariance Matrix","PCA Intuition","Correlation Matrix","Dimensionality"],
              lessons: [
                { name: "التوزيع الطبيعي متعدد الأبعاد", primary: "multivariate normal distribution" },
                { name: "مصفوفة التغاير: قلب التحليل متعدد المتغيرات", primary: "covariance matrix computation and interpretation" },
                { name: "مصفوفة الارتباط: تصور العلاقات", primary: "correlation matrix visualization and interpretation" },
                { name: "Heatmaps وPairplots: رؤية الارتباطات الكاملة", primary: "heatmaps and pairplots for correlation analysis" },
                { name: "التحليل العاملي: اكتشاف البنية الخفية", primary: "factor analysis for latent structure" },
                { name: "إسقاط PCA: حدس هندسي قبل الرياضيات", primary: "PCA geometric intuition and projection" },
                { name: "مشكلة التعددية الخطية Multicollinearity", primary: "multicollinearity detection and treatment" },
                { name: "الانحدار متعدد المتغيرات: التفسير الصحيح", primary: "multiple regression interpretation" },
                { name: "مشروع: تحليل عاملي لاستطلاع رأي يمني", primary: "factor analysis on survey data" }
              ]
            },
            {
              unit_index: 6, code: "1.2.6",
              name: "إحصاء سلاسل الوقت",
              goal: "تحليل البيانات الزمنية إحصائياً وفهم التقلبات والدورات والاتجاهات",
              key_concepts: ["Stationarity","Autocorrelation","ACF/PACF","Seasonality","Trend Decomposition"],
              lessons: [
                { name: "سلاسل الوقت: المكونات الأربعة والتحليل", primary: "time series components: trend seasonality residual" },
                { name: "الثبات Stationarity: الشرط الأساسي للتحليل", primary: "stationarity testing and transformation" },
                { name: "دالة الارتباط الذاتي ACF وPACF", primary: "ACF and PACF interpretation for model selection" },
                { name: "اختبارات ديكي-فولر وKPSS لاختبار الثبات", primary: "ADF and KPSS stationarity tests" },
                { name: "تحليل الموسمية وإزالتها", primary: "seasonal decomposition and adjustment" },
                { name: "التمهيد الأسي: موازنة الضجيج والإشارة", primary: "exponential smoothing for time series" },
                { name: "اختبار Granger Causality: هل تسبق هذه تلك؟", primary: "Granger causality testing" },
                { name: "Cross-Validation لسلاسل الوقت: Walk-Forward", primary: "time series cross-validation strategies" },
                { name: "مشروع: تحليل إحصائي لبيانات اقتصادية يمنية", primary: "economic time series statistical analysis" }
              ]
            },
            {
              unit_index: 7, code: "1.2.7",
              name: "نظرية المعلومات وإنتروبيا",
              goal: "فهم نظرية المعلومات كأساس لخوارزميات التعلم الآلي ومقاييس التقييم",
              key_concepts: ["Entropy","Information Gain","KL Divergence","Mutual Information","Cross Entropy"],
              lessons: [
                { name: "الإنتروبيا: قياس عدم اليقين والمعلومة", primary: "Shannon entropy and information content" },
                { name: "المعلومات المتبادلة Mutual Information", primary: "mutual information feature selection" },
                { name: "KL Divergence: مسافة التوزيعات", primary: "KL divergence and Jensen-Shannon divergence" },
                { name: "Cross-Entropy: دالة الخسارة الأكثر شيوعاً", primary: "cross-entropy loss function derivation" },
                { name: "Information Gain في أشجار القرار", primary: "information gain for decision tree splitting" },
                { name: "Gini Impurity مقابل Entropy: متى يفرق الاختيار", primary: "Gini impurity vs entropy comparison" },
                { name: "MDL وModel Complexity: أوكام في علوم البيانات", primary: "minimum description length principle" },
                { name: "نظرية المعلومات في ضغط البيانات", primary: "information theory in data compression" },
                { name: "تطبيق نظرية المعلومات في اختيار الميزات", primary: "information-theoretic feature selection" }
              ]
            },
            {
              unit_index: 8, code: "1.2.8",
              name: "الإحصاء التطبيقي للأعمال",
              goal: "ترجمة الإحصاء إلى قرارات تجارية قابلة للتطبيق وقابلة للفهم من غير المتخصصين",
              key_concepts: ["Business KPIs","Cohort Analysis","Funnel Analysis","Churn Prediction Baseline","Statistical Storytelling"],
              lessons: [
                { name: "مؤشرات KPI: كيف تُحدّدها وتقيسها إحصائياً", primary: "KPI definition and statistical measurement" },
                { name: "تحليل Cohort: متابعة المجموعات عبر الزمن", primary: "cohort analysis for user retention" },
                { name: "تحليل Funnel: قياس التحويل وتحسينه", primary: "conversion funnel analysis" },
                { name: "Customer Lifetime Value: الحساب الإحصائي", primary: "customer lifetime value statistical calculation" },
                { name: "Churn Analysis: أسباب المغادرة وعوامل الخطر", primary: "churn analysis and risk factors" },
                { name: "اختبار A/B/n للميزات المتعددة", primary: "multivariate A/B testing design" },
                { name: "إحصاء Causal: هل هذا سبب أم مجرد ارتباط؟", primary: "causal inference from observational data" },
                { name: "تقديم نتائج إحصائية لصانعي القرار", primary: "statistical storytelling for executives" },
                { name: "مشروع: تحليل أداء منتج رقمي كامل", primary: "complete digital product performance analysis" }
              ]
            },
            {
              unit_index: 9, code: "1.2.9",
              name: "الإحصاء غير البارامتري وإعادة أخذ العيّنات",
              goal: "التعامل مع البيانات التي لا تلبي افتراضيات التوزيع الطبيعي",
              key_concepts: ["Mann-Whitney","Kruskal-Wallis","Bootstrap","Permutation Tests","Jackknife"],
              lessons: [
                { name: "اختبار Mann-Whitney: بديل T-test اللابارامتري", primary: "Mann-Whitney U test" },
                { name: "اختبار Kruskal-Wallis: بديل ANOVA اللابارامتري", primary: "Kruskal-Wallis test for non-parametric groups" },
                { name: "اختبار Wilcoxon: المقارنة للعيّنات المترابطة", primary: "Wilcoxon signed-rank test" },
                { name: "Bootstrap: إعادة أخذ العيّنات لبناء الثقة", primary: "bootstrap resampling for confidence estimation" },
                { name: "Permutation Tests: الاستدلال بالخلط العشوائي", primary: "permutation tests for significance" },
                { name: "اختبار Kolmogorov-Smirnov: مقارنة التوزيعات", primary: "KS test for distribution comparison" },
                { name: "Jackknife: تقدير التحيز والتباين", primary: "jackknife resampling for bias estimation" },
                { name: "Rank Correlation: Spearman وKendall's Tau", primary: "Spearman and Kendall rank correlation" },
                { name: "مشروع: مقارنة مجموعتين بدون افتراضات توزيع", primary: "distribution-free group comparison project" }
              ]
            }
          ]
        },
        {
          stage_index: 3,
          name: "الجبر الخطي والتفاضل للتعلم الآلي",
          goal: "بناء الحدس الرياضي الذي يجعل خوارزميات التعلم الآلي شفافة لا صندوقاً أسود",
          bloom_focus: "understand",
          exam: { pass_threshold_percent: 60, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 65, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "1.3.1",
              name: "المتجهات والمساحات المتجهية",
              goal: "بناء حدس هندسي للمتجهات كأساس لفهم البيانات متعددة الأبعاد",
              key_concepts: ["Vector Operations","Dot Product","Norm","Cosine Similarity","Vector Space"],
              lessons: [
                { name: "المتجهات كبيانات: من الأرقام إلى الاتجاه", primary: "vectors as data representation" },
                { name: "الجمع والطرح والضرب القياسي للمتجهات", primary: "vector arithmetic and scalar multiplication" },
                { name: "الضرب النقطي Dot Product: التشابه والإسقاط", primary: "dot product and projection interpretation" },
                { name: "القاعدة الإقليدية ومقاييس المسافة", primary: "Euclidean norm and distance metrics" },
                { name: "تشابه جيب التمام Cosine Similarity في NLP", primary: "cosine similarity for text and recommendation" },
                { name: "الاستقلال الخطي: هل تقول متجهاتك شيئاً جديداً؟", primary: "linear independence and span" },
                { name: "القواعد Basis والتحويل بين المساحات", primary: "basis vectors and coordinate transformation" },
                { name: "المساحة الفرعية Subspace والإسقاط", primary: "subspace projection and orthogonality" },
                { name: "تطبيق: تمثيل النصوص كمتجهات وحساب التشابه", primary: "text vector representation and similarity" }
              ]
            },
            {
              unit_index: 2, code: "1.3.2",
              name: "المصفوفات وعمليات التحويل",
              goal: "فهم المصفوفات كتحويلات خطية وتطبيقاتها في البيانات",
              key_concepts: ["Matrix Multiplication","Transpose","Inverse","Determinant","Rank"],
              lessons: [
                { name: "المصفوفة كتحويل خطي: الهندسة والحساب", primary: "matrices as linear transformations" },
                { name: "ضرب المصفوفات: تسلسل التحويلات", primary: "matrix multiplication and composition" },
                { name: "المنقولة Transpose وخصائصها في التعلم الآلي", primary: "matrix transpose and properties" },
                { name: "المعكوس والمحدد Determinant: متى وجد؟", primary: "matrix inverse and determinant" },
                { name: "الرتبة Rank ونظرية Rank-Nullity", primary: "matrix rank and nullity theorem" },
                { name: "المصفوفة القاطرية وتبسيط الحسابات", primary: "diagonal matrices and simplifications" },
                { name: "الأنظمة الخطية: الحل وعدم الحل وتعدده", primary: "linear systems: solution existence and uniqueness" },
                { name: "Gaussian Elimination: الحل المنهجي للأنظمة", primary: "Gaussian elimination algorithm" },
                { name: "تطبيق: تحويلات البيانات بعمليات المصفوفات", primary: "data transformations using matrix operations" }
              ]
            },
            {
              unit_index: 3, code: "1.3.3",
              name: "القيم الذاتية والمتجهات الذاتية",
              goal: "فهم القيم والمتجهات الذاتية كأداة لكشف البنية في البيانات",
              key_concepts: ["Eigenvalues","Eigenvectors","Diagonalization","PCA Math","Spectral Theorem"],
              lessons: [
                { name: "القيم والمتجهات الذاتية: الحدس الهندسي", primary: "eigenvalues and eigenvectors intuition" },
                { name: "حساب القيم الذاتية من المعادلة المميّزة", primary: "eigenvalue calculation from characteristic equation" },
                { name: "التقطير Diagonalization وشروطه", primary: "matrix diagonalization conditions" },
                { name: "القيم الذاتية والمتجهات الذاتية في PCA", primary: "eigendecomposition for PCA" },
                { name: "مبرهنة الطيف Spectral Theorem: مصفوفات متماثلة", primary: "spectral theorem for symmetric matrices" },
                { name: "القيم الفردية SVD: التحليل العام", primary: "singular value decomposition SVD" },
                { name: "SVD في ضغط الصور وأنظمة التوصيات", primary: "SVD applications in compression and recommendation" },
                { name: "تحليل PCA رياضياً: من المصفوفة للمركّبات", primary: "PCA mathematical derivation" },
                { name: "تطبيق: تخفيض الأبعاد بـSVD في Python", primary: "SVD dimensionality reduction implementation" }
              ]
            },
            {
              unit_index: 4, code: "1.3.4",
              name: "التفاضل متعدد المتغيرات",
              goal: "فهم المشتقات كأداة للتحسين في خوارزميات التعلم الآلي",
              key_concepts: ["Partial Derivatives","Gradient","Jacobian","Chain Rule","Directional Derivative"],
              lessons: [
                { name: "المشتقة الجزئية: التغير في اتجاه واحد", primary: "partial derivatives and geometric meaning" },
                { name: "المتجه التدرجي Gradient: اتجاه أسرع زيادة", primary: "gradient vector and steepest ascent" },
                { name: "Jacobian: مصفوفة مشتقات الدوال المتجهية", primary: "Jacobian matrix computation" },
                { name: "Hessian: مصفوفة المشتقات الثانية والتحدب", primary: "Hessian matrix and convexity" },
                { name: "قاعدة السلسلة Chain Rule: العمود الفقري للـBackprop", primary: "chain rule and backpropagation connection" },
                { name: "المشتقة الاتجاهية: التغير في اتجاه مختار", primary: "directional derivative calculation" },
                { name: "نقاط الحرجة والتحسين المحلي والكلي", primary: "critical points local and global optimization" },
                { name: "Lagrange Multipliers: التحسين مع قيود", primary: "Lagrange multipliers for constrained optimization" },
                { name: "تطبيق: إيجاد الحد الأدنى لدالة خسارة بسيطة", primary: "loss function minimization with calculus" }
              ]
            },
            {
              unit_index: 5, code: "1.3.5",
              name: "التحسين ونزول التدرج",
              goal: "إتقان خوارزميات التحسين الأساسية والمتقدمة لتدريب نماذج التعلم الآلي",
              key_concepts: ["Gradient Descent","Learning Rate","SGD","Momentum","Adam"],
              lessons: [
                { name: "نزول التدرج: الفكرة وخطوة التعلم", primary: "gradient descent algorithm and learning rate" },
                { name: "نزول التدرج الدُفعي مقابل التدريجي", primary: "batch vs stochastic gradient descent" },
                { name: "Mini-batch SGD: التوازن بين السرعة والدقة", primary: "mini-batch SGD for neural networks" },
                { name: "Momentum: التسريع والتجاوز", primary: "momentum optimizer mechanics" },
                { name: "AdaGrad وRMSProp: معدلات تعلم تكيّفية", primary: "adaptive learning rate optimizers" },
                { name: "Adam: الجمع بين Momentum وRMSProp", primary: "Adam optimizer derivation and hyperparameters" },
                { name: "جدولة معدل التعلم: التسخين والتبريد", primary: "learning rate scheduling strategies" },
                { name: "التقاط في حد أدنى محلي: الاستراتيجيات العملية", primary: "escaping local minima strategies" },
                { name: "تطبيق: تدريب انحدار خطي من الصفر بنزول التدرج", primary: "linear regression from scratch with gradient descent" }
              ]
            },
            {
              unit_index: 6, code: "1.3.6",
              name: "نظرية التقريب والمعالجة الدالية",
              goal: "فهم الأسس الرياضية للانحدار والتنبؤ كمسائل تقريب",
              key_concepts: ["Least Squares","Normal Equation","Regularization Math","Polynomial Approximation","Kernel Trick"],
              lessons: [
                { name: "المربعات الصغرى: الحل التحليلي للانحدار", primary: "least squares analytical solution" },
                { name: "المعادلة الطبيعية Normal Equation وحدودها", primary: "normal equation derivation and limitations" },
                { name: "التنظيم Regularization: L1 وL2 رياضياً", primary: "L1 L2 regularization mathematical derivation" },
                { name: "Polynomial Features وتقريب الدوال غير الخطية", primary: "polynomial feature expansion" },
                { name: "خدعة النواة Kernel Trick: البعد العالي بكفاءة", primary: "kernel trick for high-dimensional mapping" },
                { name: "Reproducing Kernel Hilbert Space: الخلفية", primary: "RKHS foundations for kernel methods" },
                { name: "Radial Basis Functions: نواة RBF", primary: "RBF kernel Gaussian basis functions" },
                { name: "التحيز والتباين Bias-Variance الرياضي", primary: "bias-variance trade-off mathematical form" },
                { name: "تطبيق: مقارنة الانحدار متعدد الحدود مع Ridge", primary: "polynomial regression vs Ridge comparison" }
              ]
            },
            {
              unit_index: 7, code: "1.3.7",
              name: "تحسين مقيّد ونظرية Convexity",
              goal: "فهم خصائص التحسين المحدب كضمانة للحلول المثلى",
              key_concepts: ["Convex Functions","Convex Sets","KKT Conditions","Duality","Proximal Methods"],
              lessons: [
                { name: "الدوال المحدبة وخصائصها الأساسية", primary: "convex function properties and identification" },
                { name: "المجموعات المحدبة والمجال المحدب", primary: "convex sets and convex domains" },
                { name: "أهمية Convexity في الضمانة على الحد الأدنى الكلي", primary: "convexity guarantee for global minimum" },
                { name: "شروط KKT للتحسين المقيّد", primary: "KKT conditions for constrained optimization" },
                { name: "الثنائية Duality: المسألة الأولية مقابل الثنائية", primary: "Lagrangian duality in optimization" },
                { name: "SVM: التحسين المقيّد عملياً", primary: "SVM as constrained optimization problem" },
                { name: "Proximal Methods: التحسين للدوال غير الملساء", primary: "proximal gradient methods for L1" },
                { name: "التحسين الرتيب Stochastic Convex: ضمانات التقارب", primary: "stochastic convex optimization convergence" },
                { name: "تطبيق: حل مسألة SVM ثنائي يدوياً", primary: "binary SVM optimization by hand and Python" }
              ]
            },
            {
              unit_index: 8, code: "1.3.8",
              name: "الرياضيات العددية للتعلم الآلي",
              goal: "فهم المسائل العددية التي تؤثر على استقرار وأداء خوارزميات التعلم الآلي",
              key_concepts: ["Floating Point","Numerical Stability","Condition Number","Sparse Matrices","Numerical Integration"],
              lessons: [
                { name: "الفاصلة العائمة Float: دقيقة لكن ليست مثالية", primary: "floating point precision in numerical computing" },
                { name: "الاستقرار العددي: ترتيب العمليات يُهم", primary: "numerical stability in machine learning" },
                { name: "رقم الشرط Condition Number: حساسية المصفوفة", primary: "condition number and matrix ill-conditioning" },
                { name: "المصفوفات المتفرقة Sparse: التخزين الكفء", primary: "sparse matrix formats and operations" },
                { name: "التحليل الرقمي لـLU وCholesky", primary: "LU and Cholesky decomposition algorithms" },
                { name: "تكامل عددي: Quadrature وMonte Carlo", primary: "numerical integration methods" },
                { name: "المعادلات التفاضلية العددية في الديناميكيات", primary: "numerical differential equations" },
                { name: "البرمجة الديناميكية كتحسين رياضي", primary: "dynamic programming as optimization" },
                { name: "تطبيق: حل نظام خطي ضخم بكفاءة بـSciPy.sparse", primary: "sparse linear system solution with SciPy" }
              ]
            },
            {
              unit_index: 9, code: "1.3.9",
              name: "مشروع الرياضيات: PCA من الصفر",
              goal: "توحيد كل الرياضيات المكتسبة في مشروع PCA كامل من الأساس",
              key_concepts: ["PCA Implementation","SVD","Explained Variance","Reconstruction","Visualization"],
              lessons: [
                { name: "مراجعة: الجبر الخطي في 30 دقيقة", primary: "linear algebra review for PCA" },
                { name: "تمركز البيانات والتطبيع: الخطوة الأولى", primary: "data centering and normalization for PCA" },
                { name: "حساب مصفوفة التغاير يدوياً وبـNumPy", primary: "covariance matrix computation for PCA" },
                { name: "تحليل القيم الذاتية لمصفوفة التغاير", primary: "eigendecomposition of covariance matrix" },
                { name: "تحديد عدد المركّبات: Explained Variance", primary: "explained variance ratio for component selection" },
                { name: "الإسقاط على المركّبات الرئيسية", primary: "projection onto principal components" },
                { name: "إعادة البناء Reconstruction وقياس الخطأ", primary: "PCA reconstruction and reconstruction error" },
                { name: "PCA بـSVD مقارنةً بطريقة القيم الذاتية", primary: "PCA via SVD vs eigendecomposition" },
                { name: "تطبيق PCA على صور الوجوه: Eigenfaces", primary: "Eigenfaces PCA application on image data" }
              ]
            }
          ]
        },
        {
          stage_index: 4,
          name: "SQL وقواعد البيانات لعلوم البيانات",
          goal: "إتقان SQL كلغة أساسية لاستخراج وتحليل البيانات من مصادرها المباشرة",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.4.1",
              name: "أساسيات SQL للتحليل",
              goal: "كتابة استعلامات SQL احترافية لاستخراج وتصفية وتجميع البيانات",
              key_concepts: ["SELECT","WHERE","GROUP BY","ORDER BY","HAVING"],
              lessons: [
                { name: "SELECT وFROM: الاستعلام الأساسي وفلسفته", primary: "SELECT FROM basics and relational model" },
                { name: "WHERE والشروط: تصفية البيانات بدقة", primary: "WHERE clause and filter conditions" },
                { name: "GROUP BY وHAVING: التجميع والتصفية بعده", primary: "GROUP BY HAVING for aggregation" },
                { name: "ORDER BY والترتيب المتعدد", primary: "ORDER BY with multiple columns" },
                { name: "LIMIT وOFFSET: الصفحات والعيّنات", primary: "LIMIT OFFSET for pagination and sampling" },
                { name: "DISTINCT: القيم الفريدة والتكرار", primary: "DISTINCT for unique values" },
                { name: "دوال التجميع: COUNT وSUM وAVG وMIN وMAX", primary: "aggregate functions in SQL" },
                { name: "CASE WHEN: المنطق الشرطي في SQL", primary: "CASE WHEN for conditional logic" },
                { name: "مشروع: تحليل مجموعة بيانات مبيعات بـSQL", primary: "sales data analysis with SQL" }
              ]
            },
            {
              unit_index: 2, code: "1.4.2",
              name: "الدمج والعلاقات في SQL",
              goal: "دمج جداول متعددة بأنواع الدمج المختلفة لتحليل العلاقات",
              key_concepts: ["INNER JOIN","LEFT JOIN","RIGHT JOIN","FULL OUTER JOIN","Self JOIN"],
              lessons: [
                { name: "INNER JOIN: تقاطع الجدولين", primary: "INNER JOIN mechanics and use cases" },
                { name: "LEFT وRIGHT JOIN: الشمل الجزئي", primary: "LEFT RIGHT JOIN for optional relationships" },
                { name: "FULL OUTER JOIN: الشمل الكامل", primary: "FULL OUTER JOIN for complete union" },
                { name: "Self JOIN: دمج الجدول مع نفسه", primary: "self JOIN for hierarchical data" },
                { name: "Cross JOIN والضرب الديكارتي", primary: "cross JOIN and Cartesian product" },
                { name: "الاستعلامات المتداخلة Subqueries في FROM", primary: "subqueries in FROM clause" },
                { name: "الاستعلامات المرتبطة Correlated Subqueries", primary: "correlated subqueries performance" },
                { name: "دمج أكثر من جدولين: استراتيجيات وأداء", primary: "multi-table joins strategy and performance" },
                { name: "مشروع: تحليل قاعدة بيانات متعددة الجداول", primary: "multi-table database analysis project" }
              ]
            },
            {
              unit_index: 3, code: "1.4.3",
              name: "دوال النافذة Window Functions",
              goal: "إتقان دوال النافذة للتحليل التتابعي والترتيب والمقارنة في SQL",
              key_concepts: ["ROW_NUMBER","RANK","LAG/LEAD","PARTITION BY","FRAME Clause"],
              lessons: [
                { name: "مفهوم النافذة OVER: ما الفرق عن GROUP BY", primary: "OVER clause window function concept" },
                { name: "PARTITION BY: تقسيم البيانات لنوافذ", primary: "PARTITION BY for grouped windows" },
                { name: "ROW_NUMBER وRANK وDENSE_RANK: الترتيب", primary: "ranking functions in SQL" },
                { name: "NTILE: تقسيم البيانات لشرائح متساوية", primary: "NTILE for percentile grouping" },
                { name: "LAG وLEAD: قيم الصفوف السابقة والتالية", primary: "LAG LEAD for previous next row values" },
                { name: "FIRST_VALUE وLAST_VALUE في النافذة", primary: "FIRST_VALUE LAST_VALUE in windows" },
                { name: "FRAME Clause: ROWS BETWEEN وRANGE BETWEEN", primary: "window frame specification" },
                { name: "دوال التجميع كدوال نافذة: SUM وAVG التراكميان", primary: "cumulative aggregates as window functions" },
                { name: "مشروع: تحليل سلوك العملاء بدوال النافذة", primary: "customer behavior analysis with window functions" }
              ]
            },
            {
              unit_index: 4, code: "1.4.4",
              name: "CTEs وSQL المتقدم",
              goal: "كتابة SQL معقد وقابل للقراءة باستخدام CTEs والاستعلامات المتكررة",
              key_concepts: ["CTE","Recursive CTE","UNION","INTERSECT","EXCEPT"],
              lessons: [
                { name: "CTE مع WITH: إعادة هيكلة الاستعلامات المعقدة", primary: "CTE with clause for query readability" },
                { name: "تسلسل CTEs المتعددة: بناء خطوة خطوة", primary: "chained CTEs for complex analytics" },
                { name: "Recursive CTE: التعامل مع البيانات الهرمية", primary: "recursive CTE for hierarchical data" },
                { name: "UNION وUNION ALL: دمج نتائج الاستعلامات", primary: "UNION vs UNION ALL" },
                { name: "INTERSECT وEXCEPT: مجموعات SQL", primary: "INTERSECT and EXCEPT set operations" },
                { name: "PIVOT وUNPIVOT: إعادة تشكيل البيانات", primary: "PIVOT UNPIVOT for data reshaping" },
                { name: "String Functions: معالجة النصوص في SQL", primary: "SQL string manipulation functions" },
                { name: "Date/Time Functions: تحليل الزمن في SQL", primary: "SQL date and time functions" },
                { name: "مشروع: استعلام تحليلي معقد للتقرير الشهري", primary: "complex analytical query for monthly report" }
              ]
            },
            {
              unit_index: 5, code: "1.4.5",
              name: "تحسين أداء SQL",
              goal: "كتابة استعلامات SQL سريعة وفهم خطط التنفيذ وأداء قواعد البيانات",
              key_concepts: ["Query Plan","Index","Execution Time","Partitioning","Query Optimization"],
              lessons: [
                { name: "EXPLAIN وEXPLAIN ANALYZE: قراءة خطة التنفيذ", primary: "EXPLAIN query plan analysis" },
                { name: "الفهارس Indexes: متى تُضيف وكيف تُختار", primary: "database index types and selection" },
                { name: "Composite Indexes ومتى تكون أفضل", primary: "composite index optimization" },
                { name: "Full Table Scan مقابل Index Seek", primary: "full scan vs index seek performance" },
                { name: "تقسيم الجداول Partitioning لتحسين الاستعلام", primary: "table partitioning for query performance" },
                { name: "Materialized Views: التحسين بالتخزين المسبق", primary: "materialized views for performance" },
                { name: "Query Rewriting: كتابة نفس الاستعلام بشكل أسرع", primary: "query rewriting for performance" },
                { name: "Connection Pooling وتحسين الاتصالات", primary: "connection pooling and query performance" },
                { name: "مشروع: تحسين استعلام بطيء في قاعدة بيانات كبيرة", primary: "slow query optimization project" }
              ]
            },
            {
              unit_index: 6, code: "1.4.6",
              name: "Python + SQL: سير العمل المتكامل",
              goal: "دمج Python وSQL في سير عمل تحليل بيانات متكامل وفعّال",
              key_concepts: ["SQLAlchemy","psycopg2","Pandas read_sql","DuckDB","SQLite"],
              lessons: [
                { name: "psycopg2: الاتصال بـPostgreSQL من Python", primary: "psycopg2 PostgreSQL Python connection" },
                { name: "SQLAlchemy: ORM وConnections بطريقة Pythonic", primary: "SQLAlchemy ORM and connection management" },
                { name: "Pandas read_sql وto_sql: التكامل المباشر", primary: "Pandas SQL integration with read_sql and to_sql" },
                { name: "DuckDB: قواعد بيانات تحليلية في Python", primary: "DuckDB for in-process analytical SQL" },
                { name: "SQLite: قواعد بيانات محلية للبروتوتايبات", primary: "SQLite for local prototyping and testing" },
                { name: "تحديث ستريمينج: قراءة جداول ضخمة بـchunksize", primary: "chunked reading for large SQL tables" },
                { name: "كتابة نتائج التحليل إلى قاعدة البيانات", primary: "writing analysis results back to database" },
                { name: "أمان SQL: SQL Injection والمعالجة الآمنة", primary: "SQL injection prevention in Python" },
                { name: "مشروع: أنبوب Python-SQL لتحليل بيانات العملاء", primary: "Python SQL pipeline for customer analytics" }
              ]
            },
            {
              unit_index: 7, code: "1.4.7",
              name: "قواعد البيانات NoSQL لعالم البيانات",
              goal: "فهم متى وكيف تُستخدم قواعد البيانات NoSQL في مشاريع البيانات",
              key_concepts: ["MongoDB","Redis","Cassandra","Document Model","Key-Value"],
              lessons: [
                { name: "NoSQL مقابل SQL: متى تختار ماذا", primary: "NoSQL vs SQL choice for data science" },
                { name: "MongoDB: قاعدة بيانات الوثائق والاستعلام", primary: "MongoDB document model and PyMongo" },
                { name: "استعلامات MongoDB: $match وAggregation Pipeline", primary: "MongoDB aggregation pipeline" },
                { name: "Redis: التخزين المؤقت والبيانات الفورية", primary: "Redis caching and real-time data" },
                { name: "Cassandra: قواعد البيانات الموزعة للكتابة الضخمة", primary: "Cassandra for high-write distributed systems" },
                { name: "ElasticSearch: البحث والتحليل النصي", primary: "Elasticsearch for text search analytics" },
                { name: "InfluxDB: قواعد البيانات الزمنية", primary: "InfluxDB for time series data" },
                { name: "Neo4j: قواعد البيانات الرسومية للعلاقات", primary: "Neo4j graph database for relationship data" },
                { name: "مشروع: تصميم نظام تخزين مناسب لتطبيق بيانات", primary: "database selection for data application" }
              ]
            },
            {
              unit_index: 8, code: "1.4.8",
              name: "نمذجة البيانات والـData Warehouse",
              goal: "تصميم نماذج بيانات فعّالة للتحليل والتقارير في مستودعات البيانات",
              key_concepts: ["Star Schema","Snowflake Schema","Dimension Tables","Fact Tables","Slowly Changing Dimensions"],
              lessons: [
                { name: "نموذج النجمة Star Schema: الأساس التحليلي", primary: "star schema design for analytics" },
                { name: "نموذج الثلج Snowflake Schema: التطبيع والتحليل", primary: "snowflake schema normalization trade-offs" },
                { name: "جداول الحقائق والأبعاد: التمييز والتصميم", primary: "fact and dimension table design" },
                { name: "Slowly Changing Dimensions: تتبع تغيّر البيانات", primary: "SCD types for historical tracking" },
                { name: "Data Vault: النمذجة للمستودعات الكبيرة", primary: "Data Vault modeling for large warehouses" },
                { name: "Wide Tables مقابل Normalized Tables: الأداء", primary: "wide vs normalized tables performance" },
                { name: "Kimball مقابل Inmon: فلسفتا تصميم الـDW", primary: "Kimball vs Inmon methodology comparison" },
                { name: "تصميم قاعدة بيانات للتحليل اليمني", primary: "analytical database design case study" },
                { name: "مشروع: تصميم Data Warehouse لشركة تجارة إلكترونية", primary: "e-commerce data warehouse design" }
              ]
            },
            {
              unit_index: 9, code: "1.4.9",
              name: "SQL في بيئات تحليلية متقدمة",
              goal: "استخدام SQL في بيئات BigQuery وSnowflake وRedshift ومحاكاته محلياً",
              key_concepts: ["BigQuery SQL","Snowflake SQL","Columnar Storage","Array Functions","UNNEST"],
              lessons: [
                { name: "BigQuery SQL: التحليل الضخم على Google Cloud", primary: "BigQuery SQL syntax and optimization" },
                { name: "Snowflake SQL: مستودع البيانات المدار", primary: "Snowflake SQL features and semi-structured data" },
                { name: "Redshift SQL: مستودع بيانات Amazon", primary: "Redshift SQL and columnar optimization" },
                { name: "UNNEST والمصفوفات: بيانات متداخلة في SQL", primary: "UNNEST for array data in analytical SQL" },
                { name: "JSON في SQL: استعلام البيانات شبه المنظمة", primary: "JSON operations in SQL analytics" },
                { name: "دوال SQL للـWindow المتقدمة في BigQuery", primary: "advanced window functions in BigQuery" },
                { name: "تكلفة الاستعلامات في السحابة: الأمثلة الحقيقية", primary: "cloud query cost optimization" },
                { name: "DuckDB كبديل محلي لاختبار Analytical SQL", primary: "DuckDB for local BigQuery query testing" },
                { name: "مشروع: تحليل بيانات ضخمة بـBigQuery", primary: "large-scale data analysis with BigQuery" }
              ]
            }
          ]
        },
        {
          stage_index: 5,
          name: "استكشاف البيانات وتنظيفها",
          goal: "إتقان التحليل الاستكشافي وتنظيف البيانات كأهم مرحلة في أي مشروع بيانات ناجح",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.5.1",
              name: "التحليل الاستكشافي المنهجي EDA",
              goal: "اكتساب نهج منهجي ومنظّم للتحليل الاستكشافي قبل أي نمذجة",
              key_concepts: ["EDA Framework","Univariate Analysis","Bivariate Analysis","Data Profiling","Summary Statistics"],
              lessons: [
                { name: "EDA: الفلسفة والنهج وما قبل النمذجة", primary: "EDA philosophy and systematic approach" },
                { name: "التحليل الأحادي: توزيع كل متغير على حدة", primary: "univariate analysis for all variable types" },
                { name: "التحليل الثنائي: العلاقات بين متغيرين", primary: "bivariate analysis and relationship detection" },
                { name: "التوصيف الآلي: pandas-profiling وydata-profiling", primary: "automated data profiling tools" },
                { name: "المصفوفة الارتباطية: الصورة الكاملة", primary: "correlation matrix visualization" },
                { name: "الإحصاء الموجز: ما الذي يخبرك بما لا تعرف؟", primary: "summary statistics interpretation" },
                { name: "التحقق من جودة البيانات: نقاط المراجعة الأساسية", primary: "data quality checks and validation" },
                { name: "EDA للبيانات الزمنية: أنماط خاصة", primary: "EDA for time series data" },
                { name: "مشروع: EDA شامل على مجموعة بيانات يمنية", primary: "comprehensive EDA on real dataset" }
              ]
            },
            {
              unit_index: 2, code: "1.5.2",
              name: "القيم المفقودة: الاستراتيجيات والمعالجة",
              goal: "التعامل مع القيم المفقودة بفهم عميق لأنواعها وآثار كل إستراتيجية معالجة",
              key_concepts: ["MCAR/MAR/MNAR","Simple Imputation","Multiple Imputation","Indicator Variables","KNN Imputation"],
              lessons: [
                { name: "أنواع القيم المفقودة: MCAR وMAR وMNAR", primary: "missing data mechanisms MCAR MAR MNAR" },
                { name: "الإحلال البسيط: الوسط والوسيط والمنوال", primary: "simple mean median mode imputation" },
                { name: "الإحلال الخطي المتقدم: Regression Imputation", primary: "regression imputation for missing values" },
                { name: "KNN Imputation: الإحلال بالجيران الأقربين", primary: "KNN imputation implementation" },
                { name: "Iterative Imputer: IterativeImputer بـsklearn", primary: "sklearn IterativeImputer for complex patterns" },
                { name: "Multiple Imputation: التعامل مع عدم اليقين", primary: "multiple imputation MICE algorithm" },
                { name: "متغير المؤشر: الإشارة إلى أن القيمة كانت مفقودة", primary: "missing indicator variable technique" },
                { name: "الحذف: متى يكون الحذف هو الخيار الأفضل", primary: "listwise and pairwise deletion criteria" },
                { name: "مشروع: معالجة بيانات طبية كثيفة القيم المفقودة", primary: "missing value treatment for medical data" }
              ]
            },
            {
              unit_index: 3, code: "1.5.3",
              name: "القيم الشاذة: الكشف والمعالجة",
              goal: "اكتشاف القيم الشاذة وتقييم تأثيرها واتخاذ القرار المناسب لكل حالة",
              key_concepts: ["Z-Score","IQR Method","Isolation Forest","LOF","DBSCAN"],
              lessons: [
                { name: "القيمة الشاذة: مشكلة أم معلومة ثمينة؟", primary: "outliers as errors vs valuable signals" },
                { name: "طريقة Z-Score: الشواذ بالانحراف المعياري", primary: "Z-score outlier detection" },
                { name: "طريقة IQR: الصندوق الرباعي للكشف عن الشواذ", primary: "IQR method for outlier detection" },
                { name: "Isolation Forest: الشذوذ بالعزل العشوائي", primary: "Isolation Forest anomaly detection" },
                { name: "Local Outlier Factor LOF: الشذوذ المحلي", primary: "LOF algorithm for local outlier detection" },
                { name: "DBSCAN: الكشف عن الشواذ بالتجميع", primary: "DBSCAN for cluster-based outlier detection" },
                { name: "Winsorizing والتقليم: ترويض القيم المتطرفة", primary: "winsorizing and trimming outlier treatment" },
                { name: "الشواذ في البيانات المتعددة الأبعاد", primary: "multivariate outlier detection methods" },
                { name: "مشروع: نظام كشف الاحتيال بتحديد الشواذ", primary: "fraud detection with outlier detection" }
              ]
            },
            {
              unit_index: 4, code: "1.5.4",
              name: "تنظيف البيانات النصية",
              goal: "تنظيف البيانات النصية العربية والإنجليزية وتهيئتها للتحليل والنمذجة",
              key_concepts: ["String Cleaning","Regex","Normalization","Encoding","Text Standardization"],
              lessons: [
                { name: "التنظيف الأساسي: trim وstrip وcase", primary: "basic text cleaning strip and case normalization" },
                { name: "Regular Expressions: القوة الحقيقية لتنظيف النص", primary: "regex for text cleaning in data science" },
                { name: "ترميز النص Encoding: UTF-8 وWindows-1256", primary: "text encoding issues and fixes" },
                { name: "تطبيع النص العربي: التشكيل والتمديد والهمزة", primary: "Arabic text normalization" },
                { name: "استخراج الكيانات: التواريخ والأرقام والعناوين", primary: "entity extraction from text data" },
                { name: "توحيد الفئات: 50 طريقة لكتابة نفس الشيء", primary: "category standardization and fuzzy matching" },
                { name: "Fuzzy Matching: دمج السجلات المتشابهة غير المطابقة", primary: "fuzzy string matching for record linkage" },
                { name: "التحليل اللغوي الأساسي: Tokenization وStemming", primary: "tokenization and stemming for analytics" },
                { name: "مشروع: تنظيف مجموعة تعليقات عربية من الويب", primary: "Arabic social media text cleaning project" }
              ]
            },
            {
              unit_index: 5, code: "1.5.5",
              name: "تحويلات البيانات والتطبيع",
              goal: "تطبيق التحويلات المناسبة لكل نوع بيانات لتهيئتها للنمذجة",
              key_concepts: ["Log Transform","Box-Cox","MinMaxScaler","StandardScaler","Power Transform"],
              lessons: [
                { name: "التطبيع StandardScaler: الوسط صفر والتباين واحد", primary: "standard scaling z-score normalization" },
                { name: "التقييس MinMaxScaler: الضغط لنطاق محدد", primary: "MinMax scaling for bounded normalization" },
                { name: "التحويل اللوغاريثمي: ترويض التوزيعات المنحرفة", primary: "log transform for skewed distributions" },
                { name: "Box-Cox وYeo-Johnson: التطبيع المرن", primary: "Box-Cox and Yeo-Johnson transforms" },
                { name: "Quantile Transform: التوحيد بالترتيب", primary: "quantile transform for distribution matching" },
                { name: "RobustScaler: التطبيع المقاوم للشواذ", primary: "robust scaling using IQR" },
                { name: "تشفير المتغيرات الفئوية: دليل الاختيار", primary: "categorical encoding selection guide" },
                { name: "Ordinal Encoding وLabel Encoding وOHE", primary: "ordinal label one-hot encoding comparison" },
                { name: "مشروع: pipeline تحويل بيانات متكامل بـsklearn", primary: "sklearn Pipeline for data transformation" }
              ]
            },
            {
              unit_index: 6, code: "1.5.6",
              name: "دمج البيانات من مصادر متعددة",
              goal: "دمج البيانات من مصادر متنوعة مع الحفاظ على الجودة والاتساق",
              key_concepts: ["Record Linkage","Entity Resolution","Schema Mapping","Data Integration","Deduplication"],
              lessons: [
                { name: "دمج المفاتيح الدقيقة: Exact Match Join", primary: "exact match joins for data integration" },
                { name: "Fuzzy Join: دمج السجلات غير المتطابقة تماماً", primary: "fuzzy join for approximate record matching" },
                { name: "Entity Resolution: هل هذا نفس الشخص؟", primary: "entity resolution for deduplication" },
                { name: "Schema Mapping: توحيد المخططات المختلفة", primary: "schema mapping for heterogeneous sources" },
                { name: "معالجة تضارب البيانات من مصادر متعددة", primary: "data conflict resolution strategies" },
                { name: "Data Lineage: تتبع أصل البيانات", primary: "data lineage tracking" },
                { name: "السجلات المكررة: الكشف والمعالجة", primary: "duplicate record detection and deduplication" },
                { name: "إجراء التكامل عبر واجهات API متعددة", primary: "multi-API data integration patterns" },
                { name: "مشروع: دمج بيانات من 3 مصادر مختلفة", primary: "three-source data integration project" }
              ]
            },
            {
              unit_index: 7, code: "1.5.7",
              name: "البيانات غير المتوازنة",
              goal: "التعامل مع مشكلة عدم التوازن في الفئات والحفاظ على جودة النموذج",
              key_concepts: ["Class Imbalance","SMOTE","Undersampling","Cost-Sensitive","Evaluation Metrics"],
              lessons: [
                { name: "مشكلة عدم التوازن: الفخ الذي يتجاهله المبتدئ", primary: "class imbalance problem and impact" },
                { name: "Oversampling الأساسي: تكرار العيّنات النادرة", primary: "random oversampling for class imbalance" },
                { name: "SMOTE: إنشاء عيّنات اصطناعية ذكية", primary: "SMOTE synthetic oversampling" },
                { name: "ADASYN: التكيّف مع صعوبة العيّنات", primary: "ADASYN adaptive synthetic sampling" },
                { name: "Undersampling: تقليل الأغلبية بذكاء", primary: "undersampling techniques for imbalance" },
                { name: "Class Weights: التعلم مع ترجيح التكاليف", primary: "class weights in model training" },
                { name: "Threshold Adjustment: ضبط حد القرار", primary: "classification threshold adjustment" },
                { name: "مقاييس التقييم الصحيحة: F1 وPR-AUC", primary: "imbalanced data evaluation metrics" },
                { name: "مشروع: نموذج كشف احتيال على بيانات غير متوازنة", primary: "fraud detection with imbalanced data" }
              ]
            },
            {
              unit_index: 8, code: "1.5.8",
              name: "التحقق من جودة البيانات وحوكمتها",
              goal: "إنشاء إطار متكامل لضمان جودة البيانات واستمراريتها",
              key_concepts: ["Data Quality Dimensions","Great Expectations","Schema Validation","Data Contracts","Monitoring"],
              lessons: [
                { name: "أبعاد جودة البيانات: الدقة والاكتمال والاتساق", primary: "data quality dimensions framework" },
                { name: "Great Expectations: اختبارات جودة بيانات آلية", primary: "Great Expectations for automated data testing" },
                { name: "Schema Validation بـPydantic وpandera", primary: "schema validation with Pydantic and pandera" },
                { name: "Data Contracts: اتفاقيات جودة بين الفرق", primary: "data contracts for team agreements" },
                { name: "مراقبة انجراف البيانات Data Drift", primary: "data drift monitoring and detection" },
                { name: "إنذار انجراف التوزيع: متى يتغير البيانات؟", primary: "distribution drift alerts" },
                { name: "توثيق البيانات: Data Dictionary وMetadata", primary: "data dictionary and metadata management" },
                { name: "حوكمة البيانات Data Governance في الفرق", primary: "data governance frameworks for teams" },
                { name: "مشروع: إطار جودة بيانات لمجموعة بيانات حقيقية", primary: "data quality framework implementation" }
              ]
            },
            {
              unit_index: 9, code: "1.5.9",
              name: "أنابيب المعالجة المسبقة مع Scikit-Learn",
              goal: "بناء أنابيب معالجة مسبقة قابلة للاستنساخ والنشر بـsklearn",
              key_concepts: ["Pipeline","ColumnTransformer","Custom Transformer","FunctionTransformer","Joblib"],
              lessons: [
                { name: "sklearn Pipeline: ربط الخطوات بكفاءة", primary: "sklearn Pipeline chaining transformers" },
                { name: "ColumnTransformer: معالجات مختلفة لأعمدة مختلفة", primary: "ColumnTransformer for mixed data types" },
                { name: "Custom Transformer: بناء خطوة معالجة مخصصة", primary: "custom sklearn transformer creation" },
                { name: "FunctionTransformer: تحويل دالة عادية لخطوة Pipeline", primary: "FunctionTransformer for arbitrary functions" },
                { name: "حفظ Pipeline بـJoblib وpickle", primary: "Pipeline serialization with Joblib" },
                { name: "اختبار Pipeline: التحقق من كل خطوة", primary: "Pipeline testing and validation" },
                { name: "Pipeline مع Cross-Validation: التقييم الصحيح", primary: "Pipeline with cross-validation" },
                { name: "FeatureUnion: دمج عدة أنابيب", primary: "FeatureUnion for parallel pipelines" },
                { name: "مشروع: Pipeline معالجة كامل من البيانات الخام للنموذج", primary: "end-to-end preprocessing pipeline project" }
              ]
            }
          ]
        },
        {
          stage_index: 6,
          name: "تصوير البيانات والتواصل البصري",
          goal: "إتقان تصوير البيانات كأداة تحليلية وتواصلية لإيصال الرؤى بأكبر تأثير",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 40 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 20 },
          units: [
            {
              unit_index: 1, code: "1.6.1",
              name: "Matplotlib: الأساس والتحكم الكامل",
              goal: "إتقان Matplotlib كطبقة أساسية لكل مكتبات التصوير",
              key_concepts: ["Figure/Axes","Plot Types","Subplots","Styling","Annotations"],
              lessons: [
                { name: "Figure وAxes: هيكل Matplotlib المعماري", primary: "matplotlib Figure Axes architecture" },
                { name: "Plot أساسي: خطوط ونقاط وأشرطة", primary: "matplotlib basic plot types" },
                { name: "Subplots: رسوم متعددة في شبكة", primary: "matplotlib subplots and GridSpec" },
                { name: "التصميم والألوان وخطوط الشكل", primary: "matplotlib styling and color maps" },
                { name: "Annotations وText: إضافة السياق للرسم", primary: "matplotlib annotations and text" },
                { name: "Scatter وBubble: البيانات ثنائية الأبعاد", primary: "scatter and bubble plots" },
                { name: "الرسوم الثلاثية الأبعاد 3D بـmplot3d", primary: "3D plots with mplot3d" },
                { name: "حفظ الرسوم: SVG وPDF والدقة العالية", primary: "matplotlib figure export and resolution" },
                { name: "مشروع: لوحة تحليلية بـMatplotlib من بيانات حقيقية", primary: "analytical dashboard with Matplotlib" }
              ]
            },
            {
              unit_index: 2, code: "1.6.2",
              name: "Seaborn: الإحصاء البصري",
              goal: "استخدام Seaborn لتصوير التوزيعات والعلاقات الإحصائية",
              key_concepts: ["distplot","pairplot","heatmap","violinplot","FacetGrid"],
              lessons: [
                { name: "Seaborn فوق Matplotlib: علاقة التكامل", primary: "Seaborn matplotlib relationship and setup" },
                { name: "التوزيعات: histplot وkdeplot وecdfplot", primary: "Seaborn distribution plots" },
                { name: "العلاقات: scatterplot وlineplot وregplot", primary: "Seaborn relationship plots" },
                { name: "الفئات: boxplot وviolinplot وstripplot", primary: "Seaborn categorical plots" },
                { name: "pairplot وPairGrid: مصفوفة العلاقات الكاملة", primary: "pairplot for multivariate exploration" },
                { name: "heatmap: التصوير الحراري للارتباطات", primary: "Seaborn heatmap for correlation visualization" },
                { name: "FacetGrid: تصوير منقسم على فئات متعددة", primary: "FacetGrid for multi-facet visualization" },
                { name: "تخصيص Seaborn: الثيمات والألوان", primary: "Seaborn themes and color palettes" },
                { name: "مشروع: تحليل إحصائي بصري لبيانات التعليم", primary: "statistical visualization of education data" }
              ]
            },
            {
              unit_index: 3, code: "1.6.3",
              name: "Plotly: التصوير التفاعلي",
              goal: "إنشاء تصورات تفاعلية للتقارير والداشبورد بـPlotly",
              key_concepts: ["plotly.express","go.Figure","Hover","Animation","Dash Basics"],
              lessons: [
                { name: "plotly.express: API عالي المستوى للسرعة", primary: "plotly express high-level API" },
                { name: "plotly.graph_objects: التحكم الكامل", primary: "plotly graph_objects detailed control" },
                { name: "Hover والـTooltip: معلومات عند المرور", primary: "plotly hover customization" },
                { name: "الحركة Animation: تصوير التطور عبر الزمن", primary: "plotly animation for time series" },
                { name: "الخرائط: Choropleth وScatter Map", primary: "plotly choropleth and scatter maps" },
                { name: "3D Scatter وSurface: البيانات ثلاثية الأبعاد", primary: "plotly 3D visualizations" },
                { name: "تنسيق Plotly للتقارير والتصدير", primary: "plotly export and report formatting" },
                { name: "Dash مقدمة: لوحات تحكم تفاعلية بـPython", primary: "Dash introduction for interactive dashboards" },
                { name: "مشروع: لوحة تفاعلية لبيانات الأسواق المالية", primary: "interactive financial dashboard with Plotly" }
              ]
            },
            {
              unit_index: 4, code: "1.6.4",
              name: "تصوير البيانات الجغرافية",
              goal: "تصوير البيانات المكانية والجغرافية لاستخلاص رؤى مرتبطة بالموقع",
              key_concepts: ["GeoPandas","Folium","Choropleth","Point Maps","Spatial Analysis"],
              lessons: [
                { name: "GeoPandas: الجمع بين Pandas والبيانات المكانية", primary: "GeoPandas for spatial data analysis" },
                { name: "Folium: خرائط تفاعلية مبنية على Leaflet", primary: "Folium interactive maps" },
                { name: "Choropleth Maps: تلوين المناطق بالبيانات", primary: "choropleth maps for regional data" },
                { name: "Heat Maps الجغرافية: كثافة النقاط", primary: "geographic heatmaps for density" },
                { name: "Marker Clusters: تجميع آلاف النقاط", primary: "marker clustering for large datasets" },
                { name: "الطبقات المكانية Layers والتصفية", primary: "layer-based geographic visualization" },
                { name: "Shapefile وGeoJSON: تنسيقات البيانات المكانية", primary: "shapefile and GeoJSON for maps" },
                { name: "Kepler.gl وDeck.gl: التصوير المكاني الضخم", primary: "large-scale spatial visualization tools" },
                { name: "مشروع: خريطة بيانات اليمن التفاعلية", primary: "interactive Yemen data map project" }
              ]
            },
            {
              unit_index: 5, code: "1.6.5",
              name: "تصوير سلاسل الوقت",
              goal: "تصوير البيانات الزمنية بأساليب تبرز الأنماط والاتجاهات والموسمية",
              key_concepts: ["Time Series Plot","Seasonality Visualization","Rolling Statistics","Event Annotation","Candlestick"],
              lessons: [
                { name: "الرسم الخطي الزمني: الخيارات والإعدادات", primary: "time series line plot configuration" },
                { name: "تصوير الموسمية: Decomposition plots", primary: "seasonal decomposition visualization" },
                { name: "Rolling Statistics: المتوسطات المتحركة بصرياً", primary: "rolling statistics visualization" },
                { name: "تمييز الأحداث: Annotations على سلاسل الوقت", primary: "event annotation on time series" },
                { name: "Candlestick وOHLC: البيانات المالية", primary: "candlestick charts for financial data" },
                { name: "Heatmap الزمني: الأنماط الأسبوعية والشهرية", primary: "calendar heatmap for temporal patterns" },
                { name: "تصوير مقارنة سلاسل متعددة الزمن", primary: "multi-series time series comparison" },
                { name: "Prophet وتصوير التنبؤات مع فترات الثقة", primary: "forecast visualization with confidence bands" },
                { name: "مشروع: لوحة مراقبة بيانات زمنية اقتصادية", primary: "economic time series monitoring dashboard" }
              ]
            },
            {
              unit_index: 6, code: "1.6.6",
              name: "تصميم التصوير وقصص البيانات",
              goal: "تصميم رسوم بيانية تقنع وتوضّح وتُحكي قصة في آنٍ واحد",
              key_concepts: ["Data Storytelling","Chart Selection","Visual Hierarchy","Color Theory","Accessibility"],
              lessons: [
                { name: "مبادئ تصميم البيانات: وضوح فوق تعقيد", primary: "data visualization design principles" },
                { name: "دليل اختيار نوع الرسم: متى تختار ماذا؟", primary: "chart type selection guide" },
                { name: "نظرية اللون في تصوير البيانات", primary: "color theory for data visualization" },
                { name: "السلم البصري: توجيه عين المشاهد", primary: "visual hierarchy in data design" },
                { name: "قصة البيانات: بناء السرد الخطي", primary: "data storytelling narrative structure" },
                { name: "إمكانية الوصول: ألوان للعمى اللوني", primary: "accessibility and color blindness in dataviz" },
                { name: "Decluttering: حذف ما لا يخدم الرسالة", primary: "chart decluttering and simplification" },
                { name: "عرض النتائج: من Jupyter إلى PowerPoint", primary: "presentation design for data results" },
                { name: "مشروع: تقرير بصري قصصي لمشروع تحليل", primary: "visual storytelling report for analysis" }
              ]
            },
            {
              unit_index: 7, code: "1.6.7",
              name: "الداشبورد التحليلي",
              goal: "بناء داشبوردات تحليلية تفاعلية للتقارير العملياتية",
              key_concepts: ["Dash","Streamlit","Panel","Callback","KPI Cards"],
              lessons: [
                { name: "Streamlit: داشبورد تحليلي بـPython بسرعة", primary: "Streamlit for rapid analytical dashboard" },
                { name: "Streamlit Session State وInteractivity", primary: "Streamlit session state and user input" },
                { name: "Dash: داشبوردات مؤسسية كاملة الوظائف", primary: "Dash enterprise dashboards" },
                { name: "Dash Callbacks: التفاعل والتحديث الديناميكي", primary: "Dash callbacks for dynamic updates" },
                { name: "بطاقات KPI: العرض الفوري لأهم المؤشرات", primary: "KPI cards and summary metrics" },
                { name: "Filters والـDropdowns والتاريخ في الداشبورد", primary: "dashboard filters and controls" },
                { name: "Panel وHoloViz: داشبوردات علمية", primary: "Panel and HoloViz for scientific dashboards" },
                { name: "نشر الداشبورد: Heroku وStreamlit Cloud وHugging Face", primary: "dashboard deployment options" },
                { name: "مشروع: داشبورد كامل لمتابعة مبيعات شركة", primary: "complete sales monitoring dashboard" }
              ]
            },
            {
              unit_index: 8, code: "1.6.8",
              name: "التصوير لشبكات وبيانات العلاقات",
              goal: "تصوير الشبكات والعلاقات وتحليلها بصرياً",
              key_concepts: ["NetworkX","Gephi","Graph Layouts","Centrality Visualization","Network Metrics"],
              lessons: [
                { name: "NetworkX: بناء الشبكات وتصويرها بـPython", primary: "NetworkX graph creation and visualization" },
                { name: "تخطيطات الشبكة: Force-directed وCircular", primary: "network layout algorithms" },
                { name: "تصوير المركزية: من هو الأهم في الشبكة؟", primary: "centrality visualization in networks" },
                { name: "Gephi: تصوير الشبكات الضخمة", primary: "Gephi for large network visualization" },
                { name: "Chord Diagrams: تصوير التدفق بين الكيانات", primary: "chord diagrams for flow visualization" },
                { name: "Sankey Diagrams: تدفق الكميات والتحويلات", primary: "Sankey diagrams for flow analysis" },
                { name: "Treemaps وSunburst: البيانات الهرمية", primary: "treemaps and sunburst for hierarchical data" },
                { name: "شبكات وسائل التواصل الاجتماعي: تحليل وتصوير", primary: "social network analysis and visualization" },
                { name: "مشروع: تحليل شبكة علاقات في مجتمع رقمي", primary: "social network analysis project" }
              ]
            },
            {
              unit_index: 9, code: "1.6.9",
              name: "تصوير نتائج النماذج والـML",
              goal: "تصوير أداء نماذج التعلم الآلي ونتائجها بصرياً لتسهيل التفسير",
              key_concepts: ["Confusion Matrix","ROC/AUC","Learning Curves","Feature Importance","Residual Plots"],
              lessons: [
                { name: "مصفوفة الارتباك Confusion Matrix: القراءة الصحيحة", primary: "confusion matrix visualization and interpretation" },
                { name: "ROC Curve وAUC: أداء التصنيف بصرياً", primary: "ROC AUC curve visualization" },
                { name: "Precision-Recall Curve: للبيانات غير المتوازنة", primary: "precision-recall curve for imbalanced data" },
                { name: "Learning Curves: التشخيص من منحنى التعلم", primary: "learning curves for overfitting diagnosis" },
                { name: "أهمية الميزات: Feature Importance البصرية", primary: "feature importance visualization" },
                { name: "Partial Dependence Plots: تأثير ميزة واحدة", primary: "partial dependence plots PDP" },
                { name: "Residual Plots: تشخيص نموذج الانحدار", primary: "residual plots for regression diagnostics" },
                { name: "SHAP Values: تفسير النموذج بصرياً", primary: "SHAP values visualization and interpretation" },
                { name: "مشروع: تقرير أداء نموذج تصنيف شامل", primary: "comprehensive model performance report" }
              ]
            }
          ]
        },
        {
          stage_index: 7,
          name: "مدخل التعلم الآلي",
          goal: "بناء أول نماذج تعلم آلي حقيقية مع فهم عميق للمفاهيم قبل المكتبات",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.7.1",
              name: "فلسفة التعلم الآلي والأطر العامة",
              goal: "بناء إطار تفكير صحيح لفهم ما يُتعلّم وكيف وما الضمانات",
              key_concepts: ["Supervised vs Unsupervised","Overfitting","Bias-Variance","No Free Lunch","Generalization"],
              lessons: [
                { name: "ما هو التعلم الآلي: السؤال الفلسفي الصحيح", primary: "machine learning philosophical definition" },
                { name: "التعلم الخاضع للإشراف مقابل غير الخاضع", primary: "supervised vs unsupervised vs reinforcement" },
                { name: "Overfitting وUnderfitting: تشخيص النموذج", primary: "overfitting underfitting diagnosis" },
                { name: "مبادلة التحيز-التباين Bias-Variance", primary: "bias-variance trade-off intuition" },
                { name: "No Free Lunch Theorem: لا خوارزمية مثالية", primary: "no free lunch theorem implications" },
                { name: "التعميم Generalization: الهدف الحقيقي للنموذج", primary: "model generalization goal" },
                { name: "بيانات التدريب والتحقق والاختبار: الفصل الصارم", primary: "train validation test split strategy" },
                { name: "تسرّب البيانات Data Leakage: الفخ الأخطر", primary: "data leakage detection and prevention" },
                { name: "مشروع: بناء أول نموذج تصنيف وفهمه كاملاً", primary: "first classification model end-to-end" }
              ]
            },
            {
              unit_index: 2, code: "1.7.2",
              name: "الانحدار الخطي: العمق الحقيقي",
              goal: "إتقان الانحدار الخطي من المعادلة إلى التفسير إلى التشخيص",
              key_concepts: ["OLS","Assumptions","Diagnostics","Ridge","Lasso"],
              lessons: [
                { name: "الانحدار الخطي البسيط: من الخط إلى الفهم", primary: "simple linear regression deep dive" },
                { name: "الانحدار الخطي المتعدد: التفسير الصحيح", primary: "multiple linear regression interpretation" },
                { name: "افتراضيات الانحدار: التحقق والمعالجة", primary: "linear regression assumptions verification" },
                { name: "Regularization في الانحدار: Ridge وLasso وElasticNet", primary: "Ridge Lasso ElasticNet regression" },
                { name: "تشخيص الانحدار: هل نموذجك سليم؟", primary: "regression diagnostics and residual analysis" },
                { name: "الانحدار متعدد الحدود: توسيع الخطية", primary: "polynomial regression for non-linear data" },
                { name: "Stepwise Selection: اختيار المتغيرات التلقائي", primary: "stepwise feature selection in regression" },
                { name: "تفسير معاملات الانحدار: الدلالة والحجم", primary: "regression coefficient interpretation" },
                { name: "مشروع: نموذج تنبؤ أسعار العقارات بالانحدار", primary: "house price prediction with linear regression" }
              ]
            },
            {
              unit_index: 3, code: "1.7.3",
              name: "الانحدار اللوجستي والتصنيف",
              goal: "إتقان الانحدار اللوجستي كأساس لنماذج التصنيف الاحتمالية",
              key_concepts: ["Sigmoid","Log-Loss","Decision Boundary","Multiclass","Calibration"],
              lessons: [
                { name: "دالة Sigmoid: من الانحدار للاحتمالية", primary: "sigmoid function and probability output" },
                { name: "دالة الخسارة Log-Loss: لماذا هي؟", primary: "log-loss derivation and optimization" },
                { name: "حدود القرار Decision Boundary: هندسة التصنيف", primary: "decision boundary visualization" },
                { name: "Regularization في الانحدار اللوجستي", primary: "logistic regression regularization" },
                { name: "التصنيف متعدد الفئات: OvR وSoftmax", primary: "multiclass logistic regression strategies" },
                { name: "معايرة النموذج Calibration: هل يعكس الاحتمال الحقيقة؟", primary: "probability calibration for classifiers" },
                { name: "حدود الانحدار اللوجستي ومتى يُستبدل", primary: "logistic regression limitations" },
                { name: "تفسير الانحدار اللوجستي: الـOdds Ratio", primary: "odds ratio interpretation in logistic regression" },
                { name: "مشروع: نموذج كشف الرسائل الاحتيالية", primary: "spam detection with logistic regression" }
              ]
            },
            {
              unit_index: 4, code: "1.7.4",
              name: "K-NN وأشجار القرار",
              goal: "فهم أبسط الخوارزميات وتطبيقها وفهم حدودها",
              key_concepts: ["KNN Distance","Decision Tree Splitting","Pruning","Depth","Interpretability"],
              lessons: [
                { name: "K-NN: الخوارزمية البسيطة والمقاييس", primary: "K-NN algorithm and distance metrics" },
                { name: "اختيار K في K-NN: Elbow Method", primary: "K selection in KNN" },
                { name: "K-NN مشاكل: الأبعاد العالية والتوسع", primary: "KNN curse of dimensionality" },
                { name: "شجرة القرار: الإنشاء والتشعّب والنهايات", primary: "decision tree construction and splitting" },
                { name: "Information Gain وGini: معيار التشعّب", primary: "information gain and Gini for splitting" },
                { name: "تقليم الشجرة Pruning: منع الحفظ", primary: "decision tree pruning strategies" },
                { name: "قراءة شجرة القرار وتفسيرها للمديرين", primary: "decision tree visualization and interpretation" },
                { name: "حدود أشجار القرار: الضجيج والتباين", primary: "decision tree instability problem" },
                { name: "مشروع: تصنيف بيانات طبية بشجرة قرار مفسَّرة", primary: "medical classification with interpretable tree" }
              ]
            },
            {
              unit_index: 5, code: "1.7.5",
              name: "SVM ونماذج الهامش",
              goal: "فهم SVM كمحسّن هندسي وتطبيقه على البيانات الخطية وغير الخطية",
              key_concepts: ["Support Vectors","Margin","Kernel SVM","C Parameter","SVR"],
              lessons: [
                { name: "SVM: الهامش الأقصى والمتجهات الداعمة", primary: "SVM maximum margin and support vectors" },
                { name: "Soft Margin وثابت C: السماح بالأخطاء", primary: "soft margin SVM and C parameter" },
                { name: "Kernel SVM: البيانات غير الخطية", primary: "kernel SVM for non-linear classification" },
                { name: "Kernel RBF وPolynomial وSigmoid: الاختيار", primary: "SVM kernel selection guide" },
                { name: "Support Vector Regression SVR: الانحدار بالهامش", primary: "support vector regression SVR" },
                { name: "SVM مقابل Logistic Regression: متى أيٌّ منهما؟", primary: "SVM vs logistic regression comparison" },
                { name: "تحسين معاملات SVM بـGrid Search", primary: "SVM hyperparameter tuning with Grid Search" },
                { name: "One-Class SVM: كشف الشذوذ", primary: "one-class SVM for anomaly detection" },
                { name: "مشروع: SVM لتصنيف النصوص القصيرة", primary: "SVM for text classification" }
              ]
            },
            {
              unit_index: 6, code: "1.7.6",
              name: "Naive Bayes ونماذج الاحتمالية",
              goal: "تطبيق نماذج بايز الساذجة للتصنيف النصي وسريع الاحتمالية",
              key_concepts: ["Bayes Theorem ML","Gaussian NB","Multinomial NB","Bernoulli NB","Laplace Smoothing"],
              lessons: [
                { name: "Naive Bayes: التبسيط الهائل الذي يعمل", primary: "Naive Bayes assumption and why it works" },
                { name: "Gaussian Naive Bayes: للبيانات العددية", primary: "Gaussian NB for continuous features" },
                { name: "Multinomial NB: لبيانات النصوص والتردد", primary: "Multinomial NB for text classification" },
                { name: "Bernoulli NB: للميزات الثنائية", primary: "Bernoulli NB for binary features" },
                { name: "Laplace Smoothing: تجنّب الصفر الاحتمالي", primary: "Laplace smoothing for zero probability" },
                { name: "Naive Bayes لتصنيف البريد العشوائي", primary: "Naive Bayes spam classification" },
                { name: "Complement Naive Bayes: للفئات غير المتوازنة", primary: "Complement NB for imbalanced text" },
                { name: "حدود افتراض الاستقلالية: متى يُخفق NB؟", primary: "Naive Bayes independence assumption failures" },
                { name: "مشروع: تصنيف تغريدات عربية بـNaive Bayes", primary: "Arabic tweet classification with Naive Bayes" }
              ]
            },
            {
              unit_index: 7, code: "1.7.7",
              name: "التقييم والتحقق المتقاطع",
              goal: "تقييم النماذج بصدق مع تجنّب الفخاخ الشائعة في التقييم",
              key_concepts: ["Cross Validation","Accuracy","Precision/Recall","F1","AUC","Stratification"],
              lessons: [
                { name: "مقاييس التصنيف: Accuracy وPrecision وRecall", primary: "classification metrics comprehensive guide" },
                { name: "F1-Score والـF-beta: موازنة التقييم", primary: "F1 and F-beta score calculation" },
                { name: "ROC-AUC وPR-AUC: التقييم الاحتمالي", primary: "ROC and PR AUC interpretation" },
                { name: "مقاييس الانحدار: MAE وMSE وRMSE وR²", primary: "regression evaluation metrics" },
                { name: "K-Fold Cross Validation: التقييم العادل", primary: "K-fold cross validation methodology" },
                { name: "Stratified K-Fold: للفئات غير المتوازنة", primary: "stratified cross validation" },
                { name: "Leave-One-Out وTime Series CV", primary: "LOO and time series cross validation" },
                { name: "مقارنة النماذج إحصائياً: Paired t-test", primary: "statistical model comparison tests" },
                { name: "مشروع: منهجية تقييم كاملة لثلاثة نماذج", primary: "comprehensive model evaluation pipeline" }
              ]
            },
            {
              unit_index: 8, code: "1.7.8",
              name: "ضبط الحدود الفائقة Hyperparameter Tuning",
              goal: "إتقان ضبط الحدود الفائقة كمرحلة أساسية قبل تسليم أي نموذج",
              key_concepts: ["Grid Search","Random Search","Bayesian Optimization","Hyperopt","Optuna"],
              lessons: [
                { name: "Grid Search: البحث الشامل المنهجي", primary: "Grid Search cross validation" },
                { name: "Random Search: فعّال عند المساحة الكبيرة", primary: "Random Search hyperparameter optimization" },
                { name: "Bayesian Optimization: التعلم من المحاولات", primary: "Bayesian optimization for hyperparameters" },
                { name: "Optuna: ضبط الحدود الحديث والقابل للتوسع", primary: "Optuna hyperparameter optimization" },
                { name: "Hyperopt: TPE وبديل Bayesian", primary: "Hyperopt TPE algorithm" },
                { name: "Early Stopping: وقف التدريب في الوقت المناسب", primary: "early stopping for neural networks" },
                { name: "Nested Cross Validation: التقييم النزيه", primary: "nested cross validation for unbiased evaluation" },
                { name: "AutoML: الضبط التلقائي وحدوده", primary: "AutoML tools and limitations" },
                { name: "مشروع: ضبط نموذج XGBoost لتنبؤ الطلب", primary: "XGBoost demand prediction tuning" }
              ]
            },
            {
              unit_index: 9, code: "1.7.9",
              name: "Scikit-Learn: المنظومة الكاملة",
              goal: "إتقان منظومة Scikit-Learn بالكامل لبناء نماذج احترافية قابلة للإنتاج",
              key_concepts: ["Estimator API","Pipeline","ColumnTransformer","Custom Estimator","Model Persistence"],
              lessons: [
                { name: "sklearn Estimator API: الفلسفة والاتساق", primary: "sklearn estimator API fit transform predict" },
                { name: "Model Selection API: أدوات التقييم والاختيار", primary: "sklearn model selection tools" },
                { name: "Preprocessing API: المعالجة المدمجة", primary: "sklearn preprocessing comprehensive guide" },
                { name: "بناء Estimator مخصص بـBaseEstimator", primary: "custom sklearn estimator development" },
                { name: "Pipeline مع ColumnTransformer الكامل", primary: "full sklearn Pipeline ColumnTransformer" },
                { name: "حفظ النماذج وتحميلها: joblib وpickle", primary: "sklearn model persistence and loading" },
                { name: "sklearn مع Pandas: أفضل الممارسات", primary: "sklearn Pandas integration best practices" },
                { name: "FeatureUnion وVotingClassifier", primary: "sklearn ensemble composition" },
                { name: "مشروع: نظام توصيات بسيط بـsklearn Pipeline", primary: "recommendation system with sklearn Pipeline" }
              ]
            }
          ]
        }
      ]
    },
    {
      level_index: 2,
      name: "التعلم الآلي المتقدم وهندسة البيانات",
      goal: "إتقان النماذج المتقدمة من Ensemble إلى Deep Learning مع هندسة الميزات وأنابيب البيانات الإنتاجية",
      bloom_focus: "apply",
      exam: { pass_threshold_percent: 70, time_limit_minutes: 80 },
      stages: [
        {
          stage_index: 1,
          name: "التعلم الخاضع للإشراف المتقدم",
          goal: "إتقان أقوى خوارزميات التعلم الخاضع للإشراف من Ensemble Methods إلى Gradient Boosting",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "2.1.1",
              name: "Random Forest وطرق Bagging",
              goal: "إتقان Random Forest وفهم قوة تنوع النماذج في تحسين الأداء",
              key_concepts: ["Bootstrap Aggregating","Random Feature Selection","OOB Error","Feature Importance","Variance Reduction"],
              lessons: [
                { name: "Bagging: تجميع النماذج لتقليل التباين", primary: "bagging ensemble for variance reduction" },
                { name: "Random Forest: تعددية الشجرة مع العشوائية", primary: "random forest algorithm deep dive" },
                { name: "خطأ Out-of-Bag OOB: تقييم مجاني", primary: "OOB error in random forest" },
                { name: "أهمية الميزات في Random Forest: النوعان", primary: "feature importance types in random forest" },
                { name: "Extra Trees: عشوائية أكثر لتباين أقل", primary: "extra trees extremely randomized trees" },
                { name: "تحسين Random Forest: المعاملات وإستراتيجياتها", primary: "random forest hyperparameter tuning" },
                { name: "Random Forest لبيانات المفقودات والخاصة", primary: "random forest for missing data imputation" },
                { name: "Isolation Forest للكشف عن الشذوذ", primary: "isolation forest anomaly detection" },
                { name: "مشروع: التنبؤ بمعدل التخرج بـRandom Forest", primary: "graduation rate prediction with random forest" }
              ]
            },
            {
              unit_index: 2, code: "2.1.2",
              name: "Gradient Boosting: XGBoost وLightGBM",
              goal: "إتقان خوارزميات Gradient Boosting التي تهيمن على مسابقات البيانات",
              key_concepts: ["Gradient Boosting Theory","Learning Rate","Trees Depth","XGBoost","LightGBM"],
              lessons: [
                { name: "Boosting: بناء نموذج قوي من نماذج ضعيفة", primary: "boosting principle and ensemble building" },
                { name: "Gradient Boosting: التدريج في مساحة الدالة", primary: "gradient boosting mathematical framework" },
                { name: "XGBoost: الخوارزمية التي هيمنت على Kaggle", primary: "XGBoost algorithm features and advantages" },
                { name: "معاملات XGBoost الأهم: دليل عملي", primary: "XGBoost key hyperparameters guide" },
                { name: "LightGBM: Gradient Boosting للبيانات الكبيرة", primary: "LightGBM vs XGBoost comparison" },
                { name: "CatBoost: التعامل مع الفئات بذكاء", primary: "CatBoost categorical feature handling" },
                { name: "Dart وDropouts في Boosting", primary: "DART dropout for gradient boosting" },
                { name: "تفسير XGBoost بـSHAP: من يُقرر؟", primary: "SHAP explanations for XGBoost" },
                { name: "مشروع: مسابقة Kaggle Housing Prices كاملة", primary: "Kaggle housing competition end-to-end" }
              ]
            },
            {
              unit_index: 3, code: "2.1.3",
              name: "Stacking وAdvanced Ensembles",
              goal: "بناء أنظمة Ensemble متقدمة تجمع أفضل ما في كل نموذج",
              key_concepts: ["Stacking","Blending","Voting","Meta-Learner","Diversity"],
              lessons: [
                { name: "Voting Classifier: الديمقراطية بين النماذج", primary: "voting classifier hard and soft voting" },
                { name: "Weighted Voting: ترجيح الأصوات بالأداء", primary: "weighted voting ensemble" },
                { name: "Stacking: استخدام نموذج للتعلم من نماذج أخرى", primary: "stacking ensemble with meta-learner" },
                { name: "Blending: Stacking على مجموعة Hold-Out", primary: "blending ensemble approach" },
                { name: "Multi-Level Stacking: طبقات فوق طبقات", primary: "multi-level stacking ensembles" },
                { name: "تنوع النماذج Diversity: لماذا يختلف أفضل", primary: "ensemble diversity and error decorrelation" },
                { name: "Snapshot Ensemble: نسخ نموذج واحد في نقاط مختلفة", primary: "snapshot ensemble from single training" },
                { name: "Ensemble Selection: اختيار أفضل مجموعة", primary: "ensemble selection algorithms" },
                { name: "مشروع: Ensemble متعدد النماذج للتنبؤ بالائتمان", primary: "credit risk ensemble model" }
              ]
            },
            {
              unit_index: 4, code: "2.1.4",
              name: "النمذجة الخطية المتقدمة",
              goal: "توسيع الانحدار الخطي للمشاكل المعقدة باستخدام النماذج الإضافية والـSplines",
              key_concepts: ["GAM","Splines","GLM","GLMM","Quantile Regression"],
              lessons: [
                { name: "Generalized Linear Models GLM: ما وراء الطبيعي", primary: "GLM for non-Gaussian responses" },
                { name: "Poisson Regression: نمذجة الأعداد", primary: "Poisson regression for count data" },
                { name: "Negative Binomial: عندما يفشل Poisson", primary: "negative binomial regression" },
                { name: "Splines: خطوط منحنية مرنة", primary: "splines for flexible regression" },
                { name: "Generalized Additive Models GAM: الخطية بشكل غير خطي", primary: "GAM for additive smooth terms" },
                { name: "Quantile Regression: تنبؤ مئينية البيانات", primary: "quantile regression for distribution modeling" },
                { name: "Mixed Effects Models: البيانات الهرمية", primary: "mixed effects models for hierarchical data" },
                { name: "Survival Analysis: تحليل البقاء والوقت للحدث", primary: "survival analysis and Cox regression" },
                { name: "مشروع: تحليل معدلات الوفيات بنمذجة GLM", primary: "mortality rate analysis with GLM" }
              ]
            },
            {
              unit_index: 5, code: "2.1.5",
              name: "التعلم شبه الخاضع للإشراف",
              goal: "استغلال البيانات غير المُصنَّفة الضخمة مع القليل من البيانات المُصنَّفة",
              key_concepts: ["Self-Training","Label Propagation","Pseudo-Labeling","Mean Teacher","Semi-Supervised"],
              lessons: [
                { name: "التعلم شبه الخاضع: المشكلة والفرصة", primary: "semi-supervised learning problem setting" },
                { name: "Self-Training: النموذج يُعلّم نفسه", primary: "self-training pseudo-labeling" },
                { name: "Label Propagation: نشر التصنيف عبر الشبكة", primary: "label propagation on graphs" },
                { name: "Label Spreading: نسخة أكثر مرونة", primary: "label spreading algorithm" },
                { name: "Mean Teacher: النموذجان المتوسطان", primary: "mean teacher semi-supervised" },
                { name: "Pseudo-Labeling في مسابقات البيانات", primary: "pseudo-labeling competition strategy" },
                { name: "Co-Training: نموذجان يُعلّمان بعضهما", primary: "co-training with multiple views" },
                { name: "SSL مع التعلم التمثيلي Self-Supervised", primary: "self-supervised pre-training for classification" },
                { name: "مشروع: تصنيف نصي مع 1% بيانات مُصنَّفة فقط", primary: "text classification with minimal labels" }
              ]
            },
            {
              unit_index: 6, code: "2.1.6",
              name: "التعلم بالتحويل Transfer Learning في ML الكلاسيكي",
              goal: "نقل المعرفة المكتسبة بين المهام والنطاقات لتوفير البيانات والوقت",
              key_concepts: ["Domain Adaptation","Feature Transfer","Multi-Task Learning","Fine-Tuning","Domain Shift"],
              lessons: [
                { name: "Transfer Learning: المفهوم والحدس", primary: "transfer learning concept and intuition" },
                { name: "Domain Adaptation: تعميم عبر نطاقات مختلفة", primary: "domain adaptation strategies" },
                { name: "Multi-Task Learning: تعلم عدة مهام معاً", primary: "multi-task learning shared representations" },
                { name: "Feature Transfer: ميزات نموذج لنموذج آخر", primary: "feature transfer between models" },
                { name: "Domain Shift: كشف تغير توزيع البيانات", primary: "domain shift detection and adaptation" },
                { name: "Importance Weighting: تعديل التوزيع", primary: "importance weighting for domain adaptation" },
                { name: "Fine-Tuning نماذج مُدرَّبة مسبقاً", primary: "fine-tuning pre-trained models" },
                { name: "Zero-Shot وFew-Shot في ML الكلاسيكي", primary: "zero-shot and few-shot learning" },
                { name: "مشروع: تحويل نموذج صور لمجال طبي مختلف", primary: "medical image domain transfer learning" }
              ]
            },
            {
              unit_index: 7, code: "2.1.7",
              name: "التعلم الآلي للسلاسل الزمنية",
              goal: "تطبيق نماذج تعلم آلي على مشاكل التنبؤ الزمني",
              key_concepts: ["ARIMA","Prophet","XGBoost for TS","Feature Engineering Time","Walk-Forward"],
              lessons: [
                { name: "ARIMA وSARIMA: النمذجة الإحصائية الزمنية", primary: "ARIMA SARIMA time series modeling" },
                { name: "Prophet: التنبؤ الزمني من Meta", primary: "Prophet time series forecasting" },
                { name: "هندسة ميزات سلاسل الوقت للـML", primary: "time series feature engineering for ML" },
                { name: "XGBoost للتنبؤ الزمني: تحويل المشكلة", primary: "XGBoost for time series forecasting" },
                { name: "LSTM للسلاسل الزمنية: مدخل", primary: "LSTM basics for time series" },
                { name: "N-BEATS وN-HiTS: نماذج TS الحديثة", primary: "N-BEATS N-HiTS neural forecasting" },
                { name: "Walk-Forward Validation: التحقق الزمني الصحيح", primary: "walk-forward validation for time series" },
                { name: "التنبؤ الاحتمالي: نطاقات الثقة للتنبؤ", primary: "probabilistic forecasting with confidence intervals" },
                { name: "مشروع: تنبؤ الطلب على منتج بيانات RL زمنية", primary: "demand forecasting with ensemble time series" }
              ]
            },
            {
              unit_index: 8, code: "2.1.8",
              name: "التعلم الآلي للبيانات الجدولية المتقدمة",
              goal: "حل أصعب مشاكل البيانات الجدولية من تفاعلات الميزات إلى الأهداف المتعددة",
              key_concepts: ["Feature Interaction","Multi-Output","Multi-Label","Ordinal Classification","Imbalanced Advanced"],
              lessons: [
                { name: "Feature Interactions: الميزات المتشابكة والتفاعلية", primary: "feature interactions for tabular data" },
                { name: "Multi-Output Regression: عدة أهداف معاً", primary: "multi-output regression strategies" },
                { name: "Multi-Label Classification: عدة تصنيفات معاً", primary: "multi-label classification methods" },
                { name: "Ordinal Classification: الترتيب يُهم", primary: "ordinal classification techniques" },
                { name: "TabNet: Deep Learning للبيانات الجدولية", primary: "TabNet attention for tabular data" },
                { name: "SAINT وFT-Transformer: Transformers للجداول", primary: "FT-Transformer for tabular data" },
                { name: "AutoML بـAuto-sklearn وFLAML", primary: "AutoML tools for tabular data" },
                { name: "Ensemble متعدد الأهداف متعدد المراحل", primary: "multi-stage multi-objective ensemble" },
                { name: "مشروع: مسابقة Kaggle متعددة التصنيف", primary: "multi-label Kaggle competition" }
              ]
            },
            {
              unit_index: 9, code: "2.1.9",
              name: "التعلم المُعزَّز: المقدمة العملية",
              goal: "فهم التعلم المعزّز وتطبيق خوارزمياته الأساسية على مشاكل حقيقية",
              key_concepts: ["MDP","Q-Learning","Policy Gradient","Gymnasium","Reward Design"],
              lessons: [
                { name: "Markov Decision Process: اللغة الرسمية لـRL", primary: "MDP formulation for reinforcement learning" },
                { name: "Q-Learning: التعلم بالقيمة بلا نموذج", primary: "Q-learning algorithm implementation" },
                { name: "Deep Q-Network DQN: Q-Learning بالشبكات العصبية", primary: "DQN for Atari games" },
                { name: "Policy Gradient وREINFORCE", primary: "policy gradient methods" },
                { name: "Actor-Critic وPPO: الخوارزميات الحديثة", primary: "PPO actor-critic methods" },
                { name: "Gymnasium: بيئات تدريب RL", primary: "Gymnasium environments for RL" },
                { name: "تصميم المكافأة Reward Shaping", primary: "reward shaping in reinforcement learning" },
                { name: "RLHF: التعلم من التغذية الراجعة البشرية", primary: "RLHF for large language model alignment" },
                { name: "مشروع: عميل RL لمشكلة CartPole", primary: "CartPole RL agent training project" }
              ]
            }
          ]
        },
        {
          stage_index: 2,
          name: "التعلم غير الخاضع للإشراف",
          goal: "اكتشاف البنية الخفية في البيانات غير المُصنَّفة عبر التجميع وتخفيض الأبعاد",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.2.1",
              name: "K-Means وخوارزميات التجميع الأساسية",
              goal: "إتقان K-Means وفهم متى تعمل ومتى تفشل",
              key_concepts: ["K-Means","Elbow Method","Silhouette","K-Means++","Inertia"],
              lessons: [
                { name: "K-Means: الخوارزمية خطوة بخطوة", primary: "K-Means algorithm step-by-step" },
                { name: "K-Means++: التهيئة الذكية للمراكز", primary: "K-Means++ initialization" },
                { name: "اختيار K: Elbow وSilhouette", primary: "optimal K selection methods" },
                { name: "حدود K-Means: الأشكال غير الكروية", primary: "K-Means limitations and failure modes" },
                { name: "Mini-Batch K-Means: للبيانات الكبيرة", primary: "mini-batch K-Means for large datasets" },
                { name: "Bisecting K-Means: التقسيم الهرمي", primary: "bisecting K-Means hierarchical approach" },
                { name: "K-Medoids: مقاومة الشواذ", primary: "K-Medoids for outlier robustness" },
                { name: "مقاييس جودة التجميع الداخلية والخارجية", primary: "clustering quality metrics internal external" },
                { name: "مشروع: تقسيم عملاء متجر يمني لشرائح", primary: "customer segmentation K-Means project" }
              ]
            },
            {
              unit_index: 2, code: "2.2.2",
              name: "التجميع الهرمي وQuality-Based",
              goal: "استخدام التجميع الهرمي للحصول على رؤية متعددة المستويات",
              key_concepts: ["Agglomerative","Dendrogram","Linkage Criteria","DBSCAN","OPTICS"],
              lessons: [
                { name: "التجميع الهرمي التراكمي: من الأسفل للأعلى", primary: "agglomerative hierarchical clustering" },
                { name: "Dendrogram: قراءة الشجرة الهرمية", primary: "dendrogram reading and cutting" },
                { name: "معايير الوصل Linkage: Single وAverage وComplete وWard", primary: "linkage criteria comparison" },
                { name: "DBSCAN: التجميع بالكثافة والأشكال المعقدة", primary: "DBSCAN density-based clustering" },
                { name: "OPTICS: DBSCAN المرن للكثافات المتغيرة", primary: "OPTICS for variable density clusters" },
                { name: "HDBSCAN: DBSCAN الهرمي الحديث", primary: "HDBSCAN hierarchical density clustering" },
                { name: "Mean Shift: التجميع بالجذب للمركز", primary: "Mean Shift clustering" },
                { name: "Spectral Clustering: التجميع الطيفي", primary: "spectral clustering for complex shapes" },
                { name: "مشروع: تحليل الأحياء السكنية بالتجميع الهرمي", primary: "neighborhood analysis with hierarchical clustering" }
              ]
            },
            {
              unit_index: 3, code: "2.2.3",
              name: "تخفيض الأبعاد: PCA والمتقدم",
              goal: "تطبيق طرق تخفيض الأبعاد المناسبة لكل نوع بيانات",
              key_concepts: ["PCA","t-SNE","UMAP","LDA","ICA"],
              lessons: [
                { name: "PCA التطبيقي: من الصفر للنتائج", primary: "PCA practical application" },
                { name: "Explained Variance: كم مركّباً يكفي؟", primary: "explained variance ratio selection" },
                { name: "t-SNE: تصوير البيانات عالية الأبعاد", primary: "t-SNE for high-dimensional visualization" },
                { name: "UMAP: أسرع وأفضل من t-SNE", primary: "UMAP for dimensionality reduction" },
                { name: "LDA: تخفيض الأبعاد الخاضع للإشراف", primary: "linear discriminant analysis" },
                { name: "ICA: المكونات المستقلة ومصادرها", primary: "independent component analysis ICA" },
                { name: "Kernel PCA: PCA غير الخطي", primary: "kernel PCA for non-linear reduction" },
                { name: "Autoencoders مدخل: PCA غير الخطي بالشبكات", primary: "autoencoders for dimensionality reduction" },
                { name: "مشروع: تخفيض أبعاد بيانات جينومية للتصور", primary: "genomic data dimensionality reduction" }
              ]
            },
            {
              unit_index: 4, code: "2.2.4",
              name: "نماذج المزيج الاحتمالي GMM",
              goal: "تطبيق نماذج المزيج الغاوسي للتجميع الاحتمالي والمرن",
              key_concepts: ["Gaussian Mixture Model","EM Algorithm","BIC/AIC","Soft Clustering","Density Estimation"],
              lessons: [
                { name: "GMM: التجميع الاحتمالي بالتوزيعات الغاوسية", primary: "Gaussian Mixture Model fundamentals" },
                { name: "خوارزمية EM: E-Step وM-Step", primary: "EM algorithm for GMM training" },
                { name: "Soft Clustering: الانتماء الاحتمالي للمجموعة", primary: "soft cluster assignments in GMM" },
                { name: "BIC وAIC: اختيار عدد المجموعات", primary: "BIC AIC for number of components" },
                { name: "GMM لتقدير الكثافة", primary: "GMM for density estimation" },
                { name: "Dirichlet Process: GMM ذو مجموعات لانهائية", primary: "Dirichlet process mixture models" },
                { name: "GMM للكشف عن الشذوذ", primary: "GMM for anomaly detection" },
                { name: "Variational Autoencoder لتعلم التوزيع", primary: "VAE for latent distribution learning" },
                { name: "مشروع: نمذجة أنواع مرضى بـGMM للتشخيص", primary: "patient phenotyping with GMM" }
              ]
            },
            {
              unit_index: 5, code: "2.2.5",
              name: "تحليل النص غير الخاضع للإشراف",
              goal: "اكتشاف الموضوعات والهياكل الخفية في مجموعات النصوص",
              key_concepts: ["LDA Topic Model","NMF","Word2Vec","Document Clustering","TF-IDF"],
              lessons: [
                { name: "TF-IDF: تمثيل النصوص رقمياً", primary: "TF-IDF vectorization for text" },
                { name: "Latent Dirichlet Allocation LDA: موضوعات النص", primary: "LDA topic modeling" },
                { name: "NMF: تحليل المصفوفة غير السلبية للموضوعات", primary: "NMF for topic modeling" },
                { name: "تقييم نماذج الموضوعات: Coherence Score", primary: "topic model evaluation coherence" },
                { name: "Word2Vec: تمثيل الكلمات كمتجهات", primary: "Word2Vec embedding training" },
                { name: "GloVe وFastText: التضمينات البديلة", primary: "GloVe and FastText word embeddings" },
                { name: "تجميع الوثائق بـEmbeddings", primary: "document clustering with embeddings" },
                { name: "BERTopic: نمذجة الموضوعات الحديثة", primary: "BERTopic for modern topic modeling" },
                { name: "مشروع: استخراج موضوعات من آلاف التغريدات", primary: "Twitter topic modeling project" }
              ]
            },
            {
              unit_index: 6, code: "2.2.6",
              name: "أنظمة التوصية",
              goal: "بناء أنظمة توصية من Collaborative Filtering إلى Deep Learning",
              key_concepts: ["Collaborative Filtering","Matrix Factorization","Content-Based","Hybrid","Cold Start"],
              lessons: [
                { name: "أنظمة التوصية: المشكلة والنهج", primary: "recommendation system fundamentals" },
                { name: "User-Based Collaborative Filtering", primary: "user-based collaborative filtering" },
                { name: "Item-Based Collaborative Filtering", primary: "item-based collaborative filtering" },
                { name: "Matrix Factorization: SVD وALS", primary: "matrix factorization SVD ALS" },
                { name: "Content-Based Filtering: التوصية بالمحتوى", primary: "content-based filtering" },
                { name: "Hybrid Systems: دمج النهجين", primary: "hybrid recommendation systems" },
                { name: "مشكلة Cold Start: الجديد بلا تاريخ", primary: "cold start problem solutions" },
                { name: "Neural Collaborative Filtering NCF", primary: "neural collaborative filtering" },
                { name: "مشروع: نظام توصية كتب بـMatrix Factorization", primary: "book recommendation system" }
              ]
            },
            {
              unit_index: 7, code: "2.2.7",
              name: "كشف الشذوذ والاحتيال",
              goal: "بناء أنظمة كشف شذوذ فعّالة لمشاكل الاحتيال والأمان",
              key_concepts: ["Autoencoder","One-Class SVM","LOF","SVDD","Anomaly Score"],
              lessons: [
                { name: "تحدي كشف الشذوذ: النادر هو الخطر", primary: "anomaly detection challenges and approaches" },
                { name: "Autoencoder للكشف عن الشذوذ: خطأ الإعادة", primary: "autoencoder reconstruction error anomaly" },
                { name: "Isolation Forest: العزل العشوائي", primary: "isolation forest for anomaly detection" },
                { name: "One-Class SVM: الحد الأدنى للكرة", primary: "one-class SVM for novelty detection" },
                { name: "LOF: الكثافة المحلية للكشف عن الشذوذ", primary: "local outlier factor LOF" },
                { name: "ECOD وCOPOD: نماذج الشذوذ الحديثة", primary: "ECOD COPOD modern anomaly detectors" },
                { name: "PyOD: مكتبة كشف الشذوذ الموحدة", primary: "PyOD for anomaly detection" },
                { name: "كشف الشذوذ الزمني: الانحراف عن الأنماط", primary: "time series anomaly detection" },
                { name: "مشروع: نظام كشف احتيال في المعاملات المالية", primary: "financial fraud detection system" }
              ]
            },
            {
              unit_index: 8, code: "2.2.8",
              name: "تحليل شبكات المعلومات",
              goal: "تطبيق خوارزميات رسوميات الشبكات لاكتشاف الأنماط في البيانات الشبكية",
              key_concepts: ["Graph Algorithms","Community Detection","PageRank","Link Prediction","Graph Neural Networks"],
              lessons: [
                { name: "النظرية الرسومية للبيانات: الأسس", primary: "graph theory fundamentals for data science" },
                { name: "مقاييس المركزية: PageRank وBetweenness", primary: "centrality measures in network analysis" },
                { name: "كشف المجتمعات Community Detection", primary: "community detection algorithms Louvain" },
                { name: "Shortest Path والمسافات في الشبكات", primary: "shortest path algorithms in graphs" },
                { name: "تنبؤ الروابط Link Prediction", primary: "link prediction in graphs" },
                { name: "Node2Vec وGraph Embeddings", primary: "node2vec and graph embedding methods" },
                { name: "Graph Neural Networks: مدخل", primary: "GNN introduction for graph learning" },
                { name: "تطبيقات الشبكات: الاحتيال والبيولوجيا والتوصيات", primary: "graph applications in fraud bio and recommendation" },
                { name: "مشروع: تحليل شبكة تحويلات مالية للكشف عن الاحتيال", primary: "financial transaction network fraud detection" }
              ]
            },
            {
              unit_index: 9, code: "2.2.9",
              name: "تعلم التمثيل Self-Supervised",
              goal: "فهم التعلم الذاتي كثورة في استغلال البيانات غير المُصنَّفة",
              key_concepts: ["Contrastive Learning","SimCLR","BYOL","Pretext Tasks","Foundation Models"],
              lessons: [
                { name: "التعلم الذاتي: الإشراف من البيانات نفسها", primary: "self-supervised learning pretext tasks" },
                { name: "Contrastive Learning: الجاذبية والتنافر", primary: "contrastive learning SimCLR" },
                { name: "SimCLR وMoCo: التعلم التمثيلي الصوري", primary: "SimCLR and MoCo image representation" },
                { name: "BYOL: التعلم التمثيلي بلا سلبيات", primary: "BYOL bootstrap your own latent" },
                { name: "MAE وBEiT: الإخفاء والإعادة للتعلم", primary: "masked autoencoders for self-supervised learning" },
                { name: "Pre-Training وFine-Tuning: النهج الموحّد", primary: "pre-training fine-tuning paradigm" },
                { name: "Foundation Models: نقطة انطلاق للمهام", primary: "foundation models as starting points" },
                { name: "التعلم الذاتي للبيانات الجدولية والنصية والزمنية", primary: "self-supervised for tabular text time series" },
                { name: "مشروع: Pre-Training على بيانات غير مُصنَّفة ثم Fine-Tuning", primary: "self-supervised pre-training fine-tuning project" }
              ]
            }
          ]
        },
        {
          stage_index: 3,
          name: "التعلم العميق",
          goal: "إتقان التعلم العميق من الشبكات العصبية الأساسية إلى CNN وRNN والـAttention",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 60 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "2.3.1",
              name: "الشبكات العصبية الأساسية",
              goal: "فهم وبناء الشبكات العصبية من النيورون إلى الـBackpropagation",
              key_concepts: ["Perceptron","MLP","Activation Functions","Backpropagation","Vanishing Gradient"],
              lessons: [
                { name: "الخلية العصبية الاصطناعية: Perceptron والبداية", primary: "perceptron and artificial neuron model" },
                { name: "MLP: الشبكة العصبية متعددة الطبقات", primary: "multilayer perceptron architecture" },
                { name: "دوال التنشيط: ReLU وSigmoid وTanh وGELU", primary: "activation functions comparison" },
                { name: "Backpropagation: حساب التدرجات بقاعدة السلسلة", primary: "backpropagation algorithm step-by-step" },
                { name: "مشكلة الـVanishing Gradient وكيف تُحلّ", primary: "vanishing gradient problem and solutions" },
                { name: "تهيئة الأوزان: Xavier وKaiming", primary: "weight initialization strategies" },
                { name: "Batch Normalization: تسريع التدريب", primary: "batch normalization theory and practice" },
                { name: "Dropout: التنظيم بالإسقاط العشوائي", primary: "dropout regularization" },
                { name: "مشروع: شبكة عصبية من الصفر بـNumPy", primary: "neural network from scratch with NumPy" }
              ]
            },
            {
              unit_index: 2, code: "2.3.2",
              name: "PyTorch وTensorFlow: أدوات التعلم العميق",
              goal: "إتقان PyTorch كإطار التعلم العميق الأساسي للبحث والإنتاج",
              key_concepts: ["Tensor","Autograd","Dataset","DataLoader","GPU Training"],
              lessons: [
                { name: "PyTorch Tensors: NumPy مع autograd", primary: "PyTorch tensor operations and autograd" },
                { name: "nn.Module: بناء النماذج بـPyTorch", primary: "PyTorch nn.Module architecture" },
                { name: "Dataset وDataLoader: تغذية النموذج", primary: "PyTorch Dataset and DataLoader" },
                { name: "حلقة التدريب: الخطوات والنمط الثابت", primary: "PyTorch training loop pattern" },
                { name: "GPU Training بـCUDA وMPS", primary: "GPU training with PyTorch" },
                { name: "Callbacks وLightning: التدريب المنظّم", primary: "PyTorch Lightning for clean training" },
                { name: "حفظ وتحميل النماذج بـPyTorch", primary: "PyTorch model checkpointing" },
                { name: "TensorBoard وWandB: مراقبة التدريب", primary: "experiment tracking with TensorBoard WandB" },
                { name: "مشروع: تصنيف صور بـPyTorch كاملاً", primary: "image classification with PyTorch end-to-end" }
              ]
            },
            {
              unit_index: 3, code: "2.3.3",
              name: "الشبكات التلافيفية CNN",
              goal: "إتقان CNN لمعالجة الصور والتعلم من البيانات المكانية",
              key_concepts: ["Convolution","Pooling","Feature Maps","Receptive Field","LeNet/VGG/ResNet"],
              lessons: [
                { name: "عملية الـConvolution: الفلتر والخريطة", primary: "convolution operation and feature maps" },
                { name: "Pooling: تقليص الأبعاد وحفظ الأهم", primary: "max average pooling operations" },
                { name: "الحقل الاستقبالي Receptive Field", primary: "receptive field in CNN" },
                { name: "LeNet وAlexNet: فجر التعلم العميق", primary: "LeNet AlexNet historical architectures" },
                { name: "VGG وGoogleNet: العمق والعرض", primary: "VGG GoogLeNet architecture innovations" },
                { name: "ResNet: الوصلات التخطيفية وتجاوز المشكلة", primary: "ResNet skip connections" },
                { name: "EfficientNet وMobileNet: الكفاءة أولاً", primary: "EfficientNet MobileNet efficient architectures" },
                { name: "Data Augmentation للصور: تنويع التدريب", primary: "image data augmentation strategies" },
                { name: "مشروع: تصنيف نباتات بنموذج CNN من الصفر", primary: "plant classification CNN project" }
              ]
            },
            {
              unit_index: 4, code: "2.3.4",
              name: "الشبكات المتكررة RNN وLSTM",
              goal: "معالجة التسلسلات الزمنية والنصية بالشبكات المتكررة",
              key_concepts: ["RNN","LSTM","GRU","Sequence-to-Sequence","Bidirectional"],
              lessons: [
                { name: "RNN: الذاكرة عبر الزمن والمشكلة", primary: "RNN recurrent neural network basics" },
                { name: "Vanishing Gradient في RNN ولماذا يُخفق", primary: "RNN vanishing gradient problem" },
                { name: "LSTM: الخلية والبوابات والذاكرة الطويلة", primary: "LSTM gates and memory cell" },
                { name: "GRU: LSTM المبسّط والكفء", primary: "GRU gated recurrent unit" },
                { name: "Bidirectional RNN: القراءة في الاتجاهين", primary: "bidirectional RNN for sequence modeling" },
                { name: "Sequence-to-Sequence: الترجمة والتلخيص", primary: "seq2seq architecture with encoder-decoder" },
                { name: "LSTM للسلاسل الزمنية: التنبؤ العددي", primary: "LSTM for time series forecasting" },
                { name: "Stacked RNN والتنظيم في التسلسلات", primary: "deep RNN and regularization" },
                { name: "مشروع: تصنيف المشاعر بـLSTM بالعربية", primary: "Arabic sentiment analysis with LSTM" }
              ]
            },
            {
              unit_index: 5, code: "2.3.5",
              name: "Attention والـTransformers",
              goal: "فهم آلية Attention وبناء نماذج Transformer من الصفر",
              key_concepts: ["Attention Mechanism","Multi-Head Attention","Positional Encoding","Transformer","Self-Attention"],
              lessons: [
                { name: "Attention: من أين يأتي التركيز؟", primary: "attention mechanism intuition" },
                { name: "Scaled Dot-Product Attention: الحساب", primary: "scaled dot-product attention computation" },
                { name: "Multi-Head Attention: الانتباه من زوايا متعددة", primary: "multi-head attention mechanism" },
                { name: "Positional Encoding: ترتيب التسلسل", primary: "positional encoding in transformers" },
                { name: "Encoder وDecoder الـTransformer الأصلي", primary: "transformer encoder decoder architecture" },
                { name: "Layer Normalization وFeed-Forward", primary: "transformer layer normalization and FFN" },
                { name: "BERT: Encoder-Only للفهم", primary: "BERT pre-training objectives" },
                { name: "GPT: Decoder-Only للتوليد", primary: "GPT autoregressive generation" },
                { name: "مشروع: Transformer بسيط لتصنيف النصوص", primary: "transformer text classifier from scratch" }
              ]
            },
            {
              unit_index: 6, code: "2.3.6",
              name: "Generative Models: GAN وVAE",
              goal: "بناء نماذج توليدية تنشئ بيانات جديدة من البيانات الموجودة",
              key_concepts: ["GAN","Discriminator/Generator","VAE","DCGAN","Mode Collapse"],
              lessons: [
                { name: "VAE: الترميز الاحتمالي والتوليد", primary: "variational autoencoder theory" },
                { name: "VAE Latent Space: الفضاء الكامن المنظّم", primary: "VAE latent space interpolation" },
                { name: "GAN: المولّد والمميّز في تنافس", primary: "GAN minimax game theory" },
                { name: "DCGAN: GAN للصور بـConvolution", primary: "DCGAN deep convolutional GAN" },
                { name: "Mode Collapse: المشكلة والحلول", primary: "mode collapse in GAN training" },
                { name: "Conditional GAN cGAN: التوليد الموجّه", primary: "conditional GAN for controlled generation" },
                { name: "Wasserstein GAN: التدريب المستقر", primary: "Wasserstein GAN for stable training" },
                { name: "Diffusion Models: الثورة الجديدة في التوليد", primary: "diffusion models introduction" },
                { name: "مشروع: توليد صور اصطناعية لمجموعة بيانات نادرة", primary: "synthetic data generation with GAN" }
              ]
            },
            {
              unit_index: 7, code: "2.3.7",
              name: "Graph Neural Networks",
              goal: "تطبيق GNN على البيانات الشبكية لتصنيف العقد والروابط والرسوم",
              key_concepts: ["Message Passing","GCN","GAT","GraphSAGE","Node Classification"],
              lessons: [
                { name: "Message Passing: فلسفة التعلم على الشبكات", primary: "message passing neural networks" },
                { name: "GCN: الشبكة التلافيفية الرسومية", primary: "graph convolutional network GCN" },
                { name: "GAT: الانتباه على الشبكات", primary: "graph attention network GAT" },
                { name: "GraphSAGE: التعميم لعقد جديدة", primary: "GraphSAGE inductive learning" },
                { name: "تصنيف العقد والروابط والرسوم", primary: "node link graph classification tasks" },
                { name: "Heterogeneous Graphs: أنواع عقد متعددة", primary: "heterogeneous graph neural networks" },
                { name: "GNN للمعادلات الكيميائية والبيولوجيا الحسابية", primary: "GNN for molecular property prediction" },
                { name: "PyG وDGL: مكتبات GNN", primary: "PyTorch Geometric and DGL" },
                { name: "مشروع: كشف الاحتيال بـGNN على شبكة معاملات", primary: "GNN fraud detection on transaction graph" }
              ]
            },
            {
              unit_index: 8, code: "2.3.8",
              name: "تحسين التعلم العميق",
              goal: "تطبيق أحدث تقنيات تحسين التدريب لأسرع التقارب وأفضل الأداء",
              key_concepts: ["Mixed Precision","Gradient Clipping","OneCycleLR","Label Smoothing","Knowledge Distillation"],
              lessons: [
                { name: "Mixed Precision Training: FP16 للسرعة", primary: "mixed precision training for speed" },
                { name: "Gradient Clipping: منع انفجار التدرجات", primary: "gradient clipping for training stability" },
                { name: "Learning Rate Schedulers: Cosine وWarmup", primary: "learning rate schedulers for training" },
                { name: "Label Smoothing: تنظيم التصنيف الحديث", primary: "label smoothing regularization" },
                { name: "Knowledge Distillation: نقل المعرفة للنماذج الصغيرة", primary: "knowledge distillation for model compression" },
                { name: "Pruning وQuantization: ضغط النماذج", primary: "model pruning and quantization" },
                { name: "Stochastic Depth وDropPath للتعلم العميق", primary: "stochastic depth for deep networks" },
                { name: "ما وراء Adam: LAMB وAdafactor وSophia", primary: "advanced optimizers for deep learning" },
                { name: "مشروع: تحسين نموذج ResNet بكل التقنيات", primary: "ResNet optimization with modern techniques" }
              ]
            },
            {
              unit_index: 9, code: "2.3.9",
              name: "مشروع التعلم العميق الشامل",
              goal: "تطبيق كل ما تعلمته في مشروع تعلم عميق كامل من البيانات للنشر",
              key_concepts: ["End-to-End DL","Data Pipeline","Training Pipeline","Evaluation","Deployment Ready"],
              lessons: [
                { name: "تصميم مشروع تعلم عميق: الأسئلة الأولى", primary: "deep learning project design decisions" },
                { name: "بناء خط أنابيب بيانات DL احترافي", primary: "deep learning data pipeline" },
                { name: "اختيار المعمارية والـBaseline الأول", primary: "architecture selection and baseline" },
                { name: "تدريب وضبط النموذج بـPyTorch Lightning", primary: "model training and tuning with Lightning" },
                { name: "تقييم شامل وتحليل الأخطاء", primary: "comprehensive evaluation and error analysis" },
                { name: "تفسير النموذج: Grad-CAM وIntegrated Gradients", primary: "deep learning model interpretation" },
                { name: "تصدير النموذج: ONNX وTorchScript", primary: "model export to ONNX and TorchScript" },
                { name: "نشر النموذج بـFastAPI وDocker", primary: "model deployment with FastAPI and Docker" },
                { name: "مشروع نهائي: نظام رؤية حاسوبية إنتاجي", primary: "production computer vision system" }
              ]
            }
          ]
        },
        {
          stage_index: 4,
          name: "معالجة اللغة الطبيعية NLP",
          goal: "إتقان NLP من المعالجة الأساسية للنصوص إلى نماذج اللغة الكبيرة المخصصة",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "2.4.1",
              name: "أسس معالجة اللغة الطبيعية",
              goal: "إتقان المعالجة الأساسية للنصوص كأساس لكل مهام NLP",
              key_concepts: ["Tokenization","Stemming","Lemmatization","POS Tagging","NER"],
              lessons: [
                { name: "Tokenization: تقطيع النص للوحدات", primary: "tokenization methods for Arabic and English" },
                { name: "Stemming وLemmatization: جذر الكلمة", primary: "stemming and lemmatization Arabic and English" },
                { name: "POS Tagging: تصنيف أجزاء الجملة", primary: "part-of-speech tagging" },
                { name: "Named Entity Recognition NER: الكيانات المسمّاة", primary: "NER for entity extraction" },
                { name: "Dependency Parsing: علاقات الجملة النحوية", primary: "dependency parsing for sentence structure" },
                { name: "Sentence Boundary Detection: قطع النص لجمل", primary: "sentence boundary detection" },
                { name: "spaCy: مكتبة NLP الإنتاجية", primary: "spaCy NLP pipeline" },
                { name: "NLTK: الأدوات الأكاديمية لـNLP", primary: "NLTK for NLP research" },
                { name: "مشروع: أنبوب NLP لتحليل نصوص عربية", primary: "Arabic NLP pipeline project" }
              ]
            },
            {
              unit_index: 2, code: "2.4.2",
              name: "تمثيل النص والتضمينات",
              goal: "إتقان طرق تمثيل النص من Bag-of-Words إلى التضمينات السياقية",
              key_concepts: ["BoW","TF-IDF","Word2Vec","FastText","Sentence Embeddings"],
              lessons: [
                { name: "Bag of Words: التمثيل الأبسط وحدوده", primary: "bag of words representation" },
                { name: "TF-IDF: ترجيح الكلمات بأهميتها", primary: "TF-IDF vectorization and weighting" },
                { name: "N-Grams: الكلمات المتجاورة وسياقها", primary: "n-gram language models" },
                { name: "Word2Vec: CBOW وSkip-Gram", primary: "Word2Vec training CBOW Skip-Gram" },
                { name: "FastText: Subword embeddings للكلمات النادرة", primary: "FastText subword embeddings" },
                { name: "GloVe: التضمينات من الإحصاء العالمي", primary: "GloVe global vectors for word representation" },
                { name: "Sentence Transformers: تضمينات الجمل الحديثة", primary: "sentence transformers for semantic similarity" },
                { name: "تضمينات العربية: AraBERT وCAMeLBERT", primary: "Arabic BERT models for text representation" },
                { name: "مشروع: نظام بحث دلالي بـSentence Embeddings", primary: "semantic search with sentence embeddings" }
              ]
            },
            {
              unit_index: 3, code: "2.4.3",
              name: "تصنيف النصوص والمشاعر",
              goal: "بناء نماذج تصنيف نصي متقدمة لمشاكل المشاعر والموضوع والنية",
              key_concepts: ["Sentiment Analysis","Intent Classification","BERT Fine-Tuning","HuggingFace","Evaluation NLP"],
              lessons: [
                { name: "تحليل المشاعر: الإيجابي والسلبي والمحايد", primary: "sentiment analysis for text classification" },
                { name: "تصنيف النية Intent: فهم ما يريد المستخدم", primary: "intent classification for chatbots" },
                { name: "HuggingFace Transformers: النظام البيئي", primary: "HuggingFace ecosystem overview" },
                { name: "BERT Fine-Tuning لتصنيف النصوص", primary: "BERT fine-tuning for text classification" },
                { name: "AraBERT للمشاعر العربية", primary: "AraBERT for Arabic sentiment analysis" },
                { name: "Few-Shot Classification بـSetFit", primary: "SetFit few-shot text classification" },
                { name: "متعدد الفئات ومتعدد التصنيفات في NLP", primary: "multi-class multi-label NLP classification" },
                { name: "تقييم نماذج NLP: F1 وExact Match", primary: "NLP model evaluation metrics" },
                { name: "مشروع: نظام تحليل مشاعر التغريدات اليمنية", primary: "Yemeni Twitter sentiment analysis system" }
              ]
            },
            {
              unit_index: 4, code: "2.4.4",
              name: "استخراج المعلومات وSNLP",
              goal: "استخراج الكيانات والعلاقات والأحداث من النصوص غير المهيكلة",
              key_concepts: ["Relation Extraction","Event Detection","Coreference","Information Extraction","OpenIE"],
              lessons: [
                { name: "استخراج الكيانات NER المتقدم: أنواع مخصصة", primary: "custom NER for domain-specific entities" },
                { name: "استخراج العلاقات Relation Extraction", primary: "relation extraction from text" },
                { name: "الإشارة المشتركة Coreference Resolution", primary: "coreference resolution" },
                { name: "استخراج الأحداث Event Detection", primary: "event detection and temporal extraction" },
                { name: "OpenIE: الاستخراج المفتوح بلا قواعد", primary: "open information extraction" },
                { name: "Knowledge Graph من النصوص", primary: "knowledge graph construction from text" },
                { name: "الإجابة على الأسئلة Extractive QA", primary: "extractive question answering" },
                { name: "REBEL وBELT للاستخراج بـTransformers", primary: "REBEL BELT for relation extraction" },
                { name: "مشروع: بناء قاعدة معرفة من مقالات ويكيبيديا", primary: "knowledge base from Wikipedia articles" }
              ]
            },
            {
              unit_index: 5, code: "2.4.5",
              name: "توليد النصوص والتلخيص",
              goal: "بناء نماذج توليد نص ذات جودة عالية للتلخيص والترجمة والإكمال",
              key_concepts: ["Text Generation","Beam Search","Summarization","Translation","BART/T5"],
              lessons: [
                { name: "استراتيجيات التوليد: Greedy وBeam Search", primary: "text generation strategies greedy beam search" },
                { name: "Sampling وTemperature وTop-P وTop-K", primary: "sampling strategies for text generation" },
                { name: "BART: النموذج الترميزي-التفكيكي للتلخيص", primary: "BART for abstractive summarization" },
                { name: "T5: النص إلى نص لكل مهمة", primary: "T5 text-to-text framework" },
                { name: "التلخيص الاستخراجي مقابل التجريدي", primary: "extractive vs abstractive summarization" },
                { name: "الترجمة الآلية العصبية: النماذج وتقييمها", primary: "neural machine translation and BLEU score" },
                { name: "مقاييس تقييم التوليد: ROUGE وBLEU وBERTScore", primary: "NLG evaluation metrics" },
                { name: "Fine-Tuning BART/T5 على مهمة مخصصة", primary: "BART T5 fine-tuning custom task" },
                { name: "مشروع: ملخّص تلقائي للمقالات الإخبارية العربية", primary: "Arabic news summarization model" }
              ]
            },
            {
              unit_index: 6, code: "2.4.6",
              name: "البحث الدلالي وRAG",
              goal: "بناء أنظمة بحث دلالي ومعززة بالاسترجاع للتطبيقات الذكية",
              key_concepts: ["Dense Retrieval","Vector Database","RAG","ColBERT","Hybrid Search"],
              lessons: [
                { name: "البحث الدلالي مقابل البحث الكلمي", primary: "semantic vs keyword search comparison" },
                { name: "Dense Retrieval: Bi-Encoder للاسترجاع", primary: "bi-encoder dense retrieval" },
                { name: "Cross-Encoder: إعادة الترتيب الدقيقة", primary: "cross-encoder for re-ranking" },
                { name: "قواعد البيانات المتجهية: Pinecone وChroma وFAISS", primary: "vector databases for semantic search" },
                { name: "RAG: تعزيز الإجابة بالاسترجاع", primary: "retrieval augmented generation RAG" },
                { name: "Advanced RAG: HyDE وParent-Child وReRanking", primary: "advanced RAG techniques" },
                { name: "ColBERT: الاسترجاع متأخر التفاعل", primary: "ColBERT late interaction retrieval" },
                { name: "Hybrid Search: BM25 + Dense", primary: "hybrid search BM25 and dense retrieval" },
                { name: "مشروع: نظام Q&A على وثائق داخلية بـRAG", primary: "internal document QA system with RAG" }
              ]
            },
            {
              unit_index: 7, code: "2.4.7",
              name: "معالجة اللغة العربية تحديداً",
              goal: "التعامل مع خصائص اللغة العربية الفريدة في مهام NLP",
              key_concepts: ["Arabic Morphology","Diacritization","Dialect NLP","Camel Tools","AraBERT"],
              lessons: [
                { name: "تحديات اللغة العربية في NLP: الصرف والإعراب", primary: "Arabic NLP challenges morphology" },
                { name: "التشكيل Diacritization: المشكلة والنماذج", primary: "Arabic diacritization models" },
                { name: "الصرف العربي: CAMeL Tools وFarasa", primary: "Arabic morphological analysis tools" },
                { name: "NLP للهجات العربية: اليمنية والمصرية والشامية", primary: "Arabic dialect NLP" },
                { name: "AraBERT وQARiBi وCAMeLBERT: المقارنة", primary: "Arabic BERT models comparison" },
                { name: "تصنيف المشاعر العربية: HARD وTweet Arabic", primary: "Arabic sentiment analysis datasets" },
                { name: "الكيانات المسمّاة العربية: ANERCorp وWiki", primary: "Arabic NER datasets and models" },
                { name: "بناء Corpus عربي وتدريب نموذج مخصص", primary: "Arabic corpus building and model training" },
                { name: "مشروع: تحليل خطاب إعلامي يمني بـNLP", primary: "Yemeni media discourse NLP analysis" }
              ]
            },
            {
              unit_index: 8, code: "2.4.8",
              name: "نماذج الحوار وChatbots",
              goal: "بناء نماذج حوار ذكية من Rule-Based إلى النماذج التوليدية",
              key_concepts: ["Dialog Systems","Intent/Slot Filling","Rasa","Retrieval Chatbot","Generative Chatbot"],
              lessons: [
                { name: "أنواع نماذج الحوار: من القواعد للتوليد", primary: "dialog system types comparison" },
                { name: "Intent Recognition وSlot Filling", primary: "intent recognition and slot filling" },
                { name: "Rasa: إطار Chatbot مفتوح المصدر", primary: "Rasa chatbot framework" },
                { name: "Retrieval-Based Chatbot: الإجابة من قاعدة المعرفة", primary: "retrieval-based chatbot design" },
                { name: "DialoGPT وBlenderBot: الحوار التوليدي", primary: "generative dialog models" },
                { name: "إدارة السياق Context Management في الحوار", primary: "dialog context management" },
                { name: "تقييم Chatbots: BLEU وHuman Evaluation", primary: "chatbot evaluation metrics" },
                { name: "نشر Chatbot عبر Telegram وWhatsApp API", primary: "chatbot deployment on messaging platforms" },
                { name: "مشروع: Chatbot تعليمي يمني بـRasa", primary: "Yemeni educational chatbot with Rasa" }
              ]
            },
            {
              unit_index: 9, code: "2.4.9",
              name: "NLP للتطبيقات المتخصصة",
              goal: "تطبيق NLP على قطاعات متخصصة: الطب والقانون والمال والأعمال",
              key_concepts: ["Clinical NLP","Legal NLP","Financial NLP","Domain Adaptation","Low-Resource NLP"],
              lessons: [
                { name: "Clinical NLP: استخراج المعلومات الطبية", primary: "clinical NLP for medical information extraction" },
                { name: "Legal NLP: تحليل العقود والوثائق القانونية", primary: "legal document analysis NLP" },
                { name: "Financial NLP: استشعار أخبار السوق", primary: "financial news sentiment NLP" },
                { name: "تكيّف النطاق Domain Adaptation لـNLP المتخصص", primary: "domain adaptation for specialized NLP" },
                { name: "Low-Resource NLP: اللغات ذات الموارد المحدودة", primary: "low-resource NLP for under-resourced languages" },
                { name: "Cross-Lingual Transfer: نقل النموذج لغوياً", primary: "cross-lingual transfer learning" },
                { name: "XLM-R وmBERT: النماذج متعددة اللغات", primary: "XLM-R mBERT multilingual models" },
                { name: "أخلاقيات NLP: التحيز والعدالة في اللغة", primary: "NLP ethics and bias in language models" },
                { name: "مشروع: نظام NLP لتحليل عقود تجارية باللغة العربية", primary: "Arabic contract analysis NLP system" }
              ]
            }
          ]
        },
        {
          stage_index: 5,
          name: "هندسة الميزات ومعالجة البيانات المتقدمة",
          goal: "إتقان هندسة الميزات كمحرك حقيقي لتحسين أداء النماذج",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.5.1",
              name: "هندسة الميزات الزمنية",
              goal: "استخراج أقصى قدر من المعلومات من المتغيرات الزمنية",
              key_concepts: ["Lag Features","Rolling Statistics","Calendar Features","Cyclic Encoding","Target Encoding"],
              lessons: [
                { name: "Lag Features: القيم السابقة كميزات", primary: "lag features for time series ML" },
                { name: "Rolling Statistics: الإحصاء المتحرك كميزة", primary: "rolling mean std features" },
                { name: "Calendar Features: اليوم والشهر والموسم", primary: "calendar feature engineering" },
                { name: "Cyclic Encoding: ترميز الدوريات بـSin/Cos", primary: "cyclic encoding for periodic features" },
                { name: "Lead Features والـHorizon في التنبؤ", primary: "lead features and forecasting horizon" },
                { name: "Wavelet Features: الترددات الزمنية", primary: "wavelet transform for time series features" },
                { name: "STL Decomposition كميزات", primary: "STL decomposition features" },
                { name: "هندسة ميزات تفاعلية زمنية", primary: "interaction features for time series" },
                { name: "مشروع: هندسة ميزات لمجموعة بيانات طلب التوصيل", primary: "delivery demand feature engineering project" }
              ]
            },
            {
              unit_index: 2, code: "2.5.2",
              name: "هندسة ميزات الفئات المتقدمة",
              goal: "تحويل المتغيرات الفئوية بأساليب متقدمة تحتفظ بالمعلومات",
              key_concepts: ["Target Encoding","Frequency Encoding","Hash Encoding","Embedding Encoding","WOE"],
              lessons: [
                { name: "Target Encoding: ترميز الفئات بالهدف", primary: "target encoding with cross-validation" },
                { name: "Frequency Encoding: تردد الفئة كقيمة", primary: "frequency encoding for high cardinality" },
                { name: "Hash Encoding: الفئات الضخمة بالتجزئة", primary: "hash encoding for large cardinality" },
                { name: "Weight of Evidence WOE: الترميز الائتماني", primary: "WOE encoding for credit scoring" },
                { name: "Embedding للفئات في شبكات عصبية", primary: "entity embeddings for categorical data" },
                { name: "Binary Encoding وBaseN Encoding", primary: "binary and baseN encoding methods" },
                { name: "CatBoost Encoding: الترميز الترتيبي", primary: "CatBoost ordered target encoding" },
                { name: "James-Stein Estimator للفئات عالية الكاردينالية", primary: "James-Stein encoder" },
                { name: "مشروع: هندسة فئات في مجموعة بيانات ائتمانية", primary: "credit scoring categorical feature engineering" }
              ]
            },
            {
              unit_index: 3, code: "2.5.3",
              name: "اختيار الميزات وتقييمها",
              goal: "اختيار الميزات الأكثر تأثيراً وإزالة الضوضاء بأساليب إحصائية وقائمة على النموذج",
              key_concepts: ["Filter Methods","Wrapper Methods","Embedded Methods","SHAP Selection","Boruta"],
              lessons: [
                { name: "طرق الفلترة: الارتباط ونظرية المعلومات", primary: "filter methods for feature selection" },
                { name: "Recursive Feature Elimination RFE", primary: "RFE recursive feature elimination" },
                { name: "Boruta: الاختيار الشامل بالعشوائية", primary: "Boruta feature selection algorithm" },
                { name: "SHAP للاختيار: أهمية الميزات الحقيقية", primary: "SHAP based feature selection" },
                { name: "Permutation Importance: الأهمية بالخلط", primary: "permutation feature importance" },
                { name: "L1 Regularization للاختيار التلقائي", primary: "Lasso L1 for feature selection" },
                { name: "mRMR: الحد الأقصى للملاءمة مع الحد الأدنى للتكرار", primary: "mRMR feature selection criterion" },
                { name: "Sequential Feature Selection: البحث التتابعي", primary: "sequential forward backward selection" },
                { name: "مشروع: اختيار الميزات لبيانات طبية عالية الأبعاد", primary: "medical high-dimensional feature selection" }
              ]
            },
            {
              unit_index: 4, code: "2.5.4",
              name: "ميزات التفاعل والتحويلات المتقدمة",
              goal: "إنشاء ميزات تفاعلية وتحويلية لالتقاط الديناميكيات المعقدة",
              key_concepts: ["Polynomial Features","Interaction Terms","Ratio Features","Domain Features","AutoFeat"],
              lessons: [
                { name: "ميزات متعددة الحدود: التوسع الخطي", primary: "polynomial features and expansion" },
                { name: "تفاعلات الميزات: الضرب والقسمة والفرق", primary: "feature interaction terms ratio difference" },
                { name: "ميزات النطاق Domain-Specific: المعرفة أولاً", primary: "domain knowledge for feature creation" },
                { name: "AutoFeat: توليد الميزات التلقائي", primary: "automated feature generation AutoFeat" },
                { name: "Featuretools: الهندسة العميقة للجداول المتعلقة", primary: "Featuretools deep feature synthesis" },
                { name: "تجميع الميزات عبر الوقت Deep Agg", primary: "temporal aggregation features" },
                { name: "ميزات الإحصاء الكلي: البيانات المجمّعة", primary: "global statistical features" },
                { name: "التمثيلات المضغوطة كميزات NMF وPCA", primary: "compressed representations as features" },
                { name: "مشروع: هندسة ميزات تنافسية لـKaggle Tabular", primary: "competitive Kaggle tabular feature engineering" }
              ]
            },
            {
              unit_index: 5, code: "2.5.5",
              name: "معالجة البيانات الضخمة بـDask وPolars",
              goal: "معالجة مجموعات البيانات التي لا تسع في الذاكرة بأدوات موزعة",
              key_concepts: ["Dask DataFrame","Dask Array","Polars","Out-of-Core","Chunked Processing"],
              lessons: [
                { name: "Dask: Pandas + NumPy للبيانات الكبيرة", primary: "Dask for large dataset processing" },
                { name: "Dask DataFrame: نفس API Pandas على الأقراص", primary: "Dask DataFrame operations" },
                { name: "Dask Array: NumPy لمصفوفات أكبر من الذاكرة", primary: "Dask Array for large arrays" },
                { name: "Dask ML: التعلم الآلي الموزع", primary: "Dask ML for distributed machine learning" },
                { name: "Polars: سرعة مدهشة للبيانات الكبيرة", primary: "Polars high-performance dataframes" },
                { name: "Lazy Evaluation في Polars وDask", primary: "lazy evaluation optimization" },
                { name: "معالجة ملفات Parquet الضخمة بكفاءة", primary: "efficient Parquet file processing" },
                { name: "Chunked Processing: معالجة ملفات CSV ضخمة", primary: "chunked processing for large CSV files" },
                { name: "مشروع: تحليل مجموعة بيانات 10GB بـDask", primary: "10GB dataset analysis with Dask" }
              ]
            },
            {
              unit_index: 6, code: "2.5.6",
              name: "بيانات الصور والصوت كميزات",
              goal: "استخراج الميزات من بيانات الصور والصوت للنمذجة",
              key_concepts: ["Image Features","Audio Features","CNN Features","MFCC","Transfer Features"],
              lessons: [
                { name: "استخراج ميزات الصور بـCNN مُدرَّبة مسبقاً", primary: "CNN feature extraction with pre-trained models" },
                { name: "ميزات Texture وEdge وGradient من الصور", primary: "handcrafted image features HOG SIFT" },
                { name: "MFCC: الميزات الصوتية الأساسية للكلام", primary: "MFCC audio feature extraction" },
                { name: "Spectrogram وMel-Spectrogram كميزات", primary: "spectrogram mel-spectrogram features" },
                { name: "OpenL3 وVGGish: تضمينات الصوت العميقة", primary: "deep audio embeddings" },
                { name: "Librosa: معالجة الصوت بـPython", primary: "Librosa audio processing" },
                { name: "CLIP: تضمينات موحدة للصور والنصوص", primary: "CLIP embeddings for vision language" },
                { name: "Multimodal Features: دمج الصور والنص", primary: "multimodal feature fusion" },
                { name: "مشروع: نظام تصنيف صوتي لمشاعر الكلام", primary: "speech emotion recognition project" }
              ]
            },
            {
              unit_index: 7, code: "2.5.7",
              name: "أتمتة هندسة الميزات AutoML",
              goal: "استخدام أدوات AutoML لتسريع هندسة الميزات وبناء النماذج",
              key_concepts: ["AutoSklearn","H2O AutoML","TPOT","FLAML","Feature Selection Auto"],
              lessons: [
                { name: "AutoML: الأتمتة الكاملة والنقدية", primary: "AutoML landscape and limitations" },
                { name: "Auto-sklearn: Bayesian Optimization للـML", primary: "Auto-sklearn automated machine learning" },
                { name: "H2O AutoML: تسريع النمذجة في المؤسسات", primary: "H2O AutoML for enterprise" },
                { name: "TPOT: التحسين التطوري للـPipelines", primary: "TPOT genetic programming for pipelines" },
                { name: "FLAML: AutoML السريع من Microsoft", primary: "FLAML fast automated machine learning" },
                { name: "PyCaret: AutoML منخفض الكود", primary: "PyCaret low-code AutoML" },
                { name: "Neural Architecture Search NAS", primary: "neural architecture search methods" },
                { name: "متى تثق بـAutoML ومتى تكتب يدوياً", primary: "AutoML trust and human override" },
                { name: "مشروع: مقارنة AutoML يدوياً مقابل خبرة بشرية", primary: "AutoML vs manual comparison benchmark" }
              ]
            },
            {
              unit_index: 8, code: "2.5.8",
              name: "بيانات مصادر متعددة الوسائط",
              goal: "بناء نماذج متعددة الوسائط تجمع النص والصور والبيانات الجدولية",
              key_concepts: ["Multimodal Fusion","Late Fusion","Early Fusion","CLIP","Multi-Input Models"],
              lessons: [
                { name: "Multimodal Learning: مجال الدمج", primary: "multimodal learning overview" },
                { name: "Early Fusion: دمج البيانات في المدخلات", primary: "early fusion strategies" },
                { name: "Late Fusion: دمج التنبؤات من نماذج مستقلة", primary: "late fusion ensemble strategies" },
                { name: "Intermediate Fusion: طبقات الدمج الوسطى", primary: "intermediate fusion in neural networks" },
                { name: "CLIP وFLAMINGO: رؤية-لغة الكبرى", primary: "CLIP FLAMINGO vision language models" },
                { name: "نماذج متعددة المدخلات بـPyTorch", primary: "multi-input neural network architecture" },
                { name: "دمج النص والصور والبيانات الجدولية", primary: "text image tabular fusion" },
                { name: "تقييم النماذج متعددة الوسائط", primary: "multimodal model evaluation" },
                { name: "مشروع: نظام توصيات منتجات بنص وصورة", primary: "product recommendation with text and image" }
              ]
            },
            {
              unit_index: 9, code: "2.5.9",
              name: "هندسة ميزات للبيانات الجغرافية",
              goal: "استخراج ميزات ذات قيمة من البيانات المكانية والجغرافية",
              key_concepts: ["Geo Features","H3 Hexagons","Distance Features","POI Features","Spatial Clustering"],
              lessons: [
                { name: "الإحداثيات كميزات: التحويلات الأساسية", primary: "coordinate transformation features" },
                { name: "H3: تقسيم الأرض لخلايا سداسية", primary: "H3 hexagonal spatial indexing" },
                { name: "ميزات المسافة: إلى أقرب نقطة اهتمام", primary: "distance to POI spatial features" },
                { name: "Geohash: ترميز الإحداثيات للنمذجة", primary: "geohash encoding for ML" },
                { name: "نقاط الاهتمام POI: فئات الموقع كميزات", primary: "POI features for location context" },
                { name: "التجميع المكاني: DBSCAN جغرافياً", primary: "spatial clustering for geographic data" },
                { name: "ميزات الطريق والحركة: OSM وGPS", primary: "road network and movement features" },
                { name: "Raster Features: بيانات الأقمار الصناعية", primary: "satellite raster features" },
                { name: "مشروع: نموذج تنبؤ أسعار عقارات بميزات جغرافية", primary: "real estate price prediction with geo features" }
              ]
            }
          ]
        },
        {
          stage_index: 6,
          name: "تقييم النماذج وتفسيرها",
          goal: "تقييم النماذج بصدق وتفسيرها بشفافية وإثبات موثوقيتها في الإنتاج",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.6.1",
              name: "التحقق من صحة النماذج بعمق",
              goal: "تصميم خطط تقييم صادقة تتجنب الفخاخ الشائعة",
              key_concepts: ["Nested CV","Temporal CV","Group CV","Benchmark","Baseline Models"],
              lessons: [
                { name: "فخاخ التقييم: الأخطاء الأكثر شيوعاً", primary: "model evaluation traps and mistakes" },
                { name: "Nested Cross Validation: التقييم الموضوعي", primary: "nested cross validation for unbiased estimates" },
                { name: "Group K-Fold: منع تسرّب المجموعات", primary: "group k-fold for grouped data" },
                { name: "Temporal Cross Validation: الزمن يُهم", primary: "temporal cross validation strategies" },
                { name: "Statistical Testing: هل التحسين حقيقي؟", primary: "statistical tests for model comparison" },
                { name: "Baseline Models: ماذا يُقيّم بياناتك؟", primary: "baseline model selection" },
                { name: "Benchmark Datasets: المقارنة بالعالم", primary: "benchmark datasets for model comparison" },
                { name: "مطابقة التوزيع: هل بيانات الاختبار عادلة؟", primary: "test distribution matching" },
                { name: "مشروع: تصميم خطة تقييم لنظام توصيات", primary: "recommendation system evaluation plan" }
              ]
            },
            {
              unit_index: 2, code: "2.6.2",
              name: "SHAP وتفسير النماذج",
              goal: "تفسير قرارات النماذج بطرق رياضية صارمة تُقنع المستخدمين",
              key_concepts: ["SHAP Values","Shapley","Local Explanations","Global Explanations","SHAP Plots"],
              lessons: [
                { name: "نظرية Shapley: العدالة في توزيع الأهمية", primary: "Shapley values game theory" },
                { name: "SHAP: حساب قيم Shapley بكفاءة", primary: "SHAP efficient computation" },
                { name: "TreeSHAP: SHAP لأشجار القرار و Boosting", primary: "TreeSHAP for tree-based models" },
                { name: "KernelSHAP وDeepSHAP: للنماذج الأخرى", primary: "KernelSHAP DeepSHAP methods" },
                { name: "SHAP Summary Plots: الصورة الكاملة", primary: "SHAP summary and importance plots" },
                { name: "SHAP Dependency Plots: كيف تؤثر الميزة؟", primary: "SHAP dependency and interaction plots" },
                { name: "SHAP Force Plots: تفسير قرار واحد", primary: "SHAP force plots for individual explanation" },
                { name: "SHAP للتشخيص وإيجاد الأخطاء", primary: "SHAP for model debugging" },
                { name: "مشروع: تقرير شفافية نموذج ائتماني بـSHAP", primary: "credit model transparency with SHAP" }
              ]
            },
            {
              unit_index: 3, code: "2.6.3",
              name: "LIME وتفسيرات محلية",
              goal: "تفسير قرارات النماذج محلياً لكل تنبؤ",
              key_concepts: ["LIME","Local Surrogate","Anchor","ICE Plots","Counterfactual"],
              lessons: [
                { name: "LIME: تقريب النموذج محلياً بنموذج خطي", primary: "LIME local interpretable model-agnostic" },
                { name: "LIME للصور: تفسير بيكسل بيكسل", primary: "LIME for image classification explanation" },
                { name: "LIME للنصوص: الكلمات الأهم", primary: "LIME for text classification explanation" },
                { name: "Anchors: قواعد IF-THEN محلية", primary: "anchor explanations for prediction rules" },
                { name: "ICE Plots: تأثير ميزة واحدة لكل صف", primary: "individual conditional expectation plots" },
                { name: "Partial Dependence Plots المتقدمة", primary: "advanced PDP for feature effects" },
                { name: "Counterfactual Explanations: ماذا لو تغيّر X؟", primary: "counterfactual explanations DiCE" },
                { name: "الأثر السببي Causal Effect: ما وراء الارتباط", primary: "causal effect estimation" },
                { name: "مشروع: تفسير قرار رفض قرض بـLIME وCounterfactual", primary: "loan rejection explanation with LIME" }
              ]
            },
            {
              unit_index: 4, code: "2.6.4",
              name: "الإنصاف والتحيز في النماذج",
              goal: "قياس التحيز في النماذج وتطبيق إجراءات تصحيحه",
              key_concepts: ["Fairness Metrics","Disparate Impact","Equal Opportunity","Calibration","Debiasing"],
              lessons: [
                { name: "تحيز النموذج: من أين يأتي ولماذا يُهم", primary: "model bias sources and consequences" },
                { name: "مقاييس الإنصاف: Demographic Parity وEO", primary: "fairness metrics comparison" },
                { name: "Disparate Impact: الأثر غير المتوازن", primary: "disparate impact analysis" },
                { name: "Equal Opportunity: الفرص المتساوية", primary: "equal opportunity fairness criterion" },
                { name: "معايرة النموذج Calibration عبر المجموعات", primary: "model calibration across demographic groups" },
                { name: "Debiasing: ما قبل وما أثناء وما بعد النموذج", primary: "debiasing pre in post processing" },
                { name: "Aequitas وFairlearn: أدوات الإنصاف", primary: "Aequitas Fairlearn fairness tools" },
                { name: "التوثيق الأخلاقي: Model Cards وDatasheets", primary: "Model Cards and Datasheets for Datasets" },
                { name: "مشروع: تدقيق نموذج بشائع في نظام توظيف", primary: "hiring system fairness audit" }
              ]
            },
            {
              unit_index: 5, code: "2.6.5",
              name: "نماذج القرار القابلة للفهم",
              goal: "بناء نماذج inherently interpretable لتطبيقات الرعاية الصحية والمال",
              key_concepts: ["Decision Rules","Logistic Regression Interpretation","Scorecards","EBM","RuleFit"],
              lessons: [
                { name: "الأرقام القياسية Scorecards: النموذج القابل للفهم", primary: "scorecard models for credit risk" },
                { name: "EBM: Explainable Boosting Machine", primary: "explainable boosting machine EBM" },
                { name: "RuleFit: قواعد من نماذج معقدة", primary: "RuleFit interpretable rule extraction" },
                { name: "Decision Rules: قواعد IF-THEN مباشرة", primary: "decision rule learning algorithms" },
                { name: "Monotone Constraints: فرض المنطق على النموذج", primary: "monotone constraints in XGBoost LightGBM" },
                { name: "GAM للتفسير: الإضافية مقابل التضمين", primary: "GAM for interpretable nonlinear models" },
                { name: "Bayesian Linear Models: الحدود مع الثقة", primary: "Bayesian linear models for interpretability" },
                { name: "Trade-Off: الدقة مقابل التفسيرية", primary: "accuracy interpretability trade-off" },
                { name: "مشروع: نموذج ائتمان قابل للفهم بالكامل", primary: "fully interpretable credit scoring model" }
              ]
            },
            {
              unit_index: 6, code: "2.6.6",
              name: "مراقبة النماذج في الإنتاج",
              goal: "إنشاء نظام مراقبة شامل لأداء النماذج في بيئة الإنتاج",
              key_concepts: ["Data Drift","Concept Drift","Model Degradation","Monitoring Dashboard","Alerting"],
              lessons: [
                { name: "انجراف البيانات Data Drift: التشخيص والكشف", primary: "data drift detection methods" },
                { name: "انجراف المفهوم Concept Drift: تغير العلاقات", primary: "concept drift and model retraining" },
                { name: "مراقبة دقة النموذج: متى يتدهور؟", primary: "model performance monitoring" },
                { name: "PSI وJSD: مقاييس انجراف التوزيع", primary: "PSI JSD for distribution drift" },
                { name: "Evidently AI: مراقبة النماذج مفتوحة المصدر", primary: "Evidently AI for model monitoring" },
                { name: "Arize وWhylogs: منصات مراقبة المؤسسات", primary: "enterprise model monitoring platforms" },
                { name: "إعادة التدريب التلقائي: متى وكيف", primary: "automated retraining triggers and strategies" },
                { name: "Canary Deployments لتحديثات النماذج", primary: "canary deployment for model updates" },
                { name: "مشروع: نظام مراقبة نموذج في الإنتاج", primary: "production model monitoring system" }
              ]
            },
            {
              unit_index: 7, code: "2.6.7",
              name: "اختبار النماذج والتحقق الصارم",
              goal: "اختبار النماذج بصرامة قبل الإنتاج لمنع الفشل المتوقع وغير المتوقع",
              key_concepts: ["Behavioral Testing","Slice-Based Testing","Adversarial Testing","Invariance Tests","Stress Testing"],
              lessons: [
                { name: "Behavioral Testing: ماذا يجب أن يفعل النموذج؟", primary: "behavioral testing for ML models" },
                { name: "Slice-Based Testing: الأداء على شرائح البيانات", primary: "slice-based model evaluation" },
                { name: "Adversarial Testing: مدخلات مصمّمة للفشل", primary: "adversarial testing for model robustness" },
                { name: "Invariance Tests: ما يجب ألا يُغيّر النتيجة", primary: "invariance tests for model consistency" },
                { name: "Minimum Functionality Tests", primary: "minimum functionality tests for ML" },
                { name: "Stress Testing: حدود النموذج والاستخدام القصوى", primary: "stress testing for model limits" },
                { name: "Regression Testing للنماذج المُحدَّثة", primary: "regression testing for model updates" },
                { name: "Pytest للنماذج: أتمتة اختبار ML", primary: "pytest for ML model testing" },
                { name: "مشروع: مجموعة اختبار شاملة لنموذج تصنيف", primary: "comprehensive ML test suite project" }
              ]
            },
            {
              unit_index: 8, code: "2.6.8",
              name: "A/B Testing للنماذج في الإنتاج",
              goal: "إجراء تجارب A/B صارمة للنماذج في بيئة الإنتاج",
              key_concepts: ["Online A/B Test","Multi-Armed Bandit","Thompson Sampling","Interleaving","Experiment Platform"],
              lessons: [
                { name: "A/B Test للنماذج: الفرق عن اختبار الميزات", primary: "A/B testing for ML models" },
                { name: "Multi-Armed Bandit: الاختبار والاستغلال المتزامن", primary: "multi-armed bandit for online optimization" },
                { name: "Thompson Sampling: الأسلوب البايزي للـMAB", primary: "Thompson Sampling for bandit algorithms" },
                { name: "Interleaving: مقارنة نموذجين على نفس المستخدم", primary: "interleaving for model comparison" },
                { name: "Holdout Groups: التحكم الصارم في التجارب", primary: "holdout groups for experiment control" },
                { name: "تصميم منصة التجارب الداخلية", primary: "internal experiment platform design" },
                { name: "مزالق A/B Testing: تصحيح المشاهدات المتعددة", primary: "A/B testing pitfalls and corrections" },
                { name: "Causal Inference من بيانات التجارب", primary: "causal inference from A/B test data" },
                { name: "مشروع: تجربة A/B كاملة لنموذجين توصية", primary: "complete A/B test for recommendation models" }
              ]
            },
            {
              unit_index: 9, code: "2.6.9",
              name: "توثيق النماذج والتوافق التنظيمي",
              goal: "توثيق النماذج بمعايير المؤسسات والتوافق مع اللوائح التنظيمية",
              key_concepts: ["Model Cards","Datasheets","GDPR","CCPA","AI Act Compliance"],
              lessons: [
                { name: "Model Cards: التوثيق الموحّد لنماذج ML", primary: "model cards for model documentation" },
                { name: "Datasheets for Datasets: توثيق البيانات", primary: "datasheets for datasets documentation" },
                { name: "GDPR والذكاء الاصطناعي: الحق في التفسير", primary: "GDPR AI compliance right to explanation" },
                { name: "EU AI Act: تصنيف مخاطر الذكاء الاصطناعي", primary: "EU AI Act risk classification" },
                { name: "CCPA وحماية البيانات في الولايات المتحدة", primary: "CCPA data privacy in machine learning" },
                { name: "توثيق أداء النموذج والقيود", primary: "model performance documentation and limitations" },
                { name: "عمليات تدقيق الذكاء الاصطناعي AI Audit", primary: "AI audit processes and frameworks" },
                { name: "نظام إدارة الذكاء الاصطناعي: ISO 42001", primary: "ISO 42001 AI management system" },
                { name: "مشروع: توثيق نموذج توظيف بمعايير EU AI Act", primary: "EU AI Act compliant hiring model documentation" }
              ]
            }
          ]
        },
        {
          stage_index: 7,
          name: "هندسة البيانات وأنابيب البيانات",
          goal: "بناء أنابيب بيانات موثوقة وقابلة للتوسع لتغذية نماذج الإنتاج",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "2.7.1",
              name: "Airflow: تنسيق أنابيب البيانات",
              goal: "بناء وجدولة ومراقبة أنابيب بيانات معقدة بـApache Airflow",
              key_concepts: ["DAG","Operators","Task Dependencies","Scheduling","XCom"],
              lessons: [
                { name: "Airflow: المفهوم والمعمارية الأساسية", primary: "Apache Airflow architecture concepts" },
                { name: "DAG: تعريف الرسم البياني للأنبوب", primary: "DAG definition and configuration" },
                { name: "Operators: مكتبة المهام الجاهزة", primary: "Airflow operators catalog" },
                { name: "Task Dependencies وتتابع التنفيذ", primary: "task dependencies in Airflow" },
                { name: "Scheduling: الجداول الزمنية المرنة", primary: "Airflow scheduling cron and sensors" },
                { name: "XCom: تمرير البيانات بين المهام", primary: "XCom for inter-task communication" },
                { name: "Sensors: الانتظار لأحداث خارجية", primary: "Airflow sensors for external events" },
                { name: "مراقبة الأنابيب وتنبيه الأعطال", primary: "Airflow monitoring and alerting" },
                { name: "مشروع: أنبوب ETL يومي بـAirflow", primary: "daily ETL pipeline with Airflow" }
              ]
            },
            {
              unit_index: 2, code: "2.7.2",
              name: "معالجة البيانات الدفعية بـSpark",
              goal: "معالجة البيانات الضخمة بـApache Spark بكفاءة عالية",
              key_concepts: ["RDD","DataFrame Spark","Transformations","Actions","SparkML"],
              lessons: [
                { name: "Spark: المعمارية والـDriver والـExecutors", primary: "Spark architecture driver executor" },
                { name: "RDD: البدائية الأساسية للبيانات الموزعة", primary: "Spark RDD fundamentals" },
                { name: "Spark DataFrame: API العالي المستوى", primary: "Spark DataFrame SQL interface" },
                { name: "Transformations وActions: Lazy Evaluation", primary: "Spark lazy evaluation transformations actions" },
                { name: "Spark SQL: SQL على البيانات الموزعة", primary: "Spark SQL for distributed analytics" },
                { name: "SparkML: التعلم الآلي الموزع", primary: "SparkML for distributed machine learning" },
                { name: "Spark Streaming: المعالجة شبه الفورية", primary: "Spark Structured Streaming" },
                { name: "تحسين أداء Spark: Partitioning وCaching", primary: "Spark performance optimization" },
                { name: "مشروع: تحليل سجلات ويب ضخمة بـSpark", primary: "large-scale web log analysis with Spark" }
              ]
            },
            {
              unit_index: 3, code: "2.7.3",
              name: "معالجة البيانات الآنية بـKafka",
              goal: "بناء أنابيب بيانات آنية لمعالجة الأحداث في الوقت الفعلي",
              key_concepts: ["Topics","Producers","Consumers","Consumer Groups","Stream Processing"],
              lessons: [
                { name: "Kafka: نظام الرسائل للبيانات الآنية", primary: "Apache Kafka architecture fundamentals" },
                { name: "Topics وPartitions وOffsets: البنية الأساسية", primary: "Kafka topics partitions offsets" },
                { name: "Producers: إرسال الأحداث بكفاءة", primary: "Kafka producers and delivery guarantees" },
                { name: "Consumers وConsumer Groups: القراءة الموزعة", primary: "Kafka consumers and consumer groups" },
                { name: "Kafka Streams: المعالجة المدمجة", primary: "Kafka Streams for stream processing" },
                { name: "Flink: معالجة البيانات الآنية المتقدمة", primary: "Apache Flink stream processing" },
                { name: "Schema Registry وAvro وProtobuf", primary: "Kafka schema registry Avro" },
                { name: "Kafka Connect: التكامل مع مصادر البيانات", primary: "Kafka Connect for data integration" },
                { name: "مشروع: خط أنابيب أحداث فورية للمعاملات", primary: "real-time transaction event pipeline" }
              ]
            },
            {
              unit_index: 4, code: "2.7.4",
              name: "بناء Data Lake وLakehouse",
              goal: "تصميم وبناء Data Lake موحّد للبيانات المنظمة وغير المنظمة",
              key_concepts: ["Data Lake","Delta Lake","Medallion Architecture","Iceberg","Data Catalog"],
              lessons: [
                { name: "Data Lake vs Data Warehouse: متى كل منهما", primary: "data lake vs warehouse comparison" },
                { name: "Delta Lake: موثوقية قاعدة البيانات في Data Lake", primary: "Delta Lake ACID transactions" },
                { name: "Medallion Architecture: Bronze وSilver وGold", primary: "medallion architecture design" },
                { name: "Apache Iceberg: تنسيق الجداول المفتوحة", primary: "Apache Iceberg for open table format" },
                { name: "Apache Hudi: إدارة تدفق البيانات في Lake", primary: "Apache Hudi incremental data processing" },
                { name: "Data Catalog: فهرسة بيانات Lake", primary: "data catalog for data lake discoverability" },
                { name: "Unity Catalog: حوكمة البيانات الموحدة", primary: "Databricks Unity Catalog" },
                { name: "Lakehouse Architecture: أفضل العالمين", primary: "Lakehouse combining lake and warehouse" },
                { name: "مشروع: بناء Lakehouse صغير بـDelta Lake وAirflow", primary: "small-scale Lakehouse with Delta Lake" }
              ]
            },
            {
              unit_index: 5, code: "2.7.5",
              name: "ETL والتحويل الحديث",
              goal: "بناء خطوط ETL/ELT موثوقة وقابلة للصيانة",
              key_concepts: ["dbt","ELT vs ETL","Data Transformation","Tests","Documentation dbt"],
              lessons: [
                { name: "ELT مقابل ETL: التحول للسحابة", primary: "ELT vs ETL modern data stack" },
                { name: "dbt: تحويل البيانات SQL باحترافية", primary: "dbt for SQL-based data transformation" },
                { name: "dbt Models وRefs: البناء المنظّم", primary: "dbt models and ref dependencies" },
                { name: "dbt Tests: التحقق التلقائي من البيانات", primary: "dbt tests for data quality" },
                { name: "dbt Documentation: الكود الموثَّق", primary: "dbt documentation and data catalog" },
                { name: "dbt Seeds وSnapshots وExposures", primary: "dbt seeds snapshots exposures" },
                { name: "Great Expectations مع dbt: جودة مضاعفة", primary: "Great Expectations integration with dbt" },
                { name: "Modern Data Stack: dbt+Airflow+Snowflake", primary: "modern data stack architecture" },
                { name: "مشروع: خط تحويل بيانات بـdbt على مستودع بيانات", primary: "dbt data transformation pipeline" }
              ]
            },
            {
              unit_index: 6, code: "2.7.6",
              name: "API وخدمات البيانات",
              goal: "تصميم وبناء واجهات برمجية لخدمات البيانات",
              key_concepts: ["FastAPI","REST API Design","GraphQL","Pagination","Rate Limiting"],
              lessons: [
                { name: "FastAPI: بناء APIs بيانية بالسرعة والدقة", primary: "FastAPI for data services" },
                { name: "REST API Design للبيانات: أفضل الممارسات", primary: "REST API design for data endpoints" },
                { name: "Pydantic: التحقق من المدخلات والمخرجات", primary: "Pydantic for data validation in APIs" },
                { name: "GraphQL: API مرن لاستعلامات البيانات", primary: "GraphQL for flexible data queries" },
                { name: "Pagination وFiltering وSorting", primary: "API pagination filtering sorting patterns" },
                { name: "Rate Limiting وCaching لـAPIs البيانات", primary: "rate limiting and caching for data APIs" },
                { name: "Background Tasks وCelery: المهام الطويلة", primary: "background tasks with Celery" },
                { name: "API Versioning وBackward Compatibility", primary: "API versioning strategies" },
                { name: "مشروع: API خدمة بيانات لتطبيق تحليلي", primary: "data service API for analytics application" }
              ]
            },
            {
              unit_index: 7, code: "2.7.7",
              name: "Docker وبيئات البيانات القابلة للاستنساخ",
              goal: "استخدام Docker لضمان استنساخية بيئات علوم البيانات",
              key_concepts: ["Dockerfile","Docker Compose","Volume","Network","Multi-Stage Build"],
              lessons: [
                { name: "Docker لعلوم البيانات: لماذا يُهم", primary: "Docker for data science reproducibility" },
                { name: "Dockerfile: بناء صورة بيئة بيانات", primary: "Dockerfile for data science environment" },
                { name: "Docker Compose: خدمات متعددة معاً", primary: "Docker Compose for multi-service setup" },
                { name: "Volumes وحفظ البيانات في Containers", primary: "Docker volumes for data persistence" },
                { name: "Multi-Stage Build: صور خفيفة للإنتاج", primary: "multi-stage Docker build for production" },
                { name: "Docker Registry: رفع الصور ومشاركتها", primary: "Docker registry and image management" },
                { name: "Jupyter في Docker: البيئة التفاعلية المعزولة", primary: "Jupyter in Docker containers" },
                { name: "GPU في Docker: CUDA وnvidia-docker", primary: "GPU Docker containers for deep learning" },
                { name: "مشروع: بيئة علوم بيانات كاملة بـDocker Compose", primary: "complete data science environment with Docker" }
              ]
            },
            {
              unit_index: 8, code: "2.7.8",
              name: "جودة البيانات والحوكمة في الأنابيب",
              goal: "دمج ضمان الجودة في كل مرحلة من مراحل أنبوب البيانات",
              key_concepts: ["Data Quality Checks","SLA","Data Observability","Lineage","OpenMetadata"],
              lessons: [
                { name: "جودة البيانات في الأنابيب: نقاط الفحص", primary: "data quality checkpoints in pipelines" },
                { name: "SLA للأنابيب: الموثوقية كهدف قابل للقياس", primary: "SLA for data pipelines" },
                { name: "Data Observability: رؤية ما يحدث في الأنابيب", primary: "data observability platforms" },
                { name: "Data Lineage: تتبع أصل كل رقم", primary: "data lineage tracking in pipelines" },
                { name: "OpenMetadata وDataHub: فهرسة المؤسسات", primary: "OpenMetadata DataHub for data catalog" },
                { name: "Monte Carlo: منصة Data Observability", primary: "Monte Carlo data observability" },
                { name: "Incident Management لأنابيب البيانات", primary: "data pipeline incident management" },
                { name: "Soda.io: فحص جودة البيانات التلقائي", primary: "Soda for automated data quality" },
                { name: "مشروع: إطار مراقبة جودة لأنبوب بيانات إنتاجي", primary: "production pipeline quality monitoring" }
              ]
            },
            {
              unit_index: 9, code: "2.7.9",
              name: "مشروع هندسة بيانات شامل",
              goal: "بناء منظومة هندسة بيانات متكاملة من المصدر إلى لوحة القيادة",
              key_concepts: ["End-to-End Pipeline","Ingestion","Storage","Transform","Serving"],
              lessons: [
                { name: "تصميم معمارية بيانات المؤسسة", primary: "enterprise data architecture design" },
                { name: "Ingestion Layer: جمع البيانات من كل مكان", primary: "data ingestion layer design" },
                { name: "Storage Layer: تنظيم Data Lake بـMedallion", primary: "data lake storage layer" },
                { name: "Transformation Layer: dbt فوق Spark", primary: "transformation layer dbt and Spark" },
                { name: "Serving Layer: API وDW للتقارير", primary: "data serving layer design" },
                { name: "Orchestration: Airflow لكل الطبقات", primary: "orchestration with Airflow" },
                { name: "Monitoring: جودة ومراقبة شاملة", primary: "end-to-end monitoring" },
                { name: "التوثيق والـRunbook: من يُشغّل الأنبوب؟", primary: "data pipeline documentation and runbook" },
                { name: "مشروع نهائي: منظومة بيانات لشركة ناشئة", primary: "complete data platform for startup" }
              ]
            }
          ]
        }
      ]
    },
    {
      level_index: 3,
      name: "علوم البيانات المتقدمة والقيادة",
      goal: "إتقان الحدود الأمامية لعلوم البيانات: LLMs وMLOps والسحابة وأخلاقيات AI وقيادة فرق البيانات",
      bloom_focus: "create",
      exam: { pass_threshold_percent: 75, time_limit_minutes: 90 },
      stages: [
        {
          stage_index: 1,
          name: "الذكاء الاصطناعي التوليدي ونماذج اللغة الكبيرة",
          goal: "إتقان LLMs من الأساسيات إلى الضبط الدقيق والنشر في التطبيقات",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 72, time_limit_minutes: 60 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "3.1.1",
              name: "أساسيات نماذج اللغة الكبيرة",
              goal: "فهم كيف تعمل LLMs من الـPre-training إلى الـInference",
              key_concepts: ["Tokenization LLM","Pre-Training","RLHF","Emergent Abilities","Scaling Laws"],
              lessons: [
                { name: "ما هي LLMs: الحجم والقدرات والحدود", primary: "large language models capabilities and limits" },
                { name: "Tokenization في LLMs: BPE وWordPiece وSentencePiece", primary: "LLM tokenization methods" },
                { name: "Pre-Training: التعلم من النص الضخم", primary: "LLM pre-training objectives" },
                { name: "قوانين التوسع Scaling Laws: أكبر يعني أفضل؟", primary: "LLM scaling laws Chinchilla" },
                { name: "RLHF: محاذاة النموذج مع القيم البشرية", primary: "RLHF for LLM alignment" },
                { name: "Emergent Abilities: القدرات المفاجئة", primary: "emergent abilities in large language models" },
                { name: "GPT وLLaMA وMistral: المقارنة والاختيار", primary: "LLM families comparison" },
                { name: "Inference: الأجهزة والتوليد الفعّال", primary: "LLM inference hardware and optimization" },
                { name: "مشروع: استكشاف وتقييم نموذج LLM مفتوح المصدر", primary: "open-source LLM exploration project" }
              ]
            },
            {
              unit_index: 2, code: "3.1.2",
              name: "Prompt Engineering المتقدم",
              goal: "إتقان فن وعلم هندسة التعليمات للحصول على أفضل النتائج من LLMs",
              key_concepts: ["Zero-Shot","Few-Shot","Chain-of-Thought","ReAct","Prompt Templates"],
              lessons: [
                { name: "Zero-Shot Prompting: بدون أمثلة", primary: "zero-shot prompting strategies" },
                { name: "Few-Shot Prompting: قوة الأمثلة", primary: "few-shot prompting with examples" },
                { name: "Chain-of-Thought: التفكير خطوة بخطوة", primary: "chain-of-thought prompting" },
                { name: "Self-Consistency: أكثر من مسار للإجابة", primary: "self-consistency for reasoning" },
                { name: "ReAct: التفكير والعمل معاً", primary: "ReAct reasoning and acting" },
                { name: "Tree of Thought: شجرة التفكير", primary: "tree of thought prompting" },
                { name: "System Prompts: هوية النموذج ودوره", primary: "system prompt design" },
                { name: "Prompt Injection وأمان التعليمات", primary: "prompt injection security" },
                { name: "مشروع: نظام Prompt Engineering لتحليل النصوص", primary: "prompt engineering system for text analysis" }
              ]
            },
            {
              unit_index: 3, code: "3.1.3",
              name: "Fine-Tuning نماذج اللغة الكبيرة",
              goal: "ضبط نماذج LLMs لمهام ونطاقات محددة بكفاءة",
              key_concepts: ["SFT","LoRA","QLoRA","PEFT","Instruction Tuning"],
              lessons: [
                { name: "متى تحتاج Fine-Tuning مقابل Prompting", primary: "fine-tuning vs prompting decision" },
                { name: "Supervised Fine-Tuning SFT: الأساس", primary: "supervised fine-tuning for LLMs" },
                { name: "LoRA: التكيّف بمصفوفات منخفضة الرتبة", primary: "LoRA low-rank adaptation" },
                { name: "QLoRA: الكفاءة بالضغط والـLoRA", primary: "QLoRA quantized fine-tuning" },
                { name: "PEFT: Parameter-Efficient Fine-Tuning", primary: "PEFT methods comparison" },
                { name: "Instruction Tuning: تعليم النموذج اتباع التعليمات", primary: "instruction tuning datasets" },
                { name: "DPO: تحسين التفضيل المباشر", primary: "direct preference optimization DPO" },
                { name: "بناء مجموعة بيانات Fine-Tuning مخصصة", primary: "fine-tuning dataset creation" },
                { name: "مشروع: ضبط نموذج LLM لمهمة عربية محددة", primary: "Arabic task LLM fine-tuning project" }
              ]
            },
            {
              unit_index: 4, code: "3.1.4",
              name: "LangChain وبناء التطبيقات بـLLMs",
              goal: "بناء تطبيقات ذكية معقدة فوق نماذج اللغة الكبيرة",
              key_concepts: ["LangChain","Chains","Agents","Memory","Tools"],
              lessons: [
                { name: "LangChain: الإطار الأكثر شيوعاً لتطبيقات LLM", primary: "LangChain framework overview" },
                { name: "Chains: تسلسل العمليات في LangChain", primary: "LangChain chains and pipelines" },
                { name: "Memory: ذاكرة المحادثة في التطبيقات", primary: "LangChain memory types" },
                { name: "Agents: LLM يقرر ما يفعل بعد ذلك", primary: "LangChain agents and tool use" },
                { name: "Tools: ربط LLM بالعالم الخارجي", primary: "LangChain tools and custom tools" },
                { name: "LangGraph: تدفقات اتخاذ القرار المعقدة", primary: "LangGraph for complex agentic workflows" },
                { name: "LlamaIndex: RAG المتقدم للوثائق", primary: "LlamaIndex for advanced RAG" },
                { name: "Semantic Kernel: Microsoft's LLM Framework", primary: "Semantic Kernel for enterprise LLM" },
                { name: "مشروع: مساعد ذكي للبحث في البيانات بـLangChain", primary: "data research assistant with LangChain" }
              ]
            },
            {
              unit_index: 5, code: "3.1.5",
              name: "الذكاء الاصطناعي التوليدي للبيانات",
              goal: "توليد بيانات اصطناعية وتحسين مجموعات البيانات بالذكاء الاصطناعي التوليدي",
              key_concepts: ["Synthetic Data","Data Augmentation LLM","Tabular Synthesis","CTGAN","Privacy Preserving"],
              lessons: [
                { name: "البيانات الاصطناعية: الحل لشُح البيانات", primary: "synthetic data generation motivation" },
                { name: "CTGAN وTVAE: الجداول الاصطناعية بـGAN", primary: "CTGAN TVAE for tabular synthesis" },
                { name: "Gaussian Copula لتوليد البيانات الجدولية", primary: "Gaussian Copula synthetic data" },
                { name: "LLMs لتوليد بيانات التدريب", primary: "LLM for training data generation" },
                { name: "البيانات الاصطناعية مع الحفاظ على الخصوصية", primary: "privacy-preserving synthetic data" },
                { name: "Differential Privacy: حماية بيانات الأفراد", primary: "differential privacy for data synthesis" },
                { name: "تقييم البيانات الاصطناعية: Fidelity وPrivacy", primary: "synthetic data evaluation metrics" },
                { name: "Gretel AI وMostly AI: منصات البيانات الاصطناعية", primary: "synthetic data platforms comparison" },
                { name: "مشروع: توليد بيانات صحية اصطناعية للبحث", primary: "synthetic medical data generation project" }
              ]
            },
            {
              unit_index: 6, code: "3.1.6",
              name: "نماذج الرؤية اللغوية الكبيرة VLMs",
              goal: "العمل مع نماذج تجمع الرؤية واللغة في تطبيقات متعددة الوسائط",
              key_concepts: ["CLIP","LLaVA","GPT-4V","Vision Encoder","Multimodal RAG"],
              lessons: [
                { name: "CLIP: ربط الصور والنصوص بتضمين مشترك", primary: "CLIP contrastive vision language" },
                { name: "LLaVA وMiniGPT: نماذج VLM مفتوحة", primary: "LLaVA MiniGPT open VLM models" },
                { name: "GPT-4V وGemini Pro Vision: التجارية", primary: "commercial VLM APIs" },
                { name: "Image-to-Text: التعليق على الصور تلقائياً", primary: "image captioning with VLMs" },
                { name: "Visual Question Answering VQA", primary: "visual question answering" },
                { name: "Multimodal RAG: مستندات ذات صور ونص", primary: "multimodal RAG for documents" },
                { name: "Document Understanding: فهم وثائق PDF ومعقدة", primary: "document understanding with VLMs" },
                { name: "Optical Character Recognition بـVLMs", primary: "OCR with vision language models" },
                { name: "مشروع: نظام تحليل فواتير بنموذج VLM", primary: "invoice analysis system with VLM" }
              ]
            },
            {
              unit_index: 7, code: "3.1.7",
              name: "الذكاء الاصطناعي الموجّه بالوكلاء",
              goal: "بناء أنظمة وكيل ذكية تُنجز مهام معقدة باستقلالية",
              key_concepts: ["AI Agents","Multi-Agent","Tool Use","Planning","AutoGPT"],
              lessons: [
                { name: "AI Agents: من السؤال والجواب للفعل", primary: "AI agents autonomous action" },
                { name: "ReAct وPlan-and-Execute: معماريات الوكيل", primary: "agent architectures ReAct Plan-and-Execute" },
                { name: "Tool-Using Agents: الوكيل يستخدم الأدوات", primary: "tool-using agents for complex tasks" },
                { name: "Multi-Agent Systems: فرق من الوكلاء", primary: "multi-agent collaboration" },
                { name: "AutoGen: إطار الوكلاء المتعددة من Microsoft", primary: "AutoGen multi-agent framework" },
                { name: "CrewAI: فرق عمل وكلاء متخصصة", primary: "CrewAI agent teams" },
                { name: "تقييم الوكلاء: كيف تقيس نجاح الوكيل؟", primary: "agent evaluation benchmarks" },
                { name: "أمان الوكلاء: منع الأفعال الضارة", primary: "agent safety and guardrails" },
                { name: "مشروع: وكيل بيانات يحلل ويوصي تلقائياً", primary: "autonomous data analysis agent" }
              ]
            },
            {
              unit_index: 8, code: "3.1.8",
              name: "تقييم LLMs وضمان الجودة",
              goal: "تقييم نماذج اللغة بمقاييس شاملة ومراقبة الانحرافات والهلوسة",
              key_concepts: ["Hallucination","RAGAS","LLM Eval","Faithfulness","TruthfulQA"],
              lessons: [
                { name: "هلوسة LLMs: المشكلة والأسباب والتأثير", primary: "LLM hallucination problem" },
                { name: "RAGAS: تقييم أنظمة RAG تلقائياً", primary: "RAGAS evaluation for RAG systems" },
                { name: "LLM-as-Judge: نموذج يقيّم نموذجاً", primary: "LLM as judge evaluation" },
                { name: "TruthfulQA: قياس الصدق في إجابات LLMs", primary: "TruthfulQA benchmark" },
                { name: "مقاييس BLEU وROUGE وBERTScore للتوليد", primary: "generation quality metrics" },
                { name: "Groundedness وFaithfulness في RAG", primary: "groundedness faithfulness metrics" },
                { name: "Promptfoo وLangSmith: أتمتة اختبار LLMs", primary: "LLM testing automation tools" },
                { name: "مراقبة الانحراف في مخرجات LLMs", primary: "LLM output drift monitoring" },
                { name: "مشروع: نظام تقييم آلي لجودة مخرجات نموذج", primary: "automated LLM output quality evaluation" }
              ]
            },
            {
              unit_index: 9, code: "3.1.9",
              name: "نشر LLMs وتحسين الاستدلال",
              goal: "نشر نماذج LLMs بكفاءة مع تحسين سرعة الاستدلال وتخفيض التكلفة",
              key_concepts: ["Quantization","vLLM","TGI","Speculative Decoding","LLM Serving"],
              lessons: [
                { name: "Quantization: تخفيض دقة النموذج بذكاء", primary: "LLM quantization INT8 INT4" },
                { name: "GGUF وllama.cpp: LLMs محلياً على CPU", primary: "llama.cpp for CPU LLM inference" },
                { name: "vLLM: الاستدلال الفائق السرعة", primary: "vLLM PagedAttention for fast inference" },
                { name: "TGI: Text Generation Inference من HuggingFace", primary: "TGI for production LLM serving" },
                { name: "Speculative Decoding: توليد أسرع بنموذجين", primary: "speculative decoding for faster generation" },
                { name: "Batching والـConcurrency في خدمة LLMs", primary: "batching strategies for LLM serving" },
                { name: "OpenAI-Compatible API: بناء خادم LLM", primary: "OpenAI compatible API server" },
                { name: "تكلفة الاستدلال: التحسين في الميزانية", primary: "LLM inference cost optimization" },
                { name: "مشروع: نشر LLM مفتوح على خادم إنتاجي", primary: "open-source LLM production deployment" }
              ]
            }
          ]
        },
        {
          stage_index: 2,
          name: "الرؤية الحاسوبية المتقدمة",
          goal: "إتقان الرؤية الحاسوبية من الكشف عن الأشياء إلى التجزئة والنماذج الأساسية",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 72, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "3.2.1",
              name: "كشف الأشياء الحديث",
              goal: "بناء نماذج كشف أشياء دقيقة وسريعة للتطبيقات الإنتاجية",
              key_concepts: ["YOLO","Anchor-Free","Feature Pyramid","NMS","mAP"],
              lessons: [
                { name: "تطور كشف الأشياء: من R-CNN لـYOLOv8", primary: "object detection evolution history" },
                { name: "YOLO معمارية: الشبكة في عمق", primary: "YOLO architecture deep dive" },
                { name: "YOLOv8 وYOLOv9: الحديث والأداء", primary: "YOLOv8 YOLOv9 architecture and training" },
                { name: "Anchor-Free Detection: الجيل الجديد", primary: "anchor-free object detection" },
                { name: "Feature Pyramid Networks FPN: تعدد المقاييس", primary: "feature pyramid networks for detection" },
                { name: "Non-Maximum Suppression NMS وتطوره", primary: "NMS and soft NMS variants" },
                { name: "mAP وIoU: تقييم كشف الأشياء", primary: "mAP and IoU for detection evaluation" },
                { name: "Data Augmentation للكشف: Mosaic وCutMix", primary: "detection data augmentation strategies" },
                { name: "مشروع: كشف عيوب المنتجات في خط إنتاج", primary: "product defect detection system" }
              ]
            },
            {
              unit_index: 2, code: "3.2.2",
              name: "تجزئة الصور Segmentation",
              goal: "إتقان تجزئة الصور دلالياً وبالحالة للتطبيقات الطبية والصناعية",
              key_concepts: ["Semantic Segmentation","Instance Segmentation","U-Net","Mask R-CNN","SAM"],
              lessons: [
                { name: "التجزئة الدلالية مقابل التجزئة بالحالة", primary: "semantic vs instance segmentation" },
                { name: "U-Net: التجزئة الطبية الكلاسيكية", primary: "U-Net for medical image segmentation" },
                { name: "DeepLab وDilated Convolutions", primary: "DeepLab dilated convolution segmentation" },
                { name: "Mask R-CNN: الكشف والتجزئة معاً", primary: "Mask R-CNN for instance segmentation" },
                { name: "Panoptic Segmentation: الكل في واحد", primary: "panoptic segmentation unifying tasks" },
                { name: "Segment Anything SAM: التجزئة العامة", primary: "SAM Segment Anything Model" },
                { name: "مقاييس التجزئة: IoU وDice وBoundary F1", primary: "segmentation evaluation metrics" },
                { name: "Semi-Supervised Segmentation: قليل من التعليمات", primary: "semi-supervised segmentation" },
                { name: "مشروع: تجزئة صور أشعة الرئة طبياً", primary: "medical lung X-ray segmentation" }
              ]
            },
            {
              unit_index: 3, code: "3.2.3",
              name: "Vision Transformers وما بعدها",
              goal: "فهم وتطبيق نماذج Vision Transformer الحديثة",
              key_concepts: ["ViT","DeiT","Swin Transformer","DINO","MAE"],
              lessons: [
                { name: "Vision Transformer ViT: تقسيم الصورة لرُقع", primary: "ViT patch tokenization" },
                { name: "DeiT: تعليم ViT بدون بيانات ضخمة", primary: "DeiT data-efficient image transformers" },
                { name: "Swin Transformer: الانتباه الهرمي للصور", primary: "Swin Transformer hierarchical vision" },
                { name: "DINO: التعلم الذاتي للتمثيلات البصرية", primary: "DINO self-supervised vision" },
                { name: "MAE: إخفاء وإعادة بناء الصور", primary: "masked autoencoder for vision" },
                { name: "EVA وCLIP ViT: النماذج الأساسية للرؤية", primary: "EVA CLIP foundation vision models" },
                { name: "تسريع ViT: Efficient Attention وFlash Attention", primary: "ViT efficiency improvements" },
                { name: "مقارنة ViT مقابل CNN: متى كل منهما", primary: "ViT vs CNN comparison guide" },
                { name: "مشروع: Fine-Tuning Swin Transformer لتصنيف طبي", primary: "Swin Transformer medical classification" }
              ]
            },
            {
              unit_index: 4, code: "3.2.4",
              name: "تتبع الأشياء والفيديو",
              goal: "بناء أنظمة تتبع أشياء متعددة في مقاطع الفيديو",
              key_concepts: ["Object Tracking","ByteTrack","DeepSORT","Optical Flow","Action Recognition"],
              lessons: [
                { name: "تتبع الأشياء: المشكلة والتحديات", primary: "object tracking challenges" },
                { name: "DeepSORT: تتبع بالـRe-Identification", primary: "DeepSORT tracking algorithm" },
                { name: "ByteTrack: تتبع بكل نقاط الكشف", primary: "ByteTrack for multi-object tracking" },
                { name: "Optical Flow: حركة البيكسلات في الفيديو", primary: "optical flow for motion estimation" },
                { name: "Action Recognition: ماذا يفعل الشخص؟", primary: "action recognition in video" },
                { name: "SlowFast وVideoMAE: نماذج الفيديو الحديثة", primary: "SlowFast VideoMAE for video understanding" },
                { name: "تجزئة الفيديو الزمنية", primary: "temporal video segmentation" },
                { name: "SORT وOC-SORT: تتبع دون DeepReID", primary: "simple and OC-SORT trackers" },
                { name: "مشروع: نظام مراقبة بالرؤية الحاسوبية", primary: "surveillance system with object tracking" }
              ]
            },
            {
              unit_index: 5, code: "3.2.5",
              name: "توليد الصور والنماذج الانتشارية",
              goal: "فهم وتطبيق نماذج الانتشار لتوليد وتحرير الصور",
              key_concepts: ["Diffusion Models","Stable Diffusion","DDPM","ControlNet","Inpainting"],
              lessons: [
                { name: "نماذج الانتشار: إزالة الضجيج التكراري", primary: "diffusion models denoising process" },
                { name: "DDPM: خطوات التدريب والاستدلال", primary: "DDPM denoising diffusion probabilistic models" },
                { name: "Stable Diffusion: الانتشار في الفضاء الكامن", primary: "Stable Diffusion latent diffusion" },
                { name: "ControlNet: التحكم في التوليد بشروط", primary: "ControlNet for conditional generation" },
                { name: "Inpainting: ملء الفراغات في الصور", primary: "image inpainting with diffusion" },
                { name: "SDXL وSD3: التطور في النماذج الانتشارية", primary: "SDXL and SD3 improvements" },
                { name: "DreamBooth وTextual Inversion: تخصيص التوليد", primary: "DreamBooth Textual Inversion" },
                { name: "Video Diffusion: توليد مقاطع الفيديو", primary: "video generation with diffusion models" },
                { name: "مشروع: نظام توليد صور بـStable Diffusion API", primary: "image generation API with Stable Diffusion" }
              ]
            },
            {
              unit_index: 6, code: "3.2.6",
              name: "قياس العمق وإعادة بناء ثلاثي الأبعاد",
              goal: "استخراج المعلومات المكانية ثلاثية الأبعاد من الصور والفيديو",
              key_concepts: ["Depth Estimation","NeRF","3D Reconstruction","Point Clouds","SLAM"],
              lessons: [
                { name: "قياس العمق Monocular Depth Estimation", primary: "monocular depth estimation networks" },
                { name: "Stereo Vision: العمق من كاميرتين", primary: "stereo vision depth estimation" },
                { name: "Point Clouds: تمثيل البيانات ثلاثية الأبعاد", primary: "point cloud processing" },
                { name: "NeRF: إعادة بناء المشاهد ثلاثية الأبعاد", primary: "NeRF neural radiance fields" },
                { name: "Gaussian Splatting: البديل الأسرع لـNeRF", primary: "3D Gaussian Splatting" },
                { name: "SLAM: رسم الخرائط وتحديد الموقع", primary: "SLAM for robotics navigation" },
                { name: "PointNet وPointTransformer: تعلم على Point Clouds", primary: "PointNet for 3D point cloud learning" },
                { name: "3D Object Detection: الكشف في الفضاء ثلاثي الأبعاد", primary: "3D object detection for autonomous driving" },
                { name: "مشروع: نظام مسح ثلاثي الأبعاد بكاميرا عادية", primary: "3D scanning with single camera" }
              ]
            },
            {
              unit_index: 7, code: "3.2.7",
              name: "الرؤية الحاسوبية الطبية",
              goal: "تطبيق الرؤية الحاسوبية في التشخيص الطبي وتحليل الصور الطبية",
              key_concepts: ["Medical Imaging","DICOM","PathologyAI","RadiologyAI","FDA Regulations"],
              lessons: [
                { name: "التصوير الطبي: DICOM والأنواع والتحديات", primary: "medical imaging DICOM format" },
                { name: "الأشعة السينية: التشخيص بالـCNN", primary: "chest X-ray classification" },
                { name: "CT وMRI: معالجة الصور ثلاثية الأبعاد", primary: "3D CT MRI image processing" },
                { name: "Pathology AI: تحليل شرائح الأنسجة", primary: "digital pathology whole slide images" },
                { name: "Retinal Analysis: تشخيص من العين", primary: "retinal fundus image analysis" },
                { name: "Self-Supervised في الطب: بيانات أقل تعليمات", primary: "self-supervised for medical imaging" },
                { name: "التعميم والانجراف في الرؤية الطبية", primary: "generalization in medical computer vision" },
                { name: "FDA وتنظيم AI الطبي: متطلبات السوق", primary: "FDA AI medical device regulations" },
                { name: "مشروع: نموذج كشف مرض بصري من صور شبكية العين", primary: "retinal disease detection project" }
              ]
            },
            {
              unit_index: 8, code: "3.2.8",
              name: "الرؤية في حافة الشبكة Edge AI",
              goal: "نشر نماذج الرؤية على الأجهزة المحمولة والمدمجة بكفاءة",
              key_concepts: ["TensorRT","ONNX","TFLite","Pruning Vision","Quantization Vision"],
              lessons: [
                { name: "Edge AI: قيود الأجهزة وتحديات النشر", primary: "edge AI constraints and deployment" },
                { name: "ONNX: التنسيق الموحّد لتصدير النماذج", primary: "ONNX for model portability" },
                { name: "TensorRT: تسريع NVIDIA للاستدلال", primary: "TensorRT optimization for NVIDIA" },
                { name: "TFLite: نماذج الرؤية على الموبايل", primary: "TFLite for mobile vision deployment" },
                { name: "Pruning بنيوي لنماذج الرؤية", primary: "structured pruning for vision models" },
                { name: "Knowledge Distillation للنماذج الصغيرة", primary: "knowledge distillation for edge models" },
                { name: "Jetson Nano وRaspberry Pi: حالات عملية", primary: "edge device deployment cases" },
                { name: "OpenVINO: Intel للـEdge AI", primary: "OpenVINO for Intel edge deployment" },
                { name: "مشروع: نظام كشف وجوه على Raspberry Pi", primary: "face detection on Raspberry Pi" }
              ]
            },
            {
              unit_index: 9, code: "3.2.9",
              name: "مشروع الرؤية الحاسوبية الشامل",
              goal: "بناء نظام رؤية حاسوبية إنتاجي متكامل من الجمع إلى النشر",
              key_concepts: ["CV System Design","Data Collection","Training Pipeline","Inference Server","A/B Testing"],
              lessons: [
                { name: "تصميم نظام رؤية حاسوبية إنتاجي", primary: "production CV system design" },
                { name: "جمع وتعليم البيانات بكفاءة", primary: "efficient data collection and annotation" },
                { name: "أنبوب تدريب نماذج الرؤية المتكرر", primary: "iterative CV training pipeline" },
                { name: "تقييم ما قبل الإنتاج: Slice Testing", primary: "pre-production evaluation for CV" },
                { name: "خادم الاستدلال: TorchServe وTriton", primary: "model serving TorchServe Triton" },
                { name: "مراقبة أداء نموذج الرؤية", primary: "CV model performance monitoring" },
                { name: "إدارة نسخ النماذج والتحديث المتدرج", primary: "model versioning and gradual rollout" },
                { name: "الأخلاقيات في الرؤية الحاسوبية: التحيز والخصوصية", primary: "ethics in computer vision" },
                { name: "مشروع نهائي: نظام رؤية حاسوبية متكامل", primary: "end-to-end CV system final project" }
              ]
            }
          ]
        },
        {
          stage_index: 3,
          name: "MLOps وإنتاج النماذج",
          goal: "نشر النماذج وإدارتها في الإنتاج بموثوقية وقابلية للتوسع",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 72, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "3.3.1",
              name: "MLflow وتتبع التجارب",
              goal: "إدارة دورة حياة النماذج وتتبع التجارب بـMLflow",
              key_concepts: ["MLflow Tracking","MLflow Models","Model Registry","Experiments","Artifacts"],
              lessons: [
                { name: "MLflow: المنصة المفتوحة لدورة حياة ML", primary: "MLflow overview and components" },
                { name: "MLflow Tracking: تتبع كل شيء في التجارب", primary: "MLflow experiment tracking" },
                { name: "MLflow Models: تسجيل وتحميل النماذج", primary: "MLflow model logging and loading" },
                { name: "Model Registry: إدارة نسخ النماذج", primary: "MLflow model registry" },
                { name: "MLflow Projects: التجارب القابلة للاستنساخ", primary: "MLflow projects for reproducibility" },
                { name: "Weights & Biases بديلاً وتكاملاً", primary: "W&B experiment tracking" },
                { name: "Neptune.ai وComet: بدائل أخرى", primary: "Neptune Comet ML tracking comparison" },
                { name: "مقارنة التجارب وتحديد الأفضل", primary: "experiment comparison and selection" },
                { name: "مشروع: بنية تجارب ML كاملة بـMLflow", primary: "complete ML experiment infrastructure" }
              ]
            },
            {
              unit_index: 2, code: "3.3.2",
              name: "CI/CD للتعلم الآلي",
              goal: "بناء خطوط CI/CD آلية لنماذج التعلم الآلي",
              key_concepts: ["GitHub Actions","CML","Model Testing CI","Automated Retraining","DVC"],
              lessons: [
                { name: "CI/CD لـML: الفرق عن CI/CD للبرمجيات", primary: "ML CI/CD differences from software CI/CD" },
                { name: "DVC: إدارة إصدار البيانات والنماذج", primary: "DVC data version control" },
                { name: "GitHub Actions لـML: أتمتة التدريب", primary: "GitHub Actions for ML automation" },
                { name: "CML: تقارير في Pull Requests", primary: "CML continuous machine learning" },
                { name: "اختبار النماذج في خطوط CI", primary: "model testing in CI pipelines" },
                { name: "إعادة التدريب التلقائي عند انجراف البيانات", primary: "automated retraining on data drift" },
                { name: "Makefile وTask Runners لمشاريع ML", primary: "Makefile and task runners for ML projects" },
                { name: "Pre-commit Hooks: جودة الكود تلقائياً", primary: "pre-commit hooks for ML code quality" },
                { name: "مشروع: خط CI/CD كامل لنموذج تصنيف", primary: "complete ML CI/CD pipeline" }
              ]
            },
            {
              unit_index: 3, code: "3.3.3",
              name: "نشر النماذج بـDocker وKubernetes",
              goal: "نشر نماذج ML على Kubernetes للتوسع والموثوقية في الإنتاج",
              key_concepts: ["FastAPI Serving","Kubernetes","Horizontal Scaling","Health Checks","Istio"],
              lessons: [
                { name: "FastAPI لخدمة النماذج: REST Inference API", primary: "FastAPI ML model serving" },
                { name: "Docker لحزم النماذج: Dockerfile أفضل الممارسات", primary: "Docker for ML model packaging" },
                { name: "Kubernetes الأساسيات: Pods وServices", primary: "Kubernetes basics for ML" },
                { name: "Deployments وReplica Sets في Kubernetes", primary: "Kubernetes deployments for model serving" },
                { name: "الـHPA: التوسع التلقائي بالحمل", primary: "horizontal pod autoscaler for inference" },
                { name: "Ingress وLoad Balancing لنماذج ML", primary: "Kubernetes ingress for ML APIs" },
                { name: "Health Checks وGraceful Shutdown", primary: "health checks for ML containers" },
                { name: "Helm: حزم النشر المعاد استخدامها", primary: "Helm charts for ML deployment" },
                { name: "مشروع: نشر نموذج على Kubernetes مع HPA", primary: "Kubernetes ML model deployment with autoscaling" }
              ]
            },
            {
              unit_index: 4, code: "3.3.4",
              name: "منصات MLOps: Kubeflow وSageMaker",
              goal: "استخدام منصات MLOps المتخصصة لإدارة دورة حياة ML المؤسسية",
              key_concepts: ["Kubeflow Pipelines","SageMaker","Vertex AI","Feature Store","Model Hub"],
              lessons: [
                { name: "Kubeflow: MLOps على Kubernetes", primary: "Kubeflow for ML orchestration" },
                { name: "Kubeflow Pipelines: تعريف DAGs لـML", primary: "Kubeflow Pipelines for ML workflows" },
                { name: "AWS SageMaker: منصة ML المدارة", primary: "AWS SageMaker end-to-end ML" },
                { name: "Vertex AI: Google Cloud للـML", primary: "Vertex AI for managed ML" },
                { name: "Feature Store: مستودع الميزات الموحّد", primary: "feature store for ML teams" },
                { name: "Feast: Feature Store مفتوح المصدر", primary: "Feast open source feature store" },
                { name: "Tecton: Feature Store المؤسسي", primary: "Tecton enterprise feature store" },
                { name: "Model Hub: مشاركة النماذج داخل الفريق", primary: "model hub for team collaboration" },
                { name: "مشروع: خط MLOps كامل على SageMaker", primary: "end-to-end MLOps on SageMaker" }
              ]
            },
            {
              unit_index: 5, code: "3.3.5",
              name: "تحسين الاستدلال والكمون المنخفض",
              goal: "تحقيق أقل كمون ممكن مع أعلى إنتاجية في تقديم النماذج",
              key_concepts: ["Latency","Throughput","Batching","Caching","ONNX Runtime"],
              lessons: [
                { name: "الكمون مقابل الإنتاجية: المبادلة الأساسية", primary: "latency throughput trade-off in serving" },
                { name: "Dynamic Batching: تجميع الطلبات للكفاءة", primary: "dynamic batching for inference" },
                { name: "ONNX Runtime: تسريع الاستدلال المتقاطع", primary: "ONNX Runtime for fast inference" },
                { name: "TorchScript وTorch Compile: تسريع PyTorch", primary: "TorchScript and compile for speedup" },
                { name: "Model Caching: نتائج مخزّنة للاستعلامات المتكررة", primary: "model result caching" },
                { name: "Async Inference: الاستدلال غير المتزامن", primary: "async inference for scalability" },
                { name: "Triton Inference Server: الخادم المتقدم", primary: "Triton for high-performance inference" },
                { name: "Profiling الاستدلال: إيجاد اختناقات الإنتاج", primary: "inference profiling and optimization" },
                { name: "مشروع: API استدلال <50ms لنموذج تصنيف", primary: "low-latency inference API under 50ms" }
              ]
            },
            {
              unit_index: 6, code: "3.3.6",
              name: "إدارة بيانات التدريب والتسمية",
              goal: "بناء منظومة متكاملة لإدارة بيانات التدريب وتسميتها بكفاءة",
              key_concepts: ["Active Learning","Label Studio","CVAT","Data Flywheel","Weak Supervision"],
              lessons: [
                { name: "Active Learning: تسمية الأهم أولاً", primary: "active learning for efficient labeling" },
                { name: "Label Studio: منصة تسمية مفتوحة المصدر", primary: "Label Studio for data annotation" },
                { name: "CVAT: تسمية بيانات الرؤية الحاسوبية", primary: "CVAT for computer vision annotation" },
                { name: "Weak Supervision وSnorkel: تسمية بالبرمجة", primary: "weak supervision with Snorkel" },
                { name: "Human-in-the-Loop: الإنسان في حلقة التحسين", primary: "human in the loop ML" },
                { name: "Data Flywheel: البيانات تُحسّن النموذج الذي يجمع البيانات", primary: "data flywheel for continuous improvement" },
                { name: "إدارة جودة التسمية ومعالجة الخلافات", primary: "label quality management" },
                { name: "Synthetic Labeling: LLMs لأتمتة التسمية", primary: "LLM for synthetic label generation" },
                { name: "مشروع: منظومة تسمية بيانات ذكية بـActive Learning", primary: "smart data labeling with active learning" }
              ]
            },
            {
              unit_index: 7, code: "3.3.7",
              name: "أمان النماذج والحماية",
              goal: "حماية نماذج ML من الهجمات وضمان أمان المنظومة",
              key_concepts: ["Adversarial Attacks","Model Stealing","Data Poisoning","Differential Privacy ML","Federated Learning"],
              lessons: [
                { name: "هجمات الأمثلة المعادية Adversarial Attacks", primary: "adversarial examples FGSM PGD" },
                { name: "الدفاع ضد الهجمات المعادية: Adversarial Training", primary: "adversarial training defense" },
                { name: "سرقة النموذج Model Stealing", primary: "model stealing attacks and defenses" },
                { name: "تسمّم البيانات Data Poisoning", primary: "data poisoning attacks and defenses" },
                { name: "Privacy في ML: Differential Privacy التطبيقي", primary: "differential privacy in machine learning" },
                { name: "Federated Learning: التعلم بدون مشاركة البيانات", primary: "federated learning for privacy" },
                { name: "استخراج البيانات من النماذج: Model Inversion", primary: "model inversion attacks" },
                { name: "MLSecOps: أمان في خط أنابيب ML", primary: "MLSecOps for pipeline security" },
                { name: "مشروع: تقييم أمان نموذج تعلم آلي", primary: "ML model security assessment" }
              ]
            },
            {
              unit_index: 8, code: "3.3.8",
              name: "قابلية التوسع والموثوقية في الإنتاج",
              goal: "بناء أنظمة ML إنتاجية عالية التوفر وقابلة للتوسع",
              key_concepts: ["SLO/SLA","Circuit Breaker","Fallback","Load Testing","Chaos Engineering"],
              lessons: [
                { name: "SLO وSLA لخدمات التعلم الآلي", primary: "SLO SLA for ML services" },
                { name: "Circuit Breaker: منع تتالي الفشل", primary: "circuit breaker for ML service resilience" },
                { name: "Fallback Strategies: عندما يفشل النموذج", primary: "ML service fallback strategies" },
                { name: "Load Testing: تحمّل النموذج لتحت الضغط", primary: "load testing ML inference endpoints" },
                { name: "Chaos Engineering: اختبار الفشل المتعمد", primary: "chaos engineering for ML systems" },
                { name: "Blue-Green وCanary Deployments لـML", primary: "blue-green canary deployment for ML" },
                { name: "Observability: الـMetrics والـLogs والـTraces", primary: "observability for ML systems" },
                { name: "Postmortem: التعلم من الفشل في ML", primary: "ML incident postmortem process" },
                { name: "مشروع: نظام ML عالي التوفر مع Chaos Tests", primary: "high-availability ML system with chaos testing" }
              ]
            },
            {
              unit_index: 9, code: "3.3.9",
              name: "تكلفة وكفاءة العمليات في ML",
              goal: "تحسين التكلفة والكفاءة في منظومة ML الإنتاجية",
              key_concepts: ["Cloud Cost Optimization","Spot Instances","Right-Sizing","ROI ML","FinOps"],
              lessons: [
                { name: "تكاليف ML السحابية: ما يُكلّف كثيراً وكيف يُخفَّض", primary: "cloud ML cost breakdown" },
                { name: "Spot Instances لتدريب النماذج: التوفير والمخاطر", primary: "spot instances for ML training" },
                { name: "Right-Sizing: اختيار الأجهزة المناسبة", primary: "cloud instance right-sizing for ML" },
                { name: "FinOps لفرق ML: الميزانية والمساءلة", primary: "FinOps for ML teams" },
                { name: "ROI نموذج ML: كيف تقيس العائد", primary: "ML model ROI calculation" },
                { name: "Caching وDiskOffload لتخفيض تكاليف GPU", primary: "GPU cost reduction caching strategies" },
                { name: "تحسين حجم الدُفعات لأقصى كفاءة GPU", primary: "batch size optimization for GPU efficiency" },
                { name: "Model Efficiency Metrics: FLOPs وLatency/Accuracy", primary: "model efficiency pareto analysis" },
                { name: "مشروع: تقليل تكاليف منظومة ML بـ40%", primary: "ML cost reduction optimization project" }
              ]
            }
          ]
        },
        {
          stage_index: 4,
          name: "منصات البيانات السحابية والمقياس الكبير",
          goal: "إتقان منصات البيانات السحابية الكبرى وبناء الحلول قابلة للتوسع إلى البيتابايت",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 72, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "3.4.1",
              name: "AWS للبيانات والتعلم الآلي",
              goal: "استخدام خدمات AWS الأساسية لبناء منصات بيانات متكاملة",
              key_concepts: ["S3","Glue","Athena","EMR","SageMaker Studio"],
              lessons: [
                { name: "AWS S3: التخزين الموزع وتنظيمه", primary: "AWS S3 for data lake storage" },
                { name: "AWS Glue: ETL سحابي مدار", primary: "AWS Glue for serverless ETL" },
                { name: "Amazon Athena: SQL على S3 مباشرة", primary: "Amazon Athena for S3 querying" },
                { name: "AWS EMR: Spark وHadoop المدار", primary: "AWS EMR for managed Spark" },
                { name: "Kinesis: البيانات الآنية على AWS", primary: "AWS Kinesis for real-time data" },
                { name: "Redshift: مستودع البيانات المدار", primary: "Amazon Redshift data warehouse" },
                { name: "AWS Lambda: الحوسبة بلا خوادم للبيانات", primary: "AWS Lambda for data processing" },
                { name: "SageMaker Studio: IDE السحابي لـML", primary: "SageMaker Studio for ML development" },
                { name: "مشروع: منصة بيانات كاملة على AWS", primary: "complete data platform on AWS" }
              ]
            },
            {
              unit_index: 2, code: "3.4.2",
              name: "Google Cloud Platform للبيانات",
              goal: "استخدام GCP وBigQuery لتحليل البيانات الضخمة",
              key_concepts: ["BigQuery","GCS","Dataflow","Pub/Sub","Vertex AI Platform"],
              lessons: [
                { name: "Google Cloud Storage GCS: التخزين والتنظيم", primary: "GCS for data storage" },
                { name: "BigQuery: التحليل الضخم بـSQL السحابي", primary: "BigQuery for large-scale analytics" },
                { name: "BigQuery ML: نماذج ML داخل SQL", primary: "BigQuery ML for in-database ML" },
                { name: "Dataflow: Apache Beam المدار", primary: "Google Cloud Dataflow for ETL" },
                { name: "Pub/Sub: الرسائل الآنية على Google Cloud", primary: "Google Pub/Sub for real-time messaging" },
                { name: "Cloud Composer: Airflow المدار", primary: "Cloud Composer for managed Airflow" },
                { name: "Vertex AI: منصة ML متكاملة", primary: "Vertex AI for end-to-end ML" },
                { name: "Looker Studio: التقارير بصرية على GCP", primary: "Looker Studio for data visualization" },
                { name: "مشروع: لوحة تحليلية بـBigQuery وLooker Studio", primary: "BigQuery Looker Studio analytics dashboard" }
              ]
            },
            {
              unit_index: 3, code: "3.4.3",
              name: "Databricks وSpark المُدار",
              goal: "استخدام Databricks لمعالجة البيانات الضخمة وتدريب النماذج",
              key_concepts: ["Databricks Cluster","Delta Lake Databricks","MLflow Databricks","Unity Catalog","Jobs"],
              lessons: [
                { name: "Databricks: البيئة الموحدة للبيانات والـML", primary: "Databricks unified analytics platform" },
                { name: "Databricks Clusters: إعداد وتحسين", primary: "Databricks cluster configuration" },
                { name: "Delta Lake في Databricks: ACID والأداء", primary: "Delta Lake in Databricks" },
                { name: "MLflow مدمج في Databricks", primary: "MLflow native in Databricks" },
                { name: "Unity Catalog: حوكمة البيانات المركزية", primary: "Unity Catalog for governance" },
                { name: "Databricks SQL: Analytics واجهة SQL", primary: "Databricks SQL for analytics" },
                { name: "AutoML في Databricks: التسريع المدار", primary: "Databricks AutoML" },
                { name: "Databricks Jobs: جدولة الأنابيب", primary: "Databricks Jobs for orchestration" },
                { name: "مشروع: منصة Lakehouse على Databricks", primary: "Lakehouse platform on Databricks" }
              ]
            },
            {
              unit_index: 4, code: "3.4.4",
              name: "Snowflake لتحليلات البيانات",
              goal: "استخدام Snowflake كمستودع بيانات سحابي مرن وفعّال",
              key_concepts: ["Snowflake Architecture","Time Travel","Data Sharing","Snowpark","Marketplace"],
              lessons: [
                { name: "Snowflake: المعمارية الفريدة والفصل", primary: "Snowflake architecture compute storage" },
                { name: "Virtual Warehouses: الحساب المرن", primary: "Snowflake virtual warehouses" },
                { name: "Time Travel: استعادة البيانات عبر الزمن", primary: "Snowflake time travel" },
                { name: "Data Sharing: مشاركة البيانات دون نسخ", primary: "Snowflake data sharing" },
                { name: "Snowpark: Python وJava في Snowflake", primary: "Snowpark for Python data science" },
                { name: "Snowflake ML Functions: ML داخل SQL", primary: "Snowflake ML Functions" },
                { name: "Marketplace: بيانات جاهزة وتطبيقات", primary: "Snowflake Marketplace" },
                { name: "تحسين تكاليف Snowflake: الحوكمة والرقابة", primary: "Snowflake cost optimization" },
                { name: "مشروع: أنبوب تحليلي كامل بـSnowpark وdbt", primary: "Snowpark dbt analytics pipeline" }
              ]
            },
            {
              unit_index: 5, code: "3.4.5",
              name: "Streaming Analytics وReal-Time ML",
              goal: "بناء أنظمة تعلم آلي فوري تستجيب للأحداث في الوقت الحقيقي",
              key_concepts: ["Flink ML","Online Learning","Real-Time Features","Event-Driven ML","Latency Constraints"],
              lessons: [
                { name: "Real-Time ML: متطلبات ومعمارية وتحديات", primary: "real-time ML system requirements" },
                { name: "Online Learning: النموذج يتعلم باستمرار", primary: "online learning for real-time ML" },
                { name: "Flink ML: التعلم الآلي على الدفق", primary: "Flink ML for stream processing" },
                { name: "Real-Time Features: الميزات الفورية من Kafka", primary: "real-time feature computation from streams" },
                { name: "Event-Driven ML: الاستجابة للأحداث فوراً", primary: "event-driven ML architecture" },
                { name: "River: التعلم الآلي التزايدي بـPython", primary: "River online ML library" },
                { name: "Feature Serving: الاستعلام الفوري عن الميزات", primary: "low-latency feature serving" },
                { name: "Stream-Batch Consistency: توحيد المسارين", primary: "stream batch training consistency" },
                { name: "مشروع: نظام توصية فوري يتعلم مع الأحداث", primary: "real-time recommendation with online learning" }
              ]
            },
            {
              unit_index: 6, code: "3.4.6",
              name: "بنية Data Mesh وحوكمة البيانات الموزعة",
              goal: "تصميم منظومة بيانات موزعة بمنهجية Data Mesh",
              key_concepts: ["Data Mesh","Data Products","Domain Ownership","Data Contract","Self-Serve Platform"],
              lessons: [
                { name: "Data Mesh: لماذا يفشل المستودع المركزي؟", primary: "Data Mesh motivation and principles" },
                { name: "Domain Ownership: كل فريق يملك بياناته", primary: "domain-oriented data ownership" },
                { name: "Data Products: البيانات كمنتج قابل للاستخدام", primary: "data product thinking" },
                { name: "Data Contracts: اتفاقيات بين المنتجين والمستهلكين", primary: "data contracts for mesh" },
                { name: "Self-Serve Data Platform: تمكين الفرق", primary: "self-serve data infrastructure" },
                { name: "Federated Computational Governance", primary: "federated governance in data mesh" },
                { name: "Data Catalog في بيئة Data Mesh", primary: "data catalog for distributed mesh" },
                { name: "قياس نضج Data Mesh في المؤسسة", primary: "data mesh maturity model" },
                { name: "مشروع: تصميم Data Mesh لشركة متعددة الفرق", primary: "data mesh architecture design" }
              ]
            },
            {
              unit_index: 7, code: "3.4.7",
              name: "تقنيات البيانات الناشئة",
              goal: "البقاء في الطليعة بفهم التقنيات الناشئة في عالم البيانات",
              key_concepts: ["Apache Arrow","Iceberg","Polaris Catalog","DuckDB","OpenAPI for Data"],
              lessons: [
                { name: "Apache Arrow: الصفيف العمودي الموحّد", primary: "Apache Arrow for zero-copy data" },
                { name: "Apache Iceberg: جداول المستقبل", primary: "Apache Iceberg open table format" },
                { name: "Project Nessie وPolaris: فهرس الجداول المفتوح", primary: "Nessie Polaris open catalog" },
                { name: "DuckDB: OLAP داخل العملية", primary: "DuckDB for in-process analytics" },
                { name: "DataFusion وVelox: محركات الاستعلام الجديدة", primary: "DataFusion Velox query engines" },
                { name: "Column Stores والمستقبل", primary: "columnar storage future directions" },
                { name: "HTAP: قواعد بيانات هجينة OLTP+OLAP", primary: "HTAP hybrid transactional analytical" },
                { name: "OpenAPI للبيانات: التوثيق والمشاركة", primary: "OpenAPI for data service documentation" },
                { name: "مشروع: استكشاف تقنية ناشئة وبناء POC", primary: "emerging technology POC project" }
              ]
            },
            {
              unit_index: 8, code: "3.4.8",
              name: "اقتصاديات البيانات وقيمة المعلومات",
              goal: "قياس القيمة الاقتصادية للبيانات وتسعيرها وإدارة ملكيتها",
              key_concepts: ["Data Valuation","Data Monetization","Data Marketplace","Information Economics","Value of Data"],
              lessons: [
                { name: "تقييم البيانات: كيف تُقدَّر قيمة مجموعة بيانات", primary: "data valuation methods" },
                { name: "Shapley Data Valuation: الإسناد العادل", primary: "Shapley value for data valuation" },
                { name: "تحقيق الدخل من البيانات: النماذج المختلفة", primary: "data monetization models" },
                { name: "أسواق البيانات Data Marketplaces", primary: "data marketplace economics" },
                { name: "اقتصاديات المعلومات: منحنى العرض والطلب للبيانات", primary: "information economics for data" },
                { name: "Data Governance ROI: عائد الاستثمار في الحوكمة", primary: "data governance ROI" },
                { name: "بناء قضية الأعمال لمشاريع البيانات", primary: "business case for data projects" },
                { name: "تسعير خدمات البيانات وAPIها", primary: "data service and API pricing" },
                { name: "مشروع: دراسة جدوى مشروع منصة بيانات", primary: "data platform feasibility study" }
              ]
            },
            {
              unit_index: 9, code: "3.4.9",
              name: "مشروع السحابة الشامل",
              goal: "بناء منصة بيانات سحابية متكاملة من الصفر",
              key_concepts: ["Cloud Architecture","IaC","Cost Optimization","Multi-Cloud","Disaster Recovery"],
              lessons: [
                { name: "تصميم معمارية سحابية للبيانات", primary: "cloud data architecture design" },
                { name: "Infrastructure as Code بـTerraform", primary: "Terraform for data infrastructure" },
                { name: "تحسين تكاليف السحابة: FinOps عملياً", primary: "FinOps cloud cost optimization" },
                { name: "Multi-Cloud Strategy: البيانات على عدة سحابات", primary: "multi-cloud data strategy" },
                { name: "Disaster Recovery للبيانات: RTO وRPO", primary: "data disaster recovery planning" },
                { name: "الأمان السحابي للبيانات: Encryption وIAM", primary: "cloud data security IAM" },
                { name: "Migration: نقل البيانات للسحابة بأمان", primary: "data migration to cloud" },
                { name: "التوثيق والـRunbook لمنصة السحابة", primary: "cloud platform documentation" },
                { name: "مشروع نهائي: منصة بيانات سحابية مؤسسية", primary: "enterprise cloud data platform" }
              ]
            }
          ]
        },
        {
          stage_index: 5,
          name: "معالجة البيانات الضخمة والحوسبة الموزعة",
          goal: "إتقان الأنظمة الموزعة لمعالجة البيانات في مقياس البيتابايت",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "3.5.1",
              name: "Hadoop وMR وبيئة Big Data الكلاسيكية",
              goal: "فهم الجيل الأول من البيانات الضخمة وتطوّره",
              key_concepts: ["HDFS","MapReduce","YARN","Hive","HBase"],
              lessons: [
                { name: "HDFS: نظام الملفات الموزع", primary: "HDFS distributed file system" },
                { name: "MapReduce: النموذج الكلاسيكي للتوزيع", primary: "MapReduce programming model" },
                { name: "YARN: إدارة الموارد الموزعة", primary: "YARN resource manager" },
                { name: "Hive: SQL فوق HDFS", primary: "Apache Hive for SQL on Hadoop" },
                { name: "HBase: قاعدة بيانات NoSQL على HDFS", primary: "HBase for wide-column storage" },
                { name: "Pig: لغة التدفق لـMapReduce", primary: "Apache Pig for data flow" },
                { name: "Sqoop وFlume: استيراد وتصدير البيانات", primary: "Sqoop Flume for data ingestion" },
                { name: "لماذا تجاوز Spark عصر Hadoop", primary: "Spark vs Hadoop evolution" },
                { name: "مشروع: تحليل سجلات Hadoop بـHive", primary: "log analysis with Hive on Hadoop" }
              ]
            },
            {
              unit_index: 2, code: "3.5.2",
              name: "Spark المتقدم والأداء",
              goal: "إتقان الأنماط المتقدمة في Spark لتحسين الأداء وحل المشاكل الصعبة",
              key_concepts: ["Tungsten","Catalyst","Partitioning Strategy","Broadcast Join","Shuffle"],
              lessons: [
                { name: "Spark Catalyst: محسّن الاستعلامات المبني داخلياً", primary: "Spark Catalyst query optimizer" },
                { name: "Tungsten: محرك تنفيذ الكود الفعّال", primary: "Tungsten execution engine" },
                { name: "استراتيجيات التقسيم Partitioning في Spark", primary: "Spark partitioning strategies" },
                { name: "Broadcast Join: دمج الجداول الصغيرة بسرعة", primary: "broadcast join for small tables" },
                { name: "Shuffle: تكلفته وكيف يُقلَّل", primary: "Spark shuffle optimization" },
                { name: "Adaptive Query Execution: التحسين الديناميكي", primary: "Spark AQE adaptive execution" },
                { name: "Spark Structured Streaming: المعالجة الآنية", primary: "Spark Structured Streaming advanced" },
                { name: "Delta Lake فوق Spark: ACID والنسخ", primary: "Delta Lake with Spark" },
                { name: "مشروع: تحسين أداء وظيفة Spark بطيئة", primary: "Spark job performance optimization" }
              ]
            },
            {
              unit_index: 3, code: "3.5.3",
              name: "Ray: الموازاة الحديثة لـPython",
              goal: "استخدام Ray لمعالجة البيانات والتعلم الآلي الموزع بـPython",
              key_concepts: ["Ray Core","Ray Data","Ray Train","Ray Tune","Ray Serve"],
              lessons: [
                { name: "Ray Core: البدائية الأساسية للموازاة", primary: "Ray Core tasks and actors" },
                { name: "Ray Data: معالجة البيانات الموزعة", primary: "Ray Data for distributed data processing" },
                { name: "Ray Train: التدريب الموزع للنماذج", primary: "Ray Train for distributed ML training" },
                { name: "Ray Tune: ضبط الحدود الموزع", primary: "Ray Tune for distributed hyperparameter search" },
                { name: "Ray Serve: نشر النماذج قابل للتوسع", primary: "Ray Serve for scalable model serving" },
                { name: "Anyscale: Ray كخدمة مدارة", primary: "Anyscale for managed Ray" },
                { name: "Ray مقابل Spark: متى كل منهما", primary: "Ray vs Spark comparison" },
                { name: "تدريب موزع بـPyTorch وRay Train", primary: "distributed PyTorch training with Ray" },
                { name: "مشروع: ضبط نموذج موزع بـRay Tune", primary: "distributed hyperparameter tuning with Ray" }
              ]
            },
            {
              unit_index: 4, code: "3.5.4",
              name: "التدريب الموزع للشبكات العصبية",
              goal: "إتقان التدريب الموزع لنماذج التعلم العميق على عدة GPUs ومضيفين",
              key_concepts: ["Data Parallelism","Model Parallelism","DDP","ZeRO","FSDP"],
              lessons: [
                { name: "التدريب الموزع: لماذا ومتى وكيف", primary: "distributed deep learning training" },
                { name: "Data Parallelism: نفس النموذج على عدة GPUs", primary: "data parallel training with DDP" },
                { name: "DistributedDataParallel DDP: PyTorch", primary: "DDP distributed training implementation" },
                { name: "Model Parallelism: نموذج أكبر من GPU واحد", primary: "model parallelism for large models" },
                { name: "Pipeline Parallelism: تسلسل النموذج", primary: "pipeline parallelism for very large models" },
                { name: "ZeRO: كفاءة الذاكرة بتوزيع الحالة", primary: "ZeRO optimizer memory efficiency" },
                { name: "FSDP: Fully Sharded Data Parallel", primary: "FSDP for large model training" },
                { name: "Megatron-LM: التدريب الموزع لـLLMs", primary: "Megatron-LM for LLM distributed training" },
                { name: "مشروع: تدريب نموذج كبير على عدة GPUs", primary: "multi-GPU training project" }
              ]
            },
            {
              unit_index: 5, code: "3.5.5",
              name: "Trino وPresto: SQL على كل شيء",
              goal: "استعلام مصادر بيانات متعددة وغير متجانسة بـSQL",
              key_concepts: ["Trino","Presto","Federated Queries","Connectors","Query Federation"],
              lessons: [
                { name: "Trino: SQL على أي مصدر بيانات", primary: "Trino federated SQL engine" },
                { name: "Presto: المحرك الأصلي من Meta", primary: "Presto vs Trino comparison" },
                { name: "Trino Connectors: S3 وHive وKafka والمزيد", primary: "Trino connectors for data sources" },
                { name: "Federated Queries: استعلام قواعد بيانات متعددة", primary: "federated queries across databases" },
                { name: "تحسين أداء Trino: Partitioning وPush-down", primary: "Trino performance optimization" },
                { name: "Cost-Based Optimizer في Trino", primary: "Trino cost-based query optimization" },
                { name: "Trino على Kubernetes: النشر المرن", primary: "Trino on Kubernetes" },
                { name: "Starburst: Trino المؤسسي", primary: "Starburst enterprise Trino" },
                { name: "مشروع: تحليل موحّد عبر S3 وPostgres وKafka", primary: "unified analysis across multiple data sources" }
              ]
            },
            {
              unit_index: 6, code: "3.5.6",
              name: "قواعد البيانات الموزعة للإنتاج",
              goal: "اختيار وتشغيل قواعد البيانات الموزعة المناسبة لأعباء العمل المختلفة",
              key_concepts: ["CockroachDB","Cassandra Scale","Vitess","TiDB","Global Distributed DB"],
              lessons: [
                { name: "CockroachDB: قاعدة بيانات SQL موزعة عالمياً", primary: "CockroachDB distributed SQL" },
                { name: "Cassandra في المقياس: ملايين الكتابات", primary: "Cassandra for high-write workloads" },
                { name: "Vitess: MySQL في مقياس YouTube", primary: "Vitess MySQL sharding" },
                { name: "TiDB: HTAP مفتوح المصدر", primary: "TiDB for HTAP workloads" },
                { name: "Google Spanner وAlloyDB: عالمية مدارة", primary: "Spanner and AlloyDB global databases" },
                { name: "Consistency Patterns: Strong وEventual وCAP", primary: "consistency patterns in distributed databases" },
                { name: "Sharding Strategies: كيف تُقسّم البيانات؟", primary: "database sharding strategies" },
                { name: "Replication وFailover: الموثوقية الموزعة", primary: "replication and failover in distributed DB" },
                { name: "مشروع: مقارنة قواعد بيانات موزعة لحالة استخدام محددة", primary: "distributed database selection case study" }
              ]
            },
            {
              unit_index: 7, code: "3.5.7",
              name: "البنية التحتية للحوسبة العلمية",
              goal: "استخدام الموارد الحاسوبية العالية الأداء للعلوم والبحث",
              key_concepts: ["HPC","SLURM","MPI","CUDA Programming","GPU Clusters"],
              lessons: [
                { name: "HPC: الحوسبة العالية الأداء للعلوم", primary: "HPC infrastructure for scientific computing" },
                { name: "SLURM: جدولة المهام على الكلاسترات", primary: "SLURM job scheduler" },
                { name: "MPI: التمرير بالرسائل للموازاة", primary: "MPI for parallel computing" },
                { name: "CUDA Programming: GPU الأساسيات", primary: "CUDA programming basics for data scientists" },
                { name: "GPU Clusters: الـA100 والـH100 والتوافر", primary: "GPU cluster access and management" },
                { name: "Containerization في HPC: Singularity", primary: "Singularity containers for HPC" },
                { name: "JupyterHub على كلاسترات HPC", primary: "JupyterHub on HPC clusters" },
                { name: "Quantum Computing مدخل لعلوم البيانات", primary: "quantum computing for data science" },
                { name: "مشروع: تدريب نموذج على كلاستر HPC", primary: "model training on HPC cluster" }
              ]
            },
            {
              unit_index: 8, code: "3.5.8",
              name: "بيانات الإنترنت من الأشياء IoT",
              goal: "معالجة وتحليل التدفقات الضخمة من أجهزة IoT",
              key_concepts: ["MQTT","Time Series DB","Edge Processing","IoT Analytics","Digital Twin"],
              lessons: [
                { name: "IoT Architecture: من الجهاز للسحابة", primary: "IoT architecture for data scientists" },
                { name: "MQTT: بروتوكول الرسائل الخفيف لـIoT", primary: "MQTT for IoT messaging" },
                { name: "InfluxDB: قاعدة البيانات الزمنية لـIoT", primary: "InfluxDB for IoT time series" },
                { name: "معالجة حافة الشبكة Edge Processing", primary: "edge processing for IoT data" },
                { name: "Digital Twin: التوأم الرقمي للأنظمة الفيزيائية", primary: "digital twin for IoT systems" },
                { name: "تحليل بيانات المستشعرات: التنظيف والتنبؤ", primary: "sensor data analysis and prediction" },
                { name: "Predictive Maintenance: الصيانة التنبؤية", primary: "predictive maintenance with IoT data" },
                { name: "AWS IoT Core وAzure IoT Hub", primary: "cloud IoT platforms comparison" },
                { name: "مشروع: تحليل بيانات مستشعرات مصنع وتنبؤ بالأعطال", primary: "factory sensor data predictive maintenance" }
              ]
            },
            {
              unit_index: 9, code: "3.5.9",
              name: "مشروع البيانات الضخمة الشامل",
              goal: "بناء منظومة معالجة بيانات ضخمة كاملة من الاستيعاب إلى الرؤى",
              key_concepts: ["Lambda Architecture","Kappa Architecture","System Design","Scale","Reliability"],
              lessons: [
                { name: "معمارية Lambda: المساران المتوازيان", primary: "lambda architecture batch and stream" },
                { name: "معمارية Kappa: توحيد المسارين", primary: "kappa architecture simplification" },
                { name: "تصميم نظام بيانات في مقياس البيتابايت", primary: "petabyte-scale data system design" },
                { name: "استيعاب البيانات بمعدلات ضخمة", primary: "high-throughput data ingestion design" },
                { name: "التخزين الموزع والتوازن والـReplication", primary: "distributed storage with replication" },
                { name: "خدمة الاستعلام: Latency مقابل Cost", primary: "query serving latency cost trade-off" },
                { name: "High Availability وDisaster Recovery", primary: "HA and DR for big data systems" },
                { name: "تكاليف نظام البيانات الضخمة: الميزانية الواقعية", primary: "big data system cost planning" },
                { name: "مشروع نهائي: تصميم نظام بيانات ضخمة كامل", primary: "complete big data system design project" }
              ]
            }
          ]
        },
        {
          stage_index: 6,
          name: "أخلاقيات وحوكمة الذكاء الاصطناعي",
          goal: "بناء أنظمة ذكاء اصطناعي مسؤولة وشفافة وعادلة تخدم البشرية بأمانة",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "3.6.1",
              name: "أخلاقيات الذكاء الاصطناعي: الأساس الفلسفي",
              goal: "بناء إطار أخلاقي راسخ لاتخاذ قرارات مسؤولة في تطوير AI",
              key_concepts: ["AI Ethics Principles","Beneficence","Justice","Autonomy","Accountability"],
              lessons: [
                { name: "لماذا أخلاقيات AI: الحوادث التي غيّرت العالم", primary: "AI ethics major incidents case studies" },
                { name: "مبادئ AI الأخلاقية: UNESCO وOECD والاتحاد الأوروبي", primary: "AI ethics principles UNESCO OECD EU" },
                { name: "الإفادة والعدالة والاستقلالية والمساءلة", primary: "beneficence justice autonomy accountability" },
                { name: "التحيز في دورة حياة الذكاء الاصطناعي", primary: "AI bias in the ML lifecycle" },
                { name: "فخ الموضوعية: الخوارزمية ليست محايدة", primary: "objectivity myth in algorithmic systems" },
                { name: "الشفافية والقابلية للتفسير كحق إنساني", primary: "transparency explainability as human right" },
                { name: "السلامة والموثوقية: متطلبات النظام الأخلاقي", primary: "AI safety and reliability requirements" },
                { name: "AI والعمل: القلق الأخلاقي المشروع", primary: "AI and labor ethical considerations" },
                { name: "مشروع: تدقيق أخلاقي لنظام AI موجود", primary: "ethical audit of existing AI system" }
              ]
            },
            {
              unit_index: 2, code: "3.6.2",
              name: "الخصوصية وحماية البيانات",
              goal: "دمج حماية الخصوصية في تصميم أنظمة البيانات والنماذج",
              key_concepts: ["Privacy by Design","GDPR Technical","k-Anonymity","Differential Privacy","Data Minimization"],
              lessons: [
                { name: "Privacy by Design: الخصوصية من البداية", primary: "privacy by design principles" },
                { name: "الإخفاء والتشفير لحماية بيانات الأفراد", primary: "data anonymization and pseudonymization" },
                { name: "k-Anonymity وl-Diversity وt-Closeness", primary: "k-anonymity and extensions" },
                { name: "Differential Privacy التطبيقي: Apple وGoogle", primary: "differential privacy real implementations" },
                { name: "تقليل البيانات Data Minimization", primary: "data minimization principles" },
                { name: "حقوق موضوع البيانات: الوصول والحذف", primary: "data subject rights technical implementation" },
                { name: "Privacy Impact Assessment PIA", primary: "privacy impact assessment methodology" },
                { name: "البيانات الحساسة: الصحة والدين والسياسة", primary: "sensitive data categories protection" },
                { name: "مشروع: تحليل GDPR لمشروع بيانات حقيقي", primary: "GDPR compliance analysis project" }
              ]
            },
            {
              unit_index: 3, code: "3.6.3",
              name: "عدالة الخوارزميات وإزالة التحيز",
              goal: "قياس وتصحيح التحيز الخوارزمي عملياً",
              key_concepts: ["Algorithmic Fairness","Protected Attributes","Demographic Parity","Equalized Odds","Debiasing Techniques"],
              lessons: [
                { name: "التحيز الخوارزمي: الأنواع والمصادر", primary: "algorithmic bias types and sources" },
                { name: "السمات المحمية: العرق والجنس والعمر", primary: "protected attributes in fairness" },
                { name: "التكافؤ الديموغرافي: تعريفه وقياسه", primary: "demographic parity measurement" },
                { name: "Equalized Odds وEqual Opportunity", primary: "equalized odds fairness criterion" },
                { name: "Individual Fairness: العدالة على مستوى الفرد", primary: "individual fairness metrics" },
                { name: "Counterfactual Fairness: لو كان مختلفاً", primary: "counterfactual fairness" },
                { name: "التحيز في NLP والرؤية الحاسوبية", primary: "bias in NLP and computer vision" },
                { name: "Fairness Toolkits: IBM AI Fairness 360", primary: "AI Fairness 360 tools" },
                { name: "مشروع: إصلاح التحيز في نموذج توظيف", primary: "hiring model bias remediation" }
              ]
            },
            {
              unit_index: 4, code: "3.6.4",
              name: "سلامة الذكاء الاصطناعي AI Safety",
              goal: "فهم وتطبيق مبادئ سلامة الذكاء الاصطناعي في الأنظمة الإنتاجية",
              key_concepts: ["AI Alignment","Guardrails","Red Teaming","Robustness","Human Oversight"],
              lessons: [
                { name: "AI Safety: من نظرية إلى ممارسة", primary: "AI safety from theory to practice" },
                { name: "AI Alignment: محاذاة أهداف النموذج", primary: "AI alignment problem" },
                { name: "Guardrails: الحواجز الحامية للأنظمة", primary: "AI guardrails implementation" },
                { name: "Red Teaming لأنظمة AI: الهجوم المدروس", primary: "red teaming for AI systems" },
                { name: "Robustness: مقاومة التوزيعات غير المتوقعة", primary: "model robustness to distribution shift" },
                { name: "Human Oversight: الإنسان في حلقة التحكم", primary: "human oversight for high-stakes AI" },
                { name: "RLHF وConstitutional AI: المحاذاة الحديثة", primary: "RLHF constitutional AI for alignment" },
                { name: "AI Safety في القطاع الحرج: الطب والقضاء", primary: "AI safety in critical sectors" },
                { name: "مشروع: Red Team لنظام AI ذي مخاطر عالية", primary: "high-stakes AI system red teaming" }
              ]
            },
            {
              unit_index: 5, code: "3.6.5",
              name: "حوكمة الذكاء الاصطناعي المؤسسية",
              goal: "بناء إطار حوكمة AI مؤسسي يوازن بين الابتكار والمخاطرة والامتثال",
              key_concepts: ["AI Governance Framework","Risk Committee","Model Inventory","Policy AI","Internal Audit"],
              lessons: [
                { name: "إطار حوكمة AI: من يقرر ومن يُساءل", primary: "AI governance framework structure" },
                { name: "لجنة مخاطر AI: التشكيل والصلاحيات", primary: "AI risk committee formation" },
                { name: "جرد النماذج Model Inventory: ما لديك", primary: "model inventory management" },
                { name: "سياسات AI المؤسسية: الاستخدام المسؤول", primary: "AI policy for responsible use" },
                { name: "التدقيق الداخلي على AI: العملية والأدوات", primary: "internal AI audit process" },
                { name: "AI Ethics Board: هيئة الأخلاقيات", primary: "AI ethics board establishment" },
                { name: "Responsible AI Maturity Model", primary: "responsible AI maturity assessment" },
                { name: "التقارير المؤسسية عن AI: ماذا تُفصح", primary: "corporate AI reporting and disclosure" },
                { name: "مشروع: بناء إطار حوكمة AI لمؤسسة", primary: "AI governance framework for organization" }
              ]
            },
            {
              unit_index: 6, code: "3.6.6",
              name: "البيئة والاستدامة في الذكاء الاصطناعي",
              goal: "قياس وتخفيض البصمة البيئية لأنظمة الذكاء الاصطناعي",
              key_concepts: ["Carbon Footprint AI","Green AI","Energy Efficiency","Carbon Neutral ML","Sustainable Computing"],
              lessons: [
                { name: "البصمة الكربونية لتدريب النماذج: الأرقام المثيرة", primary: "AI carbon footprint training costs" },
                { name: "Green AI: كفاءة الطاقة في التعلم الآلي", primary: "green AI energy efficiency" },
                { name: "قياس انبعاثات CO2 لتدريب النموذج", primary: "ML CO2 emissions measurement" },
                { name: "CodeCarbon وEco2AI: أدوات القياس", primary: "CodeCarbon Eco2AI tracking tools" },
                { name: "تحسين الكفاءة الطاقوية للنماذج", primary: "energy efficient model training" },
                { name: "Efficient ML: أقل باراميتر بأقل طاقة", primary: "efficient ML for sustainability" },
                { name: "Data Centers الخضراء للذكاء الاصطناعي", primary: "green data centers for AI workloads" },
                { name: "AI لتعزيز الاستدامة البيئية", primary: "AI for environmental sustainability" },
                { name: "مشروع: قياس وتخفيض البصمة الكربونية لمشروع AI", primary: "AI project carbon footprint reduction" }
              ]
            },
            {
              unit_index: 7, code: "3.6.7",
              name: "AI في السياقات الثقافية والمحلية",
              goal: "بناء أنظمة AI تحترم السياقات الثقافية والمحلية وتخدم المجتمعات المتنوعة",
              key_concepts: ["Cultural Context AI","Low-Resource Languages","Inclusive AI","Local Data","Yemeni Context"],
              lessons: [
                { name: "ثقافة المجتمع وتحيز النموذج: العلاقة الخفية", primary: "cultural context in AI bias" },
                { name: "اللغات قليلة الموارد والإقصاء الرقمي", primary: "low-resource languages and digital inclusion" },
                { name: "بناء مجموعات بيانات محلية: التحدي والفرصة", primary: "local dataset building" },
                { name: "AI في السياق اليمني والعربي: الفرص والمخاطر", primary: "AI in Yemeni and Arabic context" },
                { name: "Inclusive AI Design: تصميم للجميع", primary: "inclusive AI design principles" },
                { name: "Indigenous Data Sovereignty: حق المجتمعات", primary: "indigenous data sovereignty" },
                { name: "التعاون البحثي مع المجتمعات المحلية", primary: "participatory AI research with communities" },
                { name: "AI لخدمة التنمية: SDGs والذكاء الاصطناعي", primary: "AI for sustainable development goals" },
                { name: "مشروع: بناء نموذج NLP للهجة يمنية", primary: "Yemeni dialect NLP model project" }
              ]
            },
            {
              unit_index: 8, code: "3.6.8",
              name: "المستقبل والتوجهات الناشئة في AI",
              goal: "قراءة توجهات مستقبل الذكاء الاصطناعي والاستعداد له",
              key_concepts: ["AGI","AI Governance Global","Frontier Models","AI Regulation","Future of Work"],
              lessons: [
                { name: "AGI: ما هو وهل نصل إليه؟", primary: "AGI definition and timeline debates" },
                { name: "Frontier Models: GPT-5 وما بعده", primary: "frontier model capabilities and risks" },
                { name: "الحوكمة العالمية للذكاء الاصطناعي", primary: "global AI governance efforts" },
                { name: "قوانين الذكاء الاصطناعي حول العالم", primary: "AI regulation global landscape" },
                { name: "مستقبل العمل مع الذكاء الاصطناعي", primary: "future of work with AI" },
                { name: "AI Boom: الفرص والأسواق الناشئة", primary: "AI market opportunities and trends" },
                { name: "AI Science: اكتشافات علمية بالذكاء الاصطناعي", primary: "AI for scientific discovery" },
                { name: "الاستعداد للمستقبل: مهارات لا تُستبدَل", primary: "future-proof skills in AI era" },
                { name: "مشروع: ورقة موقف حول مستقبل AI في بلد ناشئ", primary: "AI future position paper for emerging economy" }
              ]
            },
            {
              unit_index: 9, code: "3.6.9",
              name: "البحث والنشر في مجتمع علوم البيانات",
              goal: "المساهمة في مجتمع علوم البيانات بالبحث ومشاريع المصدر المفتوح",
              key_concepts: ["Research Methodology","Paper Writing","Open Source Contribution","Dataset Release","Reproducibility"],
              lessons: [
                { name: "قراءة أوراق البحث: كيف تستوعب ورقة AI", primary: "reading AI research papers effectively" },
                { name: "كتابة ورقة بحثية: الهيكل والمعايير", primary: "research paper writing structure" },
                { name: "الإسهام في مشاريع مفتوحة المصدر", primary: "open source contribution to ML projects" },
                { name: "إطلاق مجموعات بيانات: الأخلاق والتوثيق", primary: "ethical dataset release" },
                { name: "القابلية للاستنساخ Reproducibility في البحث", primary: "reproducibility in ML research" },
                { name: "NeurIPS وICML وACL: أهم مؤتمرات AI", primary: "top AI conferences and their focus" },
                { name: "arXiv والنشر المسبق: ثقافة البحث الحديث", primary: "arXiv pre-print culture" },
                { name: "بناء ملف Portfolio مؤثر لعالم البيانات", primary: "data scientist portfolio building" },
                { name: "مشروع: نشر ورقة بحثية أو مجموعة بيانات مفتوحة", primary: "research paper or open dataset publication" }
              ]
            }
          ]
        },
        {
          stage_index: 7,
          name: "القيادة وإدارة فرق البيانات",
          goal: "التأهل لقيادة فرق البيانات وبناء ثقافة بيانات مؤسسية وإدارة مشاريع AI بنجاح",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "3.7.1",
              name: "بناء فريق علوم البيانات",
              goal: "توظيف وبناء وتطوير فرق علوم بيانات عالية الأداء",
              key_concepts: ["DS Team Roles","Hiring DS","Onboarding","Team Structure","Career Paths"],
              lessons: [
                { name: "أدوار فريق البيانات: من يفعل ماذا", primary: "data team roles and responsibilities" },
                { name: "توظيف عالم بيانات: ما تبحث عنه حقاً", primary: "hiring data scientists effectively" },
                { name: "مقابلات علوم البيانات: تصميم التقييم الصحيح", primary: "data science interview design" },
                { name: "Onboarding سريع وفعّال لعلماء البيانات", primary: "data scientist onboarding" },
                { name: "هياكل الفرق: Embedded مقابل Centralized", primary: "data team structure models" },
                { name: "مسارات الأعمال Career Paths لفريق البيانات", primary: "data science career ladder" },
                { name: "Retention: كيف تحتفظ بأفضل المواهب", primary: "data talent retention strategies" },
                { name: "تنوع الفريق وبيئة الإبداع", primary: "diversity in data teams" },
                { name: "مشروع: خطة بناء فريق بيانات لشركة ناشئة", primary: "data team building plan for startup" }
              ]
            },
            {
              unit_index: 2, code: "3.7.2",
              name: "إدارة مشاريع علوم البيانات",
              goal: "إدارة مشاريع البيانات بمنهجيات مناسبة لطبيعتها غير اليقينية",
              key_concepts: ["CRISP-DM","Agile DS","Sprint Planning","DS Project Risks","Stakeholder Management"],
              lessons: [
                { name: "CRISP-DM: منهجية مشاريع البيانات الكلاسيكية", primary: "CRISP-DM methodology" },
                { name: "Agile لمشاريع البيانات: التكيّف مع الغموض", primary: "Agile for data science projects" },
                { name: "Sprint Planning لفرق البيانات", primary: "sprint planning for data science" },
                { name: "تقدير وقت مشاريع البيانات: الفن الصعب", primary: "data project time estimation" },
                { name: "مخاطر مشاريع البيانات: التعرّف والتخفيف", primary: "data project risk management" },
                { name: "إدارة أصحاب المصلحة: التواصل والتوقعات", primary: "stakeholder management in DS projects" },
                { name: "Technical Debt في مشاريع البيانات", primary: "technical debt in data science" },
                { name: "نهج MVP للنماذج: شحن سريع ذكي", primary: "MVP approach for ML models" },
                { name: "مشروع: خطة مشروع بيانات متكاملة من الألف للياء", primary: "complete data project plan" }
              ]
            },
            {
              unit_index: 3, code: "3.7.3",
              name: "استراتيجية البيانات المؤسسية",
              goal: "صياغة وتنفيذ استراتيجية بيانات مؤسسية تدعم أهداف الأعمال",
              key_concepts: ["Data Strategy","Data Maturity","Chief Data Officer","Data Vision","Business Alignment"],
              lessons: [
                { name: "ما هي استراتيجية البيانات: التعريف والمكونات", primary: "data strategy definition and components" },
                { name: "نضج البيانات المؤسسي: من الفوضى للاحتراف", primary: "data maturity assessment framework" },
                { name: "دور CDO: مسؤوليات رئيس البيانات", primary: "chief data officer role and responsibilities" },
                { name: "مواءمة استراتيجية البيانات مع الأعمال", primary: "data strategy business alignment" },
                { name: "خارطة الطريق للبيانات: التخطيط متعدد السنوات", primary: "data roadmap multi-year planning" },
                { name: "Data Culture: بناء ثقافة مبنية على البيانات", primary: "data-driven culture building" },
                { name: "قياس نجاح استراتيجية البيانات", primary: "data strategy success metrics" },
                { name: "إدارة التغيير في رحلة التحول الرقمي", primary: "change management for data transformation" },
                { name: "مشروع: استراتيجية بيانات لمؤسسة يمنية", primary: "data strategy for Yemeni organization" }
              ]
            },
            {
              unit_index: 4, code: "3.7.4",
              name: "التواصل والتأثير لعلماء البيانات",
              goal: "إيصال رؤى البيانات بتأثير حقيقي على قرارات المديرين والجمهور",
              key_concepts: ["Data Communication","Executive Presentations","Narrative Data","Non-Technical Audience","Data Literacy"],
              lessons: [
                { name: "فجوة التواصل: لماذا تُهمَل رؤى البيانات", primary: "data communication gap" },
                { name: "مبدأ Pyramid: الجواب أولاً ثم الدليل", primary: "pyramid principle for data presentations" },
                { name: "قصة البيانات: بناء سرد يقنع ويُلهم", primary: "data storytelling for persuasion" },
                { name: "العروض التنفيذية: ما يهم المدير لا التقني", primary: "executive data presentations" },
                { name: "التصوير البياني المقنع: الصورة تقول الألف", primary: "persuasive data visualization" },
                { name: "محو الأمية البيانية في المؤسسة", primary: "organizational data literacy" },
                { name: "كتابة تقارير البيانات الاحترافية", primary: "professional data report writing" },
                { name: "Data Journalism: الصحافة البيانية", primary: "data journalism techniques" },
                { name: "مشروع: عرض تقديمي تنفيذي لنتائج مشروع بيانات", primary: "executive presentation of data project results" }
              ]
            },
            {
              unit_index: 5, code: "3.7.5",
              name: "القرارات المبنية على البيانات",
              goal: "بناء ثقافة وأنظمة القرار المبني على البيانات في المؤسسات",
              key_concepts: ["Decision Intelligence","Analytical Hierarchy","Decision Support","Causal Decision","Data Democracy"],
              lessons: [
                { name: "ذكاء القرار Decision Intelligence: ما وراء التحليل", primary: "decision intelligence framework" },
                { name: "أنواع القرارات: من تشغيلي لاستراتيجي", primary: "decision types and data requirements" },
                { name: "أنظمة دعم القرار: من الصورة الكاملة", primary: "decision support systems design" },
                { name: "التفكير السببي Causal في صنع القرار", primary: "causal thinking for better decisions" },
                { name: "الأخطاء الشائعة في القرارات المبنية على بيانات", primary: "common data-driven decision mistakes" },
                { name: "Data Democracy: من يستطيع رؤية البيانات؟", primary: "data democracy and self-service analytics" },
                { name: "OKRs مبنية على البيانات: القياس الصحيح", primary: "data-driven OKRs" },
                { name: "بناء حلقة ردود فعل مبنية على البيانات", primary: "data feedback loops in organizations" },
                { name: "مشروع: إطار قرار مبني على بيانات لمشكلة مؤسسية", primary: "data-driven decision framework project" }
              ]
            },
            {
              unit_index: 6, code: "3.7.6",
              name: "نماذج الأعمال القائمة على البيانات",
              goal: "تصميم ومقارنة نماذج الأعمال التي تجعل البيانات في قلب الاستراتيجية",
              key_concepts: ["Data-Driven Business Models","Platform Economics","Network Effects","Data Moats","AI Products"],
              lessons: [
                { name: "نماذج الأعمال البيانية: التصنيف والمقارنة", primary: "data business model taxonomy" },
                { name: "اقتصاد المنصات وآثار الشبكة", primary: "platform economics and network effects" },
                { name: "الخندق البياني Data Moat: الميزة التنافسية", primary: "data moat as competitive advantage" },
                { name: "المنتجات القائمة على الذكاء الاصطناعي: التصميم", primary: "AI-powered product design" },
                { name: "فريميوم وAI: الاشتراك مقابل الأداء", primary: "freemium and AI monetization" },
                { name: "API اقتصاديات: الدخل من البيانات والنماذج", primary: "API economy for data and models" },
                { name: "استراتيجية Go-to-Market للمنتجات البيانية", primary: "GTM strategy for data products" },
                { name: "قياس النمو في الشركات البيانية", primary: "growth metrics for data companies" },
                { name: "مشروع: نموذج عمل لشركة بيانات يمنية ناشئة", primary: "data startup business model for Yemen" }
              ]
            },
            {
              unit_index: 7, code: "3.7.7",
              name: "تطوير المهارات وتعليم الفريق",
              goal: "بناء برامج تطوير مهاري مستمرة لفرق البيانات",
              key_concepts: ["Learning Culture","Technical Mentoring","Knowledge Sharing","Communities of Practice","Guilds"],
              lessons: [
                { name: "ثقافة التعلم المستمر في فرق البيانات", primary: "learning culture for data teams" },
                { name: "الإرشاد التقني Mentoring: كيف تُطوّر فريقك", primary: "technical mentoring for data scientists" },
                { name: "مشاركة المعرفة: الوثائق والـLunch & Learn", primary: "knowledge sharing practices" },
                { name: "مجتمعات الممارسة Communities of Practice", primary: "communities of practice for data teams" },
                { name: "Guilds: الفرق المتقاطعة للمهارات", primary: "guild model for cross-team skills" },
                { name: "خطط التطوير الفردي IDP للبيانيين", primary: "individual development plans for DS" },
                { name: "مشاريع Hackathon وابتكار الفريق", primary: "hackathons for team innovation" },
                { name: "بناء Culture of Experimentation", primary: "culture of experimentation in data teams" },
                { name: "مشروع: برنامج تطوير مهاري لفريق بيانات", primary: "data team skills development program" }
              ]
            },
            {
              unit_index: 8, code: "3.7.8",
              name: "التعاون مع الأعمال والمنتج",
              goal: "بناء جسور التعاون الفعّال بين فرق البيانات وفرق الأعمال والمنتج",
              key_concepts: ["Business Partnership","Embedded DS","Data Product Manager","OKR Alignment","Stakeholder Communication"],
              lessons: [
                { name: "الشراكة مع الأعمال: من العزل للدمج", primary: "business partnership for data teams" },
                { name: "Data Product Manager: الدور المُلتحم", primary: "data product manager role" },
                { name: "Embedded DS: عالم بيانات في كل فريق", primary: "embedded data scientist model" },
                { name: "مواءمة OKRs بين البيانات والأعمال", primary: "OKR alignment data and business" },
                { name: "تقديم نتائج AI لغير التقنيين", primary: "presenting AI results to non-technical" },
                { name: "الموافقة على النموذج: من يقول نعم للإنتاج", primary: "model approval process" },
                { name: "Sprint Reviews لفرق البيانات المتقاطعة", primary: "cross-functional sprint reviews" },
                { name: "بناء الثقة: من الشك في AI للاعتماد عليه", primary: "building trust in AI systems" },
                { name: "مشروع: خطة تعاون بين فريق بيانات وفريق أعمال", primary: "data and business team collaboration plan" }
              ]
            },
            {
              unit_index: 9, code: "3.7.9",
              name: "مشروع التخرج: نظام علوم البيانات الشامل",
              goal: "إثبات الكفاءة الكاملة بمشروع علوم بيانات إنتاجي شامل يحل مشكلة حقيقية",
              key_concepts: ["End-to-End DS Project","Problem Framing","Production System","Stakeholder Demo","Impact Measurement"],
              lessons: [
                { name: "اختيار المشكلة: ما يستحق حلّه حقاً", primary: "problem selection for capstone project" },
                { name: "تأطير المشكلة: من السؤال للمواصفات", primary: "problem framing from business to ML" },
                { name: "جمع البيانات والتحقق من الجدوى", primary: "data collection and feasibility" },
                { name: "الحل كامل: النموذج والأنبوب والواجهة", primary: "full solution model pipeline interface" },
                { name: "نشر الإنتاج: من Jupyter إلى API حي", primary: "production deployment from notebook to API" },
                { name: "المراقبة والتقييم المستمر", primary: "ongoing monitoring and evaluation" },
                { name: "عرض المشروع لأصحاب المصلحة", primary: "stakeholder presentation of capstone" },
                { name: "قياس الأثر الحقيقي: ما الذي تغيّر؟", primary: "impact measurement for data project" },
                { name: "مشروع التخرج: نظام بيانات شامل لمشكلة يمنية حقيقية", primary: "Yemen data science capstone project" }
              ]
            }
          ]
        }
      ]
    }
  ]
};

function makeGoal(lessonName, unitName) {
  return `يُتقن المتعلم ${lessonName} ويطبّقها عملياً في سياق ${unitName} مع بناء تفكير تحليلي منهجي.`;
}

function makeBridge(lessonName, lessonIndex, unitName) {
  if (lessonIndex === 0) return `نبدأ مع ${lessonName} كأساس نبني عليه فهمنا الكامل لـ${unitName}.`;
  return `بعد ما بنيناه، ننتقل الآن إلى ${lessonName} لنُعمّق فهمنا ونُوسّع تطبيقاتنا.`;
}

function makeConcepts(primary, lessonName) {
  const terms = primary.split(" ").filter(t => t.length > 3).slice(0, 3);
  return terms.map((term, i) => ({
    name: term,
    explanation: `مفهوم جوهري في ${lessonName} يُشكّل أساساً لتطبيقات علوم البيانات الحديثة.`,
    weight: [1.5, 1.2, 1.0][i] || 1.0
  }));
}

function makeMistakes(primary, unitName) {
  return [
    {
      description: `تطبيق ${primary.split(" ")[0]} دون التحقق من افتراضياته المطلوبة`,
      severity: "high",
      correction: `تحقق دائماً من توافر شروط التطبيق قبل الاستخدام في ${unitName}`
    },
    {
      description: `تجاهل تأثير قيم مفقودة أو شاذة على نتائج ${primary.split(" ")[0]}`,
      severity: "medium",
      correction: "فحص البيانات دائماً وتنظيفها قبل أي تحليل أو نمذجة"
    }
  ];
}

function makeExamples(primary, unitName) {
  return [
    `تطبيق ${primary.split(" ")[0]} على بيانات مبيعات السوق اليمني لاستخلاص أنماط الشراء`,
    `استخدام مفاهيم ${unitName} في تحليل البيانات الاجتماعية والاقتصادية المحلية`
  ];
}

function makeExamQuestion(lessonName, primary) {
  return `كيف تُطبّق ${primary.split(" ").slice(0, 3).join(" ")} لحل مشكلة بيانات حقيقية؟ اشرح خطواتك بوضوح مع تبرير كل قرار.`;
}

function makeLabForUnit(unitDef) {
  const code = unitDef.code;
  const uName = unitDef.name;
  const keys = unitDef.key_concepts;

  return {
    lab_index: 1,
    title: `مختبر ${uName}`,
    scenario: `أمامك مجموعة بيانات حقيقية متعلقة بـ${uName}. طبّق المفاهيم الأساسية (${keys.slice(0, 3).join("، ")}) لاستخلاص رؤى قابلة للتطبيق.`,
    pedagogical_sequence: "diagnosis → exploration → application → validation → communication",
    allowed_tools: ["nukhba_ide_python"],
    questions: [
      {
        kind: "diagnostic",
        prompt: `قبل البدء: ما المشكلة التي تحلّها ${uName} وما البيانات التي تحتاجها؟ اشرح بكلماتك الخاصة مع ذكر مثال من الواقع.`,
        rubric: `التقييم: وضوح المشكلة (40%)، دقة تحديد البيانات (30%)، ملاءمة المثال (30%)`,
        solution_outline: `تحديد المشكلة وأهدافها، ذكر نوع البيانات ومصادرها، مثال تطبيقي واقعي`,
        points: 20
      },
      {
        kind: "decision",
        prompt: `لديك خياران لمعالجة البيانات في سياق ${uName}. كيف تقرر أيهما أنسب؟ وما معايير قرارك؟`,
        rubric: `التقييم: منطق القرار (40%)، معرفة المفاضلات (35%)، قابلية التطبيق (25%)`,
        solution_outline: `عرض المعايير الرئيسية، مقارنة الخيارين، القرار المبرر بالبيانات`,
        points: 25
      },
      {
        kind: "application",
        prompt: `اكتب كود Python يُطبّق المفاهيم الأساسية لـ${uName} على مجموعة بيانات نموذجية. يجب أن يشمل الكود: التحميل، المعالجة، التحليل، النتيجة.`,
        rubric: `التقييم: صحة الكود (40%)، جودة التحليل (30%)، وضوح النتائج (30%)`,
        solution_outline: `استيراد المكتبات، تحميل وفحص البيانات، تطبيق ${keys[0]}، عرض النتائج`,
        points: 35
      },
      {
        kind: "analysis",
        prompt: `بعد تطبيق النموذج أو التحليل، لاحظت نتيجة غير متوقعة في البيانات. كيف تشخّص وتُفسّر ما حدث؟`,
        rubric: `التقييم: دقة التشخيص (40%)، عمق التفسير (35%)، الخطوات التصحيحية (25%)`,
        solution_outline: `وصف الظاهرة الشاذة، التحقق من البيانات، تحديد السبب المحتمل، الإجراء التصحيحي`,
        points: 30
      },
      {
        kind: "connection",
        prompt: `كيف يرتبط ما تعلّمته في ${uName} بمجالات علوم البيانات الأخرى؟ أعطِ مثالاً على كيفية استخدام هذه المعرفة في مشروع حقيقي.`,
        rubric: `التقييم: قوة الروابط المذكورة (40%)، ملاءمة المثال (35%)، التفكير التكاملي (25%)`,
        solution_outline: `ذكر ارتباطات مع تعلم آلي أو هندسة بيانات أو تصوير، مثال مشروع متكامل`,
        points: 20
      }
    ]
  };
}

function makeUnitExamQuestions(unitCode, unitDef, passThreshold, timeLimit) {
  const kc = unitDef.key_concepts;
  const uName = unitDef.name;

  const questions = [
    {
      question: `ما الغرض الأساسي من ${kc[0]} في سياق ${uName}؟`,
      options: [
        `تحسين أداء النموذج وتقليل التعقيد الحسابي`,
        `استخراج الأنماط والعلاقات من البيانات بكفاءة`,
        `تحويل البيانات الخام إلى تنسيق قابل للتحليل`,
        `تجاهل القيم المفقودة تلقائياً`
      ],
      correctIndex: 1,
      explanation: `${kc[0]} في ${uName} يهدف أساساً لاستخراج الأنماط والعلاقات من البيانات.`
    },
    {
      question: `متى يجب استخدام ${kc[1] || kc[0]} بدلاً من الأساليب البديلة؟`,
      options: [
        `عندما تكون البيانات صغيرة الحجم ومنظمة تماماً`,
        `عند الحاجة لتحليل عميق وفهم آليات العلاقات بين المتغيرات`,
        `فقط عند غياب بدائل أخرى`,
        `في جميع الحالات دون استثناء`
      ],
      correctIndex: 1,
      explanation: `${kc[1] || kc[0]} يُستخدَم بشكل مثالي عند الحاجة لتحليل عميق للعلاقات.`
    },
    {
      question: `أي من التالي يُعدّ تطبيقاً صحيحاً لـ${uName}؟`,
      options: [
        `تطبيقه مباشرة بدون فحص البيانات مسبقاً`,
        `تقسيم البيانات ثم المعالجة ثم التقييم بترتيب منهجي`,
        `استخدام جميع البيانات للتدريب بدون اختبار`,
        `تجاهل القيم الشاذة دائماً لتحسين النتائج`
      ],
      correctIndex: 1,
      explanation: `التطبيق الصحيح يتبع منهجية منظمة: فحص ثم معالجة ثم نمذجة ثم تقييم.`
    },
    {
      question: `ما التحدي الرئيسي في تطبيق ${kc[0]} على البيانات الحقيقية؟`,
      options: [
        `صعوبة تثبيت المكتبات اللازمة`,
        `التعامل مع القيم المفقودة والبيانات غير النظيفة والأبعاد العالية`,
        `بطء الحسابات على أجهزة حديثة`,
        `عدم توافق ${kc[0]} مع Python`
      ],
      correctIndex: 1,
      explanation: `التحدي الرئيسي في التطبيق الحقيقي هو جودة البيانات والقيم المفقودة.`
    },
    {
      question: `كيف تُقيّم جودة نتائج ${uName}؟`,
      options: [
        `من خلال النظر للأرقام فقط دون تفسير`,
        `باستخدام مقاييس مناسبة للمشكلة مع التحقق من الصحة`,
        `الثقة في النتائج دون فحص إضافي`,
        `مقارنة السرعة فقط`
      ],
      correctIndex: 1,
      explanation: `التقييم الجيد يستخدم مقاييس مناسبة للمشكلة ويتحقق من الصحة بطرق متعددة.`
    },
    {
      question: `أي من الخطوات التالية هي الأولى في أي مشروع ${uName}؟`,
      options: [
        `بناء النموذج مباشرة`,
        `جمع وفهم البيانات وتحديد المشكلة بوضوح`,
        `اختيار الخوارزمية`,
        `تصوير النتائج`
      ],
      correctIndex: 1,
      explanation: `فهم البيانات والمشكلة أولاً هو مبدأ علوم البيانات الذهبي قبل أي شيء آخر.`
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
  const sName = stageDef.name;
  const questions = [];

  const stems = [
    `ما أهمية ${sName} في دورة حياة علوم البيانات؟`,
    `أي تقنية تناسب مشاريع ${sName} ذات البيانات الضخمة؟`,
    `كيف تُشخّص مشكلة شائعة في ${sName}؟`,
    `ما أفضل طريقة لتقييم نتائج ${sName}؟`,
    `كيف تُوثّق عملية ${sName} لفريق العمل؟`,
    `ما الفرق بين النهج التقليدي والحديث في ${sName}؟`,
    `متى تختار أداةً على أخرى في ${sName}؟`,
    `كيف تضمن قابلية استنساخ نتائج ${sName}؟`,
    `ما اعتبارات الأداء الرئيسية في ${sName}؟`,
    `كيف تتعامل مع البيانات غير المتوقعة في ${sName}؟`
  ];

  for (let i = 0; i < 10; i++) {
    questions.push({
      question: stems[i] || `ما الجانب الجوهري في ${sName}؟`,
      options: [
        `النهج الأسرع دائماً هو الأفضل`,
        `المنهج المنظّم والمبني على الفهم العميق للبيانات`,
        `تطبيق أحدث الأدوات بغض النظر عن المشكلة`,
        `الاعتماد على البيانات كاملاً دون تحليل مسبق`
      ],
      correctIndex: 1,
      explanation: `في ${sName}، النجاح يعتمد على المنهج المنظّم والفهم العميق للبيانات والمشكلة.`
    });
  }

  return {
    stage_name: sName,
    pass_threshold_percent: stageDef.exam.pass_threshold_percent,
    time_limit_minutes: stageDef.exam.time_limit_minutes,
    questions
  };
}

function makeLevelExamQuestions(levelDef) {
  const lName = levelDef.name;
  const questions = [];

  const stems = [
    `ما الكفاءة الجوهرية التي يُطوّرها ${lName}؟`,
    `كيف تُدمج مهارات ${lName} في مشروع بيانات متكامل؟`,
    `ما أصعب تحديات ${lName} في بيئة الإنتاج؟`,
    `كيف تُقيّم النضج المهني في ${lName}؟`,
    `أي أداة في ${lName} لها أكبر تأثير على الإنتاجية؟`,
    `كيف تُقرر متى تنتقل من ${lName} للمستوى التالي؟`,
    `ما الصلة بين ${lName} وتوقعات سوق العمل الحديث؟`,
    `كيف تُطبّق ${lName} في سياق الشركات الناشئة؟`,
    `ما مؤشرات النجاح الحقيقية في ${lName}؟`,
    `كيف تحافظ على مهارات ${lName} في ظل التطور السريع؟`,
    `ما الفرق في التطبيق بين ${lName} في شركة كبيرة وصغيرة؟`,
    `كيف تُوصف مشاريع ${lName} في السيرة الذاتية؟`,
    `ما أخلاقيات التطبيق الخاصة بـ${lName}؟`
  ];

  for (let i = 0; i < 13; i++) {
    questions.push({
      question: stems[i],
      options: [
        `الاهتمام بالأدوات على حساب الفهم`,
        `دمج الفهم النظري مع التطبيق العملي والتفكير النقدي`,
        `التركيز على السرعة دون مراعاة الدقة`,
        `التخصص الضيق وتجاهل الجوانب المجاورة`
      ],
      correctIndex: 1,
      explanation: `التميز في ${lName} يأتي من دمج الفهم النظري بالتطبيق العملي والتفكير النقدي المستمر.`
    });
  }

  return {
    level_name: lName,
    pass_threshold_percent: levelDef.exam.pass_threshold_percent,
    time_limit_minutes: levelDef.exam.time_limit_minutes,
    questions
  };
}

function makePlacementTest(levels) {
  const questions = [];
  const topics = [
    { q: "ما الفرق بين DataFrame وSeries في Pandas؟", a: 1, opts: ["كلاهما نفس الشيء", "DataFrame ثنائي الأبعاد وSeries أحادي", "Series أسرع دائماً", "DataFrame لا يدعم العمليات الإحصائية"] },
    { q: "ما مقياس الارتباط المناسب للبيانات الرتبية؟", a: 0, opts: ["Spearman", "Pearson", "Covariance", "Chi-Square"] },
    { q: "ما وظيفة EXPLAIN في SQL؟", a: 2, opts: ["تُضيف تعليق على الجدول", "تحذف الجدول", "تُظهر خطة تنفيذ الاستعلام", "تُعيد تسمية الأعمدة"] },
    { q: "ما المقصود بـOverfitting في التعلم الآلي؟", a: 1, opts: ["النموذج لا يتعلم كافياً", "النموذج يحفظ بيانات التدريب ولا يُعمّم", "النموذج بطيء جداً", "النموذج يحتاج بيانات أكثر"] },
    { q: "ما وظيفة Backpropagation في الشبكات العصبية؟", a: 3, opts: ["تحميل البيانات", "تصوير النتائج", "اختيار المعمارية", "حساب التدرجات وتحديث الأوزان"] },
    { q: "ما الفرق بين Precision وRecall؟", a: 0, opts: ["Precision نسبة الإيجابيات الصحيحة بين التنبؤات الإيجابية، Recall نسبتها من الكل", "كلاهما نفس الشيء", "Recall للتصنيف فقط", "Precision للانحدار فقط"] },
    { q: "ما منهجية ETL؟", a: 2, opts: ["Error-Testing-Logging", "Evaluation-Training-Learning", "Extract-Transform-Load", "Encoding-Transmission-Layer"] },
    { q: "ما وظيفة SHAP في تفسير النماذج؟", a: 1, opts: ["تسريع التدريب", "قياس أهمية كل ميزة في تنبؤ النموذج", "ضغط النموذج", "تحويل البيانات"] },
    { q: "ما الفرق بين Transformer Encoder وDecoder؟", a: 0, opts: ["Encoder للفهم، Decoder للتوليد", "كلاهما متطابقان", "Decoder للفهم، Encoder للتوليد", "Encoder فقط للصور"] },
    { q: "ما وظيفة Docker في مشاريع علوم البيانات؟", a: 3, opts: ["تصوير البيانات", "تدريب النماذج", "إدارة قواعد البيانات", "عزل بيئة التشغيل وضمان الاستنساخية"] },
    { q: "ما نماذج Diffusion في الذكاء الاصطناعي التوليدي؟", a: 2, opts: ["نماذج للتصنيف", "شبكات للترجمة الآلية", "نماذج تُولّد بيانات بإزالة الضجيج تدريجياً", "طريقة لضغط النماذج"] },
    { q: "ما وظيفة A/B Testing في منتجات البيانات؟", a: 1, opts: ["اختبار قاعدة البيانات", "مقارنة نسختين لتحديد الأفضل بشكل إحصائي", "فحص الكود", "تدريب النموذج"] },
    { q: "ما التحدي الرئيسي في Federated Learning؟", a: 0, opts: ["تدريب النماذج دون مشاركة البيانات الخام", "سرعة التدريب", "حجم النموذج", "تنسيق البيانات"] },
    { q: "ما وظيفة Feature Store في MLOps؟", a: 3, opts: ["تدريب النماذج", "نشر النماذج", "مراقبة النماذج", "تخزين وخدمة الميزات باتساق بين التدريب والإنتاج"] },
    { q: "ما الفرق بين Data Lake وData Warehouse؟", a: 1, opts: ["كلاهما متطابقان", "Data Lake للبيانات الخام، Data Warehouse للبيانات المعالجة والمنظمة", "Data Warehouse أسرع دائماً", "Data Lake لا يدعم SQL"] },
    { q: "ما وظيفة Attention Mechanism في Transformers؟", a: 2, opts: ["تقليص البيانات", "تحسين سرعة الحساب", "تحديد أهمية كل عنصر في التسلسل بالنسبة للعناصر الأخرى", "تهيئة الأوزان"] },
    { q: "ما منهجية CRISP-DM في مشاريع البيانات؟", a: 0, opts: ["إطار عمل دوري لدورة حياة مشاريع التنقيب في البيانات", "أداة تصوير بيانات", "نموذج تعلم آلي محدد", "قاعدة بيانات متخصصة"] },
    { q: "ما وظيفة Data Contract في هندسة البيانات؟", a: 3, opts: ["عقد قانوني لاستخدام البيانات", "نموذج تعلم آلي", "طريقة تخزين البيانات", "اتفاقية بين منتجي ومستهلكي البيانات حول الهيكل والجودة"] }
  ];

  for (const q of questions) {
    questions.indexOf(q);
    questions.push = undefined;
    break;
  }

  for (const item of questions) {
    questions.length;
    break;
  }

  const finalQs = [];
  for (const item of topics) {
    finalQs.push({
      question: item.q,
      options: item.opts,
      correctIndex: item.a,
      explanation: `هذا السؤال يقيس الفهم الأساسي لمفاهيم علوم البيانات الجوهرية.`
    });
  }

  return finalQs;
}

function buildFullFile() {
  const levels = [];
  const unitExamBanks = {};
  const stageExamBanks = {};
  const levelExamBanks = {};

  for (const levelDef of CURRICULUM.levels) {
    const stages = [];

    for (const stageDef of levelDef.stages) {
      const units = [];

      for (const unitDef of stageDef.units) {
        const lessons = unitDef.lessons.map((lesson, lessonIndex) => {
          return {
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
            session_complete_criterion: `يستطيع المتعلم شرح ${lesson.primary} وتطبيقه عملياً في مشروع بيانات حقيقي مع تفسير نتائجه بوضوح.`,
            expected_duration_minutes: 45,
            motivation_hook: `إتقان "${lesson.name}" يُضيف قيمة حقيقية لملفك المهني ويُفتح أمامك فرص عمل في علوم البيانات المحلية والعالمية.`,
            learning_objectives: [
              { statement: `شرح وفهم مفهوم ${lesson.primary.split(" ").slice(0, 3).join(" ")} من الناحية النظرية والعملية`, bloom_level: "understand" },
              { statement: `تطبيق ${lesson.primary.split(" ")[0]} في مشروع بيانات حقيقي مع تحليل النتائج`, bloom_level: "apply" }
            ],
            solution_outline: `فهم ${lesson.primary}، التطبيق في Python بـNumPy أو Pandas أو sklearn، التحقق من النتائج، تفسيرها وربطها بالمشكلة الأصلية.`
          };
        });

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

  const placementQuestions = makePlacementTest(CURRICULUM.levels);

  const output = {
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

  return output;
}

console.log("توليد ملف uni-datascience-instruction.json...");
const result = buildFullFile();
const json = JSON.stringify(result, null, 2);
writeFileSync("uni-datascience-instruction.json", json, "utf8");
const sizeKB = Math.round(json.length / 1024);

const totalLessons = result.levels.reduce((acc, l) =>
  acc + l.stages.reduce((a2, s) =>
    a2 + s.units.reduce((a3, u) => a3 + u.lessons.length, 0), 0), 0);
const totalUnits = result.levels.reduce((acc, l) =>
  acc + l.stages.reduce((a2, s) => a2 + s.units.length, 0), 0);
const totalStages = result.levels.reduce((acc, l) => acc + l.stages.length, 0);

console.log(`✅ تم التوليد بنجاح!`);
console.log(`📦 الحجم: ${sizeKB} KB`);
console.log(`📚 المستويات: ${result.levels.length}`);
console.log(`🎯 المراحل: ${totalStages}`);
console.log(`📖 الوحدات: ${totalUnits}`);
console.log(`📝 الدروس: ${totalLessons}`);
console.log(`🧪 أسئلة التصنيف: ${result.placement_test_questions.length}`);
