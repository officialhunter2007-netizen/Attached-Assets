#!/usr/bin/env python3
"""
مولّد جودة عالية لتخصص علوم البيانات — نُخبة
يُحسّن ملف التعليمات (version_id=3) عبر إعادة توليد الحقول الضعيفة
باستخدام OpenRouter (GPT-4o-mini) مع 8 استدعاءات متوازية.

الاستخدام:
  python3 scripts/generate_uni_ds_quality.py [--batch N]
  (يستأنف من آخر checkpoint تلقائياً)
"""
import json, os, sys, time, subprocess, re, threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request, urllib.error

# ─── الإعداد ────────────────────────────────────────────────────────────────
OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")
DATABASE_URL   = os.environ.get("DATABASE_URL", "")
OUT_DIR        = Path("out/uni-data-science")
OUT_DIR.mkdir(parents=True, exist_ok=True)
CHECKPOINT     = OUT_DIR / "quality_v2_checkpoint.json"
OUT_FILE       = OUT_DIR / "quality_v2.json"
MODEL          = "openai/gpt-4o-mini"
VERSION_ID     = 3
CONCURRENCY    = 8

# ─── API ─────────────────────────────────────────────────────────────────────
def call_ai(prompt: str, max_tokens: int = 3500) -> str:
    payload = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
    }).encode()
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {OPENROUTER_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://nukhba.app",
        },
        method="POST",
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                data = json.loads(r.read())
            txt = data["choices"][0]["message"]["content"].strip()
            txt = re.sub(r'^```(?:json)?\s*', '', txt, flags=re.MULTILINE)
            txt = re.sub(r'\s*```$', '', txt.strip(), flags=re.MULTILINE)
            return txt.strip()
        except urllib.error.HTTPError as e:
            if e.code in (429, 503):
                time.sleep(4 ** (attempt + 1))
            elif attempt == 3:
                raise
            else:
                time.sleep(2 ** attempt)
        except Exception:
            if attempt == 3: raise
            time.sleep(2 ** attempt)
    raise RuntimeError("استنفدت المحاولات")

# ─── تحميل قاعدة البيانات ────────────────────────────────────────────────────
def load_raw_json() -> dict:
    r = subprocess.run(
        ["psql", DATABASE_URL, "-t", "-A", "-c",
         f"SELECT raw_json FROM v4_instruction_file_versions WHERE id = {VERSION_ID};"],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        print(f"❌ psql فشل:\n{r.stderr}"); sys.exit(1)
    text = r.stdout.strip()
    for line in reversed(text.splitlines()):
        line = line.strip()
        if line.startswith("{"):
            return json.loads(line)
    return json.loads(text)

# ─── البرومت ─────────────────────────────────────────────────────────────────
CONTEXTS = [
    "أسعار ومبيعات أسواق صنعاء وعدن",
    "صادرات البن اليمني ومناطق إنتاجه",
    "بيانات محاصيل القمح والذرة في المحافظات اليمنية",
    "شبكات الاتصالات والإنترنت في المحافظات اليمنية",
    "تحويلات المغتربين اليمنيين ومصارف الخليج",
    "بيانات سكانية من مراكز الإحصاء اليمنية",
    "نتائج الثانوية العامة في المحافظات اليمنية",
    "بيانات صيد الأسماك في البحر العربي وخليج عدن",
    "حركة المسافرين في مطارات صنعاء وعدن",
    "إنتاج مصانع الغذاء والنسيج باليمن",
    "إحصائيات انقطاع الكهرباء في المحافظات",
    "بيانات المرضى في المستشفيات اليمنية",
    "أسعار السلع الأساسية (طحين، زيت، سكر) عبر الزمن",
    "عائدات صادرات النفط والغاز اليمنية",
    "بيانات توزيع الأراضي الزراعية في اليمن",
]

def uc(li, si, ui): return f"{li}.{si}.{ui}"
def lc(li, si, ui, lsi): return f"{li}.{si}.{ui}.{lsi}"

def make_prompt(unit, stage_name, level_name, li, si, ui, ctx_idx):
    ctx = CONTEXTS[ctx_idx % len(CONTEXTS)]
    ls_list = "\n".join(
        f"  {ls.get('lesson_index','?')}. [{lc(li,si,ui,ls.get('lesson_index','?'))}] {ls.get('name','')}"
        for ls in unit.get("lessons", [])
    )
    return f"""أنت خبير تربوي في علوم البيانات ومصمم مناهج يعرف اليمن جيداً.

الوحدة: {unit.get('name','')} [{uc(li,si,ui)}]
المرحلة: {stage_name} | المستوى: {level_name}
الهدف: {unit.get('goal','')}

الدروس:
{ls_list}

السياق اليمني للأمثلة: {ctx}

أنتج JSON بهذا الهيكل:
{{
  "lessons": [
    {{
      "lesson_index": <رقم الدرس الصحيح>,
      "goal": "<فعل إجرائي: يكتب/يحلل/يبني/يصمم/يطبق/يفسر/يقارن + وصف دقيق. ممنوع 'فهم وتطبيق'>",
      "bridge": "<جملة تذكر اسم مفهوم الدرس السابق تحديداً وكيف يُبنى عليه>",
      "yemeni": "<مثال يذكر اسماً يمنياً محدداً مرتبطاً بـ: {ctx}>",
      "mins": <رقم: 20-30 للتعريفية، 35-50 للمتوسطة، 55-90 للمشاريع>
    }}
  ],
  "scenario": "<2-3 جمل: موقف حقيقي محدد بنوع البيانات والحجم والمشكلة. يرتبط بـ: {ctx}>",
  "questions": [
    {{"kind":"diagnostic","q":"<سؤال تشخيص تقني دقيق لهذه الوحدة>","r":"<3 معايير>","s":"<إجابة مثالية>"}},
    {{"kind":"decision","q":"<قارن نهجين تقنيين محددين مع معايير الاختيار>","r":"<3 معايير>","s":"<إجابة>"}},
    {{"kind":"application","q":"<مهمة Python بتفاصيل دقيقة: مدخلات ومخرجات>","r":"<3 معايير>","s":"<كود مثالي أو خطوطه>"}},
    {{"kind":"analysis","q":"<اكتشف وصحح الخطأ في:\\n```python\\n<3-7 أسطر كود حقيقي فيه خطأ شائع للوحدة>\\n```>","r":"<3 معايير>","s":"<الكود الصحيح وشرح الخطأ>"}},
    {{"kind":"connection","q":"<اقترح مشروع علوم بيانات يمني يستخدم {unit.get('name','')} مع خطة تنفيذ>","r":"<3 معايير>","s":"<مثال ممتاز>"}}
  ],
  "mistakes": [
    {{"m":"<الخطأ الأكثر شيوعاً في الوحدة>","c":"<السبب والحل>","sev":"critical"}},
    {{"m":"<خطأ مفاهيمي>","c":"<توضيح وحل>","sev":"major"}},
    {{"m":"<خطأ عملي مع مثال كود>","c":"<تصحيح>","sev":"minor"}}
  ]
}}

قواعد: لا 'فهم وتطبيق'، أمثلة يمنية محددة، كود حقيقي في سؤال التحليل، JSON صرف."""

# ─── تطبيق المحتوى ────────────────────────────────────────────────────────────
def safe_idx(v):
    try: return round(float(str(v).strip()))
    except: return 0

def apply(unit, gen, li, si, ui):
    lmap = {safe_idx(ls.get("lesson_index", 0)): ls for ls in gen.get("lessons", [])}
    for lesson in unit.get("lessons", []):
        idx = safe_idx(lesson.get("lesson_index", 0))
        g   = lmap.get(idx, {})
        goal = g.get("goal", "")
        if goal and len(goal) > 10 and "فهم وتطبيق" not in goal:
            lesson["goal"] = goal
        bridge = g.get("bridge", "")
        if bridge and len(bridge) > 8:
            lesson["bridge_sentence"] = bridge
        yemeni = g.get("yemeni", "")
        if yemeni:
            lesson["yemeni_examples"] = [yemeni]
        mins = g.get("mins", 30)
        lesson["expected_duration_minutes"] = max(15, min(120, int(mins)))

    scenario  = gen.get("scenario", "")
    questions = gen.get("questions", [])
    for lab in unit.get("labs", []):
        if scenario and len(scenario) > 20:
            lab["scenario"] = scenario
        if questions:
            pts = {"diagnostic":1,"decision":1,"application":2,"analysis":1,"connection":1}
            lab["questions"] = [
                {"kind": q["kind"], "prompt": q.get("q",""), "rubric": q.get("r",""),
                 "solution_outline": q.get("s",""), "points": pts.get(q["kind"],1)}
                for q in questions
                if q.get("kind") and q.get("q") and len(q.get("q","")) > 10
            ][:5]

    mistakes = gen.get("mistakes", [])
    if mistakes:
        for lesson in unit.get("lessons", []):
            if not lesson.get("common_mistakes"):
                lesson["common_mistakes"] = [
                    {"mistake_index": j, "mistake": m.get("m",""),
                     "explanation": m.get("c",""), "severity": m.get("sev","major")}
                    for j, m in enumerate(mistakes) if m.get("m")
                ]

# ─── العامل لكل thread ────────────────────────────────────────────────────────
def worker(args):
    level, stage, unit, li, si, ui, code, ctx_idx = args
    prompt = make_prompt(unit, stage["name"], level["name"], li, si, ui, ctx_idx)
    raw    = call_ai(prompt)
    gen    = json.loads(raw)
    apply(unit, gen, li, si, ui)
    return code, gen

# ─── الحلقة الرئيسية ─────────────────────────────────────────────────────────
def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", type=int, default=0,
                    help="حد الوحدات الجديدة (0=الكل)")
    args = ap.parse_args()

    print("\n" + "═"*58)
    print("  مولّد جودة علوم البيانات — نُخبة")
    print("═"*58 + "\n")

    if not OPENROUTER_KEY: print("❌ OPENROUTER_API_KEY"); sys.exit(1)
    if not DATABASE_URL:   print("❌ DATABASE_URL");       sys.exit(1)

    print("📥 تحميل ملف التعليمات...")
    data = load_raw_json()
    print(f"   ✅ schema_version={data.get('schema_version','?')}\n")

    ck: dict = {}
    if CHECKPOINT.exists():
        ck = json.loads(CHECKPOINT.read_text("utf-8"))
        print(f"📌 استئناف: {len(ck)} وحدة مكتملة\n")

    ck_lock = threading.Lock()

    # جمع كل الوحدات
    all_rows = []
    ctx_counter = 0
    for level in data.get("levels", []):
        li = level.get("level_index", 0)
        for stage in level.get("stages", []):
            si = stage.get("stage_index", 0)
            for unit in stage.get("units", []):
                ui   = unit.get("unit_index", 0)
                code = uc(li, si, ui)
                all_rows.append((level, stage, unit, li, si, ui, code, ctx_counter))
                ctx_counter += 1

    total   = len(all_rows)
    pending = [(lv, st, un, li, si, ui, cd, ci)
               for (lv, st, un, li, si, ui, cd, ci) in all_rows
               if cd not in ck]

    # طبّق الـ checkpoint على الوحدات المكتملة
    for level, stage, unit, li, si, ui, code, _ in all_rows:
        if code in ck:
            apply(unit, ck[code], li, si, ui)

    if args.batch:
        pending = pending[:args.batch]

    done_n = total - len(
        [(lv, st, un, li, si, ui, cd, ci)
         for (lv, st, un, li, si, ui, cd, ci) in all_rows if cd not in ck]
    )
    print(f"📊 الإجمالي: {total} | مكتمل: {done_n} | متبقي: {len(pending)}")
    print(f"   تزامن: {CONCURRENCY} وحدة بالتوازي\n")

    errors = 0
    finished = done_n

    with ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        future_map = {pool.submit(worker, row): row for row in pending}

        for fut in as_completed(future_map):
            row = future_map[fut]
            code = row[6]
            name = row[2].get("name", "")
            finished += 1
            pct = finished / total * 100

            try:
                result_code, gen = fut.result()
                with ck_lock:
                    ck[result_code] = gen
                    CHECKPOINT.write_text(json.dumps(ck, ensure_ascii=False), "utf-8")
                print(f"  ✅ [{finished:3d}/{total}] ({pct:4.1f}%) {code}: {name[:48]}")
            except json.JSONDecodeError as e:
                errors += 1
                print(f"  ⚠️  [{finished:3d}/{total}] ({pct:4.1f}%) {code} JSON: {e}")
            except Exception as e:
                errors += 1
                print(f"  ❌ [{finished:3d}/{total}] ({pct:4.1f}%) {code}: {type(e).__name__}: {str(e)[:60]}")

            if errors > 20:
                print("\n❌ أكثر من 20 خطأ — توقف مبكر")
                pool.shutdown(wait=False, cancel_futures=True)
                break

    # حفظ الملف النهائي
    print(f"\n{'═'*58}")
    OUT_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), "utf-8")
    mb = OUT_FILE.stat().st_size / 1024 / 1024
    lessons = sum(
        1 for lv in data.get("levels",[])
        for st in lv.get("stages",[])
        for un in st.get("units",[])
        for _ in un.get("lessons",[])
    )
    print(f"✅ اكتمل: {len(ck)}/{total} وحدة | {errors} أخطاء")
    print(f"📄 {OUT_FILE.absolute()}")
    print(f"📊 {mb:.1f} MB | {lessons} درس")

    remaining = total - len(ck)
    if remaining > 0:
        print(f"\n⏸  متبقي {remaining} وحدة — شغّل السكريبت مجدداً للاستئناف")
    else:
        print(f"\n💡 الخطوة التالية:")
        print(f"   لوحة التحكم → v4 Instructions → uni-data-science → Upload File")

if __name__ == "__main__":
    main()
