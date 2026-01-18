FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package.json and lock file
COPY microservice/frontend/package.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile --no-optional

# Copy the rest of the frontend source
COPY microservice/frontend/. ./

# Copy .env.sample to .env.local before building
RUN cp .env.sample .env.local

# Build the frontend
RUN pnpm run build

# ---- Runtime image ----
FROM nginx:alpine

# Copy Nginx gateway configuration
COPY microservice/gateway-service/default.conf /etc/nginx/conf.d/default.conf
COPY microservice/gateway-service/proxy_settings.conf /etc/nginx/proxy_settings.conf
COPY microservice/gateway-service/include.d/ /etc/nginx/include.d/

# Copy built frontend assets from builder
COPY --from=frontend-builder /app/dist/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]