import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_MIGRATOR || process.env.DATABASE_URL,
});

async function runSql() {
  const files = [
    '../../backend/database/init/15_quotes.sql',
    '../../backend/database/init/16_service_orders_guest.sql'
  ];

  for (const file of files) {
    const filePath = path.join(__dirname, file);
    console.log(`Running ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    try {
      await pool.query(sql);
      console.log(`✅ ${file} applied successfully.`);
    } catch (err: any) {
      console.error(`❌ Error running ${file}:`, err.message);
    }
  }
  
  await pool.end();
}

runSql();
