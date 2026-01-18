FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration files from root
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./

# Copy frontend package.json
COPY microservice/frontend/package.json ./microservice/frontend/

# Install dependencies for frontend only
RUN pnpm install --frozen-lockfile --filter frontend

# Copy frontend source
COPY microservice/frontend/. ./microservice/frontend/

# Build frontend
WORKDIR /app/microservice/frontend
RUN cp .env.sample .env.local
RUN pnpm run build

# ---- Runtime image ----
FROM nginx:alpine

# Copy Nginx gateway configuration
COPY microservice/gateway-service/default.conf /etc/nginx/conf.d/default.conf
COPY microservice/gateway-service/proxy_settings.conf /etc/nginx/proxy_settings.conf
COPY microservice/gateway-service/include.d/ /etc/nginx/include.d/

# Copy built frontend assets from builder
COPY --from=frontend-builder /app/microservice/frontend/dist/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]