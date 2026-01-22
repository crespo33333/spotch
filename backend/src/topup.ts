
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './db/schema';
import * as dotenv from 'dotenv';
import { eq, sql } from 'drizzle-orm';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function main() {
    console.log('💰 Topping up test user wallet...');

    // User ID 2 is our hardcoded test user
    const userId = 2;

    const [wallet] = await db.insert(schema.wallets)
        .values({
            userId: userId,
            currentBalance: 100000,
        })
        .onConflictDoUpdate({
            target: schema.wallets.userId,
            set: { currentBalance: 100000 },
        })
        .returning();

    console.log(`✅ Wallet topped up! User ${userId} balance: ${wallet.currentBalance}`);
    process.exit(0);
}

main().catch((err) => {
    console.error('Topup failed:', err);
    process.exit(1);
});
