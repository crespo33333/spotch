import { router, protectedProcedure } from '../trpc';
import { db } from '../db';
import { wallets, transactions } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import Stripe from 'stripe';
import { z } from 'zod';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    // apiVersion: '2023-10-16', // Let library handle default or use latest if needed
});

export const walletRouter = router({
    getBalance: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.user) throw new Error('Unauthorized');

        const wallet = await db.query.wallets.findFirst({
            where: eq(wallets.userId, ctx.user.id)
        });

        return wallet?.currentBalance || 0;
    }),

    getTransactions: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.user) throw new Error('Unauthorized');

        return await db.query.transactions.findMany({
            where: eq(transactions.userId, ctx.user.id),
            orderBy: [desc(transactions.createdAt)]
        });
    }),

    createPaymentIntent: protectedProcedure
        .input(z.object({ amount: z.number().min(100) }))
        .mutation(async ({ ctx, input }) => {
            if (!ctx.user) throw new Error('Unauthorized');

            const paymentIntent = await stripe.paymentIntents.create({
                amount: input.amount,
                currency: 'jpy',
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata: {
                    userId: ctx.user.id.toString(),
                    type: 'point_purchase',
                }
            });

            return {
                clientSecret: paymentIntent.client_secret,
            };
        }),
});
