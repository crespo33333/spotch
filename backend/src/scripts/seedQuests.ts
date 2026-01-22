import { db } from "../db";
import { quests } from "../db/schema";

async function seedQuests() {
    console.log("🌱 Seeding Quests...");

    const initialQuests = [
        {
            title: "First Steps",
            description: "Visit your first spot and start earning points.",
            rewardPoints: 100,
            conditionType: "visit_count" as const,
            conditionValue: 1,
        },
        {
            title: "Frequent Traveler",
            description: "Visit 5 different spots.",
            rewardPoints: 500,
            conditionType: "visit_count" as const,
            conditionValue: 5,
        },
        {
            title: "Spot Master",
            description: "Visit 10 different spots.",
            rewardPoints: 1500,
            conditionType: "visit_count" as const,
            conditionValue: 10,
        },
    ];

    for (const quest of initialQuests) {
        await db.insert(quests).values(quest).onConflictDoNothing();
    }

    console.log("✅ Quests Seeded!");
    process.exit(0);
}

seedQuests().catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
