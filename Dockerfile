# Build stage
FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock tsconfig.json ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun build:client
RUN bun build:css

# Production stage
FROM oven/bun:1-alpine AS runner
WORKDIR /app

COPY package.json bun.lock tsconfig.json ./
RUN bun install --frozen-lockfile --production

COPY --from=builder /app/src ./src
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["bun", "run", "src/index.tsx"]
