# Deployment Guide - Digital Ocean Droplet

This guide provides step-by-step instructions for deploying the backend to a Digital Ocean droplet.

## Quick Start

```bash
# On your local machine
git push origin main

# On your droplet
cd /opt/cleaning-saas-backend
git pull origin main
docker-compose up -d --build
```

## Detailed Deployment Steps

### 1. Initial Server Setup

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Install Node.js (for Prisma)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git

# Install Nginx
apt install nginx -y
```

### 2. Clone and Configure

```bash
# Clone repository
cd /opt
git clone <your-repo-url> cleaning-saas-backend
cd cleaning-saas-backend

# Configure environment
cp .env.example .env
nano .env  # Edit with your values

# Run migrations
npm install
npx prisma generate
npx prisma migrate deploy
```

### 3. Deploy with Docker

```bash
# Build and start
docker-compose up -d --build

# Check status
docker-compose ps
docker-compose logs -f
```

### 4. Configure Nginx

Create `/etc/nginx/sites-available/cleaning-saas-backend`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/cleaning-saas-backend /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 5. Setup SSL

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d your-domain.com
```

### 6. Configure Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## Update Script

Create `/opt/cleaning-saas-backend/update.sh`:

```bash
#!/bin/bash
set -e

cd /opt/cleaning-saas-backend
git pull origin main
npx prisma migrate deploy
docker-compose up -d --build
docker-compose logs -f --tail=50
```

Make executable:
```bash
chmod +x /opt/cleaning-saas-backend/update.sh
```

Usage:
```bash
./update.sh
```

## Monitoring

### Check Application Status

```bash
# Container status
docker-compose ps

# Application logs
docker-compose logs -f

# System resources
htop
df -h
```

### Health Checks

```bash
# Application health
curl http://localhost:5000/health

# Through Nginx
curl http://your-domain.com/health
```

## Backup Strategy

### Database Backup

Since we're using Supabase, backups are handled automatically. For manual backups:

```bash
# Export database (requires Supabase CLI or direct access)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Application Backup

```bash
# Backup environment file
cp .env .env.backup

# Backup Docker volumes (if any)
docker run --rm -v cleaning-saas-backend_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/data_backup.tar.gz /data
```

## Rollback Procedure

If deployment fails:

```bash
# Stop current version
docker-compose down

# Checkout previous version
git checkout <previous-commit-hash>

# Rebuild and start
docker-compose up -d --build
```

## Troubleshooting

### Container keeps restarting

```bash
# Check logs
docker-compose logs backend

# Check environment variables
docker-compose config
```

### Database connection issues

```bash
# Test connection
npx prisma db pull

# Check Supabase dashboard
# Verify connection pooler is enabled
```

### Port conflicts

```bash
# Check what's using port 5000
lsof -i :5000

# Change port in .env and docker-compose.yml
```

## Maintenance

### Regular Updates

1. Update system packages: `apt update && apt upgrade -y`
2. Update Node.js dependencies: `npm update`
3. Update Docker images: `docker-compose pull`
4. Review security: `npm audit`

### Log Rotation

Configure log rotation for Docker:

```bash
# Create /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

# Restart Docker
systemctl restart docker
```

## Support

For issues:
1. Check application logs: `docker-compose logs -f`
2. Check Nginx logs: `tail -f /var/log/nginx/error.log`
3. Verify environment variables
4. Test database connection
5. Review Digital Ocean monitoring dashboard

