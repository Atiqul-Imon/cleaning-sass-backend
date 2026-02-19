#!/bin/bash
# FieldNeat Backend - Enterprise Setup Script
# This script sets up the droplet with enterprise-grade configuration

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DROPLET_IP="46.101.37.78"
PROJECT_DIR="/opt/fieldneat-backend"
BACKEND_DIR="$PROJECT_DIR/backend"
REPO_URL=""  # Will be set by user or detected

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   FieldNeat Backend - Enterprise Setup                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ This script must be run as root${NC}"
    exit 1
fi

# Step 1: System Update
echo -e "${YELLOW}[1/12] 📦 Updating system packages...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt update -qq
apt upgrade -y -qq
apt install -y -qq curl wget git ufw fail2ban unattended-upgrades
echo -e "${GREEN}✅ System updated${NC}"

# Step 2: Install Docker
echo -e "${YELLOW}[2/12] 🐳 Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sh /tmp/get-docker.sh
    rm /tmp/get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}✅ Docker installed${NC}"
else
    echo -e "${GREEN}✅ Docker already installed${NC}"
fi

# Step 3: Install Docker Compose
echo -e "${YELLOW}[3/12] 🐳 Installing Docker Compose...${NC}"
apt install -y -qq docker-compose-plugin
echo -e "${GREEN}✅ Docker Compose installed${NC}"

# Step 4: Install Node.js
echo -e "${YELLOW}[4/12] 📦 Installing Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt install -y -qq nodejs
    echo -e "${GREEN}✅ Node.js $(node --version) installed${NC}"
else
    echo -e "${GREEN}✅ Node.js already installed ($(node --version))${NC}"
fi

# Step 5: Install Nginx
echo -e "${YELLOW}[5/12] 🌐 Installing Nginx...${NC}"
apt install -y -qq nginx
systemctl enable nginx
systemctl start nginx
echo -e "${GREEN}✅ Nginx installed${NC}"

# Step 6: Install Certbot
echo -e "${YELLOW}[6/12] 🔒 Installing Certbot...${NC}"
apt install -y -qq certbot python3-certbot-nginx
echo -e "${GREEN}✅ Certbot installed${NC}"

# Step 7: Configure Firewall
echo -e "${YELLOW}[7/12] 🔥 Configuring firewall...${NC}"
ufw --force reset > /dev/null 2>&1
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 5000/tcp
ufw --force enable
echo -e "${GREEN}✅ Firewall configured${NC}"

# Step 8: Configure Fail2Ban
echo -e "${YELLOW}[8/12] 🛡️  Configuring Fail2Ban...${NC}"
systemctl enable fail2ban
systemctl start fail2ban
echo -e "${GREEN}✅ Fail2Ban configured${NC}"

# Step 9: Configure Automatic Security Updates
echo -e "${YELLOW}[9/12] 🔄 Configuring automatic security updates...${NC}"
cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF
systemctl enable unattended-upgrades
systemctl start unattended-upgrades
echo -e "${GREEN}✅ Automatic updates configured${NC}"

# Step 10: Create Project Directory
echo -e "${YELLOW}[10/12] 📁 Creating project directory...${NC}"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR
echo -e "${GREEN}✅ Directory created: $PROJECT_DIR${NC}"

# Step 11: Configure Docker Log Rotation
echo -e "${YELLOW}[11/12] 📝 Configuring Docker log rotation...${NC}"
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
systemctl restart docker
echo -e "${GREEN}✅ Docker log rotation configured${NC}"

# Step 12: Create Deployment User (Optional but recommended)
echo -e "${YELLOW}[12/12] 👤 Setting up deployment user...${NC}"
if ! id "deploy" &>/dev/null; then
    useradd -m -s /bin/bash deploy
    usermod -aG docker deploy
    mkdir -p /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    echo -e "${GREEN}✅ Deployment user created${NC}"
else
    echo -e "${GREEN}✅ Deployment user already exists${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Enterprise Setup Complete!                         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Installed components:"
echo "  ✅ Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
echo "  ✅ Docker Compose $(docker compose version --short)"
echo "  ✅ Node.js $(node --version)"
echo "  ✅ Nginx $(nginx -v 2>&1 | cut -d' ' -f3)"
echo "  ✅ Certbot"
echo "  ✅ Firewall (UFW)"
echo "  ✅ Fail2Ban"
echo "  ✅ Automatic Security Updates"
echo ""
echo "Next steps:"
echo "  1. Clone your repository:"
echo "     cd $PROJECT_DIR"
echo "     git clone YOUR_REPO_URL ."
echo ""
echo "  2. Configure environment:"
echo "     cd $BACKEND_DIR"
echo "     cp .env.example .env"
echo "     nano .env"
echo ""
echo "  3. Run database migrations:"
echo "     npm install"
echo "     npx prisma generate"
echo "     npx prisma migrate deploy"
echo ""
echo "  4. Deploy:"
echo "     docker compose -f docker-compose.prod.yml up -d"
echo ""



