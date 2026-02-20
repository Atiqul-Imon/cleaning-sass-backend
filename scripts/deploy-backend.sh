#!/bin/bash

# Backend Deployment Script for Digital Ocean Droplet
# This script sets up the backend on a fresh Ubuntu server

set -e

echo "🚀 Starting backend deployment..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Node.js 20.x
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify Node.js installation
node_version=$(node -v)
npm_version=$(npm -v)
echo "✅ Node.js $node_version installed"
echo "✅ npm $npm_version installed"

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Install nginx
echo "📦 Installing nginx..."
apt-get install -y nginx

# Install certbot for SSL
echo "📦 Installing certbot..."
apt-get install -y certbot python3-certbot-nginx

# Install git
echo "📦 Installing git..."
apt-get install -y git

# Create application directory
APP_DIR="/var/www/clenvora-api"
echo "📁 Creating application directory: $APP_DIR"
mkdir -p $APP_DIR
chown -R $SUDO_USER:$SUDO_USER $APP_DIR

# Set up firewall
echo "🔥 Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "✅ Basic setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Clone your repository to $APP_DIR"
echo "2. Copy .env file to $APP_DIR/backend/.env"
echo "3. Install dependencies: cd $APP_DIR/backend && npm install"
echo "4. Build the application: npm run build"
echo "5. Set up nginx configuration"
echo "6. Set up SSL certificate"
echo "7. Start the application with PM2"




