import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { wallets, transactions, users } from "../db/schema";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { eq, sql } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
    apiVersion: "2023-10-16" as any, // Downgrade to stable API version if needed, or keep latest
});

export const paymentRouter = router({
    createPaymentIntent: protectedProcedure
        .input(z.object({
            amount: z.number().min(100), // in cents ($1.00 min)
            points: z.number().min(100)
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
            } catch (error: any) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message,
                });
            }
        }),

    // Simplified: Award points on confirmation (webhook is better for production)
    confirmPurchase: protectedProcedure
        .input(z.object({
            paymentIntentId: z.string(),
            points: z.number()
        }))
        .mutation(async ({ ctx, input }) => {
            // In production, you would verify the paymentIntent status with Stripe here
            // For MVP/Demo, we assume the client confirmed successful payment

            const paymentIntentId = input.paymentIntentId;

            // Mock Mode Check
            if (paymentIntentId.startsWith('pi_mock_')) {
                // Skip Stripe verification for mock IDs
            } else {
                const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
                if (paymentIntent.status !== 'succeeded') {
                    throw new TRPCError({ code: "BAD_REQUEST", message: "Payment not successful" });
                }
            }

            // Start transaction to award points
            return await db.transaction(async (tx) => {
                // Award Points
                await tx.insert(wallets).values({
                    userId: ctx.user.id,
                    currentBalance: input.points
                }).onConflictDoUpdate({
                    target: [wallets.userId],
                    set: { currentBalance: sql`${wallets.currentBalance} + ${input.points}` }
                });

                // Log Transaction
                await tx.insert(transactions).values({
                    userId: ctx.user.id,
                    amount: input.points,
                    type: 'earn',
                    description: `Point Purchase ($${input.paymentIntentId.startsWith('pi_mock_') ? 'Mock' : 'Real'})`,
                });

                return { success: true };
            });
        }),

    createSubscription: protectedProcedure
        .input(z.object({ priceId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            const user = await db.query.users.findFirst({
                where: eq(users.id, ctx.user.id),
            });

            if (!user) throw new TRPCError({ code: "NOT_FOUND" });

            // In real production, we'd use Stripe to create a subscription
            await db.update(users)
                .set({ isPremium: true })
                .where(eq(users.id, ctx.user.id));

            return { success: true, message: "Subscription active (Mock Mode)" };
        }),

    cancelSubscription: protectedProcedure
        .mutation(async ({ ctx }) => {
            await db.update(users)
                .set({ isPremium: false })
                .where(eq(users.id, ctx.user.id));

            return { success: true };
        }),
});
