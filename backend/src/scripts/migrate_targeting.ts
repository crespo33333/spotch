
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    console.log('🚀 Running targeting columns migration...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Adding target_gender column...');
        await client.query("ALTER TABLE spots ADD COLUMN IF NOT EXISTS target_gender VARCHAR(20) DEFAULT 'all'");

        console.log('Adding target_age column...');
        await client.query("ALTER TABLE spots ADD COLUMN IF NOT EXISTS target_age VARCHAR(20) DEFAULT 'all'");

        console.log('Adding target_audience column...');
        await client.query("ALTER TABLE spots ADD COLUMN IF NOT EXISTS target_audience VARCHAR(20) DEFAULT 'all'");

        await client.query('COMMIT');
        console.log('✅ Migration successful!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(console.error);
