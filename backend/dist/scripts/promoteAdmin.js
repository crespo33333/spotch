"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
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
        whereClause = (0, drizzle_orm_1.eq)(schema_1.users.id, Number(targetIdOrEmail));
    }
    else {
        whereClause = (0, drizzle_orm_1.eq)(schema_1.users.email, targetIdOrEmail);
    }
    const [user] = await db_1.db.update(schema_1.users)
        .set({ role: 'admin' })
        .where(whereClause)
        .returning();
    if (user) {
        console.log(`✅ User ${user.name} (ID: ${user.id}) is now an Admin!`);
    }
    else {
        console.error('❌ User not found.');
    }
    process.exit(0);
}
promote().catch(console.error);
