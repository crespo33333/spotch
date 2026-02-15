import { db } from '../db';
import { coupons } from '../db/schema';
import { eq } from 'drizzle-orm';

const COUPONS = [
    {
        name: 'Amazon Gift Card 500 JPY',
        cost: 5000,
        type: 'gift_card',
        stock: 10,
        isActive: true,
        data: 'amazon_jp_500' // Internal reference
    },
    {
        name: 'Starbucks Ticket 500 JPY',
        cost: 5000,
        type: 'gift_card',
        stock: 10,
        isActive: true,
        data: 'starbucks_jp_500'
    },
    {
        name: 'UNICEF Donation (¥100)',
        cost: 1000,
        type: 'donation',
        stock: null, // Unlimited
        isActive: true,
        data: 'unicef_100'
    },
    // GAME ITEMS (Hidden from Exchange List, used in Spot Detail)
    {
        name: 'Territory Shield (24h)',
        cost: 500,
        type: 'game_item',
        stock: null,
        isActive: true,
        data: 'shield_24h'
    },
    {
        name: 'Revenue Boost (2x Tax)',
        cost: 1000,
        type: 'game_item',
        stock: null,
        isActive: true,
        data: 'tax_boost_24h'
    }
];

async function seedCoupons() {
    console.log('🌱 Seeding Coupons...');

    for (const item of COUPONS) {
        // Check if exists
        const existing = await db.query.coupons.findFirst({
            where: eq(coupons.name, item.name)
        });

        if (!existing) {
            await db.insert(coupons).values(item);
            console.log(`✅ Added: ${item.name}`);
        } else {
            console.log(`ℹ️ Skipped: ${item.name} (Already exists)`);
        }
    }

    console.log('✨ Coupon Seeding Complete!');
    process.exit(0);
}

seedCoupons().catch((e) => {
    console.error(e);
    process.exit(1);
});
