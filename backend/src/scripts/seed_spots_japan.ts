import { db, initDB } from '../db';
import { spots } from '../db/schema';
import * as dotenv from 'dotenv';
dotenv.config();

const PREFECTURES = [
    { name: 'Hokkaido', lat: 43.0642, lng: 141.3468 },
    { name: 'Aomori', lat: 40.8246, lng: 140.7398 },
    { name: 'Iwate', lat: 39.7020, lng: 141.1543 },
    { name: 'Miyagi', lat: 38.2682, lng: 140.8694 },
    { name: 'Akita', lat: 39.7186, lng: 140.1024 },
    { name: 'Yamagata', lat: 38.2554, lng: 140.3396 },
    { name: 'Fukushima', lat: 37.7608, lng: 140.4748 },
    { name: 'Ibaraki', lat: 36.3659, lng: 140.4715 },
    { name: 'Tochigi', lat: 36.5551, lng: 139.8828 },
    { name: 'Gunma', lat: 36.3895, lng: 139.0634 },
    { name: 'Saitama', lat: 35.8617, lng: 139.6455 },
    { name: 'Chiba', lat: 35.6074, lng: 140.1065 },
    { name: 'Tokyo', lat: 35.6895, lng: 139.6917 },
    { name: 'Kanagawa', lat: 35.4478, lng: 139.6425 },
    { name: 'Niigata', lat: 37.9026, lng: 139.0236 },
    { name: 'Toyama', lat: 36.6953, lng: 137.2113 },
    { name: 'Ishikawa', lat: 36.5613, lng: 136.6562 },
    { name: 'Fukui', lat: 36.0641, lng: 136.2196 },
    { name: 'Yamanashi', lat: 35.6638, lng: 138.5683 },
    { name: 'Nagano', lat: 36.6486, lng: 138.1947 },
    { name: 'Gifu', lat: 35.4233, lng: 136.7607 },
    { name: 'Shizuoka', lat: 34.9756, lng: 138.3828 },
    { name: 'Aichi', lat: 35.1815, lng: 136.9066 },
    { name: 'Mie', lat: 34.7303, lng: 136.5086 },
    { name: 'Shiga', lat: 35.0045, lng: 135.8686 },
    { name: 'Kyoto', lat: 35.0116, lng: 135.7681 },
    { name: 'Osaka', lat: 34.6937, lng: 135.5023 },
    { name: 'Hyogo', lat: 34.6913, lng: 135.1830 },
    { name: 'Nara', lat: 34.6851, lng: 135.8048 },
    { name: 'Wakayama', lat: 34.2260, lng: 135.1675 },
    { name: 'Tottori', lat: 35.5011, lng: 134.2351 },
    { name: 'Shimane', lat: 35.4723, lng: 133.0505 },
    { name: 'Okayama', lat: 34.6618, lng: 133.9344 },
    { name: 'Hiroshima', lat: 34.3853, lng: 132.4553 },
    { name: 'Yamaguchi', lat: 34.1859, lng: 131.4714 },
    { name: 'Tokushima', lat: 34.0658, lng: 134.5594 },
    { name: 'Kagawa', lat: 34.3428, lng: 134.0466 },
    { name: 'Ehime', lat: 33.8417, lng: 132.7657 },
    { name: 'Kochi', lat: 33.5597, lng: 133.5311 },
    { name: 'Fukuoka', lat: 33.6064, lng: 130.4183 },
    { name: 'Saga', lat: 33.2494, lng: 130.2988 },
    { name: 'Nagasaki', lat: 32.7448, lng: 129.8737 },
    { name: 'Kumamoto', lat: 32.7898, lng: 130.7417 },
    { name: 'Oita', lat: 33.2382, lng: 131.6126 },
    { name: 'Miyazaki', lat: 31.9111, lng: 131.4239 },
    { name: 'Kagoshima', lat: 31.5602, lng: 130.5581 },
    { name: 'Okinawa', lat: 26.2124, lng: 127.6809 },
];

const COLORS = ['#00C2FF', '#FF4785', '#FFD700', '#4CAF50', '#FF9F40', '#9C27B0', '#F44336', '#607D8B'];
const TARGET_AUDIENCES = ['all', 'local', 'tourist', 'student', 'business', 'family'];
const TARGET_AGES = ['all', 'teen', '20s', '30s', '40s', '50s', '60+'];
const TARGET_GENDERS = ['all', 'male', 'female', 'couple'];
const CATEGORIES = ['Food', 'Chill', 'Adventure', 'Study', 'Art', 'Nature'];

const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Approx ~0.05 deg is about 5km. Let's scatter them within ~2-3km of center.
const jitter = () => (Math.random() - 0.5) * 0.04;

async function seed() {
    console.log('🌱 Seeding spots for Japan...');

    try {
        await initDB();

        const spotsToInsert: any[] = [];

        for (const pref of PREFECTURES) {
            const count = pref.name === 'Tokyo' ? 30 : 5;
            console.log(`Generating ${count} spots for ${pref.name}...`);

            for (let i = 0; i < count; i++) {
                const flavorNames = ['Park', 'Sakura', 'Cherry Blossom', 'Plaza', 'View', 'Corner', 'Base', 'Spot', 'Garden', 'Tower'];
                const name = `${pref.name} ${getRandom(flavorNames)} #${i + 1}`;

                spotsToInsert.push({
                    name: name,
                    latitude: (pref.lat + jitter()).toString(),
                    longitude: (pref.lng + jitter()).toString(),
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

        const userRes = await db.query.users.findFirst();
        const userId = userRes ? userRes.id : null;

        if (!userId) {
            console.log('⚠️ No users found. Skipping seed. Please create a user first.');
            return;
        }

        const spotsWithUser = spotsToInsert.map(s => ({ ...s, spotterId: userId, ownerId: userId }));

        const chunkSize = 50;
        for (let i = 0; i < spotsWithUser.length; i += chunkSize) {
            const chunk = spotsWithUser.slice(i, i + chunkSize);
            await db.insert(spots).values(chunk);
            console.log(`Inserted chunk ${i / chunkSize + 1}`);
        }

        console.log('✅ Seeding complete!');

    } catch (e) {
        console.error('❌ Seeding failed:', e);
    }
}

seed().catch(console.error).finally(() => process.exit());
