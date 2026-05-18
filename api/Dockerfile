FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

# ── Production stage ────────────────────────────────────────────────────────────
FROM node:20-alpine

RUN apk add --no-cache openssl su-exec sqlite

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/data /app/data/backups /app/data/uploads && chown -R node:node /app

EXPOSE 3000

# Run as root initially to fix bind mount ownership, then drop to node user for the app
CMD ["sh", "-c", "chown -R node:node /app/data && exec su-exec node sh -c 'npx prisma migrate deploy && node dist/index.js'"]
