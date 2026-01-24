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

            const [visit] = await db.insert(visits).values({
                spotId: spot.id,
                getterId: ctx.user.id,
                checkInTime: new Date(),
                earnedPoints: 0,
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

            // Calculate Points & XP (Scale based on spot's rate)
            // If rate is 100 P/min, a 5s heartbeat should give ~8 points (100 / 12).
            const ratePerMin = (visit.spot as any).ratePerMinute || 10;
            const earnedAmount = Math.max(1, Math.floor(ratePerMin / 12));
            const earnedXp = Math.max(1, Math.floor(earnedAmount / 2));

            // 1. Update Spot Activity & Level Up
            const currentSpot = await db.query.spots.findFirst({ where: eq(spots.id, visit.spot.id) });
            let newSpotLevel = currentSpot?.spotLevel || 1;
            let currentSpotActivity = (currentSpot?.totalActivity || 0) + 1;

            // Spot levels up every 500 activity units
            if (currentSpotActivity >= newSpotLevel * 500) {
                newSpotLevel += 1;
            }

            await db.update(spots)
                .set({
                    remainingPoints: sql`${spots.remainingPoints} - ${earnedAmount}`,
                    totalActivity: currentSpotActivity,
                    spotLevel: newSpotLevel
                })
                .where(eq(spots.id, visit.spot.id));

            // 2. Add to User Wallet
            await db.update(wallets)
                .set({
                    currentBalance: sql`${wallets.currentBalance} + ${earnedAmount}`,
                    lastTransactionAt: new Date()
                })
                .where(eq(wallets.userId, ctx.user.id));

            // 3. Add XP & Check Level Up
            const currentUser = await db.query.users.findFirst({
                where: eq(users.id, ctx.user.id)
            });

            let newLevel = currentUser?.level || 1;
            let currentXp = (currentUser?.xp || 0) + earnedXp;
            let didLevelUp = false;

            const xpNeeded = newLevel * 100;
            if (currentXp >= xpNeeded) {
                newLevel += 1;
                currentXp -= xpNeeded;
                didLevelUp = true;
            }

            await db.update(users)
                .set({
                    xp: currentXp,
                    level: newLevel
                })
                .where(eq(users.id, ctx.user.id));

            // 4. Log Transaction
            await db.insert(transactions).values({
                userId: ctx.user.id,
                amount: earnedAmount,
                type: 'earn',
                description: `Farmed at ${visit.spot.name}`
            });

            return {
                earnedPoints: earnedAmount,
                earnedXp,
                newLevel: didLevelUp ? newLevel : undefined,
                currentXp,
                xpNeeded: newLevel * 100
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
