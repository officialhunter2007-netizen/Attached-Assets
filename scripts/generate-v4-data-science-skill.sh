#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# generate-v4-data-science-skill.sh — مُولِّد ملف تعليمات نُخبة v4 لـ«علوم البيانات»
#
# 5 مستويات مكثفة: Python الأساسي ⇾ تحليل البيانات ⇾ الإحصاء وML ⇾ ML متقدّم ⇾
# Deep Learning + Big Data + مشاريع يمنية متكاملة.
#
# 100% عملي — كل درس كود Python كامل قابل للتشغيل في Nukhba IDE.
#
# مخرج نهائي: $OUT_DIR/final.json — يُفحص آلياً ثم يُلصق في لوحة الإدارة v4.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── 0. تحقق بيئي + اكتشاف المزوّد ───────────────────────────────────────────
require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "❌ مطلوب الأمر: $1" >&2; exit 1; }
}
require_cmd curl
require_cmd jq

GOOGLE_API_KEY="${GOOGLE_API_KEY:-${GEMINI_API_KEY:-}}"
OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-}"
VERTEX_PROJECT="${VERTEX_PROJECT:-}"
VERTEX_LOCATION="${VERTEX_LOCATION:-global}"

if [[ -n "$VERTEX_PROJECT" ]]; then
  PROVIDER="vertex"
  MODEL="${MODEL:-gemini-2.5-flash}"
  require_cmd gcloud
elif [[ -n "$GOOGLE_API_KEY" ]]; then
  PROVIDER="google"
  MODEL="${MODEL:-gemini-2.5-flash}"
elif [[ -n "$OPENROUTER_API_KEY" ]]; then
  PROVIDER="openrouter"
  MODEL="${MODEL:-google/gemini-2.5-flash}"
else
  echo "❌ ضع VERTEX_PROJECT أو GOOGLE_API_KEY أو OPENROUTER_API_KEY" >&2
  exit 1
fi

if [[ "$PROVIDER" == "openrouter" ]]; then
  FALLBACK_MODEL="${FALLBACK_MODEL:-google/gemini-2.5-pro}"
else
  FALLBACK_MODEL="${FALLBACK_MODEL:-gemini-2.5-pro}"
fi
AUTO_FALLBACK="${AUTO_FALLBACK:-1}"

# ── قيم افتراضية لعلوم البيانات ──────────────────────────────────────────────
SPEC_SLUG="${SPEC_SLUG:-skill-data-science}"
SPEC_NAME="${SPEC_NAME:-علوم البيانات}"
SPEC_DESC="${SPEC_DESC:-مسار عملي بحت لإتقان علوم البيانات من أول دقيقة — تبدأ بكتابة كود Python وتحليل بيانات حقيقية فوراً، وتنتهي ببناء نماذج تعلّم آلي وتطبيقات بيانات يمنية متكاملة. المنهج 5 مستويات مكثفة: أساسيات Python، تحليل البيانات واستكشافها، الإحصاء والتعلّم الآلي، التعلّم العميق والمشاريع الكبرى.}"
SPEC_SCOPE="${SPEC_SCOPE:-professional_track}"
SPEC_LANG="${SPEC_LANG:-ar}"
SPEC_REGION="${SPEC_REGION:-YE}"
OUT_DIR="${OUT_DIR:-./out/$SPEC_SLUG}"
REQUEST_DELAY="${REQUEST_DELAY:-2}"

# الحجم الافتراضي = الملف الكامل (5 مستويات).
if [[ "${TEST:-0}" == "1" ]]; then
  MAX_LEVELS="${MAX_LEVELS:-1}"
  MAX_STAGES_PER_LEVEL="${MAX_STAGES_PER_LEVEL:-1}"
  MAX_UNITS_PER_STAGE="${MAX_UNITS_PER_STAGE:-1}"
  MAX_LESSONS_PER_UNIT="${MAX_LESSONS_PER_UNIT:-3}"
  MAX_LABS_PER_UNIT="${MAX_LABS_PER_UNIT:-1}"
  EXAM_VARIANTS="${EXAM_VARIANTS:-1}"
else
  MAX_LEVELS="${MAX_LEVELS:-5}"
  MAX_STAGES_PER_LEVEL="${MAX_STAGES_PER_LEVEL:-7}"
  MAX_UNITS_PER_STAGE="${MAX_UNITS_PER_STAGE:-9}"
  MAX_LESSONS_PER_UNIT="${MAX_LESSONS_PER_UNIT:-10}"
  MAX_LABS_PER_UNIT="${MAX_LABS_PER_UNIT:-2}"
  EXAM_VARIANTS="${EXAM_VARIANTS:-3}"
fi

mkdir -p "$OUT_DIR"/{units,exams/unit,exams/stage,exams/level,logs}

log()  { printf '\e[36m▸\e[0m %s\n' "$*" >&2; }
ok()   { printf '\e[32m✓\e[0m %s\n' "$*" >&2; }
warn() { printf '\e[33m⚠\e[0m %s\n' "$*" >&2; }
err()  { printf '\e[31m✗\e[0m %s\n' "$*" >&2; }

# ── 1. نداء النموذج ─────────────────────────────────────────────────────────
call_llm() {
  local sys="$1" user="$2" out="$3"
  local log_file="$OUT_DIR/logs/$(basename "$out" .json)-$(date +%s).raw.json"
  local resp content http tries=0 max_tries=5 backoff=5

  while (( tries < max_tries )); do
    tries=$((tries+1))
    log "→ نداء [$PROVIDER:$MODEL] محاولة $tries/$max_tries → $(basename "$out")"

    if [[ "$PROVIDER" == "vertex" ]]; then
      local body endpoint token host
      token="$(gcloud auth print-access-token 2>/dev/null)"
      if [[ -z "$token" ]]; then
        err "تعذّر الحصول على توكن gcloud."
        return 1
      fi
      if [[ "$VERTEX_LOCATION" == "global" ]]; then
        host="https://aiplatform.googleapis.com"
      else
        host="https://${VERTEX_LOCATION}-aiplatform.googleapis.com"
      fi
      endpoint="${host}/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/${MODEL}:generateContent"
      body="$(jq -n --arg sys "$sys" --arg user "$user" '{
        system_instruction: { parts: [ { text: $sys } ] },
        contents: [ { role: "user", parts: [ { text: $user } ] } ],
        generationConfig: { temperature: 0.4, maxOutputTokens: 65536, responseMimeType: "application/json" }
      }')"
      resp="$(curl -sS --max-time 600 -w $'\n%{http_code}' \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -X POST "$endpoint" -d "$body")" \
        || { warn "فشل cURL، إعادة المحاولة..."; sleep "$backoff"; backoff=$((backoff*2)); continue; }
    elif [[ "$PROVIDER" == "google" ]]; then
      local body endpoint
      endpoint="https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent"
      body="$(jq -n --arg sys "$sys" --arg user "$user" '{
        system_instruction: { parts: [ { text: $sys } ] },
        contents: [ { role: "user", parts: [ { text: $user } ] } ],
        generationConfig: { temperature: 0.4, maxOutputTokens: 65536, responseMimeType: "application/json" }
      }')"
      resp="$(curl -sS --max-time 600 -w $'\n%{http_code}' \
        -H "Content-Type: application/json" \
        -H "x-goog-api-key: $GOOGLE_API_KEY" \
        -X POST "$endpoint" -d "$body")" \
        || { warn "فشل cURL، إعادة المحاولة..."; sleep "$backoff"; backoff=$((backoff*2)); continue; }
    else
      local body
      body="$(jq -n --arg model "$MODEL" --arg sys "$sys" --arg user "$user" '{
        model: $model, messages: [ {role:"system", content:$sys}, {role:"user", content:$user} ],
        response_format: {type:"json_object"}, temperature: 0.4, max_tokens: 32000
      }')"
      resp="$(curl -sS --max-time 600 -w $'\n%{http_code}' \
        -H "Authorization: Bearer $OPENROUTER_API_KEY" \
        -H "Content-Type: application/json" \
        -H "HTTP-Referer: https://learnukhba.com" \
        -H "X-Title: Nukhba v4 Data Science Generator" \
        -X POST https://openrouter.ai/api/v1/chat/completions \
        -d "$body")" \
        || { warn "فشل cURL، إعادة المحاولة..."; sleep "$backoff"; backoff=$((backoff*2)); continue; }
    fi

    http="$(printf '%s' "$resp" | tail -n1)"
    resp="$(printf '%s' "$resp" | sed '$d')"
    printf '%s\n' "$resp" > "$log_file"

    if [[ "$http" == "429" ]]; then
      if [[ "$AUTO_FALLBACK" == "1" && "$MODEL" != "$FALLBACK_MODEL" ]]; then
        warn "النموذج '$MODEL' استُنفدت حصته (429) — التحويل تلقائياً إلى '$FALLBACK_MODEL'."
        MODEL="$FALLBACK_MODEL"
        tries=0; backoff=5; continue
      fi
      warn "حصة/حدّ معدّل (429)."; sleep "$backoff"; backoff=$((backoff*2)); continue
    fi

    if [[ "$http" == "401" || "$http" == "403" ]]; then
      err "مصادقة فاشلة ($http)"; return 1
    fi

    if jq -e '.error' >/dev/null 2>&1 <<<"$resp"; then
      err "خطأ API ($http): $(jq -r '.error.message // .error | tostring' <<<"$resp" | head -c 300)"
      sleep "$backoff"; backoff=$((backoff*2)); continue
    fi

    if [[ "$PROVIDER" == "google" || "$PROVIDER" == "vertex" ]]; then
      content="$(jq -r '[.candidates[0].content.parts[]?.text] | join("") // empty' <<<"$resp")"
    else
      content="$(jq -r '.choices[0].message.content // empty' <<<"$resp")"
    fi

    if [[ -z "$content" ]]; then warn "ردّ فارغ، إعادة المحاولة..."; sleep "$backoff"; backoff=$((backoff*2)); continue; fi

    content="$(printf '%s' "$content" | sed -E 's/^```(json)?//;s/```$//' | sed -E '/^```$/d')"

    if printf '%s' "$content" | jq -e . >/dev/null 2>&1; then
      printf '%s' "$content" > "$out"
      ok "حُفظ: $out ($(wc -c < "$out") بايت)"
      sleep "$REQUEST_DELAY"; return 0
    fi

    warn "JSON غير صالح/مبتور، إعادة المحاولة..."; sleep "$backoff"; backoff=$((backoff*2))
  done
  err "فشل توليد $out بعد $max_tries محاولات."; return 1
}

# ── 2. التلقين الأساسي — هوية مؤلّف مناهج علوم البيانات ───────────────────────
read -r -d '' SYS_BASE <<'EOF' || true
أنت خبير تدريس علوم البيانات ومُصمِّم مناهج عربي فائق الجودة، تبني مساراً عملياً بحتاً للطلاب اليمنيين. لا توجد محاضرات نظرية — كل شيء يبدأ من أول دقيقة بكتابة كود Python حقيقي وتشغيله في Jupyter/محرّر نُخبة. تُنتج ملف تعليمات v4.1 لمنصّة نُخبة (Nukhba) لتخصص «علوم البيانات» بـ 5 مستويات مكثفة عالية القدرات.

سياق المنصّة التقني:
- لدى الطالب محرّر Python مدمج مع دعم pandas, numpy, matplotlib, scikit-learn.
- المعلّم الذكي يملك أدوات بصرية: `python_trace` (تتبّع الكود سطراً بسطر مع قيم المتغيّرات)، `flowchart` (الخوارزميات وخطوط البيانات)، `data_table` (عرض DataFrames وجداول)، `chart` (رسوم بيانية تفاعلية: bar, line, scatter, histogram, heatmap).

قواعد ذهبية مُلزِمة:
1. مخرجك دائماً مستند JSON واحد فقط — لا markdown، لا ``` ، لا شرح قبل أو بعد.
2. كل النصوص الشارحة بالعربية الفصحى المبسّطة. المصطلحات التقنية بالإنجليزية مع شرح عربي أول مرة.
3. **علوم البيانات = كود Python حقيقي**: كل درس فيه كود كامل قابل للتشغيل (بما فيه imports و main block). ممنوع درس بلا كود.
4. **أمثلة من الحياة اليمنية ببيانات حقيقية**: تحليل أسعار السلع في سوق باب اليمن، توقّع استهلاك الكهرباء حسب الموسم، تصنيف جودة البنّ اليمني من خصائصه، تحليل درجات الطلاب، نظام توصيات للأسواق، تحليل بيانات الصادرات الزراعية (تمور، عسل، بهارات، أسماك). **ممنوع ذكر القات** — استخدم البنّ اليمني، التمور، العسل، البهارات، الأسماك، الأقمشة.
5. **منهجية «توقّع ثم نفّذ»**: صمّم الأسئلة بحيث يتوقّع الطالب مخرجات الكود قبل تشغيله.
6. **ثقافة تصحيح الأخطاء**: أدرِج أخطاء Python/Data Science الواقعية:
   - KeyError: مفتاح غير موجود في DataFrame/dict
   - ValueError: أبعاد مصفوفة غير متوافقة
   - SettingWithCopyWarning: تعديل DataFrame بطريقة خاطئة
   - ConvergenceWarning: عدم تقارب النموذج
   - Overfitting (دقة تدريب عالية جداً مقابل دقة اختبار منخفضة)
   - تسرّب البيانات Data Leakage: تضمين بيانات الاختبار في التدريب
   - الخلط بين fit و transform
   - نسيان train_test_split
   - استخدام المتوسط للبيانات المنحرفة بدل الوسيط
   - الخلط بين correlation و causation
   مع التصحيح وكيف تُقرأ رسالة الخطأ.
7. الأكواد الرسمية: المستوى "L"، المرحلة "L.S"، الوحدة "L.S.U"، الدرس "L.S.U.Lesson"، المعمل "L.S.U.مX".
8. لا تتكرّر أكواد، ولا تتكرّر أنواع أسئلة المعمل داخل المعمل الواحد.
9. كل prerequisite_* و enables_* يشير لكود موجود فعلاً في الملف.
10. أنواع أسئلة المعمل الخمسة: diagnostic | decision | application | analysis | connection — واحد من كل نوع بالضبط.
11. bloom_focus: remember|understand|apply|analyze|evaluate|create.
12. لا تختصر. كل مفهوم شرح فقرة كاملة ≥40 كلمة.
13. **الدرس الأول عملي بحت**: ابدأ فوراً بـ:
    ```python
    import pandas as pd
    df = pd.DataFrame({"المنتج": ["بن", "عسل", "تمر"], "السعر": [5000, 3000, 2000]})
    print(df)
    print(f"متوسط السعر: {df['السعر'].mean()}")
    ```
    ثم اشرح كل سطر أثناء كتابته.
14. **سؤال التحقّق النهائي**: عملي — يطلب كود Python أو توقّع مخرج. استخدم `[[ASK_OPTIONS: ...]]` للاختيار من متعدّد.

التدرّج العلمي المطلوب — 5 مستويات مكثفة:

مستوى 1 — «أساسيات Python لعلم البيانات» (apply):
  • Python basics: المتغيّرات، الأنواع (int, float, str, bool, list, dict, tuple, set)
  • List comprehensions, dict comprehensions
  • الدوال: تعريف، وسائط، return، lambda
  • Files I/O: قراءة/كتابة CSV, JSON, TXT
  • NumPy: arrays, slicing, broadcasting, aggregation (sum, mean, std)
  • pandas: Series, DataFrame, القراءة من CSV/Excel، الفهرسة loc/iloc
  • pandas: تصفية البيانات، إضافة/حذف أعمدة، groupby, merge
  • matplotlib: line, bar, scatter, labels, titles, subplots
  • إحصاء وصفي: mean, median, mode, std, percentiles, IQR, boxplots
  • مشروع عملي: تحليل بيانات سوق مركزي يمني

مستوى 2 — «تحليل البيانات الاستكشافي EDA» (analyze):
  • تنظيف البيانات: القيم المفقودة (dropna, fillna)، التكرارات (duplicated)
  • أنواع البيانات وتحويلها: astype, to_datetime, to_numeric
  • التعامل مع النصوص: str methods, regex, extract
  • Pivot tables, crosstab, melt
  • التجميع المتقدّم: groupby + agg بمجمّعات مخصصة
  • دمج البيانات: merge, join, concat بأنواعها
  • تصوير البيانات المتقدّم: seaborn (histogram, boxplot, heatmap, pairplot)
  • السلاسل الزمنية: date parsing, resample, rolling window
  • القيم الشاذة: IQR method, Z-score, isolation forest
  • مشروع EDA: تحليل بيانات التجارة في اليمن (صادرات/واردات)

مستوى 3 — «الإحصاء والتعلّم الآلي الأساسي» (analyze/evaluate):
  • الاحتمالات والتوزيعات: normal, binomial, Poisson, scipy.stats
  • اختبار الفرضيات: t-test, chi-square, ANOVA, p-value
  • Correlation: Pearson, Spearman, مصفوفة الارتباط
  • Linear Regression: OLS, تفسير المعاملات، R², residuals
  • Logistic Regression: للتّصنيف الثنائي، confusion matrix
  • Decision Trees: entropy, Gini, pruning, feature importance
  • Random Forest: ensemble, bagging, معالجة overfitting
  • K-Means Clustering: elbow method, silhouette score
  • Preprocessing: StandardScaler, LabelEncoder, OneHotEncoder
  • مشروع: بناء نموذج تنبّؤ بأسعار المنتجات في السوق اليمني

مستوى 4 — «تعلّم آلي متقدّم وهندسة الميزات» (evaluate):
  • Feature Engineering: polynomial features, binning, interaction features
  • Feature Selection: mutual information, RFE, L1 regularization
  • Cross-validation: k-fold, stratified, time-series split
  • Gradient Boosting: XGBoost, LightGBM, CatBoost
  • SVM: linear, RBF kernel, grid search
  • PCA: dimensionality reduction, explained variance
  • Imbalanced data: SMOTE, class weights, evaluation metrics (precision, recall, F1)
  • Model interpretation: SHAP, LIME
  • Pipelines: scikit-learn Pipeline, ColumnTransformer
  • مشروع: نظام تصنيف جودة البنّ اليمني من خصائصه الكيميائية

مستوى 5 — «التعلّم العميق + Big Data + مشاريع متكاملة» (create):
  • Neural Networks: perceptron, MLP, backpropagation, activation functions
  • Deep Learning مع TensorFlow/Keras: Sequential, Functional API
  • CNN: للصور — Convolution, Pooling, تصنيف صور المحاصيل اليمنية
  • RNN/LSTM: للسلاسل الزمنية — تنبّؤ الطلب على الكهرباء
  • Transfer Learning: استخدام نماذج جاهزة ومعايرة
  • NLP: text preprocessing, TF-IDF, word embeddings, sentiment analysis
  • Big Data: مفاهيم Spark, معالجة دفعات كبيرة من البيانات
  • نشر النماذج Model Deployment: Flask API, pickle/joblib, REST endpoint
  • مشروع ختامي (كابستون): نظام متكامل لتحليل بيانات السوق اليمني
    (Web scraping ➔ ETL ➔ EDA ➔ Modeling ➔ Dashboard ➔ API Deployment)

أسلوب الكتابة المطلوب:
- جمل واضحة لا حشو. تعليمات تشغيلية للمعلم الذكي.
- كل درس له: bridge_sentence (≥10 كلمات تربط بكود الدرس السابق بمثال Data Science يمني)، 3-6 مفاهيم، 2-4 أخطاء شائعة بعلاج محدّد، 1-3 أمثلة كود يمنية كاملة (مع imports و main block)، سؤال تحقّق نهائي عملي.
- **عمق شرح المفهوم**: فقرة ≥40 كلمة: تعريف + لماذا يحتاجه + مقطع كود Python من الحياة اليمنية + خطأ شائع ورسالته.
- **الكود النموذجي الكامل**: solution_outline يتضمّن الكود الكامل + المخرج المتوقّع.
- كل امتحان MCQ: 3-4 خيارات، correct_index صحيح فعلياً (نفّذ الكود ذهنياً قبل الضبط).
EOF

# ── 3. مرحلة الهيكل: specialty + levels + stages + units ──────────────────────
phase_skeleton() {
  local out="$OUT_DIR/skeleton.json"
  [[ -f "$out" ]] && { ok "موجود (تخطّي): $out"; return 0; }

  local user
  user="$(cat <<EOF
أنشئ هيكل ملف تعليمات v4 لتخصص علوم البيانات التالي:
- slug: $SPEC_SLUG
- name: $SPEC_NAME
- description: $SPEC_DESC
- scope: $SPEC_SCOPE
- language: $SPEC_LANG
- region: $SPEC_REGION

المطلوب JSON بهذا الشكل بالضبط:
{
  "schema_version": "v4.1",
  "specialty": {
    "slug": "$SPEC_SLUG",
    "name": "$SPEC_NAME",
    "description": "...",
    "scope": "$SPEC_SCOPE",
    "language": "$SPEC_LANG",
    "region": "$SPEC_REGION",
    "target_persona": "وصف الطالب المستهدف: مبتدئ يمني (جامعي/باحث عمل) يريد احتراف علوم البيانات للحصول على وظيفة في التحليل أو بناء أنظمة ذكاء اصطناعي، قد يملك خلفية بسيطة في البرمجة (3-4 جمل)",
    "teacher_tone": "نبرة المعلّم: مشجّعة وعملية، تجعل الطالب يكتب كود Python ويحلّل بيانات حقيقية من أول دقيقة — تعلّمه أن الخطأ جزء من رحلة عالم البيانات (جملتان)",
    "allowed_viz_templates": ["python_trace", "flowchart", "data_table", "chart", "bar_chart", "line_chart", "scatter_plot", "histogram", "heatmap"],
    "allowed_tools": ["text", "code", "image"],
    "glossary": [
      {"term": "DataFrame", "definition": "هيكل بيانات ثنائي الأبعاد في pandas يشبه جدول Excel — الصفوف والأعمدة بأسماء، مثل جدول أسعار منتجات سوق باب اليمن"},
      {"term": "EDA (استكشاف البيانات)", "definition": "عملية فحص البيانات الأولية: توزيع القيم، المفقود، الشواذ، العلاقات — كأنك تدخل دكاناً وتمسح البضاعة بعينك قبل الشراء"},
      {"term": "Overfitting (فرط التعلّم)", "definition": "حالة يحفظ فيها النموذج بيانات التدريب بدل تعلّم النمط العام — كطالب يحفظ الإجابات دون فهم المادة"},
      {"term": "Feature (ميزة)", "definition": "عمود/خاصية من البيانات تُستخدم كمدخل للنموذج — مثل سعر المنتج، وزنه، بلد المنشأ"},
      {"term": "Model (نموذج)", "definition": "دالة رياضية تعلّمت من البيانات لتقوم بتنبؤات — كخبير تذوّق بن يمني يحدد الجودة من الرائحة واللون"}
    ]
  },
  "levels": [
    {
      "level_index": 1,
      "name": "اسم المستوى",
      "goal": "هدف المستوى",
      "bloom_focus": "apply",
      "motivation_hook": "لماذا يهمّ الطالب هذا المستوى من علوم البيانات - ربطه بوظيفة أو مشروع يمني حقيقي (جملتان)",
      "learning_objectives": [
        {"statement": "هدف تعلمي عملي قابل للقياس", "bloom_level": "apply"}
      ],
      "exam_meta": {"pass_threshold_percent": 60, "time_limit_minutes": 60},
      "stages": [
        {
          "stage_index": 1,
          "code": "1.1",
          "name": "...",
          "goal": "...",
          "bloom_focus": "apply",
          "exam_meta": {"pass_threshold_percent": 60},
          "units": [
            {
              "unit_index": 1,
              "code": "1.1.1",
              "name": "...",
              "goal": "...",
              "bloom_focus": "apply",
              "prerequisite_unit_codes": [],
              "enables_unit_codes": [],
              "key_concepts": ["مفهوم 1", "مفهوم 2", "مفهوم 3"],
              "exam_meta": {"pass_threshold_percent": 60},
              "lessons": [],
              "labs": []
            }
          ]
        }
      ]
    }
  ]
}

قواعد العدّ الإلزامية:
- levels.length = $MAX_LEVELS بالضبط (level_index من 1 إلى $MAX_LEVELS).
- في كل مستوى stages.length = $MAX_STAGES_PER_LEVEL بالضبط.
- في كل مرحلة units.length = $MAX_UNITS_PER_STAGE بالضبط.
- اترك lessons و labs مصفوفات فارغة — سنملأها لاحقاً.

التدرّج المنهجي لعلوم البيانات 5 مستويات (التزِم به بدقّة):
- مستوى 1 (apply): «أساسيات Python لعلم البيانات» — Python basics, NumPy, pandas, matplotlib, إحصاء وصفي
- مستوى 2 (analyze): «تحليل البيانات الاستكشافي EDA» — تنظيف البيانات، Pivot tables، دمج البيانات، seaborn، السلاسل الزمنية، القيم الشاذة
- مستوى 3 (analyze/evaluate): «الإحصاء والتعلّم الآلي الأساسي» — الاحتمالات، اختبار الفرضيات، الانحدار، التصنيف، clustering، preprocessing
- مستوى 4 (evaluate): «تعلّم آلي متقدّم وهندسة الميزات» — Feature engineering, Gradient Boosting, SVM, PCA, imbalanced data, SHAP/LIME, Pipelines
- مستوى 5 (create): «التعلّم العميق + Big Data + مشاريع متكاملة» — Neural Networks, CNN, RNN/LSTM, NLP, Model Deployment, Capstone

bloom_focus: 1=apply, 2=analyze, 3=analyze/evaluate, 4=evaluate, 5=create
أخرج JSON خام فقط.
EOF
)"

  call_llm "$SYS_BASE" "$user" "$out"
}

# ── 4. مرحلة الوحدات: لكل وحدة → دروس عملية + معامل ──────────────────────────
phase_units() {
  [[ -f "$OUT_DIR/skeleton.json" ]] || { err "نفّذ skeleton أولاً"; return 1; }

  local codes
  codes="$(jq -r '.levels[].stages[].units[].code' "$OUT_DIR/skeleton.json")"

  while IFS= read -r code; do
    [[ -z "$code" ]] && continue
    local out="$OUT_DIR/units/${code}.json"
    [[ -f "$out" ]] && { ok "موجود (تخطّي): units/${code}.json"; continue; }

    local ctx
    ctx="$(jq --arg c "$code" '
      .levels[].stages[].units[] | select(.code==$c) |
      {code, name, goal, bloom_focus, key_concepts, prerequisite_unit_codes}
    ' "$OUT_DIR/skeleton.json")"

    local user
    user="$(cat <<EOF
هذه وحدة من ملف تعليمات تخصص «$SPEC_NAME» في نُخبة v4. املأ تفاصيلها الكاملة (دروس Python/Data Science عملية + معامل).

سياق الوحدة:
$ctx

أخرج JSON بهذا الشكل بالضبط:
{
  "code": "$code",
  "lessons": [
    {
      "lesson_index": 1,
      "code": "${code}.1",
      "name": "...",
      "goal": "هدف الدرس العملي — سطر واحد",
      "bridge_sentence": "جملة ≥10 كلمات تربط بكود الدرس السابق وتُمهّد لمشكلة بيانات يمنية سنحلّها اليوم.",
      "prerequisite_lesson_codes": [],
      "enables_lesson_codes": [],
      "final_check_question": "سؤال تحقّق نهائي عملي: يطلب كتابة كود Python أو توقّع مخرج DataFrame",
      "session_complete_criterion": "الطالب كتب كود Python يعمل ويُخرج النتيجة الصحيحة، ويستطيع شرح كل سطر",
      "yemeni_examples": [
        "مثال كود Python كامل (بما فيه imports) يحلّ مشكلة بيانات يمنية محسوسة، مع المخرج المتوقّع"
      ],
      "expected_duration_minutes": 30,
      "estimated_gem_cost": 90,
      "solution_outline": "الكود النموذجي الكامل لسؤال التحقّق (مع imports) + المخرج المتوقّع سطراً بسطر",
      "motivation_hook": "جملة تربط الدرس بمشكلة بيانات يمنية: ماذا سيستطيع الطالب تحليله بعد هذا الدرس؟",
      "learning_objectives": [
        {"statement": "هدف يبدأ بفعل سلوكي (يكتب كوداً يحلّل...، يُصحّح KeyError في...، يبني DataFrame لـ...)", "bloom_level": "apply"}
      ],
      "glossary": [
        {"term": "مصطلح Data Science بالإنجليزية", "definition": "تعريف عربي مبسّط بمثال يمني"}
      ],
      "concepts": [
        {
          "name": "اسم المفهوم بالعربية (مصطلحه بالإنجليزية)",
          "explanation": "فقرة ≥40 كلمة: (1) تعريف المفهوم (2) لماذا يحتاجه عالم البيانات (3) مقطع كود Python من حياة يمنية (4) خطأ شائع مع رسالة الخطأ الفعلية وتصويبه",
          "mastery_criterion": "متى نعتبر المفهوم مُتقَناً",
          "weight": 1
        }
      ],
      "common_mistakes": [
        {
          "mistake": "خطأ Python/Data Science شائع محدّد مع الكود المعطوب ورسالة الخطأ الفعلية",
          "correction": "الكود المصحّح",
          "treatment": "كيف يعلّم المعلم الطالب قراءة الـTraceback لتحديد السطر المشكل",
          "severity": "major"
        }
      ]
    }
  ],
  "labs": [
    {
      "lab_index": 1,
      "code": "${code}.م1",
      "title": "عنوان سيناريو بيانات يمني",
      "scenario": "سرد قصصي: الطالب يلعب دور عالم بيانات يُكلَّف بتحليل بيانات حقيقية (مثل: تحليل أسعار الخضار في سوق باب اليمن، أو بناء نموذج تنبّؤ بجودة البن من خصائصه)",
      "completion_criterion": "الطالب كتب كود Python يعمل والنموذج يخرج دقة مقبولة مع تفسير النتائج",
      "pedagogical_sequence": "diagnostic ⇒ decision ⇒ application ⇒ analysis ⇒ connection",
      "prerequisite_lessons": ["${code}.1"],
      "allowed_tools": ["text", "code"],
      "questions": [
        {"question_index": 1, "kind": "diagnostic",  "prompt": "سؤال يقيس ما يعرفه الطالب مسبقاً", "rubric": "معايير التقييم", "solution_outline": "إجابة/كود نموذجي", "points": 1},
        {"question_index": 2, "kind": "decision",    "prompt": "سؤال يطلب اختيار الأسلوب التحليلي المناسب ومبرراته", "rubric": "...", "solution_outline": "...", "points": 1},
        {"question_index": 3, "kind": "application", "prompt": "اطلب كتابة كود Python كامل لتحليل بيانات يمنية", "rubric": "الكود يعمل + النتائج صحيحة + الأسلوب نظيف", "solution_outline": "الكود النموذجي + المخرج", "points": 2},
        {"question_index": 4, "kind": "analysis",   "prompt": "أعطِ كود Python فيه خطأ (KeyError, ValueError, SettingWithCopyWarning) واطلب تشخيصه", "rubric": "...", "solution_outline": "...", "points": 1},
        {"question_index": 5, "kind": "connection",  "prompt": "اطلب ربط التحليل بسيناريو جديد أو تمديد الكود", "rubric": "...", "solution_outline": "...", "points": 1}
      ]
    }
  ]
}

قواعد العدّ الإلزامية:
- lessons.length = $MAX_LESSONS_PER_UNIT بالضبط. أكوادها "${code}.1" .. "${code}.$MAX_LESSONS_PER_UNIT".
- labs.length = $MAX_LABS_PER_UNIT بالضبط. أكوادها "${code}.م1" .. "${code}.م$MAX_LABS_PER_UNIT".
- كل معمل: 5 أسئلة، نوع واحد من كل: diagnostic, decision, application, analysis, connection.
- كل درس: 3-6 مفاهيم، 2-4 أخطاء شائعة (Python/Data Science محددة)، 1-3 أمثلة كود يمنية كاملة (مع imports).
- explanation لكل مفهوم: فقرة ≥40 كلمة.
- كل كود Python صحيح نحوياً ويعمل فعلاً. imports موجودة.
- prerequisite_lesson_codes: للدرس الأول []، ولاحقاً [كود الدرس السابق].
- bridge_sentence: ≥10 كلمات.
- common_mistakes: severity ∈ {minor, major, critical}. ركّز على أخطاء Data Science الواقعية.
- concepts: weight=1 افتراضياً، ارفعه لـ 2-3 للمفاهيم المحورية.

أمثلة بيانات يمنية يجب توظيفها بكود حقيقي:
- أسعار السلع في سوق باب اليمن (pandas DataFrame + matplotlib)
- تحليل استهلاك الكهرباء الشهري (time series + rolling window)
- تصنيف جودة البن اليمني (Decision Tree / Random Forest)
- توقّع درجات الحرارة حسب الموسم (Linear Regression)
- تجميع المحافظات حسب المؤشرات الاقتصادية (K-Means)
- نظام توصيات للأسواق (Collaborative Filtering)
- تحليل نصوص الآراء حول المنتجات اليمنية (NLP/Sentiment)

أخرج JSON خام فقط.
EOF
)"

    call_llm "$SYS_BASE" "$user" "$out" || warn "تعذّر توليد الوحدة $code — تستطيع إعادة المرحلة لاحقاً."
  done <<< "$codes"

  ok "اكتملت مرحلة الوحدات."
}

# ── 5. مرحلة الامتحانات ──────────────────────────────────────────────────────
gen_exam_bank() {
  local scope="$1" code="$2" out="$3" ctx="$4" expected_qs="$5"
  [[ -f "$out" ]] && { ok "موجود (تخطّي): $(basename "$out")"; return 0; }

  local user
  user="$(cat <<EOF
أنشئ بنك أسئلة امتحان لـ $scope "$code" في تخصص "$SPEC_NAME".

السياق:
$ctx

المطلوب JSON بهذا الشكل بالضبط:
{
  "code": "$code",
  "scope": "$scope",
  "variants": [
    [
      {
        "question_index": 1,
        "kind": "mcq",
        "prompt": "ما مخرج هذا الكود Python؟\n\`\`\`python\n# code here\n\`\`\`",
        "choices": ["أ) ...", "ب) ...", "ج) ...", "د) ..."],
        "correct_index": 0,
        "explanation": "شرح سبب صحة الإجابة وخطأ البدائل",
        "difficulty": 1,
        "points": 1,
        "time_limit_seconds": 90
      },
      {
        "question_index": 2,
        "kind": "practical",
        "prompt": "اكتب كود Python كاملاً لتحليل بيانات (سيناريو يمني)...",
        "rubric": "الكود يعمل + DataFrame صحيح + الرسم البياني دقيق + الأسلوب نظيف",
        "solution_outline": "الكود النموذجي الكامل + المخرج المتوقّع",
        "difficulty": 2,
        "points": 2,
        "time_limit_seconds": 300
      }
    ]
  ]
}

قواعد:
- variants.length = $EXAM_VARIANTS بالضبط.
- كل variant فيه $expected_qs سؤالاً.
- توزيع difficulty: 30% (1) سهل، 50% (2) متوسط، 20% (3) صعب.
- أنواع الأسئلة: mcq | short_answer | practical.
  * mcq: 3-4 choices، correct_index صحيح.
  * practical: كود Python كامل مع سيناريو يمني.
- لا تتكرّر الأسئلة بين الـ variants.
- كل كود Python صحيح نحوياً ويعمل.

أخرج JSON خام فقط.
EOF
)"
  call_llm "$SYS_BASE" "$user" "$out"
}

phase_exams() {
  [[ -f "$OUT_DIR/skeleton.json" ]] || { err "نفّذ skeleton أولاً"; return 1; }

  while IFS= read -r unit_code; do
    [[ -z "$unit_code" ]] && continue
    local out="$OUT_DIR/exams/unit/${unit_code}.json"
    local ctx
    ctx="$(jq --arg c "$unit_code" '
      .levels[].stages[].units[] | select(.code==$c) |
      {name, goal, key_concepts, bloom_focus}
    ' "$OUT_DIR/skeleton.json")"
    gen_exam_bank "unit" "$unit_code" "$out" "$ctx" 10 || true
  done < <(jq -r '.levels[].stages[].units[].code' "$OUT_DIR/skeleton.json")

  while IFS= read -r stage_code; do
    [[ -z "$stage_code" ]] && continue
    local out="$OUT_DIR/exams/stage/${stage_code}.json"
    local ctx
    ctx="$(jq --arg c "$stage_code" '
      .levels[].stages[] | select(.code==$c) |
      {name, goal, units: [.units[] | {code, name, key_concepts}]}
    ' "$OUT_DIR/skeleton.json")"
    gen_exam_bank "stage" "$stage_code" "$out" "$ctx" 15 || true
  done < <(jq -r '.levels[].stages[].code' "$OUT_DIR/skeleton.json")

  while IFS= read -r level_idx; do
    [[ -z "$level_idx" ]] && continue
    local out="$OUT_DIR/exams/level/${level_idx}.json"
    local ctx
    ctx="$(jq --argjson i "$level_idx" '
      .levels[] | select(.level_index==$i) |
      {name, goal, stages: [.stages[] | {code, name, units: [.units[] | {code, name}]}]}
    ' "$OUT_DIR/skeleton.json")"
    gen_exam_bank "level" "$level_idx" "$out" "$ctx" 20 || true
  done < <(jq -r '.levels[].level_index' "$OUT_DIR/skeleton.json")

  ok "اكتملت مرحلة الامتحانات."
}

# ── 6. مرحلة اختبار التحديد ─────────────────────────────────────────────────
phase_placement() {
  local out="$OUT_DIR/placement.json"
  [[ -f "$out" ]] && { ok "موجود (تخطّي): placement.json"; return 0; }
  [[ -f "$OUT_DIR/skeleton.json" ]] || { err "نفّذ skeleton أولاً"; return 1; }

  local ctx
  ctx="$(jq '{levels: [.levels[] | {level_index, name, goal}]}' "$OUT_DIR/skeleton.json")"

  local user
  user="$(cat <<EOF
أنشئ اختبار تحديد مستوى تكيّفي لتخصص "$SPEC_NAME".
الهدف: قياس خلفية الطالب في علوم البيانات بسرعة لتوجيهه للمستوى المناسب.

سياق المستويات:
$ctx

المطلوب JSON:
{
  "questions": [
    {
      "target_level_index": 1,
      "kind": "mcq",
      "prompt": "ما مخرج: import pandas as pd; print(pd.Series([1,2,3]).mean())?",
      "choices": ["أ) 2.0", "ب) 1.0", "ج) 3.0", "د) خطأ"],
      "correct_index": 0,
      "difficulty": 1,
      "explanation": "mean() للـSeries يحسب المتوسط الحسابي = (1+2+3)/3 = 2.0"
    }
  ]
}

قواعد:
- 20-30 سؤالاً، موزَّعة على 5 مستويات (4-6 لكل مستوى).
- target_level_index: المستوى الذي يقيسه السؤال.
- difficulty: 1 (مبتدئ جداً)، 2 (متوسط)، 3 (متمكّن).
- أنواع الأسئلة: mcq + short_answer.
  * للمستوى 1: Python basics (list comprehension, pandas read_csv, numpy mean)
  * للمستوى 2: EDA (fillna, groupby, merge, data type conversion)
  * للمستوى 3: Statistics & ML (p-value, R², Logistic Regression, confusion matrix)
  * للمستوى 4: Advanced ML (cross-validation, overfitting, PCA, XGBoost)
  * للمستوى 5: Deep Learning (CNN, LSTM, Transfer Learning, deployment)
- كل كود Python كامل وصحيح نحوياً.
- correct_index: احسب المخرج فعلياً قبل الضبط.
- explanation: جملة تشرح السبب.

أخرج JSON خام فقط.
EOF
)"

  call_llm "$SYS_BASE" "$user" "$out"
}

# ── 7. التجميع النهائي ───────────────────────────────────────────────────────
phase_merge() {
  local out="$OUT_DIR/final.json"
  [[ -f "$OUT_DIR/skeleton.json" ]] || { err "ينقص skeleton.json"; return 1; }

  log "تجميع الهيكل + الوحدات..."

  local tmp_units_map="$OUT_DIR/.tmp_units_map.json"
  local tmp_core="$OUT_DIR/.tmp_core.json"
  local tmp_ub="$OUT_DIR/.tmp_unit_banks.json"
  local tmp_sb="$OUT_DIR/.tmp_stage_banks.json"
  local tmp_lb="$OUT_DIR/.tmp_level_banks.json"
  local tmp_pl="$OUT_DIR/.tmp_placement.json"

  echo '{}' > "$tmp_units_map"
  for f in "$OUT_DIR"/units/*.json; do
    [[ -f "$f" ]] || continue
    jq -s '
      .[0] as $map | .[1] as $unit |
      $map + {($unit.code): {lessons: $unit.lessons, labs: $unit.labs}}
    ' "$tmp_units_map" "$f" > "${tmp_units_map}.tmp" 2>/dev/null || { warn "فشل دمج $f — تخطّي"; continue; }
    mv "${tmp_units_map}.tmp" "$tmp_units_map"
  done

  jq --slurpfile mArr "$tmp_units_map" '
    ($mArr[0] // {}) as $m
    | def set_exam: (if (.exam_meta | type) == "object" then .exam = .exam_meta else . end) | del(.exam_meta);
    def norm_lesson:
      .prerequisite_lessons = (.prerequisite_lesson_codes // .prerequisite_lessons // [])
      | .enables_lessons    = (.enables_lesson_codes    // .enables_lessons    // [])
      | del(.prerequisite_lesson_codes, .enables_lesson_codes);
    def norm_unit:
      .prerequisite_units = (.prerequisite_unit_codes // .prerequisite_units // [])
      | .enables_units    = (.enables_unit_codes    // .enables_units    // [])
      | del(.prerequisite_unit_codes, .enables_unit_codes)
      | set_exam
      | (if (.lessons | type) == "array" then .lessons |= map(norm_lesson) else . end);
    .levels |= map(
      set_exam
      | .stages |= map(
          set_exam
          | .units |= map(
              . as $u
              | (.lessons = ($m[$u.code].lessons // []))
              | (.labs    = ($m[$u.code].labs    // []))
              | norm_unit
            )
        )
    )
  ' "$OUT_DIR/skeleton.json" > "$tmp_core"

  jq '
    ([.levels[].stages[].units[].code]) as $uc
    | ([.levels[].stages[].units[].lessons[].code]) as $lc
    | .levels |= map(.stages |= map(.units |= map(
        . as $u
        | .prerequisite_units = ((.prerequisite_units // []) | map(select(. as $x | ($uc|index($x)) != null and $x != $u.code)))
        | .enables_units      = ((.enables_units      // []) | map(select(. as $x | ($uc|index($x)) != null and $x != $u.code)))
        | .lessons |= map(
            . as $l
            | .prerequisite_lessons = ((.prerequisite_lessons // []) | map(select(. as $x | ($lc|index($x)) != null and $x != $l.code)))
            | .enables_lessons      = ((.enables_lessons      // []) | map(select(. as $x | ($lc|index($x)) != null and $x != $l.code)))
          )
        | .labs |= (if type == "array" then map(
            .prerequisite_lessons = ((.prerequisite_lessons // []) | map(select(. as $x | ($lc|index($x)) != null)))
          ) else . end)
      )))
  ' "$tmp_core" > "${tmp_core}.2" && mv "${tmp_core}.2" "$tmp_core"

  log "تجميع بنوك الامتحانات..."
  jq -s 'map({(.code | sub("\\.exam$"; "")): {variants: .variants}}) | add // {}' \
    "$OUT_DIR"/exams/unit/*.json > "$tmp_ub" 2>/dev/null || echo '{}' > "$tmp_ub"
  jq -s 'map({(.code | sub("\\.exam$"; "")): {variants: .variants}}) | add // {}' \
    "$OUT_DIR"/exams/stage/*.json > "$tmp_sb" 2>/dev/null || echo '{}' > "$tmp_sb"
  jq -s 'map({(.code | tostring | sub("\\.exam$"; "")): {variants: .variants}}) | add // {}' \
    "$OUT_DIR"/exams/level/*.json > "$tmp_lb" 2>/dev/null || echo '{}' > "$tmp_lb"

  if [[ -f "$OUT_DIR/placement.json" ]]; then
    jq '.questions // []' "$OUT_DIR/placement.json" > "$tmp_pl"
  else
    echo '[]' > "$tmp_pl"
  fi

  jq -n \
    --slurpfile coreArr "$tmp_core" \
    --slurpfile ubArr "$tmp_ub" \
    --slurpfile sbArr "$tmp_sb" \
    --slurpfile lbArr "$tmp_lb" \
    --slurpfile plArr "$tmp_pl" \
    --arg notes "الإصدار التلقائي بواسطة generate-v4-data-science-skill.sh — التخصص: $SPEC_NAME" \
    '($coreArr[0]) as $core
     | {
       schema_version: $core.schema_version,
       specialty: $core.specialty,
       levels: $core.levels,
       exam_banks: {
         unit_banks:  ($ubArr[0] // {}),
         stage_banks: ($sbArr[0] // {}),
         level_banks: ($lbArr[0] // {})
       },
       placement_test_questions: ($plArr[0] // []),
       publish_notes: $notes
     }' > "$out"

  rm -f "$tmp_units_map" "$tmp_core" "$tmp_ub" "$tmp_sb" "$tmp_lb" "$tmp_pl"

  ok "الملف النهائي جاهز: $out"
  echo
  echo "إحصائيات:"
  jq '{
    schema_version,
    levels: (.levels | length),
    stages: ([.levels[].stages[]] | length),
    units:  ([.levels[].stages[].units[]] | length),
    lessons:([.levels[].stages[].units[].lessons[]] | length),
    labs:   ([.levels[].stages[].units[].labs[]] | length),
    unit_exams:  (.exam_banks.unit_banks  | length),
    stage_exams: (.exam_banks.stage_banks | length),
    level_exams: (.exam_banks.level_banks | length),
    placement:   (.placement_test_questions | length)
  }' "$out"
}

# ── 8. فحص السلامة الآلي ─────────────────────────────────────────────────────
phase_validate() {
  local f="$OUT_DIR/final.json"
  [[ -f "$f" ]] || { err "لا يوجد final.json — نفّذ merge أولاً"; return 1; }

  log "فحص سلامة $f ..."
  local errors=0

  # سكريبت فحص كامل
  local report
  report="$(jq -r '
    ([.levels[].stages[].units[].lessons[].code]) as $lessons |
    ([.levels[].stages[].units[].code]) as $units |
    ([.levels[].stages[].code]) as $stages |
    ([.levels[].stages[].units[].labs[].code]) as $labs |
    [
      (if (.schema_version | IN("v4.0","v4.1")) then empty else "❌ schema_version غير صالح" end),
      (if (.levels | length) > 0 then empty else "❌ لا توجد مستويات" end),
      (if ($lessons | length) - ($lessons | unique | length) > 0 then "❌ أكواد دروس مكررة" else empty end),
      (if ($units | length) - ($units | unique | length) > 0 then "❌ أكواد وحدات مكررة" else empty end),
      (if ($stages | length) - ($stages | unique | length) > 0 then "❌ أكواد مراحل مكررة" else empty end),
      (if ($labs | length) - ($labs | unique | length) > 0 then "❌ أكواد معامل مكررة" else empty end),
      ([.levels[].stages[].units[] | select((.lessons | length) == 0) | .code] |
       if length > 0 then "❌ وحدات بلا دروس: \(join(", "))" else empty end),
      ([.levels[].stages[].units[].labs[] | select(([.questions[].kind] | unique | length) != 5) | .code] |
       if length > 0 then "❌ معامل بأنواع ناقصة/مكررة: \(join(", "))" else empty end)
    ] | .[]
  ' "$f" 2>&1)" || true

  if [[ -n "$report" ]]; then
    err "وُجدت مشاكل في الملف:"
    printf '%s\n' "$report" >&2
    errors=1
  fi

  local L S U LE LA
  L="$(jq '.levels | length' "$f")"
  S="$(jq '[.levels[].stages[]] | length' "$f")"
  U="$(jq '[.levels[].stages[].units[]] | length' "$f")"
  LE="$(jq '[.levels[].stages[].units[].lessons[]] | length' "$f")"
  LA="$(jq '[.levels[].stages[].units[].labs[]] | length' "$f")"
  log "العدّ: مستويات=$L مراحل=$S وحدات=$U دروس=$LE معامل=$LA"

  if (( errors == 0 )); then
    ok "✅ اجتاز الفحص — ملف علوم البيانات جاهز للنشر."
    return 0
  fi
  err "أصلح المشاكل أعلاه: احذف ملف الجزء المعيب من $OUT_DIR ثم أعد توليده + merge + validate."
  return 1
}

# ── 9. توجيه الأوامر ────────────────────────────────────────────────────────
cmd="${1:-help}"
case "$cmd" in
  skeleton)  phase_skeleton ;;
  units)     phase_units ;;
  exams)     phase_exams ;;
  placement) phase_placement ;;
  merge)     phase_merge ;;
  validate)  phase_validate ;;
  resume)
    # resume: merge + validate only (assuming all parts exist)
    phase_merge && phase_validate || warn "الملف أُنشئ لكن فيه ملاحظات."
    ;;
  all)
    phase_skeleton
    phase_units
    phase_exams
    phase_placement
    phase_merge
    phase_validate || warn "الملف أُنشئ لكن فيه ملاحظات — راجعها قبل النشر."
    ;;
  help|*)
    cat <<USAGE
الاستخدام: bash scripts/generate-v4-data-science-skill.sh <command>

مُولِّد ملف تعليمات تخصص «$SPEC_NAME» (قسم المهارات)
منهج عملي بحت: من أول import pandas حتى بناء نماذج Deep Learning وكابستون.

أبسط طريقة (مفتاح Google + أمر واحد):
  export GOOGLE_API_KEY="..."          # من Google AI Studio
  bash scripts/generate-v4-data-science-skill.sh all

الأوامر:
  skeleton    1) أنشئ هيكل التخصص (specialty + levels + stages + units)
  units       2) املأ كل وحدة بدروس Python/DS عملية + معامل
  exams       3) ولّد بنوك الامتحانات (وحدة/مرحلة/مستوى)
  placement   4) ولّد اختبار تحديد المستوى
  merge       5) ادمج كل الأجزاء في final.json
  validate    6) افحص final.json آلياً قبل النشر
  resume      merge + validate (لاستئناف بعد اكتمال كل الأجزاء)
  all         نفّذ كل المراحل + الفحص بالتسلسل

المفتاح (أحدها إجباري):
  VERTEX_PROJECT       مُعرّف مشروع Google Cloud
  GOOGLE_API_KEY       مفتاح Google AI Studio
  OPENROUTER_API_KEY   بديل عبر OpenRouter

اختياري:
  TEST=1         حجم صغير لاختبار سريع (1×1×1×3×1×1)
  MODEL          نموذج مختلف (gemini-2.5-pro)
  REQUEST_DELAY  ثوانٍ بين النداءات (افتراضي 2)

الحجم الحالي: مستويات=$MAX_LEVELS مراحل/مستوى=$MAX_STAGES_PER_LEVEL وحدات/مرحلة=$MAX_UNITS_PER_STAGE
              دروس/وحدة=$MAX_LESSONS_PER_UNIT معامل/وحدة=$MAX_LABS_PER_UNIT بنوك امتحان=$EXAM_VARIANTS
              (الافتراضي = الملف الكامل 5×7×9×10. استخدم TEST=1 للتجربة السريعة.)

ملاحظات:
  • الملف الكامل ≈ 5 مستويات × 7 مراحل × 9 وحدات = 315 وحدة
    كل وحدة درس + معمل + امتحان ≈ 350+ نداء، يأخذ ساعات.
    شغّله في الخلفية:
      nohup bash scripts/generate-v4-data-science-skill.sh all > run-ds.log 2>&1 &
      tail -f run-ds.log
  • السكريبت يستأنف تلقائياً — أي ملف موجود يُتخطّى.
  • TEST=1 bash scripts/generate-v4-data-science-skill.sh all   # تجربة سريعة

الإخراج: \$OUT_DIR/final.json (افتراضياً ./out/skill-data-science/final.json)
الصقه في تبويب "ملف التعليمات v4" بلوحة الإدارة → تحقّق → نشر.
USAGE
    ;;
esac
