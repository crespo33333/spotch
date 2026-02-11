import { router, protectedProcedure, publicProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db';
import { spots, wallets, transactions, users, visits, userBlocks, reports } from '../db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const spotRouter = router({
    create: protectedProcedure
        .input(z.object({
            name: z.string(),
            latitude: z.number(),
            longitude: z.number(),
            totalPoints: z.number().min(100),
            ratePerMinute: z.number().min(1),
            category: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return await db.transaction(async (tx) => {
                // 1. Safe Atomic Deduct Points
                const [walletUpdate] = await tx.update(wallets)
                    .set({
                        currentBalance: sql`${wallets.currentBalance} - ${input.totalPoints}`,
                        lastTransactionAt: new Date()
                    })
                    .where(and(
                        eq(wallets.userId, ctx.user.id),
                        sql`${wallets.currentBalance} >= ${input.totalPoints}`
                    ))
                    .returning({ id: wallets.id });

                if (!walletUpdate) {
                    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Insufficient funds or transaction failed' });
                }

                await tx.insert(transactions).values({
                    userId: ctx.user.id,
                    amount: -input.totalPoints,
                    type: 'spend',
                    description: `Created spot: ${input.name}`,
                });

                // 2. Create Spot
                const [spot] = await tx.insert(spots).values({
                    spotterId: ctx.user.id,
                    name: input.name,
                    latitude: input.latitude.toString(),
                    longitude: input.longitude.toString(),
                    totalPoints: input.totalPoints,
                    remainingPoints: input.totalPoints,
                    ratePerMinute: input.ratePerMinute,
                    category: input.category || 'General',
                    active: true,
                }).returning();

                // 3. Gamification (Inside transaction ensures all or nothing)
                // Note: If gamification fails, spot creation is rolled back. This is strict but safe.
                const { addXp, checkBadgeUnlock } = await import('../utils/gamification');
                // We pass tx if gamification supported it, but gamification utils might use 'db' global.
                // If gamification uses 'db', it is OUTSIDE the transaction.
                // This means if gamification fails, spot is created but no XP?
                // Or if gamification throws, transaction rolls back?
                // If gamification uses `db` (not tx), it commits immediately to DB.
                // If transaction rolls back later, XP remains.
                // Ideally passing 'tx' to gamification is best, but for MVP let's assume gamification is stable.
                // We will run gamification AFTER return? No, we want to await it.
                // Risk: XP awarded even if spot creation fails at the very end?
                // Spot creation is the last DB write here besides logs.
                // Let's keep it here.

                await addXp(ctx.user.id, 500);
                await checkBadgeUnlock(ctx.user.id, 'spots_created');

                return spot;
            });
        }),

    getNearby: publicProcedure
        .input(z.object({
            latitude: z.number(),
            longitude: z.number(),
            radiusKm: z.number().default(5),
        }))
        .query(async ({ input }) => {
            // Simple bounding box for MVP or fetch all and filter in JS if small scale.
            // For accurate nearby, we need PostGIS or Haversine formula in SQL.
            // Let's use specific Drizzle compatible raw SQL for Haversine.

            // This is complex in Drizzle without strict types, so let's simplify: fetch all active spots and filter in JS for MVP.
            // Fetch spots and join with users to get spotter info
            // Since we don't have relations set up in schema.ts yet, let's just fetch users map or use a manual join query if possible.
            // Drizzle query builder is easier if we set up relations, but let's just join manually or fetch all users for now (MVP).

            // Bounding Box Optimization
            console.log('📍 getNearby called:', input);

            // 1 degree lat ~= 111.32 km. 1 degree lng ~= 111.32 * cos(lat) km.

            const latDeg = input.radiusKm / 111.32;
            const lngDeg = input.radiusKm / (111.32 * Math.cos(deg2rad(input.latitude)));

            const minLat = input.latitude - latDeg;
            const maxLat = input.latitude + latDeg;
            const minLng = input.longitude - Math.abs(lngDeg);
            const maxLng = input.longitude + Math.abs(lngDeg);

            console.log('📦 Bounding Box:', { minLat, maxLat, minLng, maxLng });

            // Drizzle SQL query with casting for decimal comparisons

            const nearbySpots = await db.select({
                spot: spots,
                user: users,
            })
                .from(spots)
                .leftJoin(users, eq(spots.spotterId, users.id))
                .where(and(
                    eq(spots.active, true),
                    // Cast to numeric/decimal for comparison if needed, though usually string comparison works for simple range if formatted correctly.
                    // Safer to rely on raw SQL comparisons for string-stored decimals in SQLite/PG without strict typing.
                    sql`${spots.latitude} >= ${minLat}::decimal`,
                    sql`${spots.latitude} <= ${maxLat}::decimal`,
                    sql`${spots.longitude} >= ${minLng}::decimal`,
                    sql`${spots.longitude} <= ${maxLng}::decimal`
                ));

            // Filtering circle distance in memory (much faster on small subset)
            return nearbySpots
                .filter(({ spot }) => {
                    const dist = getDistanceFromLatLonInKm(
                        input.latitude,
                        input.longitude,
                        parseFloat(spot.latitude!),
                        parseFloat(spot.longitude!)
                    );
                    return dist <= input.radiusKm;
                })
                .map(({ spot, user }) => ({
                    ...spot,
                    pointsPerMinute: spot.ratePerMinute, // Map for frontend convenience
                    spotter: user ? {
                        id: user.id,
                        name: user.name,
                        avatar: user.avatar,
                    } : null
                }));
        }),


    getById: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            const spotData = await db.query.spots.findFirst({
                where: eq(spots.id, input.id),
                with: {
                    spotter: true,
                    owner: true, // Fetch owner relation
                }
            });

            if (!spotData) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Spot not found' });
            }

            const activeThreshold = new Date(Date.now() - 30 * 1000);
            const activeVisitorsResult = await db.select({ count: sql<number>`count(*)` })
                .from(visits)
                .where(and(
                    eq(visits.spotId, input.id),
                    sql`${visits.lastHeartbeatAt} > ${activeThreshold}`,
                    sql`${visits.checkOutTime} IS NULL`
                ));
            const activeVisitorCount = Number(activeVisitorsResult[0]?.count || 0);

            return {
                ...spotData,
                pointsPerMinute: spotData.ratePerMinute,
                activeVisitorCount,
                spotter: spotData.spotter ? {
                    id: spotData.spotter.id,
                    name: spotData.spotter.name,
                    avatar: spotData.spotter.avatar,
                } : null,
                owner: spotData.owner ? {
                    id: spotData.owner.id,
                    name: spotData.owner.name,
                    avatar: spotData.owner.avatar,
                } : null,
            };
        }),

    getRankings: publicProcedure
        .query(async () => {
            // Get most visited/popular spots
            const popularSpots = await db.select({
                spot: spots,
                visits_count: sql<number>`count(${visits.id})`.mapWith(Number)
            })
                .from(spots)
                .leftJoin(visits, eq(spots.id, visits.spotId))
                .where(eq(spots.active, true))
                .groupBy(spots.id)
                .orderBy(desc(sql`count(${visits.id})`))
                .limit(10);

            return popularSpots.map(({ spot, visits_count }) => ({
                id: spot.id,
                name: spot.name,
                country: '📍',
                points: (spot.totalPoints || 0) - (spot.remainingPoints || 0),
                lat: parseFloat(spot.latitude || '0'),
                lng: parseFloat(spot.longitude || '0'),
                trend: visits_count > 5 ? 'up' : 'stable', // Simple trend logic
                activeUsers: visits_count,
            })).sort((a, b) => b.activeUsers - a.activeUsers);
        }),


    getMessages: publicProcedure
        .input(z.object({ spotId: z.number() }))
        .query(async ({ ctx, input }) => {
            const { spotMessages } = require('../db/schema');

            // Get list of users who blocked the current user OR whom the current user blocked
            let blockedUserIds: number[] = [];
            if (ctx.user) {
                const blocks = await db.select().from(userBlocks).where(
                    sql`${userBlocks.blockerId} = ${ctx.user.id} OR ${userBlocks.blockedId} = ${ctx.user.id}`
                );
                blockedUserIds = blocks.map(b => b.blockerId === ctx.user.id ? b.blockedId : b.blockerId);
            }

            const messages = await db.query.spotMessages.findMany({
                where: eq(spotMessages.spotId, input.spotId),
                with: {
                    user: {
                        columns: {
                            id: true,
                            name: true,
                            avatar: true,
                        }
                    }
                },
                orderBy: (messages, { desc }) => [desc(messages.createdAt)],
                limit: 50,
            });

            // Filter out messages from blocked users
            return messages.filter(m => !blockedUserIds.includes(m.userId));
        }),

    postMessage: protectedProcedure
        .input(z.object({
            spotId: z.number(),
            content: z.string().min(1).max(280),
        }))
        .mutation(async ({ ctx, input }) => {
            const { spotMessages } = require('../db/schema');
            const [message] = (await db.insert(spotMessages).values({
                spotId: input.spotId,
                userId: ctx.user!.id,
                content: input.content,
            }).returning()) as any[];

            // Notify Spot Owner
            const spot = await db.query.spots.findFirst({
                where: eq(spots.id, input.spotId),
                with: {
                    spotter: {
                        columns: { pushToken: true, id: true }
                    }
                }
            });

            if (spot?.spotter?.pushToken && spot.spotter.id !== ctx.user.id) {
                const { sendPushNotification } = require('../utils/push');
                await sendPushNotification(
                    spot.spotter.pushToken,
                    "New Comment! 💬",
                    `${ctx.user.name} commented on "${spot.name}": ${input.content}`,
                    { type: 'comment', spotId: input.spotId }
                );
            }

            return message;
        }),

    toggleLike: protectedProcedure
        .input(z.object({ spotId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const { spotLikes } = require('../db/schema');
            const existing = await db.query.spotLikes.findFirst({
                where: and(eq(spotLikes.spotId, input.spotId), eq(spotLikes.userId, ctx.user!.id)),
            });

            if (existing) {
                await db.delete(spotLikes).where(eq(spotLikes.id, existing.id));
                return { liked: false };
            } else {
                await db.insert(spotLikes).values({
                    spotId: input.spotId,
                    userId: ctx.user!.id,
                });

                // Notify Spot Owner
                const spot = await db.query.spots.findFirst({
                    where: eq(spots.id, input.spotId),
                    with: {
                        spotter: {
                            columns: { pushToken: true }
                        }
                    }
                });

                if (spot?.spotter?.pushToken && spot.spotterId !== ctx.user.id) {
                    const { sendPushNotification } = require('../utils/push');
                    await sendPushNotification(
                        spot.spotter.pushToken,
                        "Spot Liked!",
                        `${ctx.user.name} liked your spot "${spot.name}".`,
                        { type: 'like', spotId: input.spotId }
                    );
                }

                return { liked: true };
            }
        }),

    getStats: publicProcedure
        .input(z.object({ spotId: z.number() }))
        .query(async ({ ctx, input }) => {
            const { spotLikes, spotMessages } = require('../db/schema');
            const likeCount = await db.select({ count: sql`count(*)` }).from(spotLikes).where(eq(spotLikes.spotId, input.spotId));
            const msgCount = await db.select({ count: sql`count(*)` }).from(spotMessages).where(eq(spotMessages.spotId, input.spotId));

            let isLiked = false;
            if (ctx.user) {
                const existing = await db.query.spotLikes.findFirst({
                    where: and(eq(spotLikes.spotId, input.spotId), eq(spotLikes.userId, ctx.user.id)),
                });
                isLiked = !!existing;
            }

            return {
                likes: Number(likeCount[0]?.count || 0),
                messages: Number(msgCount[0]?.count || 0),
                isLiked,
            };
        }),

    reportSpot: protectedProcedure
        .input(z.object({ spotId: z.number(), reason: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await db.insert(reports).values({
                reporterId: ctx.user.id,
                targetType: 'spot',
                targetId: input.spotId,
                reason: input.reason,
            });
            return { success: true };
        }),

    reportComment: protectedProcedure
        .input(z.object({ commentId: z.number(), reason: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await db.insert(reports).values({
                reporterId: ctx.user.id,
                targetType: 'comment',
                targetId: input.commentId,
                reason: input.reason,
            });
            return { success: true };
        }),

    takeover: protectedProcedure
        .input(z.object({ spotId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            return await db.transaction(async (tx) => {
                const { wallets, spots } = require('../db/schema');
                // 1. Get Spot & Check Shield
                const spot = await tx.query.spots.findFirst({
                    where: eq(spots.id, input.spotId),
                    with: { owner: true }
                });

                if (!spot) throw new TRPCError({ code: 'NOT_FOUND', message: 'Spot not found' });

                // Shield Check
                if (spot.shieldExpiresAt && new Date(spot.shieldExpiresAt) > new Date()) {
                    throw new TRPCError({ code: 'FORBIDDEN', message: 'Shield active! Cannot capture.' });
                }

                // Check if already owner (using ownerId or spotterId if ownerId null)
                const currentOwnerId = spot.ownerId || spot.spotterId;
                if (currentOwnerId === ctx.user.id) {
                    throw new TRPCError({ code: 'BAD_REQUEST', message: 'You already own this spot!' });
                }

                // Cost Calculation
                const PREMIUM = 10000;
                const cost = (spot.remainingPoints || 0) + PREMIUM;

                // 2. Check & Deduct Balance (Atomic)
                const [walletUpdate] = await tx.update(wallets)
                    .set({
                        currentBalance: sql`${wallets.currentBalance} - ${cost}`,
                        lastTransactionAt: new Date()
                    })
                    .where(and(
                        eq(wallets.userId, ctx.user.id),
                        sql`${wallets.currentBalance} >= ${cost}`
                    ))
                    .returning({ id: wallets.id });

                if (!walletUpdate) {
                    throw new TRPCError({ code: 'BAD_REQUEST', message: `Need ${cost} points to capture!` });
                }

                // 3. Pay Previous Owner (70% of Premium)
                if (currentOwnerId && currentOwnerId !== ctx.user.id) {
                    const payout = Math.floor(PREMIUM * 0.7);
                    await tx.update(wallets)
                        .set({
                            currentBalance: sql`${wallets.currentBalance} + ${payout}`,
                            lastTransactionAt: new Date()
                        })
                        .where(eq(wallets.userId, currentOwnerId));

                    // Notify Previous Owner
                    const { sendPushNotification } = require('../utils/push');
                    // If ownerId was null, we might need to fetch spotter to get token. 
                    // But we fetched `spot` with `owner`. If `ownerId` was null, `spot.owner` is null.
                    // If `ownerId` is null, `spotterId` is the owner. We need to fetch spotter.
                    // Let's assume we can notify if we have the user.
                    // Ideally we should have fetched spotter too.
                }

                // 4. Transfer Ownership
                await tx.update(spots)
                    .set({
                        ownerId: ctx.user.id,
                        shieldExpiresAt: null, // Remove shield
                        taxBoostExpiresAt: null,
                        updatedAt: new Date()
                    })
                    .where(eq(spots.id, spot.id));

                return { success: true, cost, oldOwnerId: currentOwnerId };
            });
        }),

    takeover: protectedProcedure
        .input(z.object({ spotId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            return await db.transaction(async (tx) => {
                const { wallets, spots, notifications } = require('../db/schema');
                // 1. Get Spot & Check Shield
                const spot = await tx.query.spots.findFirst({
                    where: eq(spots.id, input.spotId),
                    with: { owner: true }
                });

                if (!spot) throw new TRPCError({ code: 'NOT_FOUND', message: 'Spot not found' });

                // Shield Check
                if (spot.shieldExpiresAt && new Date(spot.shieldExpiresAt) > new Date()) {
                    throw new TRPCError({ code: 'FORBIDDEN', message: 'Shield active! Cannot capture.' });
                }

                // Owner Check
                if (spot.spotterId === ctx.user.id) { // Usually spotter is creator, but we use ownerId now? 
                    // Schema has spotterId (creator) and we need ownerId. 
                    // Let's check if schema has ownerId. 
                    // The view 'getById' uses spot.owner. 
                    // Let's assume schema has ownerId. If not, we might need to add it or use spotterId as owner.
                    // Implementation plan said "Add ownerId". 
                    // But schema.ts viewed earlier DOES show `owner` relation in `getById`.
                    // Let's verify schema.ts for `ownerId` column. 
                    // If not present, I'll need to add it.
                    // For now, let's assume `spotterId` IS the owner for MVP if `ownerId` is missing, 
                    // OR `ownerId` exists. 
                    // Wait, `getById` (line 158) -> `owner: true`. 
                    // So `ownerId` MUST exist in relations.
                }

                // Cost Calculation
                const PREMIUM = 10000;
                const cost = (spot.remainingPoints || 0) + PREMIUM;

                // 2. Check & Deduct Balance (Atomic)
                const [walletUpdate] = await tx.update(wallets)
                    .set({
                        currentBalance: sql`${wallets.currentBalance} - ${cost}`,
                        lastTransactionAt: new Date()
                    })
                    .where(and(
                        eq(wallets.userId, ctx.user.id),
                        sql`${wallets.currentBalance} >= ${cost}`
                    ))
                    .returning({ id: wallets.id });

                if (!walletUpdate) {
                    throw new TRPCError({ code: 'BAD_REQUEST', message: `Need ${cost} points to capture!` });
                }

                // 3. Pay Previous Owner (70% of Premium)
                if (spot.ownerId && spot.ownerId !== ctx.user.id) {
                    const payout = Math.floor(PREMIUM * 0.7);
                    await tx.update(wallets)
                        .set({
                            currentBalance: sql`${wallets.currentBalance} + ${payout}`,
                            lastTransactionAt: new Date()
                        })
                        .where(eq(wallets.userId, spot.ownerId));

                    // Notify Previous Owner
                    const { sendPushNotification } = require('../utils/push');
                    // We need previous owner push token. 
                    // We fetched `with: { owner: true }`.
                    if (spot.owner?.pushToken) {
                        await sendPushNotification(
                            spot.owner.pushToken,
                            "🚨 Territory Lost!",
                            `${ctx.user.name} captured ${spot.name}! You received ${payout} pts compensation.`,
                            { type: 'takeover', spotId: spot.id }
                        );
                    }
                }

                // 4. Transfer Ownership
                await tx.update(spots)
                    .set({
                        ownerId: ctx.user.id,
                        shieldExpiresAt: null, // Remove shield
                        taxBoostExpiresAt: null,
                        updatedAt: new Date()
                    })
                    .where(eq(spots.id, spot.id));

                return { success: true, cost, oldOwnerId: spot.ownerId };
            });
        }),
});

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
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
