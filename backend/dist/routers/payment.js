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
    apiVersion: "2025-12-15.clover",
});
exports.paymentRouter = (0, trpc_1.router)({
    createPaymentIntent: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        amount: zod_1.z.number().min(100), // in cents ($1.00 min)
        points: zod_1.z.number().min(100)
    }))
        .mutation(async ({ ctx, input }) => {
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: input.amount,
                currency: "usd",
                automatic_payment_methods: { enabled: true },
                metadata: {
                    userId: ctx.user.id.toString(),
                    points: input.points.toString(),
                },
            });
            return {
                clientSecret: paymentIntent.client_secret,
            };
        }
        catch (error) {
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
        const paymentIntent = await stripe.paymentIntents.retrieve(input.paymentIntentId);
        if (paymentIntent.status !== 'succeeded') {
            throw new server_1.TRPCError({ code: "BAD_REQUEST", message: "Payment not successful" });
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
                description: `Point Purchase ($${paymentIntent.amount / 100})`,
            });
            return { success: true };
        });
    }),
});
