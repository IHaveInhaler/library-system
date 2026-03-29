FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Production stage ────────────────────────────────────────────────────────────
FROM node:20-alpine

RUN apk add --no-cache openssl su-exec

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/data /app/data/backups /app/data/uploads && chown -R node:node /app

EXPOSE 3000

# Run as root initially to fix bind mount ownership, then drop to node user for the app
CMD ["sh", "-c", "chown -R node:node /app/data && exec su-exec node sh -c 'npx prisma migrate deploy && node dist/index.js'"]
