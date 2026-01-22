import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db';
import { users, wallets, transactions, follows } from '../db/schema';
import { eq, and, ilike } from 'drizzle-orm';

export const userRouter = router({


    // Create or Update user from OAuth
    loginOrRegister: publicProcedure
        .input(z.object({
            openId: z.string(),
            email: z.string().email(),
            name: z.string(),
            avatar: z.string().default('default_seed'), // New: Accept avatar seed
            deviceId: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
            const existingUser = await db.query.users.findFirst({
                where: eq(users.openId, input.openId),
            });

            if (existingUser) {
                // Optional: Update avatar if changed? For now just return existing.
                return existingUser;
            }

            // Create new user
            const [newUser] = await db.insert(users).values({
                openId: input.openId,
                email: input.email,
                name: input.name,
                avatar: input.avatar,
                deviceId: input.deviceId,
            }).returning();

            // Initialize Wallet with 1000 points
            await db.insert(wallets).values({
                userId: newUser.id,
                currentBalance: 1000,
                lastTransactionAt: new Date(),
            });

            // Record Initial Transaction
            await db.insert(transactions).values({
                userId: newUser.id,
                amount: 1000,
                type: 'initial',
                description: 'Welcome bonus',
            });

            return newUser;
        }),

    updatePushToken: protectedProcedure
        .input(z.object({
            token: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            await db.update(users)
                .set({ pushToken: input.token })
                .where(eq(users.id, ctx.user!.id));
            return { success: true };
        }),

    follow: protectedProcedure
        .input(z.object({
            targetUserId: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            if (ctx.user.id === input.targetUserId) {
                throw new Error("Cannot follow yourself");
            }
            // Check if already follows
            const existing = await db.query.follows.findFirst({
                where: (follows, { and, eq }) => and(
                    eq(follows.followerId, ctx.user!.id),
                    eq(follows.followingId, input.targetUserId)
                ),
            });

            if (existing) return { success: true }; // Already following

            await db.insert(follows).values({
                followerId: ctx.user.id,
                followingId: input.targetUserId,
            });

            // Notify User
            const targetUser = await db.query.users.findFirst({
                where: eq(users.id, input.targetUserId),
                columns: { pushToken: true }
            });

            if (targetUser?.pushToken) {
                const { sendPushNotification } = require('../utils/push');
                await sendPushNotification(
                    targetUser.pushToken,
                    "New Follower!",
                    `${ctx.user.name} started following you.`,
                    { type: 'follow', userId: ctx.user.id }
                );
            }

            return { success: true };
        }),

    unfollow: protectedProcedure
        .input(z.object({
            targetUserId: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { and, eq } = require('drizzle-orm'); // Import locally or top level if possible, avoiding conflict
            await db.delete(follows)
                .where(and(
                    eq(follows.followerId, ctx.user!.id),
                    eq(follows.followingId, input.targetUserId)
                ));
            return { success: true };
        }),

    getProfile: protectedProcedure
        .input(z.object({ userId: z.number().optional() })) // Allow fetching other profiles
        .query(async ({ ctx, input }) => {
            const targetId = input.userId || ctx.user.id;

            const user = await db.query.users.findFirst({
                where: eq(users.id, targetId),
                with: {
                    followers: true,
                    following: true,
                    wallet: true,
                    visits: true,
                    messages: true,
                }
            });

            if (!user) return null;

            // Badge Logic
            const badges = [];
            if (user.id <= 10) badges.push({ id: 'pioneer', name: 'Pioneer', icon: '🥇', color: '#FEF9C3' });
            if ((user.wallet?.currentBalance || 0) >= 5000) badges.push({ id: 'wealthy', name: 'High Roller', icon: '💎', color: '#FCE7F3' });
            if (user.followers.length >= 5) badges.push({ id: 'socialite', name: 'Socialite', icon: '🔥', color: '#FFEDD5' });
            if (user.visits.length >= 10) badges.push({ id: 'explorer', name: 'Explorer', icon: '🌍', color: '#DBEAFE' });
            if (user.messages.length >= 10) badges.push({ id: 'chatterbox', name: 'Chatterbox', icon: '💬', color: '#F1F5F9' });

            return {
                ...user,
                followerCount: user.followers.length,
                followingCount: user.following.length,
                isFollowing: input.userId ? user.followers.some(f => f.followerId === ctx.user.id) : false,
                badges,
            };
        }),

    searchUsers: protectedProcedure
        .input(z.object({ query: z.string() }))
        .query(async ({ input }) => {
            const { ilike } = require('drizzle-orm');
            return await db.query.users.findMany({
                where: ilike(users.name, `%${input.query}%`),
                limit: 10,
            });
        }),
});
