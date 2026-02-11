"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRouter = void 0;
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const server_1 = require("@trpc/server");
const stripe_1 = __importDefault(require("stripe"));
const drizzle_orm_1 = require("drizzle-orm");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
    apiVersion: "2023-10-16", // Downgrade to stable API version if needed, or keep latest
});
exports.paymentRouter = (0, trpc_1.router)({
    createPaymentIntent: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        amount: zod_1.z.number().min(100), // in cents ($1.00 min)
        points: zod_1.z.number().min(100)
    }))
        .mutation(async ({ ctx, input }) => {
        console.log(`[Stripe] Creating PaymentIntent for User: ${ctx.user.id}, Amount: ${input.amount}, Points: ${input.points}`);
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: input.amount,
                currency: "jpy", // Changed to JPY as requested/indicated by merchant country
                automatic_payment_methods: { enabled: true },
                metadata: {
                    userId: ctx.user.id.toString(),
                    points: input.points.toString(),
                },
            });
            console.log(`[Stripe] PaymentIntent created successfully: ${paymentIntent.id}`);
            return {
                clientSecret: paymentIntent.client_secret,
            };
        }
        catch (error) {
            console.error(`[Stripe] Error creating PaymentIntent:`, error);
            throw new server_1.TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error.message,
            });
        }
    }),
    // Simplified: Award points on confirmation (webhook is better for production)
    confirmPurchase: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        paymentIntentId: zod_1.z.string(),
        points: zod_1.z.number()
    }))
        .mutation(async ({ ctx, input }) => {
        // In production, you would verify the paymentIntent status with Stripe here
        // For MVP/Demo, we assume the client confirmed successful payment
        const paymentIntentId = input.paymentIntentId;
        // Mock Mode Check
        if (paymentIntentId.startsWith('pi_mock_')) {
            // Skip Stripe verification for mock IDs
        }
        else {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            if (paymentIntent.status !== 'succeeded') {
                throw new server_1.TRPCError({ code: "BAD_REQUEST", message: "Payment not successful" });
            }
        }
        // Start transaction to award points
        return await db_1.db.transaction(async (tx) => {
            // Award Points
            await tx.insert(schema_1.wallets).values({
                userId: ctx.user.id,
                currentBalance: input.points
            }).onConflictDoUpdate({
                target: [schema_1.wallets.userId],
                set: { currentBalance: (0, drizzle_orm_1.sql) `${schema_1.wallets.currentBalance} + ${input.points}` }
            });
            // Log Transaction
            await tx.insert(schema_1.transactions).values({
                userId: ctx.user.id,
                amount: input.points,
                type: 'earn',
                description: `Point Purchase ($${input.paymentIntentId.startsWith('pi_mock_') ? 'Mock' : 'Real'})`,
            });
            return { success: true };
        });
    }),
    createSubscription: trpc_1.protectedProcedure
        .input(zod_1.z.object({ priceId: zod_1.z.string() }))
        .mutation(async ({ input, ctx }) => {
        const user = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, ctx.user.id),
        });
        if (!user)
            throw new server_1.TRPCError({ code: "NOT_FOUND" });
        // In real production, we'd use Stripe to create a subscription
        await db_1.db.update(schema_1.users)
            .set({ isPremium: true })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, ctx.user.id));
        return { success: true, message: "Subscription active (Mock Mode)" };
    }),
    cancelSubscription: trpc_1.protectedProcedure
        .mutation(async ({ ctx }) => {
        await db_1.db.update(schema_1.users)
            .set({ isPremium: false })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, ctx.user.id));
        return { success: true };
    }),
    verifyIAPReceipt: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        receipt: zod_1.z.string(),
        platform: zod_1.z.enum(['ios', 'android']),
        productId: zod_1.z.string(),
    }))
        .mutation(async ({ ctx, input }) => {
        console.log(`[IAP] Verifying receipt for user ${ctx.user.id} on ${input.platform}`);
        // TODO: Implement actual receipt validation with Apple/Google servers
        // const isSandbox = process.env.NODE_ENV !== 'production';
        // await validateReceipt(input.receipt, isSandbox);
        // Mock Validation: Ensure receipt is not empty
        if (!input.receipt || input.receipt.length < 10) {
            throw new server_1.TRPCError({ code: "BAD_REQUEST", message: "Invalid receipt" });
        }
        console.log(`[IAP] Receipt validated (Mock). Product: ${input.productId}`);
        // Determine points to award based on Product ID
        let pointsToAward = 0;
        if (input.productId.includes('point500') || input.productId.includes('points.500')) {
            pointsToAward = 500;
        }
        else if (input.productId.includes('point1100') || input.productId.includes('points.1100')) {
            pointsToAward = 1100;
        }
        else {
            // Default fallback or error
            console.warn(`[IAP] Unknown product ID: ${input.productId}, defaulting to 0 points`);
        }
        if (pointsToAward > 0) {
            await db_1.db.transaction(async (tx) => {
                // Award Points
                await tx.insert(schema_1.wallets).values({
                    userId: ctx.user.id,
                    currentBalance: pointsToAward
                }).onConflictDoUpdate({
                    target: [schema_1.wallets.userId],
                    set: { currentBalance: (0, drizzle_orm_1.sql) `${schema_1.wallets.currentBalance} + ${pointsToAward}` }
                });
                // Log Transaction
                await tx.insert(schema_1.transactions).values({
                    userId: ctx.user.id,
                    amount: pointsToAward,
                    type: 'earn',
                    description: `IAP Purchase (${input.productId})`,
                });
            });
        }
        return { success: true, pointsAwarded: pointsToAward };
    }),
});
