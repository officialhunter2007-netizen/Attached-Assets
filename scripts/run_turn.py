#!/usr/bin/env python3
"""
v4 Teaching Quality Tester — runs one teaching turn via curl+SSE.
Usage: python3 scripts/run_turn.py <turn_number>
  turn 1 = first student message (no history)
  turn 2 = second student message (reads /tmp/t1_teacher.txt for history)
  turn 3 = third student message (reads t1+t2 for history)
"""
import sys, json, subprocess, os, hmac, hashlib, base64

# ── config ────────────────────────────────────────────────────────────────────
API    = "http://localhost:8080/api/v4/teach"
SLUG   = "skill-python"
LESSON = "1.1.1.1"
UID    = 3

TURNS = [
    "مرحباً، ما هو المتغير في بايثون؟ أنا ما تعلمت برمجة قبل.",
    "طيب فهمت إن المتغير مثل الصندوق. بس ما فهمت ليش أحياناً نكتب name = 'أحمد' وأحياناً name = 5 — هل الفرق مهم؟",
    "جربت أكتب: student name = 'علي' وطلعت عندي error. ما أفهم ليش!",
    "تمام، فهمت الأسماء. كيف أعرف نوع المتغير بعد ما أعطيه قيمة؟",
]

# ── session signing (mirrors lib/session.ts) ──────────────────────────────────
def sign_session(user_id: int) -> str:
    secret = os.environ.get("SESSION_SECRET", "nukhba-dev-only-insecure-fallback").encode()
    payload = json.dumps({"userId": user_id}).encode()
    data = base64.urlsafe_b64encode(payload).rstrip(b"=").decode()
    sig = base64.urlsafe_b64encode(
        hmac.new(secret, data.encode(), hashlib.sha256).digest()
    ).rstrip(b"=").decode()
    return f"{data}.{sig}"

# ── SSE parser ────────────────────────────────────────────────────────────────
def parse_sse(raw: str):
    full = ""
    effects = None
    for line in raw.splitlines():
        if not line.startswith("data: "):
            continue
        try:
            ev = json.loads(line[6:])
            if "content" in ev:
                full += ev["content"]
            if ev.get("done"):
                effects = ev
        except Exception:
            pass
    return full, effects

# ── main ──────────────────────────────────────────────────────────────────────
turn_num = int(sys.argv[1]) if len(sys.argv) > 1 else 1
idx = turn_num - 1
if idx >= len(TURNS):
    print(f"Invalid turn {turn_num}"); sys.exit(1)

cookie = sign_session(UID)
message = TURNS[idx]

# Build history from previous turn files
history = []
for prev in range(1, turn_num):
    prev_user = TURNS[prev - 1]
    try:
        prev_teacher = open(f"/tmp/t{prev}_teacher.txt").read()
    except FileNotFoundError:
        print(f"[warn] /tmp/t{prev}_teacher.txt not found — skipping history for turn {prev}")
        continue
    history.append({"role": "user", "content": prev_user})
    history.append({"role": "assistant", "content": prev_teacher})

req_body = {
    "slug": SLUG,
    "lessonCode": LESSON,
    "message": message,
    "requestId": f"turn{turn_num}b",
    "history": history,
}

req_file = f"/tmp/turn{turn_num}_req.json"
with open(req_file, "w", encoding="utf-8") as f:
    json.dump(req_body, f, ensure_ascii=False)

print(f"{'═'*68}")
print(f"📌  الدور {turn_num} — الطالب 🙋")
print(f"{'─'*68}")
print(message)
print(f"\n{'─'*68}")
print(f"📌  الدور {turn_num} — المعلم 🤖 (يكتب...)")
print(f"{'─'*68}")
sys.stdout.flush()

result = subprocess.run([
    "curl", "-s", "--max-time", "60", "--no-buffer",
    "-X", "POST", API,
    "-H", "Content-Type: application/json",
    "-H", "X-Nukhba-Csrf: 1",
    "-H", "Origin: http://localhost:8080",
    "-H", f"Cookie: session={cookie}",
    "-d", f"@{req_file}",
], capture_output=True, text=True, timeout=65)

if result.returncode != 0:
    print(f"curl error: {result.stderr}")
    sys.exit(1)

raw = result.stdout
teacher_text, effects = parse_sse(raw)

print(teacher_text)
print()

# Save this turn's teacher response for future history
with open(f"/tmp/t{turn_num}_teacher.txt", "w", encoding="utf-8") as f:
    f.write(teacher_text)

# Print effects summary
if effects:
    fx_keys = ["charged", "balanceAfter", "masteryUpdates", "lessonMastered",
               "nextLessonCode", "insufficientGems", "error"]
    summary = {k: effects[k] for k in fx_keys if k in effects}
    print(f"📊  آثار: {json.dumps(summary, ensure_ascii=False)}")
else:
    print("📊  آثار: (لا يوجد)")
    print(f"[raw excerpt]: {raw[:300]}")
