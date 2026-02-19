#!/bin/bash

# Full Deployment Script for Clenvora API
# This script handles the complete deployment process
# Run this on your Digital Ocean droplet

set -e

DOMAIN="api.clenvora.com"
APP_DIR="/var/www/clenvora-api"
EMAIL="your-email@example.com"  # Update this with your email

echo "🚀 Starting full deployment for Clenvora API"
echo "=============================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Step 1: Update system
echo ""
echo "📦 Step 1: Updating system packages..."
apt-get update
apt-get upgrade -y

# Step 2: Install Node.js 20.x
echo ""
echo "📦 Step 2: Installing Node.js 20.x..."
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt "20" ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

node_version=$(node -v)
npm_version=$(npm -v)
echo "✅ Node.js $node_version installed"
echo "✅ npm $npm_version installed"

# Step 3: Install Docker (if not installed)
echo ""
echo "🐳 Step 3: Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "   Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed: $(docker --version)"
fi

# Install Docker Compose if not available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo "   Installing Docker Compose plugin..."
    apt-get install -y docker-compose-plugin
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already available"
fi

# Step 4: Install nginx
echo ""
echo "📦 Step 4: Installing nginx..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    echo "✅ Nginx installed"
else
    echo "✅ Nginx already installed"
fi

# Step 5: Install certbot
echo ""
echo "📦 Step 5: Installing certbot..."
if ! command -v certbot &> /dev/null; then
    apt-get install -y certbot python3-certbot-nginx
    echo "✅ Certbot installed"
else
    echo "✅ Certbot already installed"
fi

# Step 6: Install git
echo ""
echo "📦 Step 6: Installing git..."
if ! command -v git &> /dev/null; then
    apt-get install -y git
    echo "✅ Git installed"
else
    echo "✅ Git already installed"
fi

# Step 7: Create application directory
echo ""
echo "📁 Step 7: Creating application directory..."
if [ ! -d "$APP_DIR" ]; then
    mkdir -p $APP_DIR
    echo "✅ Directory created: $APP_DIR"
else
    echo "✅ Directory already exists: $APP_DIR"
fi

# Step 8: Configure firewall
echo ""
echo "🔥 Step 8: Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow OpenSSH
    ufw allow 'Nginx Full'
    ufw --force enable
    echo "✅ Firewall configured"
else
    echo "⚠️  UFW not found, skipping firewall setup"
fi

# Step 9: Check if application code exists
echo ""
echo "📂 Step 9: Checking application code..."
if [ ! -f "$APP_DIR/backend/package.json" ]; then
    echo "⚠️  Application code not found in $APP_DIR/backend"
    echo "   Please upload your code to $APP_DIR before continuing"
    echo "   You can:"
    echo "   1. Clone your repository: git clone <repo-url> $APP_DIR"
    echo "   2. Or upload files via SCP/SFTP"
    echo ""
    read -p "Press Enter when you've uploaded the code, or Ctrl+C to exit..."
fi

# Step 10: Verify Docker setup
echo ""
echo "🐳 Step 10: Verifying Docker setup..."
if [ -f "$APP_DIR/backend/Dockerfile" ] && [ -f "$APP_DIR/backend/docker-compose.yml" ]; then
    echo "✅ Dockerfile and docker-compose.yml found"
    echo "   Application will be built and run by Docker"
else
    echo "⚠️  Docker files not found. Checking for package.json..."
    if [ -f "$APP_DIR/backend/package.json" ]; then
        echo "   package.json found - will need to build manually or set up Docker"
    else
        echo "❌ Neither Docker files nor package.json found"
        exit 1
    fi
fi

# Step 11: Check environment file
echo ""
echo "⚙️  Step 11: Checking environment configuration..."
if [ ! -f "$APP_DIR/backend/.env" ]; then
    echo "⚠️  .env file not found!"
    echo "   Please create $APP_DIR/backend/.env with required variables:"
    echo "   - PORT=5000"
    echo "   - NODE_ENV=production"
    echo "   - FRONTEND_URL=https://clenvora.com"
    echo "   - DATABASE_URL=..."
    echo "   - SUPABASE_URL=..."
    echo "   - And other required variables"
    echo ""
    read -p "Press Enter when you've created .env, or Ctrl+C to exit..."
fi

# Step 12: Set up nginx
echo ""
echo "🌐 Step 12: Configuring nginx..."

# Check if nginx is already configured
if [ -f "/etc/nginx/sites-available/clenvora-api" ] || [ -L "/etc/nginx/sites-enabled/clenvora-api" ]; then
    echo "⚠️  Nginx configuration already exists"
    read -p "   Do you want to overwrite it? (y/N): " OVERWRITE_NGINX
    if [[ ! "$OVERWRITE_NGINX" =~ ^[Yy]$ ]]; then
        echo "   Skipping nginx configuration (using existing)"
        NGINX_SKIP=true
    else
        echo "   Overwriting nginx configuration..."
        NGINX_SKIP=false
    fi
else
    NGINX_SKIP=false
fi

if [ "$NGINX_SKIP" != "true" ]; then
    if [ -f "$APP_DIR/backend/nginx/clenvora-api.conf" ]; then
        cp $APP_DIR/backend/nginx/clenvora-api.conf /etc/nginx/sites-available/clenvora-api
        
        if [ ! -L "/etc/nginx/sites-enabled/clenvora-api" ]; then
            ln -s /etc/nginx/sites-available/clenvora-api /etc/nginx/sites-enabled/
            echo "✅ Nginx configuration file created and enabled"
        else
            echo "✅ Nginx configuration file updated"
        fi
        
        # Test nginx configuration
        if nginx -t; then
            echo "✅ Nginx configuration is valid"
        else
            echo "❌ Nginx configuration has errors"
            exit 1
        fi
    else
        echo "⚠️  Nginx config file not found at $APP_DIR/backend/nginx/clenvora-api.conf"
        echo "   Skipping nginx setup"
    fi
fi

# Step 13: Set up SSL (if nginx is configured)
echo ""
echo "🔒 Step 13: Setting up SSL certificate..."

# Check if SSL certificate already exists
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "✅ SSL certificate already exists for $DOMAIN"
    
    # Verify certificate details
    if command -v certbot &> /dev/null; then
        CERT_INFO=$(certbot certificates 2>/dev/null | grep -A 5 "$DOMAIN" || echo "")
        if [ ! -z "$CERT_INFO" ]; then
            echo "   Certificate details:"
            echo "$CERT_INFO" | head -n 3 | sed 's/^/   /'
        fi
    fi
    
    # Check if certificate is valid (not expired)
    if openssl x509 -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem -noout -checkend 2592000 > /dev/null 2>&1; then
        echo "   ✅ Certificate is valid (expires in more than 30 days)"
        SSL_EXISTS=true
    else
        echo "   ⚠️  Certificate expires soon or is invalid"
        read -p "   Do you want to renew it? (y/N): " RENEW_SSL
        if [[ "$RENEW_SSL" =~ ^[Yy]$ ]]; then
            SSL_EXISTS=false
        else
            SSL_EXISTS=true
        fi
    fi
else
    SSL_EXISTS=false
fi

# Check if certbot auto-renewal is configured
if systemctl is-enabled certbot.timer > /dev/null 2>&1; then
    echo "✅ Certbot auto-renewal is already enabled"
else
    echo "⚠️  Certbot auto-renewal is not enabled"
fi

if [ "$SSL_EXISTS" != "true" ] && [ -f "/etc/nginx/sites-available/clenvora-api" ]; then
    echo "   Obtaining SSL certificate for $DOMAIN..."
    
    # Get email if not set
    if [ -z "$EMAIL" ] || [ "$EMAIL" == "your-email@example.com" ]; then
        read -p "   Enter your email for Let's Encrypt: " EMAIL
        if [ -z "$EMAIL" ]; then
            echo "   ❌ Email is required for SSL certificate"
            exit 1
        fi
    fi
    
    # Check if DNS is pointing correctly
    echo "   Checking DNS configuration..."
    DNS_IP=$(dig +short $DOMAIN @8.8.8.8 | tail -n 1)
    SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip)
    
    if [ "$DNS_IP" == "$SERVER_IP" ]; then
        echo "   ✅ DNS is pointing correctly ($DNS_IP)"
    else
        echo "   ⚠️  DNS may not be pointing correctly"
        echo "      DNS resolves to: $DNS_IP"
        echo "      Server IP is: $SERVER_IP"
        read -p "   Continue anyway? (y/N): " CONTINUE_SSL
        if [[ ! "$CONTINUE_SSL" =~ ^[Yy]$ ]]; then
            echo "   Skipping SSL setup"
            SSL_EXISTS=true
        fi
    fi
    
    if [ "$SSL_EXISTS" != "true" ]; then
        # Stop nginx temporarily
        echo "   Stopping nginx temporarily..."
        systemctl stop nginx
        
        # Obtain certificate
        echo "   Requesting SSL certificate from Let's Encrypt..."
        if certbot certonly --standalone \
            --non-interactive \
            --agree-tos \
            --email "$EMAIL" \
            -d "$DOMAIN"; then
            echo "   ✅ SSL certificate obtained successfully"
        else
            echo "   ❌ Failed to obtain SSL certificate"
            echo "   Starting nginx anyway..."
            systemctl start nginx
            exit 1
        fi
        
        # Start nginx
        systemctl start nginx
        
        # Set up auto-renewal
        if ! systemctl is-enabled certbot.timer > /dev/null 2>&1; then
            systemctl enable certbot.timer
            systemctl start certbot.timer
            echo "   ✅ Certbot auto-renewal enabled"
        fi
        
        # Test renewal
        echo "   Testing certificate renewal..."
        certbot renew --dry-run > /dev/null 2>&1 && echo "   ✅ Auto-renewal test passed" || echo "   ⚠️  Auto-renewal test failed (check manually)"
    fi
elif [ "$SSL_EXISTS" == "true" ]; then
    echo "   Using existing SSL certificate"
elif [ ! -f "/etc/nginx/sites-available/clenvora-api" ]; then
    echo "⚠️  Skipping SSL setup (nginx not configured)"
fi

# Step 14: Start application with Docker
echo ""
echo "🐳 Step 14: Starting application with Docker..."
cd $APP_DIR/backend

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

# Check if docker-compose is available
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo "❌ Docker Compose is not available"
    exit 1
fi

# Check if container already exists
if docker ps -a | grep -q "fieldneat-backend\|cleaning-saas-backend"; then
    echo "⚠️  Docker container already exists"
    read -p "   Do you want to restart it? (y/N): " RESTART_DOCKER
    if [[ "$RESTART_DOCKER" =~ ^[Yy]$ ]]; then
        echo "   Stopping existing container..."
        docker stop fieldneat-backend cleaning-saas-backend 2>/dev/null || true
        docker rm fieldneat-backend cleaning-saas-backend 2>/dev/null || true
        DOCKER_STARTED=false
    else
        echo "   Keeping existing container running"
        DOCKER_STARTED=true
    fi
else
    DOCKER_STARTED=false
fi

if [ "$DOCKER_STARTED" != "true" ]; then
    # Build and start with Docker Compose
    if [ -f "docker-compose.yml" ]; then
        echo "   Building Docker image..."
        $DOCKER_COMPOSE_CMD -f docker-compose.yml build
        
        echo "   Starting container..."
        $DOCKER_COMPOSE_CMD -f docker-compose.yml up -d
        
        # Wait a moment for container to start
        sleep 5
        
        if docker ps | grep -q "fieldneat-backend\|cleaning-saas-backend"; then
            echo "✅ Application started with Docker"
        else
            echo "⚠️  Container may not be running. Check logs:"
            echo "   docker logs fieldneat-backend"
        fi
    else
        echo "❌ docker-compose.yml not found"
        exit 1
    fi
fi

# Step 16: Enable and start nginx
echo ""
echo "🌐 Step 16: Starting nginx..."

# Check if nginx is already running
if systemctl is-active --quiet nginx; then
    echo "   Nginx is already running"
    read -p "   Do you want to restart it? (y/N): " RESTART_NGINX
    if [[ "$RESTART_NGINX" =~ ^[Yy]$ ]]; then
        systemctl restart nginx
        echo "✅ Nginx restarted"
    else
        echo "✅ Nginx is running (not restarted)"
    fi
else
    systemctl start nginx
    echo "✅ Nginx started"
fi

# Enable nginx on startup (if not already enabled)
if ! systemctl is-enabled --quiet nginx; then
    systemctl enable nginx
    echo "✅ Nginx enabled on startup"
else
    echo "✅ Nginx is already enabled on startup"
fi

# Step 17: Final verification
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Verification:"
echo "=================="
echo "Docker Container Status:"
docker ps --filter "name=fieldneat-backend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || docker ps --filter "name=cleaning-saas-backend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Nginx Status:"
systemctl status nginx --no-pager | head -n 5
echo ""
echo "SSL Certificate:"
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "✅ SSL certificate exists"
    # Show certificate expiration
    EXPIRY=$(openssl x509 -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem -noout -enddate 2>/dev/null | cut -d= -f2)
    if [ ! -z "$EXPIRY" ]; then
        echo "   Expires: $EXPIRY"
    fi
    certbot certificates 2>/dev/null | grep -A 5 "$DOMAIN" | head -n 3 | sed 's/^/   /' || echo "   (Run 'sudo certbot certificates' for details)"
else
    echo "⚠️  SSL certificate not found"
fi
echo ""
echo "Nginx Configuration:"
if [ -f "/etc/nginx/sites-available/clenvora-api" ]; then
    echo "✅ Nginx config file exists"
    if [ -L "/etc/nginx/sites-enabled/clenvora-api" ]; then
        echo "✅ Nginx config is enabled"
    else
        echo "⚠️  Nginx config exists but is not enabled"
    fi
    if nginx -t 2>/dev/null; then
        echo "✅ Nginx configuration is valid"
    else
        echo "❌ Nginx configuration has errors"
    fi
else
    echo "⚠️  Nginx config file not found"
fi
echo ""
echo "🌐 Test your API:"
echo "   curl https://$DOMAIN/health"
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker logs fieldneat-backend"
echo "   Restart: docker restart fieldneat-backend"
echo "   Status: docker ps"
echo "   Rebuild: cd $APP_DIR/backend && docker compose -f docker-compose.yml up -d --build"
echo "   Nginx logs: sudo tail -f /var/log/nginx/api.clenvora.com.access.log"

