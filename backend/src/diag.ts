
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './db/schema';
import * as dotenv from 'dotenv';
import { count, eq } from 'drizzle-orm';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function main() {
    console.log('📊 Spot Diagnostics...');

    // Count total spots
    const total = await db.select({ value: count() }).from(schema.spots);
    console.log('Total Spots:', total[0].value);

    // Count by spotter
    const bySpotter = await db.select({
        spotterId: schema.spots.spotterId,
        count: count()
    }).from(schema.spots).groupBy(schema.spots.spotterId);

    for (const row of bySpotter) {
        const user = await db.query.users.findFirst({ where: eq(schema.users.id, row.spotterId) });
        console.log(`User: ${user?.name} (ID: ${row.spotterId}) -> ${row.count} spots`);
    }

    process.exit(0);
}

main().catch(console.error);
