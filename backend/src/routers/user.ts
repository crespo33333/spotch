import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db';
import { users, wallets, transactions } from '../db/schema';
import { eq } from 'drizzle-orm';

export const userRouter = router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
        // In a real app, ctx.user would be populated. 
        // For now, we simulate finding a user by a simulated ID or just return first user
        // Since we lack real auth middleware yet, let's assume we pass userId in input for testing
        // BUT spec says getProfile. 
        // We will assume middleware sets ctx.user.id

        // Fallback for dev without full Auth
        if (!ctx.user) return null;

        const user = await db.query.users.findFirst({
            where: eq(users.id, ctx.user.id),
        });
        return user;
    }),

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
});
