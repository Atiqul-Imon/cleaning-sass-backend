import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Test users to create
  const testUsers = [
    { email: 'owner@clenvora.test', password: 'Owner123!', role: 'OWNER' as const },
    { email: 'cleaner@clenvora.test', password: 'Cleaner123!', role: 'CLEANER' as const },
    { email: 'admin@clenvora.test', password: 'Admin123!', role: 'OWNER' as const },
  ];

  console.log('\n📝 Creating users in Supabase Auth...');

  for (const testUser of testUsers) {
    try {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users.find(u => u.email === testUser.email);

      if (existing) {
        console.log(`   ✓ User ${testUser.email} already exists (ID: ${existing.id})`);
        
        // Sync with our database
        await prisma.user.upsert({
          where: { id: existing.id },
          update: { email: testUser.email, role: testUser.role },
          create: {
            id: existing.id,
            email: testUser.email,
            role: testUser.role,
          },
        });
      } else {
        // Create new user
        const { data: newUser, error } = await supabase.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          email_confirm: true,
        });

        if (error) {
          console.error(`   ✗ Failed to create ${testUser.email}:`, error.message);
          continue;
        }

        console.log(`   ✓ Created ${testUser.email} (ID: ${newUser.user.id})`);

        // Sync with our database
        await prisma.user.upsert({
          where: { id: newUser.user.id },
          update: { email: testUser.email, role: testUser.role },
          create: {
            id: newUser.user.id,
            email: testUser.email,
            role: testUser.role,
          },
        });
      }
    } catch (error: any) {
      console.error(`   ✗ Error with ${testUser.email}:`, error.message);
    }
  }

  // Create business for owner
  const owner = await prisma.user.findFirst({
    where: { email: 'owner@clenvora.test', role: 'OWNER' },
  });

  if (owner) {
    try {
      const business = await prisma.business.upsert({
        where: { userId: owner.id },
        update: {
          name: 'Test Cleaning Business',
          phone: '+44 20 1234 5678',
          address: '123 Test Street, London, UK',
          vatEnabled: true,
          vatNumber: 'GB123456789',
        },
        create: {
          userId: owner.id,
          name: 'Test Cleaning Business',
          phone: '+44 20 1234 5678',
          address: '123 Test Street, London, UK',
          vatEnabled: true,
          vatNumber: 'GB123456789',
        },
      });

      console.log('\n✅ Seed completed!');
      console.log('\n📋 Test Users:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👤 Owner:');
      console.log(`   Email: owner@clenvora.test`);
      console.log(`   Password: Owner123!`);
      console.log(`   User ID: ${owner.id}`);
      console.log('\n🧹 Cleaner:');
      const cleaner = await prisma.user.findFirst({
        where: { email: 'cleaner@clenvora.test' },
      });
      if (cleaner) {
        console.log(`   Email: cleaner@clenvora.test`);
        console.log(`   Password: Cleaner123!`);
        console.log(`   User ID: ${cleaner.id}`);
      }
      console.log('\n👨‍💼 Admin:');
      const admin = await prisma.user.findFirst({
        where: { email: 'admin@clenvora.test' },
      });
      if (admin) {
        console.log(`   Email: admin@clenvora.test`);
        console.log(`   Password: Admin123!`);
        console.log(`   User ID: ${admin.id}`);
      }
      console.log('\n🏢 Business:');
      console.log(`   Name: ${business.name}`);
      console.log(`   Business ID: ${business.id}`);
      console.log(`   Owner ID: ${owner.id}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n✅ You can now login with these credentials!');
    } catch (error: any) {
      console.error('\n❌ Error creating business:', error.message);
    }
  } else {
    console.log('\n⚠️  Owner user not found. Please check Supabase Auth.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

