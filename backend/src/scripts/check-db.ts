import { db } from "../db";
import { sql } from "drizzle-orm";
import * as dotenv from 'dotenv';

dotenv.config();

async function checkDb() {
    console.log("Checking database connection...");
    console.log("URL:", process.env.DATABASE_URL?.split('@')[1]); // Log host only for safety

    try {
        const result = await db.execute(sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);

        console.log("Tables found:", result.rows.map((row: any) => row.table_name));
    } catch (error) {
        console.error("Error connecting to DB:", error);
    }
    process.exit(0);
}

checkDb();
