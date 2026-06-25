#!/usr/bin/env python3
# ملف uni-ai v3 — محتوى منسجم مع المراحل/الوحدات عبر التصنيف الذكي
import json, sys
from pathlib import Path; import random
random.seed(42)
def h(s): return sum(ord(c)*(i+1) for i,c in enumerate(str(s)))
OUT = Path("out/uni-ai"); OUT.mkdir(parents=True, exist_ok=True)

# ── بنوك المفاهيم (مختصرة: الاسم فقط + شرح عملي) ──

B = {
"python": [
("أول برنامج Python: print و input","`print('Hello, World!')` يعرض النص. `input('ما اسمك؟ ')` يقرأ من المستخدم ويعيده كنص. هاتان الدالتان هما أول ما تتعلمه في أي لغة — أدخل بيانات، اعرض نتائج. في Jupyter، جرب `print(5 + 3)` مباشرة. الخطأ: نسيان الأقواس — `print 'hi'` خطأ في Python 3."),
("المتغيرات Variables: تخزين القيم","`x = 42` يخزن القيمة في الذاكرة. Python تحدد النوع تلقائياً: int للصحيح، float للكسور، str للنصوص، bool للمنطقي. `type(x)` يكشف النوع. الأسماء يجب أن تكون وصفية: `student_count` أفضل من `x`. الأسماء حساسة للحالة: `Name` ≠ `name`. الخطأ: استخدام متغير قبل تعريفه — `NameError`."),
("أنواع البيانات والتحويل بينها","int (42, -7, 0)، float (3.14, -0.5, 1.0)، str ('Hello')، bool (True/False). `int('42')` يحول النص لعدد. `str(3.14)` يحول العدد لنص. `float('3.14')` للنص العشري. `5 / 2` = 2.5 (float)، `5 // 2` = 2 (int). الخطأ: `'5' + 3` — TypeError."),
("العمليات الحسابية والمنطقية","الجمع +، الطرح -، الضرب *، القسمة / (تعطي float)، القسمة الصحيحة //، باقي القسمة %، الأس **. `10 / 3` = 3.333، `10 // 3` = 3. أولوية العمليات: أقواس، أس، ضرب/قسمة، جمع/طرح. المقارنات: `==, !=, <, >, <=, >=`. `and, or, not` للمنطق. الخطأ: `=` بدل `==`."),
("الجمل الشرطية if/elif/else","`if x > 10: print('كبير') elif x > 5: print('متوسط') else: print('صغير')`. المسافة البادئة (4 مسافات) إلزامية — تحدد الكتلة. `if x in list` يفحص الانتماء. `match/case` (Python 3.10+) بديل لسلاسل elif الطويلة. الخطأ: نسيان النقطتين `:` بعد الشرط."),
("الحلقات for: التكرار المنظم","`for i in range(5): print(i)` يطبع 0,1,2,3,4. `for name in names:` يكرر على كل عنصر. `range(start, stop, step)`. `enumerate(lst)` يعطي الفهرس مع القيمة. `break` يخرج من الحلقة. `continue` يتخطى باقي الدورة. الخطأ: `range(1,10)` يعطي 1-9 وليس 1-10."),
("الحلقات while: التكرار بشرط","`while x > 0: x -= 1`. تستمر طالما الشرط محقق. الخطر: الحلقة اللانهائية — إذا لم يتغير الشرط أبداً، لن تتوقف. دائماً تأكد من وجود 'مخرج'. استخدم while عندما لا تعرف عدد التكرارات مسبقاً (مثلاً: اقرأ من ملف حتى النهاية). الخطأ: نسيان تحديث المتغير الذي يعتمد عليه الشرط."),
("القوائم List: المجموعات المرنة","`nums = [1, 2, 3]`. الفهرسة من 0: `nums[0]` = 1. `nums[-1]` آخر عنصر. `.append(x)` إضافة، `.remove(x)` حذف، `.sort()` ترتيب. `len(nums)` الطول. `nums[1:3]` التقطيع. القوائم قابلة للتغيير (mutable). الخطأ: `nums[3]` لقائمة طولها 3 — IndexError."),
("List Comprehensions: بناء القوائم بأناقة","`[x**2 for x in range(10) if x%2==0]` مربعات الأعداد الزوجية في سطر واحد. `[w.upper() for w in words]` تحويل النصوص. أسرع وأوضح من حلقات for. للتحويلات البسيطة ممتازة. للتحويلات المعقدة، الحلقة العادية أوضح. الخطأ: نسيان الأقواس المربعة — تحصل على generator."),
("القواميس Dict: تخزين بالمفاتيح","`d = {'name': 'Ali', 'age': 25}`. `d['name']` للوصول. `d.get('key', 'default')` أكثر أماناً — لا يرمي KeyError. `d['new'] = value` إضافة. `.keys()`, `.values()`, `.items()`. البحث O(1) — سريع جداً. الخطأ: `d['key']` لمفتاح غير موجود — KeyError."),
("Tuple و Set: هياكل متخصصة","Tuple: `t = (1, 2, 3)` — غير قابل للتغيير (immutable). أسرع من List. يستخدم للمفاتيح في القواميس. Set: `s = {1, 2, 3}` — عناصر فريدة فقط. `&` تقاطع، `|` اتحاد، `-` فرق. البحث O(1). الخطأ: `s[0]` — Set لا تدعم الفهرسة."),
("الدوال Functions: اكتب مرة، استخدم دائماً","`def add(a, b): return a + b`. المعاملات Parameters مدخلات. `return` يعيد النتيجة. نطاق المتغير Scope: ما داخل الدالة لا يُرى خارجها. 20 دالة صغيرة أفضل من 500 سطر متتالٍ. `lambda x: x*2` للدوال السريعة. الخطأ: نسيان return — ترجع None."),
("معالجة الملفات: اقرأ واكتب","`with open('file.txt', 'r') as f: content = f.read()`. `'w'` كتابة (تمسح)، `'a'` إلحاق. `f.readlines()` قائمة بالأسطر. `with` يضمن إغلاق الملف تلقائياً. `csv.reader()` لملفات CSV. `json.load()` لـ JSON. الخطأ: نسيان `with` — الملف قد لا يغلق."),
("معالجة الأخطاء try/except","`try: x = 1/0 except ZeroDivisionError: print('لا يمكن القسمة على صفر')`. `finally` ينفذ دائماً. `raise ValueError('msg')` لرمي خطأ. قراءة Traceback: اقرأ آخر سطر (نوع الخطأ) ثم آخر سطر من كودك. الخطأ: `except:` بدون تحديد النوع — يخفي أخطاء غير متوقعة."),
("استيراد المكتبات: قوة Python الحقيقية","`import numpy as np`. `from math import sqrt`. `pip install library`. `requirements.txt` يسجل التبعيات. المكتبات توسع Python لآلاف المجالات. `import` ينفذ مرة واحدة (cached). `venv` لعزل بيئات المشاريع. الخطأ: `from module import *` — يلوث namespace."),
("البرمجة كائنية التوجه OOP","`class Student:` يعرف كلاساً. `s = Student()` ينشئ كائناً. `__init__` للتهيئة. `self` يشير للكائن. الوراثة: `class Grad(Student)`. التغليف: إخفاء التفاصيل. OOP ينظم الكود الكبير. الخطأ: نسيان `self` كأول معامل في methods."),
],
"numpy": [
("لماذا NumPy؟","قوائم Python: 10M عملية في ~1 ثانية. NumPy: نفس العملية في ~0.02 ثانية — أسرع 50x. السبب: تخزين متجاور، عمليات بـ C، لا boxing. `import numpy as np`. الخطأ: استخدام NumPy لـ 3 عناصر فقط — overhead أكبر من الفائدة."),
("إنشاء المصفوفات Arrays","`np.array([1,2,3,4,5])`. `np.zeros((3,4))` مصفوفة أصفار. `np.ones((2,3))` واحدات. `np.arange(0,10,2)` تسلسل 0,2,4,6,8. `np.linspace(0,1,5)` 5 نقاط متساوية. `np.eye(3)` مصفوفة وحدة. `arr.shape` الأبعاد، `arr.dtype` النوع. الخطأ: `np.zeros(3,4)` بدل `np.zeros((3,4))`."),
("الفهرسة والتقطيع Slicing","`arr[0]` أول عنصر. `arr[1:4]` عناصر 1,2,3. `arr[-1]` آخر عنصر. `arr[:, 0]` العمود الأول (كل الصفوف). `arr[0, :]` الصف الأول. `arr[::-1]` يعكس. الفهرسة تبدأ من 0. الخطأ: `arr[1,2]` لمصفوفة 1D."),
("العمليات المتجهة Vectorized","`arr * 2` يضرب كل عنصر. `arr1 + arr2` جمع عنصر بعنصر. `np.sqrt(arr)` الجذر التربيعي. العمليات تنفذ بـ C — أسرع بآلاف المرات من الحلقات. `A @ B` لضرب المصفوفات. Broadcasting: عمليات بين أبعاد مختلفة. الخطأ: استخدام حلقات for في NumPy."),
("Boolean Masking: التصفية الذكية","`arr[arr > 5]` العناصر الأكبر من 5. `arr[(arr>2) & (arr<8)]` شروط مركبة — استخدم `&` وليس `and`. `np.where(arr>5, arr, 0)` استبدال شرطي. `arr[arr % 2 == 0]` العناصر الزوجية. `~(arr > 5)` النفي. الخطأ: `(arr>2) and (arr<8)` — خطأ، استخدم `&`."),
("الدوال الإحصائية","`arr.mean()` المتوسط. `np.median(arr)` الوسيط. `arr.std()` الانحراف المعياري. `arr.sum()`, `arr.min()`, `arr.max()`. `axis=0` على الأعمدة، `axis=1` على الصفوف. `np.percentile(arr, 25)` الربيع الأول. الخطأ: نسيان `axis` في المصفوفات 2D."),
("إعادة التشكيل Reshape","`arr.reshape((2,3))` يغير الشكل. `-1` يحسب البعد تلقائياً: `arr.reshape((-1, 1))`. `arr.flatten()` يسطح. `arr.T` ينقل (تبديل صفوف/أعمدة). `arr.ravel()` مثل flatten لكن كـ view إذا أمكن. `np.newaxis` لإضافة بعد. الخطأ: عدد العناصر يجب أن يتطابق — `reshape((2,3))` على 8 عناصر خطأ."),
("الدمج والتقسيم","`np.concatenate([a, b])` دمج. `np.vstack([a, b])` تكديس رأسي. `np.hstack([a, b])` لصق أفقي. `np.split(arr, 3)` تقسيم متساوٍ. `np.array_split` للتقسيم غير المتساوي. الخطأ: أبعاد غير متوافقة عند الدمج."),
("الجبر الخطي في NumPy","`A @ B` ضرب مصفوفات. `np.linalg.inv(A)` معكوس. `np.linalg.det(A)` محدد. `np.linalg.eig(A)` قيم ومتجهات ذاتية. `np.linalg.solve(A, b)` حل نظام معادلات. `np.linalg.norm(A)` معيار. الخطأ: مصفوفة شاذة (singular) — `inv` يفشل."),
("توليد الأرقام العشوائية","`np.random.seed(42)` للتكرار. `np.random.rand(10)` 10 أعداد بين 0 و 1. `np.random.randn(10)` توزيع طبيعي قياسي. `np.random.randint(0, 100, 10)` أعداد صحيحة. `np.random.choice(arr, 5)` اختيار عشوائي. الخطأ: نسيان seed — صعب إعادة إنتاج النتائج."),
],
"pandas": [
("مقدمة Pandas: Series و DataFrame","`import pandas as pd`. `df = pd.DataFrame({'name': ['Ali'], 'age': [25]})`. كل عمود هو Series. `df.head()` أول 5 صفوف. `df.info()` أنواع وذاكرة. `df.describe()` إحصائيات. `df.shape` الأبعاد. `df.columns` أسماء الأعمدة. الخطأ: الخلط بين DataFrame (2D) و Series (1D)."),
("قراءة وكتابة البيانات","`pd.read_csv('data.csv')`. `pd.read_excel('data.xlsx')`. `pd.read_json('data.json')`. `df.to_csv('out.csv', index=False)` يحفظ بدون فهرس. `encoding='utf-8'` للملفات العربية. `sep=';'` للفاصلة المنقوطة. الخطأ: نسيان `encoding` — تشوه النصوص العربية."),
("الفهرسة المتقدمة: loc و iloc","`.loc[row_label, col_label]` بالاسم. `.iloc[row_idx, col_idx]` بالرقم. `df.loc[df['age'] > 30, ['name', 'age']]` صفوف وأعمدة محددة. `df.iloc[0:5, 0:3]` أول 5 صفوف و 3 أعمدة. `df.at[0, 'name']` أسرع لقيمة واحدة. الخطأ: `df.loc[0]` — استخدم `iloc` للفهرسة الرقمية."),
("تصفية البيانات وفرزها","`df[df['age'] > 30]` الصفوف التي تحقق الشرط. `df[(df['age']>30) & (df['city']=='NY')]` شروط مركبة (& وليس and). `df.query('age > 30')`. `df.sort_values('age', ascending=False)`. `df[df['name'].str.contains('Ali')]`. الخطأ: `and` داخل القوس — استخدم `&`."),
("إضافة وتعديل وحذف الأعمدة","`df['new'] = df['a'] + df['b']` إضافة. `df['col'] *= 2` تعديل. `df.rename(columns={'old': 'new'})` تغيير اسم. `df.drop('col', axis=1)` حذف عمود. `df.drop([0, 1])` حذف صفوف. `df.assign(new=lambda x: x.a * 2)`. الخطأ: نسيان `axis=1` عند حذف عمود."),
("معالجة القيم المفقودة","`df.isna().sum()` يعدها. `df.dropna()` حذف. `df.fillna(value)` تعويض. `df.fillna(method='ffill')` تعبئة أمامية. `df.interpolate()` استنتاج. `df.dropna(subset=['important_col'])` يحذف فقط إذا كان العمود المهم فارغاً. الخطأ: `dropna()` على الجدول كله — يفقد بيانات كثيرة."),
("GroupBy: التجميع والتحليل","`df.groupby('category')['value'].mean()` متوسط كل فئة. `df.groupby('city').agg({'age': 'mean', 'salary': 'sum'})` دوال مختلفة. `transform` يضيف عموداً بنفس طول الأصل. `filter` يصفي المجموعات. الخطأ: `groupby` وحده بدون دالة تجميع — لا يعطي نتيجة."),
("دمج البيانات: merge, join, concat","`pd.merge(df1, df2, on='id', how='left')` دمج حسب عمود. `how`: left, right, inner, outer. `pd.concat([df1, df2])` تكديس صفوف. `pd.concat([df1, df2], axis=1)` لصق أعمدة. `df1.join(df2, on='key')`. الخطأ: دمج أعمدة بأنواع مختلفة (int مع str)."),
("السلاسل الزمنية","`pd.to_datetime(df['date'])` يحول النص لتاريخ. `df.set_index('date')`. `df.resample('M')['value'].mean()` تجميع شهري. `df['value'].rolling(7).mean()` متوسط متحرك. `df['value'].shift(1)` قيمة اليوم السابق. `df['date'].dt.dayofweek`. الخطأ: عمود تاريخ كنص — استخدم `to_datetime`."),
("Pivot Tables والجداول المحورية","`pd.pivot_table(df, values='sales', index='region', columns='product', aggfunc='sum')` جدول محوري. `margins=True` مجاميع. `fill_value=0`. `pd.crosstab(df['gender'], df['outcome'])` جدول تقاطعي. الخطأ: pivot_table لبيانات ضخمة — groupby يكفي."),
],
"math": [
("المتجهات Vectors","المتجه قائمة مرتبة من الأعداد: `v = np.array([1,2,3])`. الجمع: `v1 + v2` (عنصر بعنصر). الضرب القياسي Dot Product: `np.dot(v1, v2)` = مجموع جداء العناصر. الطول: `np.linalg.norm(v)`. في ML: كل صف بيانات هو متجه. الخطأ: الخلط بين dot product و element-wise multiplication."),
("المصفوفات Matrices","المصفوفة جدول أعداد: `A = np.array([[1,2],[3,4]])`. الأبعاد: صفوف × أعمدة. الجمع: عنصر بعنصر. الضرب: `A @ B` — صفوف A × أعمدة B. المصفوفات تمثل التحويلات الخطية. في الشبكات العصبية: كل طبقة = X @ W + b. الخطأ: أبعاد غير متوافقة — أعمدة A ≠ صفوف B."),
("ضرب المصفوفات في الشبكات العصبية","الطبقة الكثيفة: `output = input @ weights + bias`. إذا كان المدخل 784 بعداً والطبقة 128 عصبوناً: W مصفوفة 784×128. التدريب: البحث عن أفضل W و b. المصفوفات هنا ليست نظرية — إنها ما يحدث فعلاً في كل forward pass. الخطأ: عكس أبعاد المصفوفات."),
("معكوس المصفوفة Inverse","A⁻¹ يحقق A @ A⁻¹ = I. `np.linalg.inv(A)`. فقط المصفوفات المربعة غير الشاذة (det ≠ 0) لها معكوس. يستخدم في حل المعادلات الخطية. تكلفته الحسابية O(n³). الخطأ: `inv` على مصفوفة شاذة — `LinAlgError`."),
("محدد المصفوفة Determinant","`np.linalg.det(A)`. قيمة عددية: det=0 تعني المصفوفة شاذة ليس لها معكوس. القيمة المطلقة تحدد عامل تمدد المساحة. الإشارة تحدد الانعكاس. الخطأ: الاعتماد على المحدد للمصفوفات الكبيرة — غير مستقر عددياً."),
("القيم الذاتية والمتجهات الذاتية","`np.linalg.eig(A)`. المتجه الذاتي v: لا يتغير اتجاهه عند الضرب بـ A (يتمدد فقط). `Av = λv`. أساس PCA: المتجهات الذاتية = الاتجاهات الرئيسية. القيم الذاتية = أهمية كل اتجاه. الخطأ: `eig` لمصفوفة غير مربعة."),
("SVD: تحليل القيمة المنفردة","أهم تحليل مصفوفات في علم البيانات. A = U Σ V^T. `U, s, Vt = np.linalg.svd(A)`. أساس PCA. أساس أنظمة التوصية. ضغط الصور. الخطأ: استخدام SVD على مصفوفة ضخمة — O(min(mn², m²n))."),
("المشتقة Derivative","تقيس معدل تغير الدالة: ميل المماس عند نقطة. `f'(x) = lim(h→0) [f(x+h)-f(x)]/h`. في ML: مشتقة loss تخبرنا كيف نغير الأوزان. `f'(x) > 0`: الدالة تتزايد. `f'(x) < 0`: الدالة تتناقص. الخطأ: الخلط بين المشتقة وقيمة الدالة نفسها."),
("Chain Rule: أساس Backpropagation","مشتقة دالة مركبة: `d/dx f(g(x)) = f'(g(x)) * g'(x)`. هذا هو جوهر Backpropagation! الخطأ ينتشر للخلف طبقة بطبقة. كل طبقة: gradient الداخل = gradient الخارج × مشتقة دالة التنشيط. الخطأ: نسيان ضرب مشتقات كل الطبقات."),
("المشتقات الجزئية والتدرج Gradient","لدالة f(x,y): ∂f/∂x تعامل y كثابت. التدرج = متجه المشتقات الجزئية: `∇f = [∂f/∂x, ∂f/∂y]`. يشير لأسرع اتجاه للصعود. في ML: التدرج يخبرنا كيف نغير كل وزن. الخطأ: حساب ∂f/∂x بدون تثبيت المتغيرات الأخرى."),
("Gradient Descent: خوارزمية التحسين","خوارزمية: 1- ابدأ من نقطة عشوائية. 2- احسب التدرج. 3- تحرك عكس التدرج: `w = w - lr * ∇f`. 4- كرر. `lr` (معدل التعلم): صغير = بطيء، كبير = تذبذب. Batch: كل البيانات. Mini-Batch: الأفضل. SGD: عينة واحدة. الخطأ: lr غير مناسب."),
("مقارنة Optimizers: SGD, Momentum, Adam","SGD: تحديث بسيط. Momentum: يستمر في نفس الاتجاه — يتجاوز الهضاب الصغيرة. RMSprop: يكيف lr لكل معامل. Adam: يجمع Momentum + RMSprop — الأفضل افتراضياً. `Adam(learning_rate=0.001)`. الخطأ: تغيير optimizer قبل ضبط learning rate."),
("الاحتمالات الأساسية","`P(A)` = عدد النواتج المواتية ÷ الكلية. قيمة بين 0 و 1. `P(not A) = 1 - P(A)`. الأحداث المستقلة: `P(A∩B) = P(A) × P(B)`. الأحداث المتنافية: `P(A∪B) = P(A) + P(B)`. الخطأ: الخلط بين الاستقلال والتنافي."),
("الاحتمال الشرطي ونظرية Bayes","`P(A|B) = P(A∩B) / P(B)`. احتمال A بشرط أن B قد حدث. Bayes: `P(A|B) = P(B|A) × P(A) / P(B)`. أساس Naive Bayes. `P(A|B) ≠ P(B|A)` — اتجاه الشرط مهم. الخطأ: عكس الشرط."),
("التوزيع الطبيعي Gaussian","أهم توزيع إحصائي: منحنى الجرس. يحدد بـ μ (المتوسط) و σ (الانحراف). 68% ضمن μ±σ. 95% ضمن μ±2σ. 99.7% ضمن μ±3σ. أساس اختبارات الفرضيات. `np.random.normal(0, 1, 1000)`. الخطأ: افتراض التوزيع الطبيعي للبيانات المنحرفة."),
("اختبار الفرضيات و p-value","H0 (العدم): لا فرق. H1 (البديل): يوجد فرق. p-value: احتمال ملاحظة بيانات متطرفة لو H0 صحيحة. p < 0.05: نرفض H0 (معنوي إحصائياً). Type I Error: رفض H0 خطأ. Type II: قبول H0 خطأ. الخطأ: p=0.051 ليست 'تقريباً معنوية'."),
("الارتباط Correlation","Pearson r: قوة واتجاه العلاقة الخطية (-1 إلى +1). r=1: طردي تام. r=0: لا علاقة خطية. r=-1: عكسي تام. `df.corr()` مصفوفة الارتباط. Spearman: للعلاقات غير الخطية. الخطأ: Correlation ≠ Causation — الارتباط لا يعني السببية."),
("PCA: تحليل المكونات الأساسية","يختزل الأبعاد مع الحفاظ على التباين. المكون الأول = اتجاه أكبر تباين. `PCA(n_components=0.95)` يحتفظ بـ 95% تباين. يجب scaling قبل PCA. المكونات الجديدة غير مرتبطة ببعضها. الخطأ: عدم Scaling — المتغيرات الكبيرة تسيطر."),
],
"ml": [
("ما هو تعلم الآلة؟","تعليم الحاسوب من البيانات بدل برمجته. Supervised: بيانات معنونة (تصنيف، انحدار). Unsupervised: بدون تسميات (تجميع). Reinforcement: التعلم من المكافآت. `model.fit(X, y)` يتعلم، `model.predict(X_new)` يتنبأ. الخطأ: استخدام ML لمشكلة قاعدة if-else تحلها."),
("سير عمل مشروع ML والـ API","1- فهم المشكلة. 2- جمع البيانات. 3- تنظيف. 4- EDA. 5- هندسة ميزات. 6- اختيار نموذج. 7- تدريب. 8- تقييم. 9- ضبط. 10- نشر. Scikit-learn API: `model = Estimator()`, `model.fit(X_train, y_train)`, `model.predict(X_test)`. الخطأ: القفز للخطوة 6 قبل 1-5."),
("Linear Regression: أساس الانحدار","`y = wx + b`. `model.fit(X, y)`. `model.coef_` الأوزان. `model.intercept_` الانحياز. `model.score(X, y)` R². يفترض علاقة خطية. سريع وشفاف — تعرف بالضبط كيف يتنبأ. `from sklearn.linear_model import LinearRegression`. الخطأ: استخدامه للعلاقات غير الخطية."),
("دالة التكلفة MSE: قياس الخطأ","MSE = متوسط مربع الخطأ = `(1/n) Σ(y_true - y_pred)²`. يعاقب الأخطاء الكبيرة بشدة. عندما y_pred=y_true تماماً، MSE=0. MAE = متوسط |الخطأ| — أقل تأثراً بالقيم الشاذة. `from sklearn.metrics import mean_squared_error`. الخطأ: MSE وحده لا يكفي — أضف MAE و R²."),
("Gradient Descent: كيف يتعلم الانحدار","`w = w - lr * ∂MSE/∂w`. المشتقة تخبرنا: هل نزيد w أم ننقصه؟ `lr` (معدل التعلم): 0.001 بداية جيدة. Batch: كل البيانات. Mini-Batch (32): الأفضل توازناً. SGD: عينة واحدة — سريع لكن متذبذب. الخطأ: lr كبير — loss يتأرجح ولا يتقارب."),
("تقييم الانحدار: R², RMSE, MAE","R²: نسبة التباين الذي يفسره النموذج (1 مثالي، 0 = المتوسط، سالب = أسوأ من المتوسط). RMSE = √MSE (بنفس وحدة y). MAE: متوسط |الخطأ|. Residual Plot: هل الأخطاء عشوائية؟ `model.score(X_test, y_test)` يعطي R². الخطأ: R² العالي لا يعني نموذجاً جيداً."),
("Logistic Regression: التصنيف الثنائي","يصنف باستخدام Sigmoid: `P(y=1) = 1/(1+e^-(wx+b))`. مخرج = احتمال بين 0 و 1. العتبة 0.5. `LogisticRegression(penalty='l2', C=1.0)`. `predict_proba` للاحتمالات. `multi_class='multinomial'` للتصنيف المتعدد. الخطأ: للبيانات غير القابلة للفصل خطياً."),
("تقييم التصنيف: Confusion Matrix, ROC, F1","Confusion Matrix: [[TN, FP], [FN, TP]]. Accuracy = (TP+TN)/total. Precision = TP/(TP+FP) — دقة التنبؤات الموجبة. Recall = TP/(TP+FN) — كم من الموجب اكتشفنا. F1 = المتوسط التوافقي. ROC-AUC: أداء النموذج عبر العتبات. الخطأ: Accuracy لبيانات غير متوازنة."),
("Decision Trees: أشجار القرار","في كل عقدة: اختر الميزة + العتبة التي 'تنقي' البيانات أكثر. Gini Impurity: قياس النقاء. `DecisionTreeClassifier(max_depth=5)`. مزايا: قابلة للتفسير، لا تحتاج scaling. عيوب: عرضة لـ overfitting. `plot_tree(model)` للرسم. الخطأ: شجرة عميقة بدون تقليم — overfitting."),
("Random Forest: غابة عشوائية","مجموعة أشجار قرار تصوت معاً. `n_estimators=100`. كل شجرة: عينة عشوائية من البيانات + عينة عشوائية من الميزات. `feature_importances_` للأهمية. تقلل overfitting. لا تحتاج scaling. الخطأ: `n_estimators` قليل جداً (<50)."),
("Cross-Validation: تقييم موثوق","K-Fold: قسم لـ k أجزاء. درب على k-1، اختبر على 1. كرر k مرات. `cross_val_score(model, X, y, cv=5)`. المتوسط ± انحراف معياري. يقلل تأثير 'حظ' التقسيم. `StratifiedKFold` يحافظ على نسب الفئات. الخطأ: Scaling قبل CV — Data Leakage."),
("Overfitting و Underfitting","Overfitting: النموذج يحفظ ولا يعمم. علامات: فجوة train/test score. Underfitting: النموذج بسيط جداً. علامات: train و test كلاهما سيئ. Validation Curve للتشخيص. Learning Curve: هل تحتاج بيانات أكثر؟ الخطأ: الثقة بـ training score."),
("Regularization: Lasso, Ridge, Elastic Net","Ridge (L2): `α Σ w²` — يقلص الأوزان. Lasso (L1): `α Σ |w|` — يصفر الميزات غير المهمة. Elastic Net: يجمع L1+L2. `alpha` يتحكم في القوة. يقلل Overfitting. الخطأ: alpha كبير جداً — يصفر كل شيء."),
("Gradient Boosting و XGBoost","أشجار بالتسلسل: كل شجرة تصحح أخطاء السابقة. `XGBClassifier(n_estimators=100, learning_rate=0.1)`. Regularization مدمج. `early_stopping_rounds`. أقوى النماذج الجدولية. LightGBM: أسرع. CatBoost: أفضل للفئوية. الخطأ: `learning_rate` عالي + `n_estimators` كبير."),
("K-Means: التجميع","يقسم البيانات لـ k مجموعة: 1- مراكز عشوائية. 2- أسند لأقرب مركز. 3- حدث المراكز. 4- كرر. `KMeans(n_clusters=5)`. Elbow Method لاختيار k. Silhouette Score للتقييم. يحتاج scaling. الخطأ: k كبير — over-segmentation."),
("Pipelines و Data Leakage","`Pipeline([('scaler', StandardScaler()), ('model', LogisticRegression())])`. يمنع Data Leakage. يضمن نفس التحويلات على train و test. Data Leakage: تسرب معلومات الاختبار للتدريب — أخطر خطأ في ML. الخطأ: خطوات يدوية خارج Pipeline."),
("Grid Search وضبط المعاملات","`GridSearchCV(model, param_grid, cv=5)`. يجرب كل تركيبات المعاملات. `best_params_`, `best_score_`. `RandomizedSearchCV` للمساحات الكبيرة. `Optuna`: Bayesian Optimization. الخطأ: GridSearch على كل البيانات بدون CV."),
("Ensemble Methods: التصويت والتجميع","Voting: عدة نماذج تصوت. Hard: الأغلبية. Soft: متوسط الاحتمالات (أفضل). Bagging: نماذج متوازية على عينات مختلفة. Boosting: نماذج متسلسلة تصحح الأخطاء. Stacking: نموذج meta يتعلم من تنبؤات النماذج الأساسية. الخطأ: كل النماذج من نفس النوع."),
],
"dl": [
("ما هي الشبكة العصبية؟","طبقات من العصبونات المترابطة. كل عصبون: يجمع المدخلات × الأوزان + الانحياز، يمرر عبر دالة تنشيط. `Dense(64, activation='relu', input_shape=(784,))`. `model.compile(optimizer='adam', loss='...')`. `model.fit(X, y, epochs=10)`. الخطأ: عدم تسوية المدخلات — لا يتقارب."),
("Forward Propagation: كيف تتنبأ الشبكة","المدخلات تمر عبر الطبقات: `a¹ = activation(W¹ @ x + b¹)`. `a² = activation(W² @ a¹ + b²)`. ... `ŷ = aᴸ` (المخرج). كل طبقة تحول المدخلات. `model.predict(X)` ينفذ forward pass. الخطأ: نسيان دالة التنشيط — الشبكة تصبح خطية بحتة."),
("Backpropagation: كيف تتعلم الشبكة","1- Forward: احسب ŷ. 2- Loss: احسب الخطأ. 3- Backward: احسب ∂Loss/∂W لكل طبقة (Chain Rule). 4- حدث: `W = W - lr * ∂Loss/∂W`. `model.fit` يفعل كل هذا. الخطأ: افتراض أن الشبكة 'تتعلم' سحرياً."),
("دوال التنشيط: ReLU, Sigmoid, Tanh, Softmax","ReLU: `max(0, x)` — الأكثر استخداماً، تحل vanishing gradient. Sigmoid: `1/(1+e^-x)` — للتصنيف الثنائي (طبقة الإخراج). Tanh: `(e^x-e^-x)/(e^x+e^-x)` — للمخرجات بين -1 و 1. Softmax: للتصنيف المتعدد (يحول لاحتمالات). الخطأ: ReLU في طبقة الإخراج للتصنيف."),
("دوال التكلفة Loss Functions","MSE: للانحدار. Binary Cross-Entropy: للتصنيف الثنائي. Categorical Cross-Entropy: للتصنيف المتعدد. `loss='categorical_crossentropy'`. مراقبة loss أثناء التدريب أهم مؤشر. الخطأ: loss لا يتناسب مع المهمة."),
("Optimizers: SGD, Adam, RMSprop","SGD: `w = w - lr * ∇w`. Momentum: يضيف زخماً. RMSprop: يكيف lr لكل معامل. Adam: يجمع Momentum + RMSprop — الأفضل افتراضياً. `Adam(learning_rate=0.001)`. الخطأ: تغيير optimizer قبل ضبط learning rate."),
("Dropout: منع Overfitting","يعطل عشوائياً نسبة من العصبونات في كل خطوة تدريب. `Dropout(0.2)` — 20% معطلة. يمنع الاعتماد المفرط على عصبونات محددة. في التنبؤ: كل العصبونات نشطة. `rate=0.5` للطبقات الكثيفة. الخطأ: Dropout في طبقة الإخراج."),
("Batch Normalization","يطبع المدخلات لكل mini-batch (متوسط 0، انحراف 1). `BatchNormalization()`. يسمح بـ learning rate أعلى. يقلل الحساسية للتهيئة. يوضع قبل activation. `training=True/False` يؤثر على السلوك. الخطأ: BatchNorm بعد Activation."),
("Early Stopping","يوقف التدريب عندما يتوقف تحسن validation loss. `EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)`. `patience` يسمح بتذبذب مؤقت. يمنع overfitting ويوفر الوقت. الخطأ: عدم استخدام Early Stopping."),
("Convolutional Neural Networks CNN","مرشحات صغيرة (3×3) تمر على الصورة وتستخلص ميزات. `Conv2D(32, (3,3), activation='relu')`. Pooling: يقلص الأبعاد. Flatten + Dense للتصنيف. الطبقات الأولى: حواف. الوسطى: أنماط. الأخيرة: كائنات. الخطأ: `Conv2D` بدون `input_shape`."),
("Transfer Learning","استخدم نموذجاً مدرباً مسبقاً (VGG16, ResNet). `include_top=False`. ثبت طبقات القاعدة. أضف طبقاتك. وفر أسابيع من التدريب. Fine-Tune: فك تجميد جزئي + lr منخفض. الخطأ: تدريب القاعدة من الصفر مع بيانات قليلة."),
("Data Augmentation","يزيد البيانات بالتحويلات: `RandomFlip`, `RandomRotation`, `RandomZoom`. يمنع overfitting. للصور: قلب أفقي، تدوير، تكبير. `ImageDataGenerator` أو `tf.keras.layers`. الخطأ: تحويلات مبالغ فيها — صور غير واقعية."),
("LSTM: الذاكرة الطويلة المدى","للبيانات التسلسلية. ثلاث بوابات: Forget (ماذا ننسى)، Input (ماذا نخزن)، Output (ماذا نخرج). `LSTM(64, return_sequences=True)`. تحل Vanishing Gradient في RNN. `return_state=True` لـ Seq2Seq. الخطأ: `return_sequences=False` عند تكديس الطبقات."),
],
"nlp": [
("Text Preprocessing: تنظيف النص","`lower()` لتوحيد الحالة. إزالة علامات الترقيم والأرقام. `tokenize`: تقسيم لكلمات. `stop words`: إزالة الكلمات الشائعة (ال، من، في...). `stemming`: أصل الكلمة (يلعب ← لعب). `lemmatization`: الجذر اللغوي (أدق). الخطأ: إزالة stop words قبل NER."),
("Bag of Words و TF-IDF","BoW: متجه تعدادات الكلمات. يفقد الترتيب. TF-IDF: Term Frequency × Inverse Document Frequency — يقلل وزن الكلمات الشائعة. `TfidfVectorizer(max_features=5000, ngram_range=(1,2))`. `ngram_range` يضيف أزواج كلمات. الخطأ: بدون إزالة stop words."),
("Word Embeddings: Word2Vec, GloVe","كل كلمة = متجه كثيف (100-300 بعد). Word2Vec: يتعلم من السياق (Skip-gram أو CBOW). GloVe: مصفوفة تكرار مشترك. المتجهات القريبة = معانٍ متقاربة. king - man + woman ≈ queen. `gensim.models.Word2Vec`. الخطأ: تدريب على نصوص قليلة."),
("Sentiment Analysis: تحليل المشاعر","تصنيف النص لإيجابي/سلبي/محايد. VADER: للتحليل البسيط (lexicon-based). تدريب مصنف: Logistic Regression + TF-IDF. التحديات: السخرية، النفي ('لست سعيداً')، السياق. `nltk.sentiment` أو `TextBlob`. الخطأ: اعتبار كل 'جيد' إيجابياً."),
("Text Classification: تصنيف النصوص","Naive Bayes: سريع، بسيط، ممتاز للنصوص. SVM: جيد للأبعاد العالية. Deep Learning: LSTM, CNN, BERT. One-vs-Rest للتصنيف المتعدد. Multi-label: تصنيفات متعددة لكل نص. `classification_report`. الخطأ: Naive Bayes للنصوص الطويلة — يفقد السياق."),
("NER: Named Entity Recognition","استخراج الكيانات: أشخاص، منظمات، مواقع، تواريخ. BIO tagging: Beginning, Inside, Outside. `spaCy`: `doc.ents`. تدريب: CRF أو BiLSTM-CRF. التحدي: 'Washington' شخص أم مدينة؟ السياق يحدد. الخطأ: NER بدون سياق كافٍ."),
("Self-Attention: أساس Transformers","كل كلمة 'تنتبه' لكل الكلمات الأخرى. `Attention(Q,K,V) = softmax(QK^T/√d_k)V`. يلتقط العلاقات بعيدة المدى. موازٍ (ليس تسلسلياً مثل RNN). Multi-Head: عدة attentions بالتوازي. الأساس لـ BERT, GPT. الخطأ: نسيان scaling بـ √d_k."),
("BERT: Bidirectional Encoder","يرى الكلمة في سياق ما قبلها وما بعدها. تدرب على Masked Language Modeling. `[CLS]` token للتصنيف. `bert-base-uncased`: 110M معامل. Fine-tune: أضف طبقة تصنيف ودرب. `transformers` library. الخطأ: تدريب BERT من الصفر."),
("GPT: Generative Pre-trained Transformer","يتنبأ بالكلمة التالية (autoregressive). يرى فقط ما قبل الكلمة. GPT-3: 175B معامل — يولد نصوصاً مذهلة. GPT-4: أكبر وأقوى. `pipeline('text-generation', model='gpt2')`. الخطأ: استخدام GPT للتصنيف — BERT أفضل."),
("Hugging Face: مستودع النماذج","مكتبة موحدة لآلاف النماذج المدربة. `pipeline('sentiment-analysis')` — جاهز للاستخدام. `AutoModel.from_pretrained('bert-base')`. `Trainer` API للتدريب. Model Hub: تصفح وتحميل. `tokenizer = AutoTokenizer.from_pretrained(...)`. الخطأ: تحميل نموذج كبير جداً."),
],
}


# ── التصنيف الذكي للمفاهيم حسب اسم المرحلة ──
def pick(slug, stage_name, unit_name, li, n=5):
    """Select concepts sequentially from the bank based on lesson index.
    Each lesson i gets concept bank[i % len(bank)] as its primary concept.
    This ensures natural progression within units."""
    t = (stage_name + " " + unit_name).lower()
    if any(w in t for w in ["cnn","lstm","rnn","gru","keras","tensorflow","dropout","batch norm","شبكة عصبية","شبكات عصبية","العميقة","تعلم عميق","transfer learning","fine-tun","backprop","relu","adam","gan","autoencoder","vae","conv","pooling","tensorboard","callbacks","functional api","generator","discriminator","style transfer","dcgan","resnet","vgg","inception","flask api","fastapi","docker","tensorflow serving","onnx","التفافي","augmentation","data aug","توليدية"]):
        bank = B["dl"]
    elif any(w in t for w in ["nlp","لغة طبيعية","tokeniz","sentiment","bert","gpt","transformer","attention","tf-idf","word2vec","seq2seq","text classification","تصنيف النص","تحليل النص","معالجة النص","named entity","ner","topic model","hugging face"]):
        bank = B["nlp"]
    elif any(w in t for w in ["رياضيات","إحصاء","احتمال","مشتقة","تفاضل","جبر","pca","svd","correlation","eigen","hypothesis","optimization","chain rule","normal distribution","bayes theorem","confidence interval","p-value","big o","algorithm analysis","تعقيد","خوارزمي"]):
        bank = B["math"]
    elif any(w in t for w in ["انحدار","regression","تصنيف","classification","clustering","تجميع","scikit","decision tree","random forest","xgboost","gradient boost","cross-val","overfit","underfit","grid search","pipeline","bayes","knn","svm","ensemble","stacking","boosting","bagging","k-means","dbscan","gradient descent","learning rate","regularization","lasso","ridge","elastic net","polynomial","bias-variance","confusion matrix","roc","auc","precision","recall","f1","accuracy","feature select","feature engine","train test split","data leakage"]):
        bank = B["ml"]
    elif any(w in t for w in ["numpy","مصفوف","array","num","جبر خطي","متجه","vector","matrix"]):
        bank = B["numpy"]
    elif any(w in t for w in ["pandas","dataframe","groupby","merge","pivot","قيم مفقودة"]):
        bank = B["pandas"]
    else:
        bank = B["python"]
    
    # Sequential selection: lesson li gets concepts starting at index (li-1)*3
    # This creates natural progression within each unit
    # For small banks, adds suffixes to distinguish repeated concepts
    sel = []
    seen = {}
    base = ((li - 1) * 3) % len(bank)
    for i in range(n):
        idx = (base + i) % len(bank)
        cname, cexpl = bank[idx]
        short = cname.split(":")[0].split("(")[0].strip()
        cnt = seen.get(short, 0)
        seen[short] = cnt + 1
        if cnt > 0:
            sel.append((f"{cname} (استمرار {cnt+1})", cexpl))
        else:
            sel.append(bank[idx])
    return sel
def make_bridge(prev, curr):
    return [
        f"الآن وقد أتقنتَ {prev}، نرتقي إلى {curr} — مهارة تبني على ما تعلمته وتضيف بُعداً جديداً.",
        f"في الدرس السابق فككنا {prev}. اليوم نبني على تلك المعرفة ونتعلم {curr}.",
        f"بعد {prev}، هناك فجوة — و {curr} يسدها. هذا الفارق بين من 'يعرف' ومن 'يتقن'.",
        f"كل مفهوم يبنى على سابقه. {prev} كان الأساس. اليوم {curr} هو الطابق التالي.",
    ][h(prev+curr)%4]

def generate_lessons(unit_code, unit_name, stage_name, slug, n=10):
    lessons = []; prev = "المفاهيم الأساسية"
    for li in range(1, n+1):
        concepts = pick(slug, stage_name, unit_name, li, 3+(h(f"{unit_code}_{li}")%3))
        nm = 2+(h(f"{unit_code}_{li}")%2)
        mistakes = [MISTAKES[(h(f"{unit_code}_{li}_{mi}"))%len(MISTAKES)] for mi in range(nm)]
        used_m = set(); lm = []
        for m in mistakes:
            if m[0][:30] not in used_m: used_m.add(m[0][:30]); lm.append({"mistake":f"{m[0]}\n{m[1]}","correction":m[2],"treatment":m[3],"severity":m[4]})
        title = concepts[0][0].split(":")[0].split("(")[0].strip()
        lessons.append({"lesson_index":li,"name":title,"goal":f"فهم وتطبيق {title} عملياً",
            "bridge_sentence":make_bridge(prev,title),
            "prerequisite_lessons":[] if li==1 else [f"{unit_code}.{li-1}"],
            "enables_lessons":[] if li==n else [f"{unit_code}.{li+1}"],
            "final_check_question":f"اشرح {title} بكلماتك. اكتب كوداً يوضح استخدامه. ما أشهر خطأ يجب تجنبه؟",
            "session_complete_criterion":f"يشرح الطالب {title} ويكتب كوداً عملياً يطبقه",
            "yemeni_examples":[f"تطبيق عملي لـ {title} في سيناريو حقيقي."],
            "expected_duration_minutes":30,"estimated_gem_cost":90,
            "solution_outline":f"خطوات تطبيق {title}:\n1. فهم الأساس النظري\n2. كتابة الكود\n3. التجربة بمدخلات مختلفة\n4. تحليل النتائج\n5. التوثيق",
            "motivation_hook":f"{title} من أكثر المهارات طلباً في سوق الذكاء الاصطناعي.",
            "learning_objectives":[{"statement":f"يفهم {title}","bloom_level":"understand"},{"statement":f"يطبق {title}","bloom_level":"apply"}],
            "glossary":[],"concepts":[{"name":c[0],"explanation":c[1],"mastery_criterion":f"يشرح {c[0][:30]}","weight":2 if i==0 else 1} for i,c in enumerate(concepts)],
            "common_mistakes":lm}); prev = title
    return lessons

def generate_labs(unit_code, unit_name, n_lessons, slug):
    return [{"lab_index":li,"title":f"معمل {unit_name}: {'التشخيص' if li==1 else 'التطبيق'}",
        "scenario":f"مشكلة تقنية في {unit_name}. حللها وقدم حلاً عملياً.","completion_criterion":f"تحليل وحل لمشكلة في {unit_name}",
        "pedagogical_sequence":"diagnostic → decision → application → analysis → connection",
        "prerequisite_lessons":[f"{unit_code}.{n_lessons//2}"],"allowed_tools":["text","code"],
        "questions":[
            {"kind":"diagnostic","prompt":f"ما خطوات تشخيص مشكلة في {unit_name}؟","rubric":"4 خطوات منطقية","solution_outline":"1. جمع 2. تحليل 3. تحديد 4. اقتراح","points":1},
            {"kind":"decision","prompt":f"خياران لحل في {unit_name}. معايير اختيارك؟","rubric":"معياران مع تبرير","solution_outline":"الدقة، السرعة، التعقيد","points":1},
            {"kind":"application","prompt":f"اكتب كوداً يطبق {unit_name}.","rubric":"كود يعمل وينتج نتائج","solution_outline":"import, data, apply, evaluate","points":2},
            {"kind":"analysis","prompt":f"كود لـ {unit_name} فيه 3 أخطاء. اكتشفها وصححها.","rubric":"3 أخطاء مع شرح","solution_outline":"تحليل وتصحيح","points":1},
            {"kind":"connection","prompt":f"اربط {unit_name} بمهارات سابقة في مشروع متكامل.","rubric":"رابطان + فكرة مشروع","solution_outline":"الربط + خطة مشروع","points":1}]} for li in range(1,3)]

def gen_exam(code, scope, n=10):
    qs = [
        ("أي مما يلي يُعتبر الخطوة الأولى في مشروع ML؟",["فهم المشكلة","تطبيق أحدث خوارزمية","جمع بيانات ضخمة","كتابة الكود"],0,1,"بدون هدف واضح، أفضل خوارزمية لن تعطي نتيجة مفيدة."),
        ("ما الفرق بين التعلم المراقب وغير المراقب؟",["المراقب يحتاج تسميات","لا فرق","المراقب أسرع","غير المراقب أدق"],0,1,"المراقب (Supervised) يستخدم بيانات معنونة، وغير المراقب يكتشف الأنماط بدون تسميات."),
        ("ما هو Overfitting؟",["النموذج يحفظ ولا يعمم","النموذج بسيط جداً","النموذج سريع","النموذج قليل البيانات"],0,2,"Overfitting: أداء ممتاز على التدريب، فشل على البيانات الجديدة."),
        ("الغرض من Cross-Validation:",["تقييم أكثر موثوقية","تسريع التدريب","زيادة البيانات","تغيير الخوارزمية"],0,2,"CV يقسم لـ k أجزاء ويتأكد من ثبات الأداء عبر التقسيمات."),
        ("دالة التنشيط الأكثر استخداماً في الطبقات المخفية:",["ReLU","Sigmoid","Softmax","Linear"],0,2,"ReLU تحل Vanishing Gradient وتدرب الشبكات العميقة بكفاءة."),
        ("ما وظيفة Dropout؟",["منع Overfitting","تسريع التدريب","تكبير النموذج","تغيير التنشيط"],0,2,"يعطل عشوائياً عصبونات لمنع الاعتماد المفرط."),
        ("أي نموذج مناسب للتصنيف الثنائي؟",["Logistic Regression","Linear Regression","K-Means","PCA"],0,2,"Logistic Regression يستخدم Sigmoid لإخراج احتمالات بين 0 و 1."),
        ("ما هو Data Leakage؟",["تسرب معلومات الاختبار للتدريب","فقدان البيانات","تسرب الذاكرة","توقف التدريب"],0,2,"تسرب معلومات من الاختبار للتدريب = تقييم وهمي عالٍ ينهار في الإنتاج."),
        ("ما فائدة Transfer Learning؟",["استخدام نموذج مدرب مسبقاً","نقل البيانات","تغيير اللغة","تحويل الصيغة"],0,2,"يوفر أسابيع من التدريب بإعادة استخدام أوزان مدربة على بيانات ضخمة."),
        ("ما هو Transformer المستخدم في؟",["BERT و GPT","CNN فقط","K-Means","Linear Regression"],0,3,"Self-Attention هو أساس كل نماذج اللغة الحديثة."),
    ]
    variants = []
    for v in range(3):
        vq = []
        for qi in range(n):
            p,c,ci,d,e = qs[(h(f"{code}_{v}_{qi}"))%len(qs)]
            vq.append({"question_index":qi+1,"kind":"mcq","prompt":p,"choices":[f"{chr(1571+ci)})\u200f {ch}" for ci,ch in enumerate(c)],"correct_index":ci,"explanation":e,"difficulty":d,"points":1,"time_limit_seconds":60+d*30})
        variants.append(vq)
    return {"code":code,"scope":scope,"variants":variants}

def gen_placement():
    qs = [
        (1,"مخرج `print(type(3.14))`:",["<class 'float'>","<class 'int'>","<class 'str'>","<class 'bool'>"],0,1),
        (1,"أي مما يلي ينشئ قائمة بالأعداد الزوجية 0-9؟",["[x for x in range(10) if x%2==0]","list(range(even))","[x for x in range(10) if x/2==0]","[x for x in even(10)]"],0,1),
        (2,"وظيفة `df.describe()`:",["إحصائيات وصفية","حذف الفارغات","رسم بياني","تغيير الأسماء"],0,1),
        (2,"أي معامل في `np.linspace(0,1,5)` يحدد عدد النقاط؟",["الثالث","الأول","الثاني","لا يوجد"],0,1),
        (3,"نموذج مناسب للتصنيف الثنائي:",["Logistic Regression","Linear Regression","K-Means","PCA"],0,2),
        (3,"الغرض من `train_test_split`:",["تقسيم البيانات","تسريع التدريب","زيادة البيانات","تغيير النوع"],0,2),
        (4,"وظيفة `Conv2D` في Keras:",["عملية الالتفاف","تسطيح","Dropout","تغيير التنشيط"],0,2),
        (4,"فائدة Transfer Learning:",["استخدام نموذج مدرب مسبقاً","نقل البيانات","تغيير اللغة","تحويل الصيغة"],0,2),
        (5,"ما هي MLOps؟",["تشغيل نماذج ML في الإنتاج","نوع خوارزميات","لغة برمجة","قاعدة بيانات"],0,3),
        (5,"Transformer Architecture يستخدم في:",["BERT و GPT","CNN فقط","K-Means","Linear Regression"],0,3),
    ]
    return [{"target_level_index":l,"kind":"mcq","prompt":p,"choices":[f"{chr(1571+ci)})\u200f {c}" for ci,c in enumerate(c)],"correct_index":ci,"difficulty":d,"explanation":f"مستوى {l}"} for l,p,c,ci,d in qs]


CURRICULUM = {
    "specialty": {"slug":"uni-ai","name":"الذكاء الاصطناعي","icon":"🤖",
        "desc":"منهج متكامل: من Python والرياضيات إلى الشبكات العميقة ونشر النماذج. كل درس خطوة عملية نحو الاحتراف.",
        "scope":"professional_track","language":"ar","region":"YE",
        "target_persona":"طالب يمتلك أساسيات البرمجة ويريد التخصص في الذكاء الاصطناعي. مستعد للتعلم العميق والتطبيق العملي.",
        "teacher_tone":"مباشرة، عملية، ومتعمقة: نشرح كل مفهوم بخطوات واضحة وننتقل فوراً للكود.",
        "viz":["python_trace","flowchart","scatter_plot","line_chart","bar_chart","heatmap","tree_diagram"],
        "tools":["text","code","image"],
        "glossary":[{"term":"Gradient Descent","definition":"خوارزمية تحسين تبحث عن أقل نقطة في دالة التكلفة"},{"term":"Neural Network","definition":"نموذج تعلم عميق من طبقات عصبونات مترابطة"}]},
    "levels": [
        ("المستوى الأول: Python والتفكير البرمجي","إتقان Python، هياكل البيانات، الخوارزميات، NumPy، Pandas","apply",[
            ("أساسيات Python: من الصفر لأول برنامج","كتابة كود Python بطلاقة",["تشغيل أول برنامج: print و comments والمفسر","المتغيرات والأنواع: int, float, str, bool","العمليات الحسابية والمنطقية","الشروط واتخاذ القرار: if, elif, else","الحلقات: for, while, break, continue","القوائم List: الإضافة، الحذف، الفهرسة","القواميس Dict: المفاتيح والقيم","الدوال Functions: التعريف والاستدعاء","مشروع: آلة حاسبة علمية"]),
            ("هياكل البيانات: تنظيم المعلومات","List, Tuple, Set, Dict",["List Comprehensions: بناء القوائم بسطر واحد","التقطيع Slicing: الوصول لأجزاء دقيقة","Tuple: البيانات الثابتة","Set: المجموعات وإزالة التكرار","Dict Comprehensions: القواميس باختصار","فرز وتصفية البيانات: sorted و filter","Lambda: الدوال السريعة","قياس الأداء: لماذا Set أسرع من List","مشروع: نظام إدارة مكتبة"]),
            ("البرمجة الكائنية OOP","Classes, Inheritance, Polymorphism",["Classes و Objects: القالب والنسخة","Constructor __init__ والخصائص","التغليف Encapsulation: حماية البيانات","الوراثة Inheritance: extends و super","تعدد الأشكال Polymorphism","Property Decorators و Magic Methods","الكلاسات المجردة ABC","Composition مقابل Inheritance","مشروع: محاكاة نظام بنكي"]),
            ("الخوارزميات: التفكير المنظم","تحليل المشكلات وتصميم الحلول",["ما هي الخوارزمية؟ تعريفها وخصائصها","تحليل التعقيد Big O Notation","البحث الخطي والثنائي","خوارزميات الترتيب: Bubble, Selection","Merge Sort و Quick Sort","التكرار الذاتي Recursion","البرمجة الديناميكية DP","Greedy و Backtracking","مشروع: حل متاهة بـ BFS"]),
            ("NumPy: الحوسبة العددية","Arrays، العمليات المتجهة، الجبر الخطي",["لماذا NumPy؟ مقارنة السرعة مع Python","إنشاء المصفوفات: zeros, ones, arange","الفهرسة والتقطيع في NumPy","العمليات المتجهة Vectorized","الدوال الإحصائية: mean, median, std","Boolean Masking والتصفية","إعادة التشكيل: reshape, flatten","الدمج والتقسيم: concatenate, split","مشروع: تحليل إحصائي لمجموعة بيانات"]),
            ("Pandas: تحليل البيانات الجدولية","DataFrame، تنظيف البيانات، GroupBy",["DataFrame و Series: هيكلا البيانات","قراءة وكتابة CSV, Excel, JSON","الفهرسة: loc و iloc","تصفية البيانات وإضافة الأعمدة","القيم المفقودة: isna, fillna, dropna","GroupBy: split-apply-combine","دمج البيانات: merge, join, concat","Pivot Tables والجداول المحورية","مشروع: تحليل بيانات مبيعات"]),
            ("مشروع المستوى: نظام تحليل بيانات","تطبيق كل مهارات Python, NumPy, Pandas",["تحديد المشكلة والأسئلة","جمع البيانات من مصادرها","تنظيف وتحضير البيانات","التحليل الاستكشافي EDA","الحسابات الإحصائية","التصوير البياني للنتائج","استخلاص النتائج والتوصيات","كتابة التقرير النهائي","العرض النهائي للمشروع"]),
        ]),
        ("المستوى الثاني: الرياضيات والإحصاء لعلم البيانات","الجبر الخطي، التفاضل، الاحتمالات","understand",[
            ("الجبر الخطي: لغة تعلم الآلة","متجهات، مصفوفات، عمليات خطية",["المتجهات: تعريفها وجمعها وضربها","المصفوفات: الجمع والضرب والمعكوس","ضرب المصفوفات في الشبكات العصبية","المحددات والمعكوس Inverse","القيم الذاتية والمتجهات الذاتية","SVD: تحليل القيمة المنفردة","معايير المصفوفات Norms","حل أنظمة المعادلات الخطية","مشروع: PCA من الصفر بـ SVD"]),
            ("التفاضل والتكامل: رياضيات التغيير","المشتقات، التدرج، Gradient Descent",["المشتقة: تعريفها هندسياً وحسابياً","Chain Rule: أساس Backpropagation","المشتقات الجزئية للدوال المتعددة","التدرج Gradient: متجه المشتقات","Gradient Descent: الخوارزمية","مقارنة Optimizers: SGD, Adam","دوال التكلفة: MSE و Cross-Entropy","معدل التعلم Learning Rate","مشروع: تدريب انحدار خطي من الصفر"]),
            ("الاحتمالات والإحصاء","التوزيعات، الاختبارات، الارتباط",["الاحتمالات الأساسية وقواعدها","الاحتمال الشرطي ونظرية Bayes","التوزيع الطبيعي Gaussian","التوزيعات الأخرى: Binomial, Poisson","اختبار الفرضيات و p-value","فترات الثقة Confidence Intervals","الارتباط: Pearson و Spearman","تحليل المتبقيات Residuals","مشروع: تحليل إحصائي كامل"]),
            ("تصوير البيانات: من الأرقام للقصة","Matplotlib, Seaborn، رسوم احترافية",["Matplotlib: line, scatter, bar","تخصيص الرسوم: ألوان، عناوين","Subplots: عدة رسوم في شكل واحد","Histograms و Boxplots","Seaborn: رسوم إحصائية متقدمة","Heatmaps و Pairplots","حفظ وتصدير بجودة عالية","سرد القصص بالبيانات","مشروع: Dashboard تحليلي"]),
            ("تنظيف وتحضير البيانات","80% من وقت عالم البيانات",["استراتيجيات القيم المفقودة","كشف القيم الشاذة: IQR و Z-score","توحيد المقياس: StandardScaler","ترميز المتغيرات الفئوية","تحويل المتغيرات: log, Box-Cox","Binning وتجميع القيم","Train/Test Split","Data Leakage: كيف تمنعه؟","مشروع: Pipeline معالجة كامل"]),
            ("هندسة الميزات","إنشاء واختيار أفضل الميزات",["إنشاء الميزات: الجمع والنسب","Filter Methods: Correlation, Chi²","Wrapper Methods: RFE","Embedded Methods: Lasso, Trees","PCA: تقليل الأبعاد","t-SNE و UMAP للتصور","Polynomial Features","Featuretools للأتمتة","مشروع: حسّن نموذجاً بهندسة الميزات"]),
            ("مشروع المستوى: من البيانات لنموذج جاهز","دورة حياة مشروع علم البيانات",["فهم المشكلة وتحديد الهدف","جمع واستكشاف البيانات","تنظيف ومعالجة البيانات","التحليل الاستكشافي EDA","هندسة الميزات","بناء نموذج أولي Baseline","تحسين النموذج","تقييم نهائي على test set","عرض النتائج والتوصيات"]),
        ]),
        ("المستوى الثالث: التعلم الآلي","بناء نماذج تنبؤية حقيقية","apply",[
            ("أساسيات التعلم الآلي","Scikit-learn, التقييم, CV",["ما هو تعلم الآلة؟ أنواعه","Scikit-learn API الموحد","مقاييس التقييم: MSE, Accuracy","Bias-Variance Tradeoff","Cross-Validation: k-fold","Validation و Learning Curves","Grid Search و Randomized Search","Pipelines: سلسلة المعالجة","مشروع: أول نموذج ML"]),
            ("الانحدار: التنبؤ بالقيم","Linear, Ridge, Lasso, Polynomial",["Linear Regression بعمق","تقييم الانحدار: R², RMSE","Ridge: L2 Regularization","Lasso: L1 + Feature Selection","Elastic Net: L1 + L2","Polynomial Regression","تحليل المتبقيات","مقارنة نماذج الانحدار","مشروع: توقع الأسعار"]),
            ("التصنيف: تمييز الفئات","Logistic, Trees, KNN, Bayes",["Logistic Regression للتصنيف","تقييم: Confusion Matrix, ROC","Decision Trees: Gini, Pruning","K-Nearest Neighbors","Naive Bayes","مقارنة المصنفات","ROC Curve و AUC","معالجة عدم توازن الفئات","مشروع: كشف البريد العشوائي"]),
            ("النماذج التجميعية Ensemble","Random Forest, XGBoost, Stacking",["Bagging و Random Forest","Boosting و Gradient Boosting","XGBoost: بطل المسابقات","LightGBM: أسرع وأخف","CatBoost للبيانات الفئوية","Stacking و Blending","ضبط معاملات Ensemble","تفسير: Feature Importance, SHAP","مشروع: مسابقة تصنيف"]),
            ("التعلم غير المراقب","K-Means, DBSCAN, Anomaly",["K-Means: الخوارزمية واختيار k","K-Means++ و K-Medoids","DBSCAN: التجميع بالكثافة","Hierarchical Clustering","Gaussian Mixture Models","تقييم التجميع","Anomaly Detection","تطبيقات: تقسيم العملاء","مشروع: تقسيم العملاء"]),
            ("اختيار النموذج وضبط المعاملات","GridSearch, Pipelines, Optuna",["GridSearchCV و RandomizedCV","Validation و Learning Curves","Optuna: Bayesian Optimization","ColumnTransformer","FeatureUnion","حفظ وتحميل النماذج","توثيق التجارب","اختيار النموذج النهائي","مشروع: Pipeline متكامل"]),
            ("مشروع المستوى: مسابقة Kaggle","حل مشكلة حقيقية بتعلم آلي",["اختيار المشكلة والبيانات","تحليل البيانات الاستكشافي","هندسة الميزات","بناء Baselines","تجربة نماذج متعددة","تحسين أفضل نموذج","تقديم التوقعات النهائية","توثيق المنهجية","عرض النتائج"]),
        ]),
        ("المستوى الرابع: التعلم العميق","TensorFlow/Keras, CNN, RNN, Transfer","apply",[
            ("TensorFlow و Keras","Tensors, Sequential, Functional",["تثبيت TensorFlow و Keras","Tensors: scalar, vector, matrix","Sequential API: طبقات متراصة","Functional API: شبكات معقدة","Compile و Fit","Callbacks: EarlyStopping","حفظ وتحميل النماذج","التنبؤ والتقييم","مشروع: تصنيف MNIST"]),
            ("تدريب الشبكات العميقة","BatchNorm, Dropout, Transfer",["Batch Normalization","Dropout: منع overfitting","Weight Regularization","Learning Rate Schedules","Data Augmentation","Transfer Learning","Fine-Tuning","TensorBoard","مشروع: تصنيف صور بـ Transfer"]),
            ("CNN: الشبكات الالتفافية","Convolution, Pooling, معماريات",["Convolution: استخلاص الميزات","Pooling: تقليص الأبعاد","معماريات: LeNet, VGG","ResNet و Skip Connections","تصنيف الصور","Object Detection: YOLO","Image Segmentation: U-Net","Data Augmentation للصور","مشروع: مصنف صور من الصفر"]),
            ("RNN/LSTM للبيانات التسلسلية","RNN, LSTM, GRU, السلاسل",["Recurrent Neural Networks","LSTM: البوابات الثلاث","GRU: البديل الأبسط","Bidirectional RNN","Time Series Forecasting","Seq2Seq: ترجمة وتلخيص","Attention Mechanism","Embedding Layer","مشروع: تنبؤ بدرجات الحرارة"]),
            ("النماذج التوليدية","Autoencoders, VAE, GAN",["Autoencoders: ضغط البيانات","Variational Autoencoders","GAN: المولد والمميز","DCGAN: GAN للصور","Conditional GAN","Style Transfer","صعوبات تدريب GAN","VAE مقابل GAN","مشروع: توليد أرقام بـ GAN"]),
            ("نشر النماذج: للإنتاج","Flask, FastAPI, Docker",["حفظ النماذج بصيغ مختلفة","Flask API: واجهة REST","FastAPI: أسرع وأحدث","Docker: تغليف النموذج","نشر سحابي","TensorFlow Serving و ONNX","مراقبة النموذج","CI/CD للنماذج","مشروع: نشر نموذج كـ API"]),
            ("مشروع المستوى: نظام تعلم عميق","بناء وتدريب ونشر نموذج",["تحديد المشكلة","جمع وتحضير البيانات","بناء النموذج","تدريب وتحسين","تقييم وتحليل الأخطاء","تحسين النموذج","بناء API","نشر في الإنتاج","عرض المشروع"]),
        ]),
        ("المستوى الخامس: التطبيقات المتقدمة","NLP, Transformers, RL, MLOps","create",[
            ("معالجة اللغة الطبيعية NLP","Tokenization, TF-IDF, Embeddings",["Text Preprocessing","TF-IDF و Bag of Words","Word Embeddings","Sentiment Analysis","Text Classification","NER: استخراج الكيانات","Topic Modeling: LDA","Seq2Seq للترجمة","مشروع: مصنف أخبار"]),
            ("المحولات ونماذج اللغة","BERT, GPT, Fine-Tuning",["Self-Attention و Multi-Head","Positional Encoding","BERT: bidirectional encoder","GPT: autoregressive decoder","Fine-Tuning","Hugging Face","Pipelines: جاهز للاستخدام","حدود Transformers","مشروع: تحليل مشاعر بـ BERT"]),
            ("الرؤية الحاسوبية المتقدمة","YOLO, Segmentation, Tracking",["Faster R-CNN و YOLO","Image Segmentation","Object Tracking","Pose Estimation","Face Recognition","Vision Transformers","Data Augmentation متقدمة","تقييم نماذج الرؤية","مشروع: عداد مركبات"]),
            ("التعلم المعزز RL","Q-Learning, DQN, Policy Gradients",["أساسيات RL","Markov Decision Processes","Q-Learning","Deep Q-Networks","Policy Gradients","Actor-Critic: A2C, PPO","OpenAI Gym","تحديات RL","مشروع: CartPole"]),
            ("MLOps: هندسة التعلم الآلي","Pipelines, Tracking, Monitoring",["ML Pipelines: أتمتة","Experiment Tracking","Model Registry","Feature Store","Continuous Training","Model Monitoring","Shadow Deployment","Kubeflow","مشروع: Pipeline تدريب ونشر"]),
            ("أخلاقيات الذكاء الاصطناعي","Fairness, XAI, Privacy",["التحيز Bias","Fairness Metrics","Explainable AI: SHAP, LIME","Privacy","Model Cards","Adversarial Attacks","Robustness","التنظيم: GDPR","مشروع: تدقيق أخلاقي"]),
            ("المشروع الختامي","تطبيق جميع مهارات التخصص",["اختيار المشكلة","تخطيط المشروع","جمع وتحضير البيانات","بناء النموذج","تدريب وتحسين","تقييم واختبار","بناء واجهة المستخدم","نشر في الإنتاج","العرض النهائي"]),
        ]),
    ]
}

# ── الأخطاء الشائعة ──
MISTAKES = [
    ("Data Leakage: تسرب بيانات الاختبار للتدريب","طبقت Scaler على كل البيانات ثم قسمتها. الـ scaler رأى الاختبار. النتيجة: دقة وهمية تنهار في الإنتاج.","اقسم البيانات أولاً. `scaler.fit(X_train)` فقط. `scaler.transform(X_test)`. استخدم Pipeline لضمان الترتيب.","درب الطالب على القاعدة: Fit فقط على التدريب، Transform على الجميع. أي معلومات من الاختبار تتسرب = تقييمك عديم القيمة.","critical"),
    ("تقييم نموذج بـ Accuracy على بيانات غير متوازنة","95% فئة A، 5% فئة B. نموذج يتنبأ دائماً بـ A يحصل على Accuracy=95%! لكنه فاشل تماماً.","استخدم Precision, Recall, F1-Score. `confusion_matrix` يرسم كل شيء. `classification_report`.","علّم الطالب: قبل اختيار المقياس، اسأل: ما الفئة الأهم؟ ما تكلفة الخطأ؟ Accuracy لا تعكس الأداء الحقيقي على البيانات غير المتوازنة.","major"),
    ("عدم توحيد مقياس المتغيرات قبل K-Means/KNN/SVM","متغير بمقياس 1-1000 يسيطر على المسافات. النتيجة: تجميع سيئ أو تصنيف خاطئ.","`StandardScaler()` أو `MinMaxScaler()`. لا تحتاج Trees للـ scaling.","القاعدة: إذا كان النموذج يعتمد على المسافة أو gradient descent، وحد المقياس. Trees لا تحتاج.","major"),
    ("Overfitting: فجوة كبيرة بين دقة التدريب والاختبار","النموذج 'يحفظ' ولا 'يتعلم'. دقة تدريب 99% واختبار 65%.","1- تبسيط النموذج 2- Regularization 3- المزيد من البيانات 4- Cross-Validation 5- Early Stopping.","اشرح للطالب: 'تخيل طالباً يحفظ الإجابات دون فهم المادة — ينجح في الامتحان التدريبي ويفشل في النهائي'. Validation Curve تساعد في التشخيص.","critical"),
    ("Gradient Descent: Learning Rate كبير جداً أو صغير جداً","lr=0.00001: تدريب بطيء لا يصل للحل. lr=1.0: يقفز فوق الحل الأمثل ويتأرجح. كلاهما فشل.","ابدأ بـ 0.001 لـ Adam. استخدم Learning Rate Scheduler. ارسم loss مقابل epochs.","الطريقة البصرية: loss ينخفض بسلاسة = lr مناسب. loss يتأرجح = lr كبير. loss ينخفض ببطء = lr صغير.","major"),
    ("نسيان Early Stopping — تدريب 100 عصر بدون فائدة","val_loss يبدأ بالتزايد بعد epoch 20، لكنك تستمر للـ 100. النتيجة: Overfitting + وقت ضائع.","`EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)`. `patience=5` يسمح بتذبذب مؤقت.","علّم الطالب: إذا توقف تحسن validation لـ 5 عصور متتالية، توقف. لا فائدة من الاستمرار. Early Stopping يوفر الوقت ويمنع overfitting.","major"),
    ("استخدام Pandas مع حلقات for بدل العمليات المتجهة","حلقة for على 100K صف: 5 ثوانٍ. عملية متجهة: 0.002 ثانية. فرق 2500×.","`df['new'] = df['a'] + df['b']` بدل حلقة. `df['col'].apply(func)` للحالات الخاصة.","شجع الطالب: 'إذا كتبت for مع Pandas، توقف واسأل نفسك: هل هناك طريقة متجهة؟' عمليات NumPy و Pandas تنفذ بـ C.","minor"),
    ("عدم استخدام Pipeline — خطوات يدوية تسبب Data Leakage","كل خطوة preprocessing تطبقها يدوياً تزيد احتمال الخطأ. `fit_transform` على التدريب و `transform` على الاختبار — من السهل نسيانها.","`Pipeline([('scaler',Scaler()),('model',Model())])`. مع GridSearchCV: `param_grid = {'model__C': [0.1,1,10]}`. يحفظ وينشر بسهولة.","درب الطالب: 'Pipeline هو صديقك. يحميك من نفسك'. دائماً استخدم Pipeline بدل الخطوات اليدوية. سهل، آمن، وقابل لإعادة الاستخدام.","major"),
]

# ── MAIN ──
def main():
    print(f"\n{'='*60}\n  توليد: الذكاء الاصطناعي (uni-ai) — جودة عالية\n{'='*60}\n")
    meta = CURRICULUM["specialty"]
    result_levels = []; all_uc = []; all_sc = []
    for li, (lname, lgoal, lbloom, stages) in enumerate(CURRICULUM["levels"]):
        lv = li+1; rstages = []
        for si, (sname, sgoal, units) in enumerate(stages):
            sv = si+1; sc = f"{lv}.{sv}"; all_sc.append(sc); runits = []
            for ui, uname in enumerate(units):
                uv = ui+1; uc = f"{sc}.{uv}"; all_uc.append(uc)
                print(f"  {uc}: {uname[:60]}")
                lessons = generate_lessons(uc, uname, sname, "uni-ai")
                labs = generate_labs(uc, uname, len(lessons), "uni-ai")
                prereq = [f"{sc}.{ui}"] if ui>0 else []
                enables = [f"{sc}.{ui+2}"] if ui<len(units)-1 else []
                runits.append({"unit_index":uv,"name":uname,"goal":f"إتقان {uname}","prerequisite_units":prereq,"enables_units":enables,"key_concepts":[uname.split(":")[-1].strip()[:20] if ":" in uname else uname[:20]],"motivation_hook":f"وحدة {uname} — خطوتك نحو الاحتراف.","learning_objectives":[{"statement":f"يتقن {uname}","bloom_level":"apply"}],"lessons":lessons,"labs":labs,"exam":{"pass_threshold_percent":60,"points":10,"time_limit_minutes":30}})
            rstages.append({"stage_index":sv,"name":sname,"goal":sgoal,"bloom_focus":lbloom,"units":runits,"exam":{"pass_threshold_percent":60,"points":20,"time_limit_minutes":45}})
        result_levels.append({"level_index":lv,"name":lname,"goal":lgoal,"bloom_focus":lbloom,"stages":rstages,"exam":{"pass_threshold_percent":60,"points":50,"time_limit_minutes":90}})
    print("\n  توليد بنوك الامتحانات...")
    ub = {c:gen_exam(c,"unit",10) for c in all_uc}
    sb = {c:gen_exam(c,"stage",15) for c in all_sc}
    lb = {str(i):gen_exam(str(i),"level",20) for i in range(1,6)}
    final = {"schema_version":"v4.1","specialty":{**meta,"yemeni_examples":["تطبيق عملي في مشروع حقيقي"]},"levels":result_levels,"exam_banks":{"unit_banks":ub,"stage_banks":sb,"level_banks":lb},"placement_test_questions":gen_placement(),"publish_notes":"uni-ai v4.1 — محتوى منسجم وعالي الجودة"}
    fp = OUT/"final.json"
    with open(fp,'w',encoding='utf-8') as f: json.dump(final,f,ensure_ascii=False,indent=2)
    sz = fp.stat().st_size/(1024*1024)
    tl = sum(1 for l in result_levels for s in l['stages'] for u in s['units'] for _ in u['lessons'])
    print(f"\n  ✅ {sz:.1f} MB | {len(result_levels)} مستويات | {len(all_sc)} مرحلة | {len(all_uc)} وحدة | {tl} درس\n")

if __name__ == "__main__":
    main()
