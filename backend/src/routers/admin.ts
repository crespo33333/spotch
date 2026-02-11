import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { users, spots, transactions, broadcasts, coupons, quests, spotMessages, visits } from "../db/schema";
import { TRPCError } from "@trpc/server";
import { eq, desc, sql, isNotNull, or, and } from "drizzle-orm";
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

    getAnalytics: protectedProcedure.query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const dailyStats = await Promise.all(days.map(async (date) => {
            const startOfDay = new Date(date);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const newUsers = await db.select({ count: sql<number>`count(*)` })
                .from(users)
                .where(and(
                    sql`${users.createdAt} >= ${startOfDay.toISOString()}`,
                    sql`${users.createdAt} <= ${endOfDay.toISOString()}`
                ));

            const activeVisits = await db.select({ count: sql<number>`count(*)` })
                .from(visits)
                .where(and(
                    sql`${visits.checkInTime} >= ${startOfDay.toISOString()}`,
                    sql`${visits.checkInTime} <= ${endOfDay.toISOString()}`
                ));

            return {
                date: date.slice(5),
                newUsers: Number(newUsers[0].count),
                activeVisits: Number(activeVisits[0].count)
            };
        }));

        return dailyStats;
    }),

    getAllUsers: protectedProcedure
        .input(z.object({ search: z.string().optional() }).optional())
        .query(async ({ ctx, input }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
            return await db.query.users.findMany({
                where: input?.search ?
                    or(
                        sql`${users.name} LIKE ${`%${input.search}%`}`,
                        sql`${users.id} = ${Number(input.search) || -1}`
                    ) : undefined,
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
        .input(z.object({ search: z.string().optional() }).optional())
        .query(async ({ ctx, input }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
            return await db.query.spots.findMany({
                where: input?.search ?
                    or(
                        sql`${spots.name} LIKE ${`%${input.search}%`}`,
                        sql`${spots.category} LIKE ${`%${input.search}%`}`
                    ) : undefined,
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
    // --- Moderation (Reports) ---
    getReports: protectedProcedure
        .input(z.object({ status: z.string().optional() }))
        .query(async ({ ctx, input }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
            const { reports } = require('../db/schema');

            const whereClause = input.status ? eq(reports.status, input.status) : undefined;

            const allReports = await db.query.reports.findMany({
                where: whereClause,
                with: {
                    reporter: true,
                },
                orderBy: [desc(reports.createdAt)],
                limit: 50,
            });

            // Enfich reports with target details
            const enrichedReports = await Promise.all(allReports.map(async (r) => {
                let targetDetails = null;
                if (r.targetType === 'user') {
                    targetDetails = await db.query.users.findFirst({ where: eq(users.id, r.targetId) });
                } else if (r.targetType === 'spot') {
                    targetDetails = await db.query.spots.findFirst({ where: eq(spots.id, r.targetId) });
                } else if (r.targetType === 'comment') {
                    targetDetails = await db.query.spotMessages.findFirst({
                        where: eq(spotMessages.id, r.targetId),
                        with: { user: true } // Author of the comment
                    });
                }
                return { ...r, targetDetails };
            }));

            return enrichedReports;
        }),

    resolveReport: protectedProcedure
        .input(z.object({
            id: z.number(),
            status: z.enum(['pending', 'resolved', 'dismissed']),
            action: z.enum(['none', 'ban_user', 'delete_content', 'delete_spot']).optional()
        }))
        .mutation(async ({ ctx, input }) => {
            if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
            const { reports } = require('../db/schema');

            // 1. Update Report Status
            await db.update(reports)
                .set({ status: input.status })
                .where(eq(reports.id, input.id));

            // 2. Perform Action (if any)
            if (input.action && input.action !== 'none') {
                const report = await db.query.reports.findFirst({ where: eq(reports.id, input.id) });
                if (!report) return { success: true, actionTaken: false };

                if (input.action === 'ban_user') {
                    // Target could be the user reported, or the author of the content
                    let userIdToBan = null;
                    if (report.targetType === 'user') userIdToBan = report.targetId;
                    else if (report.targetType === 'comment') {
                        const comment = await db.query.spotMessages.findFirst({ where: eq(spotMessages.id, report.targetId) });
                        if (comment) userIdToBan = comment.userId;
                    }
                    else if (report.targetType === 'spot') {
                        const spot = await db.query.spots.findFirst({ where: eq(spots.id, report.targetId) });
                        if (spot) userIdToBan = spot.ownerId || spot.spotterId;
                    }

                    if (userIdToBan) {
                        await db.update(users).set({ isBanned: true }).where(eq(users.id, userIdToBan));
                    }
                }
                else if (input.action === 'delete_content') {
                    if (report.targetType === 'comment') {
                        await db.delete(spotMessages).where(eq(spotMessages.id, report.targetId));
                    }
                }
                else if (input.action === 'delete_spot') {
                    if (report.targetType === 'spot') {
                        await db.delete(spots).where(eq(spots.id, report.targetId));
                    }
                }
            }

            return { success: true };
        }),
});
