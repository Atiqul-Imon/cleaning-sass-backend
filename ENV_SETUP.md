# Backend Environment Variables Setup

## Your Database Connection String

Based on your Supabase credentials, add this to your `backend/.env` file:

```env
DATABASE_URL="postgresql://postgres.iumurbkvgepbtszdqkwa:UbSFzM5UdQtOnCpf@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"
```

## Complete Backend .env File Template

Create or update `backend/.env` with the following (replace placeholders with your actual values):

```env
# Database
DATABASE_URL="postgresql://postgres.iumurbkvgepbtszdqkwa:UbSFzM5UdQtOnCpf@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"

# Supabase
SUPABASE_URL="https://iumurbkvgepbtszdqkwa.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# ImageKit
IMAGEKIT_PUBLIC_KEY="your-imagekit-public-key"
IMAGEKIT_PRIVATE_KEY="your-imagekit-private-key"
IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/your-imagekit-id"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email Service
EMAIL_API_KEY="your-email-api-key"

# Frontend URL
FRONTEND_URL="http://localhost:3001"

# Server Port
PORT=3000
```

## Next Steps

1. **Get Supabase URL and Keys:**
   - Go to your Supabase dashboard
   - Settings → API
   - Copy:
     - Project URL → `SUPABASE_URL`
     - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

2. **Test Database Connection:**
   ```bash
   cd backend
   npx prisma db pull
   ```

3. **Run Migrations:**
   ```bash
   npx prisma migrate dev --name init
   ```

## Important Notes

- The connection string uses **pooler mode** (good for serverless/server environments)
- Your password is: `UbSFzM5UdQtOnCpf` (keep this secure!)
- Never commit the `.env` file to git











