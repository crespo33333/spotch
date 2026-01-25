"use strict";
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
    }))
        .mutation(async ({ ctx, input }) => {
        // Check Balance
        const wallet = await db_1.db.query.wallets.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.wallets.userId, ctx.user.id),
        });
        if (!wallet || (wallet.currentBalance || 0) < input.totalPoints) {
            throw new server_1.TRPCError({ code: 'BAD_REQUEST', message: 'Insufficient funds' });
        }
        // Deduct Points
        await db_1.db.update(schema_1.wallets)
            .set({
            currentBalance: (0, drizzle_orm_1.sql) `${schema_1.wallets.currentBalance} - ${input.totalPoints}`,
            lastTransactionAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.wallets.id, wallet.id));
        await db_1.db.insert(schema_1.transactions).values({
            userId: ctx.user.id,
            amount: -input.totalPoints,
            type: 'spend',
            description: `Created spot: ${input.name}`,
        });
        // Create Spot
        const [spot] = await db_1.db.insert(schema_1.spots).values({
            spotterId: ctx.user.id,
            name: input.name,
            latitude: input.latitude.toString(), // Drizzle decimal is string in JS usually, checking docs... pg-core decimal maps to string
            longitude: input.longitude.toString(),
            totalPoints: input.totalPoints,
            remainingPoints: input.totalPoints,
            ratePerMinute: input.ratePerMinute,
            active: true,
        }).returning();
        return spot;
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
            }
        });
        if (!spotData) {
            throw new server_1.TRPCError({ code: 'NOT_FOUND', message: 'Spot not found' });
        }
        return {
            ...spotData,
            pointsPerMinute: spotData.ratePerMinute,
            spotter: spotData.spotter ? {
                id: spotData.spotter.id,
                name: spotData.spotter.name,
                avatar: spotData.spotter.avatar,
            } : null
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
        .query(async ({ input }) => {
        const { spotMessages } = require('../db/schema');
        return await db_1.db.query.spotMessages.findMany({
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
