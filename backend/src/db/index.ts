import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Render PostgreSQL requires SSL even for local dev
    connectionTimeoutMillis: 10000, // 10s timeout
});

export const initDB = async () => {
    try {
        await client.connect();
        console.log("✅ Connected to PostgreSQL");
        return true;
    } catch (error) {
        console.error("❌ Postgres Connection Error:", error);
        throw error;
    }
}

export const db = drizzle(client, { schema });
