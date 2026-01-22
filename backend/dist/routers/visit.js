"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visitRouter = void 0;
const trpc_1 = require("../trpc");
const zod_1 = require("zod");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const server_1 = require("@trpc/server");
exports.visitRouter = (0, trpc_1.router)({
    checkIn: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        spotId: zod_1.z.number(),
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
    }))
        .mutation(async ({ ctx, input }) => {
        const spot = await db_1.db.query.spots.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.spots.id, input.spotId),
        });
        if (!spot || !spot.active) {
            throw new server_1.TRPCError({ code: 'NOT_FOUND', message: 'Spot not found or inactive' });
        }
        // Verify Distance
        const dist = getDistanceFromLatLonInKm(input.latitude, input.longitude, parseFloat(spot.latitude), parseFloat(spot.longitude));
        if (dist > 0.1) { // 100 meters tolerance
            throw new server_1.TRPCError({ code: 'BAD_REQUEST', message: 'Too far from spot' });
        }
        const [visit] = await db_1.db.insert(schema_1.visits).values({
            spotId: spot.id,
            getterId: ctx.user.id,
            checkInTime: new Date(),
            earnedPoints: 0,
        }).returning();
        return visit;
    }),
    checkout: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        visitId: zod_1.z.number()
    }))
        .mutation(async ({ ctx, input }) => {
        await db_1.db.update(schema_1.visits)
            .set({ checkOutTime: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.visits.id, input.visitId), (0, drizzle_orm_1.eq)(schema_1.visits.getterId, ctx.user.id)));
        return { success: true };
    }),
    // Called every minute by client to claim points
    heartbeat: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        visitId: zod_1.z.number(),
    }))
        .mutation(async ({ ctx, input }) => {
        const visit = await db_1.db.query.visits.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.visits.id, input.visitId),
            with: {
                spot: true
            }
        });
        if (!visit || !visit.spot || !visit.spot.active) {
            throw new Error('Invalid visit session');
        }
        // Calculate Points & XP (Scale based on spot's rate)
        // If rate is 100 P/min, a 5s heartbeat should give ~8 points (100 / 12).
        const ratePerMin = visit.spot.ratePerMinute || 10;
        const earnedAmount = Math.max(1, Math.floor(ratePerMin / 12));
        const earnedXp = Math.max(1, Math.floor(earnedAmount / 2));
        // 1. Update Spot Activity & Level Up
        const currentSpot = await db_1.db.query.spots.findFirst({ where: (0, drizzle_orm_1.eq)(schema_1.spots.id, visit.spot.id) });
        let newSpotLevel = currentSpot?.spotLevel || 1;
        let currentSpotActivity = (currentSpot?.totalActivity || 0) + 1;
        // Spot levels up every 500 activity units
        if (currentSpotActivity >= newSpotLevel * 500) {
            newSpotLevel += 1;
        }
        await db_1.db.update(schema_1.spots)
            .set({
            remainingPoints: (0, drizzle_orm_1.sql) `${schema_1.spots.remainingPoints} - ${earnedAmount}`,
            totalActivity: currentSpotActivity,
            spotLevel: newSpotLevel
        })
            .where((0, drizzle_orm_1.eq)(schema_1.spots.id, visit.spot.id));
        // 2. Add to User Wallet
        await db_1.db.update(schema_1.wallets)
            .set({
            currentBalance: (0, drizzle_orm_1.sql) `${schema_1.wallets.currentBalance} + ${earnedAmount}`,
            lastTransactionAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.wallets.userId, ctx.user.id));
        // 3. Add XP & Check Level Up
        const currentUser = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, ctx.user.id)
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
        await db_1.db.update(schema_1.users)
            .set({
            xp: currentXp,
            level: newLevel
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, ctx.user.id));
        // 4. Log Transaction
        await db_1.db.insert(schema_1.transactions).values({
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
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);
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
