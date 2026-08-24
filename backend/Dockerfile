# ─── 构建阶段 ───
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ─── 运行阶段 ───
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY package.json ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/data
VOLUME ["/app/data"]
EXPOSE 8000
CMD ["node", "dist/index.js"]
