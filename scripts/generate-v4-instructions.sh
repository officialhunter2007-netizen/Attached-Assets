#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# generate-v4-instructions.sh — مُولِّد ملف تعليمات نُخبة v4 عبر OpenRouter
#
# لماذا سكريبت بدلاً من نداء واحد؟
#   الملف الكامل = 5 مستويات × 7 مراحل × 9 وحدات × 10 دروس = 3,150 درساً
#   + 315 معملاً + بنوك امتحانات لكل (وحدة/مرحلة/مستوى) + اختبار تحديد. لا
#   يوجد نموذج LLM يُخرج هذا في ردٍ واحد، لذا نولّده على مراحل، نحفظ كل
#   جزء على القرص (لاستئناف ما توقف)، ثم نُجمِّع بـ jq.
#
# المتطلبات: bash 4+, curl, jq
#
# المزوّد (يُكتشف تلقائياً): إذا وُجد GOOGLE_API_KEY يستخدم Google Gemini
# مباشرة؛ وإلا يستخدم OpenRouter عبر OPENROUTER_API_KEY.
#
# المُدخلات الإجبارية (متغيرات بيئة):
#   GOOGLE_API_KEY      مفتاح Google AI Studio (الطريقة المبسّطة المفضّلة)
#     — أو —
#   OPENROUTER_API_KEY  مفتاح OpenRouter (بديل)
#   SPEC_SLUG           مُعرّف التخصص (مثل: uni-it)
#   SPEC_NAME           اسمه بالعربية (مثل: تكنولوجيا المعلومات)
#
# اختيارية:
#   SPEC_DESC, SPEC_SCOPE (high_school|university|professional_track),
#   SPEC_LANG (ar), SPEC_REGION (YE), OUT_DIR (./out/<SPEC_SLUG>)
#   MODEL   — اسم النموذج. مع Google: gemini-2.5-flash (افتراضي) أو
#            gemini-2.5-pro. مع OpenRouter: google/gemini-2.5-pro ...إلخ.
#   REQUEST_DELAY  ثوانٍ انتظار بين كل نداء (افتراضي 2) لاحترام حدود المعدّل.
#
# الحجم الافتراضي = الملف الكامل (5×7×9×10 + معاملان لكل وحدة + 3 بنوك).
# للاختبار السريع فقط: TEST=1 (يخفضها إلى 1×1×1×3×1×1).
# أو تحكّم يدوي عبر:
#   MAX_LEVELS MAX_STAGES_PER_LEVEL MAX_UNITS_PER_STAGE
#   MAX_LESSONS_PER_UNIT MAX_LABS_PER_UNIT EXAM_VARIANTS
#
# طريقة الاستخدام (أبسط صورة):
#   export GOOGLE_API_KEY=...
#   export SPEC_SLUG=uni-it SPEC_NAME="تكنولوجيا المعلومات"
#   bash scripts/generate-v4-instructions.sh all
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
  # Vertex AI — يستهلك رصيد Google Cloud (بما فيه الـ300$ المجاني)
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

# نموذج احتياطي للتحويل التلقائي عند استنفاد الحصة (429). نتحوّل إلى نموذج
# *أقوى* (gemini-2.5-pro) أعلى جودة وله مسار/حصة منفصلة عن flash، فبدل تكرار
# المحاولة على نموذج مستنفد بلا فائدة، يتحوّل السكربت إليه تلقائياً ويُكمل بقية
# التوليد بجودة أعلى. عطّله بـ AUTO_FALLBACK=0.
# ملاحظة: gemini-2.5-pro غالباً يتطلّب تفعيل الفوترة على مشروعك.
if [[ "$PROVIDER" == "openrouter" ]]; then
  FALLBACK_MODEL="${FALLBACK_MODEL:-google/gemini-2.5-pro}"
else
  FALLBACK_MODEL="${FALLBACK_MODEL:-gemini-2.5-pro}"
fi
AUTO_FALLBACK="${AUTO_FALLBACK:-1}"

: "${SPEC_SLUG:?ضع SPEC_SLUG (مثال: uni-it)}"
: "${SPEC_NAME:?ضع SPEC_NAME (مثال: تكنولوجيا المعلومات)}"
SPEC_DESC="${SPEC_DESC:-مسار تعليمي شامل في $SPEC_NAME للطلاب اليمنيين.}"
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

# ── 1. نداء النموذج (Google أو OpenRouter) مع JSON-mode + إعادة المحاولة ─────
# يستقبل: system_prompt user_prompt out_file
# يحفظ المحتوى المُفكَّك في out_file، ويحفظ الردّ الخام في logs/.
# يتعامل مع حدود المعدّل (429) بانتظار تصاعدي، ومع الردود المبتورة بإعادة النداء.
call_llm() {
  local sys="$1" user="$2" out="$3"
  local log_file="$OUT_DIR/logs/$(basename "$out" .json)-$(date +%s).raw.json"
  local resp content http tries=0 max_tries=5 backoff=5

  while (( tries < max_tries )); do
    tries=$((tries+1))
    log "→ نداء [$PROVIDER:$MODEL] محاولة $tries/$max_tries → $(basename "$out")"

    if [[ "$PROVIDER" == "vertex" ]]; then
      local body endpoint token host
      # توكن OAuth جديد كل نداء (ينتهي خلال ساعة والتشغيل يطول)
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
        -H "X-Title: Nukhba v4 Generator" \
        -X POST https://openrouter.ai/api/v1/chat/completions \
        -d "$body")" \
        || { warn "فشل cURL، إعادة المحاولة..."; sleep "$backoff"; backoff=$((backoff*2)); continue; }
    fi

    # افصل كود HTTP (آخر سطر) عن الجسم
    http="$(printf '%s' "$resp" | tail -n1)"
    resp="$(printf '%s' "$resp" | sed '$d')"
    printf '%s\n' "$resp" > "$log_file"

    # حدّ المعدّل / الحصة → حوّل تلقائياً للنموذج الاحتياطي ثم تابع
    if [[ "$http" == "429" ]]; then
      # تحويل تلقائي مرّة واحدة إلى النموذج الاحتياطي بدل تكرار نموذج مستنفد.
      # MODEL متغيّر عام (بلا local) فيبقى التحويل سارياً لبقيّة وحدات التوليد.
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

    # مفتاح خاطئ / صلاحيات
    if [[ "$http" == "401" || "$http" == "403" ]]; then
      err "مصادقة فاشلة ($http): $(jq -r '.error.message // empty' <<<"$resp" | head -c 300)"
      if [[ "$PROVIDER" == "vertex" ]]; then
        err "Vertex: تأكد أن Vertex AI API مفعّل، وأن VERTEX_PROJECT صحيح، ونفّذت: gcloud auth login"
      else
        err "تأكد أن GOOGLE_API_KEY مفتاح API حقيقي يبدأ بـ AIza من aistudio.google.com/apikey (وليس OAuth token)."
      fi
      return 1
    fi

    # خطأ صريح من API؟
    if jq -e '.error' >/dev/null 2>&1 <<<"$resp"; then
      err "خطأ API ($http): $(jq -r '.error.message // .error | tostring' <<<"$resp" | head -c 300)"
      sleep "$backoff"; backoff=$((backoff*2)); continue
    fi

    # استخرج المحتوى حسب المزوّد
    if [[ "$PROVIDER" == "google" || "$PROVIDER" == "vertex" ]]; then
      # تحذير من بتر الإخراج عند بلوغ سقف التوكنز
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

    # بعض النماذج تلفّ JSON داخل ```json … ``` رغم JSON-mode. نظِّفها.
    content="$(printf '%s' "$content" | sed -E 's/^```(json)?//;s/```$//' | sed -E '/^```$/d')"

    # تحقّق أنه JSON صالح
    if printf '%s' "$content" | jq -e . >/dev/null 2>&1; then
      printf '%s' "$content" > "$out"
      ok "حُفظ: $out ($(wc -c < "$out") بايت)"
      # انتظار قصير بين النداءات لاحترام حدود المعدّل
      sleep "$REQUEST_DELAY"
      return 0
    fi

    warn "JSON غير صالح/مبتور، عيّنة: $(printf '%s' "$content" | head -c 160)..."
    sleep "$backoff"; backoff=$((backoff*2))
  done

  err "فشل توليد $out بعد $max_tries محاولات. راجع $log_file"
  return 1
}

# ── 2. التلقين الأساسي (هوية المؤلف + قواعد الأسلوب) ────────────────────────
read -r -d '' SYS_BASE <<'EOF' || true
أنت خبير مناهج عربي متخصّص في بناء مسارات تعليمية تكيّفية للطلاب اليمنيين، تعمل على إنتاج ملف تعليمات v4.1 لمنصّة نُخبة (Nukhba).

قواعد ذهبية مُلزِمة:
1. مخرجك دائماً مستند JSON واحد فقط — لا markdown، لا ``` ، لا شرح قبل أو بعد، لا تعليقات داخل JSON.
2. كل النصوص بالعربية الفصحى المبسّطة (مفهومة لطالب ثانوي يمني)، عدا قيم: slug / kind / bloom_focus / كلمات تقنية لا بديل لها (مع شرح عربي بجانبها أول مرة).
3. أمثلة من الحياة اليمنية اليومية في كل درس: السوق، الباصات، الصرافة، الكهرباء المتقطّعة، صنعاء/عدن/تعز/الحديدة/الحضرمي، البنّ، القات، الكافتيريا، الشوادر، الأسرة، الجامعة، الدكاكين، الصيدلية، الورشة...
4. منهجية سقراطية: سؤال ⇒ تنبّؤ الطالب ⇒ كشف ⇒ مثال محسوس. التجريد بعد المحسوس دائماً.
5. الأكواد الرسمية مُحدَّدة: المستوى "L"، المرحلة "L.S"، الوحدة "L.S.U"، الدرس "L.S.U.Lesson"، المعمل "L.S.U.مX"، الامتحان "<scope>.exam".
   مثال: المستوى الأول = "1"، مرحلته الثالثة = "1.3"، وحدتها الخامسة = "1.3.5"، درسها السابع = "1.3.5.7"، معملها الأول = "1.3.5.م1"، امتحان وحدتها = "1.3.5.exam".
6. لا تتكرّر أكواد، ولا تتكرّر أنواع أسئلة المعمل داخل المعمل الواحد، ولا تتكرّر أسماء المفاهيم داخل الدرس.
7. كل prerequisite_* و enables_* يشير لكود موجود فعلاً في الملف.
8. أنواع أسئلة المعمل الخمسة: diagnostic | decision | application | analysis | connection — معمل = 5 أسئلة، واحد من كل نوع، بدون تكرار.
9. bloom_focus: remember|understand|apply|analyze|evaluate|create — يتدرّج صعوداً مع المستويات.
10. لا تختصر داخل العنصر الذي تكتبه. إذا كانت السعة محدودة، أبلغني صراحة بدلاً من اختزال المحتوى.
11. **ممنوع استخدام نصوص قالبية أو عامة** مثل "خطأ شائع متوقّع في هذا الدرس" أو "التصحيح الصحيح" أو "عالج الخطأ بمثال موجَّه". كل خطأ common_mistake يجب أن يكون خطأً حقيقياً محدداً مرتبطاً بمحتوى الدرس (مثلاً: "الخلط بين = و == في بايثون"). إذا لم تستطع كتابة خطأ حقيقي، فالأفضل أن تكتب درساً أقل عدداً من الدروس بدلاً من ملء الباقي بنصوص قالبية.

أسلوب الكتابة المطلوب:
- جمل واضحة، لا حشو ولا تكرار. تعليمات تشغيلية للمعلم الذكي، لكن المحتوى التعليمي نفسه يجب أن يكون عميقاً لا سطحياً.
- كل درس له: bridge_sentence (≥10 كلمات تربط بالدرس السابق)، 3-6 مفاهيم، 2-4 أخطاء شائعة بعلاج محدّد، 1-3 أمثلة يمنية، سؤال تحقّق نهائي واضح، معيار اكتمال الجلسة.
- **عمق شرح المفهوم (إلزامي)**: حقل explanation لكل مفهوم فقرة كاملة (3-5 جمل، ≥40 كلمة) تتضمّن أربعة عناصر: (1) تعريف المفهوم بوضوح، (2) لماذا يهمّ الطالب عملياً، (3) مثال يمني محسوس من حياته، (4) سوء الفهم الشائع وتصويبه. ممنوع شرح من سطر واحد أو تعريف معجمي مجرّد.
- **عمق التمهيد والأهداف (إلزامي)**: motivation_hook جملة محسوسة تربط الدرس بحياة الطالب لا شعاراً عاماً. learning_objectives أهداف قابلة للقياس تبدأ بفعل سلوكي (يحسب، يفرّق، يصمّم...) مع bloom_level مناسب.
- كل امتحان MCQ: 3-4 خيارات، correct_index صحيح حسابياً، explanation بسطر يوضّح لماذا الصحيح صحيح ولماذا الخطأ خطأ.
EOF

# ── 3. مرحلة الهيكل: specialty + levels + stages + units (بدون دروس/معامل) ──
phase_skeleton() {
  local out="$OUT_DIR/skeleton.json"
  [[ -f "$out" ]] && { ok "موجود (تخطّي): $out"; return 0; }

  local user
  user="$(cat <<EOF
أنشئ هيكل ملف تعليمات v4 للتخصص التالي:
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
    "target_persona": "وصف نفسي وعمري ومعرفي للطالب المستهدف بدقة (2-4 جمل)",
    "teacher_tone": "نبرة المعلم الذكي مع هذا الجمهور (جملتان)",
    "allowed_viz_templates": ["concept_map", "timeline", "compare_table", "process_flow"],
    "allowed_tools": ["text", "code", "image"],
    "glossary": [
      {"term": "مصطلح", "definition": "تعريف عربي مبسّط"}
    ]
  },
  "levels": [
    {
      "level_index": 1,
      "name": "اسم المستوى",
      "goal": "هدف المستوى",
      "bloom_focus": "remember",
      "motivation_hook": "لماذا يهمّ الطالب هذا المستوى (جملتان)",
      "learning_objectives": [
        {"statement": "هدف تعلمي قابل للقياس", "bloom_level": "understand"}
      ],
      "exam_meta": {"pass_threshold_percent": 60, "time_limit_minutes": 45},
      "stages": [
        {
          "stage_index": 1,
          "code": "1.1",
          "name": "...",
          "goal": "...",
          "bloom_focus": "remember",
          "exam_meta": {"pass_threshold_percent": 60},
          "units": [
            {
              "unit_index": 1,
              "code": "1.1.1",
              "name": "...",
              "goal": "...",
              "bloom_focus": "remember",
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
- في كل مستوى stages.length = $MAX_STAGES_PER_LEVEL بالضبط (stage_index من 1 إلى $MAX_STAGES_PER_LEVEL).
- في كل مرحلة units.length = $MAX_UNITS_PER_STAGE بالضبط (unit_index من 1 إلى $MAX_UNITS_PER_STAGE).
- اترك lessons و labs مصفوفات فارغة — سنملأها لاحقاً.
- prerequisite_unit_codes: للوحدة الأولى []، ولاحقاً [كود الوحدة السابقة].
- key_concepts: 3-5 مفاهيم عربية موجزة لكل وحدة.
- التدرّج: bloom_focus للمستوى الأول remember، الثاني understand، الثالث apply، الرابع analyze، الخامس evaluate/create.
- اربط أهداف المراحل والوحدات بمسار واقعي للطالب اليمني في هذا التخصص.

أخرج JSON خام فقط.
EOF
)"

  call_llm "$SYS_BASE" "$user" "$out"
}

# ── 4. مرحلة الوحدات: لكل وحدة في الهيكل → 10 دروس + معامل ──────────────────
phase_units() {
  [[ -f "$OUT_DIR/skeleton.json" ]] || { err "نفّذ skeleton أولاً"; return 1; }

  local codes
  codes="$(jq -r '.levels[].stages[].units[].code' "$OUT_DIR/skeleton.json")"

  while IFS= read -r code; do
    [[ -z "$code" ]] && continue
    local out="$OUT_DIR/units/${code}.json"
    [[ -f "$out" ]] && { ok "موجود (تخطّي): units/${code}.json"; continue; }

    # سياق الوحدة من الهيكل (الاسم/الهدف/المفاهيم)
    local ctx
    ctx="$(jq --arg c "$code" '
      .levels[].stages[].units[] | select(.code==$c) |
      {code, name, goal, bloom_focus, key_concepts, prerequisite_unit_codes}
    ' "$OUT_DIR/skeleton.json")"

    local user
    user="$(cat <<EOF
هذه وحدة من ملف تعليمات نُخبة v4 للتخصص "$SPEC_NAME". املأ تفاصيلها الكاملة (دروس + معامل) فقط.

سياق الوحدة:
$ctx

أخرج JSON بهذا الشكل بالضبط (لا تضع specialty أو levels أو غيرها — فقط lessons و labs):
{
  "code": "$code",
  "lessons": [
    {
      "lesson_index": 1,
      "code": "${code}.1",
      "name": "...",
      "goal": "هدف الدرس (سطر)",
      "bridge_sentence": "جملة افتتاحية ≥10 كلمات تربط بالسياق السابق وتُمهّد للدرس بمثال يمني محسوس.",
      "prerequisite_lesson_codes": [],
      "enables_lesson_codes": [],
      "final_check_question": "سؤال تحقّق نهائي قابل للحكم بنعم/لا أو بإجابة قصيرة محدّدة",
      "session_complete_criterion": "معيار نصّي يحكم متى تكتمل الجلسة (الطالب أجاب صح وأعطى مثاله الخاص)",
      "yemeni_examples": ["مثال يمني واحد على الأقل بكلمات الطالب"],
      "expected_duration_minutes": 25,
      "estimated_gem_cost": 80,
      "solution_outline": "نقاط الإجابة النموذجية لسؤال التحقّق النهائي (مرجع داخلي للمصحّح)",
      "motivation_hook": "جملة محسوسة تربط الدرس بحياة الطالب اليمني وتوضّح لماذا يهمّه بالذات (لا شعار عام)",
      "learning_objectives": [
        {"statement": "هدف قابل للقياس يبدأ بفعل سلوكي (يحسب/يفرّق/يصمّم...)", "bloom_level": "understand"}
      ],
      "glossary": [{"term": "مصطلح", "definition": "تعريف عربي مبسّط"}],
      "concepts": [
        {"name": "...", "explanation": "فقرة كاملة (3-5 جمل، ≥40 كلمة): تعريف المفهوم + لماذا يهمّ عملياً + مثال يمني محسوس + سوء الفهم الشائع وتصويبه — لا سطر واحد", "mastery_criterion": "متى نعتبر المفهوم مُتقَناً", "weight": 1}
      ],
      "common_mistakes": [
        {"mistake": "الخطأ الشائع كما يقوله الطالب", "correction": "التصحيح الموجز", "treatment": "كيف يعالجه المعلم في الحوار", "severity": "major"}
      ]
    }
  ],
  "labs": [
    {
      "lab_index": 1,
      "code": "${code}.م1",
      "title": "عنوان السيناريو",
      "scenario": "سرد قصصي متعدد الفقرات يضع الطالب في موقف يمني واقعي لتطبيق مفاهيم الوحدة",
      "completion_criterion": "متى نعتبر المعمل مكتملاً (نص واضح)",
      "pedagogical_sequence": "diagnostic ⇒ decision ⇒ application ⇒ analysis ⇒ connection",
      "prerequisite_lessons": ["${code}.1"],
      "allowed_tools": ["text"],
      "questions": [
        {"question_index": 1, "kind": "diagnostic", "prompt": "...", "rubric": "معايير التقييم", "solution_outline": "...", "points": 1},
        {"question_index": 2, "kind": "decision",  "prompt": "...", "rubric": "...", "solution_outline": "...", "points": 1},
        {"question_index": 3, "kind": "application","prompt": "...", "rubric": "...", "solution_outline": "...", "points": 1},
        {"question_index": 4, "kind": "analysis",  "prompt": "...", "rubric": "...", "solution_outline": "...", "points": 1},
        {"question_index": 5, "kind": "connection","prompt": "...", "rubric": "...", "solution_outline": "...", "points": 1}
      ]
    }
  ]
}

قواعد العدّ الإلزامية:
- lessons.length = $MAX_LESSONS_PER_UNIT بالضبط (lesson_index من 1 إلى $MAX_LESSONS_PER_UNIT). أكوادها "${code}.1" .. "${code}.$MAX_LESSONS_PER_UNIT".
- labs.length = $MAX_LABS_PER_UNIT بالضبط (lab_index من 1 إلى $MAX_LABS_PER_UNIT). أكوادها "${code}.م1" .. "${code}.م$MAX_LABS_PER_UNIT".
- كل معمل: 5 أسئلة، نوع واحد من كل من: diagnostic, decision, application, analysis, connection — بدون تكرار.
- كل درس: 3-6 مفاهيم، 2-4 أخطاء شائعة، 1-3 أمثلة يمنية، solution_outline ≥ سطر.
- explanation لكل مفهوم فقرة كاملة (3-5 جمل، ≥40 كلمة) تضمّ: تعريفاً + لماذا يهمّ + مثالاً يمنياً محسوساً + سوء فهم شائع وتصويبه. ممنوع الاختصار لسطر.
- prerequisite_lesson_codes: للدرس الأول [] (أو كود آخر درس من الوحدة السابقة إن وُجد)، ولاحقاً [الكود السابق].
- bridge_sentence: ≥10 كلمات، يستحضر مثالاً يمنياً واقعياً.
- common_mistakes: severity ∈ {minor, major, critical} حسب جسامة الخطأ التعليمي.
- concepts: weight=1 افتراضياً، ارفعه إلى 2 أو 3 للمفهوم المحوري الذي لا يُسمح بالاجتياز بدونه.

أمثلة يمنية مطلوب توظيفها: السوق الشعبي، الكهرباء المتقطّعة، الباص، صنعاء/عدن/تعز/الحديدة/المكلا، الصرافة، البنّ، الخضار، الجامعة، الدكاكين، المطعم الشعبي، الورشة، السلطة المحلية، الجامع، الكافتيريا.

أخرج JSON خام فقط.
EOF
)"

    call_llm "$SYS_BASE" "$user" "$out" || warn "تعذّر توليد الوحدة $code — تستطيع إعادة المرحلة لاحقاً."
  done <<< "$codes"

  ok "اكتملت مرحلة الوحدات."
}

# ── 5. مرحلة الامتحانات: بنوك لكل (وحدة/مرحلة/مستوى) ────────────────────────
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
      {"question_index": 1, "kind": "mcq", "prompt": "...", "choices": ["أ","ب","ج","د"], "correct_index": 1, "explanation": "لماذا الصحيح صحيح ولماذا غيره خطأ.", "difficulty": 1, "points": 1, "time_limit_seconds": 60},
      {"question_index": 2, "kind": "short_answer", "prompt": "...", "rubric": "معايير قبول الإجابة", "solution_outline": "نقاط الإجابة النموذجية", "difficulty": 2, "points": 2, "time_limit_seconds": 120}
    ]
  ]
}

قواعد:
- variants.length = $EXAM_VARIANTS بالضبط (3 بنوك بديلة — الطالب يدوّر بينها عند الإعادة).
- كل variant فيه $expected_qs سؤالاً.
- توزيع difficulty: 30% (1) سهل، 50% (2) متوسط، 20% (3) صعب.
- أنواع أسئلة مسموحة: mcq | short_answer | practical.
  * mcq: 3-4 choices، correct_index سليم (0-based)، explanation واضح.
  * short_answer / practical: rubric + solution_outline إلزامي.
- لا تتكرّر الأسئلة بين الـ variants (صياغات مختلفة وزوايا مختلفة لنفس المفاهيم).
- correct_index يجب أن يطابق الخيار الصحيح فعلاً (احسب قبل الإرسال).

أخرج JSON خام فقط.
EOF
)"
  call_llm "$SYS_BASE" "$user" "$out"
}

phase_exams() {
  [[ -f "$OUT_DIR/skeleton.json" ]] || { err "نفّذ skeleton أولاً"; return 1; }

  # 5a. امتحانات الوحدات
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

  # 5b. امتحانات المراحل
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

  # 5c. امتحانات المستويات (key = level_index كنص)
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
أنشئ اختبار تحديد مستوى تكيّفي لتخصص "$SPEC_NAME". الهدف: قياس مستوى الطالب بسرعة لاختيار المستوى الذي يبدأ منه.

سياق المستويات المتاحة:
$ctx

المطلوب JSON:
{
  "questions": [
    {
      "target_level_index": 1,
      "kind": "mcq",
      "prompt": "...",
      "choices": ["أ","ب","ج","د"],
      "correct_index": 1,
      "difficulty": 1,
      "explanation": "..."
    }
  ]
}

قواعد:
- 15-25 سؤالاً مجموعها، موزَّعة على كل مستوى (3-5 أسئلة لكل مستوى موجود).
- target_level_index: المستوى الذي يقيسه السؤال.
- difficulty داخل المستوى: 1 (تأسيسي) إلى 3 (المعيار المتوقّع لاجتيازه).
- النموذج التكيّفي يبدأ من المستوى 1 ويرتقي عند الإجابة الصحيحة، لذا اجعل الأسئلة قابلة للتمييز بوضوح.
- mcq: 3-4 choices دائماً، correct_index سليم، explanation سطر يبرّر الإجابة.

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

  # ملاحظة مهمّة: نمرّر كل البيانات الكبيرة عبر ملفات مؤقّتة (--slurpfile) لا
  # عبر --argjson على سطر الأوامر. سبب ذلك أن لينكس يحدّد طول الوسيط الواحد
  # بـ128 كيلوبايت (MAX_ARG_STRLEN) بغضّ النظر عن ARG_MAX، فمع منهج كبير
  # تفشل jq بخطأ "Argument list too long" قبل أن يُنشأ final.json.
  local tmp_units_map="$OUT_DIR/.tmp_units_map.json"
  local tmp_core="$OUT_DIR/.tmp_core.json"
  local tmp_ub="$OUT_DIR/.tmp_unit_banks.json"
  local tmp_sb="$OUT_DIR/.tmp_stage_banks.json"
  local tmp_lb="$OUT_DIR/.tmp_level_banks.json"
  local tmp_pl="$OUT_DIR/.tmp_placement.json"

  # ابني خريطة { code -> {lessons, labs} } من ملفات الوحدات
  # (نبنيه تدريجياً ملفاً ملفاً لتجنّب فشل jq -s مع عدد كبير من ملفات الوحدات)
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

  # ادمج تفاصيل الوحدات داخل الهيكل + طبّع أسماء الحقول لتطابق مخطّط المنصّة.
  # المُولِّد يُخرج أسماء مساعدة (code / *_codes / exam_meta) للربط الداخلي، لكن
  # مخطّط نُخبة الرسمي يتوقّع بالضبط: prerequisite_units / enables_units /
  # prerequisite_lessons / enables_lessons / exam. بدون هذا التطبيع تُفقد
  # المتطلّبات السابقة وعتبات الامتحان بصمت عند النشر (Zod يحذف المفاتيح
  # غير المعروفة) فيخرج ملفٌ "صالح" لكنه مفرّغ من شبكة الاعتمادية.
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

  # نظّف المراجع المعطوبة: متطلّب/تمكين يشير لكود غير موجود أو لنفسه يُرفض من
  # مدقّق المنصّة (خطأ "متطلب سابق غير موجود" أو حلقة اعتمادية). نُبقي فقط
  # المراجع التي تشير لأكواد موجودة فعلاً، فيمرّ الملف بلا أخطاء مرجعية.
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

  # ابنِ exam_banks
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
    --arg notes "الإصدار التلقائي بواسطة generate-v4-instructions.sh — التخصص: $SPEC_NAME" \
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
# يكشف الأخطاء التي يرفضها مدقّق المنصّة: تكرار أكواد، مراجع معطوبة،
# نقص العدّ، أنواع معمل ناقصة، correct_index خارج المدى. يُرجع 1 عند أي خطأ.
phase_validate() {
  local f="$OUT_DIR/final.json"
  [[ -f "$f" ]] || { err "لا يوجد final.json — نفّذ merge أولاً"; return 1; }

  log "فحص سلامة $f ..."
  local errors=0 report
  report="$(jq -r '
    def codes(path): [path];
    # تجميع كل الأكواد
    ([.levels[].stages[].units[].lessons[].code]) as $lessons
    | ([.levels[].stages[].units[].code])           as $units
    | ([.levels[].stages[].code])                   as $stages
    | ([.levels[].stages[].units[].labs[].code])    as $labs
    | [
        # 1) schema_version
        (if (.schema_version|IN("v4.0","v4.1")) then empty
         else "❌ schema_version غير صالح: \(.schema_version)" end),

        # 2) عدد المستويات
        (if ((.levels|length) > 0) then empty
         else "❌ لا توجد مستويات" end),

        # 3) تكرار أكواد الدروس
        ($lessons | (length - (unique|length))) as $dupL
        | (if $dupL > 0 then "❌ توجد \($dupL) أكواد دروس مكرّرة" else empty end),

        # 4) تكرار أكواد الوحدات
        ($units | (length - (unique|length))) as $dupU
        | (if $dupU > 0 then "❌ توجد \($dupU) أكواد وحدات مكرّرة" else empty end),

        # 5) تكرار أكواد المعامل
        ($labs | (length - (unique|length))) as $dupB
        | (if $dupB > 0 then "❌ توجد \($dupB) أكواد معامل مكرّرة" else empty end),

        # 6) وحدات بلا دروس
        ([.levels[].stages[].units[] | select((.lessons|length)==0) | .code]) as $empties
        | (if ($empties|length) > 0 then "❌ وحدات بلا دروس: \($empties|join(", "))" else empty end),

        # 7) معامل لا تحتوي 5 أنواع متمايزة
        ([.levels[].stages[].units[].labs[]
          | select(([.questions[].kind]|unique|length) != 5) | .code]) as $badLabs
        | (if ($badLabs|length) > 0 then "❌ معامل بأنواع أسئلة ناقصة/مكرّرة (يجب 5 أنواع): \($badLabs|join(", "))" else empty end),

        # 8) prerequisite_lessons تشير لأكواد غير موجودة (بعد التطبيع في merge)
        ([.levels[].stages[].units[].lessons[]
          | . as $l | (.prerequisite_lessons // [])[]
          | select(. as $p | ($lessons|index($p))|not)
          | "\($l.code)→\(.)"]) as $badPre
        | (if ($badPre|length) > 0 then "❌ مراجع متطلّب سابق معطوبة: \($badPre|join(", "))" else empty end),

        # 9) correct_index خارج مدى choices في الامتحانات
        ([ .exam_banks.unit_banks, .exam_banks.stage_banks, .exam_banks.level_banks
           | (.. | objects | select(has("correct_index") and has("choices")))
           | select(.correct_index < 0 or .correct_index >= (.choices|length))
           | .prompt ]) as $badIdx
        | (if ($badIdx|length) > 0 then "❌ \($badIdx|length) سؤال امتحان بـ correct_index خارج المدى" else empty end),

        # 10) correct_index خارج المدى في اختبار التحديد
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

  # تحذيرات عددية (لا تمنع النشر لكنها مفيدة)
  local L S U LE
  L="$(jq '.levels|length' "$f")"
  S="$(jq '[.levels[].stages[]]|length' "$f")"
  U="$(jq '[.levels[].stages[].units[]]|length' "$f")"
  LE="$(jq '[.levels[].stages[].units[].lessons[]]|length' "$f")"
  log "العدّ: مستويات=$L مراحل=$S وحدات=$U دروس=$LE"

  if (( errors == 0 )); then
    ok "✅ اجتاز الفحص — الملف جاهز للنشر في لوحة الإدارة."
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
الاستخدام: bash scripts/generate-v4-instructions.sh <command>

أبسط طريقة (مفتاح Google + أمر واحد):
  export GOOGLE_API_KEY="..."          # من Google AI Studio
  export SPEC_SLUG="uni-it"
  export SPEC_NAME="تكنولوجيا المعلومات"
  bash scripts/generate-v4-instructions.sh all

الأوامر:
  skeleton    1) أنشئ هيكل التخصص (specialty + levels + stages + units)
  units       2) املأ كل وحدة بدروس + معامل
  exams       3) ولّد بنوك الامتحانات (وحدة/مرحلة/مستوى)
  placement   4) ولّد اختبار التحديد
  merge       5) ادمج كل الأجزاء في final.json
  validate    6) افحص final.json آلياً قبل النشر
  all         نفّذ كل المراحل + الفحص بالتسلسل

المفتاح (أحدها إجباري — يُكتشف تلقائياً):
  VERTEX_PROJECT       مُعرّف مشروع Google Cloud → يستهلك رصيد Cloud (الـ300$)
                       يتطلب: gcloud auth login + تفعيل Vertex AI API
                       اختياري معه: VERTEX_LOCATION (افتراضي global)
  GOOGLE_API_KEY       مفتاح Google AI Studio (يحتاج رصيد دفع مسبق)
  OPENROUTER_API_KEY   بديل عبر OpenRouter

إجباري دائماً:
  SPEC_SLUG            مُعرّف (uni-it)
  SPEC_NAME            اسم بالعربية (تكنولوجيا المعلومات)

اختياري:
  SPEC_DESC, SPEC_SCOPE, SPEC_LANG, SPEC_REGION, OUT_DIR
  MODEL          مع Google: gemini-2.5-flash (افتراضي) أو gemini-2.5-pro
                 مع OpenRouter: google/gemini-2.5-pro ...إلخ
  REQUEST_DELAY  ثوانٍ بين النداءات (افتراضي 2) لتفادي حدود المعدّل
  TEST=1         حجم صغير لاختبار سريع (1×1×1×3×1×1)

الحجم الحالي: مستويات=$MAX_LEVELS مراحل/مستوى=$MAX_STAGES_PER_LEVEL وحدات/مرحلة=$MAX_UNITS_PER_STAGE
              دروس/وحدة=$MAX_LESSONS_PER_UNIT معامل/وحدة=$MAX_LABS_PER_UNIT بنوك امتحان=$EXAM_VARIANTS
(الافتراضي = الملف الكامل 5×7×9×10. استخدم TEST=1 للتجربة السريعة.)

ملاحظات:
  • الملف الكامل ≈ 357 نداء، يأخذ ساعات — شغّله في الخلفية:
      nohup bash scripts/generate-v4-instructions.sh all > run.log 2>&1 &
      tail -f run.log
  • السكريبت يستأنف تلقائياً — أي ملف موجود يُتخطّى. لإعادة توليد جزء،
    احذف ملفه (مثل out/<slug>/units/1.1.1.json) ثم أعد التشغيل.
  • بعد الانتهاء يجري فحص سلامة آلي (validate) يكشف الأخطاء قبل النشر.

الإخراج: \$OUT_DIR/final.json (افتراضياً ./out/\$SPEC_SLUG/final.json)
الصقه في تبويب "ملف التعليمات v4" بلوحة الإدارة → تحقّق → نشر.
USAGE
    ;;
esac
