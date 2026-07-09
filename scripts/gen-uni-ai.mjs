import { writeFileSync } from "fs";

const CURRICULUM = {
  schema_version: "v4.1",
  slug: "uni-ai",
  name: "الذكاء الاصطناعي",
  icon: "🤖",
  description: "مسار احترافي متكامل في الذكاء الاصطناعي يبدأ من الرياضيات والبرمجة ويصل إلى بناء نماذج توليدية وأنظمة إنتاجية وقيادة فرق الذكاء الاصطناعي، وفق أحدث المعايير الأكاديمية والصناعية العالمية",
  target_persona: "مهندس ذكاء اصطناعي يسعى للتأهل الكامل من أسس الرياضيات والبرمجة إلى تصميم نماذج متقدمة ونشرها في بيئات إنتاجية وقيادة مشاريع الذكاء الاصطناعي في الشركات والمؤسسات",
  teacher_tone: "خبير ذكاء اصطناعي يجمع بين عمق الرياضيات وحدة الهندسة وشغف الابتكار، يبدأ كل مفهوم بسؤال حقيقي من الواقع ثم يبني الحل خطوة بخطوة، ويربط كل خوارزمية بتأثيرها الحقيقي في العالم",
  allowed_viz_templates: ["flowchart", "comparison_table", "timeline", "architecture_diagram", "network_diagram", "scatter_plot"],
  allowed_tools: ["nukhba_ide_python", "nukhba_ide_js", "regex_playground"],
  levels: [
    {
      level_index: 1,
      name: "أساسيات الذكاء الاصطناعي",
      goal: "بناء أساس متين في الرياضيات والبرمجة وتعلم الآلة الكلاسيكي وهندسة البيانات وتقييم النماذج، بما يُهيّئ المتعلم للتعامل مع مشاريع الذكاء الاصطناعي الحقيقية وفهم النماذج من الداخل",
      bloom_focus: "understand",
      exam: { pass_threshold_percent: 65, time_limit_minutes: 70 },
      stages: [
        {
          stage_index: 1,
          name: "الرياضيات للذكاء الاصطناعي",
          goal: "بناء العمق الرياضي اللازم لفهم خوارزميات الذكاء الاصطناعي من الداخل: جبر خطي وتفاضل وتكامل واحتمالات وتحسين",
          bloom_focus: "understand",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.1.1",
              name: "الجبر الخطي: لغة الذكاء الاصطناعي",
              goal: "إتقان مفاهيم المتجهات والمصفوفات والفضاءات الخطية كأدوات رياضية جوهرية في كل خوارزمية ذكاء اصطناعي",
              key_concepts: ["Vectors","Matrices","Dot Product","Eigenvalues","SVD"],
              lessons: [
                { name: "المتجهات: التمثيل الرياضي للبيانات", primary: "vectors and vector spaces for AI" },
                { name: "المصفوفات وعملياتها: الجمع والضرب والنقل", primary: "matrix operations multiplication and transpose" },
                { name: "المحدد والمعكوس: متى تُحل الأنظمة الخطية", primary: "matrix determinant and inverse" },
                { name: "القيم والمتجهات الذاتية: قلب تحليل البيانات", primary: "eigenvalues and eigenvectors in AI" },
                { name: "SVD: تحليل القيمة الفردية وتطبيقاته", primary: "SVD decomposition and applications" },
                { name: "فضاءات الاسم والصورة: فهم التحولات الخطية", primary: "null space and column space of matrices" },
                { name: "تحسين القيم: المربعات الصغرى وتطبيقاته", primary: "least squares optimization with linear algebra" },
                { name: "الضرب الخارجي والمتجهات المتعامدة", primary: "cross product and orthogonality" },
                { name: "الجبر الخطي بـNumPy: من النظرية للكود", primary: "linear algebra implementation with NumPy" }
              ]
            },
            {
              unit_index: 2, code: "1.1.2",
              name: "التفاضل والتكامل للتعلم العميق",
              goal: "فهم التفاضل والتكامل بعمق كافٍ لفهم الانحدار التدريجي والانتشار الخلفي والتحسين",
              key_concepts: ["Derivatives","Chain Rule","Gradient","Partial Derivatives","Jacobian"],
              lessons: [
                { name: "الاشتقاق: قياس معدل التغيير في النماذج", primary: "derivatives and rate of change for AI" },
                { name: "قاعدة السلسلة: أساس الانتشار الخلفي", primary: "chain rule for backpropagation" },
                { name: "المشتقات الجزئية والتدرج: الاتجاه الأمثل", primary: "partial derivatives and gradient in AI" },
                { name: "المشتقات من الدرجة الثانية: مصفوفة هيسيان", primary: "second derivatives and Hessian matrix" },
                { name: "التفاضل التلقائي: كيف تحسب الأطر التدرجات", primary: "automatic differentiation in deep learning" },
                { name: "الجاكوبيان: تدرجات الدوال متعددة الإخراج", primary: "Jacobian matrix for multivariable functions" },
                { name: "التكامل والاحتمالات: مساحات الكثافة", primary: "integration and probability density functions" },
                { name: "تحسين الدوال بالتفاضل: نقاط الحرجة", primary: "optimization using calculus critical points" },
                { name: "التفاضل والتكامل بـPython: SymPy وAutoGrad", primary: "calculus implementation with SymPy and autograd" }
              ]
            },
            {
              unit_index: 3, code: "1.1.3",
              name: "الاحتمالات وتوزيعات البيانات",
              goal: "بناء أساس قوي في نظرية الاحتمالات اللازمة لفهم النماذج الاحتمالية والبيانات غير اليقينية",
              key_concepts: ["Probability Axioms","Conditional Probability","Bayes Theorem","Random Variables","Distributions"],
              lessons: [
                { name: "أساسيات الاحتمالات: الفضاء العيني والأحداث", primary: "probability fundamentals and sample space" },
                { name: "الاحتمال الشرطي والاستقلالية", primary: "conditional probability and independence" },
                { name: "نظرية بايز: التحديث من البيانات", primary: "Bayes theorem and posterior inference" },
                { name: "المتغيرات العشوائية المتقطعة والمستمرة", primary: "discrete and continuous random variables" },
                { name: "التوزيعات الشائعة: عادي وثنائي وبواسون", primary: "common probability distributions Gaussian Binomial Poisson" },
                { name: "التوقع والتباين: ملخص التوزيع بعددين", primary: "expected value and variance of distributions" },
                { name: "التوزيع الطبيعي متعدد المتغيرات", primary: "multivariate Gaussian distribution" },
                { name: "نظرية الحد المركزي: لماذا يسود التوزيع الطبيعي", primary: "central limit theorem and its importance in AI" },
                { name: "الاحتمالات بـPython: SciPy والمحاكاة", primary: "probability computations with SciPy and simulation" }
              ]
            },
            {
              unit_index: 4, code: "1.1.4",
              name: "الإحصاء الاستدلالي للذكاء الاصطناعي",
              goal: "تطبيق الإحصاء الاستدلالي لتقييم النماذج واتخاذ قرارات مبنية على البيانات",
              key_concepts: ["Hypothesis Testing","Confidence Intervals","MLE","MAP","Bayesian Inference"],
              lessons: [
                { name: "اختبار الفرضيات: صنع قرار من البيانات", primary: "hypothesis testing in AI model evaluation" },
                { name: "فترات الثقة وعدم اليقين في النماذج", primary: "confidence intervals for model uncertainty" },
                { name: "تقدير الإمكانية القصوى: MLE", primary: "maximum likelihood estimation in AI" },
                { name: "تقدير ما بعد التوزيع الاحتمالي: MAP", primary: "maximum a posteriori estimation" },
                { name: "الاستدلال البايزي: بناء المعرفة تدريجياً", primary: "Bayesian inference and posterior updating" },
                { name: "اختبارات الجودة: Chi-Square وKolmogorov-Smirnov", primary: "goodness of fit tests for distributions" },
                { name: "التحليل متعدد المتغيرات: الارتباط والتباين المشترك", primary: "multivariate analysis correlation and covariance" },
                { name: "البيانات وغياب التوزيع: الاختبارات اللابارامترية", primary: "non-parametric tests for non-normal data" },
                { name: "الإحصاء الاستدلالي بـPython: تحليل كامل", primary: "inferential statistics with Python statsmodels" }
              ]
            },
            {
              unit_index: 5, code: "1.1.5",
              name: "نظرية المعلومات للذكاء الاصطناعي",
              goal: "فهم نظرية المعلومات كأساس لدوال الخسارة وضغط البيانات وقياس عدم اليقين في النماذج",
              key_concepts: ["Entropy","Cross-Entropy","KL Divergence","Mutual Information","Information Gain"],
              lessons: [
                { name: "الإنتروبيا: قياس عدم اليقين في المعلومات", primary: "entropy and information uncertainty" },
                { name: "الإنتروبيا الشرطية والمشتركة", primary: "conditional and joint entropy" },
                { name: "Cross-Entropy: دالة خسارة التصنيف", primary: "cross entropy loss function for classification" },
                { name: "KL Divergence: قياس الفرق بين التوزيعات", primary: "KL divergence between probability distributions" },
                { name: "المعلومات المشتركة: قياس الاعتماد بين المتغيرات", primary: "mutual information for feature selection" },
                { name: "كسب المعلومات: اختيار الميزات وشجرة القرار", primary: "information gain in decision trees" },
                { name: "ضغط البيانات: ترميز هوفمان والضغط المثلى", primary: "data compression Huffman coding" },
                { name: "قيد المعلومات: المعدل والتشويش في الشبكات", primary: "channel capacity and information limits" },
                { name: "نظرية المعلومات بـPython: تطبيقات عملية", primary: "information theory applications in Python" }
              ]
            },
            {
              unit_index: 6, code: "1.1.6",
              name: "التحسين الرياضي: قلب التدريب",
              goal: "فهم خوارزميات التحسين من الانحدار التدريجي إلى الأساليب المتقدمة كأساس لكل نموذج ذكاء اصطناعي",
              key_concepts: ["Gradient Descent","Convexity","Lagrange Multipliers","Adam","Learning Rate"],
              lessons: [
                { name: "التحسين ومفهوم الدالة المحدبة", primary: "optimization and convexity in AI" },
                { name: "الانحدار التدريجي: الخوارزمية الأساسية للتعلم", primary: "gradient descent algorithm variants" },
                { name: "SGD وMini-batch: التوازن بين الدقة والسرعة", primary: "stochastic and mini-batch gradient descent" },
                { name: "المحسّنات المتقدمة: Adam وRMSprop وAdaGrad", primary: "Adam RMSprop and AdaGrad optimizers" },
                { name: "معدل التعلم: الجدولة والتسخين والتبريد", primary: "learning rate scheduling and warm-up" },
                { name: "المضاعفات اللاغرانجية: التحسين مع القيود", primary: "Lagrange multipliers constrained optimization" },
                { name: "التحسين الاحتمالي: تقدير خاليًا من التدرج", primary: "gradient-free optimization methods" },
                { name: "Hyperparameter Optimization: البايزي والشبكة", primary: "Bayesian hyperparameter optimization" },
                { name: "التحسين بـPyTorch: autograd وoptimizers", primary: "optimization implementation with PyTorch" }
              ]
            },
            {
              unit_index: 7, code: "1.1.7",
              name: "الرياضيات المتقطعة للذكاء الاصطناعي",
              goal: "بناء أسس الرياضيات المتقطعة اللازمة لتصميم الخوارزميات وتحليل تعقيدها",
              key_concepts: ["Graph Theory","Combinatorics","Logic","Recursion","Complexity"],
              lessons: [
                { name: "نظرية الرسم البياني: بنية العلاقات والشبكات", primary: "graph theory for AI and networks" },
                { name: "التوافقيات: عد الاحتمالات وتحليل النماذج", primary: "combinatorics and counting for AI" },
                { name: "المنطق الرياضي والاستنتاج الآلي", primary: "mathematical logic for automated reasoning" },
                { name: "التكرار والبرمجة الديناميكية", primary: "recursion and dynamic programming" },
                { name: "تعقيد الخوارزميات: Big-O والحدود", primary: "algorithm complexity Big-O analysis" },
                { name: "الشبكات والمخططات: تمثيل العلاقات", primary: "network graphs and relationship modeling" },
                { name: "نظرية المجموعات وعلاقات الرتبة الجزئية", primary: "set theory and partial order relations" },
                { name: "الخوارزميات على الرسوم البيانية: BFS وDFS وDijkstra", primary: "graph algorithms BFS DFS Dijkstra" },
                { name: "الرياضيات المتقطعة بـPython: NetworkX", primary: "discrete mathematics with NetworkX in Python" }
              ]
            },
            {
              unit_index: 8, code: "1.1.8",
              name: "الجبر الخطي التطبيقي: PCA وSVD",
              goal: "تطبيق تقنيات تحليل الأبعاد والتحولات الرياضية في مشاريع الذكاء الاصطناعي الحقيقية",
              key_concepts: ["PCA","SVD","Low-Rank Approximation","Whitening","Feature Compression"],
              lessons: [
                { name: "PCA: تحليل المكونات الرئيسية من الصفر", primary: "principal component analysis from scratch" },
                { name: "SVD التطبيقي: ضغط الصور وتوصيات الأفلام", primary: "SVD applications image compression recommendations" },
                { name: "التقريب ذو الرتبة المنخفضة: تقليل الأبعاد الكفء", primary: "low rank approximation for dimensionality reduction" },
                { name: "Whitening وDecorrelation: تجهيز البيانات للتعلم", primary: "whitening and decorrelation preprocessing" },
                { name: "ICA: تحليل المكونات المستقلة", primary: "independent component analysis ICA" },
                { name: "Non-negative Matrix Factorization: NMF", primary: "NMF for topic modeling and feature extraction" },
                { name: "Random Projections: تحليل الأبعاد السريع", primary: "random projections Johnson-Lindenstrauss" },
                { name: "تحليل التباين المتعدد: MANOVA", primary: "multivariate analysis MANOVA" },
                { name: "مشروع: تطبيق تحليل الأبعاد على بيانات حقيقية", primary: "dimensionality reduction project on real dataset" }
              ]
            },
            {
              unit_index: 9, code: "1.1.9",
              name: "مشروع الرياضيات الشامل: نموذج من الأساس",
              goal: "تطبيق كل المفاهيم الرياضية المكتسبة في بناء نموذج تعلم آلي من الصفر بدون مكتبات",
              key_concepts: ["From Scratch Implementation","Mathematical Grounding","Gradient Flow","Numerical Stability","Documentation"],
              lessons: [
                { name: "تصميم نموذج تعلم آلي بسيط بالرياضيات البحتة", primary: "simple ML model design with pure mathematics" },
                { name: "تنفيذ الانحدار الخطي من الصفر بـNumPy", primary: "linear regression from scratch NumPy implementation" },
                { name: "تنفيذ الانحدار اللوجستي من الصفر", primary: "logistic regression from scratch with gradient descent" },
                { name: "تنفيذ شبكة عصبية بسيطة يدوياً", primary: "simple neural network from scratch forward and backward pass" },
                { name: "الاستقرار العددي: تجنب Overflow وUnderflow", primary: "numerical stability in ML implementations" },
                { name: "التحقق من الصحة: Gradient Checking", primary: "gradient checking for correct backpropagation" },
                { name: "المقارنة مع مكتبات sklearn وPyTorch", primary: "comparing scratch implementation with sklearn PyTorch" },
                { name: "توثيق الرياضيات: كتابة تقرير علمي", primary: "mathematical documentation and scientific report" },
                { name: "مراجعة شاملة وتقديم المشروع", primary: "final project review and presentation" }
              ]
            }
          ]
        },
        {
          stage_index: 2,
          name: "البرمجة للذكاء الاصطناعي",
          goal: "إتقان Python وأدواته ومكتباته الجوهرية كأرضية برمجية متينة لبناء وتجريب نماذج الذكاء الاصطناعي",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.2.1",
              name: "Python المتقدم للذكاء الاصطناعي",
              goal: "إتقان ميزات Python المتقدمة اللازمة لكتابة كود ذكاء اصطناعي نظيف وكفء وقابل للصيانة",
              key_concepts: ["Decorators","Generators","Context Managers","Type Hints","Metaclasses"],
              lessons: [
                { name: "المُزخرفات: إضافة قدرات للدوال والكلاسات", primary: "Python decorators for AI code" },
                { name: "المولّدات: معالجة البيانات الضخمة كسولاً", primary: "generators for large dataset processing" },
                { name: "مديرو السياق: إدارة الموارد بأمان", primary: "context managers for resource management in AI" },
                { name: "Type Hints وmypy: كود Python آمن النوع", primary: "type hints and mypy for AI projects" },
                { name: "الميتاكلاسات: بناء أُطر عمل مرنة", primary: "metaclasses for flexible AI frameworks" },
                { name: "Dataclasses وAttrs: هياكل بيانات حديثة", primary: "dataclasses for AI configuration and data structures" },
                { name: "الذاكرة والمراجع: إدارة الكائنات الكبيرة", primary: "memory management for large AI models" },
                { name: "ABC وProtocols: تصميم الواجهات المرنة", primary: "abstract base classes and protocols for AI" },
                { name: "Python الفعّال: ProfilingوOptimization", primary: "Python profiling and optimization for AI workloads" }
              ]
            },
            {
              unit_index: 2, code: "1.2.2",
              name: "NumPy وSciPy: الحوسبة العلمية",
              goal: "إتقان NumPy وSciPy للحساب العلمي الكفء كأساس لكل مكتبات الذكاء الاصطناعي",
              key_concepts: ["ndarray","Broadcasting","Vectorization","SciPy","Sparse Matrices"],
              lessons: [
                { name: "ndarray المتقدم: الأشكال والأبعاد والإعادة", primary: "NumPy advanced ndarray reshaping and broadcasting" },
                { name: "Vectorization: تسريع الحسابات بلا حلقات", primary: "NumPy vectorization for AI computations" },
                { name: "العمليات الخطية بـnumpy.linalg", primary: "NumPy linear algebra operations for AI" },
                { name: "المصفوفات المتفرقة: تمثيل البيانات الكبيرة", primary: "sparse matrices with scipy.sparse" },
                { name: "SciPy.optimize: خوارزميات التحسين الجاهزة", primary: "SciPy optimization algorithms" },
                { name: "SciPy.signal: معالجة الإشارات والتحويل فورييه", primary: "SciPy signal processing and FFT" },
                { name: "Einsum: ضرب التنسورات المعبّر", primary: "NumPy einsum for tensor operations" },
                { name: "الاستيفاء والتقريب: SciPy.interpolate", primary: "SciPy interpolation for data approximation" },
                { name: "مقارنة NumPy مع CuPy: التسريع بـGPU", primary: "NumPy vs CuPy GPU acceleration" }
              ]
            },
            {
              unit_index: 3, code: "1.2.3",
              name: "هياكل البيانات والخوارزميات للذكاء الاصطناعي",
              goal: "إتقان هياكل البيانات والخوارزميات الجوهرية التي تُشكّل أساس نماذج الذكاء الاصطناعي",
              key_concepts: ["Trees","Graphs","Hash Tables","Sorting","Dynamic Programming"],
              lessons: [
                { name: "الأشجار الثنائية وأشجار القرار: من النظرية للكود", primary: "binary trees and decision tree data structures" },
                { name: "الأكوام والأولويات: خوارزميات البحث الجشع", primary: "heaps and priority queues for greedy algorithms" },
                { name: "جداول التجزئة: البحث الفوري في البيانات", primary: "hash tables for fast data lookup in AI" },
                { name: "الرسوم البيانية وخوارزميات المسارات", primary: "graph data structures and pathfinding algorithms" },
                { name: "الفرز والبحث: اختيار الخوارزمية المناسبة", primary: "sorting and searching algorithm selection" },
                { name: "البرمجة الديناميكية: حل المشاكل المتداخلة", primary: "dynamic programming for AI optimization" },
                { name: "Trie وSuffix Trees: معالجة النصوص", primary: "trie and suffix trees for text processing" },
                { name: "Bloom Filters وSketch: البيانات الضخمة السريعة", primary: "probabilistic data structures for large-scale AI" },
                { name: "تحليل تعقيد الخوارزميات في نماذج الذكاء الاصطناعي", primary: "algorithm complexity analysis for AI models" }
              ]
            },
            {
              unit_index: 4, code: "1.2.4",
              name: "البرمجة الكائنية لأُطر الذكاء الاصطناعي",
              goal: "تصميم أنظمة ذكاء اصطناعي قابلة للتوسع والاختبار باستخدام مبادئ OOP المتقدمة",
              key_concepts: ["SOLID Principles","Design Patterns","Inheritance","Composition","Interfaces"],
              lessons: [
                { name: "مبادئ SOLID في كود الذكاء الاصطناعي", primary: "SOLID principles for AI system design" },
                { name: "نمط Strategy: تبديل الخوارزميات ديناميكياً", primary: "strategy pattern for algorithm selection in AI" },
                { name: "نمط Factory: إنشاء النماذج والمعالجات", primary: "factory pattern for model and pipeline creation" },
                { name: "نمط Observer: مراقبة التدريب والأحداث", primary: "observer pattern for training monitoring" },
                { name: "نمط Decorator: إضافة قدرات للنماذج", primary: "decorator pattern for model enhancement" },
                { name: "Composition vs Inheritance في أُطر الذكاء الاصطناعي", primary: "composition over inheritance in AI frameworks" },
                { name: "Protocols وDuck Typing: مرونة بدون تعقيد", primary: "Python protocols for flexible AI interfaces" },
                { name: "Dependency Injection: اختبارية كود الذكاء الاصطناعي", primary: "dependency injection for testable AI code" },
                { name: "تصميم إطار عمل تعلم آلي مصغّر", primary: "mini ML framework design with OOP" }
              ]
            },
            {
              unit_index: 5, code: "1.2.5",
              name: "PyTorch: الإطار الأساسي للذكاء الاصطناعي",
              goal: "إتقان PyTorch كإطار عمل رئيسي لبناء وتدريب نماذج التعلم العميق بمرونة وكفاءة",
              key_concepts: ["Tensors","Autograd","nn.Module","DataLoader","Training Loop"],
              lessons: [
                { name: "Tensors في PyTorch: الجبر الخطي مع Autograd", primary: "PyTorch tensors and automatic differentiation" },
                { name: "Autograd: التمييز التلقائي في PyTorch", primary: "PyTorch autograd computation graph" },
                { name: "nn.Module: بناء النماذج بطريقة PyTorch", primary: "PyTorch nn.Module for model building" },
                { name: "DataLoader وDataset: تغذية النماذج بكفاءة", primary: "PyTorch DataLoader and Dataset classes" },
                { name: "حلقة التدريب الكاملة: forward وbackward وoptimize", primary: "PyTorch complete training loop" },
                { name: "حفظ وتحميل النماذج: checkpointing", primary: "PyTorch model saving and checkpoint loading" },
                { name: "GPU في PyTorch: .to(device) والتسريع", primary: "PyTorch GPU acceleration with CUDA" },
                { name: "PyTorch Lightning: تنظيم كود التدريب", primary: "PyTorch Lightning for organized training code" },
                { name: "مشروع: تدريب نموذج تصنيف كامل بـPyTorch", primary: "complete classification model training with PyTorch" }
              ]
            },
            {
              unit_index: 6, code: "1.2.6",
              name: "اختبار وجودة كود الذكاء الاصطناعي",
              goal: "كتابة كود ذكاء اصطناعي قابل للاختبار والاعتماد عبر منهجيات الاختبار الحديثة",
              key_concepts: ["pytest","Unit Testing","Mocking","Test Data","CI for AI"],
              lessons: [
                { name: "pytest: اختبار كود Python بطريقة احترافية", primary: "pytest for Python AI code testing" },
                { name: "Fixtures والـMocking: اختبار بدون موارد خارجية", primary: "pytest fixtures and mocking for AI tests" },
                { name: "اختبار الأشكال والأنواع في النماذج", primary: "shape and type testing for neural network layers" },
                { name: "Property-Based Testing: اختبار الخصائص", primary: "property based testing for ML functions" },
                { name: "اختبار أنابيب البيانات: صحة التحويلات", primary: "data pipeline testing and validation" },
                { name: "اختبار التكامل: النموذج كامل المسار", primary: "integration testing for full ML pipeline" },
                { name: "TDD في الذكاء الاصطناعي: كتابة الاختبار أولاً", primary: "test driven development for AI systems" },
                { name: "CI/CD للذكاء الاصطناعي: GitHub Actions", primary: "continuous integration for AI projects with GitHub Actions" },
                { name: "توثيق الكود: Docstrings وSphinx وMkDocs", primary: "code documentation for AI projects" }
              ]
            },
            {
              unit_index: 7, code: "1.2.7",
              name: "إدارة البيانات والتجارب",
              goal: "إتقان أدوات إدارة البيانات وتتبع التجارب الضرورية لأي مشروع ذكاء اصطناعي احترافي",
              key_concepts: ["DVC","Weights & Biases","MLflow","Experiment Tracking","Data Versioning"],
              lessons: [
                { name: "DVC: نسخ البيانات ومسارات التعلم الآلي", primary: "DVC for data versioning in ML projects" },
                { name: "Weights & Biases: تتبع التجارب بصرياً", primary: "Weights and Biases experiment tracking" },
                { name: "MLflow: دورة حياة النماذج الكاملة", primary: "MLflow for ML lifecycle management" },
                { name: "Hydra وOmegaConf: إدارة التهيئة المعقدة", primary: "Hydra configuration management for AI experiments" },
                { name: "تسجيل المقاييس والصور والتوزيعات", primary: "logging metrics images and distributions in experiments" },
                { name: "مقارنة التجارب: اختيار أفضل نموذج", primary: "experiment comparison and model selection" },
                { name: "إعادة الإنتاج: Seeds وBenchmarking", primary: "reproducibility seeds and benchmarking for AI" },
                { name: "إدارة Artifacts: النماذج والبيانات والتقارير", primary: "artifact management for models and datasets" },
                { name: "بناء لوحة تتبع تجارب مشروع كاملة", primary: "complete experiment tracking dashboard for AI project" }
              ]
            },
            {
              unit_index: 8, code: "1.2.8",
              name: "Git وأدوات التعاون لمشاريع الذكاء الاصطناعي",
              goal: "إتقان Git وأدوات التعاون الجوهرية لإدارة مشاريع الذكاء الاصطناعي بفريق",
              key_concepts: ["Git Branching","Pull Requests","Code Review","Monorepo","Pre-commit"],
              lessons: [
                { name: "Git المتقدم: Branching وRebase وCherry-pick", primary: "advanced Git for AI team collaboration" },
                { name: "نمط GitFlow لمشاريع الذكاء الاصطناعي", primary: "GitFlow workflow for AI projects" },
                { name: "Pull Requests ومراجعة الكود: أفضل الممارسات", primary: "pull requests and code review for AI teams" },
                { name: "Pre-commit Hooks: جودة تلقائية", primary: "pre-commit hooks for AI code quality" },
                { name: "Monorepo: إدارة مشاريع متعددة معاً", primary: "monorepo management for AI projects" },
                { name: "GitHub Projects وIssues: إدارة المهام", primary: "GitHub project management for AI teams" },
                { name: ".gitignore وLFS: التعامل مع الملفات الكبيرة", primary: "Git LFS for large model and dataset files" },
                { name: "Open Source Contribution: المشاركة في مجتمع الذكاء الاصطناعي", primary: "contributing to AI open source projects" },
                { name: "مشروع تعاوني: ذكاء اصطناعي بفريق على GitHub", primary: "collaborative AI project on GitHub" }
              ]
            },
            {
              unit_index: 9, code: "1.2.9",
              name: "مشروع البرمجة الشامل: نظام ذكاء اصطناعي كامل",
              goal: "توحيد كل مهارات البرمجة المكتسبة في بناء نظام ذكاء اصطناعي متكامل من المشكلة للنشر",
              key_concepts: ["System Design","Pipeline","Testing Suite","Documentation","Deployment"],
              lessons: [
                { name: "تحديد المشكلة وتصميم الحل الكامل", primary: "AI problem definition and solution design" },
                { name: "بناء أنبوب بيانات قابل للاختبار والنسخ", primary: "reproducible and testable data pipeline" },
                { name: "تصميم نموذج وتنفيذه بـPyTorch", primary: "model design and PyTorch implementation" },
                { name: "حلقة التدريب مع تتبع التجارب والـLogging", primary: "training loop with experiment tracking and logging" },
                { name: "مجموعة اختبارات شاملة للنظام", primary: "comprehensive test suite for AI system" },
                { name: "توثيق كامل: README وAPI Docs", primary: "complete documentation README and API docs" },
                { name: "حزم النموذج للنشر: Docker وAPI", primary: "model packaging for deployment with Docker and API" },
                { name: "عرض المشروع: Demo وVisualization", primary: "project demo and visualization presentation" },
                { name: "Code Review وإعداد الملف المهني", primary: "code review and portfolio preparation" }
              ]
            }
          ]
        },
        {
          stage_index: 3,
          name: "تعلم الآلة الكلاسيكي",
          goal: "إتقان خوارزميات تعلم الآلة الكلاسيكية فهماً عميقاً وتطبيقاً عملياً كأساس لا غنى عنه قبل التعلم العميق",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.3.1",
              name: "أسس تعلم الآلة: الإطار العام",
              goal: "بناء فهم شامل لإطار تعلم الآلة: التعريفات والأنواع وسير العمل وإطار التقييم",
              key_concepts: ["Supervised vs Unsupervised","Bias-Variance","Generalization","No Free Lunch","Workflow"],
              lessons: [
                { name: "ما هو تعلم الآلة: تعريف دقيق وليس شعاراً", primary: "machine learning definition types and scope" },
                { name: "التعلم بإشراف وبدون إشراف والتعزيزي", primary: "supervised unsupervised reinforcement learning types" },
                { name: "التحيز والتباين: مفتاح فهم الأداء", primary: "bias variance tradeoff in machine learning" },
                { name: "التعميم والإفراط في التخصيص والإخفاق في التعلم", primary: "generalization overfitting underfitting in ML" },
                { name: "نظرية لا غداء مجاني: لماذا لا توجد خوارزمية مثلى", primary: "no free lunch theorem in machine learning" },
                { name: "سير عمل مشروع تعلم الآلة: المراحل السبع", primary: "machine learning project workflow seven stages" },
                { name: "sklearn: الإطار الأكثر استخداماً في الصناعة", primary: "scikit-learn API and conventions" },
                { name: "Pipelines في sklearn: خط معالجة منظّم", primary: "scikit-learn Pipeline for organized ML workflow" },
                { name: "مشروع تمهيدي: تصنيف من البداية للنهاية", primary: "end to end classification project with sklearn" }
              ]
            },
            {
              unit_index: 2, code: "1.3.2",
              name: "الانحدار: التنبؤ بالقيم المستمرة",
              goal: "إتقان نماذج الانحدار الخطي والمتعدد والمنتظم وتطبيقاتها في مشاكل التنبؤ الحقيقية",
              key_concepts: ["Linear Regression","Ridge","Lasso","ElasticNet","Polynomial Features"],
              lessons: [
                { name: "الانحدار الخطي البسيط: من المعادلة للكود", primary: "simple linear regression from equation to code" },
                { name: "الانحدار الخطي المتعدد: متغيرات متعددة", primary: "multiple linear regression with sklearn" },
                { name: "افتراضات الانحدار والتحقق منها", primary: "linear regression assumptions and diagnostics" },
                { name: "Ridge Regression: تنظيم L2", primary: "Ridge regression L2 regularization" },
                { name: "Lasso Regression: تنظيم L1 وانتقاء الميزات", primary: "Lasso regression L1 and feature selection" },
                { name: "ElasticNet: دمج L1 وL2 بمرونة", primary: "ElasticNet combining L1 and L2 regularization" },
                { name: "الانحدار متعدد الحدود: التعقيد المتحكم به", primary: "polynomial regression and degree selection" },
                { name: "Splines وRBF: الانحدار غير الخطي المرن", primary: "splines and RBF for nonlinear regression" },
                { name: "مشروع: التنبؤ بالأسعار بالانحدار المنتظم", primary: "price prediction project with regularized regression" }
              ]
            },
            {
              unit_index: 3, code: "1.3.3",
              name: "التصنيف: اتخاذ قرارات من البيانات",
              goal: "إتقان خوارزميات التصنيف الأساسية وفهم متى تستخدم كل منها",
              key_concepts: ["Logistic Regression","KNN","Naive Bayes","Linear Discriminant","Decision Boundary"],
              lessons: [
                { name: "الانحدار اللوجستي: التصنيف الاحتمالي", primary: "logistic regression probabilistic classification" },
                { name: "K-Nearest Neighbors: الجيران الأقرب", primary: "K-nearest neighbors algorithm and distance metrics" },
                { name: "Naive Bayes: التصنيف الاحتمالي السريع", primary: "Naive Bayes classifiers for text and data" },
                { name: "Linear Discriminant Analysis: الفصل الخطي", primary: "linear discriminant analysis for classification" },
                { name: "Quadratic Discriminant Analysis", primary: "quadratic discriminant analysis non-linear boundaries" },
                { name: "حدود القرار: فهم ما تعلمه النموذج", primary: "decision boundaries visualization for classification" },
                { name: "التصنيف متعدد الفئات: One-vs-Rest وSoftmax", primary: "multi-class classification strategies OvR softmax" },
                { name: "الفئات غير المتوازنة: SMOTE وClass Weights", primary: "imbalanced classification SMOTE and class weights" },
                { name: "مشروع: كشف الاحتيال بالتصنيف المتعدد", primary: "fraud detection multi-classifier project" }
              ]
            },
            {
              unit_index: 4, code: "1.3.4",
              name: "أشجار القرار والغابات العشوائية",
              goal: "إتقان أشجار القرار والتجميعية كأحد أقوى أدوات تعلم الآلة القابلة للتفسير",
              key_concepts: ["Decision Trees","Random Forests","Gini Impurity","Feature Importance","Bagging"],
              lessons: [
                { name: "أشجار القرار: بناء القرار خطوة بخطوة", primary: "decision tree algorithm Gini and entropy" },
                { name: "التقليم: منع الإفراط في التخصيص", primary: "decision tree pruning and max depth control" },
                { name: "Bagging: التجميعية بأشجار مستقلة", primary: "bagging ensemble with independent trees" },
                { name: "الغابات العشوائية: حكمة الأشجار الكثيرة", primary: "Random Forest ensemble learning" },
                { name: "أهمية الميزات في الغابات العشوائية", primary: "feature importance in Random Forest" },
                { name: "Extra Trees: عشوائية إضافية للتنويع", primary: "Extra Trees extremely randomized trees" },
                { name: "Isolation Forest: كشف الشذوذ بالأشجار", primary: "Isolation Forest for anomaly detection" },
                { name: "ضبط معاملات الغابات العشوائية", primary: "Random Forest hyperparameter tuning" },
                { name: "مشروع: التنبؤ بالمرض بالغابات العشوائية", primary: "disease prediction project with Random Forest" }
              ]
            },
            {
              unit_index: 5, code: "1.3.5",
              name: "التعزيز التدريجي: Boosting",
              goal: "إتقان خوارزميات Boosting التي تهيمن على مسابقات Kaggle وتطبيقات الصناعة",
              key_concepts: ["AdaBoost","Gradient Boosting","XGBoost","LightGBM","CatBoost"],
              lessons: [
                { name: "AdaBoost: التعلم من الأخطاء السابقة", primary: "AdaBoost adaptive boosting algorithm" },
                { name: "Gradient Boosting: التدرج في فضاء الدوال", primary: "gradient boosting machine learning" },
                { name: "XGBoost: الملك بلا منازع في Kaggle", primary: "XGBoost extreme gradient boosting" },
                { name: "LightGBM: السرعة والكفاءة للبيانات الكبيرة", primary: "LightGBM light gradient boosting machine" },
                { name: "CatBoost: التعامل المبني مع المتغيرات الفئوية", primary: "CatBoost for categorical feature handling" },
                { name: "ضبط معاملات Boosting: دليل عملي", primary: "boosting hyperparameter tuning practical guide" },
                { name: "الحماية من الإفراط في التخصيص في Boosting", primary: "regularization in boosting early stopping" },
                { name: "Stacking: دمج نماذج مختلفة للتفوق", primary: "model stacking and blending ensemble" },
                { name: "مشروع: مسابقة Kaggle بـXGBoost وLightGBM", primary: "Kaggle competition with XGBoost and LightGBM" }
              ]
            },
            {
              unit_index: 6, code: "1.3.6",
              name: "آلات المتجهات الداعمة: SVM",
              goal: "فهم وتطبيق SVMs كمصنّفات قوية قابلة للتفسير رياضياً في مشاكل متنوعة",
              key_concepts: ["Hyperplane","Margin","Kernel Trick","SVC","SVR"],
              lessons: [
                { name: "مفهوم الهامش الأقصى: الفصل الأمثل رياضياً", primary: "SVM maximum margin hyperplane concept" },
                { name: "المتجهات الداعمة: من يحدد الحد الفاصل", primary: "support vectors and their role in SVM" },
                { name: "حيلة Kernel: الأبعاد الأعلى للتصنيف غير الخطي", primary: "kernel trick for nonlinear SVM classification" },
                { name: "Kernels الشائعة: RBF وPolynomial وSigmoid", primary: "RBF polynomial sigmoid kernel comparison" },
                { name: "SVC: التصنيف بـSVM", primary: "SVC classification with sklearn SVM" },
                { name: "SVR: الانحدار بـSVM", primary: "SVR support vector regression" },
                { name: "One-Class SVM: كشف الشذوذ", primary: "One-Class SVM anomaly detection" },
                { name: "ضبط C وGamma: التحكم في التعقيد", primary: "SVM C and gamma hyperparameter tuning" },
                { name: "مشروع: تصنيف الصور بـSVM", primary: "image classification project with SVM" }
              ]
            },
            {
              unit_index: 7, code: "1.3.7",
              name: "التعلم غير المُشرف: التجميع وتقليل الأبعاد",
              goal: "إتقان خوارزميات التجميع وتقليل الأبعاد لاستكشاف البيانات غير المُصنّفة",
              key_concepts: ["K-Means","DBSCAN","Hierarchical","UMAP","t-SNE"],
              lessons: [
                { name: "K-Means: تجميع البيانات بالمراكز", primary: "K-Means clustering algorithm and elbow method" },
                { name: "DBSCAN: التجميع على أساس الكثافة", primary: "DBSCAN density-based clustering" },
                { name: "التجميع الهرمي: شجرة الأشباه", primary: "hierarchical clustering and dendrogram" },
                { name: "Gaussian Mixture Models: التجميع الاحتمالي", primary: "Gaussian mixture models for soft clustering" },
                { name: "t-SNE: تصوير الأبعاد العالية في 2D", primary: "t-SNE visualization for high dimensional data" },
                { name: "UMAP: تقليل الأبعاد السريع والدقيق", primary: "UMAP dimensionality reduction for visualization" },
                { name: "PCA التطبيقي: ضغط البيانات قبل النمذجة", primary: "PCA application for preprocessing and compression" },
                { name: "تقييم التجميع: Silhouette وCalinski-Harabasz", primary: "clustering evaluation metrics without labels" },
                { name: "مشروع: تجزئة العملاء بالتجميع غير المُشرف", primary: "customer segmentation with unsupervised clustering" }
              ]
            },
            {
              unit_index: 8, code: "1.3.8",
              name: "تقييم النماذج والتحقق المتقاطع",
              goal: "إتقان منهجيات التقييم الصارمة لضمان أن ما تقيسه يعكس الأداء الحقيقي في الإنتاج",
              key_concepts: ["Cross-Validation","Confusion Matrix","ROC-AUC","RMSE","Stratification"],
              lessons: [
                { name: "مقاييس التصنيف: Precision وRecall وF1", primary: "classification metrics precision recall F1 score" },
                { name: "مصفوفة الارتباك: قراءة أعمق من الدقة", primary: "confusion matrix interpretation beyond accuracy" },
                { name: "ROC وAUC: قياس جودة المصنّف الكامل", primary: "ROC curve and AUC for classifier evaluation" },
                { name: "مقاييس الانحدار: RMSE وMAE وR²", primary: "regression metrics RMSE MAE R squared" },
                { name: "K-Fold Cross-Validation: التقييم الصادق", primary: "K-fold cross validation for honest evaluation" },
                { name: "Stratified وGrouped Cross-Validation", primary: "stratified and group k-fold cross validation" },
                { name: "الاختيار الإحصائي: McNemar وWilcoxon", primary: "statistical model comparison tests" },
                { name: "تسرب البيانات: أخطرسبب لنتائج متفائلة زائفاً", primary: "data leakage in ML pipelines detection and prevention" },
                { name: "مشروع: تقييم صارم لمجموعة نماذج متنافسة", primary: "rigorous evaluation framework for competing models" }
              ]
            },
            {
              unit_index: 9, code: "1.3.9",
              name: "مشروع تعلم الآلة الشامل: من المشكلة للحل",
              goal: "توحيد كل مهارات تعلم الآلة الكلاسيكي في مشروع كامل يحل مشكلة حقيقية بمنهجية علمية",
              key_concepts: ["Problem Definition","EDA","Feature Engineering","Model Selection","Reporting"],
              lessons: [
                { name: "تعريف المشكلة: تحويل سؤال الأعمال لمهمة تعلم آلة", primary: "problem framing from business question to ML task" },
                { name: "التحليل الاستكشافي الموجّه بالفرضيات", primary: "hypothesis-driven exploratory data analysis" },
                { name: "هندسة الميزات المبنية على الخبرة المجالية", primary: "domain-driven feature engineering" },
                { name: "بحث المودل: اختبار منهجي لعائلات مختلفة", primary: "systematic model search across algorithm families" },
                { name: "ضبط المعاملات النهائي: Bayesian Optimization", primary: "final hyperparameter tuning with Bayesian optimization" },
                { name: "تفسير النموذج: SHAP وPDPs", primary: "model interpretation with SHAP and partial dependence" },
                { name: "نشر النموذج: Flask API بسيط", primary: "model deployment with simple Flask API" },
                { name: "تقرير الأعمال: ترجمة الأرقام لقرارات", primary: "business report translating model results to decisions" },
                { name: "مراجعة النظراء وتحسين المشروع", primary: "peer review and project improvement cycle" }
              ]
            }
          ]
        },
        {
          stage_index: 4,
          name: "أساسيات التعلم العميق",
          goal: "بناء فهم عميق لأسس التعلم العميق: الشبكات العصبية والتدرجات والتنظيم وأُطر العمل",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.4.1",
              name: "الشبكات العصبية: المبادئ الأولى",
              goal: "فهم البنية الأساسية للشبكات العصبية وكيف تتعلم من البيانات",
              key_concepts: ["Perceptron","Activation Functions","Forward Pass","Loss Function","Universal Approximation"],
              lessons: [
                { name: "الخلية العصبية الاصطناعية: من الإلهام البيولوجي للرياضيات", primary: "artificial neuron biological inspiration to math" },
                { name: "البيرسبترون: أول شبكة عصبية في التاريخ", primary: "perceptron learning algorithm history" },
                { name: "دوال التنشيط: إضافة اللاخطية", primary: "activation functions ReLU sigmoid tanh comparison" },
                { name: "الشبكات متعددة الطبقات: MLP", primary: "multilayer perceptron forward pass" },
                { name: "دوال الخسارة: قياس الخطأ الصحيح", primary: "loss functions for regression and classification" },
                { name: "نظرية المقرّب الشامل: الشبكات تقرّب أي دالة", primary: "universal approximation theorem for neural networks" },
                { name: "تصميم المعمارية: عدد الطبقات والوحدات", primary: "neural network architecture design principles" },
                { name: "الشبكات العصبية بـPyTorch: بناء أول نموذج", primary: "first neural network with PyTorch" },
                { name: "مشروع: بناء MLP من الصفر وبـPyTorch", primary: "MLP from scratch comparison with PyTorch" }
              ]
            },
            {
              unit_index: 2, code: "1.4.2",
              name: "الانتشار الخلفي: كيف تتعلم الشبكات",
              goal: "فهم الانتشار الخلفي وحساب التدرجات الفعّال كأساس لكل خوارزمية تعلم عميق",
              key_concepts: ["Backpropagation","Chain Rule","Computation Graph","Gradient Flow","Vanishing Gradients"],
              lessons: [
                { name: "رسم مخطط الحساب: تمثيل التدفق البياني", primary: "computation graph for neural network operations" },
                { name: "الانتشار الأمامي: حساب الإخراج خطوة بخطوة", primary: "forward pass step by step computation" },
                { name: "الانتشار الخلفي: تطبيق قاعدة السلسلة", primary: "backpropagation chain rule application" },
                { name: "حساب التدرجات يدوياً: تمرين جوهري", primary: "manual gradient computation exercise" },
                { name: "مشكلة التدرجات المتلاشية والمتفجرة", primary: "vanishing and exploding gradients in deep networks" },
                { name: "Gradient Clipping: احتواء التدرجات المتفجرة", primary: "gradient clipping for exploding gradients" },
                { name: "الانتشار الخلفي عبر الدوال المتكررة", primary: "backpropagation through recurrent connections" },
                { name: "التحقق من التدرجات: gradient_check", primary: "gradient checking implementation and debugging" },
                { name: "Autograd في PyTorch: الانتشار الخلفي التلقائي", primary: "PyTorch autograd backpropagation automatic" }
              ]
            },
            {
              unit_index: 3, code: "1.4.3",
              name: "التحسين في التعلم العميق",
              goal: "إتقان خوارزميات التحسين الحديثة اللازمة لتدريب الشبكات العميقة بفعالية",
              key_concepts: ["SGD Momentum","Adam","Learning Rate Scheduling","Warm-up","Gradient Accumulation"],
              lessons: [
                { name: "SGD بالزخم: خروج الانحدار التدريجي من الحفر", primary: "SGD with momentum for optimization" },
                { name: "RMSprop: معدل تعلم متكيف لكل معامل", primary: "RMSprop adaptive learning rate optimizer" },
                { name: "Adam: الملك غير المتوّج للتحسين في التعلم العميق", primary: "Adam optimizer adaptive moment estimation" },
                { name: "AdamW: Adam مع تصحيح انحلال الوزن", primary: "AdamW optimizer weight decay correction" },
                { name: "جدولة معدل التعلم: الحرارة والتبريد", primary: "learning rate scheduling warmup cosine annealing" },
                { name: "Gradient Accumulation: بُعد الدفعات الافتراضي", primary: "gradient accumulation for large effective batch size" },
                { name: "محاذير Adam: انهيار التعميم أحياناً", primary: "Adam generalization issues and SAM optimizer" },
                { name: "مقارنة المحسّنات: أي منها أفضل ومتى", primary: "optimizer comparison benchmarks and selection guide" },
                { name: "مشروع: ضبط المحسّن ومعدل التعلم عملياً", primary: "optimizer and learning rate tuning practical project" }
              ]
            },
            {
              unit_index: 4, code: "1.4.4",
              name: "التنظيم: منع الإفراط في التخصيص",
              goal: "إتقان تقنيات التنظيم الجوهرية لضمان تعميم جيد في النماذج العميقة",
              key_concepts: ["Dropout","Batch Normalization","L2 Regularization","Data Augmentation","Early Stopping"],
              lessons: [
                { name: "L1 وL2 Regularization في الشبكات العميقة", primary: "L1 L2 regularization for neural networks" },
                { name: "Dropout: تعطيل الخلايا لمنع الحفظ", primary: "dropout regularization implementation" },
                { name: "Batch Normalization: استقرار التدريب", primary: "batch normalization for stable deep learning training" },
                { name: "Layer Normalization وGroup Normalization", primary: "layer normalization and group normalization" },
                { name: "Data Augmentation: توسيع البيانات اصطناعياً", primary: "data augmentation strategies for deep learning" },
                { name: "Early Stopping: التوقف في الوقت المناسب", primary: "early stopping and model checkpointing" },
                { name: "Label Smoothing: تنظيم ناعم للتصنيف", primary: "label smoothing regularization for classification" },
                { name: "Mixup وCutMix: خلط البيانات لتنظيم ذكي", primary: "Mixup and CutMix data augmentation techniques" },
                { name: "مشروع: مقارنة تأثير التنظيم على التعميم", primary: "regularization comparison project generalization study" }
              ]
            },
            {
              unit_index: 5, code: "1.4.5",
              name: "الشبكات التلافيفية: أساس رؤية الحاسوب",
              goal: "فهم CNN وتطبيقه كأساس لمعالجة الصور وسلسلة الميزات التسلسلية",
              key_concepts: ["Convolution","Pooling","Feature Maps","Receptive Field","Architecture Patterns"],
              lessons: [
                { name: "العملية التلافيفية: كيف تكتشف CNN الأنماط", primary: "convolution operation for feature detection" },
                { name: "Padding وStride: التحكم في أبعاد الإخراج", primary: "padding and stride in convolution layers" },
                { name: "Pooling: تقليص الأبعاد والتغاير الموضعي", primary: "max and average pooling for spatial invariance" },
                { name: "خرائط الميزات: ما الذي تتعلمه CNN فعلاً", primary: "feature maps visualization what CNN learns" },
                { name: "المجال الاستقبالي: سياق الخلية العصبية", primary: "receptive field in deep CNN architectures" },
                { name: "Depthwise Separable Convolution: الكفاءة", primary: "depthwise separable convolution for efficiency" },
                { name: "LeNet وAlexNet: أوائل المعماريات الكبرى", primary: "LeNet AlexNet historical CNN architectures" },
                { name: "تصوير ما تعلمه CNN: Grad-CAM", primary: "CNN visualization with Grad-CAM" },
                { name: "مشروع: بناء CNN بسيط لتصنيف CIFAR-10", primary: "CNN from scratch for CIFAR-10 classification" }
              ]
            },
            {
              unit_index: 6, code: "1.4.6",
              name: "الشبكات المتكررة: معالجة التسلسلات",
              goal: "فهم RNN وLSTM وGRU كأدوات لمعالجة البيانات التسلسلية الزمنية واللغوية",
              key_concepts: ["RNN","LSTM","GRU","Vanishing Gradients","Sequence Processing"],
              lessons: [
                { name: "RNN: الذاكرة عبر الزمن في الشبكات", primary: "RNN recurrent neural network sequence processing" },
                { name: "مشكلة التدرجات المتلاشية في RNN", primary: "vanishing gradient problem in RNNs" },
                { name: "LSTM: البوابات الذكية لذاكرة طويلة المدى", primary: "LSTM long short-term memory gates" },
                { name: "GRU: LSTM أبسط وأسرع", primary: "GRU gated recurrent unit simplified LSTM" },
                { name: "RNN ثنائية الاتجاه: السياق من الجهتين", primary: "bidirectional RNN for context from both directions" },
                { name: "RNN متعددة الطبقات: تعمق التعلم الزمني", primary: "stacked multilayer RNN deep sequence processing" },
                { name: "seq2seq: ترجمة تسلسل لتسلسل آخر", primary: "seq2seq encoder decoder architecture" },
                { name: "تطبيقات LSTM: التنبؤ بالسلاسل الزمنية", primary: "LSTM time series prediction applications" },
                { name: "مشروع: نموذج لغوي بسيط بـLSTM", primary: "simple language model with LSTM character level" }
              ]
            },
            {
              unit_index: 7, code: "1.4.7",
              name: "التعلم بالنقل: وقوف على أكتاف العمالقة",
              goal: "إتقان Transfer Learning كمنهجية جوهرية لتدريب النماذج بفعالية مع بيانات محدودة",
              key_concepts: ["Pretrained Models","Fine-tuning","Feature Extraction","Domain Adaptation","Frozen Layers"],
              lessons: [
                { name: "مبدأ التعلم بالنقل: لماذا لا تبدأ من الصفر دائماً", primary: "transfer learning motivation and principles" },
                { name: "استخراج الميزات: استخدام النموذج كمستخرج", primary: "feature extraction from pretrained networks" },
                { name: "الضبط الدقيق الكامل: تكييف النموذج كله", primary: "full fine-tuning pretrained models" },
                { name: "الضبط الدقيق الجزئي: تجميد الطبقات الأولى", primary: "partial fine-tuning with frozen early layers" },
                { name: "Hugging Face Hub: خزينة النماذج العالمية", primary: "Hugging Face model hub for pretrained models" },
                { name: "VGG وResNet وEfficientNet: عائلات CNN الكبرى", primary: "VGG ResNet EfficientNet pretrained families" },
                { name: "Catastrophic Forgetting: المشكلة والحلول", primary: "catastrophic forgetting in fine-tuning solutions" },
                { name: "Domain Adaptation: التكيف مع بيانات مختلفة", primary: "domain adaptation for distribution shift" },
                { name: "مشروع: ضبط دقيق لـResNet على بيانات مخصصة", primary: "ResNet fine-tuning on custom dataset project" }
              ]
            },
            {
              unit_index: 8, code: "1.4.8",
              name: "التعلم الذاتي والتمثيلات غير المُشرفة",
              goal: "فهم نماذج التعلم الذاتي كأحد أقوى مناهج التمثيل غير المُشرف في الذكاء الاصطناعي الحديث",
              key_concepts: ["Self-supervised Learning","Contrastive Learning","SimCLR","BYOL","Masked Autoencoders"],
              lessons: [
                { name: "التعلم الذاتي: التسميات المجانية من البيانات نفسها", primary: "self-supervised learning from unlabeled data" },
                { name: "Autoencoders: ضغط البيانات وإعادة البناء", primary: "autoencoders for representation learning" },
                { name: "Variational Autoencoders: التمثيل الاحتمالي", primary: "variational autoencoders latent space" },
                { name: "Contrastive Learning: تعلم التشابه والاختلاف", primary: "contrastive learning similarity learning" },
                { name: "SimCLR وMoCo: التعلم التبايني بلا تسميات", primary: "SimCLR MoCo contrastive self-supervised" },
                { name: "BYOL وSimSiam: بدون أمثلة سلبية", primary: "BYOL SimSiam self-supervised without negative samples" },
                { name: "Masked Autoencoders: MAE من Meta", primary: "masked autoencoder MAE for image pretraining" },
                { name: "التقييم التسلسلي: Linear Probe وFull Fine-tune", primary: "evaluation of self-supervised representations" },
                { name: "مشروع: تعلم تمثيلات بـSimCLR على صور", primary: "SimCLR representation learning project on images" }
              ]
            },
            {
              unit_index: 9, code: "1.4.9",
              name: "مشروع التعلم العميق الشامل",
              goal: "تطبيق أسس التعلم العميق في مشروع متكامل يجمع بين التصميم والتدريب والتقييم والنشر",
              key_concepts: ["Architecture Design","Training Pipeline","Evaluation","Visualization","Deployment"],
              lessons: [
                { name: "تصميم المعمارية لمشكلة حقيقية محددة", primary: "architecture design for specific real problem" },
                { name: "بناء أنبوب بيانات متين لمشروع التعلم العميق", primary: "robust data pipeline for deep learning project" },
                { name: "ضبط حلقة التدريب: Logging وCheckpointing", primary: "training loop optimization with logging and checkpointing" },
                { name: "تشخيص التدريب: قراءة منحنيات التعلم", primary: "training diagnostics learning curve analysis" },
                { name: "التقييم الشامل: مقاييس متعددة وتحليل الأخطاء", primary: "comprehensive evaluation with multiple metrics and error analysis" },
                { name: "تفسير النموذج: Attention Maps وGrad-CAM", primary: "model interpretation attention and Grad-CAM" },
                { name: "تحسين النموذج: الضبط الدقيق النهائي", primary: "model improvement and final fine-tuning" },
                { name: "حزم النموذج للنشر: ONNX وTorchScript", primary: "model packaging ONNX TorchScript for deployment" },
                { name: "عرض المشروع النهائي وتقديمه", primary: "final deep learning project presentation" }
              ]
            }
          ]
        },
        {
          stage_index: 5,
          name: "هندسة البيانات والميزات",
          goal: "إتقان دورة حياة البيانات الكاملة: الجمع والتنظيف والاستكشاف وهندسة الميزات وبناء أنابيب البيانات",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.5.1",
              name: "جمع البيانات ومصادرها",
              goal: "إتقان مهارات الحصول على البيانات من مصادر متنوعة بطريقة أخلاقية وقانونية ومنظمة",
              key_concepts: ["APIs","Web Scraping","Public Datasets","Data Governance","Licensing"],
              lessons: [
                { name: "واجهات برمجية: جلب البيانات من REST وGraphQL APIs", primary: "data collection from REST and GraphQL APIs" },
                { name: "Kaggle وHugging Face وUCI: مستودعات البيانات", primary: "Kaggle HuggingFace UCI public datasets" },
                { name: "الكشط الأخلاقي: robots.txt والتحميل المتأدب", primary: "ethical web scraping with rate limiting" },
                { name: "Scrapy وSelenium: الكشط المتقدم", primary: "Scrapy and Selenium for advanced web scraping" },
                { name: "قواعد البيانات الموزعة: الاتصال والاستعلام", primary: "database connection and querying for data collection" },
                { name: "البيانات الزمنية الحية: Streams وWebSockets", primary: "real-time data streams and websockets" },
                { name: "البيانات الجغرافية: APIs الخرائط والمستشعرات", primary: "geospatial data collection from map APIs" },
                { name: "حوكمة البيانات: GDPR والخصوصية والترخيص", primary: "data governance GDPR privacy and licensing" },
                { name: "مشروع: بناء مُجمِّع بيانات متعدد المصادر", primary: "multi-source data collector project" }
              ]
            },
            {
              unit_index: 2, code: "1.5.2",
              name: "تنظيف البيانات والجودة",
              goal: "إتقان تشخيص مشاكل جودة البيانات وإصلاحها بمنهجية صارمة لضمان نماذج موثوقة",
              key_concepts: ["Missing Values","Outliers","Duplicates","Type Errors","Data Validation"],
              lessons: [
                { name: "تشخيص جودة البيانات: الدليل الشامل", primary: "data quality diagnosis comprehensive guide" },
                { name: "القيم المفقودة: MCAR وMAR وMNAR والعلاج", primary: "missing values MCAR MAR MNAR treatment strategies" },
                { name: "القيم الشاذة: الكشف والتعامل الذكي", primary: "outlier detection and handling strategies" },
                { name: "التكرارات والتعارضات: التنظيف الهيكلي", primary: "duplicate detection and conflict resolution" },
                { name: "أخطاء الأنواع والتنسيق: التحقق والتصحيح", primary: "type errors and format validation in data cleaning" },
                { name: "Great Expectations: التحقق التلقائي من البيانات", primary: "Great Expectations for automated data validation" },
                { name: "تحويل البيانات النصية: التوحيد والترميز", primary: "text data normalization and encoding" },
                { name: "معالجة البيانات الفئوية: Encoding Strategies", primary: "categorical data encoding target ordinal one-hot" },
                { name: "مشروع: خط تنظيف بيانات إنتاجي مع اختبارات", primary: "production data cleaning pipeline with tests" }
              ]
            },
            {
              unit_index: 3, code: "1.5.3",
              name: "التحليل الاستكشافي: فن فهم البيانات",
              goal: "إتقان التحليل الاستكشافي المنهجي لاكتشاف الأنماط والعلاقات والشذوذات في البيانات",
              key_concepts: ["Distributions","Correlations","Pairplots","Dimensionality Visualization","Storytelling"],
              lessons: [
                { name: "التوزيعات والإحصاءات الوصفية: البدء الصحيح", primary: "distributions and descriptive statistics EDA start" },
                { name: "الارتباطات والتباين المشترك: العلاقات بين المتغيرات", primary: "correlations and covariance in EDA" },
                { name: "Matplotlib وSeaborn: التصوير الاحترافي", primary: "Matplotlib and Seaborn professional visualization" },
                { name: "Plotly وAltair: التصوير التفاعلي", primary: "Plotly and Altair interactive visualization" },
                { name: "تصوير الأبعاد العالية: PCA وUMAP وt-SNE", primary: "high dimensional visualization PCA UMAP t-SNE" },
                { name: "Pairplots والمصفوفة الاحتمالية الكاملة", primary: "pairplot and full correlation matrix analysis" },
                { name: "تحليل السلاسل الزمنية: الاتجاه والموسمية", primary: "time series EDA trend and seasonality" },
                { name: "رواية البيانات: ترجمة التصوير للقصة", primary: "data storytelling from visualization to narrative" },
                { name: "مشروع EDA: تحليل بيانات يمنية أو إقليمية", primary: "EDA project on Yemeni or regional dataset" }
              ]
            },
            {
              unit_index: 4, code: "1.5.4",
              name: "هندسة الميزات: خلق القيمة من البيانات",
              goal: "إتقان تقنيات هندسة الميزات التي تُحدث الفرق بين نموذج متوسط وآخر متميز",
              key_concepts: ["Interaction Features","Polynomial Features","Target Encoding","Aggregations","Domain Features"],
              lessons: [
                { name: "التحويلات الرياضية: Log وSqrt وBox-Cox", primary: "mathematical transformations log sqrt Box-Cox" },
                { name: "الميزات التفاعلية: الضرب والنسب والفروق", primary: "interaction features ratios differences in feature engineering" },
                { name: "الميزات الزمنية: استخراج المعلومات من التاريخ", primary: "temporal feature extraction from datetime" },
                { name: "Target Encoding: تشفير الفئات بالهدف", primary: "target encoding for high cardinality categoricals" },
                { name: "التجميعات الإحصائية: mean وstd وPercentiles", primary: "statistical aggregation features for tabular data" },
                { name: "الميزات المجالية: الخبرة تصنع الفارق", primary: "domain knowledge feature engineering" },
                { name: "Embeddings للفئوية عالية التعداد", primary: "learned embeddings for categorical features" },
                { name: "Automated Feature Engineering: Featuretools", primary: "automated feature engineering with Featuretools" },
                { name: "مشروع: هندسة ميزات لمسابقة Kaggle", primary: "feature engineering project for Kaggle competition" }
              ]
            },
            {
              unit_index: 5, code: "1.5.5",
              name: "انتقاء الميزات وتقليل الأبعاد",
              goal: "إتقان تقنيات انتقاء الميزات وتقليل الأبعاد لتحسين الأداء وتسريع التدريب",
              key_concepts: ["Filter Methods","Wrapper Methods","Embedded Methods","PCA","RFE"],
              lessons: [
                { name: "طرق الفلترة: الارتباط ومعلومات المشتركة", primary: "filter methods correlation and mutual information" },
                { name: "طرق الغلاف: RFE والبحث الشامل", primary: "wrapper methods RFE and exhaustive search" },
                { name: "الطرق المُضمَّنة: أهمية Lasso والأشجار", primary: "embedded methods Lasso and tree feature importance" },
                { name: "SHAP لانتقاء الميزات: الأهمية القابلة للتفسير", primary: "SHAP values for interpretable feature selection" },
                { name: "PCA للميزات: ضغط مع الحفاظ على المعلومات", primary: "PCA for feature compression dimensionality reduction" },
                { name: "Autoencoders لتقليل الأبعاد اللاخطي", primary: "autoencoders for nonlinear dimensionality reduction" },
                { name: "مشكلة الأبعاد العالية: لعنة الأبعاد", primary: "curse of dimensionality in high dimensional feature spaces" },
                { name: "اختبار الإضافة الهامشية: Ablation Study", primary: "ablation study for feature importance validation" },
                { name: "مشروع: انتقاء الميزات لنموذج إنتاجي", primary: "feature selection pipeline for production model" }
              ]
            },
            {
              unit_index: 6, code: "1.5.6",
              name: "معالجة البيانات غير المتوازنة",
              goal: "إتقان استراتيجيات التعامل مع الفئات غير المتوازنة في مشاكل التصنيف الحقيقية",
              key_concepts: ["SMOTE","ADASYN","Class Weights","Threshold Optimization","Cost-Sensitive Learning"],
              lessons: [
                { name: "تشخيص عدم التوازن: متى تكون مشكلة حقيقية", primary: "class imbalance diagnosis and impact assessment" },
                { name: "إعادة أخذ العينات: Oversampling وUndersampling", primary: "oversampling undersampling strategies for imbalance" },
                { name: "SMOTE وADASYN: التوليد الاصطناعي للأقلية", primary: "SMOTE ADASYN synthetic minority oversampling" },
                { name: "أوزان الفئات: تعليم النموذج بالتكاليف", primary: "class weights for cost-sensitive learning" },
                { name: "ضبط العتبة: التحسين بعد التدريب", primary: "threshold optimization for imbalanced classification" },
                { name: "التعلم الحساس للتكلفة: Cost-Sensitive", primary: "cost-sensitive learning for asymmetric misclassification" },
                { name: "مقاييس عدم التوازن: PR-AUC وG-Mean", primary: "imbalanced metrics PR-AUC G-mean evaluation" },
                { name: "Ensemble للبيانات غير المتوازنة: BalancedRF", primary: "ensemble methods for imbalanced datasets" },
                { name: "مشروع: نظام كشف الشذوذ بالبيانات النادرة", primary: "anomaly detection system with rare positive class" }
              ]
            },
            {
              unit_index: 7, code: "1.5.7",
              name: "أنابيب البيانات وSQL للذكاء الاصطناعي",
              goal: "بناء أنابيب بيانات قوية وإتقان SQL لاستعلامات الذكاء الاصطناعي وتحليل البيانات",
              key_concepts: ["ETL","SQL Advanced","Window Functions","Airflow","dbt"],
              lessons: [
                { name: "SQL المتقدم: Joins وSubqueries والنوافذ", primary: "advanced SQL joins subqueries window functions" },
                { name: "Window Functions: التحليل عبر نطاقات", primary: "SQL window functions for analytics" },
                { name: "CTEs وإعادة الاستخدام: كود SQL نظيف", primary: "SQL CTEs and recursive queries" },
                { name: "تحسين استعلامات SQL: الفهارس وخطط التنفيذ", primary: "SQL query optimization indexes and execution plans" },
                { name: "dbt: تحويل البيانات بالـSQL المنظّم", primary: "dbt data transformation with SQL" },
                { name: "Apache Airflow: جدولة أنابيب البيانات", primary: "Apache Airflow for data pipeline orchestration" },
                { name: "Prefect وDagster: بدائل Airflow الحديثة", primary: "Prefect and Dagster modern pipeline orchestration" },
                { name: "اختبار أنابيب البيانات: جودة على طول المسار", primary: "data pipeline testing and quality gates" },
                { name: "مشروع: أنبوب ETL كامل بـAirflow وdbt", primary: "complete ETL pipeline with Airflow and dbt" }
              ]
            },
            {
              unit_index: 8, code: "1.5.8",
              name: "التطبيع والتحجيم: تجهيز البيانات للنماذج",
              goal: "إتقان استراتيجيات التطبيع والتحجيم لضمان تحويلات متسقة بين التدريب والاستدلال",
              key_concepts: ["StandardScaler","MinMaxScaler","RobustScaler","Power Transforms","ColumnTransformer"],
              lessons: [
                { name: "StandardScaler: التطبيع القياسي وحدوده", primary: "StandardScaler normalization when to use and limits" },
                { name: "MinMaxScaler وRobustScaler: متى كل منهما", primary: "MinMaxScaler RobustScaler selection guide" },
                { name: "PowerTransformer وQuantileTransformer", primary: "power and quantile transforms for non-normal features" },
                { name: "ColumnTransformer: تحويلات مختلفة لأعمدة مختلفة", primary: "ColumnTransformer for heterogeneous feature types" },
                { name: "التحويل المتسق: Fit على التدريب فقط", primary: "consistent transformation fit on train only" },
                { name: "Feature Crossing وPolynomial Features", primary: "feature crossing and polynomial expansion" },
                { name: "التطبيع للنصوص: TF-IDF وBM25", primary: "text normalization TF-IDF and BM25" },
                { name: "الترميز للصور: الوحدة والمعيارية", primary: "image normalization and standardization" },
                { name: "مشروع: Preprocessing Pipeline كامل للإنتاج", primary: "complete preprocessing pipeline for production" }
              ]
            },
            {
              unit_index: 9, code: "1.5.9",
              name: "مشروع هندسة البيانات الشامل",
              goal: "توحيد كل مهارات هندسة البيانات في نظام كامل يغطي دورة حياة البيانات من الجمع للنموذج",
              key_concepts: ["End-to-End Pipeline","Feature Store","Data Quality Report","Monitoring","Documentation"],
              lessons: [
                { name: "تصميم بنية نظام البيانات الكاملة", primary: "data system architecture design for AI project" },
                { name: "بناء خط جمع وتخزين البيانات", primary: "data collection and storage pipeline building" },
                { name: "خط التنظيف والتحقق الآلي", primary: "automated cleaning and validation pipeline" },
                { name: "خط هندسة الميزات القابل للإنتاج", primary: "production-ready feature engineering pipeline" },
                { name: "Feature Store مبسّط: مركزة الميزات", primary: "simplified feature store centralized features" },
                { name: "مراقبة جودة البيانات في الوقت الحقيقي", primary: "real-time data quality monitoring" },
                { name: "توثيق البيانات: Data Catalog وLineage", primary: "data catalog and lineage documentation" },
                { name: "اختبار النظام الكامل من الجمع للنموذج", primary: "end-to-end system testing data to model" },
                { name: "عرض مشروع هندسة البيانات ومراجعته", primary: "data engineering project presentation and review" }
              ]
            }
          ]
        },
        {
          stage_index: 6,
          name: "تقييم النماذج وتفسيرها",
          goal: "إتقان منهجيات التقييم الصارمة وتفسير النماذج وضبط المعاملات لبناء نماذج موثوقة وقابلة للفهم",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.6.1",
              name: "مقاييس التقييم الشاملة",
              goal: "إتقان مجموعة واسعة من مقاييس التقييم واختيار المناسب منها لكل مشكلة",
              key_concepts: ["Classification Metrics","Regression Metrics","Ranking Metrics","Calibration","Custom Metrics"],
              lessons: [
                { name: "مقاييس التصنيف: ما وراء الدقة", primary: "classification metrics beyond accuracy" },
                { name: "ROC-AUC وPR-AUC: المقارنة الشاملة", primary: "ROC-AUC vs PR-AUC comparison and selection" },
                { name: "مقاييس الانحدار: RMSE وMAE وMAPE", primary: "regression metrics RMSE MAE MAPE comparison" },
                { name: "معايرة النموذج: هل تعكس الاحتمالات الواقع", primary: "model calibration Platt scaling isotonic regression" },
                { name: "مقاييس الترتيب: NDCG وMRR للتوصيات", primary: "ranking metrics NDCG MRR for recommendation systems" },
                { name: "مقاييس الكشف عن الشذوذ: Precision@K", primary: "anomaly detection metrics precision at K" },
                { name: "مقاييس مخصصة: بناء مقياس الأعمال", primary: "custom business metric implementation" },
                { name: "المقاييس الموزّعة: تقييم البيانات الضخمة", primary: "distributed metrics computation for large datasets" },
                { name: "مشروع: نظام تقييم متعدد المقاييس", primary: "multi-metric evaluation framework project" }
              ]
            },
            {
              unit_index: 2, code: "1.6.2",
              name: "التحقق المتقاطع المتقدم",
              goal: "إتقان استراتيجيات التحقق المتقاطع لضمان تقييم صادق وغير متحيز للنماذج",
              key_concepts: ["Nested CV","Time Series Split","Walk-Forward","GroupKFold","Leave-One-Out"],
              lessons: [
                { name: "مشاكل التسرب في التحقق المتقاطع العادي", primary: "data leakage issues in standard cross validation" },
                { name: "Nested CV: تقييم صادق مع ضبط المعاملات", primary: "nested cross validation for unbiased evaluation" },
                { name: "Time Series Split: التحقق الزمني الصحيح", primary: "time series cross validation time series split" },
                { name: "Walk-Forward Validation: التدريب المتدحرج", primary: "walk-forward validation for financial time series" },
                { name: "GroupKFold: عزل المجموعات الزمنية والمكانية", primary: "group k-fold cross validation for grouped data" },
                { name: "Leave-One-Out: دقة عالية لمجموعات صغيرة", primary: "leave-one-out cross validation for small datasets" },
                { name: "Repeated CV: تقليل التباين في التقييم", primary: "repeated cross validation variance reduction" },
                { name: "Adversarial Validation: التحقق من توزيع الاختبار", primary: "adversarial validation for distribution check" },
                { name: "مشروع: نظام تقييم صارم لنموذج إنتاجي", primary: "rigorous evaluation system for production model" }
              ]
            },
            {
              unit_index: 3, code: "1.6.3",
              name: "ضبط المعاملات الفائقة",
              goal: "إتقان أساليب ضبط المعاملات الفائقة لتحقيق أفضل أداء ممكن للنماذج",
              key_concepts: ["Grid Search","Random Search","Bayesian Optimization","Optuna","Population Methods"],
              lessons: [
                { name: "البحث الشبكي: الشامل ولكن المكلف", primary: "grid search hyperparameter tuning exhaustive" },
                { name: "البحث العشوائي: سرعة أكثر ودقة كافية", primary: "random search hyperparameter optimization" },
                { name: "الاستدلال البايزي: التعلم من التجارب السابقة", primary: "Bayesian optimization for hyperparameter tuning" },
                { name: "Optuna: الضبط الذكي بـPython", primary: "Optuna framework for hyperparameter optimization" },
                { name: "Ray Tune: الضبط الموزع على الحساب السحابي", primary: "Ray Tune distributed hyperparameter optimization" },
                { name: "BOHB وAsynchronous Bandit Methods", primary: "BOHB and bandit-based hyperparameter methods" },
                { name: "Multi-objective Optimization: سرعة ودقة", primary: "multi-objective hyperparameter optimization Pareto" },
                { name: "مساحة البحث: تعريف صحيح للمعاملات", primary: "search space definition for hyperparameter tuning" },
                { name: "مشروع: ضبط شامل لنموذج XGBoost وDNN", primary: "comprehensive tuning for XGBoost and DNN models" }
              ]
            },
            {
              unit_index: 4, code: "1.6.4",
              name: "تفسير النماذج: الصندوق الأسود الشفاف",
              goal: "إتقان تقنيات تفسير النماذج لفهم قرارات الذكاء الاصطناعي وزيادة الثقة والشفافية",
              key_concepts: ["SHAP","LIME","PDP","Attention","Saliency Maps"],
              lessons: [
                { name: "لماذا يهم التفسير: من الأداء للثقة", primary: "model interpretability importance and motivation" },
                { name: "أهمية الميزات العالمية: مقارنة شاملة", primary: "global feature importance methods comparison" },
                { name: "SHAP: النظرية خلف قيم شابلي", primary: "SHAP Shapley values theory and application" },
                { name: "SHAP عملياً: تحليل نموذج XGBoost", primary: "SHAP practical analysis for XGBoost model" },
                { name: "LIME: تفسير محلي للتنبؤات الفردية", primary: "LIME local interpretable model explanation" },
                { name: "Partial Dependence Plots: العلاقة الهامشية", primary: "partial dependence plots marginal effect visualization" },
                { name: "ICE Plots: التأثير الفردي لكل مثال", primary: "individual conditional expectation ICE plots" },
                { name: "Counterfactual Explanations: ماذا لو", primary: "counterfactual explanations for AI decisions" },
                { name: "مشروع: تقرير تفسير نموذج إنتاجي كامل", primary: "complete model interpretation report for production" }
              ]
            },
            {
              unit_index: 5, code: "1.6.5",
              name: "تشخيص النماذج وتصحيح أخطائها",
              goal: "إتقان منهجية التشخيص المنهجي لأخطاء النماذج وتحديد جذورها وإصلاحها",
              key_concepts: ["Error Analysis","Learning Curves","Confusion Matrix Analysis","Model Debugging","Residuals"],
              lessons: [
                { name: "تحليل الأخطاء: دراسة حالة كل خطأ", primary: "error analysis and case study methodology" },
                { name: "منحنيات التعلم: التشخيص البصري للمشاكل", primary: "learning curves for bias variance diagnosis" },
                { name: "تحليل مصفوفة الارتباك: الأنماط والفئات", primary: "confusion matrix analysis patterns and class errors" },
                { name: "تحليل البقايا: فهم أخطاء الانحدار", primary: "residual analysis for regression model debugging" },
                { name: "اختبار الضغط: حدود أداء النموذج", primary: "stress testing model performance boundaries" },
                { name: "منهجية تشخيص Andrew Ng الشاملة", primary: "Andrew Ng ML debugging systematic methodology" },
                { name: "Dataset Debugging: هل البيانات هي المشكلة؟", primary: "dataset debugging for data quality issues" },
                { name: "Invariance Tests: الاختبارات السلوكية للنماذج", primary: "behavioral invariance testing for AI models" },
                { name: "مشروع: تشخيص وإصلاح نموذج فاشل", primary: "diagnosis and fixing of failing ML model" }
              ]
            },
            {
              unit_index: 6, code: "1.6.6",
              name: "تتبع التجارب واختيار النماذج",
              goal: "إتقان منهجية تتبع التجارب واختيار النماذج لإدارة دورة تطوير الذكاء الاصطناعي",
              key_concepts: ["MLflow","W&B","Model Registry","Reproducibility","Statistical Tests"],
              lessons: [
                { name: "تتبع التجارب: لماذا يهم وكيف تبدأ", primary: "experiment tracking motivation and setup" },
                { name: "MLflow Tracking: تسجيل كل شيء تلقائياً", primary: "MLflow tracking server and experiment logging" },
                { name: "W&B Reports: مشاركة النتائج مع الفريق", primary: "Weights Biases reports for team sharing" },
                { name: "Model Registry: إدارة إصدارات النماذج", primary: "model registry for version management" },
                { name: "Reproducibility: إعادة الإنتاج الكاملة", primary: "full reproducibility seeds configs and environments" },
                { name: "الاختيار الإحصائي بين النماذج", primary: "statistical model selection with significance tests" },
                { name: "اللوحة المقارنة: رؤية الفريق الواحدة", primary: "comparison dashboard for team model review" },
                { name: "A/B Testing للنماذج: المقارنة الإنتاجية", primary: "A/B testing for production model comparison" },
                { name: "مشروع: نظام تتبع واختيار نماذج كامل", primary: "complete experiment tracking and model selection system" }
              ]
            },
            {
              unit_index: 7, code: "1.6.7",
              name: "التحيز في النماذج والإنصاف",
              goal: "تشخيص ومعالجة التحيز في نماذج الذكاء الاصطناعي لضمان قرارات منصفة وشاملة",
              key_concepts: ["Demographic Parity","Equalized Odds","Disparate Impact","Fairness Metrics","Debiasing"],
              lessons: [
                { name: "ما هو التحيز في الذكاء الاصطناعي: أنواع وأمثلة", primary: "AI bias types and real-world examples" },
                { name: "مصادر التحيز: البيانات والخوارزمية والتقييم", primary: "bias sources data algorithm evaluation" },
                { name: "مقاييس الإنصاف: Demographic Parity", primary: "fairness metrics demographic parity equalized odds" },
                { name: "Disparate Impact وFairness Tradeoffs", primary: "disparate impact fairness accuracy tradeoff" },
                { name: "Fairlearn وAIF360: أدوات الإنصاف", primary: "Fairlearn AIF360 bias detection and mitigation" },
                { name: "تخفيف التحيز: Pre وIn وPost Processing", primary: "bias mitigation pre in post processing techniques" },
                { name: "حالة دراسية: تحيز في نماذج التوظيف والائتمان", primary: "bias case study hiring and credit scoring" },
                { name: "Intersectionality: التحيز المتقاطع", primary: "intersectional bias in AI systems" },
                { name: "مشروع: تدقيق إنصاف نموذج تصنيف", primary: "fairness audit for classification model project" }
              ]
            },
            {
              unit_index: 8, code: "1.6.8",
              name: "قياس عدم اليقين في النماذج",
              goal: "إتقان تقنيات قياس عدم اليقين في تنبؤات النماذج لبناء أنظمة موثوقة",
              key_concepts: ["Confidence Intervals","Monte Carlo Dropout","Conformal Prediction","Bayesian Deep Learning","Calibration"],
              lessons: [
                { name: "عدم اليقين المعرفي مقابل العشوائي", primary: "aleatoric vs epistemic uncertainty in AI" },
                { name: "Softmax Confidence: وهم الثقة العالية", primary: "softmax confidence overconfidence problem" },
                { name: "Monte Carlo Dropout: عدم اليقين بالتدريب", primary: "Monte Carlo dropout for uncertainty estimation" },
                { name: "Bayesian Neural Networks: النماذج الاحتمالية", primary: "Bayesian neural networks for uncertainty" },
                { name: "Conformal Prediction: ضمانات إحصائية صارمة", primary: "conformal prediction for guaranteed coverage" },
                { name: "Deep Ensembles: التنبؤ بالمجموعة", primary: "deep ensembles for uncertainty quantification" },
                { name: "OOD Detection: كشف البيانات خارج التوزيع", primary: "out-of-distribution detection for reliable AI" },
                { name: "Calibration Plots وExpected Calibration Error", primary: "calibration plots and expected calibration error" },
                { name: "مشروع: نظام طبي موثوق مع قياس عدم اليقين", primary: "reliable medical AI system with uncertainty quantification" }
              ]
            },
            {
              unit_index: 9, code: "1.6.9",
              name: "مشروع التقييم والتفسير الشامل",
              goal: "توحيد كل مهارات التقييم والتفسير في إطار عمل احترافي كامل لنموذج إنتاجي",
              key_concepts: ["Evaluation Framework","Interpretation Report","Fairness Audit","Uncertainty Report","Stakeholder Communication"],
              lessons: [
                { name: "تصميم إطار التقييم الشامل لمشروع حقيقي", primary: "comprehensive evaluation framework design" },
                { name: "التحقق المتقاطع الصارم مع تحليل إحصائي", primary: "rigorous cross validation with statistical analysis" },
                { name: "تقرير التفسير الكامل: SHAP وLIME وCF", primary: "complete interpretation report SHAP LIME counterfactuals" },
                { name: "تدقيق الإنصاف: المقاييس والتخفيف", primary: "fairness audit with metrics and mitigation" },
                { name: "تقرير عدم اليقين: الحدود والثقة", primary: "uncertainty report boundaries and confidence" },
                { name: "لوحة مراقبة الأداء: Dashboard كامل", primary: "performance monitoring dashboard for stakeholders" },
                { name: "التواصل مع غير التقنيين: ترجمة الأرقام", primary: "communicating AI results to non-technical stakeholders" },
                { name: "التوثيق الفني الكامل للنموذج", primary: "complete technical model documentation" },
                { name: "العرض النهائي: من البيانات للقرار", primary: "final presentation from data to business decision" }
              ]
            }
          ]
        },
        {
          stage_index: 7,
          name: "أدوات وبيئة الذكاء الاصطناعي",
          goal: "إتقان البيئة الأدواتية الكاملة للذكاء الاصطناعي الاحترافي: السحابة والحاويات والأدوات التعاونية",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 65, time_limit_minutes: 45 },
          unit_exam_defaults: { pass_threshold_percent: 70, time_limit_minutes: 25 },
          units: [
            {
              unit_index: 1, code: "1.7.1",
              name: "Google Colab وJupyterHub",
              goal: "إتقان بيئات Jupyter التفاعلية للتجريب السريع والتعاون في مشاريع الذكاء الاصطناعي",
              key_concepts: ["Colab Pro","JupyterHub","Widgets","nbformat","Papermill"],
              lessons: [
                { name: "Google Colab: GPU مجاني لبروتوتايب سريع", primary: "Google Colab GPU for rapid AI prototyping" },
                { name: "بيئة Jupyter المتقدمة: Widgets وExtensions", primary: "Jupyter advanced widgets and extensions" },
                { name: "JupyterHub: بيئة جماعية للفرق", primary: "JupyterHub for team collaborative AI development" },
                { name: "Papermill: تشغيل Notebooks آلياً", primary: "Papermill for automated notebook execution" },
                { name: "nbformat وتحويل الNotebooks للتقارير", primary: "nbformat and notebook to report conversion" },
                { name: "VSCode Jupyter: بيئة Notebooks في IDE", primary: "VSCode Jupyter integration for AI development" },
                { name: "بهجة التصوير: Matplotlib وSeaborn وPlotly في Notebooks", primary: "visualization in Jupyter notebooks Plotly interactive" },
                { name: "إدارة البيئات في Colab: pip وconda وCustom", primary: "environment management in Google Colab" },
                { name: "مشروع: تقرير تحليلي تفاعلي بـJupyter", primary: "interactive analytical report with Jupyter" }
              ]
            },
            {
              unit_index: 2, code: "1.7.2",
              name: "المنصات السحابية للذكاء الاصطناعي",
              goal: "إتقان المنصات السحابية الرئيسية للتدريب والنشر والإدارة لنماذج الذكاء الاصطناعي",
              key_concepts: ["AWS SageMaker","Google Vertex AI","Azure ML","GCP","Spot Instances"],
              lessons: [
                { name: "نظرة عامة على السحابة للذكاء الاصطناعي: AWS وGCP وAzure", primary: "cloud platforms overview for AI AWS GCP Azure" },
                { name: "AWS SageMaker: تدريب ونشر في AWS", primary: "AWS SageMaker for ML training and deployment" },
                { name: "Google Vertex AI: خدمات ML المتكاملة", primary: "Google Vertex AI for integrated ML services" },
                { name: "Spot Instances: التدريب الاقتصادي", primary: "spot instances for cost-effective model training" },
                { name: "التخزين السحابي: S3 وGCS للبيانات الكبيرة", primary: "cloud storage S3 GCS for large datasets" },
                { name: "Managed Notebooks: ML في السحابة فوراً", primary: "managed notebook services in cloud platforms" },
                { name: "Cloud GPUs: اختيار الصحيح للمهمة", primary: "cloud GPU selection A100 V100 T4 comparison" },
                { name: "تكاليف السحابة: تحسين الإنفاق على الذكاء الاصطناعي", primary: "cloud cost optimization for AI workloads" },
                { name: "مشروع: تدريب ونشر نموذج على AWS SageMaker", primary: "model training and deployment on AWS SageMaker" }
              ]
            },
            {
              unit_index: 3, code: "1.7.3",
              name: "Docker وKubernetes للذكاء الاصطناعي",
              goal: "إتقان Docker وKubernetes لضمان استنساخية وقابلية نشر نماذج الذكاء الاصطناعي",
              key_concepts: ["Dockerfile","Multi-stage Builds","Docker Compose","Kubernetes","Helm Charts"],
              lessons: [
                { name: "Docker للذكاء الاصطناعي: الحاويات والصور", primary: "Docker for AI model containerization" },
                { name: "Dockerfile محسّن لنماذج Python وML", primary: "optimized Dockerfile for ML Python models" },
                { name: "Multi-stage Builds: حجم صورة أصغر", primary: "multi-stage Docker builds for smaller AI images" },
                { name: "Docker Compose: تنسيق خدمات متعددة", primary: "Docker Compose for multi-service AI systems" },
                { name: "Kubernetes أساسيات: Pods وServices وDeployments", primary: "Kubernetes basics for AI workload orchestration" },
                { name: "نشر نموذج على Kubernetes: الخطوات الكاملة", primary: "model deployment on Kubernetes full steps" },
                { name: "Helm Charts: حزم Kubernetes القابلة لإعادة الاستخدام", primary: "Helm charts for reusable Kubernetes packages" },
                { name: "مراقبة Kubernetes: Prometheus وGrafana", primary: "Kubernetes monitoring with Prometheus and Grafana" },
                { name: "مشروع: خدمة استدلال محاطة بـDocker وK8s", primary: "containerized inference service with Docker and K8s" }
              ]
            },
            {
              unit_index: 4, code: "1.7.4",
              name: "Hugging Face: النظام البيئي الكامل",
              goal: "إتقان نظام Hugging Face البيئي كمورد أساسي للنماذج المدربة مسبقاً والبيانات والنشر",
              key_concepts: ["Transformers","Datasets","Spaces","AutoTrain","PEFT"],
              lessons: [
                { name: "Hugging Face Hub: خزينة النماذج العالمية", primary: "Hugging Face Hub model repository navigation" },
                { name: "Transformers Library: واجهة النماذج الموحدة", primary: "Hugging Face Transformers library API" },
                { name: "Datasets Library: مجموعات البيانات المعيارية", primary: "Hugging Face Datasets for standard benchmarks" },
                { name: "AutoTrain: الضبط الدقيق بدون كود", primary: "Hugging Face AutoTrain for no-code fine-tuning" },
                { name: "PEFT: الضبط الدقيق الكفء للمعاملات", primary: "PEFT parameter efficient fine-tuning LoRA" },
                { name: "Spaces: نشر تجريبي مجاني للعرض", primary: "Hugging Face Spaces for demo deployment" },
                { name: "Inference API: استدلال سريع بلا بنية تحتية", primary: "Hugging Face Inference API for quick deployment" },
                { name: "مساهمة في Hub: رفع نماذج وبيانات", primary: "contributing models and datasets to Hugging Face Hub" },
                { name: "مشروع: نشر نموذج مخصص على Hugging Face Spaces", primary: "custom model deployment on Hugging Face Spaces" }
              ]
            },
            {
              unit_index: 5, code: "1.7.5",
              name: "Kaggle: مسابقات ومجتمع وتعلم",
              goal: "إتقان منصة Kaggle كبيئة للتعلم التنافسي واكتساب الخبرة الحقيقية",
              key_concepts: ["Competition Workflow","Kernels","Ensembling","Leaderboard Strategy","Notebooks"],
              lessons: [
                { name: "Kaggle: ليس فقط مسابقات بل مدرسة شاملة", primary: "Kaggle as learning platform beyond competitions" },
                { name: "سير عمل المسابقة: من EDA للإرسال", primary: "Kaggle competition workflow EDA to submission" },
                { name: "استراتيجية Leaderboard: تجنب Overfitting العام", primary: "Kaggle leaderboard strategy public vs private" },
                { name: "الدمج والتجميع: سر الحلول الفائزة", primary: "model ensembling and blending for Kaggle wins" },
                { name: "Kaggle Kernels وNotebooks: التعلم من الآخرين", primary: "Kaggle notebooks learning from community" },
                { name: "مسابقات Tabular: استراتيجية XGBoost وLightGBM", primary: "tabular Kaggle competition XGBoost LightGBM strategy" },
                { name: "مسابقات الصور: استراتيجية CNN وTransformers", primary: "image Kaggle competition CNN Transformers strategy" },
                { name: "بناء ملفك المهني عبر Kaggle", primary: "building professional portfolio through Kaggle" },
                { name: "مشروع: الدخول في مسابقة Kaggle فعلية", primary: "entering a real Kaggle competition project" }
              ]
            },
            {
              unit_index: 6, code: "1.7.6",
              name: "قراءة الأبحاث وتطبيق الأوراق العلمية",
              goal: "إتقان قراءة وفهم الأوراق البحثية في الذكاء الاصطناعي وتحويلها لكود قابل للتطبيق",
              key_concepts: ["arXiv","Paper Reading","Implementation","Ablation Studies","Citation Analysis"],
              lessons: [
                { name: "كيف تقرأ ورقة بحثية في الذكاء الاصطناعي", primary: "how to read AI research papers effectively" },
                { name: "arXiv وPapers with Code: البحث عن الجديد", primary: "arXiv and Papers with Code for research discovery" },
                { name: "تحديد الأوراق الجوهرية: Impact وCitation", primary: "identifying landmark AI papers by impact and citation" },
                { name: "فهم المعادلات في الأوراق: ترجمة رياضية", primary: "understanding mathematical equations in AI papers" },
                { name: "تنفيذ ورقة بحثية من الصفر", primary: "implementing AI paper from scratch" },
                { name: "دراسات الإلغاء: Ablation Analysis", primary: "ablation study analysis in AI papers" },
                { name: "مراجعة الأدبيات: Survey والتلخيص", primary: "literature review and survey paper summarization" },
                { name: "المتابعة اليومية: RSS وTwitter وDiscord", primary: "daily AI research tracking RSS Twitter Discord" },
                { name: "مشروع: تطبيق ورقة بحثية حديثة من arXiv", primary: "implementing recent arXiv paper project" }
              ]
            },
            {
              unit_index: 7, code: "1.7.7",
              name: "إعادة الإنتاج والأثر الذري",
              goal: "إتقان مبادئ إعادة الإنتاج العلمي في مشاريع الذكاء الاصطناعي لضمان الموثوقية",
              key_concepts: ["Seeds","Config Files","Environment Pinning","Determinism","Benchmark Reproducibility"],
              lessons: [
                { name: "أزمة إعادة الإنتاج في الذكاء الاصطناعي", primary: "AI reproducibility crisis and its causes" },
                { name: "Seeds وDeterminism: الثبات في التجارب", primary: "random seeds and determinism in AI experiments" },
                { name: "تثبيت البيئة: requirements.lock وconda-lock", primary: "environment pinning for reproducible AI" },
                { name: "ملفات التهيئة: Hydra وYAML للإعادة الكاملة", primary: "configuration files for full reproducibility" },
                { name: "Checkpointing: استئناف التجارب بأمان", primary: "model checkpointing for experiment resumption" },
                { name: "Dataset Versioning: DVC وGit LFS", primary: "dataset versioning with DVC and Git LFS" },
                { name: "Model Cards: التوثيق المعياري للنماذج", primary: "model cards for standardized model documentation" },
                { name: "الاختبار عبر البيئات: CI وDocker", primary: "cross-environment testing with CI and Docker" },
                { name: "مشروع: ورقة بحثية قابلة للإعادة الكاملة", primary: "fully reproducible AI research project" }
              ]
            },
            {
              unit_index: 8, code: "1.7.8",
              name: "بناء الملف المهني في الذكاء الاصطناعي",
              goal: "بناء حضور مهني قوي في مجال الذكاء الاصطناعي عبر مشاريع وكتابة ومشاركة مجتمعية",
              key_concepts: ["GitHub Portfolio","Technical Writing","LinkedIn","Demo Projects","Open Source"],
              lessons: [
                { name: "GitHub Portfolio: واجهة مهندس الذكاء الاصطناعي", primary: "GitHub portfolio for AI engineer" },
                { name: "README المثالي: توثيق المشروع باحترافية", primary: "perfect README for AI projects" },
                { name: "الكتابة التقنية: مقالات التعلم والشرح", primary: "technical writing for AI learning articles" },
                { name: "LinkedIn وTwitter: الحضور المهني الرقمي", primary: "LinkedIn and Twitter for AI professional presence" },
                { name: "مشاريع Demo: الإثبات بالكود والنتائج", primary: "demo projects with code and results" },
                { name: "المساهمة في المصادر المفتوحة: البداية العملية", primary: "open source contribution practical start" },
                { name: "مجتمعات الذكاء الاصطناعي: Discord وReddit والمؤتمرات", primary: "AI communities Discord Reddit and conferences" },
                { name: "الحضور الأكاديمي: arXiv وworkshops", primary: "academic presence arXiv workshop submissions" },
                { name: "مشروع: بناء ملف مهني متكامل", primary: "complete professional AI portfolio building" }
              ]
            },
            {
              unit_index: 9, code: "1.7.9",
              name: "مشروع الأدوات الشامل: بيئة احترافية كاملة",
              goal: "توحيد كل أدوات الذكاء الاصطناعي في بيئة عمل احترافية متكاملة تغطي التطوير والتعاون والنشر",
              key_concepts: ["Dev Environment","Collaboration Tools","CI/CD","Monitoring Dashboard","Team Workflow"],
              lessons: [
                { name: "إعداد بيئة التطوير الكاملة من الصفر", primary: "complete AI development environment setup" },
                { name: "نظام تتبع التجارب والنماذج المتكامل", primary: "integrated experiment and model tracking system" },
                { name: "أنبوب CI/CD للذكاء الاصطناعي على GitHub", primary: "CI/CD pipeline for AI on GitHub Actions" },
                { name: "نشر النموذج على السحابة بـDocker", primary: "cloud model deployment with Docker" },
                { name: "لوحة مراقبة: Grafana وPrometheus", primary: "monitoring dashboard with Grafana and Prometheus" },
                { name: "التعاون الفعّال: Git Flow وCode Review", primary: "effective team collaboration for AI projects" },
                { name: "التوثيق الآلي: Sphinx وMkDocs", primary: "automated documentation with Sphinx and MkDocs" },
                { name: "إدارة المشروع: Kanban وأجايل للذكاء الاصطناعي", primary: "project management Kanban agile for AI" },
                { name: "عرض البيئة الكاملة وتسليمها للفريق", primary: "presenting complete AI environment to team" }
              ]
            }
          ]
        }
      ]
    },
    {
      level_index: 2,
      name: "الذكاء الاصطناعي التطبيقي",
      goal: "التعمق في تخصصات الذكاء الاصطناعي التطبيقية: رؤية الحاسوب ومعالجة اللغة الطبيعية والتعلم المعزز والذكاء الاصطناعي التوليدي وأنظمة التوصية والتدريب المتقدم",
      bloom_focus: "apply",
      exam: { pass_threshold_percent: 70, time_limit_minutes: 80 },
      stages: [
        {
          stage_index: 1,
          name: "رؤية الحاسوب",
          goal: "إتقان تقنيات رؤية الحاسوب من معالجة الصور الكلاسيكية إلى النماذج التوليدية الحديثة",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 28 },
          units: [
            {
              unit_index: 1, code: "2.1.1",
              name: "معالجة الصور الكلاسيكية",
              goal: "إتقان أساسيات معالجة الصور الرقمية كأساس لفهم CNN ومبادئ رؤية الحاسوب",
              key_concepts: ["Convolution","Edge Detection","Filtering","Morphology","Color Spaces"],
              lessons: [
                { name: "تمثيل الصور رقمياً: Pixels وChannels وBit Depth", primary: "image digital representation pixels channels bit depth" },
                { name: "تحويلات فضاء الألوان: RGB وHSV وLAB", primary: "color space transformations RGB HSV LAB" },
                { name: "الفلاتر والتلافيف: من الحواف للتنعيم", primary: "image filters and convolution edge detection blur" },
                { name: "كشف الحواف: Canny وSobel وLaplacian", primary: "edge detection Canny Sobel Laplacian operators" },
                { name: "العمليات المورفولوجية: Erosion وDilation", primary: "morphological operations erosion dilation" },
                { name: "تحويلات هاف: اكتشاف الخطوط والدوائر", primary: "Hough transform for line and circle detection" },
                { name: "التحليل الطيفي: تحويل فورييه للصور", primary: "Fourier transform for image frequency analysis" },
                { name: "OpenCV: مكتبة رؤية الحاسوب الكاملة", primary: "OpenCV for computer vision applications" },
                { name: "مشروع: نظام تعرف بسيط على الأشكال بـOpenCV", primary: "simple shape recognition system with OpenCV" }
              ]
            },
            {
              unit_index: 2, code: "2.1.2",
              name: "CNN المتقدمة: المعماريات الكبرى",
              goal: "فهم وتطبيق المعماريات الكبرى للشبكات التلافيفية التي أحدثت ثورة في رؤية الحاسوب",
              key_concepts: ["ResNet","EfficientNet","Vision Transformer","MobileNet","Attention in CNNs"],
              lessons: [
                { name: "VGG وGoogLeNet: التعمق والاتساع", primary: "VGG and GoogLeNet deep and wide architectures" },
                { name: "ResNet: التخطي الذي قهر التدرجات المتلاشية", primary: "ResNet residual connections skip connections" },
                { name: "EfficientNet: التوسع المتوازن المثلى", primary: "EfficientNet compound scaling coefficient" },
                { name: "MobileNet وSqueezeNet: CNN للأجهزة المحمولة", primary: "MobileNet SqueezeNet lightweight mobile CNN" },
                { name: "DenseNet: كل طبقة متصلة بكل طبقة", primary: "DenseNet dense connections architecture" },
                { name: "Vision Transformers: ViT وSwin Transformer", primary: "Vision Transformers ViT and Swin for vision" },
                { name: "ConvNeXt: CNN يتعلم من Transformers", primary: "ConvNeXt modern CNN inspired by Transformers" },
                { name: "CBAM وSE Networks: Attention في CNN", primary: "CBAM SE Networks channel and spatial attention in CNN" },
                { name: "مشروع: مقارنة معماريات CNN على بيانات مخصصة", primary: "CNN architecture comparison on custom dataset" }
              ]
            },
            {
              unit_index: 3, code: "2.1.3",
              name: "كشف الأجسام وتعقبها",
              goal: "إتقان خوارزميات كشف الأجسام وتعقبها في الصور والفيديو",
              key_concepts: ["YOLO","Faster RCNN","Anchor Boxes","NMS","Object Tracking"],
              lessons: [
                { name: "كشف الأجسام: المشكلة والمقاييس", primary: "object detection problem and evaluation metrics mAP" },
                { name: "R-CNN وFast R-CNN: الجيل الأول والثاني", primary: "R-CNN Fast R-CNN two-stage detectors" },
                { name: "Faster R-CNN: Region Proposal Network", primary: "Faster R-CNN with Region Proposal Network" },
                { name: "YOLO: الكشف في نفاذة واحدة", primary: "YOLO real-time object detection one-shot" },
                { name: "YOLOv8 وUltralytics: الجيل الحديث", primary: "YOLOv8 and Ultralytics modern object detection" },
                { name: "Anchor Boxes وNon-Maximum Suppression", primary: "anchor boxes and NMS in object detection" },
                { name: "تعقب الأجسام: SORT وDeepSORT وByteTrack", primary: "multi-object tracking SORT DeepSORT ByteTrack" },
                { name: "كشف نقاط المفاتيح: Pose Estimation", primary: "keypoint detection and pose estimation" },
                { name: "مشروع: نظام مراقبة فيديو بـYOLOv8", primary: "video surveillance system with YOLOv8 project" }
              ]
            },
            {
              unit_index: 4, code: "2.1.4",
              name: "التجزئة الدلالية والنسيجية",
              goal: "إتقان نماذج التجزئة لتصنيف كل بكسل في الصورة على مستوى الدلالة والنسيج",
              key_concepts: ["FCN","U-Net","Mask RCNN","SAM","Panoptic Segmentation"],
              lessons: [
                { name: "التجزئة الدلالية: تصنيف كل بكسل", primary: "semantic segmentation pixel classification" },
                { name: "FCN: الشبكات التلافيفية الكاملة", primary: "fully convolutional networks for segmentation" },
                { name: "U-Net: التشفير وفك التشفير للصور الطبية", primary: "U-Net encoder decoder for medical image segmentation" },
                { name: "DeepLab وDilated Convolution", primary: "DeepLab atrous convolutions for semantic segmentation" },
                { name: "Mask R-CNN: التجزئة النسيجية", primary: "Mask R-CNN instance segmentation" },
                { name: "SAM: نموذج التجزئة الشامل من Meta", primary: "Segment Anything Model SAM from Meta" },
                { name: "Panoptic Segmentation: دمج الدلالي والنسيجي", primary: "panoptic segmentation combining semantic and instance" },
                { name: "التجزئة ثلاثية الأبعاد: Point Cloud Segmentation", primary: "3D point cloud segmentation" },
                { name: "مشروع: تجزئة طبية للصور بـU-Net", primary: "medical image segmentation with U-Net project" }
              ]
            },
            {
              unit_index: 5, code: "2.1.5",
              name: "توليد الصور: GANs ونماذج الانتشار",
              goal: "فهم وتطبيق نماذج توليد الصور من GANs إلى Diffusion Models الأحدث",
              key_concepts: ["GAN","StyleGAN","Diffusion Models","Stable Diffusion","Image Editing"],
              lessons: [
                { name: "GANs: اللعبة بين المولّد والمميّز", primary: "GAN generator discriminator adversarial training" },
                { name: "DCGAN: GANs التلافيفية للصور", primary: "DCGAN deep convolutional GAN for image generation" },
                { name: "StyleGAN وStyleGAN3: جودة لا مثيل لها", primary: "StyleGAN progressive growing high quality images" },
                { name: "نماذج الانتشار: التوليد بإزالة الضجيج", primary: "diffusion models denoising score matching" },
                { name: "Stable Diffusion: الانتشار الكامن", primary: "Stable Diffusion latent diffusion model" },
                { name: "ControlNet: التحكم في الصور المولّدة", primary: "ControlNet for controlled image generation" },
                { name: "Inpainting وOutpainting: تعديل الصور", primary: "image inpainting and outpainting with diffusion" },
                { name: "Image-to-Image: تحويل أسلوب الصور", primary: "image-to-image translation and style transfer" },
                { name: "مشروع: نظام توليد صور مخصص بـStable Diffusion", primary: "custom image generation system with Stable Diffusion" }
              ]
            },
            {
              unit_index: 6, code: "2.1.6",
              name: "ذكاء اصطناعي الفيديو والتسلسل المرئي",
              goal: "إتقان تحليل الفيديو والتسلسلات المرئية لتطبيقات تعرف الأفعال والمراقبة",
              key_concepts: ["Optical Flow","Video Classification","Action Recognition","Temporal Modeling","Video Transformers"],
              lessons: [
                { name: "معالجة الفيديو: الإطارات والتدفق البصري", primary: "video processing frames and optical flow" },
                { name: "تدفق بصري: Lucas-Kanade وFarneback", primary: "optical flow Lucas-Kanade and Farneback methods" },
                { name: "تصنيف الفيديو: 3D CNNs وTwo-Stream", primary: "video classification 3D CNNs two-stream networks" },
                { name: "TimeSformer وVideo Transformers", primary: "TimeSformer and video transformers for action recognition" },
                { name: "تعرف الأفعال: Sports وActivities", primary: "action recognition sports and activity understanding" },
                { name: "Video Diffusion: توليد مقاطع الفيديو", primary: "video diffusion models for video generation" },
                { name: "VideoMAE: تعلم ذاتي للفيديو", primary: "VideoMAE self-supervised learning for video" },
                { name: "التخزين المؤقت والإدارة الفعّالة للفيديو", primary: "efficient video storage and processing pipelines" },
                { name: "مشروع: نظام تعرف أفعال الرياضة بالفيديو", primary: "sports action recognition system from video" }
              ]
            },
            {
              unit_index: 7, code: "2.1.7",
              name: "الذكاء الاصطناعي في التصوير الطبي",
              goal: "تطبيق رؤية الحاسوب في التشخيص الطبي والتصوير السريري بمنهجية علمية صارمة",
              key_concepts: ["DICOM","MRI Analysis","Radiology AI","Clinical Validation","Regulatory Compliance"],
              lessons: [
                { name: "التصوير الطبي: DICOM وMRI وCT وX-ray", primary: "medical imaging DICOM MRI CT X-ray formats" },
                { name: "التحديات الخاصة: البيانات الطبية النادرة", primary: "medical AI challenges scarce labeled data" },
                { name: "الكشف عن الأمراض: تصنيف الصور السريرية", primary: "disease detection clinical image classification" },
                { name: "تجزئة أعضاء الجسم: الدقة الحرجة", primary: "organ segmentation for critical medical applications" },
                { name: "Transfer Learning للتصوير الطبي", primary: "transfer learning for medical imaging" },
                { name: "التحقق السريري: لماذا الأداء وحده لا يكفي", primary: "clinical validation beyond performance metrics" },
                { name: "التفسيرية في الذكاء الاصطناعي الطبي", primary: "interpretability requirements for medical AI" },
                { name: "FDA وCE: الاعتماد التنظيمي للذكاء الاصطناعي الطبي", primary: "FDA CE regulatory approval for medical AI" },
                { name: "مشروع: نموذج لتصنيف أشعة X الصدر", primary: "chest X-ray classification model project" }
              ]
            },
            {
              unit_index: 8, code: "2.1.8",
              name: "الرؤية ثلاثية الأبعاد والنقاط السحابية",
              goal: "فهم رؤية الحاسوب ثلاثية الأبعاد والتعامل مع بيانات LiDAR والنقاط السحابية",
              key_concepts: ["Point Clouds","PointNet","3D Object Detection","Depth Estimation","NeRF"],
              lessons: [
                { name: "بيانات ثلاثية الأبعاد: Point Clouds وVoxels", primary: "3D data representation point clouds and voxels" },
                { name: "PointNet: الشبكة العصبية للنقاط السحابية", primary: "PointNet neural network for point cloud processing" },
                { name: "تقدير العمق: Mono وStereo Depth Estimation", primary: "depth estimation monocular and stereo methods" },
                { name: "كشف الأجسام ثلاثي الأبعاد: LiDAR وكاميرا", primary: "3D object detection LiDAR and camera fusion" },
                { name: "NeRF: إعادة بناء المشاهد بالشبكات العصبية", primary: "Neural Radiance Fields for 3D scene reconstruction" },
                { name: "Gaussian Splatting: تمثيل المشاهد الجديد", primary: "3D Gaussian Splatting for scene representation" },
                { name: "SLAM: التحديد الذاتي للموقع والخريطة", primary: "SLAM simultaneous localization and mapping" },
                { name: "الرؤية ثلاثية الأبعاد في السيارات الذاتية", primary: "3D vision for autonomous vehicles" },
                { name: "مشروع: إعادة بناء مشهد ثلاثي الأبعاد بـNeRF", primary: "3D scene reconstruction with NeRF project" }
              ]
            },
            {
              unit_index: 9, code: "2.1.9",
              name: "مشروع رؤية الحاسوب الشامل",
              goal: "توحيد مهارات رؤية الحاسوب في نظام تطبيقي متكامل يحل مشكلة حقيقية بجودة إنتاجية",
              key_concepts: ["System Design","Data Pipeline","Model Selection","Optimization","Deployment"],
              lessons: [
                { name: "تعريف المشكلة: اختيار مشكلة رؤية حقيقية", primary: "problem definition for real computer vision system" },
                { name: "بناء مجموعة البيانات: التجميع والتوسيم", primary: "dataset building collection and annotation" },
                { name: "التحليل الاستكشافي للبيانات المرئية", primary: "exploratory analysis of visual datasets" },
                { name: "اختيار المعمارية والبيانات المدربة مسبقاً", primary: "architecture and pretrained model selection" },
                { name: "التدريب والضبط الدقيق على بياناتنا", primary: "training and fine-tuning on custom dataset" },
                { name: "التقييم الكامل: المقاييس والتحليل البصري", primary: "comprehensive evaluation metrics and visual analysis" },
                { name: "التحسين للنشر: ONNX وQuantization", primary: "model optimization for deployment ONNX quantization" },
                { name: "واجهة API وعرض تجريبي للنظام", primary: "API interface and system demo presentation" },
                { name: "التوثيق والعرض النهائي للمشروع", primary: "final project documentation and presentation" }
              ]
            }
          ]
        },
        {
          stage_index: 2,
          name: "معالجة اللغة الطبيعية",
          goal: "إتقان معالجة اللغة الطبيعية من التمثيلات الكلاسيكية إلى نماذج اللغة الكبيرة والنظم التوليدية",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 28 },
          units: [
            {
              unit_index: 1, code: "2.2.1",
              name: "تمثيل النص والمعالجة الكلاسيكية",
              goal: "إتقان تحويل النص لأرقام والتقنيات الكلاسيكية في NLP كأساس للنماذج الحديثة",
              key_concepts: ["Tokenization","Bag of Words","TF-IDF","Word2Vec","NLTK SpaCy"],
              lessons: [
                { name: "خط معالجة النص: Tokenization وNormalization", primary: "text preprocessing pipeline tokenization normalization" },
                { name: "Bag of Words وCount Vectors", primary: "bag of words and count vectorization for NLP" },
                { name: "TF-IDF: الترجيح الأذكى للكلمات", primary: "TF-IDF weighting for text representation" },
                { name: "Word2Vec: تمثيل دلالة الكلمات رقمياً", primary: "Word2Vec word embeddings semantic representation" },
                { name: "GloVe وFastText: تطور تمثيلات الكلمات", primary: "GloVe and FastText word embedding alternatives" },
                { name: "NLTK وSpaCy: أدوات NLP الكلاسيكية", primary: "NLTK SpaCy tools for classic NLP tasks" },
                { name: "تحليل المشاعر: من القاعدي للتعلم الآلي", primary: "sentiment analysis rule-based to machine learning" },
                { name: "تصنيف النصوص: Naive Bayes وSVM للنصوص", primary: "text classification Naive Bayes SVM for NLP" },
                { name: "مشروع: نظام تحليل مشاعر المراجعات", primary: "sentiment analysis system for product reviews" }
              ]
            },
            {
              unit_index: 2, code: "2.2.2",
              name: "آلية الانتباه وTransformers",
              goal: "فهم عميق لآلية الانتباه والـTransformers كأساس لكل نماذج اللغة الحديثة",
              key_concepts: ["Self-Attention","Multi-Head Attention","Positional Encoding","Transformer Block","Attention Patterns"],
              lessons: [
                { name: "القيود على RNN: التسلسل والذاكرة القصيرة", primary: "RNN limitations motivating attention mechanism" },
                { name: "آلية الانتباه: الاستعلام والمفتاح والقيمة", primary: "attention mechanism query key value computation" },
                { name: "الانتباه الذاتي: كل كلمة تنظر لكل كلمة", primary: "self-attention all-pairs attention computation" },
                { name: "الانتباه متعدد الرؤوس: وجهات نظر متوازية", primary: "multi-head attention parallel attention heads" },
                { name: "الترميز الموضعي: حقن ترتيب التسلسل", primary: "positional encoding for sequence order" },
                { name: "كتلة Transformer: معادلة المعيار الكامل", primary: "transformer block complete standard equations" },
                { name: "Transformers مقابل LSTM: مقارنة شاملة", primary: "Transformers vs LSTM comparison tradeoffs" },
                { name: "كفاءة الانتباه: Linformer وFlashAttention", primary: "efficient attention Linformer FlashAttention" },
                { name: "مشروع: تطبيق Transformer بسيط من الصفر", primary: "simple Transformer implementation from scratch" }
              ]
            },
            {
              unit_index: 3, code: "2.2.3",
              name: "BERT وNLU: نماذج التشفير",
              goal: "إتقان BERT وعائلتها لمهام فهم اللغة الطبيعية والاستخلاص والتصنيف",
              key_concepts: ["BERT","RoBERTa","DistilBERT","Masked LM","Fine-tuning for NLU"],
              lessons: [
                { name: "BERT: الثورة المزدوجة الاتجاه في NLP", primary: "BERT bidirectional encoder representations" },
                { name: "Pre-training BERT: MLM وNSP", primary: "BERT pretraining masked LM and next sentence prediction" },
                { name: "الضبط الدقيق لـBERT: خطوات التكييف", primary: "BERT fine-tuning for downstream NLP tasks" },
                { name: "RoBERTa: BERT المحسّن بمزيد من البيانات", primary: "RoBERTa improved BERT training methodology" },
                { name: "DistilBERT وAlBERT: الكفاءة بلا تنازل كبير", primary: "DistilBERT AlBERT efficient BERT variants" },
                { name: "AraBERT وCAMeL: BERT للعربية", primary: "AraBERT CAMeL Arabic language BERT models" },
                { name: "تصنيف النصوص بـBERT: Token Classification", primary: "token and sequence classification with BERT" },
                { name: "استخلاص المعلومات: NER وRelation Extraction", primary: "information extraction NER and relation extraction with BERT" },
                { name: "مشروع: نموذج NER عربي بـAraBERT", primary: "Arabic NER model with AraBERT project" }
              ]
            },
            {
              unit_index: 4, code: "2.2.4",
              name: "GPT ونماذج التوليد: NLG",
              goal: "إتقان GPT وعائلتها لمهام توليد اللغة الطبيعية والإتمام والترجمة",
              key_concepts: ["GPT Architecture","Causal LM","Autoregressive","Decoding Strategies","Sampling"],
              lessons: [
                { name: "GPT: اللغوي الأحادي الاتجاه التوليدي", primary: "GPT causal language model architecture" },
                { name: "التدريب المسبق لـGPT: اللغوي الذاتي", primary: "GPT causal LM pretraining next token prediction" },
                { name: "Decoding Strategies: Greedy وBeam وSampling", primary: "text decoding strategies greedy beam sampling" },
                { name: "Temperature وTop-k وTop-p: التحكم في التوليد", primary: "temperature top-k top-p sampling for text generation" },
                { name: "GPT-2 وGPT-3 وGPT-4: تطور العائلة", primary: "GPT-2 GPT-3 GPT-4 scaling and capabilities" },
                { name: "Llama وMistral: LLMs المفتوحة المصدر", primary: "Llama Mistral open source LLM alternatives" },
                { name: "Falcon وCommand: تنوع نماذج اللغة الكبيرة", primary: "Falcon Command diverse open source LLMs" },
                { name: "تقييم LLMs: BLEU وROUGE وPerplexity", primary: "LLM evaluation BLEU ROUGE perplexity metrics" },
                { name: "مشروع: نموذج توليد محادثة بسيط بـGPT-2", primary: "simple dialogue generation with GPT-2 fine-tuning" }
              ]
            },
            {
              unit_index: 5, code: "2.2.5",
              name: "هندسة الإرشاد والضبط الدقيق للـLLMs",
              goal: "إتقان هندسة الإرشاد والضبط الدقيق وInstructable LLMs لتكييف النماذج مع المهام المخصصة",
              key_concepts: ["Prompt Engineering","Instruction Tuning","RLHF","LoRA","QLoRA"],
              lessons: [
                { name: "هندسة الإرشاد: فن التواصل مع LLMs", primary: "prompt engineering principles and best practices" },
                { name: "Few-shot وZero-shot: الإرشاد بالأمثلة", primary: "few-shot and zero-shot prompting strategies" },
                { name: "Chain-of-Thought: التفكير خطوة بخطوة", primary: "chain-of-thought prompting for reasoning" },
                { name: "Instruction Tuning: تعليم LLM اتباع التعليمات", primary: "instruction tuning for LLM alignment" },
                { name: "RLHF: التعلم المعزز من التغذية البشرية", primary: "RLHF reinforcement learning from human feedback" },
                { name: "LoRA: الضبط الدقيق الكفء بالرتبة المنخفضة", primary: "LoRA low rank adaptation for efficient fine-tuning" },
                { name: "QLoRA: الضبط الكمّي على GPU واحد", primary: "QLoRA quantized LoRA for single GPU fine-tuning" },
                { name: "DPO وPPO: محاذاة النماذج مع التفضيلات", primary: "DPO PPO preference optimization for LLM alignment" },
                { name: "مشروع: ضبط دقيق لـLlama على بيانات تعليمية", primary: "Llama fine-tuning on educational dataset project" }
              ]
            },
            {
              unit_index: 6, code: "2.2.6",
              name: "الاسترجاع المعزز: RAG Systems",
              goal: "إتقان بناء أنظمة RAG التي تجمع بين قدرات LLMs وقواعد المعرفة المخصصة",
              key_concepts: ["Vector Databases","Embeddings","Retrieval","Chunking","RAG Pipeline"],
              lessons: [
                { name: "مشكلة الهلوسة وحل RAG الجوهري", primary: "LLM hallucination problem and RAG solution" },
                { name: "Embeddings النصية: تحويل المعنى لمتجهات", primary: "text embeddings semantic vector representation" },
                { name: "قواعد البيانات المتجهية: Chroma وPinecone وWeaviate", primary: "vector databases Chroma Pinecone Weaviate" },
                { name: "تقطيع النصوص: Chunking Strategies", primary: "text chunking strategies for RAG" },
                { name: "البحث الدلالي مقابل المعجمي وHybrid", primary: "semantic vs lexical search and hybrid retrieval" },
                { name: "أنبوب RAG الكامل: من السؤال للإجابة", primary: "complete RAG pipeline from query to answer" },
                { name: "تقييم RAG: Ragas والمقاييس المتخصصة", primary: "RAG evaluation with Ragas metrics" },
                { name: "RAG المتقدم: HyDE وReranking وQuery Expansion", primary: "advanced RAG HyDE reranking query expansion" },
                { name: "مشروع: نظام Q&A على وثائق مخصصة", primary: "custom document Q&A system with RAG" }
              ]
            },
            {
              unit_index: 7, code: "2.2.7",
              name: "الذكاء الاصطناعي متعدد اللغات والعربي",
              goal: "إتقان معالجة العربية والنماذج متعددة اللغات لتطوير تطبيقات NLP عربية جادة",
              key_concepts: ["Multilingual Models","Arabic NLP","Cross-lingual Transfer","mBERT","AraGPT"],
              lessons: [
                { name: "تحديات NLP العربي: التشكيل والصرف والتنوع", primary: "Arabic NLP challenges morphology and dialect variation" },
                { name: "mBERT وXLM-R: النماذج متعددة اللغات", primary: "multilingual BERT XLM-R cross-lingual models" },
                { name: "AraBERT وCAMeLBERT وAraELECTRA", primary: "Arabic NLP models AraBERT CAMeLBERT AraELECTRA" },
                { name: "AraGPT2: التوليد العربي بـGPT", primary: "AraGPT2 Arabic text generation" },
                { name: "معالجة اللهجات العربية: اليمنية والخليجية", primary: "Arabic dialect NLP Yemeni and Gulf dialects" },
                { name: "النقل عبر اللغات: Zero-shot Cross-lingual", primary: "zero-shot cross-lingual transfer learning" },
                { name: "ترجمة آلية عربية: Helsinki وMarianMT", primary: "Arabic machine translation Helsinki MarianMT" },
                { name: "التقييم العربي: ARCD وArabic NLP Benchmarks", primary: "Arabic NLP evaluation benchmarks ARCD" },
                { name: "مشروع: نظام NLP عربي شامل لتطبيق يمني", primary: "comprehensive Arabic NLP system for Yemeni use case" }
              ]
            },
            {
              unit_index: 8, code: "2.2.8",
              name: "تطبيقات NLP المتقدمة",
              goal: "تطبيق NLP في مهام تجارية وأكاديمية متقدمة: الترجمة والتلخيص والإجابة على الأسئلة",
              key_concepts: ["Machine Translation","Summarization","Question Answering","Dialogue Systems","Information Extraction"],
              lessons: [
                { name: "الترجمة الآلية العصبية: seq2seq وTransformers", primary: "neural machine translation seq2seq transformers" },
                { name: "التلخيص الآلي: الاستخلاصي والتجريدي", primary: "automatic summarization extractive and abstractive" },
                { name: "الإجابة على الأسئلة: Extractive QA وGenerative", primary: "question answering extractive and generative approaches" },
                { name: "أنظمة الحوار: Chatbots وTask-oriented Dialogue", primary: "dialogue systems chatbots and task-oriented" },
                { name: "استخلاص المعلومات المنظمة: IE وOpenIE", primary: "structured information extraction IE and OpenIE" },
                { name: "استدلال اللغة الطبيعية: Textual Entailment", primary: "natural language inference textual entailment" },
                { name: "Coreference Resolution: حل المراجع", primary: "coreference resolution for NLP" },
                { name: "NLP متعدد الوسائط: النص والصور والصوت", primary: "multimodal NLP text image audio integration" },
                { name: "مشروع: نظام تلخيص وإجابة على الأسئلة", primary: "summarization and question answering system project" }
              ]
            },
            {
              unit_index: 9, code: "2.2.9",
              name: "مشروع NLP الشامل",
              goal: "توحيد مهارات NLP في تطبيق لغوي متكامل يخدم حاجة حقيقية ويُظهر الكفاءة الكاملة",
              key_concepts: ["NLP Pipeline","Multi-task","Arabic Support","Evaluation","Deployment"],
              lessons: [
                { name: "اختيار مشكلة NLP ذات أثر حقيقي", primary: "impactful NLP problem selection and scoping" },
                { name: "بناء مجموعة بيانات NLP مخصصة", primary: "custom NLP dataset collection and annotation" },
                { name: "أنبوب المعالجة والتمثيل الكامل", primary: "complete NLP preprocessing and representation pipeline" },
                { name: "اختيار وضبط النموذج المناسب", primary: "NLP model selection and fine-tuning" },
                { name: "التقييم الشامل والتحليل الكيفي", primary: "comprehensive NLP evaluation and qualitative analysis" },
                { name: "دعم العربية: اختبار اللهجات والمعيار", primary: "Arabic support testing dialect and standard" },
                { name: "واجهة مستخدم وAPI للتطبيق", primary: "user interface and API for NLP application" },
                { name: "النشر وقابلية التوسع", primary: "NLP application deployment and scalability" },
                { name: "عرض المشروع النهائي وتقييم الأقران", primary: "final NLP project presentation and peer review" }
              ]
            }
          ]
        },
        {
          stage_index: 3,
          name: "التعلم المعزز",
          goal: "إتقان التعلم المعزز من المفاهيم الأساسية إلى الخوارزميات العميقة المتقدمة والتطبيقات الحقيقية",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 28 },
          units: [
            {
              unit_index: 1, code: "2.3.1",
              name: "أسس التعلم المعزز",
              goal: "بناء فهم عميق للإطار الرسمي للتعلم المعزز وعناصره ومعادلاته الأساسية",
              key_concepts: ["Agent Environment","Reward","Policy","Value Function","Return"],
              lessons: [
                { name: "إطار التعلم المعزز: الوكيل والبيئة والمكافأة", primary: "RL framework agent environment reward" },
                { name: "السياسة ودالة القيمة: ما يعرفه الوكيل", primary: "policy and value function in RL" },
                { name: "العائد والعائد المخصوم: المستقبل يهم", primary: "return and discounted return in reinforcement learning" },
                { name: "استكشاف مقابل استغلال: المعضلة الجوهرية", primary: "exploration vs exploitation tradeoff in RL" },
                { name: "Epsilon-Greedy وUCB: استراتيجيات الاستكشاف", primary: "epsilon-greedy UCB exploration strategies" },
                { name: "Multi-armed Bandits: تعلم بلا حالات", primary: "multi-armed bandits stateless RL" },
                { name: "نموذج المكافأة والبيئة: الصياغة الكاملة", primary: "reward model and environment specification" },
                { name: "بيئات Gymnasium: Gym لتجريب RL", primary: "OpenAI Gymnasium environments for RL experiments" },
                { name: "مشروع: وكيل يحل بيئة Gym بسيطة", primary: "RL agent solving simple Gym environment" }
              ]
            },
            {
              unit_index: 2, code: "2.3.2",
              name: "عمليات ماركوف للقرار",
              goal: "إتقان الإطار الرياضي الرسمي للتعلم المعزز: عمليات ماركوف للقرار ومعادلات بيلمان",
              key_concepts: ["MDP","Bellman Equations","State Transitions","Stationarity","Discount Factor"],
              lessons: [
                { name: "عملية ماركوف: الحالة الحاضرة تكفي للمستقبل", primary: "Markov property and Markov chains" },
                { name: "عمليات ماركوف للقرار: الإطار الرسمي", primary: "Markov Decision Process formal framework" },
                { name: "معادلات بيلمان: الحل التكراري لـValue Function", primary: "Bellman equations for value function" },
                { name: "معادلة بيلمان للأمثلية: Q* وV*", primary: "Bellman optimality equations Q-star V-star" },
                { name: "التبسيط والديناميكية: حل MDPs الصغيرة", primary: "dynamic programming for small MDPs" },
                { name: "Value Iteration: الحل التكراري لـMDP", primary: "value iteration algorithm for MDP solution" },
                { name: "Policy Iteration: تحسين متناوب", primary: "policy iteration alternating evaluation and improvement" },
                { name: "MDPs الجزئية: POMDPs وعدم اليقين في الحالة", primary: "partially observable MDPs and state uncertainty" },
                { name: "مشروع: حل MDP شبكة صغيرة بالبرمجة الديناميكية", primary: "grid world MDP solution with dynamic programming" }
              ]
            },
            {
              unit_index: 3, code: "2.3.3",
              name: "Q-Learning والتقييم الزمني",
              goal: "إتقان خوارزميات التقييم الزمني خاصة Q-Learning كأساس للتعلم المعزز العميق",
              key_concepts: ["Temporal Difference","Q-Learning","SARSA","Q-Table","Convergence"],
              lessons: [
                { name: "الاختلاف الزمني: التعلم من التجربة المباشرة", primary: "temporal difference learning TD(0) and TD(n)" },
                { name: "Q-Learning: الأكثر شهرة في RL", primary: "Q-learning off-policy algorithm" },
                { name: "SARSA: القريب من السياسة", primary: "SARSA on-policy temporal difference learning" },
                { name: "Q-Table: تعلم معزز بدون شبكات", primary: "Q-table tabular Q-learning implementation" },
                { name: "Double Q-Learning: تصحيح الإفراط في التقدير", primary: "double Q-learning overestimation correction" },
                { name: "الاهلال المستحق: Eligibility Traces", primary: "eligibility traces TD lambda for credit assignment" },
                { name: "تقارب Q-Learning: الظروف والضمانات", primary: "Q-learning convergence conditions and guarantees" },
                { name: "Q-Learning مع التقريب: نحو DQL", primary: "Q-learning with function approximation toward DQN" },
                { name: "مشروع: Q-Learning يتعلم لعبة Taxi", primary: "Q-learning Taxi game project" }
              ]
            },
            {
              unit_index: 4, code: "2.3.4",
              name: "التعلم المعزز العميق: DQN وامتداداته",
              goal: "إتقان DQN وامتداداته كأحد أهم الخوارزميات في الذكاء الاصطناعي العميق الحديث",
              key_concepts: ["DQN","Experience Replay","Target Network","Double DQN","Dueling DQN"],
              lessons: [
                { name: "DQN: الجمع بين Q-Learning والشبكات العصبية", primary: "DQN deep Q-network combining DL and RL" },
                { name: "Experience Replay: ذاكرة للتعلم من الماضي", primary: "experience replay buffer for DQN stability" },
                { name: "شبكة الهدف: استقرار التدريب", primary: "target network for DQN training stability" },
                { name: "Double DQN: تصحيح الإفراط في التقدير", primary: "double DQN overestimation correction" },
                { name: "Dueling DQN: تفريق القيمة والميزة", primary: "dueling DQN advantage value decomposition" },
                { name: "Prioritized Replay: التعلم من الأهم", primary: "prioritized experience replay for faster learning" },
                { name: "Noisy Networks: استكشاف عبر الضوضاء", primary: "noisy networks for exploration in DQN" },
                { name: "Rainbow: جمع كل تحسينات DQN", primary: "Rainbow DQN combining all improvements" },
                { name: "مشروع: DQN يتقن لعبة Atari", primary: "DQN mastering Atari game project" }
              ]
            },
            {
              unit_index: 5, code: "2.3.5",
              name: "تدرجات السياسة والـActor-Critic",
              goal: "إتقان خوارزميات تدرج السياسة وActor-Critic كمنهج بديل وقوي في التعلم المعزز",
              key_concepts: ["REINFORCE","Actor-Critic","A2C","PPO","SAC"],
              lessons: [
                { name: "REINFORCE: أبسط خوارزمية تدرج سياسة", primary: "REINFORCE policy gradient algorithm" },
                { name: "مشكلة التباين العالي في تدرجات السياسة", primary: "high variance in policy gradients and baselines" },
                { name: "Actor-Critic: دمج السياسة ودالة القيمة", primary: "actor-critic combining policy and value function" },
                { name: "A2C وA3C: التعلم المتوازي والمتزامن", primary: "A2C A3C asynchronous advantage actor critic" },
                { name: "PPO: تقريب السياسة الكفء والمستقر", primary: "PPO proximal policy optimization stable learning" },
                { name: "TRPO: تحسين السياسة بضمان الأمان", primary: "TRPO trust region policy optimization" },
                { name: "SAC: التعلم المعزز القصوى الإنتروبيا", primary: "SAC soft actor critic maximum entropy RL" },
                { name: "TD3: Double Delayed Deep Deterministic", primary: "TD3 deep deterministic policy gradient improved" },
                { name: "مشروع: PPO يتحكم في بيئة Pendulum", primary: "PPO agent controlling Pendulum environment" }
              ]
            },
            {
              unit_index: 6, code: "2.3.6",
              name: "التعلم المعزز متعدد الوكلاء",
              goal: "فهم وتطبيق التعلم المعزز في البيئات متعددة الوكلاء والتفاعلات التعاونية والتنافسية",
              key_concepts: ["Multi-agent RL","Cooperative","Competitive","CTDE","Game Theory"],
              lessons: [
                { name: "MARL: عالم متعدد الوكلاء وتحديه", primary: "multi-agent RL non-stationarity challenge" },
                { name: "التعاون والتنافس: ديناميكيات مختلطة", primary: "cooperative competitive and mixed multi-agent settings" },
                { name: "نظرية الألعاب في MARL: توازن ناش", primary: "game theory and Nash equilibrium in MARL" },
                { name: "CTDE: مركزية التدريب ولامركزية التنفيذ", primary: "centralized training decentralized execution CTDE" },
                { name: "MADDPG وQMIX: خوارزميات MARL", primary: "MADDPG QMIX multi-agent RL algorithms" },
                { name: "بيئات MARL: PettingZoo وStarCraft II", primary: "MARL environments PettingZoo StarCraft II" },
                { name: "الاتصال بين الوكلاء: تعلم لغة مشتركة", primary: "emergent communication in multi-agent RL" },
                { name: "المعادلة الرياضية لـMARLوأساليب التحليل", primary: "mathematical formulation and analysis of MARL" },
                { name: "مشروع: وكلاء تعاونية في بيئة إنقاذ", primary: "cooperative agents in rescue environment MARL" }
              ]
            },
            {
              unit_index: 7, code: "2.3.7",
              name: "تطبيقات التعلم المعزز: الألعاب والروبوتيكا",
              goal: "تطبيق التعلم المعزز في مجالات الألعاب والروبوتيكا والمحاكاة والأنظمة الحقيقية",
              key_concepts: ["Game Playing","Robotics","Sim-to-Real","MuJoCo","AlphaGo"],
              lessons: [
                { name: "AlphaGo وAlphaZero: تحفة DeepMind", primary: "AlphaGo AlphaZero self-play mastery" },
                { name: "Muzero: التعلم بدون نموذج البيئة", primary: "Muzero model-free game mastery" },
                { name: "MuJoCo: محاكاة الروبوتيكا الاحترافية", primary: "MuJoCo physics simulation for robotics RL" },
                { name: "التحكم في الروبوت: من المحاكاة للواقع", primary: "sim-to-real transfer for robot control" },
                { name: "التعلم من التظاهر: Imitation Learning", primary: "imitation learning behavior cloning for robotics" },
                { name: "Inverse RL: استنتاج دالة المكافأة", primary: "inverse RL reward function inference from demos" },
                { name: "GAIL: التعلم من التظاهر التوليدي", primary: "GAIL generative adversarial imitation learning" },
                { name: "التعلم المعزز في الرعاية الصحية والتمويل", primary: "RL applications in healthcare and finance" },
                { name: "مشروع: ذراع روبوتية تتعلم الإمساك بـMuJoCo", primary: "robotic arm grasping with RL in MuJoCo" }
              ]
            },
            {
              unit_index: 8, code: "2.3.8",
              name: "RL في الذكاء الاصطناعي التوليدي وLLMs",
              goal: "فهم دور التعلم المعزز في محاذاة نماذج اللغة الكبيرة وتحسين التوليد",
              key_concepts: ["RLHF","PPO for LLMs","Reward Modeling","Constitutional AI","DPO"],
              lessons: [
                { name: "RLHF: التعلم المعزز من التغذية البشرية للـLLMs", primary: "RLHF for LLM alignment from human feedback" },
                { name: "نمذجة المكافأة: تعليم النموذج التفضيلات", primary: "reward modeling for human preference learning" },
                { name: "PPO لتحسين LLMs: التطبيق التقني", primary: "PPO application for LLM fine-tuning" },
                { name: "Constitutional AI: التوجيه بالقواعد", primary: "Constitutional AI Anthropic approach" },
                { name: "DPO: تحسين التفضيل المباشر", primary: "DPO direct preference optimization simpler than RLHF" },
                { name: "GRPO وGRPO+: التحسين الجماعي للـLLMs", primary: "GRPO group relative policy optimization for LLMs" },
                { name: "Red Teaming الآلي: اكتشاف المخاطر", primary: "automated red teaming with RL for LLM safety" },
                { name: "RL للترجمة والتلخيص: ما وراء MLE", primary: "RL beyond MLE for translation and summarization" },
                { name: "مشروع: محاذاة نموذج لغوي بـDPO", primary: "language model alignment with DPO project" }
              ]
            },
            {
              unit_index: 9, code: "2.3.9",
              name: "مشروع التعلم المعزز الشامل",
              goal: "توحيد مهارات التعلم المعزز في نظام كامل يحل مشكلة حقيقية بخوارزميات متقدمة",
              key_concepts: ["Problem Design","Environment","Algorithm Selection","Training","Evaluation"],
              lessons: [
                { name: "تصميم مشكلة RL: الحالة والفعل والمكافأة", primary: "RL problem design state action reward specification" },
                { name: "بناء أو تخصيص بيئة Gymnasium", primary: "building or customizing Gymnasium environment" },
                { name: "اختيار الخوارزمية المناسبة للمشكلة", primary: "RL algorithm selection for specific problem" },
                { name: "التدريب والضبط بـStable Baselines3", primary: "training and tuning with Stable Baselines3" },
                { name: "تقييم شامل: المكافأة والسياسة والتقارب", primary: "comprehensive RL evaluation reward policy convergence" },
                { name: "التصوير والتحليل: فهم سلوك الوكيل", primary: "RL agent behavior visualization and analysis" },
                { name: "تحسين الوكيل: هندسة المكافأة", primary: "reward shaping for agent improvement" },
                { name: "نقل الوكيل لبيئة جديدة: التعميم", primary: "RL agent generalization to new environments" },
                { name: "عرض مشروع RL النهائي", primary: "final RL project presentation and showcase" }
              ]
            }
          ]
        },
        {
          stage_index: 4,
          name: "الذكاء الاصطناعي التوليدي",
          goal: "إتقان الذكاء الاصطناعي التوليدي من VAEs وGANs إلى نماذج الانتشار ونماذج اللغة الكبيرة",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 28 },
          units: [
            {
              unit_index: 1, code: "2.4.1",
              name: "VAEs: النماذج التوليدية الاحتمالية",
              goal: "فهم وتطبيق المُشفِّرات المتغيرة كنماذج توليدية احتمالية مرنة",
              key_concepts: ["Latent Space","ELBO","Reparameterization","Beta-VAE","Disentanglement"],
              lessons: [
                { name: "الفضاء الكامن: تمثيل البيانات بمتغيرات مضغوطة", primary: "latent space representation in generative models" },
                { name: "ELBO: حد الأدلة الأدنى لـVAE", primary: "ELBO evidence lower bound for VAE training" },
                { name: "حيلة إعادة التعامل: التمييز عبر العينات", primary: "reparameterization trick for VAE backpropagation" },
                { name: "بناء VAE من الصفر بـPyTorch", primary: "VAE implementation from scratch PyTorch" },
                { name: "Beta-VAE: فضل كامن مفكوك الارتباط", primary: "Beta-VAE disentangled latent representations" },
                { name: "VQ-VAE: الكميّة في الفضاء الكامن", primary: "VQ-VAE vector quantized variational autoencoder" },
                { name: "VAE للصور والنصوص والبيانات المنظمة", primary: "VAE applications for images text structured data" },
                { name: "تداخل الفضاء الكامن: الاستيفاء والتوليد", primary: "latent space interpolation and generation" },
                { name: "مشروع: توليد وجوه اصطناعية بـVAE", primary: "face generation project with VAE" }
              ]
            },
            {
              unit_index: 2, code: "2.4.2",
              name: "GANs: شبكات التوليد التنافسية",
              goal: "إتقان نظرية وتطبيق GANs كأحد أقوى نماذج التوليد التنافسي في الذكاء الاصطناعي",
              key_concepts: ["Generator","Discriminator","Minimax Game","Mode Collapse","Wasserstein GAN"],
              lessons: [
                { name: "GAN: اللعبة التنافسية بين مولّد ومميّز", primary: "GAN training game generator discriminator" },
                { name: "DCGAN: الشبكة التلافيفية التوليدية", primary: "DCGAN implementation for image generation" },
                { name: "مشاكل تدريب GANs: الانهيار الموديّ والتذبذب", primary: "GAN training issues mode collapse and instability" },
                { name: "Wasserstein GAN: الاستقرار بمقياس مختلف", primary: "Wasserstein GAN stable training with W distance" },
                { name: "Conditional GAN: التوليد الموجَّه", primary: "conditional GAN cGAN for controlled generation" },
                { name: "Pix2Pix: ترجمة الصور المشروطة", primary: "Pix2Pix image-to-image translation GAN" },
                { name: "CycleGAN: الترجمة غير المزدوجة", primary: "CycleGAN unpaired image translation" },
                { name: "StyleGAN2: إتقان توليد الوجوه", primary: "StyleGAN2 high quality face synthesis" },
                { name: "مشروع: CycleGAN لتحويل أسلوب الصور", primary: "CycleGAN style transfer project" }
              ]
            },
            {
              unit_index: 3, code: "2.4.3",
              name: "نماذج الانتشار: الجيل الجديد",
              goal: "إتقان نماذج الانتشار كأقوى نماذج التوليد الحديثة للصور والصوت والفيديو",
              key_concepts: ["DDPM","Score Matching","DDIM","Latent Diffusion","Classifier-Free Guidance"],
              lessons: [
                { name: "فكرة الانتشار: إزالة الضجيج التدريجي", primary: "diffusion model core idea progressive denoising" },
                { name: "DDPM: النموذج الاحتمالي لإزالة الضجيج", primary: "DDPM denoising diffusion probabilistic models" },
                { name: "Score Matching: الطريق المحدد الاتجاه", primary: "score matching for diffusion model training" },
                { name: "DDIM: الاستخذاء السريع الحتمي", primary: "DDIM deterministic fast sampling" },
                { name: "Latent Diffusion Models: الانتشار الكامن", primary: "latent diffusion models efficient generation" },
                { name: "Classifier-Free Guidance: توليد موجَّه بلا مصنّف", primary: "classifier-free guidance for conditional generation" },
                { name: "Imagen وDall-E 2 وDeepFloyd: الأقوياء", primary: "Imagen DALL-E 2 DeepFloyd IF comparison" },
                { name: "نماذج الانتشار للصوت والمحادثة", primary: "diffusion models for audio and speech generation" },
                { name: "مشروع: Text-to-Image بـStable Diffusion API", primary: "text-to-image generation project with Stable Diffusion" }
              ]
            },
            {
              unit_index: 4, code: "2.4.4",
              name: "نماذج اللغة الكبيرة: البنية والتدريب",
              goal: "فهم عميق لبنية LLMs الحديثة وكيفية تدريبها وتحدياتها وخصائصها الناشئة",
              key_concepts: ["Transformer Architecture","Scaling Laws","Emergent Abilities","Tokenization","Pretraining"],
              lessons: [
                { name: "بنية LLMs الحديثة: ما تغيّر من Transformer الأصلي", primary: "modern LLM architecture improvements over original" },
                { name: "قوانين التوسع: قدرة × بيانات × حساب", primary: "scaling laws compute data model size relationships" },
                { name: "القدرات الناشئة: مفاجآت الحجم الكبير", primary: "emergent abilities in large language models" },
                { name: "التقطيع: من النص لرموز BPE وSentencePiece", primary: "tokenization BPE SentencePiece for LLMs" },
                { name: "التدريب المسبق: البيانات والتجميع والكُلفة", primary: "LLM pretraining data curation and compute cost" },
                { name: "Flash Attention وRing Attention: الكفاءة", primary: "FlashAttention RingAttention efficient LLM training" },
                { name: "RoPE وALiBi: الترميز الموضعي في LLMs الحديثة", primary: "RoPE ALiBi positional encoding for LLMs" },
                { name: "Mixture of Experts: النماذج المتفرقة الكبيرة", primary: "mixture of experts sparse LLMs scaling" },
                { name: "مشروع: تدريب LLM مصغّر من الصفر", primary: "tiny LLM training from scratch project" }
              ]
            },
            {
              unit_index: 5, code: "2.4.5",
              name: "وكلاء الذكاء الاصطناعي: LLMs + أدوات",
              goal: "إتقان بناء وكلاء ذكاء اصطناعي تستخدم LLMs مع أدوات خارجية لحل مشاكل معقدة",
              key_concepts: ["ReAct","Tool Use","Function Calling","LangChain","Autonomous Agents"],
              lessons: [
                { name: "وكلاء الذكاء الاصطناعي: مفهوم الـAI Agent", primary: "AI agents concept and autonomous operation" },
                { name: "ReAct: التفكير والتصرف المتناوب", primary: "ReAct reasoning and acting agent framework" },
                { name: "Tool Use: LLMs تستخدم الأدوات الخارجية", primary: "LLM tool use function calling with APIs" },
                { name: "Function Calling: التكامل مع الـAPIs", primary: "function calling for LLM API integration" },
                { name: "LangChain: بناء Chains والـAgents", primary: "LangChain for building LLM chains and agents" },
                { name: "LlamaIndex: الـRAG المتقدم والوكلاء", primary: "LlamaIndex advanced RAG and agent building" },
                { name: "AutoGPT وMetaGPT: وكلاء مستقلة", primary: "AutoGPT MetaGPT autonomous AI agents" },
                { name: "وكلاء متعددة: تنسيق وتعاون", primary: "multi-agent coordination and collaboration" },
                { name: "مشروع: وكيل ذكاء اصطناعي لمهمة بحثية", primary: "AI research agent with tools project" }
              ]
            },
            {
              unit_index: 6, code: "2.4.6",
              name: "الذكاء الاصطناعي متعدد الوسائط",
              goal: "إتقان نماذج الذكاء الاصطناعي متعددة الوسائط التي تجمع بين النص والصورة والصوت",
              key_concepts: ["CLIP","Flamingo","GPT-4V","LLaVA","Audio-Visual Models"],
              lessons: [
                { name: "CLIP: ربط النص بالصورة عبر التباين", primary: "CLIP contrastive language image pretraining" },
                { name: "Flamingo: نموذج رؤية لغة من DeepMind", primary: "Flamingo vision language model few-shot" },
                { name: "GPT-4V وGemini: LLMs ترى الصور", primary: "GPT-4V Gemini multimodal vision language understanding" },
                { name: "LLaVA وInstructBLIP: المفتوحة المصدر", primary: "LLaVA InstructBLIP open source multimodal" },
                { name: "Whisper: تحويل الكلام للنص من OpenAI", primary: "Whisper speech to text transcription model" },
                { name: "Audio-Visual: نماذج الصوت والصورة معاً", primary: "audio visual multimodal model integration" },
                { name: "Stable Video Diffusion: توليد الفيديو", primary: "Stable Video Diffusion text to video generation" },
                { name: "تقييم نماذج متعددة الوسائط: المعايير والتحديات", primary: "multimodal model evaluation benchmarks challenges" },
                { name: "مشروع: نظام وصف الصور بالعربية", primary: "Arabic image captioning system with multimodal AI" }
              ]
            },
            {
              unit_index: 7, code: "2.4.7",
              name: "الذاكرة والاسترجاع في الأنظمة التوليدية",
              goal: "بناء أنظمة ذكاء اصطناعي توليدية مزوّدة بذاكرة طويلة الأمد وقدرة استرجاع فعّالة",
              key_concepts: ["Long Context","Memory Networks","External Memory","Episodic Memory","Retrieval Augmented"],
              lessons: [
                { name: "الذاكرة في LLMs: Context Window وحدوده", primary: "LLM memory context window and its limits" },
                { name: "السياق الطويل: Mamba وSSM وLongFormer", primary: "long context Mamba SSM LongFormer architecture" },
                { name: "الذاكرة الخارجية: Vector Store والاسترجاع", primary: "external memory with vector stores for LLMs" },
                { name: "الذاكرة الحلقية: تذكّر المحادثات السابقة", primary: "episodic memory for conversation history" },
                { name: "Memoryless vs Stateful AI: الفروق التطبيقية", primary: "memoryless vs stateful AI agent design" },
                { name: "Knowledge Graphs + LLMs: المعرفة المنظمة", primary: "knowledge graphs integration with LLMs" },
                { name: "Mem0 وLangMem: مكتبات الذاكرة للـAI", primary: "Mem0 LangMem memory libraries for AI applications" },
                { name: "Cognitive Architecture: الأنظمة النفسية المعرفية", primary: "cognitive architecture for AI memory and reasoning" },
                { name: "مشروع: مساعد ذكاء اصطناعي بذاكرة ديناميكية", primary: "AI assistant with dynamic long-term memory project" }
              ]
            },
            {
              unit_index: 8, code: "2.4.8",
              name: "تقييم وسلامة نماذج الذكاء الاصطناعي التوليدي",
              goal: "إتقان تقييم وضمان سلامة نماذج الذكاء الاصطناعي التوليدي من المخاطر والمحتوى الضار",
              key_concepts: ["HELM","LMSYS","FID","Safety Filters","Red Teaming"],
              lessons: [
                { name: "تقييم LLMs: HELM وLMSYS Chatbot Arena", primary: "LLM evaluation HELM and LMSYS benchmarks" },
                { name: "FID وIS: تقييم جودة الصور المولّدة", primary: "FID and inception score for image generation quality" },
                { name: "Human Evaluation: التقييم البشري للتوليد", primary: "human evaluation protocols for generative AI" },
                { name: "Safety Filtering: فلاتر المحتوى الضار", primary: "content safety filtering for generative AI" },
                { name: "Red Teaming يدوي وآلي للـLLMs", primary: "manual and automated red teaming for LLMs" },
                { name: "Jailbreaking والمقاومة: حماية النماذج", primary: "jailbreaking attacks and model robustness" },
                { name: "Watermarking النص المولّد: الكشف والتتبع", primary: "text watermarking for AI generated content detection" },
                { name: "Deepfake Detection: كشف المحتوى المزيف", primary: "deepfake detection for synthetic media" },
                { name: "مشروع: نظام تقييم وسلامة نموذج توليدي", primary: "generative model evaluation and safety system" }
              ]
            },
            {
              unit_index: 9, code: "2.4.9",
              name: "مشروع الذكاء الاصطناعي التوليدي الشامل",
              goal: "توحيد مهارات الذكاء الاصطناعي التوليدي في تطبيق إبداعي متكامل ومنشور",
              key_concepts: ["Creative Application","Full Pipeline","Safety","User Experience","Deployment"],
              lessons: [
                { name: "اختيار تطبيق توليدي ذو قيمة حقيقية", primary: "selecting high-value generative AI application" },
                { name: "تصميم الأنبوب الكامل: من الإدخال للإخراج", primary: "complete generative pipeline design" },
                { name: "ضمان الجودة: تقييم ومراقبة المخرجات", primary: "output quality assurance and monitoring" },
                { name: "السلامة وتصفية المحتوى في التطبيق", primary: "safety filters and content moderation integration" },
                { name: "تجربة المستخدم للذكاء الاصطناعي التوليدي", primary: "user experience design for generative AI" },
                { name: "التحسين: السرعة والتكلفة والجودة", primary: "generative AI optimization speed cost quality" },
                { name: "النشر على السحابة: Hugging Face وAWS", primary: "cloud deployment for generative AI application" },
                { name: "جمع التغذية الراجعة والتحسين المستمر", primary: "feedback collection and continuous improvement" },
                { name: "عرض المشروع والتحليل والتوثيق", primary: "project showcase analysis and documentation" }
              ]
            }
          ]
        },
        {
          stage_index: 5,
          name: "أنظمة التوصية والرسوم البيانية",
          goal: "إتقان أنظمة التوصية وخوارزميات الرسوم البيانية العصبية لتطبيقات الشخصنة والشبكات",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 28 },
          units: [
            {
              unit_index: 1, code: "2.5.1",
              name: "أسس أنظمة التوصية",
              goal: "فهم إطار أنظمة التوصية وأنواعها وتحدياتها كأساس لكل خوارزميات الشخصنة",
              key_concepts: ["Collaborative Filtering","Content-based","Hybrid","Cold Start","Sparsity"],
              lessons: [
                { name: "أنظمة التوصية: المشكلة وأنواع الحلول", primary: "recommendation systems problem types and overview" },
                { name: "التصفية التعاونية: المستخدمون يوصي بعضهم", primary: "collaborative filtering user and item based" },
                { name: "التصفية المعتمدة على المحتوى: الميزات تقود", primary: "content-based filtering with item features" },
                { name: "الأنظمة الهجينة: دمج النهجين", primary: "hybrid recommendation systems combination approaches" },
                { name: "مشكلة البداية الباردة: مستخدم وعنصر جديد", primary: "cold start problem for new users and items" },
                { name: "التفرق في البيانات: تحدي المصفوفة الخالية", primary: "data sparsity challenge in recommendation" },
                { name: "التنوع والكشف والمفاجأة في التوصية", primary: "diversity serendipity and surprise in recommendations" },
                { name: "مقاييس التقييم: NDCG وMRR وHit Rate", primary: "recommendation evaluation NDCG MRR hit rate" },
                { name: "مشروع: نظام توصية كتب بالتصفية التعاونية", primary: "book recommendation system collaborative filtering" }
              ]
            },
            {
              unit_index: 2, code: "2.5.2",
              name: "تحليل المصفوفات: Matrix Factorization",
              goal: "إتقان نماذج تحليل المصفوفات كعمود أساسي في أنظمة التوصية الحديثة",
              key_concepts: ["SVD","ALS","NMF","Funk SVD","Implicit Feedback"],
              lessons: [
                { name: "تحليل المصفوفة الانفرادي للتوصية", primary: "SVD matrix factorization for recommendation" },
                { name: "Funk SVD: الخوارزمية التي فازت بـNetflix", primary: "Funk SVD Netflix prize winning algorithm" },
                { name: "ALS: التناوب بين المستخدمين والعناصر", primary: "alternating least squares for matrix factorization" },
                { name: "إشارة ضمنية مقابل الصريحة: التفضيلات", primary: "implicit vs explicit feedback recommendation" },
                { name: "NMF: التحليل غير السلبي للمصفوفة", primary: "non-negative matrix factorization for recommendations" },
                { name: "BPR: الترتيب البايزي الزوجي للتوصية", primary: "Bayesian personalized ranking BPR for implicit feedback" },
                { name: "الانحلال الزمني: تطور تفضيلات المستخدم", primary: "temporal matrix factorization for preference evolution" },
                { name: "Surprise وScikit-Recommender: التطبيق بـPython", primary: "Surprise library for recommendation in Python" },
                { name: "مشروع: MovieLens Rating Prediction بـALS", primary: "MovieLens rating prediction with ALS project" }
              ]
            },
            {
              unit_index: 3, code: "2.5.3",
              name: "نماذج التوصية العميقة",
              goal: "إتقان نماذج التعلم العميق لأنظمة التوصية الحديثة في Netflix وYouTube وSpotify",
              key_concepts: ["Neural CF","Wide and Deep","DIN","BERT4Rec","Two-Tower"],
              lessons: [
                { name: "التصفية العصبية التعاونية: NCF", primary: "neural collaborative filtering NCF model" },
                { name: "Wide and Deep: التعلم العام والمحدد", primary: "wide and deep learning for recommendation" },
                { name: "معمارية Two-Tower: السرعة بدون تضحية", primary: "two-tower model for efficient recommendation retrieval" },
                { name: "DIN: شبكة الاهتمام العميقة للاهتمام", primary: "deep interest network DIN for e-commerce" },
                { name: "BERT4Rec: التسلسل التاريخي لتوصية المستقبل", primary: "BERT4Rec sequential recommendation with BERT" },
                { name: "SASRec: الانتباه الذاتي للتوصية التسلسلية", primary: "SASRec self-attentive sequential recommendation" },
                { name: "نظام YouTube: من المرشح لإعادة الترتيب", primary: "YouTube recommendation two-stage retrieval reranking" },
                { name: "التوصية الزمنية: TCF ومجموعات الجلسة", primary: "temporal and session-based recommendation" },
                { name: "مشروع: نظام توصية عميق لمنصة محتوى", primary: "deep recommendation system for content platform" }
              ]
            },
            {
              unit_index: 4, code: "2.5.4",
              name: "الشبكات العصبية البيانية: GNNs",
              goal: "إتقان الشبكات العصبية البيانية كإطار ثوري للتعلم على البيانات العلائقية وغير الإقليدية",
              key_concepts: ["Graph Convolution","Message Passing","GraphSAGE","GAT","Node Classification"],
              lessons: [
                { name: "لماذا الشبكات البيانية: البيانات العلائقية", primary: "why graph neural networks relational data" },
                { name: "التمرير الرسائلي: الإطار العام لـGNNs", primary: "message passing neural networks framework" },
                { name: "GCN: التلافيف على الرسوم البيانية", primary: "graph convolutional network node classification" },
                { name: "GraphSAGE: التقطير القابل للتعميم", primary: "GraphSAGE inductive graph representation learning" },
                { name: "GAT: الانتباه على حواف الرسم البياني", primary: "graph attention network edge attention" },
                { name: "GIN: النظرية خلف قوة التمييز", primary: "graph isomorphism network expressive power" },
                { name: "PyTorch Geometric وDGL: أُطر GNNs", primary: "PyTorch Geometric and DGL for GNN implementation" },
                { name: "تصنيف العقد والحواف والرسوم", primary: "node edge and graph classification tasks" },
                { name: "مشروع: GNN لتصنيف الأوراق العلمية", primary: "GNN for citation network node classification" }
              ]
            },
            {
              unit_index: 5, code: "2.5.5",
              name: "الرسوم البيانية المعرفية وLinkPrediction",
              goal: "فهم وتطبيق رسوم البيانات المعرفية والتنبؤ بالروابط لأنظمة AI المنطقية",
              key_concepts: ["Knowledge Graphs","Entity Embeddings","TransE","Relation Prediction","Knowledge Base QA"],
              lessons: [
                { name: "رسوم البيانات المعرفية: ثلاثيات المعرفة", primary: "knowledge graphs triples entities and relations" },
                { name: "TransE: تمثيل المعرفة كترجمات", primary: "TransE knowledge graph embedding translation" },
                { name: "RotatE وComplEx: تمثيلات أكثر تعبيراً", primary: "RotatE ComplEx expressive knowledge graph embeddings" },
                { name: "التنبؤ بالروابط: اكتمال الرسم البياني", primary: "link prediction for knowledge graph completion" },
                { name: "Wikidata وFreebase وOpenKE: قواعد المعرفة", primary: "Wikidata Freebase OpenKE knowledge bases" },
                { name: "KGQA: الإجابة على الأسئلة عبر رسوم البيانات", primary: "knowledge graph question answering KGQA" },
                { name: "GNNs + Knowledge Graphs: الدمج القوي", primary: "GNNs with knowledge graphs integration" },
                { name: "Neo4j: قاعدة بيانات الرسوم البيانية", primary: "Neo4j graph database for knowledge management" },
                { name: "مشروع: نظام توصية مبني على رسم بياني معرفي", primary: "knowledge graph enhanced recommendation system" }
              ]
            },
            {
              unit_index: 6, code: "2.5.6",
              name: "الشبكات العصبية البيانية للتوصية",
              goal: "تطبيق GNNs في أنظمة التوصية لالتقاط علاقات التفاعل المعقدة بين المستخدمين والعناصر",
              key_concepts: ["PinSage","GCMC","LightGCN","Bipartite Graphs","Temporal GNNs"],
              lessons: [
                { name: "PinSage: GNN في Pinterest الإنتاجية", primary: "PinSage GNN for Pinterest recommendation" },
                { name: "GCMC: التوصية كإكمال مصفوفة بياني", primary: "GCMC graph convolutional matrix completion" },
                { name: "LightGCN: التجميع الخطي البسيط", primary: "LightGCN linear graph convolution recommendation" },
                { name: "الرسوم البيانية الثنائية: مستخدم-عنصر", primary: "bipartite user-item graphs for recommendation" },
                { name: "GNNs الزمنية: التوصية الديناميكية", primary: "temporal GNNs for dynamic recommendation" },
                { name: "الرسوم البيانية الضخمة: GraphSAGE للإنتاج", primary: "large-scale graph learning with GraphSAGE" },
                { name: "المتانة والسلامة: هجمات الحقن في التوصية", primary: "robustness and injection attacks in recommendation" },
                { name: "إنصاف التوصية: التحيز والانحراف", primary: "recommendation fairness popularity bias exposure" },
                { name: "مشروع: GNN للتوصية على شبكة اجتماعية", primary: "social network recommendation with GNN" }
              ]
            },
            {
              unit_index: 7, code: "2.5.7",
              name: "توليد الرسوم البيانية وتطبيقاتها",
              goal: "إتقان نماذج توليد الرسوم البيانية لتطبيقات كيمياء الجزيئات والبروتينات والشبكات",
              key_concepts: ["GraphVAE","MPNN","AlphaFold","Drug Discovery","Molecular Generation"],
              lessons: [
                { name: "توليد الرسوم البيانية: الجزيئات والبروتينات", primary: "graph generation for molecules and proteins" },
                { name: "GraphVAE: التوليد الاحتمالي للرسوم", primary: "GraphVAE variational autoencoder for graphs" },
                { name: "MPNN: الشبكات العصبية لتمرير الرسائل الجزيئية", primary: "message passing neural networks for molecular chemistry" },
                { name: "AlphaFold: ثورة الطي البروتيني", primary: "AlphaFold protein structure prediction revolution" },
                { name: "اكتشاف الأدوية بالذكاء الاصطناعي: المسار الكامل", primary: "AI drug discovery computational pipeline" },
                { name: "GNN في الكيمياء: خصائص الجزيئات", primary: "GNN for molecular property prediction" },
                { name: "Flow Networks: توليد أنماط متسلسل", primary: "flow networks for sequential graph generation" },
                { name: "DeepMind وBiotech: الذكاء الاصطناعي يُطوّر الأدوية", primary: "DeepMind Biotech AI drug development" },
                { name: "مشروع: GNN للتنبؤ بخصائص الجزيئات", primary: "molecular property prediction with GNN project" }
              ]
            },
            {
              unit_index: 8, code: "2.5.8",
              name: "التحليل الطيفي وشبكات المقياس-الحرة",
              goal: "فهم الأسس النظرية للرسوم البيانية الكبيرة وتحليلها لاكتشاف البنية المجتمعية",
              key_concepts: ["Spectral Graph Theory","Community Detection","Power Law","Centrality","Clustering"],
              lessons: [
                { name: "نظرية الرسوم البيانية الطيفية: Laplacian", primary: "spectral graph theory Laplacian matrix" },
                { name: "كشف المجتمعات: Louvain وLabel Propagation", primary: "community detection Louvain Label Propagation" },
                { name: "قوانين القوة وشبكات المقياس-الحرة", primary: "power law networks and scale-free properties" },
                { name: "مقاييس المركزية: Degree وBetweenness وPageRank", primary: "centrality measures degree betweenness PageRank" },
                { name: "الرسوم البيانية الضخمة: التحديات والحلول", primary: "large-scale graph processing challenges and solutions" },
                { name: "تجميع الرسوم البيانية: Spectral Clustering", primary: "spectral clustering for graph partitioning" },
                { name: "الرسوم الديناميكية: تطور الشبكات", primary: "dynamic graphs and network evolution analysis" },
                { name: "تطبيق: تحليل شبكة Twitter أو LinkedIn", primary: "social network analysis Twitter LinkedIn application" },
                { name: "مشروع: تحليل شبكة معرفية في مجال علمي", primary: "scientific knowledge network analysis project" }
              ]
            },
            {
              unit_index: 9, code: "2.5.9",
              name: "مشروع التوصية والرسوم البيانية الشامل",
              goal: "توحيد مهارات التوصية والرسوم البيانية في نظام شخصنة متكامل يخدم حاجة حقيقية",
              key_concepts: ["Full Recommendation System","Graph Backend","Real-time Serving","A/B Testing","Monitoring"],
              lessons: [
                { name: "تصميم نظام توصية إنتاجي متكامل", primary: "production recommendation system architecture design" },
                { name: "بناء رسم البيانات الخلفي للنظام", primary: "graph backend construction for recommendation" },
                { name: "التدريب والتقييم الشامل للنموذج", primary: "comprehensive training and evaluation of recommendation" },
                { name: "الخدمة الآنية: Latency وThroughput", primary: "real-time serving latency and throughput optimization" },
                { name: "A/B Testing: قياس التأثير الحقيقي", primary: "A/B testing for recommendation system impact" },
                { name: "مراقبة النظام وكشف الانجراف", primary: "recommendation system monitoring and drift detection" },
                { name: "الإنصاف والتنوع في التوصية", primary: "fairness and diversity in recommendation output" },
                { name: "التوثيق وإعداد التقرير التقني الكامل", primary: "technical report and documentation for recommendation" },
                { name: "عرض النظام النهائي والمراجعة", primary: "final recommendation system presentation and review" }
              ]
            }
          ]
        },
        {
          stage_index: 6,
          name: "الكلام والصوت",
          goal: "إتقان معالجة إشارات الصوت والتعرف على الكلام وتوليده ونماذج الصوت الحديثة",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 28 },
          units: [
            {
              unit_index: 1, code: "2.6.1",
              name: "أسس معالجة إشارات الصوت",
              goal: "بناء فهم صلب لمعالجة إشارات الصوت الرقمية كأساس لكل نماذج الصوت والكلام",
              key_concepts: ["Waveform","STFT","Mel Spectrogram","MFCCs","Librosa"],
              lessons: [
                { name: "الصوت الرقمي: معدل الأخذ والترميز", primary: "digital audio sampling rate and encoding" },
                { name: "تحويل فورييه قصير الزمن: STFT", primary: "short-time Fourier transform for audio" },
                { name: "الطيف الميلي: تمثيل الصوت كالإدراك البشري", primary: "mel spectrogram for perceptual audio features" },
                { name: "MFCCs: معاملات التردد القصيرة التبويبية", primary: "MFCC mel frequency cepstral coefficients" },
                { name: "Librosa: مكتبة تحليل الصوت بـPython", primary: "Librosa audio analysis library Python" },
                { name: "تصفية الصوت: البند الواطئ والعالي", primary: "audio filtering low-pass high-pass band filters" },
                { name: "كشف نشاط الصوت: VAD الكلاسيكي", primary: "voice activity detection classical methods" },
                { name: "تطبيع الصوت والتقطيع والتقليم", primary: "audio normalization segmentation and trimming" },
                { name: "مشروع: نظام تصنيف الأصوات البيئية", primary: "environmental sound classification system project" }
              ]
            },
            {
              unit_index: 2, code: "2.6.2",
              name: "التعرف على الكلام: ASR",
              goal: "إتقان نماذج التعرف على الكلام من CTC إلى Whisper لبناء تطبيقات تحويل الكلام للنص",
              key_concepts: ["CTC","Attention ASR","Whisper","Wav2Vec 2.0","Arabic ASR"],
              lessons: [
                { name: "هيكل نظام ASR: المكونات والمراحل", primary: "ASR system architecture components pipeline" },
                { name: "CTC: التدريب بدون محاذاة صريحة", primary: "CTC connectionist temporal classification for ASR" },
                { name: "نماذج ASR بالانتباه: Listen-Attend-Spell", primary: "attention-based ASR Listen Attend Spell" },
                { name: "Wav2Vec 2.0: التعلم الذاتي للصوت", primary: "Wav2Vec 2.0 self-supervised speech representation" },
                { name: "Whisper: ASR عام من OpenAI", primary: "Whisper multilingual ASR from OpenAI" },
                { name: "الضبط الدقيق لـWhisper بالعربية", primary: "Whisper fine-tuning for Arabic speech recognition" },
                { name: "ASR في ظل الضجيج والبيئات القاسية", primary: "robust ASR in noisy environments" },
                { name: "قياس ASR: WER وCER والمقارنة", primary: "ASR evaluation WER CER metrics" },
                { name: "مشروع: نظام ASR يمني بـWhisper", primary: "Yemeni speech recognition system with Whisper" }
              ]
            },
            {
              unit_index: 3, code: "2.6.3",
              name: "توليد الكلام: TTS",
              goal: "إتقان نماذج تحويل النص للكلام لبناء أصوات اصطناعية طبيعية وعالية الجودة",
              key_concepts: ["Tacotron","FastSpeech","HiFi-GAN","Voice Cloning","XTTS"],
              lessons: [
                { name: "مراحل TTS: النص للطيف للموجة", primary: "TTS pipeline text to spectrogram to waveform" },
                { name: "Tacotron 2: الطريق الأول للجودة العالية", primary: "Tacotron 2 for high quality speech synthesis" },
                { name: "FastSpeech 2: TTS بلا انتظار", primary: "FastSpeech 2 fast parallel TTS model" },
                { name: "HiFi-GAN: Vocoder عالي الأمانة", primary: "HiFi-GAN neural vocoder for high fidelity speech" },
                { name: "VITS: نموذج TTS كامل احتمالي", primary: "VITS variational inference text to speech" },
                { name: "استنساخ الصوت: Voice Cloning بعينات قليلة", primary: "voice cloning few-shot speaker adaptation" },
                { name: "XTTS: TTS متعدد اللغات مع الاستنساخ", primary: "XTTS multilingual voice cloning and synthesis" },
                { name: "TTS العربي: التحديات والنماذج المتاحة", primary: "Arabic TTS challenges and available models" },
                { name: "مشروع: مساعد صوتي عربي بـXTTS", primary: "Arabic voice assistant with XTTS project" }
              ]
            },
            {
              unit_index: 4, code: "2.6.4",
              name: "التعرف على المتحدث والهوية الصوتية",
              goal: "إتقان نماذج التحقق من المتحدث وتحديد هويته وتقسيم المتحدثين",
              key_concepts: ["Speaker Embeddings","d-vectors","x-vectors","SpeakerDiarization","SV"],
              lessons: [
                { name: "التحقق من المتحدث مقابل التعرف على الهوية", primary: "speaker verification vs identification difference" },
                { name: "تمثيلات المتحدث: d-vectors وx-vectors", primary: "speaker embeddings d-vectors x-vectors" },
                { name: "Neural Speaker Embeddings بـPyTorch", primary: "neural speaker embeddings implementation PyTorch" },
                { name: "دياريزيشن: من يتحدث ومتى", primary: "speaker diarization who speaks when" },
                { name: "نظام كلمة المرور الصوتية: التطبيق العملي", primary: "voice passphrase system practical application" },
                { name: "الانتحال الصوتي والمقاومة: حماية الهوية", primary: "voice spoofing detection anti-spoofing" },
                { name: "SpeechBrain: إطار الصوت الشامل", primary: "SpeechBrain comprehensive speech processing framework" },
                { name: "تطبيقات: الاجتماعات والمراقبة والمساعدون", primary: "speaker recognition applications meetings surveillance" },
                { name: "مشروع: نظام مصادقة صوتية", primary: "voice authentication system project" }
              ]
            },
            {
              unit_index: 5, code: "2.6.5",
              name: "تحليل المشاعر والعواطف من الصوت",
              goal: "إتقان نماذج تحليل العواطف والمشاعر من إشارات الصوت والكلام",
              key_concepts: ["Emotion Recognition","Sentiment in Speech","Paralinguistics","Prosody","Affective Computing"],
              lessons: [
                { name: "العواطف في الصوت: الإدراك البشري والآلي", primary: "emotion in speech human and machine perception" },
                { name: "مجموعات بيانات العواطف الصوتية: IEMOCAP", primary: "speech emotion datasets IEMOCAP RAVDESS" },
                { name: "الميزات الصوتية للعواطف: Prosody والـPitch", primary: "prosody pitch intensity for emotion features" },
                { name: "تصنيف العواطف بالتعلم العميق", primary: "deep learning for speech emotion classification" },
                { name: "التحليل متعدد الوسائط: صوت وصورة معاً", primary: "multimodal emotion recognition audio and vision" },
                { name: "Paralinguistics: ما وراء الكلمات", primary: "paralinguistics non-verbal speech analysis" },
                { name: "تحليل مشاعر الكلام في الوقت الحقيقي", primary: "real-time speech sentiment analysis application" },
                { name: "تطبيقات: خدمة عملاء وصحة نفسية", primary: "emotion AI for customer service and mental health" },
                { name: "مشروع: محلل مشاعر مقابلات عمل بالكلام", primary: "job interview speech emotion analyzer project" }
              ]
            },
            {
              unit_index: 6, code: "2.6.6",
              name: "توليد الموسيقى والصوت بالذكاء الاصطناعي",
              goal: "إتقان نماذج توليد الموسيقى والأصوات الاصطناعية بأساليب الذكاء الاصطناعي الحديثة",
              key_concepts: ["MusicLM","AudioCraft","WaveNet","Music Generation","Sound Design"],
              lessons: [
                { name: "توليد الموسيقى: المشكلة والتحديات", primary: "AI music generation problem and challenges" },
                { name: "WaveNet: التوليد الموجي العميق", primary: "WaveNet autoregressive audio generation" },
                { name: "Jukebox: الموسيقى الخام من OpenAI", primary: "Jukebox raw audio music generation from OpenAI" },
                { name: "MusicLM: الموسيقى من النص بـGoogle", primary: "MusicLM text-to-music generation from Google" },
                { name: "AudioCraft وMusicGen: Meta توليد الصوت", primary: "AudioCraft MusicGen Meta audio generation" },
                { name: "AudioLDM: الانتشار لتوليد الصوت", primary: "AudioLDM latent diffusion for audio generation" },
                { name: "Foley AI: مؤثرات صوتية بالذكاء الاصطناعي", primary: "AI Foley sound effect generation" },
                { name: "أخلاقيات توليد الموسيقى وحقوق الملكية", primary: "music generation ethics and IP rights" },
                { name: "مشروع: توليد موسيقى تعليمية يمنية بالذكاء الاصطناعي", primary: "Yemeni educational music generation with AI project" }
              ]
            },
            {
              unit_index: 7, code: "2.6.7",
              name: "الذكاء الاصطناعي الصوتي متعدد الوسائط",
              goal: "دمج الصوت مع الصورة والنص في نماذج متعددة الوسائط لتطبيقات أكثر ثراءً",
              key_concepts: ["Audio-Visual Learning","Lip Reading","Video to Audio","Speech Enhancement","Multimodal ASR"],
              lessons: [
                { name: "التعلم المرئي الصوتي: التطابق والتعلم الذاتي", primary: "audio visual learning self-supervised correspondence" },
                { name: "قراءة الشفاه: Lip Reading بالذكاء الاصطناعي", primary: "AI lip reading visual speech recognition" },
                { name: "فيديو للصوت: تزامن الصورة والصوت", primary: "video to audio synchronization AI generation" },
                { name: "Speech Enhancement: تحسين وضوح الكلام", primary: "speech enhancement noise reduction deep learning" },
                { name: "الفصل الصوتي: Source Separation", primary: "audio source separation cocktail party problem" },
                { name: "ASR متعدد الوسائط: الصوت والصورة", primary: "multimodal ASR combining audio and visual input" },
                { name: "Podcast AI: التفريغ والتلخيص التلقائي", primary: "podcast AI transcription and summarization" },
                { name: "تطبيقات طبية: تشخيص أمراض الصوت", primary: "medical voice disease diagnosis AI applications" },
                { name: "مشروع: نظام اجتماعات ذكي بـASR وTTS", primary: "smart meeting system with ASR TTS and summarization" }
              ]
            },
            {
              unit_index: 8, code: "2.6.8",
              name: "الكلام في الوقت الحقيقي والنشر",
              goal: "إتقان نشر أنظمة الكلام في بيئات الوقت الحقيقي مع متطلبات الزمن الخفيف والكفاءة",
              key_concepts: ["Streaming ASR","Edge TTS","WebRTC","Low Latency","ONNX for Audio"],
              lessons: [
                { name: "ASR الدفقي: التعرف لحظة النطق", primary: "streaming ASR real-time speech recognition" },
                { name: "TTS على الحافة: نماذج خفيفة على الجهاز", primary: "edge TTS lightweight on-device speech synthesis" },
                { name: "WebRTC: بروتوكول الاتصال الصوتي الفوري", primary: "WebRTC for real-time audio communication" },
                { name: "تحسين النماذج الصوتية: Quantization وPruning", primary: "audio model optimization quantization pruning" },
                { name: "ONNX لنماذج الصوت: النشر المتعدد المنصات", primary: "ONNX for cross-platform audio model deployment" },
                { name: "معالجة Chunks: توازن الزمن والدقة", primary: "audio chunk processing latency accuracy balance" },
                { name: "واجهة صوتية متكاملة: مساعد الجهاز", primary: "integrated voice interface for device assistant" },
                { name: "مراقبة وجودة الخدمة الصوتية", primary: "audio service quality monitoring and metrics" },
                { name: "مشروع: مساعد صوتي عربي متكامل على الحافة", primary: "complete Arabic edge voice assistant project" }
              ]
            },
            {
              unit_index: 9, code: "2.6.9",
              name: "مشروع الكلام والصوت الشامل",
              goal: "توحيد مهارات الكلام والصوت في منظومة متكاملة تحل مشكلة حقيقية ومنشورة",
              key_concepts: ["End-to-End Speech System","Arabic Focus","Real-time","Deployment","Evaluation"],
              lessons: [
                { name: "اختيار تطبيق صوتي حقيقي ذو تأثير", primary: "high impact speech AI application selection" },
                { name: "بناء خط معالجة الصوت الكامل", primary: "complete audio processing pipeline" },
                { name: "تدريب أو ضبط نماذج ASR وTTS للعربية", primary: "training or fine-tuning ASR TTS for Arabic" },
                { name: "التقييم الشامل بمقاييس الجودة والزمن", primary: "comprehensive evaluation quality and latency metrics" },
                { name: "تحسين الأداء والزمن للإنتاج", primary: "production optimization performance and latency" },
                { name: "واجهة المستخدم والتكامل الكامل", primary: "user interface and full system integration" },
                { name: "النشر وإعداد البنية التحتية", primary: "deployment and infrastructure setup for speech system" },
                { name: "جمع التغذية الراجعة وتحسين النموذج", primary: "feedback collection and model improvement cycle" },
                { name: "العرض النهائي ودليل التوثيق", primary: "final presentation and documentation guide" }
              ]
            }
          ]
        },
        {
          stage_index: 7,
          name: "التدريب المتقدم وضغط النماذج",
          goal: "إتقان تقنيات التدريب الموزع والتدريب الفعّال وضغط النماذج للبيئات المحدودة الموارد",
          bloom_focus: "analyze",
          exam: { pass_threshold_percent: 70, time_limit_minutes: 50 },
          unit_exam_defaults: { pass_threshold_percent: 72, time_limit_minutes: 28 },
          units: [
            {
              unit_index: 1, code: "2.7.1",
              name: "التدريب الموزع على GPU متعددة",
              goal: "إتقان استراتيجيات التدريب الموزع لتدريب النماذج الكبيرة على GPU متعددة",
              key_concepts: ["Data Parallelism","Model Parallelism","DDP","Pipeline Parallelism","ZeRO"],
              lessons: [
                { name: "لماذا التدريب الموزع: الحواجز والدوافع", primary: "distributed training motivation and barriers" },
                { name: "توازي البيانات: DDP في PyTorch", primary: "data parallelism distributed data parallel DDP" },
                { name: "توازي النماذج: تقسيم الطبقات على GPU", primary: "model parallelism layer splitting across GPUs" },
                { name: "توازي خط الأنابيب: GPipe وPipeDream", primary: "pipeline parallelism GPipe PipeDream" },
                { name: "ZeRO Optimization: DeepSpeed للتدريب الكبير", primary: "ZeRO optimization stages with DeepSpeed" },
                { name: "Tensor Parallelism: Megatron-LM", primary: "tensor parallelism Megatron-LM for LLMs" },
                { name: "3D Parallelism: الجمع بين الثلاثة", primary: "3D parallelism combining all strategies" },
                { name: "مراقبة الكفاءة: GPU Utilization وThroughput", primary: "GPU utilization and training throughput monitoring" },
                { name: "مشروع: تدريب موزع على نموذج BERT كامل", primary: "distributed training BERT full model project" }
              ]
            },
            {
              unit_index: 2, code: "2.7.2",
              name: "الدقة المختلطة وتحسين التدريب",
              goal: "إتقان الدقة المختلطة ومجموعة من تقنيات تحسين التدريب لتسريع وتوفير الذاكرة",
              key_concepts: ["FP16","BF16","Loss Scaling","Gradient Checkpointing","Mixed Precision"],
              lessons: [
                { name: "أنواع الدقة العائمة: FP32 وFP16 وBF16", primary: "floating point precision FP32 FP16 BF16 comparison" },
                { name: "Mixed Precision Training: الجمع الذكي", primary: "mixed precision training FP16 with master weights" },
                { name: "تدرج الخسارة: حل تدفق الأرقام", primary: "loss scaling for mixed precision stability" },
                { name: "Gradient Checkpointing: الذاكرة مقابل الحساب", primary: "gradient checkpointing memory compute tradeoff" },
                { name: "Flash Attention 2: انتباه فائق الكفاءة", primary: "FlashAttention 2 efficient attention computation" },
                { name: "Activation Checkpointing وRecompute", primary: "activation checkpointing and recompute strategies" },
                { name: "Compilation: torch.compile وJIT", primary: "PyTorch compilation torch.compile and TorchScript JIT" },
                { name: "CUDA Graphs: تقليل overhead الـLaunch", primary: "CUDA Graphs for reducing launch overhead" },
                { name: "مشروع: تدريب أسرع بـmixed precision وFlash Attn", primary: "faster training with mixed precision and FlashAttention" }
              ]
            },
            {
              unit_index: 3, code: "2.7.3",
              name: "التقطير: نقل المعرفة للنماذج الصغيرة",
              goal: "إتقان تقنيات التقطير لنقل معرفة النماذج الكبيرة إلى نماذج صغيرة كفوءة",
              key_concepts: ["Knowledge Distillation","Soft Labels","Feature Distillation","Task-Specific","DistilBERT"],
              lessons: [
                { name: "فكرة التقطير: المعلم يعلّم الطالب", primary: "knowledge distillation teacher student learning" },
                { name: "التسميات الناعمة: المعلومات في التوزيع", primary: "soft labels information in teacher distribution" },
                { name: "الخسارة المركّبة: KD مع الهدف الأصلي", primary: "combined distillation loss for optimal transfer" },
                { name: "تقطير الميزات: تعلم التمثيلات الوسيطة", primary: "feature distillation intermediate representations" },
                { name: "DistilBERT: BERT النصف بـ95% من الأداء", primary: "DistilBERT successful BERT distillation case study" },
                { name: "TinyBERT: تقطير متعدد المراحل", primary: "TinyBERT multi-stage progressive distillation" },
                { name: "Self-Distillation: المعلم والطالب نفس البنية", primary: "self-distillation for model improvement" },
                { name: "تقطير المجموعة: الحكمة المضمّنة", primary: "ensemble distillation for compact models" },
                { name: "مشروع: تقطير GPT-2 لنموذج بنص مخصص", primary: "GPT-2 distillation for domain-specific compact model" }
              ]
            },
            {
              unit_index: 4, code: "2.7.4",
              name: "الكميّة: نماذج على 4 بتات وأقل",
              goal: "إتقان تقنيات الكميّة لتقليل حجم النماذج وتسريع الاستدلال مع الحفاظ على الجودة",
              key_concepts: ["INT8","INT4","GPTQ","AWQ","Quantization Aware Training"],
              lessons: [
                { name: "مبادئ الكميّة: الأعداد بعدد أقل من البتات", primary: "quantization principles fewer bits for neural nets" },
                { name: "PTQ: الكميّة بعد التدريب", primary: "post-training quantization PTQ techniques" },
                { name: "QAT: التدريب مع وعي بالكميّة", primary: "quantization aware training for better accuracy" },
                { name: "GPTQ: كميّة للنماذج اللغوية الكبيرة", primary: "GPTQ post-training quantization for LLMs" },
                { name: "AWQ: تنشيط مدرك للكميّة", primary: "AWQ activation-aware weight quantization" },
                { name: "GGUF وllama.cpp: اللغوية الكبيرة على CPU", primary: "GGUF llama.cpp LLM quantization for CPU inference" },
                { name: "BitsAndBytes: الكميّة بـ4 بت مع HuggingFace", primary: "BitsAndBytes 4-bit quantization with HuggingFace" },
                { name: "مقارنة الكميّة: الحجم مقابل الدقة مقابل السرعة", primary: "quantization comparison size accuracy speed tradeoff" },
                { name: "مشروع: تشغيل Llama-7B على GPU صغير بـGPTQ", primary: "running Llama-7B on small GPU with GPTQ" }
              ]
            },
            {
              unit_index: 5, code: "2.7.5",
              name: "التشذيب: حذف الأوزان غير الضرورية",
              goal: "إتقان تقنيات التشذيب لتقليل عدد معاملات النموذج مع الحفاظ على الأداء",
              key_concepts: ["Unstructured Pruning","Structured Pruning","Magnitude Pruning","Lottery Ticket","Gradual Pruning"],
              lessons: [
                { name: "فكرة التشذيب: إزالة الأوزان الأقل أهمية", primary: "model pruning weight removal concept" },
                { name: "التشذيب غير المنظم: حذف الأوزان الفردية", primary: "unstructured pruning individual weight removal" },
                { name: "التشذيب المنظم: حذف الفلاتر والطبقات", primary: "structured pruning filters and layer removal" },
                { name: "فرضية التذكرة اليانصيب: ما ينجو؟", primary: "lottery ticket hypothesis sparse subnetwork" },
                { name: "التشذيب التدريجي: إزالة تدريجية أثناء التدريب", primary: "gradual pruning during training with rewinding" },
                { name: "Neural Architecture Pruning: الأقل كمبنية", primary: "architecture-level pruning for efficient models" },
                { name: "إعادة ضبط دقيق بعد التشذيب", primary: "fine-tuning after pruning for accuracy recovery" },
                { name: "SparseGPT: تشذيب النماذج اللغوية الكبيرة", primary: "SparseGPT one-shot LLM pruning" },
                { name: "مشروع: تشذيب ResNet50 بـ50% دون خسارة كبيرة", primary: "ResNet50 pruning 50% sparsity with minimal accuracy loss" }
              ]
            },
            {
              unit_index: 6, code: "2.7.6",
              name: "البحث عن المعمارية النسيجية: NAS",
              goal: "فهم وتطبيق البحث التلقائي عن معماريات الشبكات العصبية الأمثل",
              key_concepts: ["DARTS","Evolutionary Search","EfficientNet NAS","Once-for-All","Hardware-aware NAS"],
              lessons: [
                { name: "NAS: البحث الآلي عن بنية الشبكة", primary: "neural architecture search automated design" },
                { name: "البحث التطوري: الجيل والاختيار والتكرار", primary: "evolutionary architecture search genetic algorithms" },
                { name: "DARTS: التمييز الكفء في البحث", primary: "DARTS differentiable architecture search" },
                { name: "One-shot NAS: الاتحاد دون إعادة تدريب", primary: "one-shot NAS supernetwork weight sharing" },
                { name: "EfficientNet: NAS بالتوسع المتوازن", primary: "EfficientNet NAS compound scaling" },
                { name: "Hardware-aware NAS: المعمارية للجهاز المستهدف", primary: "hardware-aware NAS for target device optimization" },
                { name: "Once-for-All: شبكة واحدة لأجهزة متعددة", primary: "Once-for-All network for diverse hardware" },
                { name: "AutoML: التتيرلة الكاملة لاختيار النموذج", primary: "AutoML for end-to-end model selection" },
                { name: "مشروع: NAS لإيجاد معمارية مثلى لمهمة محددة", primary: "NAS for optimal architecture search project" }
              ]
            },
            {
              unit_index: 7, code: "2.7.7",
              name: "التحويل للحافة: Edge AI",
              goal: "إتقان نقل نماذج الذكاء الاصطناعي للأجهزة الطرفية ذات الموارد المحدودة",
              key_concepts: ["TensorFlow Lite","TorchMobile","ONNX","CoreML","Embedded AI"],
              lessons: [
                { name: "الذكاء الاصطناعي على الحافة: الدوافع والقيود", primary: "edge AI motivation constraints and requirements" },
                { name: "TensorFlow Lite: النماذج على الأجهزة المحمولة", primary: "TensorFlow Lite for mobile deployment" },
                { name: "ONNX: التنسيق العالمي للنشر المتقاطع", primary: "ONNX universal format for cross-platform deployment" },
                { name: "CoreML: ذكاء اصطناعي على iOS وmacOS", primary: "CoreML for Apple device deployment" },
                { name: "OpenVINO: ذكاء اصطناعي Intel على CPU وNPU", primary: "OpenVINO for Intel CPU and edge NPU" },
                { name: "MediaPipe: أنابيب متعددة الوسائط على الحافة", primary: "MediaPipe for on-device multimodal pipelines" },
                { name: "نماذج محادثة على الجهاز: llama.cpp وOllama", primary: "on-device LLMs with llama.cpp and Ollama" },
                { name: "قياس الطاقة والزمن والدقة على الحافة", primary: "edge AI benchmarking power latency accuracy" },
                { name: "مشروع: نموذج رؤية على Raspberry Pi", primary: "vision model deployment on Raspberry Pi edge device" }
              ]
            },
            {
              unit_index: 8, code: "2.7.8",
              name: "الـTransformers الفعّالة ومعالجة السياق الطويل",
              goal: "إتقان آليات جعل Transformers أكثر كفاءة لمعالجة السياق الطويل وتقليل التكلفة",
              key_concepts: ["Sliding Window","Mamba","SSMs","RetNet","RWKV"],
              lessons: [
                { name: "مشكلة O(n²) في الانتباه: التحدي الأساسي", primary: "quadratic attention complexity problem" },
                { name: "Sliding Window Attention: نوافذ محلية", primary: "sliding window attention for long sequences" },
                { name: "Longformer وBigBird: الانتباه المبعثر", primary: "Longformer BigBird sparse attention patterns" },
                { name: "SSMs: نماذج الفضاء الحالي الفعّالة", primary: "state space models linear complexity sequence modeling" },
                { name: "Mamba: SSM مع الانتقاء الانتقائي", primary: "Mamba selective SSM for language modeling" },
                { name: "RWKV: RNN تلتقي بـTransformer", primary: "RWKV RNN meets Transformer efficient hybrid" },
                { name: "RetNet: الاحتفاظ والتمثيل المتوازي", primary: "RetNet retention and parallel representation" },
                { name: "KV Cache وFlashDecoding للاستدلال السريع", primary: "KV cache and flash decoding for fast inference" },
                { name: "مشروع: مقارنة كفاءة Mamba مقابل Transformer", primary: "Mamba vs Transformer efficiency comparison project" }
              ]
            },
            {
              unit_index: 9, code: "2.7.9",
              name: "مشروع التدريب المتقدم والكفاءة الشامل",
              goal: "توحيد تقنيات التدريب المتقدم والكفاءة في نموذج مُحسَّن ومُنشَر لبيئة محدودة الموارد",
              key_concepts: ["Optimization Stack","Compression Pipeline","Edge Deployment","Benchmarking","Cost Analysis"],
              lessons: [
                { name: "اختيار نموذج وتحديد هدف التحسين", primary: "model selection and optimization target setting" },
                { name: "تحليل الأداء الأساسي: الكسب والزمن والذاكرة", primary: "baseline performance analysis accuracy latency memory" },
                { name: "تطبيق Mixed Precision وFlash Attention", primary: "applying mixed precision and flash attention" },
                { name: "تقطير النموذج مع الحفاظ على الجودة", primary: "model distillation with quality preservation" },
                { name: "الكميّة للنموذج المُقطَّر", primary: "quantization applied to distilled model" },
                { name: "التشذيب الاختياري للمعاملات غير الجوهرية", primary: "optional pruning for non-essential parameters" },
                { name: "النشر على جهاز حافة مستهدف", primary: "final deployment on target edge device" },
                { name: "قياس الأداء الشامل: قبل وبعد", primary: "comprehensive benchmarking before and after optimization" },
                { name: "تقرير التحسين والعرض النهائي", primary: "optimization report and final project presentation" }
              ]
            }
          ]
        }
      ]
    },
    {
      level_index: 3,
      name: "هندسة الذكاء الاصطناعي والقيادة",
      goal: "إتقان هندسة أنظمة الذكاء الاصطناعي الإنتاجية وMLOps وسلامة الذكاء الاصطناعي وتطبيقاته في المجالات وقيادة فرق الذكاء الاصطناعي",
      bloom_focus: "create",
      exam: { pass_threshold_percent: 75, time_limit_minutes: 90 },
      stages: [
        {
          stage_index: 1,
          name: "MLOps والذكاء الاصطناعي في الإنتاج",
          goal: "إتقان MLOps لبناء وإدارة دورة حياة النماذج الإنتاجية من التدريب للمراقبة والصيانة",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "3.1.1",
              name: "نشر النماذج: من الكود للإنتاج",
              goal: "إتقان استراتيجيات وتقنيات نشر نماذج الذكاء الاصطناعي في بيئات الإنتاج الحقيقية",
              key_concepts: ["REST API","FastAPI","Model Serving","Blue-Green","Canary Deployment"],
              lessons: [
                { name: "الفجوة بين الاختبار والإنتاج: التحديات", primary: "gap between research and production AI deployment" },
                { name: "FastAPI: أسرع طريق لـAPI للنموذج", primary: "FastAPI for ML model serving API" },
                { name: "استراتيجيات النشر: Blue-Green وCanary", primary: "blue-green and canary deployment strategies for AI" },
                { name: "Shadow Deployment: اختبار الإنتاج بأمان", primary: "shadow deployment for safe production testing" },
                { name: "BentoML: حزم النماذج وخدمتها", primary: "BentoML for model packaging and serving" },
                { name: "Triton Inference Server: خدمة GPU عالية الأداء", primary: "NVIDIA Triton Inference Server for GPU serving" },
                { name: "Ray Serve: خدمة النماذج الموزعة", primary: "Ray Serve for distributed model serving" },
                { name: "متطلبات الإنتاج: SLA وUptime وLatency", primary: "production requirements SLA uptime latency SLOs" },
                { name: "مشروع: نشر نموذج صور كخدمة REST كاملة", primary: "image model deployment as complete REST service" }
              ]
            },
            {
              unit_index: 2, code: "3.1.2",
              name: "مراقبة النماذج وجودة البيانات",
              goal: "إتقان مراقبة نماذج الإنتاج واكتشاف انجراف البيانات والأداء لضمان موثوقية مستمرة",
              key_concepts: ["Data Drift","Model Drift","Monitoring Dashboards","Alerting","Evidently AI"],
              lessons: [
                { name: "لماذا تتدهور النماذج: الانجراف والتحولات", primary: "model degradation data drift and distribution shift" },
                { name: "Evidently AI: مراقبة شاملة للنماذج", primary: "Evidently AI for comprehensive model monitoring" },
                { name: "كشف انجراف البيانات: الطرق الإحصائية", primary: "data drift detection statistical methods" },
                { name: "مراقبة الأداء: التحقق من المقاييس الحية", primary: "performance monitoring live metrics validation" },
                { name: "Prometheus وGrafana للذكاء الاصطناعي", primary: "Prometheus Grafana for AI model monitoring" },
                { name: "التنبيهات الذكية: متى تتصرف ومتى تنتظر", primary: "smart alerting strategies for AI model monitoring" },
                { name: "Feedback Loops: التحسين المستمر في الإنتاج", primary: "production feedback loops for continuous improvement" },
                { name: "A/B Testing للنماذج الإنتاجية", primary: "A/B testing for production model comparison" },
                { name: "مشروع: نظام مراقبة كامل لنموذج إنتاجي", primary: "complete monitoring system for production AI model" }
              ]
            },
            {
              unit_index: 3, code: "3.1.3",
              name: "CI/CD لمشاريع الذكاء الاصطناعي",
              goal: "إتقان ممارسات CI/CD المخصصة لمشاريع الذكاء الاصطناعي لأتمتة الاختبار والنشر",
              key_concepts: ["ML Testing","CML","GitHub Actions","Model Validation","Automated Retraining"],
              lessons: [
                { name: "CI/CD للذكاء الاصطناعي: الاختلافات عن التقليدي", primary: "CI/CD for ML differences from traditional software" },
                { name: "اختبار النماذج في CI: الأشكال والأداء", primary: "model testing in CI shape performance validation" },
                { name: "CML: التعلم الآلي المستمر على GitHub", primary: "CML continuous machine learning with GitHub" },
                { name: "GitHub Actions لتدريب ونشر النماذج", primary: "GitHub Actions for model training and deployment" },
                { name: "اختبار البيانات التلقائي في Pipeline", primary: "automated data testing in ML CI pipeline" },
                { name: "المقارنة التلقائية: الجديد مقابل الإنتاجي", primary: "automated model comparison new vs production" },
                { name: "إعادة التدريب التلقائية عند الانجراف", primary: "automated retraining triggered by drift detection" },
                { name: "Kubeflow Pipelines: تنسيق ML على K8s", primary: "Kubeflow Pipelines for ML orchestration on Kubernetes" },
                { name: "مشروع: Pipeline CI/CD كامل لنموذج إنتاجي", primary: "complete CI/CD pipeline for production ML model" }
              ]
            },
            {
              unit_index: 4, code: "3.1.4",
              name: "Feature Stores وإدارة الميزات",
              goal: "إتقان بناء وإدارة Feature Stores لضمان اتساق الميزات بين التدريب والاستدلال",
              key_concepts: ["Feast","Tecton","Online vs Offline","Feature Consistency","Point-in-Time"],
              lessons: [
                { name: "Feature Store: مستودع الميزات المركزي", primary: "feature store for centralized feature management" },
                { name: "مشكلة عدم الاتساق: التدريب مقابل الخدمة", primary: "training serving skew problem and solutions" },
                { name: "Feast: أشهر Feature Store مفتوح المصدر", primary: "Feast open source feature store setup and use" },
                { name: "الميزات الآنية مقابل المتاخرة: Online وOffline", primary: "online vs offline feature stores difference" },
                { name: "Point-in-Time Correct Features: تفادي التسرب", primary: "point-in-time features to prevent data leakage" },
                { name: "حساب الميزات: Streaming وBatch", primary: "feature computation streaming and batch strategies" },
                { name: "إدارة الميزات: الإصدار والتوثيق والاكتشاف", primary: "feature management versioning documentation discovery" },
                { name: "Tecton وHopsworks: البدائل التجارية", primary: "Tecton Hopsworks commercial feature store options" },
                { name: "مشروع: Feature Store لنظام توصية إنتاجي", primary: "feature store for production recommendation system" }
              ]
            },
            {
              unit_index: 5, code: "3.1.5",
              name: "إصدارات النماذج وسجل النماذج",
              goal: "إتقان إدارة دورة حياة النماذج من التدريب للخدمة عبر سجل النماذج الاحترافي",
              key_concepts: ["Model Registry","MLflow Models","Version Control","Model Lineage","Rollback"],
              lessons: [
                { name: "سجل النماذج: الحاجة والفوائد والمكونات", primary: "model registry need benefits and components" },
                { name: "MLflow Model Registry: التسجيل والإدارة", primary: "MLflow Model Registry complete workflow" },
                { name: "مراحل دورة حياة النموذج: Staging وProduction", primary: "model lifecycle stages staging production archived" },
                { name: "إصدار النموذج: Semantic Versioning للـAI", primary: "semantic versioning for AI models" },
                { name: "سلسلة النموذج: من البيانات للتنبؤ", primary: "model lineage tracing from data to prediction" },
                { name: "استرجاع النموذج: Rollback الآمن", primary: "model rollback for safe production recovery" },
                { name: "Model Cards: التوثيق المعياري لكل إصدار", primary: "model cards standardized per-version documentation" },
                { name: "التكامل مع CI/CD: نشر تلقائي من السجل", primary: "registry integration with CI/CD for auto deployment" },
                { name: "مشروع: نظام كامل لإدارة دورة حياة النماذج", primary: "complete model lifecycle management system" }
              ]
            },
            {
              unit_index: 6, code: "3.1.6",
              name: "منصات ML: SageMaker وVertex وAzure ML",
              goal: "إتقان المنصات المُدارة للتعلم الآلي لتسريع دورة التطوير والنشر في الشركات",
              key_concepts: ["SageMaker Pipelines","Vertex Pipelines","Azure ML Studio","AutoML","Managed Training"],
              lessons: [
                { name: "متى تستخدم المنصة المُدارة مقابل DIY", primary: "managed vs DIY MLOps platform selection" },
                { name: "SageMaker Pipelines: Workflow الكامل", primary: "SageMaker Pipelines for complete ML workflow" },
                { name: "Vertex AI Pipelines: MLOps على Google Cloud", primary: "Vertex AI Pipelines for GCP-native MLOps" },
                { name: "Azure ML Studio: الواجهة المرئية والكود", primary: "Azure ML Studio visual and code interfaces" },
                { name: "AutoML: التدريب بدون خبرة عميقة", primary: "AutoML platforms for non-expert ML training" },
                { name: "Managed Endpoints: نشر موجّه بالسحابة", primary: "managed endpoints for serverless model serving" },
                { name: "تحسين التكاليف على المنصات السحابية", primary: "cloud ML platform cost optimization strategies" },
                { name: "الهجرة بين المنصات: تجنب الإغلاق", primary: "multi-cloud ML and avoiding vendor lock-in" },
                { name: "مشروع: Pipeline كامل على SageMaker وVertex", primary: "complete ML pipeline comparison SageMaker vs Vertex" }
              ]
            },
            {
              unit_index: 7, code: "3.1.7",
              name: "الاستدلال عالي الأداء",
              goal: "إتقان تحسين استدلال النماذج لتحقيق زمن خفيف منخفض وإنتاجية عالية في الإنتاج",
              key_concepts: ["Batching","TensorRT","Speculative Decoding","vLLM","Caching"],
              lessons: [
                { name: "تحديات الاستدلال: الزمن والذاكرة والتكلفة", primary: "inference challenges latency memory and cost" },
                { name: "Dynamic Batching: موازنة الزمن والإنتاجية", primary: "dynamic batching for inference optimization" },
                { name: "TensorRT: تحسين NVIDIA للاستدلال", primary: "TensorRT for optimized NVIDIA GPU inference" },
                { name: "Speculative Decoding: LLMs أسرع", primary: "speculative decoding for faster LLM inference" },
                { name: "vLLM: خدمة LLMs بكفاءة قصوى", primary: "vLLM for high throughput LLM serving" },
                { name: "Continuous Batching: لا توقف بين الطلبات", primary: "continuous batching for maximum LLM throughput" },
                { name: "Semantic Caching: إعادة استخدام الإجابات المتشابهة", primary: "semantic caching for LLM response reuse" },
                { name: "Prefix Caching: الحفظ عبر المحادثات", primary: "KV cache prefix sharing across requests" },
                { name: "مشروع: نظام استدلال عالي الإنتاجية لـLLM", primary: "high throughput LLM inference system project" }
              ]
            },
            {
              unit_index: 8, code: "3.1.8",
              name: "أمان وأمانة النماذج الإنتاجية",
              goal: "إتقان ضمان أمان وأمانة نماذج الذكاء الاصطناعي في بيئات الإنتاج من المخاطر والهجمات",
              key_concepts: ["Model Security","Adversarial Attacks","Input Validation","Rate Limiting","Audit Logs"],
              lessons: [
                { name: "مخاطر نماذج الذكاء الاصطناعي في الإنتاج", primary: "production AI model security risks and threats" },
                { name: "الهجمات التخريبية: الإدخالات المُصمَّمة للخداع", primary: "adversarial attacks on production AI models" },
                { name: "Prompt Injection: الهجمات على LLMs", primary: "prompt injection attacks on LLM applications" },
                { name: "التحقق من الإدخال: Sanitization وValidation", primary: "input validation and sanitization for AI APIs" },
                { name: "تحديد المعدل وحماية API: Rate Limiting", primary: "rate limiting and API protection for AI services" },
                { name: "سجلات المراجعة: التتبع الكامل للاستخدام", primary: "audit logs for complete AI usage tracking" },
                { name: "اختبار النموذج الأمني: Red Teaming", primary: "security testing and red teaming for AI systems" },
                { name: "حماية نماذج الملكية الفكرية", primary: "intellectual property protection for AI models" },
                { name: "مشروع: تدقيق أمني كامل لنظام ذكاء اصطناعي", primary: "complete security audit for AI production system" }
              ]
            },
            {
              unit_index: 9, code: "3.1.9",
              name: "مشروع MLOps الشامل",
              goal: "بناء منظومة MLOps متكاملة تغطي دورة الحياة الكاملة من البيانات إلى النشر والمراقبة",
              key_concepts: ["End-to-End MLOps","Full Lifecycle","Team Collaboration","Production Standards","Documentation"],
              lessons: [
                { name: "تصميم منظومة MLOps للمشروع الحقيقي", primary: "MLOps architecture design for real project" },
                { name: "أنبوب CI/CD للتدريب والاختبار والنشر", primary: "CI/CD pipeline for training testing and deployment" },
                { name: "Feature Store وإدارة البيانات المتكاملة", primary: "integrated feature store and data management" },
                { name: "سجل النماذج مع إدارة الإصدارات الكاملة", primary: "model registry with full version management" },
                { name: "لوحة مراقبة شاملة: الأداء والانجراف والتنبيهات", primary: "comprehensive monitoring dashboard performance drift alerts" },
                { name: "الأمان والامتثال في المنظومة", primary: "security and compliance in MLOps system" },
                { name: "التوثيق الكامل وإعداد الفريق", primary: "complete documentation and team onboarding" },
                { name: "محاكاة الإنتاج: الاختبار تحت الضغط", primary: "production simulation stress testing" },
                { name: "عرض المنظومة الكاملة وتحليلها", primary: "complete MLOps system presentation and analysis" }
              ]
            }
          ]
        },
        {
          stage_index: 2,
          name: "تصميم أنظمة الذكاء الاصطناعي",
          goal: "إتقان تصميم أنظمة الذكاء الاصطناعي الموزعة والقابلة للتوسع والموثوقة على مستوى المؤسسات",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "3.2.1",
              name: "تصميم الأنظمة للذكاء الاصطناعي",
              goal: "إتقان مبادئ تصميم الأنظمة الخاصة بالذكاء الاصطناعي: التوسعة والمرونة والموثوقية",
              key_concepts: ["Scalability","Reliability","Microservices","Event-driven","CAP Theorem"],
              lessons: [
                { name: "متطلبات أنظمة الذكاء الاصطناعي: الفارق عن البرامج التقليدية", primary: "AI system design requirements vs traditional software" },
                { name: "التوسعة الأفقية والرأسية لأنظمة الذكاء الاصطناعي", primary: "horizontal and vertical scaling for AI systems" },
                { name: "معمارية الخدمات المصغرة للذكاء الاصطناعي", primary: "microservices architecture for AI systems" },
                { name: "الأنظمة المدفوعة بالأحداث: الذكاء الاصطناعي الآني", primary: "event-driven AI systems for real-time processing" },
                { name: "نظرية CAP في أنظمة الذكاء الاصطناعي", primary: "CAP theorem for distributed AI systems" },
                { name: "نقاط الإخفاق الواحدة: تصميم للفشل", primary: "single points of failure design for AI resilience" },
                { name: "Load Balancing الذكي لنماذج الذكاء الاصطناعي", primary: "intelligent load balancing for AI model serving" },
                { name: "Circuit Breakers وRetry Patterns", primary: "circuit breakers and retry patterns for AI services" },
                { name: "مشروع: تصميم نظام توصية بمقياس Twitter", primary: "recommendation system design at Twitter scale" }
              ]
            },
            {
              unit_index: 2, code: "3.2.2",
              name: "الاستدلال الآني والمعالجة الدفقية",
              goal: "بناء أنظمة ذكاء اصطناعي قادرة على المعالجة الآنية وتحليل تدفق البيانات الحية",
              key_concepts: ["Kafka","Flink","Stream Processing","Real-time Inference","Lambda Architecture"],
              lessons: [
                { name: "معالجة التدفق: من الدُفعات للآنية", primary: "stream processing from batch to real-time" },
                { name: "Apache Kafka: قلب أنظمة التدفق الكبيرة", primary: "Apache Kafka for real-time data streaming" },
                { name: "Apache Flink: معالجة التدفق الحالة", primary: "Apache Flink stateful stream processing for AI" },
                { name: "Lambda Architecture: الدُفعة والآنية معاً", primary: "Lambda architecture batch and speed layers" },
                { name: "Kappa Architecture: مبسّطة لـStream Only", primary: "Kappa architecture stream-only simplification" },
                { name: "الاستدلال الآني على Kafka Streams", primary: "real-time inference on Kafka Streams pipeline" },
                { name: "Feature Store للبيانات الآنية", primary: "online feature store for real-time features" },
                { name: "مراقبة التدفق الحي: الزمن والإنتاجية", primary: "live stream monitoring latency and throughput" },
                { name: "مشروع: نظام كشف احتيال آني بـKafka وFlink", primary: "real-time fraud detection system Kafka and Flink" }
              ]
            },
            {
              unit_index: 3, code: "3.2.3",
              name: "ذكاء اصطناعي لا مركزي ومحافظ على الخصوصية",
              goal: "فهم وتطبيق تقنيات الذكاء الاصطناعي اللامركزية التي تحمي خصوصية البيانات",
              key_concepts: ["Federated Learning","Differential Privacy","Homomorphic Encryption","Secure Aggregation","Privacy Budget"],
              lessons: [
                { name: "التعلم الاتحادي: تدريب بدون مشاركة البيانات", primary: "federated learning training without data sharing" },
                { name: "FedAvg: خوارزمية التجميع الاتحادي", primary: "FedAvg federated averaging algorithm" },
                { name: "الخصوصية التفاضلية: ضمانات رياضية", primary: "differential privacy mathematical guarantees" },
                { name: "ميزانية الخصوصية: Epsilon وDelta", primary: "privacy budget epsilon delta in differential privacy" },
                { name: "التشفير المتماثل: الحساب على البيانات المشفرة", primary: "homomorphic encryption for computation on encrypted data" },
                { name: "الإضافة الآمنة: Secure Aggregation بدون Trust", primary: "secure aggregation for privacy-preserving FL" },
                { name: "PySyft وFlower: أُطر التعلم الاتحادي", primary: "PySyft Flower federated learning frameworks" },
                { name: "حالات الاستخدام: الطب والتمويل والبيانات الحساسة", primary: "FL use cases healthcare finance sensitive data" },
                { name: "مشروع: تعلم اتحادي لكشف الأمراض", primary: "federated learning for disease detection project" }
              ]
            },
            {
              unit_index: 4, code: "3.2.4",
              name: "تصميم API للذكاء الاصطناعي",
              goal: "إتقان تصميم API الاحترافية لنماذج الذكاء الاصطناعي مع مراعاة الأداء والأمان وتجربة المطور",
              key_concepts: ["REST API","GraphQL","gRPC","API Versioning","Rate Limiting"],
              lessons: [
                { name: "مبادئ تصميم API لنماذج الذكاء الاصطناعي", primary: "AI model API design principles and best practices" },
                { name: "REST API المتقدمة: مواصفات OpenAPI", primary: "advanced REST API with OpenAPI specification" },
                { name: "gRPC: الاتصال عالي الأداء للخدمات الداخلية", primary: "gRPC for high performance internal AI services" },
                { name: "GraphQL للذكاء الاصطناعي: المرونة للعملاء", primary: "GraphQL for flexible AI data querying" },
                { name: "API Versioning: التطور بدون كسر العملاء", primary: "API versioning strategies for AI services" },
                { name: "SSE وWebSockets: الاستجابة الدفقية", primary: "SSE and WebSockets for streaming AI responses" },
                { name: "إدارة الأخطاء والتعافي: Graceful Degradation", primary: "error handling and graceful degradation for AI APIs" },
                { name: "بوابة API: Kong وApigee للذكاء الاصطناعي", primary: "API gateway Kong Apigee for AI services" },
                { name: "مشروع: API احترافية كاملة لنموذج ذكاء اصطناعي", primary: "complete professional AI model API design project" }
              ]
            },
            {
              unit_index: 5, code: "3.2.5",
              name: "التخزين المؤقت واستراتيجيات الأداء",
              goal: "إتقان استراتيجيات التخزين المؤقت المتخصصة لتسريع أنظمة الذكاء الاصطناعي",
              key_concepts: ["Redis","Semantic Caching","Vector Caching","CDN","Distributed Cache"],
              lessons: [
                { name: "الحاجة للتخزين المؤقت في الذكاء الاصطناعي", primary: "caching necessity for AI system performance" },
                { name: "Redis لتخزين النتائج والجلسات", primary: "Redis for results caching and session management" },
                { name: "Semantic Caching: مطابقة المعنى لا النص", primary: "semantic caching for similar query results reuse" },
                { name: "تخزين متجهات التمثيل: Vector Embedding Cache", primary: "embedding vector caching for repeated inputs" },
                { name: "CDN لنتائج الذكاء الاصطناعي الثابتة", primary: "CDN for static AI inference result distribution" },
                { name: "التخزين المؤقت الموزع: Redis Cluster", primary: "distributed caching with Redis Cluster" },
                { name: "استراتيجية الإبطال: متى تنتهي الصلاحية", primary: "cache invalidation strategies for AI responses" },
                { name: "قياس فعالية التخزين: Hit Rate والـROI", primary: "cache effectiveness measurement hit rate and ROI" },
                { name: "مشروع: طبقة تخزين مؤقت لنظام LLM", primary: "caching layer for LLM system project" }
              ]
            },
            {
              unit_index: 6, code: "3.2.6",
              name: "الذكاء الاصطناعي المتعدد المناطق والحوسبة الطرفية",
              goal: "تصميم أنظمة ذكاء اصطناعي موزعة جغرافياً وعلى الحافة لضمان التوفر والأداء العالمي",
              key_concepts: ["Multi-region","Global Load Balancing","Edge Computing","Geo-distribution","Data Sovereignty"],
              lessons: [
                { name: "التوزيع الجغرافي: لماذا المناطق المتعددة", primary: "geographic distribution and multi-region AI" },
                { name: "موازنة الحمل العالمية: Latency-based Routing", primary: "global load balancing latency-based routing" },
                { name: "تناسق البيانات عبر المناطق الجغرافية", primary: "data consistency across geographic regions" },
                { name: "سيادة البيانات: القوانين والقيود الجغرافية", primary: "data sovereignty regulations geographic restrictions" },
                { name: "الحوسبة الطرفية للذكاء الاصطناعي: CloudFront Functions", primary: "edge computing AI with CloudFront and Cloudflare Workers" },
                { name: "نماذج صغيرة على الحافة مع كبيرة في السحابة", primary: "hybrid edge cloud AI model deployment" },
                { name: "Disaster Recovery لأنظمة الذكاء الاصطناعي", primary: "disaster recovery planning for AI production systems" },
                { name: "اختبار الفشل: Chaos Engineering للذكاء الاصطناعي", primary: "chaos engineering for AI system resilience" },
                { name: "مشروع: نظام ذكاء اصطناعي متعدد المناطق", primary: "multi-region AI system design and implementation" }
              ]
            },
            {
              unit_index: 7, code: "3.2.7",
              name: "إدارة التبعيات والتنسيق في أنظمة الذكاء الاصطناعي",
              goal: "إتقان تنسيق خدمات الذكاء الاصطناعي المتعددة وإدارة تبعياتها في الأنظمة المعقدة",
              key_concepts: ["Service Mesh","Istio","Dependency Management","Orchestration","Workflow Engines"],
              lessons: [
                { name: "شبكة الخدمات: Service Mesh للذكاء الاصطناعي", primary: "service mesh for AI microservices communication" },
                { name: "Istio: السياسات والمراقبة والأمان", primary: "Istio policies monitoring and security for AI services" },
                { name: "إدارة التبعيات: تحديد وعزل واختبار", primary: "dependency management identification isolation testing" },
                { name: "محركات Workflow: Temporal وArgo Workflows", primary: "workflow engines Temporal Argo for AI orchestration" },
                { name: "المعاملات التعويضية: Saga Pattern", primary: "saga pattern for compensating transactions in AI" },
                { name: "الخدمات القابلة للاسترجاع: Idempotency", primary: "idempotent services for reliable AI workflows" },
                { name: "Contract Testing: ضمان توافق الخدمات", primary: "contract testing for AI service compatibility" },
                { name: "Service Discovery وConfiguration Management", primary: "service discovery and configuration for AI systems" },
                { name: "مشروع: تنسيق منظومة ذكاء اصطناعي معقدة", primary: "orchestrating complex AI system project" }
              ]
            },
            {
              unit_index: 8, code: "3.2.8",
              name: "اقتصاديات أنظمة الذكاء الاصطناعي",
              goal: "إتقان تحليل وتحسين التكاليف والعوائد لأنظمة الذكاء الاصطناعي الإنتاجية",
              key_concepts: ["TCO","Cost Modeling","GPU Economics","Pricing Strategy","FinOps for AI"],
              lessons: [
                { name: "التكلفة الإجمالية للملكية: نماذج الذكاء الاصطناعي", primary: "total cost of ownership for AI systems" },
                { name: "نمذجة التكاليف: التدريب والاستدلال والبيانات", primary: "AI cost modeling training inference and data" },
                { name: "اقتصاديات GPU: الشراء مقابل الاستئجار", primary: "GPU economics buy vs rent cloud vs on-premise" },
                { name: "Spot Instances وSaving Plans: توفير كبير", primary: "spot instances and saving plans for AI cost reduction" },
                { name: "تسعير خدمات الذكاء الاصطناعي: الاستراتيجيات", primary: "AI service pricing strategies token-based per-call" },
                { name: "FinOps للذكاء الاصطناعي: مرونة التكلفة", primary: "FinOps for AI financial operations optimization" },
                { name: "ROI لمشاريع الذكاء الاصطناعي: القياس والتحسين", primary: "AI project ROI measurement and optimization" },
                { name: "Carbon Footprint: استدامة الذكاء الاصطناعي", primary: "AI carbon footprint and sustainability considerations" },
                { name: "مشروع: تحليل تكاليف نظام ذكاء اصطناعي كامل", primary: "complete AI system cost analysis project" }
              ]
            },
            {
              unit_index: 9, code: "3.2.9",
              name: "مشروع تصميم النظام الشامل",
              goal: "تطبيق مبادئ تصميم الأنظمة في بناء نظام ذكاء اصطناعي متكامل بمواصفات الشركات الكبرى",
              key_concepts: ["System Design Document","Architecture Diagrams","Trade-off Analysis","Capacity Planning","Presentation"],
              lessons: [
                { name: "اختيار نظام ذكاء اصطناعي معقد لتصميمه", primary: "selecting complex AI system for full design" },
                { name: "متطلبات النظام: الوظيفية وغير الوظيفية", primary: "system requirements functional and non-functional" },
                { name: "تصميم المعمارية: الخدمات والمكونات", primary: "architecture design services and components" },
                { name: "تحليل المقايضات: الفوائد والتكاليف", primary: "trade-off analysis for architectural decisions" },
                { name: "تخطيط السعة: حجم البيانات والطلبات", primary: "capacity planning for data volume and request scale" },
                { name: "مخططات المعمارية: UML والرسم بـExcalidraw", primary: "architecture diagrams UML and Excalidraw" },
                { name: "وثيقة تصميم النظام الكاملة", primary: "complete system design document writing" },
                { name: "مراجعة تصميم النظام: التقييم من المهندسين", primary: "system design review by peer engineers" },
                { name: "عرض التصميم كمقابلة هندسة نظم", primary: "system design presentation as engineering interview" }
              ]
            }
          ]
        },
        {
          stage_index: 3,
          name: "سلامة الذكاء الاصطناعي والمحاذاة",
          goal: "إتقان مبادئ وتقنيات سلامة الذكاء الاصطناعي ومحاذاته مع القيم الإنسانية والمعايير الأخلاقية",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "3.3.1",
              name: "أساسيات سلامة الذكاء الاصطناعي",
              goal: "فهم إطار سلامة الذكاء الاصطناعي ومفاهيمه الأساسية وتحدياته ومناهج البحث",
              key_concepts: ["AI Safety","Alignment Problem","Goodhart's Law","Mesa-Optimization","Deceptive Alignment"],
              lessons: [
                { name: "لماذا سلامة الذكاء الاصطناعي مشكلة حقيقية الآن", primary: "AI safety problem reality and urgency" },
                { name: "مشكلة المحاذاة: الأهداف والقيم والسلوك", primary: "alignment problem objectives values and behavior" },
                { name: "قانون Goodhart: حين يصبح المقياس الهدف نفسه", primary: "Goodhart's law in AI objective misspecification" },
                { name: "Mesa-Optimization: الأهداف الداخلية للنماذج", primary: "mesa-optimization inner alignment problem" },
                { name: "المحاذاة الخادعة: النموذج يتظاهر فقط", primary: "deceptive alignment risk in AI systems" },
                { name: "Instrumental Convergence: الأهداف المشتركة الخطرة", primary: "instrumental convergence in advanced AI systems" },
                { name: "مدارس سلامة الذكاء الاصطناعي: OpenAI وDeepMind وAnthropic", primary: "AI safety research organizations and approaches" },
                { name: "قياس سلامة الذكاء الاصطناعي: المقاييس والتقييم", primary: "AI safety measurement and evaluation approaches" },
                { name: "مشروع: تقرير تحليل مخاطر نظام ذكاء اصطناعي", primary: "AI system risk analysis report project" }
              ]
            },
            {
              unit_index: 2, code: "3.3.2",
              name: "اختبار الحدود والكشف عن المخاطر",
              goal: "إتقان منهجيات Red Teaming والاختبار المنهجي لاكتشاف مخاطر نماذج الذكاء الاصطناعي",
              key_concepts: ["Red Teaming","Jailbreaking","Adversarial Probing","Safety Benchmarks","Evaluation Harness"],
              lessons: [
                { name: "Red Teaming للذكاء الاصطناعي: المنهجية الكاملة", primary: "red teaming methodology for AI systems" },
                { name: "Jailbreaking: تجاوز القيود اليدوي", primary: "manual jailbreaking techniques and patterns" },
                { name: "الاختبار التلقائي: فرق Red Team الآلية", primary: "automated red teaming with AI adversaries" },
                { name: "HellaSwag وTruthfulQA وToxiGen: معايير السلامة", primary: "safety benchmarks HellaSwag TruthfulQA ToxiGen" },
                { name: "HELM Safety Evaluation: التقييم الشامل", primary: "HELM comprehensive safety evaluation framework" },
                { name: "حقن الإرشاد: Prompt Injection Attacks", primary: "prompt injection attacks and defenses" },
                { name: "اختبار الهوية المخادعة والتلاعب", primary: "identity deception and manipulation testing" },
                { name: "تقرير نتائج Red Team: التوثيق المعياري", primary: "red team findings report standardized documentation" },
                { name: "مشروع: Red Team منهجي لنموذج LLM", primary: "systematic red team exercise for LLM project" }
              ]
            },
            {
              unit_index: 3, code: "3.3.3",
              name: "التحيز والإنصاف والمساواة في الذكاء الاصطناعي",
              goal: "تشخيص وعلاج التحيز والإنصاف في نماذج الذكاء الاصطناعي بمنهجية علمية وأخلاقية",
              key_concepts: ["Fairness Definitions","Bias Auditing","Representation","Intersectionality","Mitigation"],
              lessons: [
                { name: "تعريفات الإنصاف: لماذا تتعارض أحياناً", primary: "fairness definitions and incompatibility theorem" },
                { name: "تشخيص التحيز: من مصدر البيانات للنموذج", primary: "bias diagnosis from data source to model output" },
                { name: "Representation Bias: التحيز في البيانات التدريبية", primary: "representation bias in training data" },
                { name: "Allocation Harm: ضرر التوزيع الجائر", primary: "allocation harm and distribution of AI benefits" },
                { name: "Intersectionality: التحيز المتقاطع المعقد", primary: "intersectional bias in AI across demographics" },
                { name: "معالجة التحيز: في البيانات والنموذج والمخرجات", primary: "bias mitigation pre-processing in-processing post-processing" },
                { name: "تدقيق الإنصاف: العملية والأدوات والتقرير", primary: "fairness audit process tools and report" },
                { name: "الإنصاف في LLMs: التحديات الإضافية", primary: "fairness in large language models unique challenges" },
                { name: "مشروع: تدقيق إنصاف شامل لنظام توظيف AI", primary: "comprehensive fairness audit for AI hiring system" }
              ]
            },
            {
              unit_index: 4, code: "3.3.4",
              name: "متانة النماذج ومقاومة الهجمات",
              goal: "إتقان تعزيز متانة نماذج الذكاء الاصطناعي ومقاومتها للهجمات التخريبية والتوزيعات الجديدة",
              key_concepts: ["Adversarial Training","Certified Robustness","OOD Detection","Distribution Shift","Defensive Distillation"],
              lessons: [
                { name: "هجمات التخريب: FGSM وPGD وC&W", primary: "adversarial attacks FGSM PGD Carlini Wagner" },
                { name: "التدريب على الأمثلة التخريبية: Adversarial Training", primary: "adversarial training for robust models" },
                { name: "المتانة المُثبَتة: الضمانات الرياضية", primary: "certified robustness mathematical guarantees" },
                { name: "كشف التوزيع الخارج: OOD Detection", primary: "out-of-distribution detection for robust deployment" },
                { name: "انزياح التوزيع: الأنواع والتعامل", primary: "distribution shift types and handling strategies" },
                { name: "Data Poisoning: هجمات تلويث التدريب", primary: "data poisoning attacks on training data" },
                { name: "Backdoor Attacks: الأبواب الخلفية في النماذج", primary: "backdoor attacks in neural networks defense" },
                { name: "Randomized Smoothing: الدفاع الاحتمالي", primary: "randomized smoothing for certified robustness" },
                { name: "مشروع: تقييم وتعزيز متانة نموذج", primary: "model robustness evaluation and enhancement project" }
              ]
            },
            {
              unit_index: 5, code: "3.3.5",
              name: "طرق التفسير المتقدمة",
              goal: "إتقان تقنيات التفسير المتقدمة لجعل النماذج المعقدة شفافة ومفهومة",
              key_concepts: ["Mechanistic Interpretability","Attention Analysis","Probing","Concept Activation","Circuit Analysis"],
              lessons: [
                { name: "التفسيرية الميكانيكية: فهم النموذج من الداخل", primary: "mechanistic interpretability inner model understanding" },
                { name: "تحليل الانتباه: ما يركز عليه النموذج", primary: "attention analysis what the model focuses on" },
                { name: "Probing Classifiers: ما يعرفه كل طبقة", primary: "probing classifiers for layer knowledge analysis" },
                { name: "Concept Activation Vectors: التصوير المفاهيمي", primary: "TCAV concept activation vectors for interpretation" },
                { name: "Circuit Analysis: الدوائر العصبية الوظيفية", primary: "circuit analysis functional circuits in transformers" },
                { name: "Logit Lens: رؤية خلال طبقات الـTransformer", primary: "logit lens for layer-by-layer transformer inspection" },
                { name: "Sparse Autoencoders: عزل الميزات العصبية", primary: "sparse autoencoders for neural feature extraction" },
                { name: "Superposition: تداخل المفاهيم في الشبكات", primary: "superposition hypothesis in neural networks" },
                { name: "مشروع: تحليل تفسيري كامل لـGPT-2", primary: "complete interpretability analysis of GPT-2" }
              ]
            },
            {
              unit_index: 6, code: "3.3.6",
              name: "الذكاء الاصطناعي الحافظ للخصوصية",
              goal: "إتقان تقنيات الذكاء الاصطناعي التي تحمي خصوصية البيانات الفردية مع تحقيق أداء جيد",
              key_concepts: ["Differential Privacy","DP-SGD","Privacy Auditing","Data Minimization","GDPR Compliance"],
              lessons: [
                { name: "أسس الخصوصية في الذكاء الاصطناعي", primary: "privacy foundations in AI data and models" },
                { name: "DP-SGD: الانحدار التدريجي الخصوصي", primary: "DP-SGD differentially private stochastic gradient descent" },
                { name: "تدقيق الخصوصية: قياس التسرب الفعلي", primary: "privacy auditing measuring actual information leakage" },
                { name: "Membership Inference Attacks: كشف البيانات", primary: "membership inference attacks on trained models" },
                { name: "Model Inversion: استخلاص البيانات من النموذج", primary: "model inversion attacks and defenses" },
                { name: "تقليل البيانات: جمع الأقل ضرورياً", primary: "data minimization principles for privacy" },
                { name: "GDPR وAI: الامتثال التقني", primary: "GDPR compliance for AI systems technical requirements" },
                { name: "التشفير المتماثل في الذكاء الاصطناعي: الحالة الحالية", primary: "homomorphic encryption current state in AI" },
                { name: "مشروع: نموذج تعلم آلي خصوصي بـDP-SGD", primary: "differentially private ML model with DP-SGD project" }
              ]
            },
            {
              unit_index: 7, code: "3.3.7",
              name: "حوكمة الذكاء الاصطناعي والتشريعات",
              goal: "فهم الإطار التنظيمي والحوكمة للذكاء الاصطناعي وكيفية ضمان الامتثال لمتطلباتها",
              key_concepts: ["EU AI Act","NIST AI RMF","AI Governance","Responsible AI","Compliance"],
              lessons: [
                { name: "قانون الذكاء الاصطناعي الأوروبي: التصنيفات والمتطلبات", primary: "EU AI Act risk categories and compliance requirements" },
                { name: "NIST AI Risk Management Framework", primary: "NIST AI RMF for organizational AI governance" },
                { name: "الذكاء الاصطناعي المسؤول: من الشعار للتطبيق", primary: "responsible AI frameworks from principles to practice" },
                { name: "تقييم تأثير الذكاء الاصطناعي: DPIA للـAI", primary: "data protection impact assessment DPIA for AI" },
                { name: "لجان الأخلاقيات: كيف تعمل في الشركات", primary: "AI ethics boards structure and decision making" },
                { name: "الامتثال التقني: Documentation وAudit Trails", primary: "technical compliance documentation and audit trails" },
                { name: "التشريعات الإقليمية: الخليج والعالم العربي", primary: "regional AI regulations Gulf and Arab world" },
                { name: "مستقبل تنظيم الذكاء الاصطناعي: التوجهات", primary: "future AI regulation trends and developments" },
                { name: "مشروع: خطة حوكمة ذكاء اصطناعي لشركة", primary: "AI governance plan for organization project" }
              ]
            },
            {
              unit_index: 8, code: "3.3.8",
              name: "بحوث المحاذاة وما وراء RLHF",
              goal: "فهم أحدث بحوث محاذاة الذكاء الاصطناعي ومناهج ما وراء RLHF للنماذج المستقبلية",
              key_concepts: ["Scalable Oversight","Debate","Amplification","Constitutional AI","Weak-to-Strong"],
              lessons: [
                { name: "الرقابة القابلة للتوسع: المشكلة والمناهج", primary: "scalable oversight problem and approaches" },
                { name: "Debate: التحقق عبر الجدل", primary: "AI debate for scalable oversight" },
                { name: "Amplification: تضخيم حكمة الإنسان", primary: "iterated amplification for alignment" },
                { name: "Constitutional AI: التوجيه بالمبادئ", primary: "Constitutional AI principle-guided alignment" },
                { name: "Weak-to-Strong Generalization: المعلم الأضعف", primary: "weak to strong generalization in AI alignment" },
                { name: "Activation Steering: التحكم الداخلي في LLMs", primary: "activation steering for AI behavior control" },
                { name: "Superalignment: تحقيق محاذاة الذكاء الفائق", primary: "superalignment for superintelligent AI" },
                { name: "مستقبل محاذاة الذكاء الاصطناعي: البحث والتحديات", primary: "future of AI alignment research and open problems" },
                { name: "مشروع: تحليل نقدي لمنهج محاذاة رائد", primary: "critical analysis of leading alignment approach" }
              ]
            },
            {
              unit_index: 9, code: "3.3.9",
              name: "مشروع السلامة والمحاذاة الشامل",
              goal: "توحيد مفاهيم السلامة والمحاذاة في إطار عمل متكامل لنظام ذكاء اصطناعي آمن ومسؤول",
              key_concepts: ["Safety Case","Red Team Report","Governance Plan","Ethics Review","Publication"],
              lessons: [
                { name: "بناء حجة السلامة: Safety Case للنظام", primary: "building safety case for AI system" },
                { name: "تقرير Red Team الشامل والموثق", primary: "comprehensive documented red team report" },
                { name: "تدقيق الإنصاف والخصوصية الكاملين", primary: "full fairness and privacy audit documentation" },
                { name: "خطة الحوكمة والامتثال التنظيمي", primary: "governance plan and regulatory compliance" },
                { name: "مراجعة الأخلاقيات: العملية والتوصيات", primary: "ethics review process and recommendations" },
                { name: "التوثيق الكامل: Model Card وSystem Card", primary: "complete documentation model card and system card" },
                { name: "التواصل مع أصحاب المصلحة: السلامة للجميع", primary: "safety communication to all stakeholders" },
                { name: "نشر نتائج السلامة: التقرير العلني", primary: "publishing safety findings public report" },
                { name: "العرض النهائي والمراجعة من الأقران", primary: "final presentation and peer review of safety work" }
              ]
            }
          ]
        },
        {
          stage_index: 4,
          name: "تطبيقات الذكاء الاصطناعي في المجالات",
          goal: "تطبيق الذكاء الاصطناعي في مجالات حيوية متعددة مع فهم متطلبات وتحديات كل مجال",
          bloom_focus: "apply",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "3.4.1",
              name: "الذكاء الاصطناعي في الرعاية الصحية",
              goal: "إتقان تطبيقات الذكاء الاصطناعي في الطب والصحة مع فهم القيود الأخلاقية والتنظيمية",
              key_concepts: ["Clinical AI","Drug Discovery","Genomics AI","Electronic Health Records","Clinical NLP"],
              lessons: [
                { name: "الذكاء الاصطناعي الطبي: الإمكانيات والمسؤوليات", primary: "medical AI capabilities and responsibilities" },
                { name: "التشخيص بالذكاء الاصطناعي: الصور وBiomarkers", primary: "AI diagnosis from medical images and biomarkers" },
                { name: "اكتشاف الأدوية: من الجزيء للعلاج بالذكاء الاصطناعي", primary: "AI drug discovery molecule to treatment pipeline" },
                { name: "الجينومات والذكاء الاصطناعي: التنبؤ والتصنيف", primary: "genomics AI prediction and classification" },
                { name: "السجلات الصحية الإلكترونية: NLP الطبي", primary: "EHR clinical NLP for medical records" },
                { name: "التنبؤ بالمخاطر الصحية: نماذج الإتاحة", primary: "health risk prediction and early warning models" },
                { name: "الصحة النفسية والذكاء الاصطناعي: الكشف المبكر", primary: "mental health AI for early detection and support" },
                { name: "FDA وCE للذكاء الاصطناعي الطبي: الامتثال", primary: "FDA CE compliance for medical AI systems" },
                { name: "مشروع: نموذج تنبؤ بمخاطر صحية بالبيانات الحقيقية", primary: "health risk prediction model with real clinical data" }
              ]
            },
            {
              unit_index: 2, code: "3.4.2",
              name: "الذكاء الاصطناعي في التمويل والاقتصاد",
              goal: "تطبيق الذكاء الاصطناعي في التمويل وإدارة المخاطر والتداول وكشف الاحتيال",
              key_concepts: ["Algorithmic Trading","Credit Scoring","Fraud Detection","Risk Modeling","RegTech"],
              lessons: [
                { name: "الذكاء الاصطناعي المالي: التطبيقات والفرص", primary: "financial AI applications and opportunities" },
                { name: "التداول الخوارزمي: الاستراتيجيات والأنظمة", primary: "algorithmic trading strategies and AI systems" },
                { name: "نمذجة الائتمان: أكثر دقة وأقل تحيزاً", primary: "AI credit scoring more accurate and less biased" },
                { name: "كشف الاحتيال: الأنماط والشذوذات", primary: "fraud detection patterns and anomaly detection" },
                { name: "إدارة المخاطر: نماذج VaR وStress Testing", primary: "risk management VaR stress testing with AI" },
                { name: "RegTech: الامتثال الآلي بالذكاء الاصطناعي", primary: "RegTech automated compliance with AI" },
                { name: "النصائح الرقمية: Robo-advisors", primary: "Robo-advisors AI financial advice automation" },
                { name: "اقتصاديات اليمن: الذكاء الاصطناعي للتنمية", primary: "AI for Yemeni economic development and recovery" },
                { name: "مشروع: نظام كشف احتيال بطاقات ائتمان", primary: "credit card fraud detection system project" }
              ]
            },
            {
              unit_index: 3, code: "3.4.3",
              name: "الذكاء الاصطناعي في التعليم",
              goal: "بناء تطبيقات ذكاء اصطناعي تعليمية فعّالة ومخصصة وعادلة للبيئات العربية",
              key_concepts: ["Personalized Learning","ITS","Automated Assessment","Learning Analytics","Arabic EdTech"],
              lessons: [
                { name: "الذكاء الاصطناعي التعليمي: الأساليب والتطبيقات", primary: "educational AI methods and applications" },
                { name: "التعلم المخصص: تكييف المسار لكل طالب", primary: "personalized learning path adaptation for each student" },
                { name: "أنظمة التعليم الذكية: ITS الكلاسيكية والحديثة", primary: "intelligent tutoring systems classic and modern" },
                { name: "التقييم الآلي: تصحيح الإجابات والمقالات", primary: "automated assessment grading essays and answers" },
                { name: "تحليل التعلم: الكشف المبكر عن التعثر", primary: "learning analytics for early intervention" },
                { name: "توليد المحتوى التعليمي بـLLMs", primary: "educational content generation with LLMs" },
                { name: "حواجز التعليم الرقمي في اليمن: المناهج", primary: "digital education barriers in Yemen and solutions" },
                { name: "الإنصاف في التعليم بالذكاء الاصطناعي", primary: "AI fairness in education across demographics" },
                { name: "مشروع: نظام تعليمي مخصص للعربية", primary: "personalized Arabic educational AI system project" }
              ]
            },
            {
              unit_index: 4, code: "3.4.4",
              name: "الذكاء الاصطناعي في الزراعة والأمن الغذائي",
              goal: "تطبيق الذكاء الاصطناعي في الزراعة والأمن الغذائي خاصة في البيئات كاليمن",
              key_concepts: ["Precision Agriculture","Crop Disease","Yield Prediction","Remote Sensing","Food Security"],
              lessons: [
                { name: "الزراعة الدقيقة: الذكاء الاصطناعي في الحقل", primary: "precision agriculture AI in the field" },
                { name: "كشف أمراض المحاصيل بالذكاء الاصطناعي", primary: "crop disease detection with AI and imaging" },
                { name: "التنبؤ بالمحاصيل: الطقس والتربة والأنماط", primary: "crop yield prediction weather soil and patterns" },
                { name: "الاستشعار عن بُعد: صور الأقمار الصناعية للزراعة", primary: "remote sensing satellite images for agriculture AI" },
                { name: "إدارة الري الذكية: توفير المياه", primary: "smart irrigation management water conservation AI" },
                { name: "Drone AI: المسح والرش الآلي", primary: "drone AI for agricultural survey and spraying" },
                { name: "الأمن الغذائي والتنبؤ بالشُح: اليمن والمنطقة", primary: "food security and shortage prediction Yemen region" },
                { name: "الأسواق الزراعية: تحسين الأسعار والتوزيع", primary: "agricultural market AI price optimization and distribution" },
                { name: "مشروع: كشف أمراض المحاصيل بالصور الهاتفية", primary: "crop disease detection from smartphone images project" }
              ]
            },
            {
              unit_index: 5, code: "3.4.5",
              name: "الذكاء الاصطناعي في الطاقة والبيئة",
              goal: "تطبيق الذكاء الاصطناعي في تحسين إنتاج الطاقة والتنبؤ بالطلب وحل التحديات البيئية",
              key_concepts: ["Smart Grid","Renewable Energy","Climate Models","Carbon Tracking","Energy Efficiency"],
              lessons: [
                { name: "الشبكة الذكية: الذكاء الاصطناعي في الطاقة", primary: "smart grid AI for energy management" },
                { name: "التنبؤ بالطلب على الكهرباء: نماذج التسلسل الزمني", primary: "electricity demand forecasting with time series AI" },
                { name: "الطاقة المتجددة: تحسين الشمس والرياح", primary: "renewable energy optimization solar and wind AI" },
                { name: "الذكاء الاصطناعي ضد تغير المناخ", primary: "AI for climate change prediction and mitigation" },
                { name: "تتبع البصمة الكربونية بالذكاء الاصطناعي", primary: "carbon footprint tracking with AI tools" },
                { name: "الكفاءة الطاقية: المباني والصناعة والنقل", primary: "energy efficiency AI for buildings industry transport" },
                { name: "الطاقة في اليمن: الأزمة والحل الذكي", primary: "Yemen energy crisis and AI smart solutions" },
                { name: "نمذجة المناخ: الأنظمة الفيزيائية بالذكاء الاصطناعي", primary: "climate modeling physics-informed AI neural networks" },
                { name: "مشروع: نظام تحسين طاقة شمسية صغير بالذكاء الاصطناعي", primary: "small solar energy optimization system with AI" }
              ]
            },
            {
              unit_index: 6, code: "3.4.6",
              name: "الذكاء الاصطناعي والمدن الذكية والبنية التحتية",
              goal: "تطبيق الذكاء الاصطناعي في إدارة المدن والبنية التحتية وتحسين جودة الحياة الحضرية",
              key_concepts: ["Smart City","Traffic Optimization","Public Safety","Urban Planning","IoT AI"],
              lessons: [
                { name: "المدينة الذكية: مكوناتها وأنظمة الذكاء الاصطناعي", primary: "smart city components and AI systems integration" },
                { name: "تحسين حركة المرور: أنظمة ديناميكية", primary: "traffic flow optimization with dynamic AI systems" },
                { name: "السلامة العامة: الذكاء الاصطناعي في المراقبة", primary: "public safety AI surveillance with privacy balance" },
                { name: "التخطيط العمراني: الذكاء الاصطناعي للمدن المستقبلية", primary: "urban planning AI for future city design" },
                { name: "IoT والذكاء الاصطناعي: الأجهزة والتحليل", primary: "IoT and AI for city sensor data analysis" },
                { name: "إدارة النفايات الذكية: التحسين والتنبؤ", primary: "smart waste management optimization and prediction" },
                { name: "الماء الذكي: شبكات توزيع الماء بالذكاء الاصطناعي", primary: "smart water networks AI for distribution optimization" },
                { name: "صنعاء الذكية: رؤية ممكنة للمستقبل", primary: "smart Sanaa vision for Yemen future cities" },
                { name: "مشروع: نظام ذكاء اصطناعي لإدارة مدينة", primary: "AI system for city management project" }
              ]
            },
            {
              unit_index: 7, code: "3.4.7",
              name: "الذكاء الاصطناعي في الصناعة والتصنيع",
              goal: "تطبيق الذكاء الاصطناعي في التصنيع والصيانة التنبؤية وضبط الجودة",
              key_concepts: ["Predictive Maintenance","Quality Control","Computer Vision in Manufacturing","Digital Twin","IIoT"],
              lessons: [
                { name: "الذكاء الاصطناعي في التصنيع: التطبيقات والإمكانيات", primary: "AI in manufacturing applications and opportunities" },
                { name: "الصيانة التنبؤية: من التفاعلية للاستباقية", primary: "predictive maintenance from reactive to proactive" },
                { name: "ضبط الجودة: رؤية الحاسوب في خطوط الإنتاج", primary: "quality control computer vision on production lines" },
                { name: "التوأم الرقمي: محاكاة المصنع كاملاً", primary: "digital twin factory simulation and optimization" },
                { name: "الروبوتيكا الصناعية: التخطيط والتعاون", primary: "industrial robotics path planning and human collaboration" },
                { name: "IIoT: إنترنت الأشياء الصناعية وبيانات المستشعرات", primary: "industrial IoT sensor data and AI integration" },
                { name: "تحسين سلسلة التوريد: الذكاء الاصطناعي والشفافية", primary: "supply chain optimization with AI transparency" },
                { name: "الصناعة 4.0 وما بعدها: توجهات المستقبل", primary: "Industry 4.0 and beyond AI manufacturing trends" },
                { name: "مشروع: نظام كشف عيوب التصنيع بالصور", primary: "manufacturing defect detection with computer vision project" }
              ]
            },
            {
              unit_index: 8, code: "3.4.8",
              name: "الذكاء الاصطناعي في الإبداع والترفيه",
              goal: "استكشاف تطبيقات الذكاء الاصطناعي في المجالات الإبداعية والترفيه والفنون",
              key_concepts: ["Creative AI","Game AI","Content Generation","Media Production","AI Art"],
              lessons: [
                { name: "الإبداع الآلي: هل يمكن للذكاء الاصطناعي أن يبتكر", primary: "machine creativity debate and AI creative output" },
                { name: "ذكاء اصطناعي الألعاب: من Atari لـOpenAI Five", primary: "game AI from Atari to OpenAI Five and beyond" },
                { name: "NPC الذكي: شخصيات الألعاب بالذكاء الاصطناعي", primary: "intelligent NPCs with language models and RL" },
                { name: "توليد المحتوى: نصوص وصور ومقاطع موسيقية", primary: "content generation text images and music for media" },
                { name: "إنتاج الأفلام: الذكاء الاصطناعي خلف الكاميرا", primary: "AI in film production visual effects and editing" },
                { name: "الفن الرقمي: إنسان وآلة يخلقان معاً", primary: "digital art human AI collaboration and co-creation" },
                { name: "الترفيه التفاعلي: قصص تتكيف مع المشاهد", primary: "interactive entertainment adaptive narratives with AI" },
                { name: "حقوق الملكية الفكرية للمحتوى المولَّد بالذكاء الاصطناعي", primary: "IP rights for AI generated creative content" },
                { name: "مشروع: لعبة صغيرة بذكاء اصطناعي وإبداع آلي", primary: "small game with AI characters and procedural content" }
              ]
            },
            {
              unit_index: 9, code: "3.4.9",
              name: "مشروع التطبيق المجالي الشامل",
              goal: "بناء نظام ذكاء اصطناعي متكامل في مجال يعالج مشكلة يمنية أو إقليمية حقيقية",
              key_concepts: ["Domain Expertise","Impact Assessment","Local Context","Stakeholders","Deployment"],
              lessons: [
                { name: "اختيار مشكلة محلية يمنية أو إقليمية", primary: "selecting local Yemeni or regional AI problem" },
                { name: "استطلاع أصحاب المصلحة: فهم السياق العميق", primary: "stakeholder survey for deep contextual understanding" },
                { name: "جمع بيانات محلية: التحديات والحلول", primary: "local data collection challenges and solutions" },
                { name: "تصميم الحل بمراعاة السياق المحلي", primary: "solution design with local context consideration" },
                { name: "بناء النموذج والتقييم الشامل", primary: "model building and comprehensive evaluation" },
                { name: "اختبار مع مستخدمين فعليين محليين", primary: "testing with actual local users feedback" },
                { name: "نشر مدروس لبيئة محدودة الموارد", primary: "thoughtful deployment for resource-constrained environment" },
                { name: "قياس التأثير الحقيقي والإيجابي", primary: "measuring real positive impact of AI solution" },
                { name: "التقرير النهائي ومشاركة المجتمع", primary: "final report and community sharing of AI project" }
              ]
            }
          ]
        },
        {
          stage_index: 5,
          name: "أبحاث الذكاء الاصطناعي والنشر",
          goal: "إتقان منهجية البحث في الذكاء الاصطناعي من قراءة الأوراق إلى تنفيذها ونشرها وتقديمها",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "3.5.1",
              name: "منهجية البحث في الذكاء الاصطناعي",
              goal: "إتقان المنهجية العلمية في البحث الذكاء الاصطناعي: من الفرضية للمقال المنشور",
              key_concepts: ["Research Methodology","Hypothesis","Experimental Design","Statistical Significance","Peer Review"],
              lessons: [
                { name: "منهجية البحث: الفكرة، الفرضية، التصميم", primary: "research methodology idea hypothesis experimental design" },
                { name: "قراءة الأوراق البحثية: المنهج الفعّال", primary: "effective AI research paper reading methodology" },
                { name: "arXiv وSemanticScholar: البحث عن الأوراق", primary: "arXiv SemanticScholar for finding AI papers" },
                { name: "تصميم التجربة: الضوابط والمتغيرات", primary: "experiment design controls and variables in AI" },
                { name: "الدلالة الإحصائية في نتائج الذكاء الاصطناعي", primary: "statistical significance in AI experimental results" },
                { name: "دراسات الإلغاء: إثبات المساهمة", primary: "ablation studies proving contribution in AI research" },
                { name: "Benchmarking: المقاييس والقواعد البيانية المرجعية", primary: "benchmarking standard datasets and evaluation" },
                { name: "مراجعة الأدبيات: المسح والتصنيف والتلخيص", primary: "literature review survey categorization and summary" },
                { name: "مشروع: مسح أدبي لمجال بحثي ضيق", primary: "literature survey for narrow AI research area" }
              ]
            },
            {
              unit_index: 2, code: "3.5.2",
              name: "تنفيذ الأوراق البحثية",
              goal: "إتقان تنفيذ الأوراق البحثية في الذكاء الاصطناعي بدقة وقابلية للإعادة",
              key_concepts: ["Paper Implementation","Reproducibility","Code Release","Baseline Comparison","Debugging Research Code"],
              lessons: [
                { name: "الفرق بين الورقة والكود: المسافة الخفية", primary: "gap between paper and code implementation" },
                { name: "استراتيجية التنفيذ: من الأبسط للأكمل", primary: "implementation strategy simple to complete" },
                { name: "فهم المعادلات الرياضية وترجمتها لكود", primary: "translating mathematical equations to code" },
                { name: "Papers with Code: قاعدة الكود المفتوح", primary: "Papers with Code open source implementations" },
                { name: "تشخيص انتكاسات التنفيذ: هل الورقة أم الكود؟", primary: "debugging implementation regressions paper vs code" },
                { name: "مقارنة مع Baseline: إعادة الإنتاج الدقيقة", primary: "baseline comparison for accurate reproduction" },
                { name: "إصدار الكود: الهيكل والوثائق والترخيص", primary: "code release structure documentation and licensing" },
                { name: "إسهام في تنفيذات الأوراق على GitHub", primary: "contributing paper implementations to GitHub" },
                { name: "مشروع: تنفيذ ورقة بحثية حديثة كاملاً", primary: "complete implementation of recent AI research paper" }
              ]
            },
            {
              unit_index: 3, code: "3.5.3",
              name: "تصميم تجارب الذكاء الاصطناعي",
              goal: "إتقان تصميم وتشغيل تجارب الذكاء الاصطناعي المنهجية التي تولّد نتائج موثوقة وذات معنى",
              key_concepts: ["Controlled Experiments","Confounds","Hyperparameter Study","Scaling Study","Analysis"],
              lessons: [
                { name: "التجربة المضبوطة: عزل المتغيرات في الذكاء الاصطناعي", primary: "controlled experiment isolating variables in AI" },
                { name: "المُربِكات: المتغيرات الخفية والتحكم فيها", primary: "confounding variables in AI experiments and control" },
                { name: "دراسة المعاملات: الحجم والبنية والبيانات", primary: "hyperparameter study size architecture and data" },
                { name: "دراسات التوسع: القوانين والتنبؤ", primary: "scaling studies power laws and prediction" },
                { name: "تحليل الحساسية: ماذا يغيّر النتيجة؟", primary: "sensitivity analysis what changes the result" },
                { name: "الاختبارات الإحصائية لمقارنة النماذج", primary: "statistical tests for rigorous model comparison" },
                { name: "التصوير الفعّال: إيصال التجربة بوضوح", primary: "effective visualization for AI experiment communication" },
                { name: "الإعادة عبر Seeds متعددة: المتوسط والتباين", primary: "multiple seed runs for mean and variance reporting" },
                { name: "مشروع: تجربة ذكاء اصطناعي منهجية مع تقرير", primary: "systematic AI experiment with complete analysis report" }
              ]
            },
            {
              unit_index: 4, code: "3.5.4",
              name: "كتابة أوراق الذكاء الاصطناعي",
              goal: "إتقان كتابة أوراق بحثية في الذكاء الاصطناعي بالمستوى المقبول في المؤتمرات الدولية",
              key_concepts: ["Paper Structure","Abstract Writing","Related Work","Contribution Claims","LaTeX"],
              lessons: [
                { name: "هيكل الورقة البحثية في الذكاء الاصطناعي", primary: "AI research paper structure and organization" },
                { name: "كتابة الملخص: الفن والعلم في 150 كلمة", primary: "abstract writing art and science in 150 words" },
                { name: "المقدمة: إقناع القارئ في أول صفحة", primary: "introduction convincing readers in first page" },
                { name: "الأعمال ذات الصلة: التموضع والتمييز", primary: "related work positioning and differentiation" },
                { name: "صياغة مطالبات المساهمة: الدقة والجرأة", primary: "contribution claims precise and bold formulation" },
                { name: "عرض التجارب: الجداول والأشكال والإحصاء", primary: "experiments presentation tables figures and statistics" },
                { name: "LaTeX للأوراق البحثية: Overleaf ومعايير النشر", primary: "LaTeX for research papers Overleaf and journal standards" },
                { name: "الرد على المراجعين: التحكيم والمراجعة", primary: "responding to reviewers peer review process" },
                { name: "مشروع: كتابة ورقة بحثية كاملة للتقديم", primary: "writing complete research paper for submission" }
              ]
            },
            {
              unit_index: 5, code: "3.5.5",
              name: "الإسهام في المصادر المفتوحة للذكاء الاصطناعي",
              goal: "إتقان المشاركة الفعّالة في مجتمع المصادر المفتوحة للذكاء الاصطناعي والإسهام الحقيقي فيه",
              key_concepts: ["Open Source Contribution","Pull Requests","Documentation","Community","GitHub"],
              lessons: [
                { name: "اختيار المشروع: ما الذي تستطيع الإسهام به", primary: "open source project selection contribution strategy" },
                { name: "فهم كود المشروع الكبير بسرعة", primary: "understanding large AI codebase quickly" },
                { name: "Issues الجيدة للمبتدئين: Good First Issues", primary: "good first issues for AI open source beginners" },
                { name: "Pull Request مثالي: الكود والاختبار والوثائق", primary: "perfect pull request code tests and documentation" },
                { name: "المراجعة البنّاءة للكود: الإعطاء والأخذ", primary: "constructive code review giving and receiving" },
                { name: "التوثيق: مساهمة غير مرئية وضرورية", primary: "documentation invisible but necessary contribution" },
                { name: "بناء مكانة في مجتمع الذكاء الاصطناعي", primary: "building reputation in AI open source community" },
                { name: "التحدث في المؤتمرات وورش العمل", primary: "speaking at AI conferences and workshops" },
                { name: "مشروع: مساهمة حقيقية مقبولة في مشروع مفتوح", primary: "real accepted contribution to AI open source project" }
              ]
            },
            {
              unit_index: 6, code: "3.5.6",
              name: "إعادة الإنتاج وتحديات البحث الحالية",
              goal: "فهم أزمة إعادة الإنتاج في الذكاء الاصطناعي والمساهمة في بناء ثقافة البحث المتين",
              key_concepts: ["Reproducibility Crisis","ML Papers","Checklists","Negative Results","Data Sharing"],
              lessons: [
                { name: "أزمة إعادة الإنتاج: حجم المشكلة", primary: "reproducibility crisis in ML scale and impact" },
                { name: "قوائم فحص الإعادة: ML Reproducibility Checklist", primary: "ML reproducibility checklist standards and tools" },
                { name: "النتائج السلبية: أهميتها وصعوبة نشرها", primary: "negative results importance and publication challenges" },
                { name: "مشاركة البيانات: المخاوف والمعايير", primary: "data sharing concerns and community standards" },
                { name: "إعادة إنتاج أوراق NeurIPS وICML", primary: "reproducing NeurIPS ICML papers experiences" },
                { name: "المطلبات الأخلاقية في الأبحاث العلمية", primary: "ethical requirements in AI scientific research" },
                { name: "حالة دراسة: إعادة إنتاج فاشلة وما تعلمناه", primary: "failed reproduction case study and lessons learned" },
                { name: "RC2024: مسابقة إعادة الإنتاج السنوية", primary: "ML Reproducibility Challenge 2024 overview" },
                { name: "مشروع: إعادة إنتاج ورقة بحثية ونشر النتائج", primary: "paper reproduction with public results project" }
              ]
            },
            {
              unit_index: 7, code: "3.5.7",
              name: "أحدث توجهات بحوث الذكاء الاصطناعي",
              goal: "المتابعة الفعّالة لأحدث توجهات بحث الذكاء الاصطناعي والنقاشات الدائرة في الحقل",
              key_concepts: ["Foundation Models","World Models","Neurosymbolic","Continual Learning","AGI Research"],
              lessons: [
                { name: "نماذج الأساس: الحجم والقدرة والتعميم", primary: "foundation models scale capability and generalization" },
                { name: "نماذج العالم: محاكاة الواقع بالذكاء الاصطناعي", primary: "world models simulating reality with AI" },
                { name: "الذكاء الاصطناعي العصبي الرمزي: دمج النهجين", primary: "neurosymbolic AI combining neural and symbolic" },
                { name: "التعلم المستمر: نسيان الكارثي والحلول", primary: "continual learning catastrophic forgetting solutions" },
                { name: "المنطق والاستنتاج: هل يستطيع الذكاء الاصطناعي التفكير؟", primary: "reasoning in AI can LLMs truly reason" },
                { name: "Embodied AI: الذكاء الاصطناعي المجسَّد في الروبوتات", primary: "embodied AI robots interacting with physical world" },
                { name: "أبحاث الذاكرة والتعميم: Meta-learning", primary: "memory generalization and meta-learning research" },
                { name: "AGI النقاشات: هل نحن قريبون وما المعنى؟", primary: "AGI debate are we close and what does it mean" },
                { name: "مشروع: تقرير عن توجه بحثي ناشئ", primary: "emerging AI research trend analysis report" }
              ]
            },
            {
              unit_index: 8, code: "3.5.8",
              name: "الذكاء الاصطناعي في أبحاث العلوم الأساسية",
              goal: "فهم كيف يُحدث الذكاء الاصطناعي ثورة في مجالات العلوم الأساسية ويُسرّع الاكتشافات",
              key_concepts: ["AI for Science","Protein Folding","Material Science","Mathematics","Physics AI"],
              lessons: [
                { name: "AlphaFold: الثورة في علم البروتينات", primary: "AlphaFold revolution in structural biology" },
                { name: "اكتشاف المواد الجديدة بالذكاء الاصطناعي", primary: "AI for materials science and new materials discovery" },
                { name: "الذكاء الاصطناعي والرياضيات: البرهان الآلي", primary: "AI for mathematics automated theorem proving" },
                { name: "الفيزياء بالذكاء الاصطناعي: النماذج الفيزيائية المعلوماتية", primary: "physics-informed neural networks for scientific computing" },
                { name: "الكيمياء الحسابية: الذكاء الاصطناعي في تصميم الجزيئات", primary: "computational chemistry AI for molecular design" },
                { name: "الفلك والجيولوجيا: الذكاء الاصطناعي والبيانات الكبيرة", primary: "astronomy geology AI for large scientific datasets" },
                { name: "نماذج الأساس للعلوم: ESM وGNOme", primary: "foundation models for science ESM GNoME" },
                { name: "التعاون الإنسان-الذكاء الاصطناعي في البحث العلمي", primary: "human-AI collaboration in scientific research" },
                { name: "مشروع: تطبيق ذكاء اصطناعي في مسألة علمية", primary: "AI application to scientific problem project" }
              ]
            },
            {
              unit_index: 9, code: "3.5.9",
              name: "مشروع البحث والنشر الشامل",
              goal: "إجراء بحث أصيل في الذكاء الاصطناعي وكتابة ورقة قابلة للنشر وتقديمها للمجتمع",
              key_concepts: ["Original Research","Paper Writing","Code Release","Presentation","Community Impact"],
              lessons: [
                { name: "اختيار سؤال بحثي أصيل وممكن", primary: "selecting original and feasible research question" },
                { name: "الجدول الزمني للبحث: التخطيط والتنفيذ", primary: "research timeline planning and execution" },
                { name: "إجراء التجارب وجمع النتائج الأصيلة", primary: "conducting experiments and collecting original results" },
                { name: "كتابة الورقة البحثية الكاملة", primary: "writing complete research paper" },
                { name: "إعداد الكود للإصدار العلني", primary: "code preparation for public release" },
                { name: "تقديم الورقة لمؤتمر أو arXiv", primary: "submitting paper to conference or arXiv" },
                { name: "الرد على تغذية النظراء وتحسين الورقة", primary: "responding to peer feedback and improving paper" },
                { name: "العرض والتقديم: Poster وOral", primary: "research presentation poster and oral talk" },
                { name: "التأثير والانتشار: نشر البحث على مجتمع AI", primary: "research impact and dissemination to AI community" }
              ]
            }
          ]
        },
        {
          stage_index: 6,
          name: "الذكاء الاصطناعي والأعمال والاستراتيجية",
          goal: "إتقان إدارة منتجات الذكاء الاصطناعي واستراتيجيته التجارية وقيادة مبادرات الذكاء الاصطناعي في المنظمات",
          bloom_focus: "evaluate",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "3.6.1",
              name: "إدارة منتجات الذكاء الاصطناعي",
              goal: "إتقان إدارة منتجات الذكاء الاصطناعي: من الرؤية للتسليم بمنهجية تدمج التقنية والأعمال",
              key_concepts: ["AI Product Strategy","Roadmap","User Research","AI UX","Metrics"],
              lessons: [
                { name: "مدير منتج الذكاء الاصطناعي: المهارات الفريدة", primary: "AI product manager unique skills and challenges" },
                { name: "استراتيجية المنتج: الرؤية والخارطة الزمنية", primary: "AI product strategy vision and roadmap" },
                { name: "بحث المستخدم للذكاء الاصطناعي: الاحتياجات والتوقعات", primary: "user research for AI products needs and expectations" },
                { name: "تجربة مستخدم الذكاء الاصطناعي: الثقة والشفافية", primary: "AI UX design trust transparency and control" },
                { name: "مقاييس المنتج: التقنية والأعمالية للذكاء الاصطناعي", primary: "AI product metrics technical and business combined" },
                { name: "أولويات الميزات: الأثر مقابل الجهد في AI", primary: "feature prioritization impact vs effort for AI" },
                { name: "التسليم الرشيق للذكاء الاصطناعي: Sprints وIterations", primary: "agile delivery for AI products sprints and iterations" },
                { name: "التواصل مع الفريق التقني والأعمال", primary: "communicating between technical team and business" },
                { name: "مشروع: وثيقة PRD كاملة لمنتج ذكاء اصطناعي", primary: "complete PRD for AI product project" }
              ]
            },
            {
              unit_index: 2, code: "3.6.2",
              name: "استراتيجية الذكاء الاصطناعي التنظيمية",
              goal: "تصميم وتنفيذ استراتيجية الذكاء الاصطناعي على مستوى المنظمة أو الشركة",
              key_concepts: ["AI Strategy","Digital Transformation","Build vs Buy","AI Maturity","Change Management"],
              lessons: [
                { name: "استراتيجية الذكاء الاصطناعي: ما هي وكيف تُبنى", primary: "AI strategy framework building organizational roadmap" },
                { name: "نضج الذكاء الاصطناعي: مستويات الاعتماد المؤسسي", primary: "AI maturity model organizational adoption levels" },
                { name: "البناء مقابل الشراء مقابل الشراكة", primary: "build vs buy vs partner AI capability decision" },
                { name: "التحول الرقمي بالذكاء الاصطناعي: إدارة التغيير", primary: "digital transformation change management with AI" },
                { name: "حالات الاستخدام الأعلى عائداً: الاختيار الاستراتيجي", primary: "highest ROI use cases strategic AI selection" },
                { name: "بناء قدرات الذكاء الاصطناعي الداخلية", primary: "building internal AI capabilities and talent" },
                { name: "الشراكات الاستراتيجية في الذكاء الاصطناعي", primary: "strategic partnerships in AI ecosystem" },
                { name: "قياس النجاح: KPIs لبرامج الذكاء الاصطناعي", primary: "measuring AI program success with KPIs" },
                { name: "مشروع: خارطة استراتيجية للذكاء الاصطناعي لمنظمة", primary: "AI strategy roadmap for organization project" }
              ]
            },
            {
              unit_index: 3, code: "3.6.3",
              name: "اقتصاديات الذكاء الاصطناعي والأعمال",
              goal: "إتقان التحليل الاقتصادي لمشاريع الذكاء الاصطناعي ونماذج الأعمال المبنية عليها",
              key_concepts: ["AI Business Models","ROI","Monetization","Network Effects","AI Economics"],
              lessons: [
                { name: "نماذج أعمال الذكاء الاصطناعي: الأنواع والأمثلة", primary: "AI business models types and examples" },
                { name: "تسعير الذكاء الاصطناعي كخدمة: SaaS وAPI", primary: "AI as a service pricing SaaS and API models" },
                { name: "تأثيرات الشبكة في منتجات الذكاء الاصطناعي", primary: "network effects in AI product flywheels" },
                { name: "تحليل ROI: التكلفة والعائد ومدة الاسترداد", primary: "ROI analysis cost return and payback period for AI" },
                { name: "الخندق التنافسي بالذكاء الاصطناعي: البيانات والنماذج", primary: "competitive moat through AI data and models" },
                { name: "سوق عمل الذكاء الاصطناعي: التقدير العالمي", primary: "AI labor market global valuation and opportunity" },
                { name: "الاحتكار في عصر الذكاء الاصطناعي: المخاوف والتنظيم", primary: "AI monopoly concerns antitrust regulation" },
                { name: "اقتصاد الذكاء الاصطناعي في العالم العربي", primary: "AI economy opportunities in Arab world" },
                { name: "مشروع: دراسة جدوى اقتصادية لمنتج ذكاء اصطناعي", primary: "AI product economic feasibility study project" }
              ]
            },
            {
              unit_index: 4, code: "3.6.4",
              name: "الشركات الناشئة في الذكاء الاصطناعي",
              goal: "إتقان بناء شركة ناشئة في مجال الذكاء الاصطناعي: من الفكرة للتمويل والنمو",
              key_concepts: ["AI Startup","Product-Market Fit","Fundraising","Technical Moat","Go-to-Market"],
              lessons: [
                { name: "الشركات الناشئة في الذكاء الاصطناعي: الفرص والتحديات", primary: "AI startup opportunities challenges and landscape" },
                { name: "إيجاد الملاءمة منتج-سوق: المشكلة أولاً", primary: "product-market fit for AI startups problem first" },
                { name: "الخندق التقني: لماذا صعب التقليد؟", primary: "technical moat why AI startup is hard to copy" },
                { name: "استراتيجية الوصول للسوق: من يشتري أولاً", primary: "go-to-market strategy for AI products" },
                { name: "جمع التمويل: VCs وملائكة الأعمال في AI", primary: "fundraising VCs and angels for AI startups" },
                { name: "عرض شركة ذكاء اصطناعي: Pitch Deck", primary: "AI startup pitch deck structure and content" },
                { name: "بناء الفريق: مهارات التقنية والأعمال", primary: "AI startup team building technical and business" },
                { name: "النمو والتوسع: من المنتج للمنصة", primary: "AI startup growth from product to platform" },
                { name: "مشروع: خطة عمل شركة ذكاء اصطناعي يمنية", primary: "Yemeni AI startup business plan project" }
              ]
            },
            {
              unit_index: 5, code: "3.6.5",
              name: "الذكاء الاصطناعي والعمل: التأثير والتكيف",
              goal: "فهم تأثير الذكاء الاصطناعي على سوق العمل والاستعداد للتكيف والازدهار في هذا العالم الجديد",
              key_concepts: ["Future of Work","AI Automation","Human Augmentation","New Skills","Career Planning"],
              lessons: [
                { name: "الذكاء الاصطناعي والأتمتة: من يتأثر ومتى", primary: "AI automation impact on jobs timeline and sectors" },
                { name: "التكامل الإنسان-الآلة: المضاعفة لا الاستبدال", primary: "human-AI collaboration augmentation not replacement" },
                { name: "المهارات الجديدة للمستقبل: ما لا يؤتمَت", primary: "future skills that AI cannot automate" },
                { name: "التدريب المهني وإعادة التأهيل: مسارات الانتقال", primary: "professional reskilling and upskilling pathways" },
                { name: "مهنة الذكاء الاصطناعي: المسارات والرواتب والنمو", primary: "AI career paths salaries and growth" },
                { name: "سوق العمل اليمني والذكاء الاصطناعي: التأثير والفرص", primary: "Yemeni labor market AI impact and opportunities" },
                { name: "العمل عن بُعد والاقتصاد الرقمي بالذكاء الاصطناعي", primary: "remote work digital economy with AI tools" },
                { name: "سيناريوهات المستقبل: تفاؤل وحذر ووعي", primary: "future work scenarios optimism caution and awareness" },
                { name: "مشروع: خطة مهنية شخصية في عصر الذكاء الاصطناعي", primary: "personal career plan in the AI age project" }
              ]
            },
            {
              unit_index: 6, code: "3.6.6",
              name: "التواصل وشرح الذكاء الاصطناعي للعامة",
              goal: "إتقان التواصل حول الذكاء الاصطناعي مع جمهور غير تقني وتثقيف المجتمع بمسؤولية",
              key_concepts: ["Science Communication","Public Trust","Media Literacy","AI Hype","Responsible Messaging"],
              lessons: [
                { name: "التواصل العلمي: الجسر بين التقني والعام", primary: "science communication bridge between technical and public" },
                { name: "الهايب والواقع: تصحيح التوقعات الخاطئة", primary: "AI hype vs reality correcting public misconceptions" },
                { name: "شرح الذكاء الاصطناعي بلا مصطلحات معقدة", primary: "explaining AI without complex jargon" },
                { name: "الكتابة التقنية العامة: المقالات والتدوين", primary: "public technical writing articles and blogging" },
                { name: "الإعلام والذكاء الاصطناعي: كيف تُغطَى الأخبار", primary: "media coverage of AI critical reading skills" },
                { name: "الثقة العامة بالذكاء الاصطناعي: بناء وإدارة", primary: "public trust in AI building and managing" },
                { name: "التعليم والتثقيف المجتمعي بالذكاء الاصطناعي", primary: "community AI education and literacy programs" },
                { name: "التواصل في اليمن: جمهور متنوع وتحديات", primary: "AI communication in Yemen diverse audience challenges" },
                { name: "مشروع: ورشة تثقيف مجتمعي بالذكاء الاصطناعي", primary: "community AI education workshop project" }
              ]
            },
            {
              unit_index: 7, code: "3.6.7",
              name: "الذكاء الاصطناعي العالمي والتوجهات الكبرى",
              goal: "فهم ديناميكيات سباق الذكاء الاصطناعي العالمي وتوجهاته والتموضع الاستراتيجي",
              key_concepts: ["Global AI Race","National AI Strategy","Geopolitics","AI Governance","Yemen AI Vision"],
              lessons: [
                { name: "سباق الذكاء الاصطناعي: الولايات المتحدة والصين وأوروبا", primary: "global AI race US China Europe dynamics" },
                { name: "استراتيجيات الذكاء الاصطناعي الوطنية: النماذج", primary: "national AI strategies and models comparison" },
                { name: "الجيوسياسة والذكاء الاصطناعي: الشرائح والسيطرة", primary: "geopolitics of AI chips and compute control" },
                { name: "الذكاء الاصطناعي في العالم العربي: الواقع والطموح", primary: "AI in Arab world reality and ambition" },
                { name: "استراتيجية ذكاء اصطناعي للدول النامية", primary: "AI strategy for developing nations leapfrogging" },
                { name: "الذكاء الاصطناعي وأهداف التنمية المستدامة", primary: "AI for sustainable development goals SDGs" },
                { name: "رؤية الذكاء الاصطناعي ليمني: الممكن والطموح", primary: "Yemen AI vision possible and ambitious scenarios" },
                { name: "توجهات الذكاء الاصطناعي 2025-2030: التوقعات", primary: "AI trends 2025-2030 expert forecasts" },
                { name: "مشروع: ورقة سياسة ذكاء اصطناعي وطنية مقترحة", primary: "national AI policy paper proposal project" }
              ]
            },
            {
              unit_index: 8, code: "3.6.8",
              name: "الأخلاق التطبيقية في الذكاء الاصطناعي",
              goal: "تطبيق أطر أخلاقية عملية في قرارات وتصميمات الذكاء الاصطناعي اليومية",
              key_concepts: ["Applied Ethics","Value Alignment","Ethical Frameworks","Case Studies","Ethical Review"],
              lessons: [
                { name: "أخلاقيات الذكاء الاصطناعي: من النظرية للممارسة", primary: "AI ethics from theory to practical application" },
                { name: "أطر الأخلاق: النفعية والواجبية والفضيلة", primary: "ethical frameworks utilitarianism deontology virtue ethics" },
                { name: "محاذاة القيم: ترجمة الإنسانية لكود", primary: "value alignment translating human values to code" },
                { name: "حالات دراسية أخلاقية: قرارات صعبة حقيقية", primary: "ethical case studies real difficult AI decisions" },
                { name: "الأذى غير المقصود: التأثيرات الجانبية", primary: "unintended harm and side effects in AI systems" },
                { name: "العدالة الاجتماعية والذكاء الاصطناعي: أثر على المجتمعات", primary: "social justice and AI impact on communities" },
                { name: "مراجعة أخلاقية: عملية المراجعة والقرار", primary: "ethical review process for AI products" },
                { name: "الأخلاق الإسلامية والذكاء الاصطناعي: نقطة التقاء", primary: "Islamic ethics and AI intersection perspective" },
                { name: "مشروع: مراجعة أخلاقية لنظام ذكاء اصطناعي", primary: "ethical review complete for AI system project" }
              ]
            },
            {
              unit_index: 9, code: "3.6.9",
              name: "مشروع الاستراتيجية والأعمال الشامل",
              goal: "توحيد مفاهيم إدارة منتجات الذكاء الاصطناعي واستراتيجيته في مشروع شامل لمنظمة أو شركة",
              key_concepts: ["Business Plan","Product Strategy","Ethics","Go-to-Market","Presentation"],
              lessons: [
                { name: "تصميم منظمة مدعومة بالذكاء الاصطناعي", primary: "designing AI-powered organization from scratch" },
                { name: "استراتيجية المنتج والخارطة الزمنية الكاملة", primary: "complete product strategy and roadmap" },
                { name: "التحليل الاقتصادي والجدوى المالية", primary: "economic analysis and financial feasibility" },
                { name: "خطة الوصول للسوق والعملاء الأوائل", primary: "go-to-market plan and early customer strategy" },
                { name: "إطار الأخلاق والحوكمة للمنظمة", primary: "ethics and governance framework for organization" },
                { name: "متطلبات الفريق والبنية التنظيمية", primary: "team requirements and organizational structure" },
                { name: "خطة التمويل والنمو في السنة الأولى", primary: "funding and growth plan for first year" },
                { name: "مواجهة التحديات: السيناريوهات الصعبة", primary: "addressing challenges difficult scenario planning" },
                { name: "عرض المشروع الشامل للجمهور والمستثمرين", primary: "comprehensive project presentation for audience and investors" }
              ]
            }
          ]
        },
        {
          stage_index: 7,
          name: "قيادة الذكاء الاصطناعي ومشروع التخرج",
          goal: "إتقان قيادة فرق الذكاء الاصطناعي وإتمام مشروع تخرج متكامل يجمع كل ما تعلمته في حل مشكلة حقيقية",
          bloom_focus: "create",
          exam: { pass_threshold_percent: 75, time_limit_minutes: 55 },
          unit_exam_defaults: { pass_threshold_percent: 75, time_limit_minutes: 30 },
          units: [
            {
              unit_index: 1, code: "3.7.1",
              name: "قيادة فرق الذكاء الاصطناعي",
              goal: "إتقان قيادة فرق الذكاء الاصطناعي متعددة التخصصات بكفاءة وإنتاجية عالية",
              key_concepts: ["Tech Leadership","Team Structure","Performance","Hiring","Culture"],
              lessons: [
                { name: "قائد الذكاء الاصطناعي: المهارات والمسؤوليات", primary: "AI tech lead skills and responsibilities" },
                { name: "هيكل الفريق: الأدوار والتعاون بين التخصصات", primary: "AI team structure roles and cross-functional collaboration" },
                { name: "التوظيف التقني: كيف تُقيِّم مهندسي الذكاء الاصطناعي", primary: "technical hiring evaluating AI engineers" },
                { name: "إدارة الأداء: التقييم والتطوير المهني", primary: "performance management evaluation and career development" },
                { name: "ثقافة الفريق: الجرأة والتجريب والتعلم من الفشل", primary: "AI team culture experimentation and learning from failure" },
                { name: "التخطيط التقني: الأرضية والديون والقرارات", primary: "technical planning groundwork debt and decisions" },
                { name: "إدارة أصحاب المصلحة: التواصل وإدارة التوقعات", primary: "stakeholder management and expectation setting" },
                { name: "التوجيه والإرشاد: بناء الجيل القادم", primary: "mentorship and coaching next generation AI engineers" },
                { name: "مشروع: خطة قيادة لفريق ذكاء اصطناعي", primary: "leadership plan for AI team project" }
              ]
            },
            {
              unit_index: 2, code: "3.7.2",
              name: "خارطة طريق الذكاء الاصطناعي وإدارة المشاريع",
              goal: "إتقان تخطيط خارطة الطريق وإدارة مشاريع الذكاء الاصطناعي المعقدة بمنهجية أجايل",
              key_concepts: ["AI Roadmap","Agile for AI","Risk Management","Sprint Planning","Retrospectives"],
              lessons: [
                { name: "خارطة طريق الذكاء الاصطناعي: البناء والتواصل", primary: "AI roadmap building and communication" },
                { name: "أجايل لمشاريع الذكاء الاصطناعي: التكيف", primary: "agile adaptation for AI project uncertainty" },
                { name: "Sprint Planning للمشاريع البحثية", primary: "sprint planning for research-oriented AI projects" },
                { name: "إدارة المخاطر: التقنية والأعمال والبيانات", primary: "risk management technical business and data risks" },
                { name: "المستعرضات Retrospectives: التحسين المستمر", primary: "retrospectives for continuous AI team improvement" },
                { name: "تتبع التقدم: KPIs وOKRs للذكاء الاصطناعي", primary: "tracking AI progress KPIs OKRs and milestones" },
                { name: "إدارة التبعيات التقنية عبر الفرق", primary: "managing technical dependencies across AI teams" },
                { name: "التوازن بين البحث والإنتاج في الجدول الزمني", primary: "balancing research and production in AI timeline" },
                { name: "مشروع: خطة مشروع ذكاء اصطناعي من البداية للنهاية", primary: "complete AI project plan start to finish" }
              ]
            },
            {
              unit_index: 3, code: "3.7.3",
              name: "الإرشاد والتطوير المهني",
              goal: "إتقان الإرشاد التقني وتطوير مهارات مهندسي الذكاء الاصطناعي في الفريق",
              key_concepts: ["Technical Mentoring","Skill Assessment","Learning Plans","Pair Programming","Code Review"],
              lessons: [
                { name: "الإرشاد التقني الفعّال: المبادئ والتطبيق", primary: "effective technical mentoring principles and practice" },
                { name: "تقييم مهارات المرشَّد: الخارطة الكاملة", primary: "mentee skill assessment complete skill map" },
                { name: "خطة التطوير المهني: الأهداف والمسارات", primary: "professional development plan goals and pathways" },
                { name: "البرمجة الزوجية: التعلم من خلال التطبيق", primary: "pair programming for AI skill transfer" },
                { name: "مراجعة الكود التعليمية: Grow ولا Crush", primary: "educational code review growing not crushing" },
                { name: "المحادثات الصعبة: الأداء والتوجيه", primary: "difficult conversations performance and redirection" },
                { name: "التعلم الذاتي: بناء ثقافة التطوير المستقل", primary: "self-directed learning culture for AI teams" },
                { name: "بناء المجتمع الداخلي: شراء المعرفة", primary: "internal community of practice knowledge sharing" },
                { name: "مشروع: برنامج إرشاد منظم لمهندس جديد", primary: "structured mentoring program for new AI engineer" }
              ]
            },
            {
              unit_index: 4, code: "3.7.4",
              name: "التواصل الفعّال لقادة الذكاء الاصطناعي",
              goal: "إتقان التواصل الفعّال لقادة الذكاء الاصطناعي مع الجمهور التقني وغير التقني",
              key_concepts: ["Executive Communication","Technical Presentations","Storytelling","Writing","Influence"],
              lessons: [
                { name: "التواصل مع القيادة العليا: اللغة والإيجاز", primary: "executive communication AI results and language" },
                { name: "العروض التقنية: الوضوح والتأثير", primary: "technical presentations clarity and impact" },
                { name: "رواية القصص بالبيانات: القصة وراء الأرقام", primary: "data storytelling the story behind numbers" },
                { name: "الكتابة التنفيذية: الوثائق وRFCs والـPRDs", primary: "executive writing documents RFCs and PRDs" },
                { name: "التأثير بلا سلطة: قيادة خلاتي التدرج", primary: "influence without authority lateral leadership" },
                { name: "تقديم الاقتراحات التقنية للتمويل والموافقة", primary: "presenting technical proposals for funding and approval" },
                { name: "إدارة صورتك المهنية: الداخل والخارج", primary: "managing professional brand internally and externally" },
                { name: "التواصل في الأزمات: حين تفشل النماذج علناً", primary: "crisis communication when AI fails publicly" },
                { name: "مشروع: عرض استراتيجي لقيادة عليا افتراضية", primary: "strategic AI presentation to virtual executive team" }
              ]
            },
            {
              unit_index: 5, code: "3.7.5",
              name: "مستقبل الذكاء الاصطناعي: AGI والسيناريوهات",
              goal: "التفكير النقدي في مستقبل الذكاء الاصطناعي: AGI والتأثير البشري والسيناريوهات المحتملة",
              key_concepts: ["AGI","Superintelligence","Long-term Safety","AI Rights","Existential Risk"],
              lessons: [
                { name: "AGI: التعريفات والاتفاق والاختلاف", primary: "AGI definitions agreements and disagreements" },
                { name: "مقاييس قياس التقدم نحو AGI", primary: "measuring progress toward AGI benchmarks and debates" },
                { name: "الذكاء الفائق: سيناريوهات التفرد التكنولوجي", primary: "superintelligence technological singularity scenarios" },
                { name: "المخاطر الوجودية: جدية التهديد وطبيعته", primary: "existential risk from AI seriousness and nature" },
                { name: "حقوق الذكاء الاصطناعي: فلسفة وأخلاق", primary: "AI rights philosophical and ethical questions" },
                { name: "الانتقال الآمن: ضمان الانتقال المفيد للبشرية", primary: "safe AI transition ensuring beneficial outcome" },
                { name: "ما دون AGI: الذكاء الاصطناعي الضيق القوي", primary: "narrow powerful AI impact before AGI" },
                { name: "الاستعداد للمستقبل: المهارات والتكيف", primary: "preparing for AI future skills and adaptability" },
                { name: "مشروع: ورقة موقف حول مستقبل الذكاء الاصطناعي", primary: "AI future position paper project" }
              ]
            },
            {
              unit_index: 6, code: "3.7.6",
              name: "الهوية المهنية وبناء الإرث",
              goal: "بناء هوية مهنية قوية في الذكاء الاصطناعي وترك إرث معرفي مستدام",
              key_concepts: ["Personal Brand","Thought Leadership","Content Creation","Community Building","Legacy"],
              lessons: [
                { name: "الهوية المهنية: من أنت في عالم الذكاء الاصطناعي؟", primary: "professional identity in AI who are you" },
                { name: "قيادة الفكر: من الخبير للمرجع", primary: "thought leadership from expert to reference" },
                { name: "إنشاء المحتوى: كتابة وتسجيل وتحدث", primary: "content creation writing podcasting speaking for AI" },
                { name: "بناء المجتمع: من اتباع الجمهور لقيادته", primary: "community building from following to leading" },
                { name: "المساهمة في النظام البيئي: الإعطاء قبل الأخذ", primary: "ecosystem contribution giving before taking" },
                { name: "الملف المهني المتطور: المشاريع والشهادات", primary: "evolving professional portfolio projects and credentials" },
                { name: "الإرث المعرفي: ما ستتركه لمن يأتي بعدك", primary: "knowledge legacy for next generation AI practitioners" },
                { name: "الذكاء الاصطناعي اليمني: قيادة التحول المحلي", primary: "Yemeni AI leadership driving local transformation" },
                { name: "مشروع: إستراتيجية هويتي المهنية في الذكاء الاصطناعي", primary: "personal professional AI identity strategy project" }
              ]
            },
            {
              unit_index: 7, code: "3.7.7",
              name: "مشروع التخرج: التخطيط والتصميم",
              goal: "تصميم مشروع تخرج طموح يجمع بين العمق التقني والأثر الحقيقي والجودة الاحترافية",
              key_concepts: ["Capstone Design","Problem Selection","Architecture","Timeline","Success Criteria"],
              lessons: [
                { name: "اختيار المشكلة: الأثر والجدوى والشغف", primary: "capstone problem selection impact feasibility passion" },
                { name: "تعريف النجاح: المقاييس والأهداف الواضحة", primary: "success definition metrics and clear objectives" },
                { name: "تصميم المعمارية: الكاملة والمتكاملة", primary: "complete integrated architecture design" },
                { name: "تقسيم العمل: المراحل والتسليمات", primary: "work breakdown phases and deliverables" },
                { name: "الجدول الزمني الواقعي: التوازن والمرونة", primary: "realistic timeline balance and flexibility" },
                { name: "المخاطر والخطط البديلة: Contingency", primary: "risks and contingency planning for capstone" },
                { name: "التوجيه والمراجعة المبكرة: Feedback Loop", primary: "early mentorship and review feedback loop" },
                { name: "الموارد والأدوات: التخطيط للبنية التحتية", primary: "resources tools and infrastructure planning" },
                { name: "مشروع: وثيقة تصميم مشروع التخرج الكاملة", primary: "complete capstone project design document" }
              ]
            },
            {
              unit_index: 8, code: "3.7.8",
              name: "مشروع التخرج: التنفيذ والتوثيق",
              goal: "تنفيذ مشروع التخرج بالجودة الإنتاجية الكاملة مع توثيق شامل للكود والأداء والقرارات",
              key_concepts: ["Implementation","Testing","Documentation","Iteration","Quality Assurance"],
              lessons: [
                { name: "التنفيذ التدريجي: إثبات المفهوم أولاً", primary: "incremental implementation proof of concept first" },
                { name: "الاختبار الشامل: الوحدة والتكامل والنظام", primary: "comprehensive testing unit integration system" },
                { name: "التوثيق الكامل: README وAPI وكود", primary: "complete documentation README API and code docs" },
                { name: "التكرار والتحسين: التغذية الراجعة المستمرة", primary: "iteration and improvement continuous feedback cycle" },
                { name: "ضمان الجودة: معايير الكود الاحترافية", primary: "quality assurance professional code standards" },
                { name: "التحسين للأداء: Profiling وOptimization", primary: "performance optimization profiling and improvement" },
                { name: "المراجعة النهائية: التدقيق الكامل قبل التقديم", primary: "final review complete audit before submission" },
                { name: "إعداد الديمو والعرض التجريبي", primary: "demo preparation and live demonstration" },
                { name: "مشروع: تنفيذ مشروع التخرج مع كل التوثيق", primary: "capstone full implementation with complete documentation" }
              ]
            },
            {
              unit_index: 9, code: "3.7.9",
              name: "مشروع التخرج: العرض والتقييم والإطلاق",
              goal: "تقديم مشروع التخرج بأعلى مستوى احترافي وإطلاقه للعالم وبناء الجسر للمستقبل",
              key_concepts: ["Final Presentation","Peer Review","Public Launch","Portfolio","Next Steps"],
              lessons: [
                { name: "العرض النهائي: من العرض للإلهام", primary: "final capstone presentation inspiring delivery" },
                { name: "مراجعة الأقران: الحكم المنصف والبنّاء", primary: "peer review fair and constructive judgment" },
                { name: "الإطلاق العام: الكود والديمو والتقرير", primary: "public launch code demo and final report" },
                { name: "الملف المهني المكتمل: كل شيء في مكانه", primary: "complete professional portfolio everything in place" },
                { name: "قياس الأثر الحقيقي بعد الإطلاق", primary: "measuring real impact after launch" },
                { name: "الخطوات التالية: ما بعد مشروع التخرج", primary: "next steps after AI capstone completion" },
                { name: "مشاركة التجربة: التدوين والتحدث", primary: "sharing experience blogging and speaking" },
                { name: "الانتقال للمرحلة التالية: عمل أو بحث أو ريادة", primary: "transitioning to next phase work research or entrepreneurship" },
                { name: "الاحتفال والامتنان: رحلة اكتملت ورحلة تبدأ", primary: "celebration gratitude journey completed and new beginning" }
              ]
            }
          ]
        }
      ]
    }
  ]
};

function makeGoal(lessonName, unitName) {
  return `يُتقن المتعلم ${lessonName} ويطبّقها عملياً في سياق ${unitName} بما يُمكّنه من بناء حلول ذكاء اصطناعي احترافية ومؤثرة.`;
}

function makeBridge(lessonName, lessonIndex, unitName) {
  if (lessonIndex === 0) return `نبدأ رحلتنا في ${unitName} بمفهوم ${lessonName} الذي يُشكّل الأساس لكل ما يليه.`;
  if (lessonIndex === 8) return `نختتم ${unitName} بـ${lessonName} لتوحيد ما تعلمناه في تطبيق متكامل يُحكم البناء.`;
  return `انطلاقاً مما تعلمناه سابقاً في ${unitName}، نبني الآن فهماً أعمق لـ${lessonName}.`;
}

function makeConcepts(primary, lessonName) {
  const words = primary.split(" ");
  return [
    {
      name: words.slice(0, 2).join(" "),
      explanation: `المفهوم الجوهري في ${lessonName}: ${primary}.`,
      weight: 3,
      bloom_level: "understand"
    },
    {
      name: words.slice(2, 4).join(" ") || "التطبيق",
      explanation: `التطبيق العملي لـ${primary} في بيئات الذكاء الاصطناعي الإنتاجية.`,
      weight: 2,
      bloom_level: "apply"
    },
    {
      name: "التحليل النقدي",
      explanation: `تقييم ${primary} ومقارنته بالبدائل والحدود العملية والتجارب الحقيقية.`,
      weight: 1,
      bloom_level: "analyze"
    }
  ];
}

function makeMistakes(primary, unitName) {
  return [
    {
      mistake: `الخلط بين المفاهيم النظرية والتطبيق العملي في ${primary}`,
      correction: `يجب التجريب الفعلي وكتابة الكود بعد كل مفهوم نظري في ${unitName}.`,
      severity: "high"
    },
    {
      mistake: `إهمال تحليل الحالات الخاصة والحدود في ${primary}`,
      correction: `دائماً اختبر الحالات الحدية والاستثنائية لضمان موثوقية الكود.`,
      severity: "medium"
    },
    {
      mistake: `نسخ الكود بدون فهم المنطق الرياضي خلف ${primary}`,
      correction: `ابنِ الحدس أولاً، ثم انقل المعرفة للكود بوعي كامل.`,
      severity: "medium"
    }
  ];
}

function makeExamples(primary, unitName) {
  return [
    `تطبيق ${primary} في تحليل بيانات السوق اليمني لاتخاذ قرارات تجارية مبنية على البيانات.`,
    `استخدام ${unitName} لحل مشكلة زراعية يمنية كالتنبؤ بإنتاج المحاصيل في محافظات مختلفة.`,
    `مقارنة نتائج ${primary} على بيانات محلية مقابل بيانات عالمية لفهم الفروق السياقية.`
  ];
}

function makeExamQuestion(lessonName, primary) {
  return {
    question: `كيف تطبّق ${lessonName} عملياً في مشروع ذكاء اصطناعي حقيقي وما الخطوات الأساسية؟`,
    answer: `تطبيق ${primary} يتطلب: فهم المفهوم النظري، تجهيز البيانات المناسبة، تنفيذ الخوارزمية، تقييم الأداء وتفسير النتائج في سياق المشكلة.`
  };
}

function makeLabForUnit(unitDef) {
  const kinds = ["diagnostic", "decision", "application", "analysis", "connection"];
  const questions = kinds.map((kind, i) => {
    const scenarios = {
      diagnostic: `كيف تُشخّص مشكلة في ${unitDef.name} وتحدد جذرها التقني؟`,
      decision: `أمامك نهجان لتطبيق ${unitDef.key_concepts[0]} — أيهما تختار ولماذا؟`,
      application: `طبّق ${unitDef.name} على مجموعة بيانات تمثيلية وأخرج نتيجة مفسّرة.`,
      analysis: `حلّل نتائج ${unitDef.key_concepts[1] || unitDef.name} وقيّمها مقارنةً بالبدائل.`,
      connection: `كيف يرتبط ${unitDef.name} بما تعلمته سابقاً وكيف يُمهّد لما يأتي؟`
    };
    return {
      question_index: i + 1,
      kind,
      question: scenarios[kind],
      rubric: `يُقيَّم الجواب على الفهم العميق وجودة التطبيق والتفكير النقدي في سياق ${unitDef.name}.`,
      solution_outline: `الإجابة المثلى تتضمن: التعريف الدقيق، الخطوات التطبيقية، التقييم، والربط بالسياق الأشمل.`,
      points: [5, 4, 3, 4][i % 4] + 1
    };
  });

  return {
    lab_index: 1,
    name: `مختبر ${unitDef.name}: من النظرية للتطبيق`,
    goal: `تطبيق مفاهيم ${unitDef.name} في سيناريو واقعي وبناء حدس عملي عميق.`,
    scenario: `اعتبر أنك مهندس ذكاء اصطناعي في شركة تقنية تعالج مشكلة ${unitDef.name}. المطلوب توظيف مفاهيم الوحدة لبناء حل متكامل.`,
    pedagogical_sequence: "استكشاف → تطبيق → تحليل → تقييم → توليف",
    prerequisite_lessons: [],
    allowed_tools: ["nukhba_ide_python"],
    questions,
    pass_threshold_percent: 70
  };
}

function makeUnitExamQuestions(unitCode, unitDef, passThreshold, timeLimit) {
  const c = unitDef.key_concepts;
  const questions = [
    {
      question: `ما المفهوم الجوهري الذي يميّز ${c[0]} عن البدائل في ${unitDef.name}؟`,
      options: [`الدقة العالية دائماً`, `${c[0]} يُحقق التوازن الأمثل بين التعقيد والأداء`, `السرعة على حساب الجودة`, `البساطة بغض النظر عن النتائج`],
      correctIndex: 1,
      explanation: `${c[0]} في سياق ${unitDef.name} يُحقق توازناً مثالياً يجعله الخيار الجوهري.`
    },
    {
      question: `في أي حالة يكون تطبيق ${c[1] || c[0]} الأنسب في ${unitDef.name}؟`,
      options: [`عند وجود بيانات غير منظمة`, `عند الحاجة لأداء عالٍ مع قيود محددة`, `في جميع الحالات بلا استثناء`, `فقط مع البيانات الكبيرة`],
      correctIndex: 1,
      explanation: `${c[1] || c[0]} يُطبَّق عند الحاجة لأداء عالٍ مع قيود محددة في سياق ${unitDef.name}.`
    },
    {
      question: `ما الخطأ الشائع عند تنفيذ ${unitDef.name} لأول مرة؟`,
      options: [`استخدام بيانات مناسبة`, `إهمال معالجة الحالات الحدية والاستثنائية`, `التوثيق الجيد للكود`, `اختبار النتائج بدقة`],
      correctIndex: 1,
      explanation: `إهمال الحالات الحدية هو أكثر الأخطاء شيوعاً في ${unitDef.name} وقد يؤثر سلباً على الإنتاج.`
    },
    {
      question: `كيف يُقيَّم أداء ${c[2] || c[0]} في ${unitDef.name}؟`,
      options: [`بالحدس التقني فقط`, `بمقاييس كمية محددة وتحليل نوعي للنتائج`, `بسرعة التنفيذ وحدها`, `بحجم الكود المكتوب`],
      correctIndex: 1,
      explanation: `التقييم الصحيح لـ${c[2] || c[0]} يجمع بين المقاييس الكمية والتحليل النوعي.`
    },
    {
      question: `ما العلاقة بين ${c[0]} و${c[3] || c[1] || "المكوّنات الأخرى"} في ${unitDef.name}؟`,
      options: [`لا علاقة بينهما`, `${c[0]} يُشكّل أساساً لفهم ${c[3] || c[1] || "المكونات الأخرى"}`, `كلاهما مستقل تماماً`, `${c[3] || c[1] || "المكوّنات"} يحل محل ${c[0]}`],
      correctIndex: 1,
      explanation: `${c[0]} يُشكّل الأساس الذي يُبنى عليه فهم بقية مفاهيم ${unitDef.name}.`
    },
    {
      question: `ما خطوة التحسين الأولى عند ضعف أداء ${unitDef.name}؟`,
      options: [`تغيير المشكلة بالكامل`, `تشخيص القيود واختبار البدائل المنهجية`, `الاعتماد على الحدس فقط`, `زيادة حجم البيانات دون تحليل`],
      correctIndex: 1,
      explanation: `التحسين المنهجي يبدأ بتشخيص دقيق لقيود ${unitDef.name} ثم اختبار البدائل.`
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
    questions.push({
      question: `ما الفرق الجوهري بين ${uNames[i % uNames.length]} و${uNames[(i + 1) % uNames.length]} في سياق ${stageDef.name}؟`,
      options: [
        `لا فرق بينهما`,
        `${uName} يركّز على الأساس النظري بينما ${uNames[(i+1)%uNames.length]} يُطبَّق في سيناريوهات محددة`,
        `كلاهما يؤدي نفس الوظيفة`,
        `${uNames[(i+1)%uNames.length]} أحدث دائماً وأفضل`
      ],
      correctIndex: 1,
      explanation: `في ${stageDef.name}، كل وحدة تُكمل الأخرى لبناء صورة متكاملة.`
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
    `ما المبدأ الجوهري في ${lName} الذي يُطبَّق عبر كل مراحله؟`,
    `ما أهم تحدٍّ يواجه المتعلم عند الانتقال لمستوى أعلى في ${lName}؟`,
    `كيف يترابط ${lName} مع المستويات الأخرى في مسار الذكاء الاصطناعي؟`,
    `ما الفرق بين فهم ${lName} نظرياً وتطبيقه احترافياً في الإنتاج؟`,
    `ما أبرز مفهوم في ${lName} يُستخدم يومياً في مشاريع الذكاء الاصطناعي الحديثة؟`,
    `كيف تُقيّم إتقانك لـ${lName} قبل الانتقال للمستوى التالي؟`,
    `ما مورد التعلم الأنسب لتعميق ${lName} بعد إتمام هذا المستوى؟`,
    `ما سيناريو العمل الحقيقي الذي يستدعي الجمع بين مهارات متعددة من ${lName}؟`,
    `ما الطريقة المثلى للحفاظ على المهارات المكتسبة في ${lName}؟`,
    `ما الميزة التنافسية التي يمنحها إتقان ${lName} في سوق العمل اليوم؟`,
    `كيف يختلف نهج المبتدئ عن الخبير في التعامل مع مشاكل ${lName}؟`,
    `ما أول خطوة عملية بعد دراسة ${lName} لبناء مشروع حقيقي؟`,
    `ما المشاريع التي تُثبت إتقان ${lName} في ملفك المهني؟`
  ];

  const questions = [];
  for (let i = 0; i < 13; i++) {
    questions.push({
      question: stems[i],
      options: [
        `الاهتمام بالأدوات على حساب الفهم العميق`,
        `دمج الفهم النظري مع التطبيق العملي والتفكير النقدي المستمر`,
        `التركيز على السرعة دون مراعاة الجودة`,
        `التخصص الضيق جداً وتجاهل الجوانب المتعلقة`
      ],
      correctIndex: 1,
      explanation: `التميز في ${lName} يأتي من دمج الفهم النظري بالتطبيق العملي والتفكير النقدي.`
    });
  }

  return {
    level_name: lName,
    pass_threshold_percent: levelDef.exam.pass_threshold_percent,
    time_limit_minutes: levelDef.exam.time_limit_minutes,
    questions
  };
}

function makePlacementTest() {
  const topics = [
    { q: "ما الفرق بين Supervised وUnsupervised Learning؟", a: 0, opts: ["التعلم بإشراف يستخدم بيانات مُصنَّفة والتعلم بدون إشراف يكتشف الأنماط دون تسميات", "كلاهما يستخدم التسميات", "Unsupervised أسرع دائماً", "لا فرق بينهما"] },
    { q: "ما وظيفة دالة التنشيط في الشبكة العصبية؟", a: 1, opts: ["تسريع التدريب", "إضافة اللاخطية وتمكين النموذج من تعلم أنماط معقدة", "تقليل الأوزان", "زيادة عدد الطبقات"] },
    { q: "ما الانتشار الخلفي في التعلم العميق؟", a: 2, opts: ["طريقة لتصنيف البيانات", "أسلوب لتوليد البيانات", "خوارزمية لحساب التدرجات وتحديث أوزان الشبكة بالانتشار من الخرج للدخل", "نموذج للتجميع"] },
    { q: "ما الفرق بين Overfitting وUnderfitting؟", a: 0, opts: ["Overfitting يحفظ التدريب ولا يُعمّم، Underfitting لا يتعلم الأنماط الكافية", "كلاهما نفس المشكلة", "Underfitting أخطر دائماً", "Overfitting مفيد للإنتاج"] },
    { q: "ما وظيفة Dropout في الشبكة العصبية؟", a: 3, opts: ["تسريع الحساب", "زيادة الدقة دائماً", "تقليل حجم النموذج", "تنظيم النموذج بتعطيل عشوائي للخلايا أثناء التدريب"] },
    { q: "ما المميز في معمارية Transformer عن RNN؟", a: 1, opts: ["Transformers أقل دقة", "الانتباه الذاتي يُمكّن المعالجة المتوازية ويلتقط العلاقات البعيدة بكفاءة", "RNN أحدث وأفضل", "كلاهما متطابقان"] },
    { q: "ما وظيفة Vector Database في أنظمة RAG؟", a: 2, opts: ["تدريب النماذج", "تصنيف الصور", "تخزين واسترجاع تمثيلات النصوص الدلالية بكفاءة عالية", "ضغط النماذج"] },
    { q: "ما الفرق بين BERT وGPT في معالجة النصوص؟", a: 0, opts: ["BERT ثنائي الاتجاه للفهم، GPT أحادي للتوليد الذاتي الإرجاعي", "كلاهما متطابقان في البنية", "GPT أفضل في الفهم دائماً", "BERT للصور فقط"] },
    { q: "ما هدف LoRA في الضبط الدقيق للنماذج الكبيرة؟", a: 3, opts: ["تدريب النموذج من الصفر", "تقليل حجم مجموعة البيانات", "تسريع الاستدلال فقط", "تقليل المعاملات القابلة للتدريب بتحليل الرتبة المنخفضة لتوفير الذاكرة والحساب"] },
    { q: "ما المقصود بـData Drift في نماذج الإنتاج؟", a: 1, opts: ["خطأ في الكود", "تغيير توزيع بيانات الإنتاج عن توزيع التدريب مما يُدهور أداء النموذج", "زيادة حجم البيانات", "اختلاف التسميات"] },
    { q: "ما وظيفة Attention Mechanism في Transformers؟", a: 2, opts: ["تقليص البيانات", "تحسين سرعة الحساب", "تحديد أهمية كل رمز في التسلسل بالنسبة للرموز الأخرى عبر القيم والمفاتيح والاستعلامات", "تهيئة الأوزان"] },
    { q: "ما الفرق بين Q-Learning وPolicy Gradient في التعلم المعزز؟", a: 0, opts: ["Q-Learning يتعلم دالة القيمة، Policy Gradient يُحسّن السياسة مباشرة", "كلاهما يتعلم دالة القيمة", "Policy Gradient أسرع دائماً", "Q-Learning للمحاكاة فقط"] },
    { q: "ما المقصود بـKnowledge Distillation؟", a: 3, opts: ["استخراج البيانات من النموذج", "ضغط الصور", "تدريب نموذج موزع", "نقل معرفة نموذج كبير لنموذج أصغر باستخدام التسميات الناعمة"] },
    { q: "ما وظيفة ZeRO Optimization في DeepSpeed؟", a: 1, opts: ["تسريع الاستدلال", "توزيع حالة المُحسَّن والتدرجات والمعاملات عبر GPU لتوفير الذاكرة وتدريب نماذج أكبر", "تقليل حجم مجموعة البيانات", "ضغط الكود"] },
    { q: "ما المقصود بـFederated Learning؟", a: 2, opts: ["نموذج موزع على خوادم", "تعلم من بيانات كبيرة فقط", "تدريب النماذج على الأجهزة المحلية دون مشاركة البيانات الخام مع الحفاظ على الخصوصية", "أسلوب لتوليد البيانات"] },
    { q: "ما وظيفة SHAP في تفسير النماذج؟", a: 0, opts: ["قياس مساهمة كل ميزة في التنبؤ باستخدام قيم شابلي من نظرية الألعاب", "تسريع التدريب", "ضغط النموذج", "توليد بيانات تدريب"] },
    { q: "ما الفرق بين GANs ونماذج Diffusion لتوليد الصور؟", a: 1, opts: ["لا فرق بينهما", "GANs تدريب تنافسي بين مولّد ومميّز، Diffusion تُولّد بإزالة الضجيج التدريجية وتتفوق في الجودة والتنوع", "Diffusion أسرع دائماً", "GANs تستخدم الانتشار"] },
    { q: "ما أهم مبدأ في MLOps لضمان موثوقية نماذج الإنتاج؟", a: 3, opts: ["الاعتماد على الدقة العالية في التدريب", "استخدام أسرع خوارزمية دائماً", "تقليل حجم النموذج دائماً", "مراقبة النموذج المستمرة مع كشف الانجراف والتحديث الآلي عند الانخفاض"] }
  ];

  return topics.map(item => ({
    question: item.q,
    options: item.opts,
    correctIndex: item.a,
    explanation: `هذا السؤال يقيس الفهم الأساسي لمفاهيم الذكاء الاصطناعي الجوهرية.`
  }));
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
            session_complete_criterion: `يستطيع المتعلم شرح ${lesson.primary} وتطبيقه عملياً في مشروع ذكاء اصطناعي حقيقي مع تفسير نتائجه بوضوح.`,
            expected_duration_minutes: 45,
            motivation_hook: `إتقان "${lesson.name}" يفتح أمامك فرصاً حقيقية في سوق عمل الذكاء الاصطناعي المتنامي محلياً وعالمياً.`,
            learning_objectives: [
              { statement: `فهم ${lesson.primary.split(" ").slice(0, 3).join(" ")} من الناحية النظرية والرياضية`, bloom_level: "understand" },
              { statement: `تطبيق ${lesson.primary.split(" ")[0]} في مشروع ذكاء اصطناعي حقيقي وتحليل النتائج`, bloom_level: "apply" }
            ],
            solution_outline: `فهم ${lesson.primary}، تطبيقه في Python بالمكتبات المناسبة، التحقق من النتائج، تفسيرها وربطها بالمشكلة الأصلية.`
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

  const placementQuestions = makePlacementTest();

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

console.log("توليد ملف uni-ai-instruction.json...");
const result = buildFullFile();
const json = JSON.stringify(result, null, 2);
writeFileSync("uni-ai-instruction.json", json, "utf8");
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
