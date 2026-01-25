"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = require("pg");
const schema = __importStar(require("./db/schema"));
const dotenv = __importStar(require("dotenv"));
const drizzle_orm_1 = require("drizzle-orm");
dotenv.config();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
const db = (0, node_postgres_1.drizzle)(pool, { schema });
// Helper to generate random coordinates near a center
function randomGeo(centerLat, centerLng, radiusKm) {
    const y0 = centerLat;
    const x0 = centerLng;
    const rd = radiusKm / 111.3; // Approx degrees
    const u = Math.random();
    const v = Math.random();
    const w = rd * Math.sqrt(u);
    const t = 2 * Math.PI * v;
    const x = w * Math.cos(t);
    const y = w * Math.sin(t);
    const newLat = y + y0;
    const newLng = x + x0;
    return { latitude: newLat.toFixed(6), longitude: newLng.toFixed(6) };
}
const CITIES = [
    { name: 'Tokyo', lat: 35.6895, lng: 139.6917 },
    { name: 'New York', lat: 40.7128, lng: -74.0060 },
    { name: 'London', lat: 51.5074, lng: -0.1278 },
    { name: 'Paris', lat: 48.8566, lng: 2.3522 },
    { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
    { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
    { name: 'Singapore', lat: 1.3521, lng: 103.8198 },
    { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
    { name: 'Seoul', lat: 37.5665, lng: 126.9780 },
    { name: 'Shanghai', lat: 31.2304, lng: 121.4737 },
    { name: 'Toronto', lat: 43.6510, lng: -79.3470 },
    { name: 'Berlin', lat: 52.5200, lng: 13.4050 },
];
async function main() {
    console.log('🌱 Seeding database with WORLDWIDE spots...');
    // 1. Ensure Dummy User exists
    let user = await db.query.users.findFirst({
        where: (0, drizzle_orm_1.eq)(schema.users.openId, 'dummy_world_seeder')
    });
    if (!user) {
        const [newUser] = await db.insert(schema.users).values({
            openId: 'dummy_world_seeder',
            name: 'World Traveler',
            email: 'traveler@spotch.app',
            avatar: 'robot_seed_999',
        }).returning();
        user = newUser;
    }
    // 2. Generate Spots
    const spotsToInsert = [];
    const TOTAL_SPOTS_PER_CITY = 20;
    // Reset Spots Table
    console.log('Cleaning existing spots (and visits)...');
    await db.delete(schema.visits);
    await db.delete(schema.spots);
    for (const city of CITIES) {
        console.log(`Generating ${TOTAL_SPOTS_PER_CITY} spots for ${city.name}...`);
        for (let i = 0; i < TOTAL_SPOTS_PER_CITY; i++) {
            const coords = randomGeo(city.lat, city.lng, 15); // 15km radius
            const categories = ['Food', 'Chill', 'Adventure', 'Study', 'Art', 'Nature'];
            spotsToInsert.push({
                spotterId: user.id,
                name: `${city.name} Spot #${i + 1}`,
                latitude: coords.latitude,
                longitude: coords.longitude,
                totalPoints: Math.floor(Math.random() * 5000) + 100,
                remainingPoints: Math.floor(Math.random() * 5000) + 100,
                ratePerMinute: Math.floor(Math.random() * 50) + 1,
                active: true,
                category: categories[Math.floor(Math.random() * categories.length)],
                radius: Math.floor(Math.random() * 200) + 50,
            });
        }
    }
    // Batch Insert (Chunking to avoid SQL limits)
    const CHUNK_SIZE = 500;
    for (let i = 0; i < spotsToInsert.length; i += CHUNK_SIZE) {
        const chunk = spotsToInsert.slice(i, i + CHUNK_SIZE);
        await db.insert(schema.spots).values(chunk);
        console.log(`Inserted chunk ${i / CHUNK_SIZE + 1}...`);
    }
    // 3. Create Dummy Broadcasts
    console.log('📢 Creating dummy broadcasts...');
    await db.delete(schema.broadcasts); // Clean slate
    await db.insert(schema.broadcasts).values([
        {
            title: 'Version 2.0 Released! 🚀',
            body: 'We have updated the app with better performance and a new map engine. Enjoy!',
            link: 'https://spotch.app/blog/v2',
            createdAt: new Date()
        },
        {
            title: 'Maintenance Notice',
            body: 'Scheduled maintenance on Sunday 2:00 AM - 4:00 AM UTC.',
            createdAt: new Date(Date.now() - 86400000 * 2) // 2 days ago
        },
        {
            title: 'Welcome to Spotch!',
            body: 'Find hidden spots around you and earn points. Start your journey today.',
            createdAt: new Date(Date.now() - 86400000 * 5)
        }
    ]);
    // 4. Create Default Quests
    console.log('📜 Creating default quests...');
    await db.delete(schema.userQuests); // Clear dependencies first
    await db.delete(schema.quests);
    await db.insert(schema.quests).values([
        {
            title: 'First Step',
            description: 'Visit 1 spot to start your journey.',
            rewardPoints: 100,
            conditionType: 'visit_count',
            conditionValue: 1,
        },
        {
            title: 'Explorer',
            description: 'Visit 5 different spots.',
            rewardPoints: 500,
            conditionType: 'visit_count',
            conditionValue: 5,
        },
        {
            title: 'Spot Master',
            description: 'Visit 20 spots to become a Master.',
            rewardPoints: 2000,
            conditionType: 'visit_count',
            conditionValue: 20,
        },
        {
            title: 'Premium Member',
            description: 'Upgrade to Premium status.',
            rewardPoints: 5000,
            conditionType: 'premium_status',
            conditionValue: 1, // boolean check
        }
    ]);
    console.log(`✅ Successfully planted ${spotsToInsert.length} spots worldwide! 🌍`);
    process.exit(0);
}
main().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
