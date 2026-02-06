import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db';
import { users, wallets, transactions, follows } from '../db/schema';
import { eq, and, ilike, sql } from 'drizzle-orm';

export const userRouter = router({


    // Create or Update user from OAuth
    loginOrRegister: publicProcedure
        .input(z.object({
            openId: z.string(),
            email: z.string().email(),
            name: z.string(),
            avatar: z.string().default('default_seed'), // New: Accept avatar seed
            deviceId: z.string().optional(),
            pushToken: z.string().optional(),
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
                pushToken: input.pushToken,
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

    updateProfile: protectedProcedure
        .input(z.object({
            name: z.string().min(2).max(50),
            bio: z.string().max(160).optional(),
            avatar: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            await db.update(users)
                .set({
                    name: input.name,
                    bio: input.bio,
                    avatar: input.avatar,
                })
                .where(eq(users.id, ctx.user.id));
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
                    userBadges: {
                        with: {
                            badge: true
                        }
                    }
                }
            });

            if (!user) return null;

            // Map DB badges to response format
            const badges = user.userBadges.map(ub => ({
                id: ub.badge.id,
                name: ub.badge.name,
                icon: ub.badge.icon,
                color: '#E0F2FE', // Default color, or add color to schema if needed. Using light blue for now.
                earnedAt: ub.earnedAt,
            }));

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
        .query(async ({ ctx, input }) => {
            const { ilike, eq, and } = require('drizzle-orm');

            const searchResults = await db.query.users.findMany({
                where: ilike(users.name, `%${input.query}%`),
                limit: 10,
                with: {
                    followers: true, // Fetch followers to check relationship
                }
            });

            return searchResults.map(user => ({
                id: user.id,
                name: user.name,
                avatar: user.avatar,
                isFollowing: user.followers.some(f => f.followerId === ctx.user.id),
            }));
        }),

    upgradeToPremium: protectedProcedure
        .mutation(async ({ ctx }) => {
            // Mock Payment Gateway Logic
            // In real app: Verify Stripe receipt

            await db.update(users)
                .set({ isPremium: true })
                .where(eq(users.id, ctx.user.id));

            // Award bonus points for upgrading?
            await db.insert(transactions).values({
                userId: ctx.user.id,
                amount: 500,
                type: 'earn',
                description: 'Premium Upgrade Bonus',
            });
            await db.update(wallets)
                .set({ currentBalance: sql`${wallets.currentBalance} + 500` })
                .where(eq(wallets.userId, ctx.user.id));

            return { success: true };
        }),
});

