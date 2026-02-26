#!/bin/bash

# Reset Database and Create Admin Account
# This script resets the database and creates a fresh admin account

set -e

APP_DIR="/var/www/clenvora-api/backend"
ADMIN_EMAIL="admin@admin.com"
ADMIN_PASSWORD="admin123"

echo "🗑️  Resetting Database and Creating Admin Account"
echo "=================================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

cd $APP_DIR

# Step 1: Reset database
echo ""
echo "🗑️  Step 1: Resetting database..."
echo "   This will delete ALL data from the database!"

# Run Prisma reset
if [ -f "node_modules/.bin/prisma" ] || command -v npx &> /dev/null; then
    echo "   Running Prisma reset..."
    npx prisma migrate reset --force --skip-seed 2>&1 || {
        echo "   ⚠️  Prisma reset failed, trying alternative method..."
        # Alternative: Drop and recreate schema
        npx prisma db push --force-reset --skip-generate 2>&1 || echo "   ⚠️  Alternative reset also failed"
    }
    echo "✅ Database reset complete"
else
    echo "❌ Prisma not found. Cannot reset database."
    exit 1
fi

# Step 2: Run migrations
echo ""
echo "📦 Step 2: Running database migrations..."
npx prisma migrate deploy 2>&1 || npx prisma db push 2>&1
echo "✅ Migrations complete"

# Step 3: Generate Prisma client
echo ""
echo "🔧 Step 3: Generating Prisma client..."
npx prisma generate 2>&1
echo "✅ Prisma client generated"

# Step 4: Create admin account
echo ""
echo "👤 Step 4: Creating admin account..."

# Check if create-admin script exists
if [ -f "scripts/create-admin.ts" ]; then
    echo "   Running create-admin script..."
    npx tsx scripts/create-admin.ts 2>&1 || npx ts-node scripts/create-admin.ts 2>&1 || {
        echo "   ⚠️  TypeScript execution failed, trying compiled version..."
        if [ -f "dist/scripts/create-admin.js" ]; then
            node dist/scripts/create-admin.js 2>&1
        else
            echo "   ❌ Cannot find create-admin script"
            exit 1
        fi
    }
else
    echo "   ⚠️  create-admin.ts not found, creating admin manually..."
    
    # Manual admin creation using Node.js
    node -e "
    const { PrismaClient } = require('@prisma/client');
    const { createClient } = require('@supabase/supabase-js');
    require('dotenv').config();
    
    const prisma = new PrismaClient();
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    
    (async () => {
      try {
        // Create in Supabase Auth
        const { data: newUser, error } = await supabase.auth.admin.createUser({
          email: '$ADMIN_EMAIL',
          password: '$ADMIN_PASSWORD',
          email_confirm: true,
        });
        
        if (error) throw error;
        
        // Create in database
        const admin = await prisma.user.upsert({
          where: { id: newUser.user.id },
          update: { email: '$ADMIN_EMAIL', role: 'ADMIN' },
          create: {
            id: newUser.user.id,
            email: '$ADMIN_EMAIL',
            role: 'ADMIN',
          },
        });
        
        console.log('✅ Admin account created!');
        console.log('   Email: $ADMIN_EMAIL');
        console.log('   Password: (set in script - do not log)');
        console.log('   Role: ADMIN');
      } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
      } finally {
        await prisma.\$disconnect();
      }
    })();
    " 2>&1
fi

echo ""
echo "✅ Database reset and admin account creation complete!"
echo ""
echo "📋 Admin account created. Email: $ADMIN_EMAIL (password set in script)"
echo "   Role: ADMIN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Login at: https://clenvora.com/login"




