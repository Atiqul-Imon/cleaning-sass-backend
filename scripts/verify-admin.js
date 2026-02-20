const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (admin) {
      console.log('✅ Admin account verified:');
      console.log('   Email:', admin.email);
      console.log('   Role:', admin.role);
      console.log('   User ID:', admin.id);
    } else {
      console.log('❌ Admin account not found');
    }
    
    const userCount = await prisma.user.count();
    const businessCount = await prisma.business.count();
    const clientCount = await prisma.client.count();
    const jobCount = await prisma.job.count();
    
    console.log('\n📊 Database Status:');
    console.log('   Users:', userCount);
    console.log('   Businesses:', businessCount);
    console.log('   Clients:', clientCount);
    console.log('   Jobs:', jobCount);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();



