
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
    console.log('🧹 Cleaning up dummy data...');

    const dummyUserId = 1; // "World Traveler"

    // 1. Delete visits to these spots
    // We need to find the spot IDs first
    const dummySpots = await db.select({ id: schema.spots.id }).from(schema.spots).where(eq(schema.spots.spotterId, dummyUserId));
    const ids = dummySpots.map(s => s.id);

    if (ids.length > 0) {
        console.log(`Found ${ids.length} dummy spots. Deleting visits...`);
        // Visit table cleanup is usually small if only dummies exist
        // But let's be safe.
        // Actually, db.delete(schema.spots).where(eq(schema.spots.spotterId, dummyUserId)) is enough for the spots.
        // If there are visits, we should delete them too.

        // CHUNKED DELETE for visits if many
        const CHUNK_SIZE = 500;
        for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
            const chunk = ids.slice(i, i + CHUNK_SIZE);
            // Delete visits for this chunk of spots
            // Note: need to import 'inArray' or use raw sql
            const { inArray } = require('drizzle-orm');
            await db.delete(schema.visits).where(inArray(schema.visits.spotId, chunk));
        }

        console.log('Deleting spots...');
        await db.delete(schema.spots).where(eq(schema.spots.spotterId, dummyUserId));
    }

    console.log('✅ Cleanup complete!');
    process.exit(0);
}

main().catch(console.error);
