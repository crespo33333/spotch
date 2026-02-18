import { db } from '../db';
import { coupons } from '../db/schema';
import { eq } from 'drizzle-orm';

const COUPONS = [
    {
        name: 'Amazonギフト券 500円分',
        cost: 5000,
        type: 'gift_card',
        stock: 10,
        isActive: true,
        data: 'amazon_jp_500' // Internal reference
    },
    {
        name: 'スターバックス ドリンクチケット 500円',
        cost: 5000,
        type: 'gift_card',
        stock: 10,
        isActive: true,
        data: 'starbucks_jp_500'
    },
    {
        name: 'UNICEF 募金 (¥100)',
        cost: 1000,
        type: 'donation',
        stock: null, // Unlimited
        isActive: true,
        data: 'unicef_100'
    },
    // GAME ITEMS (Hidden from Exchange List, used in Spot Detail)
    {
        name: '領土シールド (24時間)',
        cost: 500,
        type: 'game_item',
        stock: null,
        isActive: true,
        data: 'shield_24h'
    },
    {
        name: '収益ブースト (税収2倍)',
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
        // Check if exists by DATA field (stable ID)
        const existing = await db.query.coupons.findFirst({
            where: eq(coupons.data, item.data)
        });

        if (!existing) {
            await db.insert(coupons).values(item);
            console.log(`✅ Added: ${item.name}`);
        } else {
            // Update existing (e.g. for localization)
            await db.update(coupons)
                .set(item)
                .where(eq(coupons.id, existing.id));
            console.log(`🔄 Updated: ${item.name}`);
        }
    }

    console.log('✨ Coupon Seeding Complete!');
    process.exit(0);
}

seedCoupons().catch((e) => {
    console.error(e);
    process.exit(1);
});
