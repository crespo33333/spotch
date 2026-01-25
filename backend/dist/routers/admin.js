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
    getAllUsers: trpc_1.protectedProcedure.query(async ({ ctx }) => {
        if (ctx.user.role !== "admin")
            throw new server_1.TRPCError({ code: "FORBIDDEN" });
        return await db_1.db.query.users.findMany({
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
});
