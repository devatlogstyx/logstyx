#!/bin/bash

# Logstyx Installation Script
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
╦  ╔═╗╔═╗╔═╗╔╦╗╦ ╦═╗ ╦
║  ║ ║║ ╦╚═╗ ║ ╚╦╝╔╩╦╝
╩═╝╚═╝╚═╝╚═╝ ╩  ╩ ╩ ╚═
EOF
echo -e "${NC}"
echo -e "${GREEN}Welcome to Logstyx Installer${NC}\n"

# Function to generate random string
generate_secret() {
    openssl rand -hex 24 | cut -c1-${1}
}

# Function to encrypt value using AES-256-CTR
encrypt_value() {
    local value=$1
    local master_key=$2
    
    # Convert master key to hex (32 chars = 32 bytes when used as string key)
    local master_key_hex=$(echo -n "$master_key" | xxd -p | tr -d '\n')
    
    # Generate random 16-byte IV
    local iv=$(openssl rand -hex 16)
    
    # Encrypt using AES-256-CTR
    local encrypted=$(echo -n "$value" | openssl enc -aes-256-ctr -K "$master_key_hex" -iv "$iv" | xxd -p | tr -d '\n')
    
    # Return in format IV:ENCRYPTED
    echo "${iv}:${encrypted}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose detected${NC}\n"

# Ask about deployment type
echo -e "${BLUE}=== Deployment Type ===${NC}\n"
echo "Do you want to:"
echo "  1) Use bundled services (Redis, MongoDB, RabbitMQ) - Recommended"
echo "  2) Connect to external services"
echo ""
read -p "Choice [1]: " DEPLOYMENT_TYPE
DEPLOYMENT_TYPE=${DEPLOYMENT_TYPE:-1}

USE_EXTERNAL=false
if [[ "$DEPLOYMENT_TYPE" == "2" ]]; then
    USE_EXTERNAL=true
fi

# Collect external service URLs if needed
if [ "$USE_EXTERNAL" = true ]; then
    echo -e "\n${BLUE}=== External Services Configuration ===${NC}\n"
    
    read -p "RabbitMQ URL (e.g., amqp://user:pass@host:5672): " AMQP_HOST
    while [[ -z "$AMQP_HOST" ]]; do
        echo -e "${RED}RabbitMQ URL cannot be empty${NC}"
        read -p "RabbitMQ URL: " AMQP_HOST
    done
    
    read -p "Redis URL (e.g., redis://host:6379): " REDIS_URL
    while [[ -z "$REDIS_URL" ]]; do
        echo -e "${RED}Redis URL cannot be empty${NC}"
        read -p "Redis URL: " REDIS_URL
    done
    
    read -p "MongoDB URL (e.g., mongodb://host:27017): " MONGODB_HOST
    while [[ -z "$MONGODB_HOST" ]]; do
        echo -e "${RED}MongoDB URL cannot be empty${NC}"
        read -p "MongoDB URL: " MONGODB_HOST
    done
fi

# Collect user input
echo -e "\n${BLUE}=== Initial Setup ===${NC}\n"

read -p "Enter admin username: " USER_NAME
while [[ -z "$USER_NAME" ]]; do
    echo -e "${RED}Username cannot be empty${NC}"
    read -p "Enter admin username: " USER_NAME
done

read -p "Enter admin email: " USER_EMAIL
while [[ -z "$USER_EMAIL" ]]; do
    echo -e "${RED}Email cannot be empty${NC}"
    read -p "Enter admin email: " USER_EMAIL
done

read -sp "Enter admin password: " USER_PASSWORD
echo ""
while [[ -z "$USER_PASSWORD" ]]; do
    echo -e "${RED}Password cannot be empty${NC}"
    read -sp "Enter admin password: " USER_PASSWORD
    echo ""
done

read -p "Enter project title (default: My Logstyx Project): " SELF_PROJECT_TITLE
SELF_PROJECT_TITLE=${SELF_PROJECT_TITLE:-"My Logstyx Project"}

echo -e "\n${GREEN}Generating security secrets...${NC}"
CRYPTO_SECRET=$(generate_secret 32)
REFRESH_TOKEN_SECRET=$(generate_secret 32)
USER_AUTHENTICATION_JWT_SECRET=$(generate_secret 32)

# Generate MASTER_KEY as 32-character string (32 bytes for AES-256)
MASTER_KEY=$(generate_secret 32)

echo -e "${GREEN}✓ Secrets generated${NC}\n"

# Encrypt values
echo -e "${GREEN}Encrypting credentials...${NC}"
ENC_USER_NAME=$(encrypt_value "$USER_NAME" "$MASTER_KEY")
ENC_USER_EMAIL=$(encrypt_value "$USER_EMAIL" "$MASTER_KEY")
ENC_USER_PASSWORD=$(encrypt_value "$USER_PASSWORD" "$MASTER_KEY")
ENC_SELF_PROJECT_TITLE=$(encrypt_value "$SELF_PROJECT_TITLE" "$MASTER_KEY")
ENC_CRYPTO_SECRET=$(encrypt_value "$CRYPTO_SECRET" "$MASTER_KEY")
ENC_REFRESH_TOKEN_SECRET=$(encrypt_value "$REFRESH_TOKEN_SECRET" "$MASTER_KEY")
ENC_USER_AUTHENTICATION_JWT_SECRET=$(encrypt_value "$USER_AUTHENTICATION_JWT_SECRET" "$MASTER_KEY")

# Create .env.encrypted file
cat > .env.encrypted << EOF
ENC_USER_NAME=$ENC_USER_NAME
ENC_USER_EMAIL=$ENC_USER_EMAIL
ENC_USER_PASSWORD=$ENC_USER_PASSWORD
ENC_SELF_PROJECT_TITLE=$ENC_SELF_PROJECT_TITLE
ENC_CRYPTO_SECRET=$ENC_CRYPTO_SECRET
ENC_REFRESH_TOKEN_SECRET=$ENC_REFRESH_TOKEN_SECRET
ENC_USER_AUTHENTICATION_JWT_SECRET=$ENC_USER_AUTHENTICATION_JWT_SECRET
MASTER_KEY=$MASTER_KEY
EOF

# Add external service URLs if provided
if [ "$USE_EXTERNAL" = true ]; then
    ENC_AMQP_HOST=$(encrypt_value "$AMQP_HOST" "$MASTER_KEY")
    ENC_REDIS_URL=$(encrypt_value "$REDIS_URL" "$MASTER_KEY")
    ENC_MONGODB_HOST=$(encrypt_value "$MONGODB_HOST" "$MASTER_KEY")
    
    cat >> .env.encrypted << EOF
ENC_AMQP_HOST=$ENC_AMQP_HOST
ENC_REDIS_URL=$ENC_REDIS_URL
ENC_MONGODB_HOST=$ENC_MONGODB_HOST
EOF
fi

echo -e "${GREEN}✓ Configuration encrypted and saved${NC}\n"

# Download docker-compose files if not present
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${YELLOW}Downloading docker-compose.yml...${NC}"
    curl -fsSL https://raw.githubusercontent.com/devatlogstyx/logstyx/main/docker-compose.yml -o docker-compose.yml
fi

if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${YELLOW}Downloading docker-compose.prod.yml...${NC}"
    curl -fsSL https://raw.githubusercontent.com/devatlogstyx/logstyx/main/docker-compose.prod.yml -o docker-compose.prod.yml
fi

echo -e "\n${GREEN}=== Installation Summary ===${NC}"
if [ "$USE_EXTERNAL" = true ]; then
    echo -e "Deployment: ${BLUE}External Services${NC}"
    echo -e "RabbitMQ: ${BLUE}$AMQP_HOST${NC}"
    echo -e "Redis: ${BLUE}$REDIS_URL${NC}"
    echo -e "MongoDB: ${BLUE}$MONGODB_HOST${NC}"
else
    echo -e "Deployment: ${BLUE}Bundled Services${NC}"
fi
echo -e "Admin Username: ${BLUE}$USER_NAME${NC}"
echo -e "Admin Email: ${BLUE}$USER_EMAIL${NC}"
echo -e "Project Title: ${BLUE}$SELF_PROJECT_TITLE${NC}"
echo -e "Configuration: ${BLUE}.env.encrypted${NC}"
echo ""

# Ask if user wants to start now
read -p "Start Logstyx now? (Y/n): " START_NOW
START_NOW=${START_NOW:-Y}

if [[ "$START_NOW" =~ ^[Yy]$ ]]; then
    echo -e "\n${GREEN}Starting Logstyx services...${NC}\n"
    
    if [ "$USE_EXTERNAL" = true ]; then
        # Use only prod compose file when using external services
        docker compose -f docker-compose.prod.yml up -d
    else
        # Use both compose files for bundled services
        docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
    fi
    
    echo -e "\n${GREEN}✓ Logstyx is starting up!${NC}"
    echo -e "\nWait a moment for services to initialize, then access:"
    echo -e "${BLUE}http://localhost:5000${NC}"
    echo ""
    echo -e "Login with:"
    echo -e "  Email: ${BLUE}$USER_EMAIL${NC}"
    echo -e "  Password: ${BLUE}[your password]${NC}"
else
    echo -e "\n${YELLOW}Installation complete!${NC}"
    echo -e "\nTo start Logstyx, run:"
    if [ "$USE_EXTERNAL" = true ]; then
        echo -e "${BLUE}docker compose -f docker-compose.prod.yml up -d${NC}"
    else
        echo -e "${BLUE}docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d${NC}"
    fi
fi

echo -e "\n${YELLOW}⚠  Important: Your MASTER_KEY has been saved to .env.encrypted${NC}"
echo -e "${YELLOW}   Keep this file secure and backed up!${NC}"
echo -e "\nFor more information, visit: https://github.com/devatlogstyx/logstyx"