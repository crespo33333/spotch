
import { db } from '../db';
import { users } from '../db/schema';
import { isNotNull } from 'drizzle-orm';

async function main() {
    const allUsers = await db.select({
        id: users.id,
        name: users.name,
        deviceId: users.deviceId,
        pushToken: users.pushToken
    }).from(users).where(isNotNull(users.pushToken));
    console.log(`Found ${allUsers.length} users with push tokens:`);
    allUsers.forEach(u => {
        console.log(`- [ID: ${u.id}] ${u.name} (Device: ${u.deviceId || 'Unknown'})`);
        console.log(`  Token: ${u.pushToken}`);
    });
    process.exit(0);
}

main().catch(console.error);
