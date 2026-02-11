import { db } from '../db';
import { spots, weeklySpotPoints, transactions, wallets, users, visits } from '../db/schema';
import { eq, sql, desc, and } from 'drizzle-orm';
import { sendPushNotification } from './push';

export async function processWeeklyTurfWars() {
    console.log('⚔️ Processing Weekly Turf Wars...');

    // 1. Identify "Last Week" (The week that just ended)
    // For MVP, we'll just look for any weekly points for *previous* weeks that haven't been processed?
    // Actually, simpler: just look at the current state.
    // If we run this every Sunday midnight, we calculate winners for the week ending.

    // Let's iterate through ALL active spots. (Scalability warning: OK for < 1000 spots, bad for 1M)
    const allSpots = await db.query.spots.findMany({ where: eq(spots.active, true) });

    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of THIS week

    // We want to verify who won LAST week? 
    // Or is the "Owner" dynamic based on "Current Week High Score"?
    // The prompt said: "Past 7 days most points".
    // Dynamic is more fun. "King of the Hill".
    // If "King of the Hill" (Dynamic):
    // We check the leader for the CURRENT week. If leader != owner, change owner.

    for (const spot of allSpots) {
        // Find top scorer for this spot this week
        const topScorer = await db.query.weeklySpotPoints.findFirst({
            where: and(
                eq(weeklySpotPoints.spotId, spot.id),
                eq(weeklySpotPoints.weekStart, weekStart)
            ),
            orderBy: [desc(weeklySpotPoints.points)],
            with: {
                user: true
            }
        });

        // Check Shield
        if (spot.shieldExpiresAt && new Date(spot.shieldExpiresAt) > new Date()) {
            // console.log(`🛡️ Spot ${spot.name} is shielded! Skipping usurpation.`);
            continue;
        }

        if (topScorer) {
            // If top scorer is different from current owner
            if (topScorer.userId !== spot.ownerId) {
                console.log(`👑 New Owner for ${spot.name}: ${topScorer.user.name} (was ${spot.ownerId})`);

                // Update Spot
                await db.update(spots)
                    .set({
                        ownerId: topScorer.userId,
                        lastOwnerChangeAt: new Date()
                    })
                    .where(eq(spots.id, spot.id));

                // Notify New Owner
                if (topScorer.user.pushToken) {
                    await sendPushNotification(
                        topScorer.user.pushToken,
                        "You Conquered a Spot! 👑",
                        `You are now the owner of ${spot.name}. Collect those taxes!`,
                        { type: 'spot_conquered', spotId: spot.id }
                    );
                }

                // Notify Old Owner (if exists)
                if (spot.ownerId) {
                    const oldOwner = await db.query.users.findFirst({
                        where: eq(users.id, spot.ownerId),
                        columns: { pushToken: true }
                    });
                    if (oldOwner?.pushToken) {
                        await sendPushNotification(
                            oldOwner.pushToken,
                            "Spot Lost! 😱",
                            `${topScorer.user.name} has taken over ${spot.name}! Go claim it back!`,
                            { type: 'spot_lost', spotId: spot.id }
                        );
                    }
                }
            }
        }
    }
}
    }
}

export async function cleanupStaleVisits() {
    console.log('🧹 Cleaning up stale visits...');
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Close visits that haven't sent a heartbeat in 5 minutes
    await db.update(visits)
        .set({ checkOutTime: new Date() })
        .where(and(
            sql`${visits.checkOutTime} IS NULL`,
            sql`${visits.lastHeartbeatAt} < ${fiveMinutesAgo}`
        ));

    // console.log('✅ Stale visits cleanup complete.');
}
