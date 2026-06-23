#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# generate-v4-java-skill.sh — مُولِّد ملف تعليمات نُخبة v4 لمهارة «البرمجة بلغة Java»
#
# هذا السكريبت مُخصَّص بالكامل لإنتاج ملف تعليمات عالي الجودة لمهارة *Java*
# داخل قسم المهارات (skills / professional_track). ما يميّزه:
#   • كل درس عملي: تمرين كود Java قابل للتنفيذ في محرّر نُخبة (Nukhba IDE) لا نظري فقط.
#   • منهجية «توقّع ثم نفّذ»: الطالب يتوقّع مخرجات الكود قبل تشغيله.
#   • ثقافة تصحيح الأخطاء: كل درس فيه كود معطوب يُكتشف ويُصلَّح.
#   • أمثلة Java من الحياة اليمنية (الصرافة، فواتير الكهرباء، السوق، الباصات…).
#   • توظيف الأدوات البصرية: java_trace لتتبّع التنفيذ، flowchart للخوارزميات،
#     و[[ANIM]] للعمليات الديناميكية (الحلقات، الوراثة، Stack/Heap، Collections).
#   • تدرّج حقيقي: الأساسيات ⇒ OOP ⇒ Collections/Generics ⇒ استثناءات/ملفّات
#     ⇒ Streams/Lambda ⇒ تصميم وأنماط ⇒ مشاريع يمنية متكاملة.
#
# لماذا سكريبت بدلاً من نداء واحد؟
#   الملف الكامل = 3 مستويات × 7 مراحل × 9 وحدات × 10 دروس = 1,890 درساً
#   + معامل + بنوك امتحانات لكل (وحدة/مرحلة/مستوى) + اختبار تحديد. لا يوجد نموذج
#   LLM يُخرج هذا في ردٍ واحد، لذا نولّده على مراحل، نحفظ كل جزء على القرص
#   (لاستئناف ما توقف)، ثم نُجمِّع بـ jq. المخطّط (schema) مطابق تماماً للمنصّة.
#
# المتطلبات: bash 4+, curl, jq
#
# المزوّد (يُكتشف تلقائياً): VERTEX_PROJECT (رصيد Cloud) أو GOOGLE_API_KEY أو
# OPENROUTER_API_KEY.
#
# طريقة الاستخدام (أبسط صورة):
#   export GOOGLE_API_KEY=...
#   bash scripts/generate-v4-java-skill.sh all
#   (SPEC_SLUG و SPEC_NAME لهما قيمتان افتراضيتان لـ Java — لا داعي لضبطهما.)
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
  echo "❌ ضع VERTEX_PROJECT (لاستهلاك رصيد Cloud) أو GOOGLE_API_KEY أو OPENROUTER_API_KEY" >&2
  exit 1
fi

# نموذج احتياطي للتحويل التلقائي عند استنفاد الحصة (429).
if [[ "$PROVIDER" == "openrouter" ]]; then
  FALLBACK_MODEL="${FALLBACK_MODEL:-google/gemini-2.5-pro}"
else
  FALLBACK_MODEL="${FALLBACK_MODEL:-gemini-2.5-pro}"
fi
AUTO_FALLBACK="${AUTO_FALLBACK:-1}"

# قيم افتراضية مُخصَّصة لمهارة Java (قابلة للتجاوز).
SPEC_SLUG="${SPEC_SLUG:-skill-java}"
SPEC_NAME="${SPEC_NAME:-البرمجة بلغة Java}"
SPEC_DESC="${SPEC_DESC:-مهارة عملية بحتة لإتقان Java من أول دقيقة — تبدأ بكتابة وتشغيل الكود فوراً دون أي مقدمة نظرية، وتنتهي ببناء تطبيقات يمنية حقيقية. المنهج 3 مستويات مكثفة: تأسيس Java وOOP، هياكل البيانات والمكتبات، ثم تصميم التطبيقات والمشاريع المتكاملة.}"
SPEC_SCOPE="${SPEC_SCOPE:-professional_track}"
SPEC_LANG="${SPEC_LANG:-ar}"
SPEC_REGION="${SPEC_REGION:-YE}"
OUT_DIR="${OUT_DIR:-./out/$SPEC_SLUG}"
REQUEST_DELAY="${REQUEST_DELAY:-2}"

# الحجم الافتراضي = الملف الكامل. TEST=1 يخفضه لاختبار سريع.
if [[ "${TEST:-0}" == "1" ]]; then
  MAX_LEVELS="${MAX_LEVELS:-1}"
  MAX_STAGES_PER_LEVEL="${MAX_STAGES_PER_LEVEL:-1}"
  MAX_UNITS_PER_STAGE="${MAX_UNITS_PER_STAGE:-1}"
  MAX_LESSONS_PER_UNIT="${MAX_LESSONS_PER_UNIT:-3}"
  MAX_LABS_PER_UNIT="${MAX_LABS_PER_UNIT:-1}"
  EXAM_VARIANTS="${EXAM_VARIANTS:-1}"
else
  MAX_LEVELS="${MAX_LEVELS:-3}"
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

# ── 1. نداء النموذج (Google أو OpenRouter أو Vertex) مع JSON-mode + إعادة محاولة
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
        err "تعذّر الحصول على توكن gcloud. نفّذ: gcloud auth login  ثم  gcloud auth application-default login"
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
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 65536,
          responseMimeType: "application/json"
        }
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
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 65536,
          responseMimeType: "application/json"
        }
      }')"
      resp="$(curl -sS --max-time 600 -w $'\n%{http_code}' \
        -H "Content-Type: application/json" \
        -H "x-goog-api-key: $GOOGLE_API_KEY" \
        -X POST "$endpoint" -d "$body")" \
        || { warn "فشل cURL، إعادة المحاولة..."; sleep "$backoff"; backoff=$((backoff*2)); continue; }
    else
      local body
      body="$(jq -n --arg model "$MODEL" --arg sys "$sys" --arg user "$user" '{
        model: $model,
        messages: [ {role:"system", content:$sys}, {role:"user", content:$user} ],
        response_format: {type:"json_object"},
        temperature: 0.4,
        max_tokens: 32000
      }')"
      resp="$(curl -sS --max-time 600 -w $'\n%{http_code}' \
        -H "Authorization: Bearer $OPENROUTER_API_KEY" \
        -H "Content-Type: application/json" \
        -H "HTTP-Referer: https://learnukhba.com" \
        -H "X-Title: Nukhba v4 Java Skill Generator" \
        -X POST https://openrouter.ai/api/v1/chat/completions \
        -d "$body")" \
        || { warn "فشل cURL، إعادة المحاولة..."; sleep "$backoff"; backoff=$((backoff*2)); continue; }
    fi

    http="$(printf '%s' "$resp" | tail -n1)"
    resp="$(printf '%s' "$resp" | sed '$d')"
    printf '%s\n' "$resp" > "$log_file"

    if [[ "$http" == "429" ]]; then
      if [[ "$AUTO_FALLBACK" == "1" && "$MODEL" != "$FALLBACK_MODEL" ]]; then
        warn "النموذج '$MODEL' استُنفدت حصته (429) — التحويل تلقائياً إلى '$FALLBACK_MODEL' ومتابعة التوليد."
        MODEL="$FALLBACK_MODEL"
        tries=0; backoff=5
        continue
      fi
      warn "حصة/حدّ معدّل (429): $(jq -r '.error.message // empty' <<<"$resp" | head -c 300)"
      warn "النموذج '$MODEL' استُنفدت حصته أيضاً. الحلول: انتظر إعادة تعيين الحصة، أو فعّل الفوترة لمشروعك، أو جرّب FALLBACK_MODEL=نموذج-آخر."
      sleep "$backoff"; backoff=$((backoff*2)); continue
    fi

    if [[ "$http" == "401" || "$http" == "403" ]]; then
      err "مصادقة فاشلة ($http): $(jq -r '.error.message // empty' <<<"$resp" | head -c 300)"
      if [[ "$PROVIDER" == "vertex" ]]; then
        err "Vertex: تأكد أن Vertex AI API مفعّل، وأن VERTEX_PROJECT صحيح، ونفّذت: gcloud auth login"
      else
        err "تأكد أن GOOGLE_API_KEY مفتاح API حقيقي يبدأ بـ AIza من aistudio.google.com/apikey (وليس OAuth token)."
      fi
      return 1
    fi

    if jq -e '.error' >/dev/null 2>&1 <<<"$resp"; then
      err "خطأ API ($http): $(jq -r '.error.message // .error | tostring' <<<"$resp" | head -c 300)"
      sleep "$backoff"; backoff=$((backoff*2)); continue
    fi

    if [[ "$PROVIDER" == "google" || "$PROVIDER" == "vertex" ]]; then
      local finish
      finish="$(jq -r '.candidates[0].finishReason // empty' <<<"$resp")"
      [[ "$finish" == "MAX_TOKENS" ]] && warn "الردّ بلغ سقف التوكنز (قد يكون مبتوراً) — سيُعاد إن لم يكن JSON صالحاً."
      content="$(jq -r '[.candidates[0].content.parts[]?.text] | join("") // empty' <<<"$resp")"
    else
      content="$(jq -r '.choices[0].message.content // empty' <<<"$resp")"
    fi

    if [[ -z "$content" ]]; then
      warn "ردّ فارغ، إعادة المحاولة..."; sleep "$backoff"; backoff=$((backoff*2)); continue
    fi

    content="$(printf '%s' "$content" | sed -E 's/^```(json)?//;s/```$//' | sed -E '/^```$/d')"

    if printf '%s' "$content" | jq -e . >/dev/null 2>&1; then
      printf '%s' "$content" > "$out"
      ok "حُفظ: $out ($(wc -c < "$out") بايت)"
      sleep "$REQUEST_DELAY"
      return 0
    fi

    warn "JSON غير صالح/مبتور، عيّنة: $(printf '%s' "$content" | head -c 160)..."
    sleep "$backoff"; backoff=$((backoff*2))
  done

  err "فشل توليد $out بعد $max_tries محاولات. راجع $log_file"
  return 1
}

# ── 2. التلقين الأساسي — هوية مؤلّف مناهج Java عملية عالية الجودة ──────────
read -r -d '' SYS_BASE <<'EOF' || true
أنت خبير تدريس برمجة بلغة Java ومُصمِّم مناهج عربي فائق الجودة، تبني مساراً عملياً بحتاً للطلاب اليمنيين. لا توجد محاضرات نظرية — كل شيء يبدأ من أول دقيقة بكتابة كود Java حقيقي وتشغيله. تُنتج ملف تعليمات v4.1 لمنصّة نُخبة (Nukhba) لمهارة «البرمجة بلغة Java» بـ 3 مستويات مكثفة عالية القدرات.

سياق المنصّة التقني (استثمره في التعليمات):
- لدى الطالب «محرّر نُخبة» (Nukhba IDE): محرّر Monaco متعدّد الملفّات + شجرة ملفّات + تنفيذ كود فعلي بـ JVM مدمج. كل درس عملي: الطالب يكتب كلاساً Java كاملاً ويشغّله ويرى المخرج فوراً.
- المعلّم الذكي يملك أدوات بصرية: `java_trace` (تتبّع الكود سطراً بسطر مع Stack/Heap وقيم المتغيّرات)، `flowchart` (الخوارزميات وقرارات OOP)، و`[[ANIM]]` (رسوم متحرّكة للعمليات الديناميكية: إنشاء الكائنات في الـHeap، سلسلة الوراثة، دورة حياة الـThread، تدفّق الـStreams، بنية الـCollections). صمّم المحتوى ليستدعي هذه الأدوات طبيعياً.

قواعد ذهبية مُلزِمة:
1. مخرجك دائماً مستند JSON واحد فقط — لا markdown، لا ``` ، لا شرح قبل أو بعد، لا تعليقات داخل JSON.
2. كل النصوص الشارحة بالعربية الفصحى المبسّطة (مفهومة لمبتدئ يمني)، عدا: أكواد Java، أسماء الكلاسات/المميّزات/الكلمات المفتاحية، slug/kind/bloom_focus. أيّ مصطلح تقني إنجليزي يُشرح بالعربية بجانبه أول مرة (مثال: «الصنف class: قالب يصف شكل الكائن وسلوكه، مثل قالب فاتورة الدكان»).
3. **Java عملية لا حفظ**: كل درس يحتوي كوداً Java حقيقياً قابلاً للتشغيل (بما فيه تعريف الكلاس وـ main)، ومخرجاً متوقّعاً واضحاً. ممنوع درس بلا كود.
4. **أمثلة من الحياة اليمنية بكود Java**: حساب فاتورة الكهرباء، تحويل العملة (ريال/دولار/سعودي) عند الصرّاف، إدارة مخزون الدكان، حساب أجرة الباص، معدّل درجات الطالب، جدول انقطاع الكهرباء، مخزون الصيدلية، كشف حساب زبائن المحل. اجعل الكود يحلّ مشكلة يلمسها الطالب. **ممنوع منعاً باتاً ذكر القات في أي مثال** — استخدم بدائل محايدة ومقبولة: البنّ اليمني، التمور، العسل، البهارات، الأقمشة، المخلّلات، الأسماك.
5. **منهجية «توقّع ثم نفّذ» (predict-then-run)**: صمّم الأسئلة بحيث يتوقّع الطالب مخرجات الكود قبل تشغيله في المحرّر، ثم يكتشف الفرق ويفهم السبب. هذا يثبّت الفهم أعمق من التلقين.
6. **ثقافة تصحيح الأخطاء (debugging)**: في الأخطاء الشائعة لكل درس، أدرِج أخطاء Java الواقعية التي يقع فيها المبتدئ:
   - NullPointerException: استخدام مرجع لم يُهيَّأ بعد
   - ArrayIndexOutOfBoundsException: تجاوز حدود المصفوفة (off-by-one)
   - ClassCastException: تحويل نوع خاطئ عند Casting
   - StackOverflowError: تكرار ذاتي recursion بلا شرط إيقاف
   - نسيان كلمة new عند إنشاء الكائن
   - الخلط بين == و .equals() عند مقارنة النصوص
   - نسيان return في دوال غير void
   - تعريف متغيّر داخل if ومحاولة استخدامه خارجه (scope error)
   مع التصحيح وكيف تُقرأ رسالة الخطأ من سطر الـStackTrace.
7. الأكواد الرسمية مُحدَّدة: المستوى "L"، المرحلة "L.S"، الوحدة "L.S.U"، الدرس "L.S.U.Lesson"، المعمل "L.S.U.مX"، الامتحان "<scope>.exam".
   مثال: المستوى الأول = "1"، مرحلته الثالثة = "1.3"، وحدتها الخامسة = "1.3.5"، درسها السابع = "1.3.5.7"، معملها الأول = "1.3.5.م1"، امتحان وحدتها = "1.3.5.exam".
8. لا تتكرّر أكواد، ولا تتكرّر أنواع أسئلة المعمل داخل المعمل الواحد، ولا تتكرّر أسماء المفاهيم داخل الدرس.
9. كل prerequisite_* و enables_* يشير لكود موجود فعلاً في الملف.
10. أنواع أسئلة المعمل الخمسة: diagnostic | decision | application | analysis | connection — معمل = 5 أسئلة، واحد من كل نوع، بدون تكرار.
11. bloom_focus: remember|understand|apply|analyze|evaluate|create — يتدرّج صعوداً مع المستويات.
12. لا تختصر داخل العنصر الذي تكتبه. إذا ضاقت السعة، أبلغني صراحةً بدلاً من اختزال المحتوى.
12b. **ممنوع استخدام نصوص قالبية أو عامة** مثل "خطأ شائع متوقّع في هذا الدرس" أو "التصحيح الصحيح". كل خطأ common_mistake يجب أن يكون خطأً Java حقيقياً محدداً مرتبطاً بمحتوى الدرس مع رسالة الخطأ الفعلية (مثلاً: `NullPointerException at ShopManager.java:14` بسبب نسيان `new` عند تهيئة ArrayList). إذا لم تستطع كتابة خطأ حقيقي، فاكتب درساً أقل بدلاً من ملء الباقي بنصوص قالبية.
13. **الدرس الأول عملي بحت — ابدأ الكود فوراً**: لا تبدأ بـ «ما هي Java» أو «لماذا Java» أو «تاريخ Java». الدرس الأول: اكتب أبسط كلاس Java وشغّله:
    ```java
    public class Ahlan {
        public static void main(String[] args) {
            System.out.println("أهلاً يا يمن!");
            System.out.println(5 + 3);
        }
    }
    ```
    ثم أضف Scanner لقراءة اسم المستخدم. كل مفهوم يُشرح أثناء كتابة الكود، لا قبله. الشرح كله داخل الكود وبعده مباشرة (سطر أو سطران).
14. **سؤال التحقّق النهائي (final_check_question)**: اجعله عملياً — يطلب من الطالب كتابة كود Java أو توقّع مخرج. استخدم `[[ASK_OPTIONS: ...]]` للاختيار من متعدّد، مثلاً: `[[ASK_OPTIONS: ما مخرج System.out.println(10 / 3);؟ ||| 3 ||| 3.33 ||| 3.0 ||| خطأ في التشغيل]]`. للأسئلة المفتوحة (كتابة كود) اتركها بدون الوسم.

التدرّج العلمي المطلوب لمنهج Java — 3 مستويات مكثفة (التزِم بروحه):

مستوى 1 — «تأسيس Java وOOP الأول» (apply):
  • الكلاس الأول وـ main وـ System.out.println: كتابة وتشغيل الكود من الدقيقة الأولى
  • المتغيّرات والأنواع البدائية: int, double, boolean, char
  • String وأهمّ دوالها: length(), charAt(), substring(), equals(), contains()
  • الإدخال بـ Scanner: nextLine(), nextInt(), nextDouble()
  • العمليات الحسابية وأولوية العمليات، Integer division مقابل double division
  • الشروط: if/else if/else، switch/case، العامل الثلاثي ? :
  • الحلقات: for، while، do-while، break، continue، الحلقات المتداخلة
  • المصفوفات: تعريف، تهيئة، Arrays.sort()، Arrays.toString()، المصفوفات ثنائية الأبعاد
  • الدوال الثابتة static: تعريف، استدعاء، القيمة المُرجَعة، الوسائط، التحميل الزائد overloading
  • مقدّمة OOP: الكلاس، الـinstance variables، الـconstructor، الـthis، إنشاء الكائنات بـ new
  • الوصول: public/private، الـgetters والـsetters، تغليف البيانات encapsulation

مستوى 2 — «OOP متقدّم + Collections + استثناءات» (analyze):
  • الوراثة inheritance: extends، super()، method overriding، @Override
  • تعدّد الأشكال polymorphism: upcasting، downcasting، instanceof
  • الكلاسات المجرّدة abstract class وـ abstract methods
  • الواجهات interface: implements، default methods، الفرق بين abstract وinterface
  • Collections Framework: ArrayList، LinkedList، HashMap، HashSet، TreeMap — متى تستخدم كلاً منها
  • Generics: List<String>، Map<String, Integer>، كتابة دوال جنيريكية
  • معالجة الاستثناءات: try/catch/finally، throw، throws، checked vs unchecked exceptions
  • إنشاء استثناءات مخصّصة: Custom Exception Classes
  • الملفّات: FileReader/FileWriter، BufferedReader، Files.readAllLines()، Files.write()
  • String formatting: String.format()، printf()، StringBuilder للنصوص الكبيرة

مستوى 3 — «تصميم التطبيقات + Streams + مشاريع يمنية» (evaluate/create):
  • Lambda expressions والـFunctional Interfaces: Predicate، Function، Consumer، Supplier
  • Stream API: filter()، map()، reduce()، collect()، sorted()، distinct()، groupingBy()
  • Optional: التعامل مع القيم الغائبة بدون NullPointerException
  • أنماط التصميم Design Patterns العملية: Singleton (لإدارة الاتصال بقاعدة البيانات)، Factory (لإنشاء كائنات متعدّدة الأنواع)، Builder (لبناء كائنات معقّدة)، Observer (لنظام الإشعارات)
  • تنظيم المشروع: packages، import، بنية MVC بسيطة، تقسيم المسؤوليات
  • Unit Testing بـ JUnit 5: كتابة اختبارات للدوال، assertEquals، assertThrows
  • مشاريع يمنية متكاملة:
    - نظام إدارة دكان: كلاسات Product/Order/Invoice، HashMap للمخزون، ملف CSV للبيانات
    - حاسبة صرافة متعدّدة العملات مع سجلّ المعاملات
    - نظام قيد درجات الطلاب: تقارير، Stream API للإحصائيات
    - تطبيق متتبّع فواتير الكهرباء مع تنبيهات الاستهلاك

أسلوب الكتابة المطلوب:
- جمل واضحة لا حشو. تعليمات تشغيلية للمعلم الذكي، لكن المحتوى التعليمي عميق لا سطحي.
- كل درس له: bridge_sentence (≥10 كلمات تربط بالكود السابق بمثال Java محسوس من حياة يمنية)، 3-6 مفاهيم، 2-4 أخطاء Java شائعة بعلاج محدّد، 1-3 أمثلة كود يمنية، سؤال تحقّق نهائي عملي، معيار اكتمال جلسة.
- **عمق شرح المفهوم (إلزامي)**: حقل explanation لكل مفهوم فقرة كاملة (3-5 جمل، ≥40 كلمة) تتضمّن: (1) تعريف المفهوم بوضوح، (2) لماذا يحتاجه مبرمج Java عملياً، (3) مقطع كود Java قصير من الحياة اليمنية **داخل الشرح نفسه**، (4) الخطأ الشائع فيه ورسالة الخطأ الفعلية وتصويبه. ممنوع شرح من سطر واحد.
- **عمق التمهيد والأهداف (إلزامي)**: motivation_hook يربط الدرس بمشكلة برمجية يمنية يلمسها الطالب. learning_objectives تبدأ بفعل سلوكي قابل للقياس (يكتب كلاساً، يُصحّح NullPointerException، يبني ArrayList لمخزون الدكان...) مع bloom_level مناسب.
- **solution_outline**: الكود النموذجي الكامل (بما فيه تعريف الكلاس وـmain) + المخرج المتوقّع سطراً بسطر.
- كل امتحان MCQ: 3-4 خيارات، correct_index صحيح فعلياً (نفّذ الكود ذهنياً قبل الإرسال)، explanation يوضّح سبب صحّة الإجابة وخطأ البدائل — خاصةً أسئلة «ما مخرج هذا الكود؟» و«أين سيُلقي هذا الكود استثناءً؟».
EOF

# ── 3. مرحلة الهيكل: specialty + levels + stages + units (بدون دروس/معامل) ──
phase_skeleton() {
  local out="$OUT_DIR/skeleton.json"
  [[ -f "$out" ]] && { ok "موجود (تخطّي): $out"; return 0; }

  local user
  user="$(cat <<EOF
أنشئ هيكل ملف تعليمات v4 لمهارة Java التالية:
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
    "target_persona": "وصف الطالب المستهدف: مبتدئ يمني (ثانوي/جامعي/باحث عمل) يريد إتقان Java عملياً للحصول على وظيفة أو بناء تطبيقات، قد لا يملك خلفية برمجية مسبقة (2-4 جمل تصف احتياجاته وتحدياته)",
    "teacher_tone": "نبرة المعلّم: مشجّعة وعملية، تجعل الطالب يكتب كلاس Java حقيقي من أول دقيقة ولا تخيفه من رسائل الخطأ — بل تعلّمه قراءتها وفهمها كمهارة أساسية (جملتان)",
    "allowed_viz_templates": ["java_trace", "flowchart", "class_diagram", "sequence_diagram", "bar_chart"],
    "allowed_tools": ["text", "code", "image"],
    "glossary": [
      {"term": "class صنف/كلاس", "definition": "قالب يصف شكل الكائن وسلوكه — مثل قالب فاتورة الدكان: فيه اسم المنتج والسعر وطريقة حساب الإجمالي"},
      {"term": "object كائن", "definition": "نسخة حقيقية من الكلاس — مثل فاتورة دكان أبو أحمد في يوم الخميس"},
      {"term": "method دالة", "definition": "سلوك الكائن: ما يستطيع فعله — مثل حساب_الإجمالي() أو طباعة_الفاتورة()"}
    ]
  },
  "levels": [
    {
      "level_index": 1,
      "name": "اسم المستوى",
      "goal": "هدف المستوى",
      "bloom_focus": "apply",
      "motivation_hook": "لماذا يهمّ الطالب هذا المستوى من Java — ربطه بوظيفة أو مشروع يمني حقيقي (جملتان)",
      "learning_objectives": [
        {"statement": "هدف تعلمي عملي قابل للقياس يبدأ بفعل سلوكي", "bloom_level": "apply"}
      ],
      "exam_meta": {"pass_threshold_percent": 60, "time_limit_minutes": 45},
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
              "key_concepts": ["مفهوم Java 1", "مفهوم 2", "مفهوم 3"],
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
- prerequisite_unit_codes: للوحدة الأولى []، ولاحقاً [كود الوحدة السابقة].
- key_concepts: 3-5 مفاهيم Java موجزة لكل وحدة (بأسماء برمجية واضحة بالإنجليزية: مثل "ArrayList", "inheritance", "try/catch").

التدرّج المنهجي لـ Java 3 مستويات (التزِم به بدقّة):
- مستوى 1 (apply): تأسيس Java وOOP الأول — من println إلى الكلاسات والكائنات والتغليف. يغطي: الكلاس وـmain، المتغيّرات البدائية، String، Scanner، الشروط، الحلقات، المصفوفات، الدوال الـstatic، مقدمة OOP (class/object/constructor/encapsulation).
- مستوى 2 (analyze): OOP متقدّم + Collections + استثناءات + ملفّات — يغطي: الوراثة، polymorphism، abstract، interface، ArrayList/HashMap/HashSet، Generics، try/catch/throws، Custom Exceptions، File I/O، StringBuilder.
- مستوى 3 (evaluate/create): تصميم التطبيقات + Lambda/Streams + مشاريع — يغطي: Lambda، Stream API، Optional، Design Patterns (Singleton/Factory/Builder/Observer)، packages/MVC، JUnit 5، مشاريع يمنية متكاملة.

bloom_focus: مستوى1=apply، مستوى2=analyze، مستوى3=evaluate/create.
اجعل أسماء المراحل والوحدات تعكس مسار إتقان Java حتى بناء تطبيق يمني حقيقي.

أخرج JSON خام فقط.
EOF
)"

  call_llm "$SYS_BASE" "$user" "$out"
}

# ── 4. مرحلة الوحدات: لكل وحدة في الهيكل → دروس Java عملية + معامل ─────────
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
هذه وحدة من ملف تعليمات مهارة «$SPEC_NAME» في نُخبة v4. املأ تفاصيلها الكاملة (دروس Java عملية + معامل) فقط.

سياق الوحدة:
$ctx

أخرج JSON بهذا الشكل بالضبط (لا تضع specialty أو levels — فقط lessons و labs):
{
  "code": "$code",
  "lessons": [
    {
      "lesson_index": 1,
      "code": "${code}.1",
      "name": "...",
      "goal": "هدف الدرس العملي — ما يستطيع الطالب بناؤه بعد الدرس (سطر واحد)",
      "bridge_sentence": "جملة ≥10 كلمات تربط بكود الدرس السابق وتُمهّد لمشكلة Java يمنية سنحلّها اليوم.",
      "prerequisite_lesson_codes": [],
      "enables_lesson_codes": [],
      "final_check_question": "سؤال تحقّق نهائي عملي: يطلب كتابة كود Java أو توقّع مخرجه",
      "session_complete_criterion": "الطالب كتب كلاساً Java يعمل بدون أخطاء ويُخرج النتيجة الصحيحة، ويستطيع شرح ما يفعله كل سطر",
      "yemeni_examples": [
        "مثال كود Java كامل (بما فيه تعريف الكلاس وـmain) يحلّ مشكلة يمنية محسوسة، مع المخرج المتوقّع في تعليق"
      ],
      "expected_duration_minutes": 30,
      "estimated_gem_cost": 90,
      "solution_outline": "الكود النموذجي الكامل لسؤال التحقّق (بما فيه الكلاس وـmain) + المخرج المتوقّع سطراً بسطر",
      "motivation_hook": "جملة تربط الدرس بمشكلة يمنية يلمسها الطالب: ماذا سيستطيع بناؤه بعد هذا الدرس؟",
      "learning_objectives": [
        {"statement": "هدف يبدأ بفعل سلوكي (يكتب كلاساً يحسب...، يُصحّح NullPointerException في...، يبني ArrayList لـ...)", "bloom_level": "apply"}
      ],
      "glossary": [
        {"term": "مصطلح Java بالإنجليزية", "definition": "تعريف عربي مبسّط بمثال يمني قصير"}
      ],
      "concepts": [
        {
          "name": "اسم المفهوم بالعربية (مصطلحه بالإنجليزية)",
          "explanation": "فقرة كاملة 3-5 جمل ≥40 كلمة: (1) تعريف المفهوم في Java، (2) لماذا يحتاجه المبرمج عملياً في تطبيقات حقيقية، (3) مقطع كود Java من حياة يمنية داخل الشرح نفسه، (4) الخطأ الشائع مع رسالة الخطأ الفعلية (مثل: Exception in thread main java.lang.NullPointerException) وتصويبه",
          "mastery_criterion": "متى نعتبر المفهوم مُتقَناً: الطالب يكتب مثاله الخاص ويشرح كيف يعمل",
          "weight": 1
        }
      ],
      "common_mistakes": [
        {
          "mistake": "خطأ Java شائع محدّد مع الكود المعطوب ورسالة الخطأ الفعلية (مثل: NullPointerException عند استخدام ArrayList قبل تهيئتها بـ new)",
          "correction": "الكود المصحّح",
          "treatment": "كيف يعلّم المعلم الطالب قراءة سطر الـStackTrace لتحديد السطر المشكل واسم الاستثناء",
          "severity": "major"
        }
      ]
    }
  ],
  "labs": [
    {
      "lab_index": 1,
      "code": "${code}.م1",
      "title": "عنوان سيناريو Java يمني",
      "scenario": "سرد قصصي: الطالب يلعب دور مبرمج يُكلَّف ببناء نظام Java يحلّ مشكلة يمنية واقعية (مثل: بناء نظام إدارة مخزون دكان العم حسين باستخدام ArrayList وHashMap، أو بناء حاسبة صرافة بـ OOP)",
      "completion_criterion": "الطالب كتب كلاسات Java تعمل وتُخرج النتيجة الصحيحة، والكود مُنظَّم ومقروء",
      "pedagogical_sequence": "diagnostic ⇒ decision ⇒ application ⇒ analysis ⇒ connection",
      "prerequisite_lessons": ["${code}.1"],
      "allowed_tools": ["text", "code"],
      "questions": [
        {"question_index": 1, "kind": "diagnostic",  "prompt": "سؤال يقيس ما يعرفه الطالب مسبقاً عن المفهوم الأساسي للمعمل", "rubric": "معايير التقييم", "solution_outline": "إجابة/كود نموذجي", "points": 1},
        {"question_index": 2, "kind": "decision",    "prompt": "سؤال يطلب من الطالب اختيار الأسلوب البرمجي المناسب ومبرراته", "rubric": "...", "solution_outline": "...", "points": 1},
        {"question_index": 3, "kind": "application", "prompt": "اطلب كتابة كلاس Java كامل يحلّ مشكلة من سيناريو الدكان/الصرافة/الكهرباء", "rubric": "الكود يعمل + المخرج صحيح + الكلاسات مُنظَّمة + لا NullPointerException", "solution_outline": "الكود النموذجي الكامل + المخرج", "points": 2},
        {"question_index": 4, "kind": "analysis",   "prompt": "أعطِ الطالب كود Java فيه خطأ (NullPointerException أو منطق خاطئ) واطلب منه تشخيصه وتصحيحه", "rubric": "...", "solution_outline": "...", "points": 1},
        {"question_index": 5, "kind": "connection",  "prompt": "اطلب من الطالب ربط ما تعلّمه بسيناريو جديد أو تمديد الكود بميّزة إضافية", "rubric": "...", "solution_outline": "...", "points": 1}
      ]
    }
  ]
}

قواعد العدّ الإلزامية:
- lessons.length = $MAX_LESSONS_PER_UNIT بالضبط (lesson_index من 1 إلى $MAX_LESSONS_PER_UNIT). أكوادها "${code}.1" .. "${code}.$MAX_LESSONS_PER_UNIT".
- labs.length = $MAX_LABS_PER_UNIT بالضبط. أكوادها "${code}.م1" .. "${code}.م$MAX_LABS_PER_UNIT".
- كل معمل: 5 أسئلة، نوع واحد من كل: diagnostic, decision, application, analysis, connection. سؤال application يطلب كلاساً Java كاملاً. سؤال analysis يطلب تشخيص كود معطوب وتصحيحه.
- كل درس: 3-6 مفاهيم، 2-4 أخطاء Java شائعة بالكود المعطوب ورسالة الخطأ الفعلية، 1-3 أمثلة كود يمنية كاملة (بما فيها تعريف الكلاس وـmain).
- explanation لكل مفهوم: فقرة كاملة ≥40 كلمة تضمّ تعريفاً + لماذا يحتاجه + مقطع كود يمني + خطأ شائع مع رسالته.
- كل كود Java تكتبه صحيح نحوياً وسيعمل فعلاً. الكلاس والـmethod الرئيسية موجودان. تجنّب الكود الناقص.
- prerequisite_lesson_codes: للدرس الأول []، ولاحقاً [كود الدرس السابق مباشرة].
- bridge_sentence: ≥10 كلمات، تستحضر مشكلة Java يمنية واقعية وتربطها بما تعلّمه الطالب.
- common_mistakes: severity ∈ {minor, major, critical}. ركّز على أخطاء Java الواقعية:
  * NullPointerException (critical): نسيان new، استخدام مرجع غير مُهيَّأ
  * ArrayIndexOutOfBoundsException (major): off-by-one في الحلقات
  * == مقابل .equals() للـStrings (major): الخلط بين مقارنة المرجع ومقارنة القيمة
  * ClassCastException (major): تحويل خاطئ عند downcasting
  * نسيان return في دوال لها قيمة مُرجَعة (major)
  * scope error: استخدام متغيّر خارج نطاقه (minor)
  * StackOverflowError من recursion بلا base case (critical)
- concepts: weight=1 افتراضياً، ارفعه إلى 2 أو 3 للمفهوم المحوري (مثل: الوراثة، interface، Stream API، HashMap).

أمثلة Java يمنية يجب توظيفها بكود حقيقي:
- كلاس Product لمخزون دكان (name, price, quantity) مع ArrayList وHashMap
- كلاس CurrencyConverter لتحويل الريال/الدولار/السعودي
- كلاس Student لقيد الدرجات ومعدّل GPA مع Collections
- كلاس ElectricityBill لحساب فاتورة الكهرباء مع تصنيف الاستهلاك
- كلاس BusTicket لحساب الأجرة حسب المسافة والنوع
- استخدام Stream API لحساب إجمالي مبيعات الدكان أو أعلى معدّل طالب

أخرج JSON خام فقط.
EOF
)"

    call_llm "$SYS_BASE" "$user" "$out" || warn "تعذّر توليد الوحدة $code — تستطيع إعادة المرحلة لاحقاً."
  done <<< "$codes"

  ok "اكتملت مرحلة الوحدات."
}

# ── 5. مرحلة الامتحانات: بنوك Java لكل (وحدة/مرحلة/مستوى) ──────────────────
gen_exam_bank() {
  local scope="$1" code="$2" out="$3" ctx="$4" expected_qs="$5"
  [[ -f "$out" ]] && { ok "موجود (تخطّي): $(basename "$out")"; return 0; }

  local user
  user="$(cat <<EOF
أنشئ بنك أسئلة امتحان Java لـ $scope "$code" في مهارة "$SPEC_NAME".

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
        "prompt": "ما مخرج هذا الكود Java؟\n\`\`\`java\npublic class Q1 {\n    public static void main(String[] args) {\n        // ...\n    }\n}\n\`\`\`",
        "choices": ["أ) ...", "ب) ...", "ج) ...", "د) ..."],
        "correct_index": 0,
        "explanation": "السبب المفصّل: لماذا هذا المخرج صحيح ولماذا كل بديل آخر خاطئ.",
        "difficulty": 1,
        "points": 1,
        "time_limit_seconds": 90
      },
      {
        "question_index": 2,
        "kind": "practical",
        "prompt": "اكتب كلاس Java كاملاً يفعل كذا (سيناريو يمني واقعي)...",
        "rubric": "الكود يُعرَّف كلاس صحيح + main موجود + المخرج صحيح + لا استثناءات + أسلوب مقروء",
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
  * mcq: 3-4 choices، correct_index (0-based) صحيح — نفّذ الكود ذهنياً قبل الضبط. فضّل:
    - «ما مخرج هذا الكود Java؟» (مع كلاس كامل وـmain)
    - «أين سيُلقي هذا الكود استثناءً وما نوعه؟»
    - «أيّ هذه الكلاسات يرث من الآخر؟»
    - «ما الفرق بين == وـ.equals() في هذا الكود؟»
  * practical: كلاس Java كامل مع سيناريو يمني. rubric + solution_outline إلزاميان.
  * short_answer: rubric + solution_outline إلزاميان.
- لا تتكرّر الأسئلة بين الـ variants (زوايا مختلفة لنفس المفاهيم).
- كل كود Java في الأسئلة صحيح نحوياً ويعمل (أو مقصود أن يُلقي استثناءً محدداً).

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
      {name, goal, bloom_focus, units: [.units[] | {code,name,key_concepts}]}
    ' "$OUT_DIR/skeleton.json")"
    gen_exam_bank "stage" "$stage_code" "$out" "$ctx" 15 || true
  done < <(jq -r '.levels[].stages[].code' "$OUT_DIR/skeleton.json")

  while IFS= read -r level_idx; do
    [[ -z "$level_idx" ]] && continue
    local out="$OUT_DIR/exams/level/${level_idx}.json"
    local ctx
    ctx="$(jq --argjson i "$level_idx" '
      .levels[] | select(.level_index==$i) |
      {name, goal, bloom_focus,
       stages: [.stages[] | {code, name, units: [.units[] | {code,name}]}]}
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
  ctx="$(jq '{levels: [.levels[] | {level_index, name, goal, bloom_focus}]}' "$OUT_DIR/skeleton.json")"

  local user
  user="$(cat <<EOF
أنشئ اختبار تحديد مستوى تكيّفي لمهارة Java "$SPEC_NAME".
الهدف: قياس خلفية الطالب في Java بسرعة لتوجيهه للمستوى المناسب.

سياق المستويات:
$ctx

المطلوب JSON:
{
  "questions": [
    {
      "target_level_index": 1,
      "kind": "mcq",
      "prompt": "ما مخرج هذا الكود Java؟\n\`\`\`java\npublic class Test {\n    public static void main(String[] args) {\n        System.out.println(10 / 3);\n    }\n}\n\`\`\`",
      "choices": ["أ) 3", "ب) 3.33", "ج) 3.0", "د) خطأ في التشغيل"],
      "correct_index": 0,
      "difficulty": 1,
      "explanation": "10 / 3 في Java عملية قسمة صحيحة (integer division) لأن كلا الرقمين int، فالناتج 3 وليس 3.33"
    }
  ]
}

قواعد:
- 15-25 سؤالاً، موزَّعة: 5-7 لكل مستوى.
- target_level_index: المستوى الذي يقيسه السؤال.
- difficulty: 1 (مبتدئ جداً)، 2 (معرفة أساسية)، 3 (متمكّن من المستوى).
- أنواع الأسئلة المطلوبة (بالتوزيع هذا تقريباً):
  * «ما مخرج هذا الكود؟» — للمستوى 1 (println، عمليات حسابية، حلقات)
  * «أين سيُلقي هذا الكود استثناءً؟» — للمستويين 1 و2 (NullPointerException، ArrayIndexOutOfBounds)
  * «أيّ خيار يصحّح هذا الكود؟» — للمستوى 2 (equals، casting، generics)
  * «ما ناتج هذا الـStream؟» أو «ما النمط المُستخدَم هنا؟» — للمستوى 3
- كل كود Java في الأسئلة كامل (يتضمّن تعريف الكلاس وـmain).
- correct_index: احسب المخرج فعلياً قبل الضبط.
- explanation: جملة تشرح السبب البرمجي وتنبّه للفخّ الشائع.

أخرج JSON خام فقط.
EOF
)"

  call_llm "$SYS_BASE" "$user" "$out"
}

# ── 7. التجميع النهائي بـ jq ────────────────────────────────────────────────
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
    ' "$tmp_units_map" "$f" > "${tmp_units_map}.tmp" 2>/dev/null || {
      warn "فشل دمج $f — تخطّي"
      continue
    }
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
    --arg notes "الإصدار التلقائي بواسطة generate-v4-java-skill.sh — المهارة: $SPEC_NAME" \
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

  ok "🎉 الملف النهائي جاهز: $out"
  echo
  echo "📊 إحصائيات:"
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

# ── 7b. فحص السلامة الآلي على final.json قبل النشر ──────────────────────────
phase_validate() {
  local f="$OUT_DIR/final.json"
  [[ -f "$f" ]] || { err "لا يوجد final.json — نفّذ merge أولاً"; return 1; }

  log "فحص سلامة $f ..."
  local errors=0 report
  report="$(jq -r '
    ([.levels[].stages[].units[].lessons[].code]) as $lessons
    | ([.levels[].stages[].units[].code])           as $units
    | ([.levels[].stages[].code])                   as $stages
    | ([.levels[].stages[].units[].labs[].code])    as $labs
    | [
        (if (.schema_version|IN("v4.0","v4.1")) then empty
         else "❌ schema_version غير صالح: \(.schema_version)" end),

        (if ((.levels|length) > 0) then empty
         else "❌ لا توجد مستويات" end),

        ($lessons | (length - (unique|length))) as $dupL
        | (if $dupL > 0 then "❌ توجد \($dupL) أكواد دروس مكرّرة" else empty end),

        ($units | (length - (unique|length))) as $dupU
        | (if $dupU > 0 then "❌ توجد \($dupU) أكواد وحدات مكرّرة" else empty end),

        ($labs | (length - (unique|length))) as $dupB
        | (if $dupB > 0 then "❌ توجد \($dupB) أكواد معامل مكرّرة" else empty end),

        ([.levels[].stages[].units[] | select((.lessons|length)==0) | .code]) as $empties
        | (if ($empties|length) > 0 then "❌ وحدات بلا دروس: \($empties|join(", "))" else empty end),

        ([.levels[].stages[].units[].labs[]
          | select(([.questions[].kind]|unique|length) != 5) | .code]) as $badLabs
        | (if ($badLabs|length) > 0 then "❌ معامل بأنواع أسئلة ناقصة/مكرّرة (يجب 5 أنواع): \($badLabs|join(", "))" else empty end),

        ([.levels[].stages[].units[].lessons[]
          | . as $l | (.prerequisite_lessons // [])[]
          | select(. as $p | ($lessons|index($p))|not)
          | "\($l.code)→\(.)"]) as $badPre
        | (if ($badPre|length) > 0 then "❌ مراجع متطلّب سابق معطوبة: \($badPre|join(", "))" else empty end),

        ([ .exam_banks.unit_banks, .exam_banks.stage_banks, .exam_banks.level_banks
           | (.. | objects | select(has("correct_index") and has("choices")))
           | select(.correct_index < 0 or .correct_index >= (.choices|length))
           | .prompt ]) as $badIdx
        | (if ($badIdx|length) > 0 then "❌ \($badIdx|length) سؤال امتحان بـ correct_index خارج المدى" else empty end),

        ([ .placement_test_questions[]?
           | select(has("correct_index") and has("choices"))
           | select(.correct_index < 0 or .correct_index >= (.choices|length))
           | .prompt ]) as $badPl
        | (if ($badPl|length) > 0 then "❌ \($badPl|length) سؤال تحديد بـ correct_index خارج المدى" else empty end)
      ]
    | .[]
  ' "$f" 2>&1)" || true

  if [[ -n "$report" ]]; then
    err "وُجدت مشاكل في الملف:"
    printf '%s\n' "$report" >&2
    errors=1
  fi

  local L S U LE
  L="$(jq '.levels|length' "$f")"
  S="$(jq '[.levels[].stages[]]|length' "$f")"
  U="$(jq '[.levels[].stages[].units[]]|length' "$f")"
  LE="$(jq '[.levels[].stages[].units[].lessons[]]|length' "$f")"
  log "العدّ: مستويات=$L مراحل=$S وحدات=$U دروس=$LE"

  if (( errors == 0 )); then
    ok "✅ اجتاز الفحص — ملف مهارة Java جاهز للنشر في لوحة الإدارة."
    return 0
  fi
  err "أصلح المشاكل أعلاه: احذف ملف الجزء المعيب من $OUT_DIR (مثل units/<code>.json) ثم أعد توليده + merge + validate."
  return 1
}

# ── 8. توجيه الأوامر ────────────────────────────────────────────────────────
cmd="${1:-help}"
case "$cmd" in
  skeleton)  phase_skeleton ;;
  units)     phase_units ;;
  exams)     phase_exams ;;
  placement) phase_placement ;;
  merge)     phase_merge ;;
  validate)  phase_validate ;;
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
الاستخدام: bash scripts/generate-v4-java-skill.sh <command>

مُولِّد ملف تعليمات مهارة «$SPEC_NAME» (قسم المهارات)
منهج عملي بحت: من أول كلاس Java حتى بناء تطبيقات يمنية متكاملة بـ OOP وCollections وStreams.

أبسط طريقة (مفتاح Google + أمر واحد):
  export GOOGLE_API_KEY="..."          # من Google AI Studio
  bash scripts/generate-v4-java-skill.sh all
  (SPEC_SLUG=$SPEC_SLUG و SPEC_NAME="$SPEC_NAME" افتراضيان — لا داعي لضبطهما.)

الأوامر:
  skeleton    1) أنشئ هيكل المهارة (specialty + levels + stages + units)
  units       2) املأ كل وحدة بدروس Java عملية + معامل
  exams       3) ولّد بنوك الامتحانات (وحدة/مرحلة/مستوى)
  placement   4) ولّد اختبار تحديد المستوى
  merge       5) ادمج كل الأجزاء في final.json
  validate    6) افحص final.json آلياً قبل النشر
  all         نفّذ كل المراحل + الفحص بالتسلسل

المفتاح (أحدها إجباري — يُكتشف تلقائياً):
  VERTEX_PROJECT       مُعرّف مشروع Google Cloud → يستهلك رصيد Cloud
  GOOGLE_API_KEY       مفتاح Google AI Studio
  OPENROUTER_API_KEY   بديل عبر OpenRouter

اختياري:
  SPEC_SLUG (افتراضي: $SPEC_SLUG), SPEC_NAME (افتراضي: $SPEC_NAME),
  SPEC_DESC, SPEC_SCOPE (افتراضي: $SPEC_SCOPE), SPEC_LANG, SPEC_REGION, OUT_DIR
  MODEL          مع Google/Vertex: gemini-2.5-flash (افتراضي) أو gemini-2.5-pro
  REQUEST_DELAY  ثوانٍ بين النداءات (افتراضي 2)
  TEST=1         حجم صغير لاختبار سريع (1×1×1×3×1×1)

الحجم الحالي: مستويات=$MAX_LEVELS مراحل/مستوى=$MAX_STAGES_PER_LEVEL وحدات/مرحلة=$MAX_UNITS_PER_STAGE
              دروس/وحدة=$MAX_LESSONS_PER_UNIT معامل/وحدة=$MAX_LABS_PER_UNIT بنوك امتحان=$EXAM_VARIANTS
(الافتراضي = الملف الكامل 3×7×9×10. استخدم TEST=1 للتجربة السريعة.)

ملاحظات:
  • الملف الكامل ≈ 357 نداء، يأخذ ساعات — شغّله في الخلفية:
      nohup bash scripts/generate-v4-java-skill.sh all > run-java.log 2>&1 &
      tail -f run-java.log
  • السكريبت يستأنف تلقائياً — أي ملف موجود يُتخطّى. لإعادة توليد جزء، احذف
    ملفه (مثل out/$SPEC_SLUG/units/1.1.1.json) ثم أعد التشغيل.

ما يميّز هذا السكريبت عن غيره:
  ✦ كل درس: كلاس Java كامل قابل للتشغيل (بما فيه main) + مخرج متوقّع
  ✦ أخطاء Java حقيقية مع رسائل الـStackTrace الفعلية (NullPointerException، ClassCastException...)
  ✦ أمثلة يمنية واقعية: دكان، صرافة، كهرباء، درجات طلاب، صيدلية
  ✦ منهجية «توقّع ثم نفّذ» في كل سؤال تحقّق
  ✦ تدرّج Java حقيقي: OOP → Collections → Streams → Design Patterns → مشاريع

الإخراج: \$OUT_DIR/final.json (افتراضياً ./out/$SPEC_SLUG/final.json)
الصقه في تبويب "ملف التعليمات v4" بلوحة الإدارة → تحقّق → نشر.
USAGE
    ;;
esac
