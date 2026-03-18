import { db, initDB } from '../db';
import { spots } from '../db/schema';
import * as dotenv from 'dotenv';
dotenv.config();

const CITIES = [
    { name: 'Tokyo', lat: 35.6895, lng: 139.6917, count: 50 },
    { name: 'Osaka', lat: 34.6937, lng: 135.5023, count: 30 },
    { name: 'Kyoto', lat: 35.0116, lng: 135.7681, count: 20 },
    { name: 'Fukuoka', lat: 33.6064, lng: 130.4183, count: 20 },
    { name: 'Nagoya', lat: 35.1815, lng: 136.9066, count: 20 },
    { name: 'Sapporo', lat: 43.0642, lng: 141.3468, count: 20 },
];

const COLORS = ['#00C2FF', '#FF4785', '#FFD700', '#4CAF50', '#FF9F40', '#9C27B0', '#F44336', '#607D8B'];
const TARGET_AUDIENCES = ['all', 'local', 'tourist', 'student', 'business', 'family'];
const TARGET_AGES = ['all', 'teen', '20s', '30s', '40s', '50s', '60+'];
const TARGET_GENDERS = ['all', 'male', 'female', 'couple'];
const CATEGORIES = ['Food', 'Chill', 'Adventure', 'Study', 'Art', 'Nature'];

const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Approx ~0.05 deg is about 5km.
const jitter = () => (Math.random() - 0.5) * 0.05;

async function seed() {
    console.log('🌱 Seeding regular dummy spots...');
    try {
        await initDB();
        const userRes = await db.query.users.findFirst();
        const userId = userRes ? userRes.id : null;

        if (!userId) {
            console.log('⚠️ No users found. Skipping seed. Please create a user first.');
            return;
        }

        const spotsToInsert: any[] = [];

        for (const city of CITIES) {
            console.log(`Generating ${city.count} standard spots for ${city.name}...`);
            for (let i = 0; i < city.count; i++) {
                const flavorNames = ['Park', 'Cafe', 'Station', 'Plaza', 'View', 'Corner', 'Base', 'Spot', 'Garden', 'Tower', 'Shrine', 'Mall', 'Museum', 'Library', 'Gym'];
                const name = `${city.name} ${getRandom(flavorNames)} ${i + 1}`;

                spotsToInsert.push({
                    spotterId: userId,
                    ownerId: userId,
                    name: name,
                    latitude: (city.lat + jitter()).toString(),
                    longitude: (city.lng + jitter()).toString(),
                    totalPoints: randomInt(100, 1000),
                    remainingPoints: randomInt(10, 500),
                    ratePerMinute: randomInt(1, 10),
                    active: true,
                    category: getRandom(CATEGORIES),
                    color: getRandom(COLORS),
                    radius: 100,
                    targetAudience: getRandom(TARGET_AUDIENCES),
                    targetAge: getRandom(TARGET_AGES),
                    targetGender: getRandom(TARGET_GENDERS),
                    createdAt: new Date(),
                });
            }
        }

        const chunkSize = 50;
        for (let i = 0; i < spotsToInsert.length; i += chunkSize) {
            const chunk = spotsToInsert.slice(i, i + chunkSize);
            await db.insert(spots).values(chunk);
            console.log(`Inserted chunk ${(i / chunkSize) + 1}`);
        }
        console.log(`✅ Seeding complete! ${spotsToInsert.length} regular spots added.`);

    } catch (e) {
        console.error('❌ Seeding failed:', e);
    }
}

seed().catch(console.error).finally(() => process.exit());
