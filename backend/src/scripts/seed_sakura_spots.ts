import { db } from '../db';
import { spots } from '../db/schema';
import * as dotenv from 'dotenv';
dotenv.config();

// Major Sakura locations in Japan
const SAKURA_LOCATIONS = [
    { name: 'Ueno Park Sakura', lat: 35.7141, lng: 139.7741, baseCount: 10 },
    { name: 'Shinjuku Gyoen Sakura', lat: 35.6852, lng: 139.7100, baseCount: 10 },
    { name: 'Meguro River Sakura', lat: 35.6466, lng: 139.6989, baseCount: 10 },
    { name: 'Chidorigafuchi Sakura', lat: 35.6917, lng: 139.7478, baseCount: 10 },
    { name: 'Yoyogi Park Sakura', lat: 35.6717, lng: 139.6949, baseCount: 10 },
    { name: 'Osaka Castle Park Sakura', lat: 34.6873, lng: 135.5262, baseCount: 15 },
    { name: 'Kyoto Maruyama Park Sakura', lat: 35.0035, lng: 135.7801, baseCount: 10 },
    { name: 'Arashiyama Sakura', lat: 35.0165, lng: 135.6711, baseCount: 10 },
    { name: 'Philosophers Path Sakura', lat: 35.0263, lng: 135.7954, baseCount: 15 },
];

const SAKURA_COLOR = 'rgba(255, 183, 197, 0.7)'; // Sakura pink
const TARGET_AUDIENCES = ['all', 'local', 'tourist', 'family', 'couple'];
const CATEGORIES = ['Nature', 'Chill', 'Culture'];

const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Approx ~0.02 deg is about 2km. We want them somewhat clustered around the famous spots.
const jitter = () => (Math.random() - 0.5) * 0.02;

async function seedSakura() {
    console.log('🌸 Seeding exactly 100 Sakura spots...');
    try {
        const userRes = await db.query.users.findFirst();
        const userId = userRes ? userRes.id : null;

        if (!userId) {
            console.log('⚠️ No users found. Skipping seed.');
            return;
        }

        const spotsToInsert: any[] = [];

        let count = 0;
        for (const loc of SAKURA_LOCATIONS) {
            console.log(`Generating ${loc.baseCount} sakura spots around ${loc.name}...`);
            for (let i = 0; i < loc.baseCount; i++) {
                count++;
                const spotName = `${loc.name} Tree #${i + 1}`;

                spotsToInsert.push({
                    spotterId: userId,
                    ownerId: userId,
                    name: spotName,
                    latitude: (loc.lat + jitter()).toString(),
                    longitude: (loc.lng + jitter()).toString(),
                    totalPoints: randomInt(300, 1500),
                    remainingPoints: randomInt(50, 800),
                    ratePerMinute: randomInt(2, 12),
                    active: true,
                    category: getRandom(CATEGORIES),
                    color: SAKURA_COLOR,
                    radius: 120, // slightly larger radius for sakura spots
                    targetAudience: getRandom(TARGET_AUDIENCES),
                    targetAge: 'all',
                    targetGender: 'all',
                    createdAt: new Date(),
                });
            }
        }

        await db.insert(spots).values(spotsToInsert);
        console.log(`🌸 ✅ Seeding complete! ${count} Sakura spots added to the database.`);

    } catch (e) {
        console.error('❌ Sakura seeding failed:', e);
    }
}

seedSakura().catch(console.error).finally(() => process.exit());
