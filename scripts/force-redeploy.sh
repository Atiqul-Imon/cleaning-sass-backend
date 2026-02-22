#!/bin/bash
# Force rebuild and restart - use when new routes/modules aren't appearing (e.g. 404 on /upload/image)
# Run from project root: ./backend/scripts/force-redeploy.sh
# Or from backend/: ./scripts/force-redeploy.sh

set -e

# Resolve paths - support running from project root or backend/
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$BACKEND_DIR/.." && pwd)"

# Load config from upload-and-deploy if present
DROPLET_IP="${DROPLET_IP:-46.101.37.78}"
DROPLET_USER="${DROPLET_USER:-root}"
APP_DIR="${APP_DIR:-/var/www/clenvora-api}"

echo "🔄 Force Redeploy - Rebuild and restart backend"
echo "==============================================="
echo "Backend dir: $BACKEND_DIR"
echo "Target: $DROPLET_USER@$DROPLET_IP:$APP_DIR"
echo ""

# Step 1: Upload code
echo "📤 Uploading backend code..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.git' \
    --exclude '*.log' \
    --exclude '.env' \
    "$BACKEND_DIR/" "$DROPLET_USER@$DROPLET_IP:$APP_DIR/backend/"

echo "✅ Code uploaded"
echo ""

# Step 2: Rebuild and restart on server
echo "🐳 Rebuilding Docker image (no cache) and restarting..."
ssh $DROPLET_USER@$DROPLET_IP "cd $APP_DIR/backend && \
    docker compose -f docker-compose.yml build --no-cache && \
    docker compose -f docker-compose.yml down 2>/dev/null || true && \
    docker compose -f docker-compose.yml up -d"

echo ""
echo "⏳ Waiting for container to start..."
sleep 8

# Step 3: Verify
echo ""
echo "📋 Verifying..."
ssh $DROPLET_USER@$DROPLET_IP "docker ps --filter 'name=cleaning-saas-backend' --filter 'name=fieldneat-backend' --format 'table {{.Names}}\t{{.Status}}'"

echo ""
echo "✅ Force redeploy complete!"
echo ""
echo "Test upload endpoint:"
echo "  curl -X POST https://api.clenvora.com/upload/image -H 'Authorization: Bearer YOUR_TOKEN' -F 'file=@image.jpg'"
echo ""
