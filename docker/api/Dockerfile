# ═══════════════════════════════════════════════════════════════════
# المرحلة الأولى: البناء
# نستخدم Debian (glibc) وليس Alpine لأن esbuild يحتاج linux-x64-gnu
# ═══════════════════════════════════════════════════════════════════
FROM node:22 AS builder

# تفعيل pnpm عبر corepack
RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# نسخ ملفات الـworkspace الجذرية أوّلاً (layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# نسخ حزم lib (تُستخدم كـworkspace dependencies في الـbuild)
COPY lib/ ./lib/

# نسخ ملفات scripts (workspace package)
COPY scripts/ ./scripts/

# نسخ الخادم الخلفي
COPY artifacts/api-server/ ./artifacts/api-server/

# تثبيت جميع الحزم (frozen لضمان تطابق lockfile)
RUN pnpm install --frozen-lockfile

# بناء الخادم (esbuild يُجمّع كل شيء في dist/index.mjs)
RUN pnpm --filter @workspace/api-server run build

# ═══════════════════════════════════════════════════════════════════
# المرحلة الثانية: الإنتاج (صورة نظيفة خفيفة)
# ═══════════════════════════════════════════════════════════════════
FROM node:22-alpine AS production

WORKDIR /app

# نسخ الملفات المبنية فقط (بدون node_modules أو المصدر)
COPY --from=builder /app/artifacts/api-server/dist/ ./dist/

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
