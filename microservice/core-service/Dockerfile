FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache git
# Install pnpm AND pm2
RUN corepack enable && \
    corepack prepare pnpm@10.7.0 --activate && \
    npm install -g pm2

# Copy workspace files from root
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY microservice/common/package.json ./microservice/common/
COPY microservice/core-service/src/package.json ./microservice/core-service/src/

# Install dependencies
RUN pnpm install --filter "core-service/src" --prod --frozen-lockfile

# Copy source code
COPY microservice/common ./microservice/common
COPY microservice/core-service/src ./microservice/core-service/src

WORKDIR /app/microservice/core-service/src

RUN pnpm add pm2

CMD ["pnpm", "start:production"]