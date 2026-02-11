"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const server_1 = require("@trpc/server");
const drizzle_orm_1 = require("drizzle-orm");
const expo_server_sdk_1 = require("expo-server-sdk");
const expo = new expo_server_sdk_1.Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
exports.adminRouter = (0, trpc_1.router)({
    getStats: trpc_1.protectedProcedure.query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
            throw new server_1.TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const userCount = await db_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.users);
        const spotCount = await db_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.spots);
        const transactionVolume = await db_1.db.select({ sum: (0, drizzle_orm_1.sql) `sum(amount)` }).from(schema_1.transactions);
        return {
            users: userCount[0].count,
            spots: spotCount[0].count,
            volume: transactionVolume[0].sum || 0,
        };
    }),
    getAnalytics: trpc_1.protectedProcedure.query(async ({ ctx }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();
        const dailyStats = await Promise.all(days.map(async (date) => {
            const startOfDay = new Date(date);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            const newUsers = await db_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${schema_1.users.createdAt} >= ${startOfDay.toISOString()}`, (0, drizzle_orm_1.sql) `${schema_1.users.createdAt} <= ${endOfDay.toISOString()}`));
            const activeVisits = await db_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.visits)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${schema_1.visits.checkInTime} >= ${startOfDay.toISOString()}`, (0, drizzle_orm_1.sql) `${schema_1.visits.checkInTime} <= ${endOfDay.toISOString()}`));
            return {
                date: date.slice(5),
                newUsers: Number(newUsers[0].count),
                activeVisits: Number(activeVisits[0].count)
            };
        }));
        return dailyStats;
    }),
    getAllUsers: trpc_1.protectedProcedure
        .input(zod_1.z.object({ search: zod_1.z.string().optional() }).optional())
        .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        return await db_1.db.query.users.findMany({
            where: input?.search ?
                (0, drizzle_orm_1.or)((0, drizzle_orm_1.sql) `${schema_1.users.name} LIKE ${`%${input.search}%`}`, (0, drizzle_orm_1.sql) `${schema_1.users.id} = ${Number(input.search) || -1}`) : undefined,
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.users.createdAt)],
            limit: 50,
        });
    }),
    toggleUserBan: trpc_1.protectedProcedure
        .input(zod_1.z.object({ userId: zod_1.z.number(), isBanned: zod_1.z.boolean() }))
        .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        await db_1.db.update(schema_1.users)
            .set({ isBanned: input.isBanned })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, input.userId));
        return { success: true };
    }),
    toggleUserPremium: trpc_1.protectedProcedure
        .input(zod_1.z.object({ userId: zod_1.z.number(), isPremium: zod_1.z.boolean() }))
        .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        await db_1.db.update(schema_1.users)
            .set({ isPremium: input.isPremium })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, input.userId));
        return { success: true };
    }),
    deleteSpot: trpc_1.protectedProcedure
        .input(zod_1.z.object({ spotId: zod_1.z.number() }))
        .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        await db_1.db.delete(schema_1.spots).where((0, drizzle_orm_1.eq)(schema_1.spots.id, input.spotId));
        return { success: true };
    }),
    broadcastPush: trpc_1.protectedProcedure
        .input(zod_1.z.object({ title: zod_1.z.string(), body: zod_1.z.string(), data: zod_1.z.any().optional() }))
        .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        const allPushes = await db_1.db.select({ token: schema_1.users.pushToken }).from(schema_1.users).where((0, drizzle_orm_1.isNotNull)(schema_1.users.pushToken));
        const tokens = allPushes.map(u => u.token).filter(t => expo_server_sdk_1.Expo.isExpoPushToken(t));
        // Save to Database
        await db_1.db.insert(schema_1.broadcasts).values({
            title: input.title,
            body: input.body,
            link: input.data?.url || null
        });
        if (tokens.length === 0)
            return { success: true, sent: 0 };
        const messages = tokens.map(token => ({
            to: token,
            sound: 'default',
            title: input.title,
            body: input.body,
            data: input.data
        }));
        const chunks = expo.chunkPushNotifications(messages);
        const errors = [];
        for (const chunk of chunks) {
            try {
                await expo.sendPushNotificationsAsync(chunk);
            }
            catch (error) {
                console.error("Push Error", error);
                errors.push(error);
            }
        }
        if (errors.length > 0) {
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to send to some devices. First error: ${errors[0]?.message || 'Unknown error'}`
            });
        }
        return { success: true, sent: tokens.length };
    }),
    sendPushToUser: trpc_1.protectedProcedure
        .input(zod_1.z.object({ userId: zod_1.z.number(), title: zod_1.z.string(), body: zod_1.z.string(), data: zod_1.z.any().optional() }))
        .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        const targetUser = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, input.userId),
        });
        if (!targetUser || !targetUser.pushToken) {
            throw new server_1.TRPCError({ code: "NOT_FOUND", message: "User not found or has no push token" });
        }
        if (!expo_server_sdk_1.Expo.isExpoPushToken(targetUser.pushToken)) {
            throw new server_1.TRPCError({ code: "BAD_REQUEST", message: "Invalid push token" });
        }
        try {
            const tickets = await expo.sendPushNotificationsAsync([{
                    to: targetUser.pushToken,
                    sound: 'default',
                    title: input.title,
                    body: input.body,
                    data: input.data
                }]);
            return { success: true, ticket: tickets[0] };
        }
        catch (error) {
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to send push: ${error.message}`
            });
        }
    }),
    listBroadcasts: trpc_1.protectedProcedure
        .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        return await db_1.db.query.broadcasts.findMany({
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.broadcasts.createdAt)],
            limit: 50,
        });
    }),
    updateBroadcast: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        id: zod_1.z.number(),
        title: zod_1.z.string(),
        body: zod_1.z.string(),
        link: zod_1.z.string().nullable().optional()
    }))
        .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        await db_1.db.update(schema_1.broadcasts)
            .set({
            title: input.title,
            body: input.body,
            link: input.link
        })
            .where((0, drizzle_orm_1.eq)(schema_1.broadcasts.id, input.id));
        return { success: true };
    }),
    deleteBroadcast: trpc_1.protectedProcedure
        .input(zod_1.z.object({ id: zod_1.z.number() }))
        .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        await db_1.db.delete(schema_1.broadcasts).where((0, drizzle_orm_1.eq)(schema_1.broadcasts.id, input.id));
        return { success: true };
    }),
    getAllSpots: trpc_1.protectedProcedure
        .input(zod_1.z.object({ search: zod_1.z.string().optional() }).optional())
        .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        return await db_1.db.query.spots.findMany({
            where: input?.search ?
                (0, drizzle_orm_1.or)((0, drizzle_orm_1.sql) `${schema_1.spots.name} LIKE ${`%${input.search}%`}`, (0, drizzle_orm_1.sql) `${schema_1.spots.category} LIKE ${`%${input.search}%`}`) : undefined,
            with: {
                spotter: true,
            },
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.spots.createdAt)],
            limit: 100,
        });
    }),
    getAllRedemptions: trpc_1.protectedProcedure
        .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        const { redemptions } = require('../db/schema'); // Lazy load to avoid circular dependency issues if any
        return await db_1.db.query.redemptions.findMany({
            with: {
                user: true,
                coupon: true,
            },
            orderBy: [(0, drizzle_orm_1.desc)(redemptions.redeemedAt)],
            limit: 100,
        });
    }),
    updateRedemptionStatus: trpc_1.protectedProcedure
        .input(zod_1.z.object({ id: zod_1.z.number(), status: zod_1.z.string() }))
        .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        const { redemptions } = require('../db/schema');
        await db_1.db.update(redemptions)
            .set({ status: input.status })
            .where((0, drizzle_orm_1.eq)(redemptions.id, input.id));
        return { success: true };
    }),
    // --- Coupons ---
    getAllCoupons: trpc_1.protectedProcedure
        .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        return await db_1.db.query.coupons.findMany({
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.coupons.createdAt)],
        });
    }),
    createCoupon: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        name: zod_1.z.string(),
        description: zod_1.z.string(),
        cost: zod_1.z.number(),
        type: zod_1.z.string(),
        stock: zod_1.z.number().nullable(),
    }))
        .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        const { coupons } = require('../db/schema');
        await db_1.db.insert(coupons).values(input);
        return { success: true };
    }),
    toggleCouponStatus: trpc_1.protectedProcedure
        .input(zod_1.z.object({ id: zod_1.z.number(), isActive: zod_1.z.boolean() }))
        .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        const { coupons } = require('../db/schema');
        await db_1.db.update(coupons)
            .set({ isActive: input.isActive })
            .where((0, drizzle_orm_1.eq)(coupons.id, input.id));
        return { success: true };
    }),
    // --- Quests ---
    getAllQuests: trpc_1.protectedProcedure
        .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        return await db_1.db.query.quests.findMany({
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.quests.createdAt)],
        });
    }),
    createQuest: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        rewardPoints: zod_1.z.number(),
        conditionType: zod_1.z.enum(['visit_count', 'friend_count', 'premium_status']),
        conditionValue: zod_1.z.number(),
    }))
        .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        const { quests } = require('../db/schema');
        await db_1.db.insert(quests).values(input);
        return { success: true };
    }),
    deleteQuest: trpc_1.protectedProcedure
        .input(zod_1.z.object({ id: zod_1.z.number() }))
        .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        const { quests } = require('../db/schema');
        await db_1.db.delete(quests).where((0, drizzle_orm_1.eq)(quests.id, input.id));
        return { success: true };
    }),
    // --- Content (Comments) ---
    getRecentComments: trpc_1.protectedProcedure
        .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        const { spotMessages } = require('../db/schema');
        return await db_1.db.query.spotMessages.findMany({
            with: {
                user: true,
                spot: true,
            },
            orderBy: [(0, drizzle_orm_1.desc)(spotMessages.createdAt)],
            limit: 50,
        });
    }),
    deleteComment: trpc_1.protectedProcedure
        .input(zod_1.z.object({ id: zod_1.z.number() }))
        .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        const { spotMessages } = require('../db/schema');
        await db_1.db.delete(spotMessages).where((0, drizzle_orm_1.eq)(spotMessages.id, input.id));
        return { success: true };
    }),
    // --- Moderation (Reports) ---
    getReports: trpc_1.protectedProcedure
        .input(zod_1.z.object({ status: zod_1.z.string().optional() }))
        .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        const { reports } = require('../db/schema');
        const whereClause = input.status ? (0, drizzle_orm_1.eq)(reports.status, input.status) : undefined;
        const allReports = await db_1.db.query.reports.findMany({
            where: whereClause,
            with: {
                reporter: true,
            },
            orderBy: [(0, drizzle_orm_1.desc)(reports.createdAt)],
            limit: 50,
        });
        // Enfich reports with target details
        const enrichedReports = await Promise.all(allReports.map(async (r) => {
            let targetDetails = null;
            if (r.targetType === 'user') {
                targetDetails = await db_1.db.query.users.findFirst({ where: (0, drizzle_orm_1.eq)(schema_1.users.id, r.targetId) });
            }
            else if (r.targetType === 'spot') {
                targetDetails = await db_1.db.query.spots.findFirst({ where: (0, drizzle_orm_1.eq)(schema_1.spots.id, r.targetId) });
            }
            else if (r.targetType === 'comment') {
                targetDetails = await db_1.db.query.spotMessages.findFirst({
                    where: (0, drizzle_orm_1.eq)(schema_1.spotMessages.id, r.targetId),
                    with: { user: true } // Author of the comment
                });
            }
            return { ...r, targetDetails };
        }));
        return enrichedReports;
    }),
    resolveReport: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        id: zod_1.z.number(),
        status: zod_1.z.enum(['pending', 'resolved', 'dismissed']),
        action: zod_1.z.enum(['none', 'ban_user', 'delete_content', 'delete_spot']).optional()
    }))
        .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        const { reports } = require('../db/schema');
        // 1. Update Report Status
        await db_1.db.update(reports)
            .set({ status: input.status })
            .where((0, drizzle_orm_1.eq)(reports.id, input.id));
        // 2. Perform Action (if any)
        if (input.action && input.action !== 'none') {
            const report = await db_1.db.query.reports.findFirst({ where: (0, drizzle_orm_1.eq)(reports.id, input.id) });
            if (!report)
                return { success: true, actionTaken: false };
            if (input.action === 'ban_user') {
                // Target could be the user reported, or the author of the content
                let userIdToBan = null;
                if (report.targetType === 'user')
                    userIdToBan = report.targetId;
                else if (report.targetType === 'comment') {
                    const comment = await db_1.db.query.spotMessages.findFirst({ where: (0, drizzle_orm_1.eq)(schema_1.spotMessages.id, report.targetId) });
                    if (comment)
                        userIdToBan = comment.userId;
                }
                else if (report.targetType === 'spot') {
                    const spot = await db_1.db.query.spots.findFirst({ where: (0, drizzle_orm_1.eq)(schema_1.spots.id, report.targetId) });
                    if (spot)
                        userIdToBan = spot.ownerId || spot.spotterId;
                }
                if (userIdToBan) {
                    await db_1.db.update(schema_1.users).set({ isBanned: true }).where((0, drizzle_orm_1.eq)(schema_1.users.id, userIdToBan));
                }
            }
            else if (input.action === 'delete_content') {
                if (report.targetType === 'comment') {
                    await db_1.db.delete(schema_1.spotMessages).where((0, drizzle_orm_1.eq)(schema_1.spotMessages.id, report.targetId));
                }
            }
            else if (input.action === 'delete_spot') {
                if (report.targetType === 'spot') {
                    await db_1.db.delete(schema_1.spots).where((0, drizzle_orm_1.eq)(schema_1.spots.id, report.targetId));
                }
            }
        }
        return { success: true };
    }),
});
