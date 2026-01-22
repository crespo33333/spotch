
import { db } from '../db';
import { spots, users } from '../db/schema';
import { eq } from 'drizzle-orm';

const GLOBAL_SPOTS = [
    // Tokyo
    { name: 'Shibuya Crossing', lat: 35.6591, lng: 139.7037, category: 'Landmark', points: 100, color: 'rgba(255, 71, 133, 0.4)' },
    { name: 'Tokyo Tower', lat: 35.6586, lng: 139.7454, category: 'Landmark', points: 80, color: 'rgba(255, 214, 0, 0.4)' },
    { name: 'Senso-ji', lat: 35.7148, lng: 139.7967, category: 'Culture', points: 60, color: 'rgba(0, 194, 255, 0.4)' },

    // New York
    { name: 'Times Square', lat: 40.7580, lng: -73.9855, category: 'Landmark', points: 120, color: 'rgba(255, 71, 133, 0.4)' },
    { name: 'Central Park', lat: 40.7829, lng: -73.9654, category: 'Nature', points: 50, color: 'rgba(0, 255, 100, 0.4)' },

    // London
    { name: 'Big Ben', lat: 51.5007, lng: -0.1246, category: 'Landmark', points: 90, color: 'rgba(255, 214, 0, 0.4)' },

    // Paris
    { name: 'Eiffel Tower', lat: 48.8584, lng: 2.2945, category: 'Landmark', points: 150, color: 'rgba(255, 71, 133, 0.4)' },
];

async function seedGlobal() {
    console.log('🌱 Seeding Global Spots...');

    // Get a valid user ID for "spotterId" reference (admin or first user)
    const allUsers = await db.query.users.findMany({ limit: 1 });
    if (allUsers.length === 0) {
        console.error('❌ No users found. Run seed.ts first or create a user.');
        return;
    }
    const adminId = allUsers[0].id;

    for (const spot of GLOBAL_SPOTS) {
        await db.insert(spots).values({
            name: spot.name,
            latitude: spot.lat.toString(),
            longitude: spot.lng.toString(),
            category: spot.category,
            ratePerMinute: spot.points,
            color: spot.color,
            spotterId: adminId,
            description: 'Global Landmark',
            radius: 100, // 100m radius
            totalPoints: 10000,
            remainingPoints: 10000,
            active: true
        });
        console.log(`✅ Added ${spot.name}`);
    }

    console.log('✨ Global Seeding Complete!');
    process.exit(0);
}

seedGlobal().catch(console.error);
