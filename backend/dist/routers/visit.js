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
        // Close any existing active visits for this user (Enforce 1 active visit)
        await db_1.db.update(schema_1.visits)
            .set({ checkOutTime: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.visits.getterId, ctx.user.id), (0, drizzle_orm_1.sql) `${schema_1.visits.checkOutTime} IS NULL`));
        const [visit] = await db_1.db.insert(schema_1.visits).values({
            spotId: spot.id,
            getterId: ctx.user.id,
            checkInTime: new Date(),
            earnedPoints: '0',
        }).returning();
        // --- Quest Logic: Update "Visit" Quests ---
        const activeQuests = await db_1.db.select().from(schema_1.userQuests)
            .leftJoin(schema_1.quests, (0, drizzle_orm_1.eq)(schema_1.userQuests.questId, schema_1.quests.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userQuests.userId, ctx.user.id), (0, drizzle_orm_1.eq)(schema_1.userQuests.status, 'in_progress'), (0, drizzle_orm_1.eq)(schema_1.quests.conditionType, 'visit_count')));
        for (const { user_quests: uq, quests: q } of activeQuests) {
            if (!uq || !q)
                continue;
            const newProgress = (uq.progress || 0) + 1;
            let updates = { progress: newProgress };
            if (newProgress >= q.conditionValue) {
                updates.status = 'completed';
                updates.completedAt = new Date();
                await db_1.db.insert(schema_1.transactions).values({
                    userId: ctx.user.id,
                    amount: q.rewardPoints,
                    type: 'earn',
                    description: `Completed Quest: ${q.title}`
                });
                await db_1.db.update(schema_1.wallets)
                    .set({ currentBalance: (0, drizzle_orm_1.sql) `${schema_1.wallets.currentBalance} + ${q.rewardPoints}` })
                    .where((0, drizzle_orm_1.eq)(schema_1.wallets.userId, ctx.user.id));
            }
            await db_1.db.update(schema_1.userQuests).set(updates).where((0, drizzle_orm_1.eq)(schema_1.userQuests.id, uq.id));
        }
        // ------------------------------------------
        // Gamification: Award XP for Check-In
        const { addXp: addXpUtils, checkBadgeUnlock } = await Promise.resolve().then(() => __importStar(require('../utils/gamification')));
        await addXpUtils(ctx.user.id, 50);
        await checkBadgeUnlock(ctx.user.id, 'visits');
        return visit;
    }),
    // Check for Quests (Visit Type) => This logic could be shared
    checkQuestProgress: trpc_1.protectedProcedure
        .mutation(async ({ ctx }) => {
        // Find active "Visit" quests
        const activeQuests = await db_1.db.select().from(schema_1.userQuests)
            .leftJoin(schema_1.quests, (0, drizzle_orm_1.eq)(schema_1.userQuests.questId, schema_1.quests.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userQuests.userId, ctx.user.id), (0, drizzle_orm_1.eq)(schema_1.userQuests.status, 'in_progress'), (0, drizzle_orm_1.eq)(schema_1.quests.conditionType, 'visit_count')));
        for (const { user_quests: uq, quests: q } of activeQuests) {
            if (!uq || !q)
                continue;
            const newProgress = (uq.progress || 0) + 1;
            let updates = { progress: newProgress };
            // Complete Quest
            if (newProgress >= q.conditionValue) {
                updates.status = 'completed';
                updates.completedAt = new Date();
                // Award Reward
                await db_1.db.insert(schema_1.transactions).values({
                    userId: ctx.user.id,
                    amount: q.rewardPoints,
                    type: 'earn',
                    description: `Completed Quest: ${q.title}`
                });
                await db_1.db.update(schema_1.wallets)
                    .set({ currentBalance: (0, drizzle_orm_1.sql) `${schema_1.wallets.currentBalance} + ${q.rewardPoints}` })
                    .where((0, drizzle_orm_1.eq)(schema_1.wallets.userId, ctx.user.id));
            }
            await db_1.db.update(schema_1.userQuests)
                .set(updates)
                .where((0, drizzle_orm_1.eq)(schema_1.userQuests.id, uq.id));
        }
        return { success: true };
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
        // 0. Update Heartbeat Timestamp (Alive Check)
        await db_1.db.update(schema_1.visits)
            .set({ lastHeartbeatAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.visits.id, visit.id));
        // Check Budget / Depletion
        if ((visit.spot.remainingPoints || 0) <= 0) {
            // Mark spot inactive if not already
            if (visit.spot.active) {
                await db_1.db.update(schema_1.spots).set({ active: false }).where((0, drizzle_orm_1.eq)(schema_1.spots.id, visit.spot.id));
            }
            throw new server_1.TRPCError({ code: 'PRECONDITION_FAILED', message: 'Spot depleted' });
        }
        // Calculate Points & XP (Fixed Rate per User)
        // Heartbeats happen every 5 seconds. 60 / 5 = 12 heartbeats per minute.
        const ratePerMin = visit.spot.ratePerMinute || 10;
        const increment = ratePerMin / 12; // Fractional increment
        const xpIncrement = increment / 2;
        // 1. Update Visit Record (Accumulate fractional points)
        const oldEarned = parseFloat(visit.earnedPoints || '0');
        const newEarned = oldEarned + increment;
        await db_1.db.update(schema_1.visits)
            .set({ earnedPoints: newEarned.toString() })
            .where((0, drizzle_orm_1.eq)(schema_1.visits.id, visit.id));
        // 2. Update remaining points (Drain budget)
        await db_1.db.update(schema_1.spots)
            .set({ remainingPoints: (0, drizzle_orm_1.sql) `${schema_1.spots.remainingPoints} - ${increment}` })
            .where((0, drizzle_orm_1.eq)(schema_1.spots.id, visit.spot.id));
        // 3. Calculate Wallet Update (Only add if integer part increased)
        const walletAward = Math.floor(newEarned) - Math.floor(oldEarned);
        if (walletAward > 0) {
            // Check for Owner & Tax
            const currentSpot = await db_1.db.query.spots.findFirst({ where: (0, drizzle_orm_1.eq)(schema_1.spots.id, visit.spot.id) }); // Re-fetch to get latest owner
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
                    await db_1.db.update(schema_1.wallets)
                        .set({
                        currentBalance: (0, drizzle_orm_1.sql) `${schema_1.wallets.currentBalance} + ${taxAmount}`,
                        lastTransactionAt: new Date()
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.wallets.userId, ownerId));
                    await db_1.db.insert(schema_1.transactions).values({
                        userId: ownerId,
                        amount: taxAmount,
                        type: 'earn',
                        description: `Tax collected from ${visit.spot.name}`
                    });
                }
            }
            // Pay Worker (User)
            if (userGain > 0) {
                await db_1.db.update(schema_1.wallets)
                    .set({
                    currentBalance: (0, drizzle_orm_1.sql) `${schema_1.wallets.currentBalance} + ${userGain}`,
                    lastTransactionAt: new Date()
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.wallets.userId, ctx.user.id));
                // Log Transaction
                await db_1.db.insert(schema_1.transactions).values({
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
            await db_1.db.insert(weeklySpotPoints).values({
                spotId: visit.spot.id,
                userId: ctx.user.id,
                points: walletAward,
                weekStart: weekStart,
            }).onConflictDoUpdate({
                target: [weeklySpotPoints.spotId, weeklySpotPoints.userId, weeklySpotPoints.weekStart],
                set: { points: (0, drizzle_orm_1.sql) `${weeklySpotPoints.points} + ${walletAward}` }
            });
            // --------------------------------------
        }
        // 3. Update Spot Activity & Level Up
        const currentSpot = await db_1.db.query.spots.findFirst({ where: (0, drizzle_orm_1.eq)(schema_1.spots.id, visit.spot.id) });
        let newSpotLevel = currentSpot?.spotLevel || 1;
        let currentSpotActivity = (currentSpot?.totalActivity || 0) + 1;
        if (currentSpotActivity >= newSpotLevel * 500) {
            newSpotLevel += 1;
        }
        await db_1.db.update(schema_1.spots)
            .set({
            totalActivity: currentSpotActivity,
            spotLevel: newSpotLevel
        })
            .where((0, drizzle_orm_1.eq)(schema_1.spots.id, visit.spot.id));
        // 4. Update XP & Check Level Up via Utils
        const { addXp, checkBadgeUnlock } = await Promise.resolve().then(() => __importStar(require('../utils/gamification')));
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
