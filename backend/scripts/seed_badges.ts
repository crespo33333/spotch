import { db } from "../src/db";
import { badges } from "../src/db/schema";

async function main() {
    console.log("Seeding badges...");

    const initialBadges = [
        {
            id: 'first_step',
            name: 'First Step',
            description: 'Check in to your first spot.',
            icon: '🦶',
            conditionType: 'visits',
            conditionValue: 1,
            order: 1,
        },
        {
            id: 'explorer_lvl1',
            name: 'Explorer I',
            description: 'Visit 10 different spots.',
            icon: '🧭',
            conditionType: 'visits',
            conditionValue: 10,
            order: 2,
        },
        {
            id: 'explorer_lvl2',
            name: 'Explorer II',
            description: 'Visit 50 different spots.',
            icon: '🌎',
            conditionType: 'visits',
            conditionValue: 50,
            order: 3,
        },
        {
            id: 'creator_lvl1',
            name: 'Creator I',
            description: 'Create your first spot.',
            icon: '📍',
            conditionType: 'spots_created',
            conditionValue: 1,
            order: 4,
        },
        {
            id: 'creator_lvl2',
            name: 'Creator II',
            description: 'Create 5 spots.',
            icon: '🏗️',
            conditionType: 'spots_created',
            conditionValue: 5,
            order: 5,
        },
        {
            id: 'high_roller',
            name: 'High Roller',
            description: 'Earn 10,000 Points.',
            icon: '💎',
            conditionType: 'points',
            conditionValue: 10000,
            order: 6,
        },
        {
            id: 'level_5',
            name: 'Rising Star',
            description: 'Reach Level 5.',
            icon: '⭐',
            conditionType: 'level',
            conditionValue: 5,
            order: 7,
        },
        {
            id: 'level_10',
            name: 'Pro Spotter',
            description: 'Reach Level 10.',
            icon: '🏆',
            conditionType: 'level',
            conditionValue: 10,
            order: 8,
        }
    ];

    for (const badge of initialBadges) {
        await db.insert(badges).values(badge).onConflictDoNothing();
    }

    console.log("Badges seeded successfully!");
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
