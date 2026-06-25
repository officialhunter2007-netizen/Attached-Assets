#!/usr/bin/env python3
"""uni-data-science — جودة عالية — تسلسل منطقي"""
import json; from pathlib import Path; import random
random.seed(42)
def h(s): return sum(ord(c)*(i+1) for i,c in enumerate(str(s)))
OUT = Path("out/uni-data-science"); OUT.mkdir(parents=True, exist_ok=True)
def U(n,*l): return (n,list(l))
def S(n,g,*u): return (n,g,list(u))
def L(n,g,b,*s): return (n,g,b,list(s))

# ═══════════════════════════════════════════════════════════
# المستوى الأول: Python وأساسيات تحليل البيانات
# ═══════════════════════════════════════════════════════════

C = [
L("المستوى الأول: Python وأساسيات تحليل البيانات","إتقان Python, NumPy, Pandas, Matplotlib للتحليل","apply",

# ── المرحلة 1: أساسيات Python لعلم البيانات ──
S("أساسيات Python لعلم البيانات","كتابة كود Python بطلاقة لتحليل البيانات",

# الوحدة 1.1.1
U("تشغيل Python وبيئة العمل",
"تثبيت Python و Jupyter Notebook على جهازك","تشغيل أول خلية: print('Hello, Data Science!')","العمليات الحسابية الأساسية: + - * /","أنواع البيانات: int, float, str, bool","التعليقات: كتابة كود يشرح نفسه","المتغيرات: تخزين القيم واسترجاعها","دوال أساسية: type(), len(), range(), input()","استيراد المكتبات: import pandas as pd","قراءة أول ملف CSV: pd.read_csv() ومعاينة البيانات","مشروع: استكشف مجموعة بيانات من اختيارك"),
# الوحدة 1.1.2
U("المتغيرات والعمليات الأساسية",
"المتغيرات: قواعد التسمية وأفضل الممارسات","النوع int: الأعداد الصحيحة والعمليات عليها","النوع float: الكسور العشرية والقسمة في Python 3","النوع str: النصوص والسلاسل — التقطيع والتلاعب","النوع bool: القيم المنطقية واستخدامها في الشروط","التحويل بين الأنواع: int(), str(), float(), bool()","العمليات الحسابية: + - * / // % ** بعمق","عوامل المقارنة: == != < > <= >=","العوامل المنطقية: and or not — بناء شروط معقدة","مشروع: آلة حاسبة لتحليل بيانات"),
# الوحدة 1.1.3
U("القوائم List في علم البيانات",
"إنشاء القوائم: [] و list() و range()","الفهرسة من الصفر: الوصول لأي عنصر في القائمة","التقطيع Slicing: استخراج أجزاء [start:stop:step]","إضافة عناصر: append(), extend(), insert()","حذف عناصر: remove(), pop(), del","ترتيب القوائم: sort(), sorted(), reverse()","دوال مفيدة: len(), min(), max(), sum(), count()","List Comprehensions: بناء قوائم جديدة بسطر واحد","القوائم المتداخلة: تمثيل بيانات جدولية","مشروع: تحليل قائمة أسعار منتجات"),
# الوحدة 1.1.4
U("القواميس Dict وهياكل البيانات",
"إنشاء القواميس: {} و dict() — المفتاح والقيمة","الوصول للقيم: d['key'] و d.get('key', default)","إضافة وتعديل وحذف العناصر في القاموس","التكرار على القواميس: keys(), values(), items()","Dict Comprehensions: بناء القواميس باختصار","Tuple: البيانات الثابتة غير القابلة للتغيير","Set: المجموعات وإزالة التكرار والعمليات","مقارنة الهياكل: List vs Dict vs Tuple vs Set","تحويل DataFrame لـ Dict والعكس","مشروع: بناء محلل بيانات بسيط بقواميس"),
# الوحدة 1.1.5
U("الدوال Functions في Python",
"تعريف الدالة: def — لماذا نحتاج الدوال؟","المعاملات Parameters: إدخال البيانات للدالة","return: إرجاع النتائج من الدالة","الوسائط الافتراضية: قيم افتراضية للمعاملات","وسائط متعددة: *args و **kwargs","lambda: كتابة دوال سريعة في سطر واحد","توثيق الدوال: docstrings","نطاق المتغيرات Scope: محلي وعام","إعادة الاستخدام: مبدأ DRY وتنظيم الكود","مشروع: مكتبة دوال لتنظيف وتحليل البيانات"),
# الوحدة 1.1.6
U("الجمل الشرطية ومعالجة الأخطاء",
"if و else: أول قرار في برنامجك","elif: تعدد المسارات — أكثر من خيارين","الشروط المتداخلة: if داخل if","if مع in: فحص انتماء عنصر لمجموعة","التعبير الشرطي المختصر: x if condition else y","try/except: التعامل مع الأخطاء","أنواع الأخطاء: TypeError, ValueError, KeyError","finally: كود ينفذ دائماً","raise: رمي الأخطاء للتحقق من المدخلات","مشروع: مدقق جودة بيانات"),
# الوحدة 1.1.7
U("الحلقات والتكرار في Python",
"for مع range(): التكرار المنظم بعدد محدد","for مع القوائم: التكرار على كل عنصر","enumerate(): الحصول على الفهرس والقيمة معاً","while: التكرار بشرط","break: الخروج الفوري من الحلقة","continue: تخطي الدورة الحالية","الحلقات المتداخلة: for داخل for","List Comprehension مقابل الحلقة","التكرار على DataFrame: iterrows(), itertuples()","مشروع: تقرير إحصائي من ملف CSV"),
# الوحدة 1.1.8
U("العمل مع الملفات والبيانات",
"فتح الملفات: open() مع 'r', 'w', 'a'","قراءة ملف كامل: read() و readlines()","كتابة الملفات: كتابة النتائج والتحليلات","معالجة CSV يدوياً: csv.reader()","معالجة JSON: json.load() و json.dump()","معالجة Excel: openpyxl","مسارات الملفات: os.path و pathlib","ترميز الملفات: utf-8 والنصوص العربية","الملفات الكبيرة: القراءة سطراً سطراً","مشروع: جامع بيانات آلي من مصادر متعددة"),
# الوحدة 1.1.9
U("مشروع: نظام تحليل بيانات متكامل",
"تخطيط المشروع: تحديد الأهداف ونطاق العمل","جمع البيانات: استيراد من CSV و Excel و JSON","استكشاف البيانات: df.head(), info(), describe()","تنظيف البيانات: التعامل مع القيم المفقودة","تحليل إحصائي: المتوسطات والوسيط والانحراف","التجميع: groupby لحساب إحصائيات حسب الفئات","إنشاء تقرير: كتابة النتائج في ملف منظم","تصدير النتائج: حفظ البيانات المعالجة","توثيق الكود: شرح كل خطوة","العرض النهائي: تقديم المشروع مع النتائج"),
),

# ── المرحلة 2: NumPy — الحوسبة العددية ──
S("NumPy: الحوسبة العددية فائقة السرعة","المصفوفات، العمليات المتجهة، الإحصاء",
U("مقدمة NumPy: لماذا هي أسرع 50 مرة؟",
"ما هو NumPy؟ المكتبة الأساسية للحوسبة العلمية","مقارنة الأداء: قوائم Python مقابل NumPy","تثبيت واستيراد: import numpy as np","إنشاء المصفوفات: np.array() من القوائم","المصفوفات الجاهزة: zeros(), ones(), arange()","linspace(): نقاط متساوية في مدى","eye(): مصفوفة الوحدة","shape, dtype, ndim","التخزين المتجاور: لماذا NumPy أسرع؟","مشروع: قياس أداء List مقابل NumPy"),
U("الفهرسة والتقطيع في NumPy",
"الفهرسة من 0: الوصول للعناصر","التقطيع [start:stop:step]","المصفوفات ثنائية الأبعاد: [row, col]","التقطيع في 2D: [:,0] للأعمدة","Boolean Masking: arr[arr > threshold]","Fancy Indexing: تحديد بقائمة مؤشرات","تعديل القيم عبر الفهرسة","الفرق بين view و copy","الفهرسة السالبة","مشروع: استخراج وتعديل بيانات"),
U("العمليات المتجهة Vectorized",
"عمليات عنصر بعنصر: + - * / **","الدوال الرياضية: sqrt(), log(), exp()","Broadcasting: بين أبعاد مختلفة","قواعد Broadcasting","np.where(): if-else على المصفوفة","np.select(): شروط متعددة","Vectorization مقابل الحلقات","كتابة دوال متجهة: np.vectorize()","تجنب الحلقات في NumPy","مشروع: تحويل حلقات لمتجهات"),
U("الدوال الإحصائية في NumPy",
"المتوسط: np.mean()","الوسيط: np.median()","الانحراف المعياري: np.std()","المجاميع: sum(), min(), max()","المحاور: axis=0 و axis=1","المئينات: percentile(), quantile()","الارتباط: np.corrcoef()","التوزيع: np.histogram()","القيم الفريدة: np.unique()","مشروع: تقرير إحصائي كامل"),
U("إعادة تشكيل المصفوفات",
"reshape(): تغيير الشكل","-1: حساب تلقائي للبعد","flatten() و ravel(): تسطيح","transpose() و .T: تبديل","np.newaxis: إضافة بعد","stack: vstack, hstack, dstack","split: تقسيم المصفوفات","concatenate: دمج","تطبيق: معالجة بيانات الصور","مشروع: تشكيل بيانات متعددة الأبعاد"),
U("Boolean Masking والتصفية",
"arr[arr > threshold]: أساسيات","شروط مركبة: & و |","~: النفي","np.where(): استبدال شرطي","np.extract(): استخراج بالشرط","np.any() و np.all()","Masking مع NaN","Masking متعدد الأبعاد","تطبيق: تصفية قيم شاذة","مشروع: تنظيف بيانات بـ Masking"),
U("الجبر الخطي مع NumPy",
"ضرب المصفوفات: @ و np.dot()","inv(): معكوس المصفوفة","det(): المحدد","norm(): المعيار","solve(): حل المعادلات","eig(): القيم والمتجهات الذاتية","svd(): تحليل القيمة المنفردة","تطبيق: حل الانحدار الخطي","تطبيق: PCA بسيط بـ SVD","مشروع: انحدار خطي من الصفر"),
U("توليد الأرقام العشوائية",
"seed(): تثبيت العشوائية","rand(): توزيع منتظم","randn(): توزيع طبيعي","randint(): أعداد صحيحة","choice(): اختيار عشوائي","shuffle(): خلط","توليد بيانات وهمية","محاكاة Monte Carlo بسيطة","تطبيق: bootstrap sampling","مشروع: محاكاة بيانات"),
U("مشروع: تحليل بيانات بـ NumPy",
"تخطيط التحليل","تحميل البيانات كمصفوفات","تنظيف: إزالة NaN والشواذ","حسابات إحصائية شاملة","تحليل الارتباطات","كشف القيم المتطرفة","تطبيع البيانات يدوياً","تصدير النتائج","توثيق","عرض"),
),
),
],
M = [
("Data Leakage","Scaler قبل التقسيم = اختبار يتسرب = دقة وهمية.","اقسم أولاً. scaler.fit(X_train). scaler.transform(X_test). Pipeline.","Pipeline يمنع Data Leakage تلقائياً.","critical"),
("Accuracy على غير متوازنة","95% فئة A. نموذج يتنبأ دائماً A = 95% لكنه فاشل.","Precision, Recall, F1, confusion_matrix.","قبل المقياس: ما الفئة الأهم؟ Accuracy مضللة.","major"),
("عدم توحيد المقياس","متغير 1-1000 يسيطر على المسافات = تجميع سيئ.","StandardScaler قبل K-Means, KNN, SVM, NN. Trees لا تحتاج.","كل نموذج يعتمد على المسافة يحتاج scaling.","major"),
("Overfitting","دقة تدريب 99%، اختبار 65%. النموذج حفظ ولم يتعلم.","تبسيط، Regularization، CV، EarlyStopping.","افحص الفجوة بين train و test. Validation Curve.","critical"),
("حلقات for مع Pandas","for على 100K: 5 ثوان. متجهة: 0.002 ثانية.","df['new'] = df['a'] + df['b']. apply() فقط.","إذا كتبت for مع Pandas، توقف.","minor"),
("fillna/dropna قبل التحليل","mean() على NaN = NaN.","df.isna().sum() فحص، fillna() أو dropna().","نظف بياناتك أولاً.","major"),
("عدم استخدام Pipeline","خطوات يدوية = نسيان = Data Leakage.","Pipeline([('scaler',Scaler()),('model',Model())]).","Pipeline صديقك. استخدمه دائماً.","major"),
("stratify في split","فئة نادرة قد لا تظهر في training أو test.","stratify=y يحافظ على نسب الفئات.","دائماً استخدم stratify للتصنيف.","major"),
]

def mb(p,c):return[f"الآن أتقنتَ {p}، نرتقي إلى {c}.",f"في الدرس السابق فككنا {p}. اليوم نبني عليه بـ {c}.",f"بعد {p}، {c} يسد الفجوة التالية.",f"{p} كان الأساس. {c} هو الطابق التالي.",][h(p+c)%4]

def gl(uc,lt,sn):
 ls=[];pv="المفاهيم الأساسية"
 for li,t in enumerate(lt,1):
  nm=2+(h(f"{uc}_{li}")%2);lm=[{"mistake":f"{m[0]}\n{m[1]}","correction":m[2],"treatment":m[3],"severity":m[4]} for m in [M[(h(f"{uc}_{li}_{mi}"))%len(M)] for mi in range(nm)]]
  ls.append({"lesson_index":li,"name":t,"goal":f"فهم وتطبيق {t}","bridge_sentence":mb(pv,t),"prerequisite_lessons":[] if li==1 else [f"{uc}.{li-1}"],"enables_lessons":[] if li==len(lt) else [f"{uc}.{li+1}"],"final_check_question":f"اشرح {t} بكلماتك. خطوات تطبيقه؟ أشهر خطأ؟","session_complete_criterion":f"يشرح {t} ويكتب كوداً يطبقه","yemeni_examples":[f"تطبيق عملي: {t} في مشروع حقيقي."],"expected_duration_minutes":30,"estimated_gem_cost":90,"solution_outline":f"خطوات {t}:\n1. فهم الأساس\n2. استيراد المكتبات\n3. تطبيق الكود\n4. تحليل النتائج\n5. توثيق","motivation_hook":f"{t} — مهارة أساسية في علوم البيانات.","learning_objectives":[{"statement":f"يفهم {t}","bloom_level":"understand"},{"statement":f"يطبق {t}","bloom_level":"apply"}],"glossary":[],"concepts":[{"name":t,"explanation":f"شرح وتطبيق عملي لـ {t} في سياق {sn}.","mastery_criterion":f"يشرح {t} ويكتب كوداً","weight":1}],"common_mistakes":lm});pv=t
 return ls

def glab(uc,un,nl):
 return[{"lab_index":li,"title":f"معمل {un}: {'التشخيص' if li==1 else 'التطبيق'}","scenario":f"مشكلة في {un}. حللها.","completion_criterion":f"تحليل وحل","pedagogical_sequence":"diagnostic -> decision -> application -> analysis -> connection","prerequisite_lessons":[f"{uc}.{nl//2}"],"allowed_tools":["text","code"],"questions":[{"kind":"diagnostic","prompt":f"خطوات تشخيص مشكلة في {un}؟","rubric":"ذكر 4 خطوات منطقية مع شرح","solution_outline":"جمع وتحليل وتحديد واقتراح","points":1},{"kind":"decision","prompt":f"خياران لحل في {un}. معاييرك؟","rubric":"ذكر معيارين مع تبرير","solution_outline":"الدقة والسرعة والتعقيد","points":1},{"kind":"application","prompt":f"اكتب كوداً يطبق {un}.","rubric":"كود صحيح يعمل وينتج نتائج","solution_outline":"استيراد وتحميل وتطبيق","points":2},{"kind":"analysis","prompt":f"كود لـ {un} فيه 3 أخطاء.","rubric":"3 أخطاء مع شرح وتصحيح","solution_outline":"تحليل الأخطاء وتصحيحها","points":1},{"kind":"connection","prompt":f"اربط {un} بمهارات سابقة.","rubric":"رابطان مع فكرة مشروع","solution_outline":"الربط وخطة مشروع","points":1}]} for li in range(1,3)]

def ge(c,s,n=10):
 q=[("الخطوة الأولى في ML:",["فهم المشكلة","أحدث خوارزمية","جمع بيانات","كتابة كود"],0,1,"بدون هدف، أفضل خوارزمية لا تعطي نتيجة."),("Supervised vs Unsupervised:",["المراقب يحتاج تسميات","لا فرق","المراقب أسرع","غير المراقب أدق"],0,1,"Supervised بتسميات، Unsupervised بدونها."),("Overfitting:",["يحفظ ولا يعمم","بسيط جداً","سريع","قليل بيانات"],0,2,"أداء تدريب ممتاز، فشل على بيانات جديدة."),("Cross-Validation:",["تقييم موثوق","تسريع","زيادة بيانات","تغيير خوارزمية"],0,2,"يقسم لـ k أجزاء ويتأكد من ثبات الأداء."),("ReLU:",["ReLU","Sigmoid","Softmax","Linear"],0,2,"تحل Vanishing Gradient."),("Dropout:",["منع Overfitting","تسريع","تكبير","تغيير تنشيط"],0,2,"يعطل عشوائياً عصبونات."),("df.describe():",["إحصائيات وصفية","حذف فارغات","رسم","تغيير أسماء"],0,1,"تعرض count,mean,std,min,max."),("Data Leakage:",["تسرب الاختبار","فقدان بيانات","تسرب ذاكرة","توقف تدريب"],0,2,"أخطر خطأ في ML."),("StandardScaler:",["توحيد مقياس","زيادة بيانات","تسريع","تغيير نوع"],0,1,"mean=0, std=1."),("train_test_split:",["تقسيم","تسريع","زيادة","تغيير نوع"],0,2,"يضمن تقييماً غير متحيز.")]
 vv=[]
 for v in range(3):vv.append([{"question_index":qi+1,"kind":"mcq","prompt":p,"choices":[f"{chr(1571+ci)})\u200f {ch}" for ci,ch in enumerate(c)],"correct_index":ci,"explanation":e,"difficulty":d,"points":1,"time_limit_seconds":60+d*30} for qi,(p,c,ci,d,e) in enumerate([q[(h(f"{s}_{v}_{qi}"))%len(q)] for qi in range(n)])])
 return{"code":s,"scope":c,"variants":vv}

def gp():
 q=[(1,"print(type(3.14)):",["<class 'float'>","<class 'int'>","<class 'str'>","<class 'bool'>"],0,1),(1,"قائمة مربعات زوجية:",["[x**2 for x in range(10) if x%2==0]","list(range(even))","[x for x in range(10) if x/2==0]","[x for x in even(10)]"],0,1),(2,"df.describe():",["إحصائيات وصفية","حذف فارغات","رسم","تغيير أسماء"],0,1),(2,"np.mean():",["المتوسط الحسابي","np.average()","np.median()","np.sum()/len()"],0,1),(3,"تصنيف ثنائي:",["Logistic Regression","Linear Reg","K-Means","PCA"],0,2),(3,"train_test_split:",["تقسيم","تسريع","زيادة","تغيير نوع"],0,2),(4,"Gradient Boosting:",["نماذج متسلسلة","شبكات عصبية","K-Means","مكتبة رسم"],0,2),(4,"وظيفة PCA:",["تقليل أبعاد البيانات","زيادة دقة","تنظيف","تسريع فقط"],0,2),(5,"MLOps:",["تشغيل نماذج","خوارزميات","لغة","قاعدة بيانات"],0,3),(5,"Docker في DS:",["تغليف ونشر","تدريب","تحليل","رسم"],0,3)]
 return[{"target_level_index":l,"kind":"mcq","prompt":p,"choices":[f"{chr(1571+ci)})\u200f {c}" for ci,c in enumerate(c)],"correct_index":ci,"difficulty":d,"explanation":f"مستوى {l}"} for l,p,c,ci,d in q]

def main():
 print(f"\n{'='*60}\n  uni-data-science — تسلسل منطقي\n{'='*60}\n")
 mt={"slug":"uni-data-science","name":"علوم البيانات","icon":"📊","desc":"منهج متكامل: من Python إلى التعلم العميق.","scope":"professional_track","language":"ar","region":"YE","target_persona":"طالب يريد احتراف علوم البيانات.","teacher_tone":"عملية ومباشرة.","viz":["python_trace","flowchart","scatter_plot","line_chart","bar_chart","heatmap","data_table"],"tools":["text","code","image"],"glossary":[{"term":"DataFrame","definition":"هيكل بيانات ثنائي الأبعاد"}]}
 rl=[];au=[];asc=[]
 for li,(ln,lg,lb,ss) in enumerate(C):
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
 fn={"schema_version":"v4.1","specialty":{**mt,"yemeni_examples":["تطبيق عملي"]},"levels":rl,"exam_banks":{"unit_banks":ub,"stage_banks":sb,"level_banks":lb},"placement_test_questions":gp(),"publish_notes":"uni-data-science — تسلسل منطقي"}
 fp=OUT/"final.json"
 with open(fp,'w',encoding='utf-8') as f:json.dump(fn,f,ensure_ascii=False,indent=2)
 sz=fp.stat().st_size/(1024*1024);tl=sum(1 for l in rl for s in l['stages'] for u in s['units'] for _ in u['lessons'])
 print(f"\n  ✅ {sz:.1f} MB | {len(rl)} مستويات | {tl} درس\n")
if __name__=="__main__":main()
