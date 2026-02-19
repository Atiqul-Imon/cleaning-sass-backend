#!/bin/bash
# FieldNeat Backend - Digital Ocean Droplet Setup Script
# Run this script on a fresh Ubuntu 22.04 droplet

set -e

echo "🚀 FieldNeat Backend - Droplet Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Install Docker
echo -e "${YELLOW}🐳 Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}✅ Docker installed${NC}"
else
    echo -e "${GREEN}✅ Docker already installed${NC}"
fi

# Install Docker Compose Plugin
echo -e "${YELLOW}🐳 Installing Docker Compose...${NC}"
apt install docker-compose-plugin -y
echo -e "${GREEN}✅ Docker Compose installed${NC}"

# Install Node.js (for Prisma)
echo -e "${YELLOW}📦 Installing Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    echo -e "${GREEN}✅ Node.js installed${NC}"
else
    echo -e "${GREEN}✅ Node.js already installed${NC}"
fi

# Install Git
echo -e "${YELLOW}📦 Installing Git...${NC}"
apt install -y git
echo -e "${GREEN}✅ Git installed${NC}"

# Install Nginx
echo -e "${YELLOW}🌐 Installing Nginx...${NC}"
apt install -y nginx
echo -e "${GREEN}✅ Nginx installed${NC}"

# Install Certbot
echo -e "${YELLOW}🔒 Installing Certbot...${NC}"
apt install -y certbot python3-certbot-nginx
echo -e "${GREEN}✅ Certbot installed${NC}"

# Configure Firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 5000/tcp
ufw --force enable
echo -e "${GREEN}✅ Firewall configured${NC}"

# Create project directory
echo -e "${YELLOW}📁 Creating project directory...${NC}"
mkdir -p /opt/fieldneat-backend
echo -e "${GREEN}✅ Directory created: /opt/fieldneat-backend${NC}"

# Setup instructions
echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Clone your repository:"
echo "   cd /opt/fieldneat-backend"
echo "   git clone YOUR_REPO_URL ."
echo ""
echo "2. Configure environment:"
echo "   cd backend"
echo "   cp .env.example .env"
echo "   nano .env  # Edit with your values"
echo ""
echo "3. Run database migrations:"
echo "   npm install"
echo "   npx prisma generate"
echo "   npx prisma migrate deploy"
echo ""
echo "4. Deploy:"
echo "   docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "5. Configure Nginx (see DIGITAL_OCEAN_SETUP.md)"
echo ""
echo "For detailed instructions, see: DIGITAL_OCEAN_SETUP.md"



