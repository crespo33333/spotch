"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const trpc_1 = require("../trpc");
const zod_1 = require("zod");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
exports.userRouter = (0, trpc_1.router)({
    getProfile: trpc_1.protectedProcedure.query(async ({ ctx }) => {
        // In a real app, ctx.user would be populated. 
        // For now, we simulate finding a user by a simulated ID or just return first user
        // Since we lack real auth middleware yet, let's assume we pass userId in input for testing
        // BUT spec says getProfile. 
        // We will assume middleware sets ctx.user.id
        // Fallback for dev without full Auth
        if (!ctx.user)
            return null;
        const user = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, ctx.user.id),
        });
        return user;
    }),
    // Create or Update user from OAuth
    loginOrRegister: trpc_1.publicProcedure
        .input(zod_1.z.object({
        openId: zod_1.z.string(),
        email: zod_1.z.string().email(),
        name: zod_1.z.string(),
        avatar: zod_1.z.string().default('default_seed'), // New: Accept avatar seed
        deviceId: zod_1.z.string().optional(),
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
});
