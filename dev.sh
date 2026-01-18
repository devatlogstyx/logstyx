#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Logstyx Development Setup           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if .env.encrypted exists
if [ ! -f ".env.encrypted" ]; then
    echo -e "${YELLOW}No .env.encrypted found. Running installer...${NC}"
    echo ""
    ./install.sh
    
    # Check if user already started services
    if docker compose ps | grep -q "Up"; then
        echo -e "${YELLOW}Services are already running. Stopping them for local development...${NC}"
        docker compose down
    fi
fi

# Step 1: Start external dependencies
echo -e "${GREEN}[1/6] Starting external dependencies (MongoDB, Redis, RabbitMQ)...${NC}"
docker compose up -d mongodb redis rabbitmq
sleep 3  # Wait for services to be ready

# Step 2: Update .env.encrypted with local WS hosts
echo -e "${GREEN}[2/6] Configuring local WebSocket hosts...${NC}"

# Check if WS hosts are already configured
if ! grep -q "AUTH_WSHOST" .env.encrypted; then
    cat >> .env.encrypted << EOF

# Local Development WebSocket Hosts
AUTH_WSHOST=ws://localhost:5001/rpc
CACHE_WSHOST=ws://localhost:5002/rpc
UTILITY_WSHOST=ws://localhost:5003/rpc
CORE_WSHOST=ws://localhost:5004/rpc
EOF
    echo -e "${YELLOW}   ✓ WebSocket hosts added to .env.encrypted${NC}"
else
    echo -e "${YELLOW}   ✓ WebSocket hosts already configured${NC}"
fi

# Step 3: Copy .env to each microservice
echo -e "${GREEN}[3/6] Distributing .env to microservices...${NC}"
SERVICES=("auth-service" "cache-service" "core-service" "utility-service" "frontend")

for service in "${SERVICES[@]}"; do
    SERVICE_DIR="microservice/$service/src"
    if [ -d "$SERVICE_DIR" ]; then
        cp .env.encrypted "$SERVICE_DIR/.env"
        echo -e "${YELLOW}   ✓ Copied to $service${NC}"
    else
        echo -e "${RED}   ✗ Directory not found: $SERVICE_DIR${NC}"
    fi
done

# Step 4: Check if tmux is available
if command -v tmux &> /dev/null; then
    USE_TMUX=true
    echo -e "${GREEN}[4/6] tmux detected - will use split panes${NC}"
else
    USE_TMUX=false
    echo -e "${YELLOW}[4/6] tmux not found - will run in background${NC}"
    echo -e "${YELLOW}   Install tmux for better experience: brew install tmux (macOS) or apt install tmux (Linux)${NC}"
fi

# Step 5: Start services
echo -e "${GREEN}[5/6] Starting microservices...${NC}"

if [ "$USE_TMUX" = true ]; then
    # Kill existing session if it exists
    tmux kill-session -t logstyx-dev 2>/dev/null || true
    
    # Create new tmux session
    tmux new-session -d -s logstyx-dev -n "services"
    
    # Split into panes
    tmux split-window -h -t logstyx-dev
    tmux split-window -v -t logstyx-dev
    tmux select-pane -t 0
    tmux split-window -v -t logstyx-dev
    tmux select-pane -t 2
    tmux split-window -v -t logstyx-dev
    tmux select-pane -t 4
    tmux split-window -v -t logstyx-dev
    
    # Run services in each pane
    tmux send-keys -t logstyx-dev:0.0 "cd microservice/auth-service && pnpm start:local" C-m
    tmux send-keys -t logstyx-dev:0.1 "cd microservice/cache-service && pnpm start:local" C-m
    tmux send-keys -t logstyx-dev:0.2 "cd microservice/core-service && pnpm start:local" C-m
    tmux send-keys -t logstyx-dev:0.3 "cd microservice/utility-service && pnpm start:local" C-m
    tmux send-keys -t logstyx-dev:0.4 "sleep 3 && node simple-gateway.js --port=5000" C-m
    tmux send-keys -t logstyx-dev:0.5 "cd microservice/frontend && pnpm dev" C-m
    
    echo -e "${GREEN}   ✓ Services started in tmux session 'logstyx-dev'${NC}"
    echo -e "${YELLOW}   → To view: tmux attach -t logstyx-dev${NC}"
    echo -e "${YELLOW}   → To detach: Press Ctrl+B then D${NC}"
    echo -e "${YELLOW}   → To stop all: tmux kill-session -t logstyx-dev${NC}"
else
    # Run in background with nohup
    mkdir -p .logs
    
    echo -e "${YELLOW}   Starting auth-service...${NC}"
    cd microservice/auth-service && nohup pnpm start:local > ../../.logs/auth.log 2>&1 & 
    cd ../..
    
    echo -e "${YELLOW}   Starting cache-service...${NC}"
    cd microservice/cache-service && nohup pnpm start:local > ../../.logs/cache.log 2>&1 &
    cd ../..
    
    echo -e "${YELLOW}   Starting core-service...${NC}"
    cd microservice/core-service && nohup pnpm start:local > ../../.logs/core.log 2>&1 &
    cd ../..
    
    echo -e "${YELLOW}   Starting utility-service...${NC}"
    cd microservice/utility-service && nohup pnpm start:local > ../../.logs/utility.log 2>&1 &
    cd ../..
    
    sleep 3
    
    echo -e "${YELLOW}   Starting gateway...${NC}"
    nohup node simple-gateway.js --port=5000 > .logs/gateway.log 2>&1 &
    
    echo -e "${YELLOW}   Starting frontend...${NC}"
    cd microservice/frontend && nohup pnpm dev > ../../.logs/frontend.log 2>&1 &
    cd ../..
    
    echo -e "${GREEN}   ✓ Services started in background${NC}"
    echo -e "${YELLOW}   → Logs available in .logs/ directory${NC}"
    echo -e "${YELLOW}   → To stop all: pkill -f 'pnpm start:local' && pkill -f 'simple-gateway'${NC}"
fi

# Step 6: Summary
sleep 2
echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Development Environment Ready! 🚀    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Services:${NC}"
echo -e "  • Auth Service:    http://localhost:5001"
echo -e "  • Cache Service:   http://localhost:5002"
echo -e "  • Core Service:    http://localhost:5004"
echo -e "  • Utility Service: http://localhost:5003"
echo -e "  • Gateway:         http://localhost:5000"
echo -e "  • Frontend:        ${GREEN}http://localhost:5000${NC} ✨"
echo ""
echo -e "${GREEN}External Services:${NC}"
echo -e "  • MongoDB:         localhost:27017"
echo -e "  • Redis:           localhost:6379"
echo -e "  • RabbitMQ:        localhost:5672"
echo -e "  • RabbitMQ Admin:  http://localhost:15672 (guest/guest)"
echo ""

if [ "$USE_TMUX" = true ]; then
    echo -e "${YELLOW}Press any key to attach to tmux session...${NC}"
    read -n 1 -s
    tmux attach -t logstyx-dev
else
    echo -e "${YELLOW}To view logs:${NC} tail -f .logs/*.log"
    echo -e "${YELLOW}To stop all:${NC} ./dev-stop.sh"
fi