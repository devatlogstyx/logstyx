FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache git
# Install pnpm AND pm2
RUN corepack enable && \
    corepack prepare pnpm@latest --activate && \
    npm install -g pm2

# Copy workspace files from root
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY common/package.json ./common/
COPY cache-service/src/package.json ./cache-service/src/

# Install dependencies
RUN pnpm install --filter "cache-service/src" --prod --frozen-lockfile

# Copy source code
COPY common ./common
COPY cache-service/src ./cache-service/src

WORKDIR /app/cache-service/src

RUN pnpm add pm2

CMD ["pnpm", "start:production"]