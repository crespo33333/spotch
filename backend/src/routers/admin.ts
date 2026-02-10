import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { users, spots, transactions, broadcasts, coupons, quests, spotMessages } from "../db/schema";
import { TRPCError } from "@trpc/server";
import { eq, desc, sql, isNotNull } from "drizzle-orm";
import { Expo } from 'expo-server-sdk';

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

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

    toggleUserPremium: protectedProcedure
        .input(z.object({ userId: z.number(), isPremium: z.boolean() }))
        .mutation(async ({ ctx, input }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

            await db.update(users)
                .set({ isPremium: input.isPremium })
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

            // Save to Database
            await db.insert(broadcasts).values({
                title: input.title,
                body: input.body,
                link: input.data?.url || null
            });

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

    sendPushToUser: protectedProcedure
        .input(z.object({ userId: z.number(), title: z.string(), body: z.string(), data: z.any().optional() }))
        .mutation(async ({ ctx, input }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

            const targetUser = await db.query.users.findFirst({
                where: eq(users.id, input.userId),
            });

            if (!targetUser || !targetUser.pushToken) {
                throw new TRPCError({ code: "NOT_FOUND", message: "User not found or has no push token" });
            }

            if (!Expo.isExpoPushToken(targetUser.pushToken)) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid push token" });
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
            } catch (error: any) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to send push: ${error.message}`
                });
            }
        }),

    listBroadcasts: protectedProcedure
        .query(async ({ ctx }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
            return await db.query.broadcasts.findMany({
                orderBy: [desc(broadcasts.createdAt)],
                limit: 50,
            });
        }),

    updateBroadcast: protectedProcedure
        .input(z.object({
            id: z.number(),
            title: z.string(),
            body: z.string(),
            link: z.string().nullable().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
            await db.update(broadcasts)
                .set({
                    title: input.title,
                    body: input.body,
                    link: input.link
                })
                .where(eq(broadcasts.id, input.id));
            return { success: true };
        }),

    deleteBroadcast: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
            await db.delete(broadcasts).where(eq(broadcasts.id, input.id));
            return { success: true };
        }),

    getAllSpots: protectedProcedure
        .query(async ({ ctx }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
            return await db.query.spots.findMany({
                with: {
                    spotter: true,
                },
                orderBy: [desc(spots.createdAt)],
                limit: 100,
            });
        }),

    getAllRedemptions: protectedProcedure
        .query(async ({ ctx }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
            const { redemptions } = require('../db/schema'); // Lazy load to avoid circular dependency issues if any
            return await db.query.redemptions.findMany({
                with: {
                    user: true,
                    coupon: true,
                },
                orderBy: [desc(redemptions.redeemedAt)],
                limit: 100,
            });
        }),

    updateRedemptionStatus: protectedProcedure
        .input(z.object({ id: z.number(), status: z.string() }))
        .mutation(async ({ ctx, input }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
            const { redemptions } = require('../db/schema');
            await db.update(redemptions)
                .set({ status: input.status })
                .where(eq(redemptions.id, input.id));
            return { success: true };
        }),

    // --- Coupons ---
    getAllCoupons: protectedProcedure
        .query(async ({ ctx }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
            return await db.query.coupons.findMany({
                orderBy: [desc(coupons.createdAt)],
            });
        }),

    createCoupon: protectedProcedure
        .input(z.object({
            name: z.string(),
            description: z.string(),
            cost: z.number(),
            type: z.string(),
            stock: z.number().nullable(),
        }))
        .mutation(async ({ ctx, input }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
            const { coupons } = require('../db/schema');
            await db.insert(coupons).values(input);
            return { success: true };
        }),

    toggleCouponStatus: protectedProcedure
        .input(z.object({ id: z.number(), isActive: z.boolean() }))
        .mutation(async ({ ctx, input }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
            const { coupons } = require('../db/schema');
            await db.update(coupons)
                .set({ isActive: input.isActive })
                .where(eq(coupons.id, input.id));
            return { success: true };
        }),

    // --- Quests ---
    getAllQuests: protectedProcedure
        .query(async ({ ctx }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
            return await db.query.quests.findMany({
                orderBy: [desc(quests.createdAt)],
            });
        }),

    createQuest: protectedProcedure
        .input(z.object({
            title: z.string(),
            description: z.string(),
            rewardPoints: z.number(),
            conditionType: z.enum(['visit_count', 'friend_count', 'premium_status']),
            conditionValue: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
            const { quests } = require('../db/schema');
            await db.insert(quests).values(input);
            return { success: true };
        }),

    deleteQuest: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
            const { quests } = require('../db/schema');
            await db.delete(quests).where(eq(quests.id, input.id));
            return { success: true };
        }),

    // --- Content (Comments) ---
    getRecentComments: protectedProcedure
        .query(async ({ ctx }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
            const { spotMessages } = require('../db/schema');
            return await db.query.spotMessages.findMany({
                with: {
                    user: true,
                    spot: true,
                },
                orderBy: [desc(spotMessages.createdAt)],
                limit: 50,
            });
        }),

    deleteComment: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
            const { spotMessages } = require('../db/schema');
            await db.delete(spotMessages).where(eq(spotMessages.id, input.id));
            return { success: true };
        }),
});
