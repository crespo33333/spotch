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
async function main() {
    console.log('🌱 Seeding database with diverse users...');
    const dummyUsersData = [
        { openId: 'dummy_user_1', name: 'NeonNinja', email: 'ninja@example.com', avatar: 'ninja_seed_123' },
        { openId: 'dummy_user_2', name: 'CyberCat', email: 'cat@example.com', avatar: 'cat_seed_456' },
        { openId: 'dummy_user_3', name: 'RetroRobot', email: 'robot@example.com', avatar: 'robot_seed_789' },
        { openId: 'dummy_user_4', name: 'PixelPunk', email: 'punk@example.com', avatar: 'punk_seed_000' },
        { openId: 'dummy_user_5', name: 'GlitchGhost', email: 'ghost@example.com', avatar: 'ghost_seed_111' },
    ];
    const createdUserIds = [];
    // 1. Create Dummy Users
    for (const u of dummyUsersData) {
        let user = await db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.users.openId, u.openId)
        });
        if (!user) {
            console.log(`Creating ${u.name}...`);
            const [newUser] = await db.insert(schema.users).values({
                openId: u.openId,
                name: u.name,
                email: u.email,
                avatar: u.avatar,
            }).returning();
            user = newUser;
        }
        else {
            console.log(`Updating avatar for ${u.name}...`);
            await db.update(schema.users)
                .set({ avatar: u.avatar }) // Ensure avatar is set if it was missing
                .where((0, drizzle_orm_1.eq)(schema.users.id, user.id));
        }
        createdUserIds.push(user.id);
    }
    // 2. Create Dummy Spots assigned to these users
    const dummySpots = [
        {
            name: 'Tokyo Station Treasury',
            latitude: '35.6812',
            longitude: '139.7671',
            totalPoints: 10000,
            remainingPoints: 10000,
            ratePerMinute: 100,
            spotterId: createdUserIds[0], // User 1
        },
        {
            name: 'Shibuya Scramble Gold',
            latitude: '35.6591',
            longitude: '139.7005',
            totalPoints: 5000,
            remainingPoints: 5000,
            ratePerMinute: 50,
            spotterId: createdUserIds[1], // User 2
        },
        {
            name: 'Skytree High Rewards',
            latitude: '35.7100',
            longitude: '139.8107',
            totalPoints: 20000,
            remainingPoints: 20000,
            ratePerMinute: 200,
            spotterId: createdUserIds[2], // User 3
        },
        {
            name: 'Tokyo Tower Vintage',
            latitude: '35.6586',
            longitude: '139.7454',
            totalPoints: 8000,
            remainingPoints: 8000,
            ratePerMinute: 80,
            spotterId: createdUserIds[3], // User 4
        },
        {
            name: 'Yoyogi Park Chill',
            latitude: '35.6717',
            longitude: '139.6949',
            totalPoints: 3000,
            remainingPoints: 3000,
            ratePerMinute: 30,
            spotterId: createdUserIds[4], // User 5
        }
    ];
    console.log('Inserting/Updating spots...');
    // Simple verification check to avoid duplicate names for seed script simplicity (or just delete all first?)
    // Let's delete all dummy spots first to ensure clean slate for this demo
    // await db.delete(schema.spots); // Risky if user created spots, but okay for dev.
    // Better: Upsert or ignore.
    // For now, let's just insert. If they duplicate, it's fine for testing, or we can truncate spots table.
    // Let's TRUNCATE spots to clean up the "same icon" mess.
    await db.execute((0, drizzle_orm_1.sql) `TRUNCATE TABLE ${schema.spots} CASCADE`);
    await db.insert(schema.spots).values(dummySpots);
    console.log('✅ Database re-seeded with diverse users!');
    process.exit(0);
}
main().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
