const { Client } = require('pg');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL.replace(/['"]/g, '');
const client = new Client({ connectionString: dbUrl });

(async () => {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Check current enum values
    const checkResult = await client.query('SELECT unnest(enum_range(NULL::"UserRole")) as value;');
    console.log('Current UserRole values:', checkResult.rows.map(r => r.value).join(', '));
    
    // Add ADMIN if not exists
    try {
      await client.query('ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS \'ADMIN\';');
      console.log('✅ ADMIN role added to enum');
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate')) {
        console.log('✅ ADMIN role already exists in enum');
      } else {
        throw e;
      }
    }
    
    // Verify
    const verifyResult = await client.query('SELECT unnest(enum_range(NULL::"UserRole")) as value;');
    console.log('Updated UserRole values:', verifyResult.rows.map(r => r.value).join(', '));
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();



