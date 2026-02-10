import { db } from "../src/db";
import { quests } from "../src/db/schema";

async function main() {
    console.log("🌱 Seeding Quests...");

    const initialQuests = [
        {
            title: "First Step",
            description: "Visit your first spot to start your journey.",
            rewardPoints: 100,
            conditionType: "visit_count" as const,
            conditionValue: 1,
        },
        {
            title: "Explorer",
            description: "Visit 5 different spots.",
            rewardPoints: 500,
            conditionType: "visit_count" as const,
            conditionValue: 5,
        },
        {
            title: "Social Butterfly",
            description: "Connect with 3 other users.",
            rewardPoints: 300,
            conditionType: "friend_count" as const,
            conditionValue: 3,
        },
        {
            title: "V.I.P.",
            description: "Become a Premium Member.",
            rewardPoints: 1000,
            conditionType: "premium_status" as const,
            conditionValue: 1,
        },
    ];

    for (const quest of initialQuests) {
        await db.insert(quests).values(quest).onConflictDoNothing();
        console.log(`Prepared quest: ${quest.title}`);
    }

    console.log("✅ Quests seeded successfully!");
    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
