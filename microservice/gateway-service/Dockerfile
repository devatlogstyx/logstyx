FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Install only dependencies first for better layer caching
COPY microservice/frontend/package*.json ./
RUN npm ci --no-audit --no-fund

# Copy the rest of the frontend source and build
COPY microservice/frontend/. ./
RUN npm run build

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
