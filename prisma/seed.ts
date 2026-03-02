import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'admin123';

async function main() {
  console.log('🧹 Cleaning up database...');

  // Delete in order to respect foreign keys (children first)
  await prisma.jobUsage.deleteMany();
  await prisma.jobChecklist.deleteMany();
  await prisma.jobPhoto.deleteMany();
  await prisma.jobReport.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.job.deleteMany();
  await prisma.businessCleaner.deleteMany();
  await prisma.upgradeRequest.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.client.deleteMany();
  await prisma.cleanerInvite.deleteMany();
  await prisma.business.deleteMany();
  await prisma.passwordResetOtp.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database cleared.');

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

  console.log('\n📝 Cleaning Supabase Auth (remove all users)...');
  let page = 1;
  const perPage = 100;
  let hasMore = true;
  while (hasMore) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage });
    const users = data?.users ?? [];
    for (const u of users) {
      await supabase.auth.admin.deleteUser(u.id);
    }
    hasMore = users.length === perPage;
    page++;
  }
  console.log('   ✓ Supabase Auth cleared.');

  console.log('\n📝 Creating admin user in Supabase Auth...');

  const { data: newUser, error } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });

  if (error) {
    console.error('   ✗ Failed to create admin:', error.message);
    process.exit(1);
  }

  const adminId = newUser.user.id;
  console.log(`   ✓ Created admin (ID: ${adminId})`);

  // Sync admin to our database
  await prisma.user.create({
    data: {
      id: adminId,
      email: ADMIN_EMAIL,
      role: 'ADMIN',
    },
  });

  console.log('\n✅ Reset complete!');
  console.log('\n📋 Admin credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✅ You can login at /login with these credentials.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
