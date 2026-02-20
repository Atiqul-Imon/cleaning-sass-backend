const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Adding invoice_template column to businesses table...');
  
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "businesses" 
      ADD COLUMN IF NOT EXISTS "invoice_template" TEXT NOT NULL DEFAULT 'classic';
    `);
    
    console.log('✅ Successfully added invoice_template column');
  } catch (error) {
    console.error('❌ Error adding column:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();



