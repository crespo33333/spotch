import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { users, spots, transactions } from "../db/schema";
import { TRPCError } from "@trpc/server";
import { eq, desc, sql, isNotNull } from "drizzle-orm";
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

export const adminRouter = router({
    getStats: protectedProcedure.query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }

        const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
        const spotCount = await db.select({ count: sql<number>`count(*)` }).from(spots);
        const transactionVolume = await db.select({ sum: sql<number>`sum(amount)` }).from(transactions);

        return {
            users: userCount[0].count,
            spots: spotCount[0].count,
            volume: transactionVolume[0].sum || 0,
        };
    }),

    getAllUsers: protectedProcedure.query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return await db.query.users.findMany({
            orderBy: [desc(users.createdAt)],
            limit: 50,
        });
    }),

    toggleUserBan: protectedProcedure
        .input(z.object({ userId: z.number(), isBanned: z.boolean() }))
        .mutation(async ({ ctx, input }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

            await db.update(users)
                .set({ isBanned: input.isBanned })
                .where(eq(users.id, input.userId));

            return { success: true };
        }),

    deleteSpot: protectedProcedure
        .input(z.object({ spotId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

            await db.delete(spots).where(eq(spots.id, input.spotId));
            return { success: true };
        }),

    broadcastPush: protectedProcedure
        .input(z.object({ title: z.string(), body: z.string(), data: z.any().optional() }))
        .mutation(async ({ ctx, input }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

            const allPushes = await db.select({ token: users.pushToken }).from(users).where(isNotNull(users.pushToken));
            const tokens = allPushes.map(u => u.token!).filter(t => Expo.isExpoPushToken(t));

            if (tokens.length === 0) return { success: true, sent: 0 };

            const messages = tokens.map(token => ({
                to: token,
                sound: 'default',
                title: input.title,
                body: input.body,
                data: input.data
            }));

            const chunks = expo.chunkPushNotifications(messages);
            const errors: any[] = [];

            for (const chunk of chunks) {
                try {
                    await expo.sendPushNotificationsAsync(chunk);
                } catch (error) {
                    console.error("Push Error", error);
                    errors.push(error);
                }
            }

            if (errors.length > 0) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to send to some devices. First error: ${errors[0]?.message || 'Unknown error'}`
                });
            }

            return { success: true, sent: tokens.length };
        }),
});
