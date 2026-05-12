# ═══════════════════════════════════════════════════════════════════
# المرحلة الأولى: بناء الواجهة الأمامية (React + Vite)
# ═══════════════════════════════════════════════════════════════════
FROM node:22 AS builder

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# ملفات الـworkspace الجذرية
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./

# حزم lib وscripts (تبعيات مشتركة)
COPY lib/ ./lib/
COPY scripts/ ./scripts/

# الواجهة الأمامية
COPY artifacts/nukhba/ ./artifacts/nukhba/

# الصور المرفقة (يحتاجها alias @assets في Vite)
COPY attached_assets/ ./attached_assets/

# تثبيت الحزم
RUN pnpm install --no-frozen-lockfile

# بناء Vite (الناتج في artifacts/nukhba/dist/public/)
ENV NODE_ENV=production
ENV BASE_PATH=/
RUN pnpm --filter @workspace/nukhba run build

# ═══════════════════════════════════════════════════════════════════
# المرحلة الثانية: Nginx يخدم الملفات الثابتة
# ═══════════════════════════════════════════════════════════════════
FROM nginx:1.27-alpine

# نسخ الملفات المبنية إلى مجلد Nginx
COPY --from=builder /app/artifacts/nukhba/dist/public/ /usr/share/nginx/html/

# ملف إعدادات Nginx
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443
