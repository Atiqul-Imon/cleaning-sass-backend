import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

// Easy admin credentials
const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'admin123';

async function main() {
  console.log('🔍 Checking for existing admin account...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
    console.error('   Please check your .env file');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Check if admin already exists in database
  const existingAdmin = await prisma.user.findFirst({
    where: {
      email: ADMIN_EMAIL,
      role: 'ADMIN' as any,
    },
  });

  if (existingAdmin) {
    console.log('✅ Admin account already exists!');
    console.log('\n📋 Admin Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role: ADMIN`);
    console.log(`   User ID: ${existingAdmin.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Verify it exists in Supabase Auth
    const { data: supabaseUsers } = await supabase.auth.admin.listUsers();
    const supabaseUser = supabaseUsers?.users.find(u => u.email === ADMIN_EMAIL);
    
    if (supabaseUser) {
      console.log('✅ Account verified in Supabase Auth');
    } else {
      console.log('⚠️  Account exists in database but not in Supabase Auth');
      console.log('   Creating in Supabase Auth...');
      
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
      });

      if (error) {
        console.error(`   ❌ Failed to create in Supabase: ${error.message}`);
      } else {
        console.log(`   ✅ Created in Supabase Auth (ID: ${newUser.user.id})`);
        
        // Update database with Supabase ID if different
        if (newUser.user.id !== existingAdmin.id) {
          await prisma.user.update({
            where: { id: existingAdmin.id },
            data: { id: newUser.user.id },
          });
        }
      }
    }
    
    await prisma.$disconnect();
    return;
  }

  // Check if email exists in Supabase Auth
  const { data: supabaseUsers } = await supabase.auth.admin.listUsers();
  const existingSupabaseUser = supabaseUsers?.users.find(u => u.email === ADMIN_EMAIL);

  if (existingSupabaseUser) {
    console.log('⚠️  Email exists in Supabase Auth but not in database');
    console.log('   Syncing to database...');
    
    await prisma.user.upsert({
      where: { id: existingSupabaseUser.id },
      update: { email: ADMIN_EMAIL, role: 'ADMIN' as any },
      create: {
        id: existingSupabaseUser.id,
        email: ADMIN_EMAIL,
        role: 'ADMIN' as any,
      },
    });
    
    console.log('✅ Admin account synced!');
    console.log('\n📋 Admin Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role: ADMIN`);
    console.log(`   User ID: ${existingSupabaseUser.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await prisma.$disconnect();
    return;
  }

  // Create new admin account
  console.log('📝 Creating new admin account...\n');

  try {
    // Create user in Supabase Auth
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });

    if (error) {
      console.error(`❌ Failed to create admin in Supabase: ${error.message}`);
      process.exit(1);
    }

    console.log(`✅ Created admin in Supabase Auth (ID: ${newUser.user.id})`);

    // Sync with database
    const admin = await prisma.user.upsert({
      where: { id: newUser.user.id },
      update: { email: ADMIN_EMAIL, role: 'ADMIN' as any },
      create: {
        id: newUser.user.id,
        email: ADMIN_EMAIL,
        role: 'ADMIN' as any,
      },
    });

    console.log('✅ Admin account created successfully!\n');
    console.log('📋 Admin Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role: ADMIN`);
    console.log(`   User ID: ${admin.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ You can now login with these credentials!');
    console.log(`   Login URL: http://localhost:3001/login\n`);
  } catch (error: any) {
    console.error('❌ Error creating admin account:', error.message);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

