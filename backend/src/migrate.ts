
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    console.log('🚀 Running manual migration...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Change column type
        console.log('Changing visits.earned_points type to NUMERIC(12, 4)...');
        await client.query('ALTER TABLE visits ALTER COLUMN earned_points TYPE NUMERIC(12, 4) USING earned_points::NUMERIC(12, 4)');
        await client.query('ALTER TABLE visits ALTER COLUMN earned_points SET DEFAULT 0');

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
