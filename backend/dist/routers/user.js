"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const trpc_1 = require("../trpc");
const zod_1 = require("zod");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
exports.userRouter = (0, trpc_1.router)({
    // Create or Update user from OAuth
    loginOrRegister: trpc_1.publicProcedure
        .input(zod_1.z.object({
        openId: zod_1.z.string(),
        email: zod_1.z.string().email(),
        name: zod_1.z.string(),
        avatar: zod_1.z.string().default('default_seed'), // New: Accept avatar seed
        deviceId: zod_1.z.string().optional(),
        pushToken: zod_1.z.string().optional(),
    }))
        .mutation(async ({ input }) => {
        const existingUser = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.openId, input.openId),
        });
        if (existingUser) {
            // Optional: Update avatar if changed? For now just return existing.
            return existingUser;
        }
        // Create new user
        const [newUser] = await db_1.db.insert(schema_1.users).values({
            openId: input.openId,
            email: input.email,
            name: input.name,
            avatar: input.avatar,
            deviceId: input.deviceId,
            pushToken: input.pushToken,
        }).returning();
        // Initialize Wallet with 1000 points
        await db_1.db.insert(schema_1.wallets).values({
            userId: newUser.id,
            currentBalance: 1000,
            lastTransactionAt: new Date(),
        });
        // Record Initial Transaction
        await db_1.db.insert(schema_1.transactions).values({
            userId: newUser.id,
            amount: 1000,
            type: 'initial',
            description: 'Welcome bonus',
        });
        return newUser;
    }),
    updatePushToken: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        token: zod_1.z.string(),
    }))
        .mutation(async ({ ctx, input }) => {
        await db_1.db.update(schema_1.users)
            .set({ pushToken: input.token })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, ctx.user.id));
        return { success: true };
    }),
    follow: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        targetUserId: zod_1.z.number(),
    }))
        .mutation(async ({ ctx, input }) => {
        if (ctx.user.id === input.targetUserId) {
            throw new Error("Cannot follow yourself");
        }
        // Check if already follows
        const existing = await db_1.db.query.follows.findFirst({
            where: (follows, { and, eq }) => and(eq(follows.followerId, ctx.user.id), eq(follows.followingId, input.targetUserId)),
        });
        if (existing)
            return { success: true }; // Already following
        await db_1.db.insert(schema_1.follows).values({
            followerId: ctx.user.id,
            followingId: input.targetUserId,
        });
        // Notify User
        const targetUser = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, input.targetUserId),
            columns: { pushToken: true }
        });
        if (targetUser?.pushToken) {
            const { sendPushNotification } = require('../utils/push');
            await sendPushNotification(targetUser.pushToken, "New Follower!", `${ctx.user.name} started following you.`, { type: 'follow', userId: ctx.user.id });
        }
        return { success: true };
    }),
    unfollow: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        targetUserId: zod_1.z.number(),
    }))
        .mutation(async ({ ctx, input }) => {
        const { and, eq } = require('drizzle-orm'); // Import locally or top level if possible, avoiding conflict
        await db_1.db.delete(schema_1.follows)
            .where(and(eq(schema_1.follows.followerId, ctx.user.id), eq(schema_1.follows.followingId, input.targetUserId)));
        return { success: true };
    }),
    getProfile: trpc_1.protectedProcedure
        .input(zod_1.z.object({ userId: zod_1.z.number().optional() })) // Allow fetching other profiles
        .query(async ({ ctx, input }) => {
        const targetId = input.userId || ctx.user.id;
        const user = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, targetId),
            with: {
                followers: true,
                following: true,
                wallet: true,
                visits: true,
                messages: true,
            }
        });
        if (!user)
            return null;
        // Badge Logic
        const badges = [];
        if (user.id <= 10)
            badges.push({ id: 'pioneer', name: 'Pioneer', icon: '🥇', color: '#FEF9C3' });
        if (user.isPremium)
            badges.push({ id: 'premium', name: 'Premium', icon: '💎', color: '#E0F2FE' }); // Blue-ish
        if ((user.wallet?.currentBalance || 0) >= 5000)
            badges.push({ id: 'wealthy', name: 'High Roller', icon: '💰', color: '#FCE7F3' });
        if (user.followers.length >= 5)
            badges.push({ id: 'socialite', name: 'Socialite', icon: '🔥', color: '#FFEDD5' });
        if (user.visits.length >= 10)
            badges.push({ id: 'explorer', name: 'Explorer', icon: '🌍', color: '#DBEAFE' });
        if (user.messages.length >= 10)
            badges.push({ id: 'chatterbox', name: 'Chatterbox', icon: '💬', color: '#F1F5F9' });
        return {
            ...user,
            followerCount: user.followers.length,
            followingCount: user.following.length,
            isFollowing: input.userId ? user.followers.some(f => f.followerId === ctx.user.id) : false,
            badges,
        };
    }),
    searchUsers: trpc_1.protectedProcedure
        .input(zod_1.z.object({ query: zod_1.z.string() }))
        .query(async ({ input }) => {
        const { ilike } = require('drizzle-orm');
        return await db_1.db.query.users.findMany({
            where: ilike(schema_1.users.name, `%${input.query}%`),
            limit: 10,
        });
    }),
    upgradeToPremium: trpc_1.protectedProcedure
        .mutation(async ({ ctx }) => {
        // Mock Payment Gateway Logic
        // In real app: Verify Stripe receipt
        await db_1.db.update(schema_1.users)
            .set({ isPremium: true })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, ctx.user.id));
        // Award bonus points for upgrading?
        await db_1.db.insert(schema_1.transactions).values({
            userId: ctx.user.id,
            amount: 500,
            type: 'earn',
            description: 'Premium Upgrade Bonus',
        });
        await db_1.db.update(schema_1.wallets)
            .set({ currentBalance: (0, drizzle_orm_1.sql) `${schema_1.wallets.currentBalance} + 500` })
            .where((0, drizzle_orm_1.eq)(schema_1.wallets.userId, ctx.user.id));
        return { success: true };
    }),
});
