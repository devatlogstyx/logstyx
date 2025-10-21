FROM node:alpine
WORKDIR /app
RUN apk add --no-cache git
# Install pnpm AND pm2
RUN corepack enable && \
    corepack prepare pnpm@latest --activate && \
    npm install -g pm2

# Copy workspace files from root
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY common/package.json ./common/
COPY utility-service/src/package.json ./utility-service/src/

# Install dependencies
RUN pnpm install --filter "utility-service/src" --prod --frozen-lockfile

# Copy source code
COPY common ./common
COPY utility-service/src ./utility-service/src

WORKDIR /app/utility-service/src

RUN pnpm add pm2

CMD ["pnpm", "start:production"]