FROM node:24-bookworm-slim AS base

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*


FROM base AS dependencies

COPY package.json package-lock.json ./

RUN npm ci


FROM dependencies AS builder

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./

RUN DATABASE_URL="postgresql://user:password@localhost:5432/database" \
    npx prisma generate

COPY src ./src

RUN npm run build


FROM base AS runner

ENV NODE_ENV=production

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/server.js"]
