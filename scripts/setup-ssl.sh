#!/bin/bash

# SSL Setup Script for api.clenvora.com
# This script sets up SSL certificate using Let's Encrypt Certbot

set -e

DOMAIN="api.clenvora.com"
EMAIL="your-email@example.com"  # Change this to your email

echo "🔒 Setting up SSL certificate for $DOMAIN"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Update system packages
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install certbot and nginx plugin
echo "📦 Installing certbot..."
apt-get install -y certbot python3-certbot-nginx

# Stop nginx temporarily (certbot will start it)
echo "🛑 Stopping nginx..."
systemctl stop nginx

# Obtain SSL certificate
echo "🔐 Obtaining SSL certificate for $DOMAIN..."
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN"

# Verify certificate was created
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "✅ SSL certificate created successfully!"
else
    echo "❌ Failed to create SSL certificate"
    exit 1
fi

# Set up auto-renewal
echo "🔄 Setting up auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

# Test renewal
echo "🧪 Testing certificate renewal..."
certbot renew --dry-run

echo "✅ SSL setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Make sure nginx configuration is in place"
echo "2. Test nginx configuration: sudo nginx -t"
echo "3. Start nginx: sudo systemctl start nginx"
echo "4. Enable nginx: sudo systemctl enable nginx"


