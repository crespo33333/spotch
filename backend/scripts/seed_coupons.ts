import { db } from "../src/db";
import { coupons } from "../src/db/schema";

async function main() {
    console.log("🌱 Seeding Coupons...");

    const initialCoupons = [
        {
            name: "Amazon Gift Card 500 JPY",
            description: "Digital code for Amazon.co.jp",
            cost: 5000,
            type: "gift_card",
            stock: 100,
        },
        {
            name: "Starbucks Ticket 300 JPY",
            description: "Enjoy a coffee break.",
            cost: 3000,
            type: "gift_card",
            stock: 50,
        },
        {
            name: "Spotch Premium (1 Month)",
            description: "Unlock all premium features.",
            cost: 10000,
            type: "premium",
            stock: null, // Infinite
        },
        {
            name: "Donate to Forest Conservation",
            description: "We will donate 100 JPY on your behalf.",
            cost: 1000,
            type: "donation",
            stock: null,
        },
        {
            name: "Safety Shield (24h)",
            description: "Protect your spot from takeover for 24 hours.",
            cost: 500,
            type: "game_item",
            data: "shield_24h",
            stock: null,
        },
        {
            name: "Tax Boost (24h)",
            description: "Double your tax revenue for 24 hours.",
            cost: 1000,
            type: "game_item",
            data: "tax_boost_24h",
            stock: null,
        }
    ];

    for (const item of initialCoupons) {
        // Check identifying field to prevent duplicates
        const { eq } = require('drizzle-orm');
        const existing = await db.query.coupons.findFirst({
            where: eq(coupons.name, item.name)
        });

        if (!existing) {
            await db.insert(coupons).values(item);
            console.log(`✅ Created coupon: ${item.name}`);
        } else {
            console.log(`⏭️ Skipped (Exists): ${item.name}`);
        }
    }

    console.log("✅ Coupons seeded successfully!");
    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
