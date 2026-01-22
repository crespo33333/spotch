
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const args = process.argv.slice(2);
const targetIdOrEmail = args[0];

if (!targetIdOrEmail) {
    console.error('Usage: npx tsx src/scripts/promoteAdmin.ts <user_id_or_email>');
    process.exit(1);
}

async function promote() {
    console.log(`Promoting ${targetIdOrEmail} to Admin...`);

    let whereClause;
    if (!isNaN(Number(targetIdOrEmail))) {
        whereClause = eq(users.id, Number(targetIdOrEmail));
    } else {
        whereClause = eq(users.email, targetIdOrEmail);
    }

    const [user] = await db.update(users)
        .set({ role: 'admin' })
        .where(whereClause)
        .returning();

    if (user) {
        console.log(`✅ User ${user.name} (ID: ${user.id}) is now an Admin!`);
    } else {
        console.error('❌ User not found.');
    }
    process.exit(0);
}

promote().catch(console.error);
