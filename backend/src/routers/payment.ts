import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { wallets, transactions } from "../db/schema";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { eq, sql } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
    apiVersion: "2025-12-15.clover" as any,
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

            const paymentIntent = await stripe.paymentIntents.retrieve(input.paymentIntentId);
            if (paymentIntent.status !== 'succeeded') {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Payment not successful" });
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
                    description: `Point Purchase ($${paymentIntent.amount / 100})`,
                });

                return { success: true };
            });
        }),
});
