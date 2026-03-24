import { db, initDB } from '../db';
import { sql } from 'drizzle-orm';

async function check() {
    try {
        await initDB();
        const res = await db.execute(sql`SELECT count(*) FROM spots`);
        console.log('Total spots in DB:', res.rows[0]);
        const s = await db.query.spots.findMany();
        console.log('Sample spot lat/lng:', s.length > 0 ? { lat: s[0].latitude, lng: s[0].longitude } : 'None');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
