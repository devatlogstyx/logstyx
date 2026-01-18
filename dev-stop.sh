#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping Logstyx development environment...${NC}"
echo ""

# Stop tmux session if it exists
if tmux has-session -t logstyx-dev 2>/dev/null; then
    echo -e "${GREEN}✓ Stopping tmux session${NC}"
    tmux kill-session -t logstyx-dev
fi

# Stop background processes
echo -e "${GREEN}✓ Stopping background services${NC}"
pkill -f "pnpm start:local" 2>/dev/null || true
pkill -f "simple-gateway.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Stop Docker services
echo -e "${GREEN}✓ Stopping Docker services (MongoDB, Redis, RabbitMQ)${NC}"
docker compose stop mongodb redis rabbitmq

echo ""
echo -e "${GREEN}Development environment stopped!${NC}"
echo ""
echo -e "${YELLOW}To restart:${NC} ./dev.sh"
echo -e "${YELLOW}To stop Docker completely:${NC} docker compose down"