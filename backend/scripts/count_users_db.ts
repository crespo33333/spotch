
import { db, initDB } from '../src/db';
import { users, visits } from '../src/db/schema';
import { sql, and } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';

// Force load env from backend root if needed
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
    try {
        console.log('🔄 Connecting to DB...');
        await initDB();

        console.log('📊 Fetching User Stats...');

        // Total Users
        const userCountRes = await db.select({ count: sql<number>`count(*)` }).from(users);
        const totalUsers = userCountRes[0].count; // In raw query count(*) returns string in PG often, verify handling

        // Active Visits (Last 5 mins)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const activeVisitsRes = await db.select({ count: sql<number>`count(*)` })
            .from(visits)
            .where(and(
                sql`${visits.checkOutTime} IS NULL`,
                sql`${visits.lastHeartbeatAt} > ${fiveMinutesAgo}`
            ));

        const currentActive = activeVisitsRes[0].count;

        console.log('\n================================');
        console.log(`👥 Total Registered Users: ${totalUsers}`);
        console.log(`🟢 Currently Active (Checked-in): ${currentActive}`);
        console.log('================================\n');

        process.exit(0);
    } catch (e) {
        console.error('❌ Error fetching stats:', e);
        process.exit(1);
    }
}

main();
