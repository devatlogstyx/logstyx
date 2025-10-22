FROM node:22-alpine
WORKDIR /app

RUN apk add --no-core git
# Install pnpm AND pm2
RUN corepack enable && \
    corepack prepare pnpm@latest --activate && \
    npm install -g pm2

# Copy workspace files from root
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY common/package.json ./common/
COPY core-service/src/package.json ./core-service/src/

# Install dependencies
RUN pnpm install --filter "core-service/src" --prod --frozen-lockfile

# Copy source code
COPY common ./common
COPY core-service/src ./core-service/src

WORKDIR /app/core-service/src

RUN pnpm add pm2

CMD ["pnpm", "start:production"]