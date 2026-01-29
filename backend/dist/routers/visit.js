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
        // Calculate Points & XP (Scale based on spot's rate)
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
        // 2. Calculate Wallet Update (Only add if integer part increased)
        const walletAward = Math.floor(newEarned) - Math.floor(oldEarned);
        if (walletAward > 0) {
            await db_1.db.update(schema_1.wallets)
                .set({
                currentBalance: (0, drizzle_orm_1.sql) `${schema_1.wallets.currentBalance} + ${walletAward}`,
                lastTransactionAt: new Date()
            })
                .where((0, drizzle_orm_1.eq)(schema_1.wallets.userId, ctx.user.id));
            // Log Transaction (only for integer gains to avoid spamming tx history)
            await db_1.db.insert(schema_1.transactions).values({
                userId: ctx.user.id,
                amount: walletAward,
                type: 'earn',
                description: `Farmed at ${visit.spot.name}`
            });
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
            remainingPoints: (0, drizzle_orm_1.sql) `${schema_1.spots.remainingPoints} - ${increment}`, // Spot points also drain fractionally
            totalActivity: currentSpotActivity,
            spotLevel: newSpotLevel
        })
            .where((0, drizzle_orm_1.eq)(schema_1.spots.id, visit.spot.id));
        // 4. Update XP & Check Level Up
        const currentUser = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, ctx.user.id)
        });
        let newLevel = currentUser?.level || 1;
        let currentXp = (currentUser?.xp || 0) + Math.floor(xpIncrement * 10); // Use a multiplier for XP to avoid integer loss if xp is int
        // Actually XP is integer. Let's just track fractional XP in user table too?
        // For now, let's keep it simple: award 1 XP if increment > 0.5 or accumulated.
        // Better: just use integer for XP but scale it up if needed.
        // Let's assume XP is also fractional or just award 1 every few heartbeats.
        // Let's just award 1 XP every heartbeat for now, or match it.
        let earnedXp = Math.max(1, Math.floor(xpIncrement));
        let didLevelUp = false;
        const xpNeeded = newLevel * 100;
        const totalXp = (currentUser?.xp || 0) + earnedXp;
        if (totalXp >= xpNeeded) {
            newLevel += 1;
            currentXp = totalXp - xpNeeded;
            didLevelUp = true;
        }
        else {
            currentXp = totalXp;
        }
        await db_1.db.update(schema_1.users)
            .set({
            xp: currentXp,
            level: newLevel
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, ctx.user.id));
        return {
            earnedPoints: walletAward,
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
