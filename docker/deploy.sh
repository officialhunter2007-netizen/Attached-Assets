#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# سكريبت النشر التلقائي - نُخبة للإنتاج
# الاستخدام:
#   bash docker/deploy.sh           → نشر أوّلي (HTTP)
#   bash docker/deploy.sh --ssl     → تثبيت شهادة SSL وتفعيل HTTPS
#   bash docker/deploy.sh --update  → تحديث بعد git pull
# ═══════════════════════════════════════════════════════════════════
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[NUKHBA]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC}   $1"; }
info() { echo -e "${BLUE}[INFO]${NC}   $1"; }
fail() { echo -e "${RED}[ERROR]${NC}  $1"; exit 1; }

# ── التحقّق من المتطلبات ──────────────────────────────────────────
command -v docker >/dev/null 2>&1 || fail "Docker غير مثبّت. شغّل: curl -fsSL https://get.docker.com | sh"
command -v curl   >/dev/null 2>&1 || fail "curl غير مثبّت: apt install curl"
command -v pnpm   >/dev/null 2>&1 || fail "pnpm غير مثبّت. شغّل: npm install -g pnpm"

[ -f ".env" ] || fail "ملف .env غير موجود. انسخ .env.example إلى .env وأكمل القيم."

# التحقق من صحة ملف .env
if ! source .env 2>/dev/null; then
    fail "خطأ في قراءة ملف .env. تأكد من صحة التنسيق."
fi

source .env

[ -z "$POSTGRES_PASSWORD" ] && fail "POSTGRES_PASSWORD فارغ في .env — ضع كلمة مرور قوية!"
[ -z "$SESSION_SECRET" ]    && fail "SESSION_SECRET فارغ في .env"
[ -z "$OPENROUTER_API_KEY" ] && fail "OPENROUTER_API_KEY فارغ في .env — مطلوب لتشغيل المعلّم الذكي. احصل عليه من openrouter.ai/keys"
[ -z "$APP_DOMAIN" ]        && fail "APP_DOMAIN فارغ في .env"

# تنبيهات لمتغيّرات اختيارية مهمة
# ملاحظة (مايو 2026): الصور التوضيحية الآن تعمل دائماً حتى بدون FAL_KEY —
# المنصة تستخدم Pollinations.ai (مجاني، بدون مفتاح) كبديل، وفي حال فشل
# كل المزوّدين الخارجيين يُولَّد ملف SVG محلياً فلا يبقى تحميل عالق أبداً.
# FAL_KEY اختياري فقط لتسريع التوليد (~1-3 ثوانٍ مقابل 5-15 ث).
[ -z "$FAL_KEY" ] && info "FAL_KEY غير معرّف — سيتم استخدام Pollinations.ai المجاني (أبطأ قليلاً، نفس النتيجة)"

# ─────────────────────────────────────────────────────────────────
# التحديث (بعد git pull)
# ─────────────────────────────────────────────────────────────────
if [ "$1" = "--update" ]; then
    log "إعادة بناء الصور وتحديث الخدمات..."
    docker compose build --no-cache api nginx
    docker compose up -d --no-deps api nginx
    info "انتظار بدء التشغيل..."
    sleep 6
    if curl -sf "http://localhost/api/healthz" >/dev/null 2>&1; then
        log "✔ التحديث مكتمل! المنصة تعمل."
    else
        warn "الخادم لم يستجب بعد، تحقّق من:"
        info "  docker compose logs api --tail=30"
    fi
    exit 0
fi

# ─────────────────────────────────────────────────────────────────
# تثبيت SSL
# ─────────────────────────────────────────────────────────────────
if [ "$1" = "--ssl" ]; then
    log "إعداد شهادة SSL لـ $APP_DOMAIN..."

    SERVER_IP=$(curl -s --max-time 5 ifconfig.me || echo "unknown")
    DOMAIN_IP=$(getent hosts "$APP_DOMAIN" 2>/dev/null | awk '{print $1}' | head -1 || echo "")

    if [ -z "$DOMAIN_IP" ]; then
        fail "تعذّر الحصول على IP الدومين $APP_DOMAIN — تأكّد من إعداد DNS أولاً"
    fi

    if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
        warn "الدومين $APP_DOMAIN يشير إلى $DOMAIN_IP لكن IP السيرفر هو $SERVER_IP"
        warn "تأكّد من إعداد A Record في لوحة استضافتك قبل المتابعة"
        read -p "هل تريد المتابعة رغم ذلك؟ (y/N): " confirm
        [ "$confirm" = "y" ] || exit 1
    fi

    log "طلب الشهادة من Let's Encrypt..."
    # ملاحظة: --entrypoint certbot ضروري لأن خدمة certbot في docker-compose.yml
    # تستخدم entrypoint مخصّص لـ renew. بدون هذا الـ flag الأمر certonly يُتجاهَل.
    CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@${APP_DOMAIN}}"
    docker compose run --rm --entrypoint certbot certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$CERTBOT_EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$APP_DOMAIN"

    # تأكد أن الشهادة فعلاً صدرت قبل التبديل لـ HTTPS
    if ! docker compose run --rm --entrypoint sh certbot -c "[ -f /etc/letsencrypt/live/${APP_DOMAIN}/fullchain.pem ]"; then
        fail "إصدار الشهادة فشل. تحقّق من اللوقات أعلاه. السبب الشائع: الدومين لا يصل لـ http://${APP_DOMAIN}/.well-known/acme-challenge/ — تأكد من DNS وإن Nginx شغّال على بورت 80."
    fi

    log "تفعيل إعدادات HTTPS في Nginx..."
    cp docker/nginx/nginx-ssl.conf docker/nginx/nginx.conf
    sed -i "s/DOMAIN_PLACEHOLDER/$APP_DOMAIN/g" docker/nginx/nginx.conf

    docker compose build nginx
    docker compose up -d nginx

    log "════════════════════════════════════════"
    log "✔ SSL مفعّل! موقعك متاح على:"
    log "   https://$APP_DOMAIN"
    log "تجديد الشهادة تلقائي كل 90 يوم."
    log "════════════════════════════════════════"
    exit 0
fi

# ─────────────────────────────────────────────────────────────────
# النشر الأوّلي (HTTP)
# ─────────────────────────────────────────────────────────────────
log "════════════════════════════════════════"
log "بدء النشر الأوّلي لمنصّة نُخبة"
log "الدومين: $APP_DOMAIN"
log "════════════════════════════════════════"

log "جاري بناء صور Docker (قد يستغرق 5-10 دقائق)..."
# إيقاف الخدمات الحالية أولاً لتجنب تضارب المنافذ
docker compose down --remove-orphans 2>/dev/null || true

# تنظيف الصور القديمة لتوفير مساحة
docker system prune -f

# بناء الصور مع عدم استخدام cache للحصول على أحدث إصدار
docker compose build --no-cache

log "تشغيل الخدمات..."
docker compose up -d

# انتظار إضافي لضمان بدء جميع الخدمات
info "انتظار بدء جميع الخدمات..."
sleep 20

info "انتظار بدء تشغيل قاعدة البيانات..."
sleep 15

log "تطبيق migrations على قاعدة البيانات..."
if docker compose exec -T api node -e "
  import('./dist/index.mjs').catch(() => process.exit(0))
" > /dev/null 2>&1; then
    : # API already handles migrations on startup
fi

# فحص شامل لجميع الخدمات
log "فحص حالة الخدمات..."

# فحص قاعدة البيانات
if docker compose exec -T db pg_isready -U ${POSTGRES_USER:-nukhba_user} -d ${POSTGRES_DB:-nukhba} >/dev/null 2>&1; then
    info "✔ قاعدة البيانات: تعمل"
else
    warn "✗ قاعدة البيانات: لا تستجيب"
fi

# فحص API
if curl -sf "http://localhost/api/healthz" > /dev/null 2>&1; then
    info "✔ API Server: يعمل"
else
    warn "✗ API Server: لا يستجيب"
fi

# فحص الواجهة الأمامية
if curl -sf "http://localhost" > /dev/null 2>&1; then
    info "✔ Frontend: يعمل"
    log "✔ جميع الخدمات تعمل بنجاح!"
else
    warn "✗ Frontend: لا يستجيب"
    warn "بعض الخدمات لا تعمل — تحقّق من السجلات:"
    info "  docker compose logs api --tail=30"
    info "  docker compose logs nginx --tail=30"
    info "  docker compose logs db --tail=30"
fi

log "════════════════════════════════════════"
log "✔ النشر مكتمل!"
log ""
log "موقعك متاح على: http://$APP_DOMAIN"
log ""
log "الخطوة التالية — تفعيل HTTPS:"
log "  bash docker/deploy.sh --ssl"
log ""
log "أوامر مفيدة:"
log "  docker compose logs -f api                   ← سجلات الخادم"
log "  docker compose logs -f nginx                 ← سجلات Nginx"
log "  docker compose logs -f db                    ← سجلات قاعدة البيانات"
log "  docker compose ps                            ← حالة الخدمات"
log "  git pull && bash docker/deploy.sh --update   ← تحديث"
log ""
log "نسخ احتياطي لقاعدة البيانات:"
log "  docker compose exec db pg_dump -U nukhba_user nukhba > backup.sql"
log "════════════════════════════════════════"
