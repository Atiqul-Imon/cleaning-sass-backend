const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'admin123';

async function main() {
  console.log('👤 Creating admin account...\n');

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/['"]/g, '');
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/['"]/g, '');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Check if admin already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users.find((u) => u.email === ADMIN_EMAIL);

    let userId;

    if (existing) {
      console.log(`⚠️  Admin account already exists in Supabase (ID: ${existing.id})`);
      userId = existing.id;
    } else {
      // Create user in Supabase Auth
      console.log('Creating admin in Supabase Auth...');
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
      });

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      console.log(`✅ Created in Supabase Auth (ID: ${newUser.user.id})`);
      userId = newUser.user.id;
    }

    // Create/update in database
    console.log('Syncing with database...');
    const admin = await prisma.user.upsert({
      where: { id: userId },
      update: { email: ADMIN_EMAIL, role: 'ADMIN' },
      create: {
        id: userId,
        email: ADMIN_EMAIL,
        role: 'ADMIN',
      },
    });

    console.log('\n✅ Admin account created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role: ADMIN`);
    console.log(`   User ID: ${admin.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🌐 Login at: https://clenvora.com/login');
  } catch (error) {
    console.error('\n❌ Error creating admin account:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();




