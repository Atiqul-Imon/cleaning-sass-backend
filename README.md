# Backend API - UK Domestic Cleaning SaaS

NestJS backend API for the UK Domestic Cleaning SaaS platform.

## 🚀 Features

- **Modern Stack**: NestJS, TypeScript, Prisma ORM, PostgreSQL
- **Performance Optimized**: Database indexing, connection pooling, request-scoped caching
- **Authentication**: Supabase Auth integration with role-based access control
- **Payment Processing**: Stripe integration for subscriptions
- **Email Notifications**: Configurable email service (Gmail, SendGrid, Mailgun)
- **Image Upload**: ImageKit integration for job photos
- **Production Ready**: Docker support, health checks, compression

## 📋 Prerequisites

- Node.js 20+ and npm
- PostgreSQL database (Supabase recommended)
- Supabase account and project
- (Optional) Stripe account for payments
- (Optional) ImageKit account for image uploads

## 🛠️ Local Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your credentials (see Environment Variables section below).

4. **Set up database**
   ```bash
   # Generate Prisma Client
   npx prisma generate
   
   # Run migrations
   npx prisma migrate deploy
   
   # (Optional) Seed database
   npm run seed
   ```

5. **Start development server**
   ```bash
   npm run start:dev
   ```

   The API will be available at `http://localhost:5000`

## 🐳 Docker Setup

### Build and Run with Docker

1. **Build the Docker image**
   ```bash
   docker build -t cleaning-saas-backend .
   ```

2. **Run with Docker Compose**
   ```bash
   # Make sure .env file is configured
   docker-compose up -d
   ```

3. **View logs**
   ```bash
   docker-compose logs -f
   ```

4. **Stop the container**
   ```bash
   docker-compose down
   ```

### Manual Docker Run

```bash
docker run -d \
  --name cleaning-saas-backend \
  -p 5000:5000 \
  --env-file .env \
  cleaning-saas-backend
```

## 🌊 Deployment to Digital Ocean Droplet

### Prerequisites

- Digital Ocean account
- Droplet with Ubuntu 22.04 LTS
- Domain name (optional, for SSL)

### Step 1: Create Droplet

1. Go to Digital Ocean dashboard
2. Create a new Droplet:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: At least 2GB RAM, 1 vCPU (4GB+ recommended for production)
   - **Region**: Choose closest to your users
   - **Authentication**: SSH keys (recommended) or password

### Step 2: Initial Server Setup

1. **SSH into your droplet**
   ```bash
   ssh root@your-droplet-ip
   ```

2. **Update system packages**
   ```bash
   apt update && apt upgrade -y
   ```

3. **Install Docker**
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Install Docker Compose
   apt install docker-compose-plugin -y
   
   # Add current user to docker group (if not root)
   usermod -aG docker $USER
   ```

4. **Install Node.js (for Prisma migrations)**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt install -y nodejs
   ```

5. **Install Git**
   ```bash
   apt install git -y
   ```

### Step 3: Deploy Application

1. **Clone your repository**
   ```bash
   cd /opt
   git clone <your-backend-repo-url> cleaning-saas-backend
   cd cleaning-saas-backend
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   nano .env
   ```
   
   Update all required variables, especially:
   - `DATABASE_URL`: Use Supabase connection pooler (port 6543) for production
   - `FRONTEND_URL`: Your frontend URL (e.g., `https://your-app.vercel.app`)
   - `NODE_ENV=production`

3. **Run database migrations**
   ```bash
   npm install
   npx prisma generate
   npx prisma migrate deploy
   ```

4. **Build and start with Docker**
   ```bash
   docker-compose up -d --build
   ```

5. **Verify deployment**
   ```bash
   # Check container status
   docker-compose ps
   
   # Check logs
   docker-compose logs -f
   
   # Test health endpoint
   curl http://localhost:5000/health
   ```

### Step 4: Configure Nginx (Reverse Proxy)

1. **Install Nginx**
   ```bash
   apt install nginx -y
   ```

2. **Create Nginx configuration**
   ```bash
   nano /etc/nginx/sites-available/cleaning-saas-backend
   ```

   Add the following configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;  # or your droplet IP

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

3. **Enable the site**
   ```bash
   ln -s /etc/nginx/sites-available/cleaning-saas-backend /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

### Step 5: Setup SSL with Let's Encrypt

1. **Install Certbot**
   ```bash
   apt install certbot python3-certbot-nginx -y
   ```

2. **Obtain SSL certificate**
   ```bash
   certbot --nginx -d your-domain.com
   ```

   Follow the prompts. Certbot will automatically configure Nginx for HTTPS.

3. **Auto-renewal (already configured by Certbot)**
   ```bash
   # Test renewal
   certbot renew --dry-run
   ```

### Step 6: Setup Firewall

```bash
# Allow SSH, HTTP, HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

### Step 7: Auto-start on Reboot

Docker Compose services automatically restart on reboot. To ensure Nginx starts:

```bash
systemctl enable nginx
```

## 🔄 Updating the Application

1. **SSH into droplet**
   ```bash
   ssh root@your-droplet-ip
   ```

2. **Navigate to project directory**
   ```bash
   cd /opt/cleaning-saas-backend
   ```

3. **Pull latest changes**
   ```bash
   git pull origin main
   ```

4. **Run migrations (if any)**
   ```bash
   npx prisma migrate deploy
   ```

5. **Rebuild and restart**
   ```bash
   docker-compose up -d --build
   ```

6. **Check logs**
   ```bash
   docker-compose logs -f
   ```

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `PORT` | Server port (default: 5000) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `FRONTEND_URL` | Frontend URL for CORS | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key | No |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | No |
| `STRIPE_PRICE_ID_SOLO` | Stripe price ID for Solo plan | No |
| `STRIPE_PRICE_ID_SMALL_TEAM` | Stripe price ID for Small Team plan | No |
| `EMAIL_SERVICE` | Email service (gmail/sendgrid/mailgun) | No |
| `EMAIL_USER` | Email address | No |
| `EMAIL_API_KEY` | Email API key or app password | No |
| `IMAGEKIT_PUBLIC_KEY` | ImageKit public key | No |
| `IMAGEKIT_PRIVATE_KEY` | ImageKit private key | No |
| `IMAGEKIT_URL_ENDPOINT` | ImageKit URL endpoint | No |

## 📁 Project Structure

```
backend/
├── src/
│   ├── auth/           # Authentication module
│   ├── business/       # Business management
│   ├── clients/        # Client management
│   ├── jobs/           # Job management
│   ├── invoices/       # Invoice management
│   ├── cleaners/       # Cleaner management
│   ├── payments/       # Payment processing
│   ├── subscriptions/  # Subscription management
│   ├── reports/        # Reporting
│   ├── reminders/      # Email reminders
│   ├── prisma/         # Prisma service
│   └── main.ts         # Application entry point
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── migrations/     # Database migrations
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Docker Compose configuration
└── .env.example        # Environment variables template
```

## 🧪 Development

- **Start dev server**: `npm run start:dev`
- **Build**: `npm run build`
- **Start production**: `npm run start:prod`
- **Linting**: `npm run lint`
- **Testing**: `npm test`
- **Database migrations**: `npx prisma migrate dev`
- **Seed database**: `npm run seed`

## 🔒 Security Best Practices

1. **Never commit `.env` files**
2. **Use connection pooler** for Supabase (port 6543) in production
3. **Enable firewall** on your droplet
4. **Use SSH keys** instead of passwords
5. **Keep dependencies updated**: `npm audit`
6. **Use HTTPS** in production (Let's Encrypt)
7. **Rotate secrets** regularly
8. **Monitor logs** for suspicious activity

## 📊 Monitoring

### View Application Logs

```bash
# Docker Compose logs
docker-compose logs -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Health Check

The application includes a health check endpoint (if implemented):
```bash
curl http://localhost:5000/health
```

### Database Connection

Test database connection:
```bash
npx prisma db pull
```

## 🐛 Troubleshooting

### Container won't start
- Check logs: `docker-compose logs`
- Verify environment variables
- Ensure database is accessible

### Database connection errors
- Verify `DATABASE_URL` is correct
- Check Supabase connection pooler settings
- Ensure IP is whitelisted in Supabase

### Port already in use
- Change `PORT` in `.env`
- Update Nginx configuration
- Restart services

### Migration errors
- Check database connection
- Verify schema.prisma is up to date
- Run `npx prisma migrate reset` (⚠️ deletes data)

## 📝 License

Private - All rights reserved
