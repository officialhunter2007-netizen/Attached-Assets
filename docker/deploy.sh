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

[ -f ".env" ] || fail "ملف .env غير موجود. انسخ .env.example إلى .env وأكمل القيم."

source .env

[ -z "$DATABASE_URL" ]                      && fail "DATABASE_URL فارغ في .env"
[ -z "$SESSION_SECRET" ]                    && fail "SESSION_SECRET فارغ في .env"
[ -z "$AI_INTEGRATIONS_ANTHROPIC_API_KEY" ] && fail "AI_INTEGRATIONS_ANTHROPIC_API_KEY فارغ في .env"
[ -z "$AI_INTEGRATIONS_OPENAI_API_KEY" ]    && fail "AI_INTEGRATIONS_OPENAI_API_KEY فارغ في .env"
[ -z "$APP_DOMAIN" ]                        && fail "APP_DOMAIN فارغ في .env"

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
    docker compose run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "admin@${APP_DOMAIN}" \
        --agree-tos \
        --no-eff-email \
        -d "$APP_DOMAIN"

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
docker compose build

log "تشغيل الخدمات..."
docker compose up -d

info "انتظار بدء التشغيل..."
sleep 10

if curl -sf "http://localhost/api/healthz" >/dev/null 2>&1; then
    log "✔ الخادم يستجيب بنجاح!"
else
    warn "الخادم لم يستجب بعد — انتظر قليلاً ثم جرّب:"
    info "  curl http://localhost/api/healthz"
    info "  docker compose logs api --tail=30"
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
log "  docker compose ps                            ← حالة الخدمات"
log "  git pull && bash docker/deploy.sh --update   ← تحديث"
log "════════════════════════════════════════"
