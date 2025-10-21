# Step 1: Build frontend
FROM node:22-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace config files first
COPY pnpm-workspace.yaml pnpm-lock.yaml* ./

# Copy only frontend package manifest
COPY frontend/package.json ./frontend/package.json

# Install dependencies (workspace-aware)
RUN pnpm install --frozen-lockfile --filter frontend...

# Copy the frontend source code
COPY frontend ./frontend

WORKDIR /app/frontend

RUN pnpm install
# Build the frontend
RUN pnpm build

# Step 2: Serve with nginx
FROM nginx:alpine

# Copy built frontend
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy custom nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]