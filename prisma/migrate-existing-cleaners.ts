import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Migrating existing cleaners to BusinessCleaner table...\n');

  // Get all cleaners (users with CLEANER role)
  const cleaners = await prisma.user.findMany({
    where: { role: 'CLEANER' },
  });

  console.log(`Found ${cleaners.length} cleaner(s) to migrate\n`);

  let migrated = 0;
  let skipped = 0;

  for (const cleaner of cleaners) {
    // Find all unique businesses this cleaner has jobs for
    const jobs = await prisma.job.findMany({
      where: {
        cleanerId: cleaner.id,
      },
      select: {
        businessId: true,
      },
      distinct: ['businessId'],
    });

    if (jobs.length === 0) {
      console.log(`⚠️  Skipping ${cleaner.email} - no jobs assigned`);
      skipped++;
      continue;
    }

    // Create BusinessCleaner record for each business
    for (const job of jobs) {
      // Check if already exists
      const existing = await prisma.businessCleaner.findUnique({
        where: {
          businessId_cleanerId: {
            businessId: job.businessId,
            cleanerId: cleaner.id,
          },
        },
      });

      if (existing) {
        console.log(`✓ Already exists: ${cleaner.email} -> Business ${job.businessId}`);
        continue;
      }

      // Get business owner for invitedBy
      const business = await prisma.business.findUnique({
        where: { id: job.businessId },
        select: { userId: true },
      });

      await prisma.businessCleaner.create({
        data: {
          businessId: job.businessId,
          cleanerId: cleaner.id,
          status: 'ACTIVE',
          invitedBy: business?.userId || 'SYSTEM',
          activatedAt: new Date(),
        },
      });

      console.log(`✓ Migrated: ${cleaner.email} -> Business ${job.businessId}`);
      migrated++;
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   Migrated: ${migrated} record(s)`);
  console.log(`   Skipped: ${skipped} cleaner(s)`);
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });










