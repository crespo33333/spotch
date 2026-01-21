
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './db/schema';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function main() {
    console.log('Topping up wallet for User ID 2...');

    const userId = 2;

    // Check if wallet exists
    let wallet = await db.query.wallets.findFirst({
        where: eq(schema.wallets.userId, userId)
    });

    if (!wallet) {
        console.log('Creating new wallet...');
        const [newWallet] = await db.insert(schema.wallets).values({
            userId: userId,
            currentBalance: 1000000, // 1 Million Points
            lastTransactionAt: new Date()
        }).returning();
        wallet = newWallet;
    } else {
        console.log('Updating existing wallet...');
        const [updatedWallet] = await db.update(schema.wallets)
            .set({ currentBalance: 1000000 })
            .where(eq(schema.wallets.id, wallet.id))
            .returning();
        wallet = updatedWallet;
    }

    console.log(`✅ Wallet Balance Updated: ${wallet.currentBalance} points`);
    process.exit(0);
}

main().catch((err) => {
    console.error('Topup failed:', err);
    process.exit(1);
});
