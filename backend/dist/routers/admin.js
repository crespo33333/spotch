"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const trpc_1 = require("../trpc");
const zod_1 = require("zod");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const server_1 = require("@trpc/server");
const expo_server_sdk_1 = require("expo-server-sdk");
const expo = new expo_server_sdk_1.Expo();
exports.adminRouter = (0, trpc_1.router)({
    banUser: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        userId: zod_1.z.number(),
        ban: zod_1.z.boolean(),
    }))
        .mutation(async ({ ctx, input }) => {
        // Check if requester is admin
        const requester = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, ctx.user.id),
        });
        if (requester?.role !== 'admin') {
            throw new server_1.TRPCError({ code: 'UNAUTHORIZED', message: 'Admin access required' });
        }
        await db_1.db.update(schema_1.users)
            .set({ isBanned: input.ban })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, input.userId));
        return { success: true, message: `User ${input.ban ? 'banned' : 'unbanned'}` };
    }),
    broadcastNotification: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        title: zod_1.z.string(),
        body: zod_1.z.string(),
    }))
        .mutation(async ({ ctx, input }) => {
        // Check Admin
        const requester = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, ctx.user.id),
        });
        if (requester?.role !== 'admin') {
            throw new server_1.TRPCError({ code: 'UNAUTHORIZED', message: 'Admin access required' });
        }
        // Fetch all users with push tokens
        const allUsers = await db_1.db.query.users.findMany({
            where: (users, { isNotNull }) => isNotNull(users.pushToken),
        });
        const messages = [];
        for (const user of allUsers) {
            if (user.pushToken && expo_server_sdk_1.Expo.isExpoPushToken(user.pushToken)) {
                messages.push({
                    to: user.pushToken,
                    sound: 'default',
                    title: input.title,
                    body: input.body,
                    data: { type: 'broadcast' },
                });
            }
        }
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            try {
                await expo.sendPushNotificationsAsync(chunk);
            }
            catch (error) {
                console.error(error);
            }
        }
        return { success: true, count: messages.length };
    }),
    getStats: trpc_1.protectedProcedure
        .query(async ({ ctx }) => {
        const requester = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, ctx.user.id),
        });
        if (requester?.role !== 'admin') {
            throw new server_1.TRPCError({ code: 'UNAUTHORIZED', message: 'Admin access required' });
        }
        // This is a naive count. For production, use sql`count(*)`
        const allUsers = await db_1.db.query.users.findMany();
        const allSpots = await db_1.db.query.spots.findMany();
        return {
            userCount: allUsers.length,
            spotCount: allSpots.length,
        };
    }),
    deleteSpot: trpc_1.protectedProcedure
        .input(zod_1.z.object({ spotId: zod_1.z.number() }))
        .mutation(async ({ ctx, input }) => {
        const requester = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, ctx.user.id),
        });
        if (requester?.role !== 'admin') {
            throw new server_1.TRPCError({ code: 'UNAUTHORIZED', message: 'Admin access required' });
        }
        // Deactivate spot
        await db_1.db.update(schema_1.spots)
            .set({ active: false })
            .where((0, drizzle_orm_1.eq)(schema_1.spots.id, input.spotId));
        return { success: true };
    }),
    listUsers: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        limit: zod_1.z.number().min(1).max(100).default(50),
        offset: zod_1.z.number().default(0),
    }))
        .query(async ({ ctx, input }) => {
        const requester = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, ctx.user.id),
        });
        if (requester?.role !== 'admin') {
            throw new server_1.TRPCError({ code: 'UNAUTHORIZED', message: 'Admin access required' });
        }
        return await db_1.db.query.users.findMany({
            limit: input.limit,
            offset: input.offset,
            orderBy: (users, { desc }) => [desc(users.createdAt)],
        });
    }),
});
