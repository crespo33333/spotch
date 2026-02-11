
import { db } from '../src/db';
import { coupons } from '../src/db/schema';

const ITEMS = [
    {
        name: 'Peace Treaty 🛡️',
        description: 'Protects your owned spot from being captured for 24 hours.',
        cost: 500,
        type: 'game_item',
        data: 'shield_24h',
        stock: null,
    },
    {
        name: 'Golden Ledger 💰',
        description: 'Doubles the tax rate (10%) on your owned spot for 24 hours.',
        cost: 1000,
        type: 'game_item',
        data: 'tax_boost_24h',
        stock: null,
    }
];

async function seed() {
    console.log('🌱 Seeding Game Items...');

    for (const item of ITEMS) {
        await db.insert(coupons).values(item);
    }

    console.log('✅ Game Items seeded!');
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
