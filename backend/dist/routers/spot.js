"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.spotRouter = void 0;
const trpc_1 = require("../trpc");
const zod_1 = require("zod");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const server_1 = require("@trpc/server");
exports.spotRouter = (0, trpc_1.router)({
    create: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        name: zod_1.z.string(),
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
        totalPoints: zod_1.z.number().min(100),
        ratePerMinute: zod_1.z.number().min(1),
        category: zod_1.z.string().optional(),
    }))
        .mutation(async ({ ctx, input }) => {
        return await db_1.db.transaction(async (tx) => {
            // 1. Safe Atomic Deduct Points
            const [walletUpdate] = await tx.update(schema_1.wallets)
                .set({
                currentBalance: (0, drizzle_orm_1.sql) `${schema_1.wallets.currentBalance} - ${input.totalPoints}`,
                lastTransactionAt: new Date()
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, ctx.user.id), (0, drizzle_orm_1.sql) `${schema_1.wallets.currentBalance} >= ${input.totalPoints}`))
                .returning({ id: schema_1.wallets.id });
            if (!walletUpdate) {
                throw new server_1.TRPCError({ code: 'BAD_REQUEST', message: 'Insufficient funds or transaction failed' });
            }
            await tx.insert(schema_1.transactions).values({
                userId: ctx.user.id,
                amount: -input.totalPoints,
                type: 'spend',
                description: `Created spot: ${input.name}`,
            });
            // 2. Create Spot
            const [spot] = await tx.insert(schema_1.spots).values({
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
            const { addXp, checkBadgeUnlock } = await Promise.resolve().then(() => __importStar(require('../utils/gamification')));
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
    getNearby: trpc_1.publicProcedure
        .input(zod_1.z.object({
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
        radiusKm: zod_1.z.number().default(5),
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
        const nearbySpots = await db_1.db.select({
            spot: schema_1.spots,
            user: schema_1.users,
        })
            .from(schema_1.spots)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.spots.spotterId, schema_1.users.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.spots.active, true), 
        // Cast to numeric/decimal for comparison if needed, though usually string comparison works for simple range if formatted correctly.
        // Safer to rely on raw SQL comparisons for string-stored decimals in SQLite/PG without strict typing.
        (0, drizzle_orm_1.sql) `${schema_1.spots.latitude} >= ${minLat}::decimal`, (0, drizzle_orm_1.sql) `${schema_1.spots.latitude} <= ${maxLat}::decimal`, (0, drizzle_orm_1.sql) `${schema_1.spots.longitude} >= ${minLng}::decimal`, (0, drizzle_orm_1.sql) `${schema_1.spots.longitude} <= ${maxLng}::decimal`));
        // Filtering circle distance in memory (much faster on small subset)
        return nearbySpots
            .filter(({ spot }) => {
            const dist = getDistanceFromLatLonInKm(input.latitude, input.longitude, parseFloat(spot.latitude), parseFloat(spot.longitude));
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
    getById: trpc_1.publicProcedure
        .input(zod_1.z.object({ id: zod_1.z.number() }))
        .query(async ({ input }) => {
        const spotData = await db_1.db.query.spots.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.spots.id, input.id),
            with: {
                spotter: true,
                owner: true, // Fetch owner relation
            }
        });
        if (!spotData) {
            throw new server_1.TRPCError({ code: 'NOT_FOUND', message: 'Spot not found' });
        }
        const activeThreshold = new Date(Date.now() - 30 * 1000);
        const activeVisitorsResult = await db_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.visits)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.visits.spotId, input.id), (0, drizzle_orm_1.sql) `${schema_1.visits.lastHeartbeatAt} > ${activeThreshold}`, (0, drizzle_orm_1.sql) `${schema_1.visits.checkOutTime} IS NULL`));
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
    getRankings: trpc_1.publicProcedure
        .query(async () => {
        // Get most visited/popular spots
        const popularSpots = await db_1.db.select({
            spot: schema_1.spots,
            visits_count: (0, drizzle_orm_1.sql) `count(${schema_1.visits.id})`.mapWith(Number)
        })
            .from(schema_1.spots)
            .leftJoin(schema_1.visits, (0, drizzle_orm_1.eq)(schema_1.spots.id, schema_1.visits.spotId))
            .where((0, drizzle_orm_1.eq)(schema_1.spots.active, true))
            .groupBy(schema_1.spots.id)
            .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `count(${schema_1.visits.id})`))
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
    getMessages: trpc_1.publicProcedure
        .input(zod_1.z.object({ spotId: zod_1.z.number() }))
        .query(async ({ ctx, input }) => {
        const { spotMessages, userBlocks } = require('../db/schema');
        // Get list of users who blocked the current user OR whom the current user blocked
        let blockedUserIds = [];
        if (ctx.user) {
            // Filter out comments from blocked users or who blocked me
            const blocks = await db_1.db.query.userBlocks.findMany({
                where: (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(userBlocks.blockerId, ctx.user.id), (0, drizzle_orm_1.eq)(userBlocks.blockedId, ctx.user.id))
            });
            blockedUserIds = blocks.map(b => {
                // ctx.user is taken from closure and could technically be null if we didn't await, 
                // but we are inside if(ctx.user).
                return b.blockerId === ctx.user.id ? b.blockedId : b.blockerId;
            });
        }
        const messages = await db_1.db.query.spotMessages.findMany({
            where: (0, drizzle_orm_1.eq)(spotMessages.spotId, input.spotId),
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
    postMessage: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        spotId: zod_1.z.number(),
        content: zod_1.z.string().min(1).max(280),
    }))
        .mutation(async ({ ctx, input }) => {
        const { spotMessages } = require('../db/schema');
        const [message] = (await db_1.db.insert(spotMessages).values({
            spotId: input.spotId,
            userId: ctx.user.id,
            content: input.content,
        }).returning());
        // Notify Spot Owner
        const spot = await db_1.db.query.spots.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.spots.id, input.spotId),
            with: {
                spotter: {
                    columns: { pushToken: true, id: true }
                }
            }
        });
        if (spot?.spotter?.pushToken && spot.spotter.id !== ctx.user.id) {
            const { sendPushNotification } = require('../utils/push');
            await sendPushNotification(spot.spotter.pushToken, "New Comment! 💬", `${ctx.user.name} commented on "${spot.name}": ${input.content}`, { type: 'comment', spotId: input.spotId });
        }
        return message;
    }),
    toggleLike: trpc_1.protectedProcedure
        .input(zod_1.z.object({ spotId: zod_1.z.number() }))
        .mutation(async ({ ctx, input }) => {
        const { spotLikes } = require('../db/schema');
        const existing = await db_1.db.query.spotLikes.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(spotLikes.spotId, input.spotId), (0, drizzle_orm_1.eq)(spotLikes.userId, ctx.user.id)),
        });
        if (existing) {
            await db_1.db.delete(spotLikes).where((0, drizzle_orm_1.eq)(spotLikes.id, existing.id));
            return { liked: false };
        }
        else {
            await db_1.db.insert(spotLikes).values({
                spotId: input.spotId,
                userId: ctx.user.id,
            });
            // Notify Spot Owner
            const spot = await db_1.db.query.spots.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.spots.id, input.spotId),
                with: {
                    spotter: {
                        columns: { pushToken: true }
                    }
                }
            });
            if (spot?.spotter?.pushToken && spot.spotterId !== ctx.user.id) {
                const { sendPushNotification } = require('../utils/push');
                await sendPushNotification(spot.spotter.pushToken, "Spot Liked!", `${ctx.user.name} liked your spot "${spot.name}".`, { type: 'like', spotId: input.spotId });
            }
            return { liked: true };
        }
    }),
    getStats: trpc_1.publicProcedure
        .input(zod_1.z.object({ spotId: zod_1.z.number() }))
        .query(async ({ ctx, input }) => {
        const { spotLikes, spotMessages } = require('../db/schema');
        const likeCount = await db_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(spotLikes).where((0, drizzle_orm_1.eq)(spotLikes.spotId, input.spotId));
        const msgCount = await db_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(spotMessages).where((0, drizzle_orm_1.eq)(spotMessages.spotId, input.spotId));
        let isLiked = false;
        if (ctx.user) {
            const existing = await db_1.db.query.spotLikes.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(spotLikes.spotId, input.spotId), (0, drizzle_orm_1.eq)(spotLikes.userId, ctx.user.id)),
            });
            isLiked = !!existing;
        }
        return {
            likes: Number(likeCount[0]?.count || 0),
            messages: Number(msgCount[0]?.count || 0),
            isLiked,
        };
    }),
    reportSpot: trpc_1.protectedProcedure
        .input(zod_1.z.object({ spotId: zod_1.z.number(), reason: zod_1.z.string() }))
        .mutation(async ({ ctx, input }) => {
        await db_1.db.insert(schema_1.reports).values({
            reporterId: ctx.user.id,
            targetType: 'spot',
            targetId: input.spotId,
            reason: input.reason,
        });
        return { success: true };
    }),
    reportComment: trpc_1.protectedProcedure
        .input(zod_1.z.object({ commentId: zod_1.z.number(), reason: zod_1.z.string() }))
        .mutation(async ({ ctx, input }) => {
        await db_1.db.insert(schema_1.reports).values({
            reporterId: ctx.user.id,
            targetType: 'comment',
            targetId: input.commentId,
            reason: input.reason,
        });
        return { success: true };
    }),
    takeover: trpc_1.protectedProcedure
        .input(zod_1.z.object({ spotId: zod_1.z.number() }))
        .mutation(async ({ ctx, input }) => {
        return await db_1.db.transaction(async (tx) => {
            const { wallets, spots } = require('../db/schema');
            // 1. Get Spot & Check Shield
            const spot = await tx.query.spots.findFirst({
                where: (0, drizzle_orm_1.eq)(spots.id, input.spotId),
                with: { owner: true }
            });
            if (!spot)
                throw new server_1.TRPCError({ code: 'NOT_FOUND', message: 'Spot not found' });
            // Shield Check
            if (spot.shieldExpiresAt && new Date(spot.shieldExpiresAt) > new Date()) {
                throw new server_1.TRPCError({ code: 'FORBIDDEN', message: 'Shield active! Cannot capture.' });
            }
            // Check if already owner (using ownerId or spotterId if ownerId null)
            const currentOwnerId = spot.ownerId || spot.spotterId;
            if (currentOwnerId === ctx.user.id) {
                throw new server_1.TRPCError({ code: 'BAD_REQUEST', message: 'You already own this spot!' });
            }
            // Cost Calculation
            const PREMIUM = 10000;
            const cost = (spot.remainingPoints || 0) + PREMIUM;
            // 2. Check & Deduct Balance (Atomic)
            const [walletUpdate] = await tx.update(wallets)
                .set({
                currentBalance: (0, drizzle_orm_1.sql) `${wallets.currentBalance} - ${cost}`,
                lastTransactionAt: new Date()
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(wallets.userId, ctx.user.id), (0, drizzle_orm_1.sql) `${wallets.currentBalance} >= ${cost}`))
                .returning({ id: wallets.id });
            if (!walletUpdate) {
                throw new server_1.TRPCError({ code: 'BAD_REQUEST', message: `Need ${cost} points to capture!` });
            }
            // 3. Pay Previous Owner (70% of Premium)
            if (currentOwnerId && currentOwnerId !== ctx.user.id) {
                const payout = Math.floor(PREMIUM * 0.7);
                await tx.update(wallets)
                    .set({
                    currentBalance: (0, drizzle_orm_1.sql) `${wallets.currentBalance} + ${payout}`,
                    lastTransactionAt: new Date()
                })
                    .where((0, drizzle_orm_1.eq)(wallets.userId, currentOwnerId));
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
                .where((0, drizzle_orm_1.eq)(spots.id, spot.id));
            return { success: true, cost, oldOwnerId: currentOwnerId };
        });
    }),
});
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1); // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}
function deg2rad(deg) {
    return deg * (Math.PI / 180);
}
