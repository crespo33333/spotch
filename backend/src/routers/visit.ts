import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db';
import { spots, visits, users, wallets, transactions, userQuests, quests } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const visitRouter = router({
    checkIn: protectedProcedure
        .input(z.object({
            spotId: z.number(),
            latitude: z.number(),
            longitude: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            const spot = await db.query.spots.findFirst({
                where: eq(spots.id, input.spotId),
            });

            if (!spot || !spot.active) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Spot not found or inactive' });
            }

            // Verify Distance
            const dist = getDistanceFromLatLonInKm(
                input.latitude,
                input.longitude,
                parseFloat(spot.latitude!),
                parseFloat(spot.longitude!)
            );

            if (dist > 0.1) { // 100 meters tolerance
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Too far from spot' });
            }

            // Close any existing active visits for this user (Enforce 1 active visit)
            await db.update(visits)
                .set({ checkOutTime: new Date() })
                .where(and(
                    eq(visits.getterId, ctx.user.id),
                    sql`${visits.checkOutTime} IS NULL`
                ));

            const [visit] = await db.insert(visits).values({
                spotId: spot.id,
                getterId: ctx.user.id,
                checkInTime: new Date(),
                earnedPoints: '0',
            }).returning();

            // --- Quest Logic: Update "Visit" Quests ---
            const activeQuests = await db.select().from(userQuests)
                .leftJoin(quests, eq(userQuests.questId, quests.id))
                .where(and(
                    eq(userQuests.userId, ctx.user.id),
                    eq(userQuests.status, 'in_progress'),
                    eq(quests.conditionType, 'visit_count')
                ));

            for (const { user_quests: uq, quests: q } of activeQuests) {
                if (!uq || !q) continue;

                const newProgress = (uq.progress || 0) + 1;
                let updates: any = { progress: newProgress };

                if (newProgress >= q.conditionValue) {
                    updates.status = 'completed';
                    updates.completedAt = new Date();

                    await db.insert(transactions).values({
                        userId: ctx.user.id,
                        amount: q.rewardPoints,
                        type: 'earn',
                        description: `Completed Quest: ${q.title}`
                    });
                    await db.update(wallets)
                        .set({ currentBalance: sql`${wallets.currentBalance} + ${q.rewardPoints}` })
                        .where(eq(wallets.userId, ctx.user.id));
                }
                await db.update(userQuests).set(updates).where(eq(userQuests.id, uq.id));
            }
            // ------------------------------------------


            // Gamification: Award XP for Check-In
            const { addXp: addXpUtils, checkBadgeUnlock } = await import('../utils/gamification');
            await addXpUtils(ctx.user.id, 50);
            await checkBadgeUnlock(ctx.user.id, 'visits');

            return visit;
        }),

    // Check for Quests (Visit Type) => This logic could be shared
    checkQuestProgress: protectedProcedure
        .mutation(async ({ ctx }) => {
            // Find active "Visit" quests
            const activeQuests = await db.select().from(userQuests)
                .leftJoin(quests, eq(userQuests.questId, quests.id))
                .where(and(
                    eq(userQuests.userId, ctx.user.id),
                    eq(userQuests.status, 'in_progress'),
                    eq(quests.conditionType, 'visit_count')
                ));

            for (const { user_quests: uq, quests: q } of activeQuests) {
                if (!uq || !q) continue;

                const newProgress = (uq.progress || 0) + 1;
                let updates: any = { progress: newProgress };

                // Complete Quest
                if (newProgress >= q.conditionValue) {
                    updates.status = 'completed';
                    updates.completedAt = new Date();

                    // Award Reward
                    await db.insert(transactions).values({
                        userId: ctx.user.id,
                        amount: q.rewardPoints,
                        type: 'earn',
                        description: `Completed Quest: ${q.title}`
                    });
                    await db.update(wallets)
                        .set({ currentBalance: sql`${wallets.currentBalance} + ${q.rewardPoints}` })
                        .where(eq(wallets.userId, ctx.user.id));
                }

                await db.update(userQuests)
                    .set(updates)
                    .where(eq(userQuests.id, uq.id));
            }
            return { success: true };
        }),


    checkout: protectedProcedure
        .input(z.object({
            visitId: z.number()
        }))
        .mutation(async ({ ctx, input }) => {
            await db.update(visits)
                .set({ checkOutTime: new Date() })
                .where(and(eq(visits.id, input.visitId), eq(visits.getterId, ctx.user.id)));
            return { success: true };
        }),

    // Called every minute by client to claim points
    heartbeat: protectedProcedure
        .input(z.object({
            visitId: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            const visit = await db.query.visits.findFirst({
                where: eq(visits.id, input.visitId),
                with: {
                    spot: true
                }
            });

            if (!visit || !visit.spot || !visit.spot.active) {
                throw new Error('Invalid visit session');
            }

            // 0. Update Heartbeat Timestamp (Alive Check)
            await db.update(visits)
                .set({ lastHeartbeatAt: new Date() })
                .where(eq(visits.id, visit.id));

            // Check Budget / Depletion
            if ((visit.spot.remainingPoints || 0) <= 0) {
                // Mark spot inactive if not already
                if (visit.spot.active) {
                    await db.update(spots).set({ active: false }).where(eq(spots.id, visit.spot.id));
                }
                throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Spot depleted' });
            }

            // Calculate Points & XP (Fixed Rate per User)
            // Heartbeats happen every 5 seconds. 60 / 5 = 12 heartbeats per minute.
            const ratePerMin = (visit.spot as any).ratePerMinute || 10;
            const increment = ratePerMin / 12; // Fractional increment
            const xpIncrement = increment / 2;

            // 1. Update Visit Record (Accumulate fractional points)
            const oldEarned = parseFloat(visit.earnedPoints || '0');
            const newEarned = oldEarned + increment;

            await db.update(visits)
                .set({ earnedPoints: newEarned.toString() })
                .where(eq(visits.id, visit.id));

            // 2. Update remaining points (Drain budget)
            await db.update(spots)
                .set({ remainingPoints: sql`${spots.remainingPoints} - ${increment}` })
                .where(eq(spots.id, visit.spot.id));

            // 3. Calculate Wallet Update (Only add if integer part increased)
            const walletAward = Math.floor(newEarned) - Math.floor(oldEarned);

            if (walletAward > 0) {
                // Check for Owner & Tax
                const currentSpot = await db.query.spots.findFirst({ where: eq(spots.id, visit.spot.id) }); // Re-fetch to get latest owner
                const ownerId = currentSpot?.ownerId;
                let taxRate = currentSpot?.taxRate || 5;

                // Check Tax Boost
                if (currentSpot?.taxBoostExpiresAt && new Date(currentSpot.taxBoostExpiresAt) > new Date()) {
                    taxRate = 10; // Boost to 10%
                }

                let userGain = walletAward;
                let taxAmount = 0;

                if (ownerId && ownerId !== ctx.user.id) {
                    // Cumulative Tax Calculation
                    // Calculate total tax that *should* have been paid up to this point
                    const cumulativeTaxNew = Math.floor(newEarned * (taxRate / 100));
                    const cumulativeTaxOld = Math.floor(oldEarned * (taxRate / 100));

                    // The tax due for this specific increment is the difference
                    taxAmount = cumulativeTaxNew - cumulativeTaxOld;

                    userGain = walletAward - taxAmount;

                    if (taxAmount > 0) {
                        // Pay Owner
                        await db.update(wallets)
                            .set({
                                currentBalance: sql`${wallets.currentBalance} + ${taxAmount}`,
                                lastTransactionAt: new Date()
                            })
                            .where(eq(wallets.userId, ownerId));

                        await db.insert(transactions).values({
                            userId: ownerId,
                            amount: taxAmount,
                            type: 'earn',
                            description: `Tax collected from ${visit.spot.name}`
                        });
                    }
                }

                // Pay Worker (User)
                if (userGain > 0) {
                    await db.update(wallets)
                        .set({
                            currentBalance: sql`${wallets.currentBalance} + ${userGain}`,
                            lastTransactionAt: new Date()
                        })
                        .where(eq(wallets.userId, ctx.user.id));

                    // Log Transaction
                    await db.insert(transactions).values({
                        userId: ctx.user.id,
                        amount: userGain,
                        type: 'earn',
                        description: `Farmed at ${visit.spot.name}${taxAmount > 0 ? ` (Taxed ${taxRate}%)` : ''}`
                    });
                }

                // --- Turf War: Update Weekly Points ---
                const { weeklySpotPoints } = require('../db/schema');
                const weekStart = new Date();
                weekStart.setHours(0, 0, 0, 0);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday as start

                // Upsert Weekly Points
                // Note: We credit the GROSS walletAward (before tax) to the user's weekly score?
                // Or userGain? Usually "Gross Earnings" determine "Productivity".
                // Let's use `walletAward` (Gross).

                await db.insert(weeklySpotPoints).values({
                    spotId: visit.spot.id,
                    userId: ctx.user.id,
                    points: walletAward,
                    weekStart: weekStart,
                }).onConflictDoUpdate({
                    target: [weeklySpotPoints.spotId, weeklySpotPoints.userId, weeklySpotPoints.weekStart],
                    set: { points: sql`${weeklySpotPoints.points} + ${walletAward}` }
                });
                // --------------------------------------
            }

            // 3. Update Spot Activity & Level Up
            const currentSpot = await db.query.spots.findFirst({ where: eq(spots.id, visit.spot.id) });
            let newSpotLevel = currentSpot?.spotLevel || 1;
            let currentSpotActivity = (currentSpot?.totalActivity || 0) + 1;

            if (currentSpotActivity >= newSpotLevel * 500) {
                newSpotLevel += 1;
            }

            await db.update(spots)
                .set({
                    totalActivity: currentSpotActivity,
                    spotLevel: newSpotLevel
                })
                .where(eq(spots.id, visit.spot.id));

            // 4. Update XP & Check Level Up via Utils
            const { addXp, checkBadgeUnlock } = await import('../utils/gamification');
            let earnedXp = Math.max(1, Math.floor(xpIncrement));
            const xpResult = await addXp(ctx.user.id, earnedXp);

            // Check for points badge if we earned points
            if (walletAward > 0) {
                await checkBadgeUnlock(ctx.user.id, 'points');
            }

            return {
                earnedPoints: walletAward,
                earnedXp,
                newLevel: xpResult?.newLevel, // Assuming addXp returns this
                currentXp: 0, // Frontend might reload user or we change protocol. Return 0 for now as addXp handles db.
                xpNeeded: (xpResult?.newLevel || 1) * 100
            };
        }),
});

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180)
}
