
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db';
import { users, spots } from '../db/schema';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

export const adminRouter = router({
    banUser: protectedProcedure
        .input(z.object({
            userId: z.number(),
            ban: z.boolean(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Check if requester is admin
            const requester = await db.query.users.findFirst({
                where: eq(users.id, ctx.user.id),
            });

            if (requester?.role !== 'admin') {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Admin access required' });
            }

            await db.update(users)
                .set({ isBanned: input.ban })
                .where(eq(users.id, input.userId));

            return { success: true, message: `User ${input.ban ? 'banned' : 'unbanned'}` };
        }),

    broadcastNotification: protectedProcedure
        .input(z.object({
            title: z.string(),
            body: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Check Admin
            const requester = await db.query.users.findFirst({
                where: eq(users.id, ctx.user.id),
            });
            if (requester?.role !== 'admin') {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Admin access required' });
            }

            // Fetch all users with push tokens
            const allUsers = await db.query.users.findMany({
                where: (users, { isNotNull }) => isNotNull(users.pushToken),
            });

            const messages: any[] = [];
            for (const user of allUsers) {
                if (user.pushToken && Expo.isExpoPushToken(user.pushToken)) {
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
                } catch (error) {
                    console.error(error);
                }
            }

            return { success: true, count: messages.length };
        }),

    getStats: protectedProcedure
        .query(async ({ ctx }) => {
            const requester = await db.query.users.findFirst({
                where: eq(users.id, ctx.user.id),
            });
            if (requester?.role !== 'admin') {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Admin access required' });
            }

            // This is a naive count. For production, use sql`count(*)`
            const allUsers = await db.query.users.findMany();
            const allSpots = await db.query.spots.findMany();

            return {
                userCount: allUsers.length,
                spotCount: allSpots.length,
            };
        }),

    deleteSpot: protectedProcedure
        .input(z.object({ spotId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const requester = await db.query.users.findFirst({
                where: eq(users.id, ctx.user.id),
            });
            if (requester?.role !== 'admin') {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Admin access required' });
            }

            // Deactivate spot
            await db.update(spots)
                .set({ active: false })
                .where(eq(spots.id, input.spotId));

            return { success: true };
        }),

    listUsers: protectedProcedure
        .input(z.object({
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().default(0),
        }))
        .query(async ({ ctx, input }) => {
            const requester = await db.query.users.findFirst({
                where: eq(users.id, ctx.user.id),
            });
            if (requester?.role !== 'admin') {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Admin access required' });
            }

            return await db.query.users.findMany({
                limit: input.limit,
                offset: input.offset,
                orderBy: (users, { desc }) => [desc(users.createdAt)],
            });
        }),
});
