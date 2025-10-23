FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache git
# Install pnpm AND pm2
RUN corepack enable && \
    corepack prepare pnpm@latest --activate && \
    npm install -g pm2

# Copy workspace files from root
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY microservice/common/package.json ./microservice/common/
COPY microservice/auth-service/src/package.json ./microservice/auth-service/src/

# Install dependencies
RUN pnpm install --filter "auth-service/src" --prod --frozen-lockfile

# Copy source code
COPY microservice/common ./microservice/common
COPY microservice/auth-service/src ./microservice/auth-service/src

WORKDIR /app/microservice/auth-service/src

RUN pnpm add pm2

CMD ["pnpm", "start:production"]