#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# upload-instruction.sh — رفع ملف تعليمات v4 مباشرةً من الـ VPS دون المتصفح.
#
# يضغط ملف JSON الكبير (final.json) بـ gzip ثم يرسله إلى نقطة النشر في الـ API
# عبر curl. الضغط يُصغّر منهجاً بحجم عشرات الميغابايت إلى بضعة ميغابايت، فيمرّ
# تحت كل حدود الحجم (nginx 128m / express 64m) بأريحية.
#
# لماذا هذا السكريبت؟ ملف المنهج الكامل كبير جداً على محرّر Monaco في لوحة
# الإدارة (يجمّد المتصفح). هذا يتيح للمشرف رفعه من نفس الخادم مباشرةً.
#
# المتطلبات: bash, curl, gzip
#
# الاستخدام:
#   scripts/upload-instruction.sh <ملف.json> '<قيمة-الكوكي>'
#
# مثال:
#   scripts/upload-instruction.sh out/uni-it/final.json \
#     'connect.sid=s%3Aabc123...'
#
# من أين أحصل على الكوكي؟
#   سجّل دخولك كمشرف في المتصفح على learnukhba.com، افتح أدوات المطوّر →
#   Application/Storage → Cookies، وانسخ سطر الجلسة كاملاً (الاسم=القيمة).
#   أو من تبويب Network: انسخ ترويسة Cookie من أي طلب /api/.
#
# متغيّرات بيئة اختيارية:
#   BASE_URL   العنوان الأساسي (افتراضي https://learnukhba.com)
#   ENDPOINT   مسار النشر  (افتراضي /api/admin/v4/publish)
#              استخدم /api/admin/v4/validate للتحقق فقط دون نشر.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

FILE="${1:-}"
COOKIE="${2:-}"
BASE_URL="${BASE_URL:-https://learnukhba.com}"
ENDPOINT="${ENDPOINT:-/api/admin/v4/publish}"

usage() {
  sed -n '2,40p' "$0"
}

if [[ -z "$FILE" || -z "$COOKIE" ]]; then
  echo "خطأ: يجب تمرير مسار الملف وقيمة الكوكي." >&2
  echo >&2
  usage >&2
  exit 1
fi

[[ -f "$FILE" ]] || { echo "خطأ: الملف غير موجود: $FILE" >&2; exit 1; }
command -v curl >/dev/null || { echo "خطأ: curl غير مثبّت." >&2; exit 1; }
command -v gzip >/dev/null || { echo "خطأ: gzip غير مثبّت." >&2; exit 1; }

# تحقّق أنّ الملف JSON صالح قبل إضاعة وقت الرفع (إن توفّر jq).
if command -v jq >/dev/null; then
  jq empty "$FILE" 2>/dev/null || { echo "خطأ: $FILE ليس JSON صالحاً." >&2; exit 1; }
fi

# نقطة النشر تطبّق دفاع CSRF بترويسة مخصّصة (X-Nukhba-Csrf) + تطابق
# Origin مع Host. لذلك نرسل Origin مطابقاً للـ BASE_URL (scheme://host).
ORIGIN="$(printf '%s' "$BASE_URL" | sed -E 's#(^https?://[^/]+).*#\1#')"

# اضغط إلى ملف مؤقّت — الخادم يكتشف application/gzip ويفكّ الضغط تلقائياً.
tmp_gz="$(mktemp)"
trap 'rm -f "$tmp_gz"' EXIT
gzip -c "$FILE" > "$tmp_gz"

raw_size="$(wc -c < "$FILE" | tr -d ' ')"
gz_size="$(wc -c < "$tmp_gz" | tr -d ' ')"
echo "📦 الأصلي: $((raw_size / 1024)) كيلوبايت → مضغوط: $((gz_size / 1024)) كيلوبايت"
echo "⬆️  رفع إلى ${BASE_URL}${ENDPOINT} ..."

resp_body="$(mktemp)"
trap 'rm -f "$tmp_gz" "$resp_body"' EXIT
http_code="$(curl -sS -o "$resp_body" -w '%{http_code}' \
  -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/gzip" \
  -H "X-Nukhba-Csrf: 1" \
  -H "Origin: ${ORIGIN}" \
  -H "Cookie: ${COOKIE}" \
  --data-binary "@${tmp_gz}")"

echo "↩️  HTTP ${http_code}"
if command -v jq >/dev/null; then
  jq . "$resp_body" 2>/dev/null || cat "$resp_body"
else
  cat "$resp_body"
fi
echo

if [[ "$http_code" == "200" ]]; then
  echo "✅ تم النشر بنجاح."
  exit 0
fi

case "$http_code" in
  401) echo "❌ غير مُصرّح — الكوكي منتهٍ أو غير صحيح. سجّل دخولك من جديد وانسخ كوكي جديداً." >&2 ;;
  403) echo "❌ مرفوض (CSRF/صلاحيات) — تأكّد أنّ الحساب مشرف وأنّ BASE_URL مطابق للنطاق." >&2 ;;
  413) echo "❌ الحجم تجاوز الحد — راجع client_max_body_size في nginx والحد في express." >&2 ;;
  400) echo "❌ الملف به أخطاء تحقّق — راجع الرسالة أعلاه." >&2 ;;
  *)   echo "❌ فشل الرفع (HTTP ${http_code})." >&2 ;;
esac
exit 1
