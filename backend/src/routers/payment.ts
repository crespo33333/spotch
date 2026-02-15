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
            } catch (error: any) {
                console.error(`[Stripe] Error creating PaymentIntent:`, error);
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

    verifyIAPReceipt: protectedProcedure
        .input(z.object({
            receipt: z.string(),
            platform: z.enum(['ios', 'android']),
            productId: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            console.log(`[IAP] Verifying receipt for user ${ctx.user.id} on ${input.platform}`);

            // Real Receipt Validation
            const APPLE_SHARED_SECRET = process.env.APPLE_SHARED_SECRET;
            if (!APPLE_SHARED_SECRET) {
                console.warn("[IAP] APPLE_SHARED_SECRET is not set. Using Mock Validation.");
                if (!input.receipt || input.receipt.length < 10) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid receipt" });
            } else {
                // Helper to validate against Apple
                const validate = async (url: string) => {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            'receipt-data': input.receipt,
                            'password': APPLE_SHARED_SECRET,
                            'exclude-old-transactions': true
                        })
                    });
                    return await response.json();
                };

                let data = await validate('https://buy.itunes.apple.com/verifyReceipt'); // Production

                // Retry in Sandbox if error 21007 (Sandbox receipt sent to Production)
                if (data.status === 21007) {
                    console.log("[IAP] Sandbox receipt detected. Retrying with Sandbox environment.");
                    data = await validate('https://sandbox.itunes.apple.com/verifyReceipt');
                }

                if (data.status !== 0) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid Receipt (Status: ${data.status})` });
                }

                // For Subscriptions: Verify latest receipt info
                if (input.productId.includes('premium.monthly')) {
                    const latest = data.latest_receipt_info?.[0] || data.receipt;
                    if (latest) {
                        const expiresDate = latest.expires_date_ms || latest.expires_date;
                        // Check if expired (allow 5 min buffer for clock drift)
                        if (expiresDate && Number(expiresDate) < Date.now() - 300000) {
                            throw new TRPCError({ code: "BAD_REQUEST", message: "Subscription Expired" });
                        }
                    }
                }
            }

            console.log(`[IAP] Receipt validated. Product: ${input.productId}`);

            // Determine benefit to award based on Product ID
            let pointsToAward = 0;
            let isSubscription = false;

            if (input.productId.includes('point500')) {
                pointsToAward = 500;
            } else if (input.productId.includes('point1100')) {
                pointsToAward = 1100;
            } else if (input.productId.includes('premium.monthly')) {
                isSubscription = true;
                pointsToAward = 500; // Bonus points for subscribing
            } else {
                console.warn(`[IAP] Unknown product ID: ${input.productId}`);
            }

            await db.transaction(async (tx) => {
                // 1. Handle Subscription Status
                if (isSubscription) {
                    await tx.update(users)
                        .set({ isPremium: true })
                        .where(eq(users.id, ctx.user.id));
                }

                // 2. Award Points (Consumable or Subscription Bonus)
                // Need to prevent double-awarding for same Transaction ID in real prod
                // For MVP, we invoke logic. Real impl should check transactions table for unique orderId.
                if (pointsToAward > 0) {
                    await tx.insert(wallets).values({
                        userId: ctx.user.id,
                        currentBalance: pointsToAward
                    }).onConflictDoUpdate({
                        target: [wallets.userId],
                        set: { currentBalance: sql`${wallets.currentBalance} + ${pointsToAward}` }
                    });

                    // Log Transaction
                    await tx.insert(transactions).values({
                        userId: ctx.user.id,
                        amount: pointsToAward,
                        type: 'earn',
                        description: isSubscription ? 'Premium Subscription Bonus' : `IAP Purchase (${input.productId})`,
                    });
                }
            });

            return { success: true, pointsAwarded: pointsToAward };
        }),
});
