#!/bin/bash

# Fix Deployment Script
# This script fixes the current deployment issues on the droplet

set -e

DOMAIN="api.clenvora.com"
APP_DIR="/var/www/clenvora-api/backend"
EMAIL="your-email@example.com"  # Update this

echo "🔧 Fixing Deployment Issues"
echo "=========================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Step 1: Check .env file
echo ""
echo "📋 Step 1: Checking .env file..."
if [ ! -f "$APP_DIR/.env" ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Check if .env has placeholder values
if grep -q "your-project.supabase.co\|your-service-role-key" "$APP_DIR/.env"; then
    echo "⚠️  .env file contains placeholder values!"
    echo "   Some values may need updating, but continuing with SSL setup..."
    echo "   You can update .env later if needed"
else
    # Still check for localhost:3000 in FRONTEND_URL
    if grep -q "FRONTEND_URL=http://localhost:3000" "$APP_DIR/.env"; then
        echo "⚠️  FRONTEND_URL is set to localhost, updating to clenvora.com..."
        sed -i 's|FRONTEND_URL=http://localhost:3000|FRONTEND_URL=https://clenvora.com|g' "$APP_DIR/.env"
        echo "✅ FRONTEND_URL updated"
    fi
    
    # Update NODE_ENV if it's development
    if grep -q "NODE_ENV=development" "$APP_DIR/.env"; then
        echo "⚠️  NODE_ENV is development, updating to production..."
        sed -i 's|NODE_ENV=development|NODE_ENV=production|g' "$APP_DIR/.env"
        echo "✅ NODE_ENV updated"
    fi
fi

# Step 2: Verify Docker setup
echo ""
echo "🐳 Step 2: Verifying Docker setup..."
cd $APP_DIR

if [ ! -f "Dockerfile" ]; then
    echo "❌ Dockerfile not found!"
    exit 1
fi

if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found!"
    exit 1
fi

echo "✅ Docker files found"
echo "   Note: Application will be built by Docker, no need to build manually"

# Step 3: Set up SSL certificate
echo ""
echo "🔒 Step 3: Setting up SSL certificate..."

if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "✅ SSL certificate already exists"
else
    echo "   Obtaining SSL certificate..."
    
    # Get email if not set
    if [ -z "$EMAIL" ] || [ "$EMAIL" == "your-email@example.com" ]; then
        read -p "   Enter your email for Let's Encrypt: " EMAIL
        if [ -z "$EMAIL" ]; then
            echo "   ❌ Email is required"
            exit 1
        fi
    fi
    
    # Stop nginx temporarily
    echo "   Stopping nginx..."
    systemctl stop nginx
    
    # Obtain certificate
    echo "   Requesting certificate from Let's Encrypt..."
    if certbot certonly --standalone \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        -d "$DOMAIN"; then
        echo "   ✅ SSL certificate obtained"
    else
        echo "   ❌ Failed to obtain SSL certificate"
        systemctl start nginx
        exit 1
    fi
    
    # Start nginx
    systemctl start nginx
    
    # Enable auto-renewal
    systemctl enable certbot.timer
    systemctl start certbot.timer
    echo "   ✅ Auto-renewal enabled"
fi

# Step 4: Verify nginx config
echo ""
echo "🌐 Step 4: Verifying nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
    systemctl restart nginx
    echo "✅ Nginx restarted"
else
    echo "❌ Nginx configuration has errors"
    exit 1
fi

# Step 5: Start application with Docker
echo ""
echo "🐳 Step 5: Starting application with Docker..."
cd $APP_DIR

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

# Check if docker-compose is available
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo "❌ Docker Compose is not available"
    exit 1
fi

# Stop existing container if running
echo "   Stopping existing container..."
docker stop fieldneat-backend 2>/dev/null || true
docker rm fieldneat-backend 2>/dev/null || true

# Build and start with Docker Compose
echo "   Building Docker image..."
$DOCKER_COMPOSE_CMD -f docker-compose.yml build

echo "   Starting container..."
$DOCKER_COMPOSE_CMD -f docker-compose.yml up -d

# Wait a moment for container to start
sleep 5

# Check container status
if docker ps | grep -q fieldneat-backend; then
    echo "✅ Application started with Docker"
    docker ps | grep fieldneat-backend
else
    echo "⚠️  Container may not be running. Check logs:"
    echo "   docker logs fieldneat-backend"
fi

# Step 6: Final verification
echo ""
echo "✅ Deployment fix complete!"
echo ""
echo "📊 Verification:"
echo "=================="
echo "Docker Container Status:"
docker ps --filter "name=fieldneat-backend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Nginx Status:"
systemctl status nginx --no-pager | head -5
echo ""
echo "SSL Certificate:"
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "✅ SSL certificate exists"
    EXPIRY=$(openssl x509 -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem -noout -enddate 2>/dev/null | cut -d= -f2)
    echo "   Expires: $EXPIRY"
else
    echo "⚠️  SSL certificate not found"
fi
echo ""
echo "🌐 Test your API:"
echo "   curl https://$DOMAIN/health"
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker logs fieldneat-backend"
echo "   Restart: docker restart fieldneat-backend"
echo "   Status: docker ps"
echo "   Rebuild: cd $APP_DIR && docker compose -f docker-compose.yml up -d --build"

