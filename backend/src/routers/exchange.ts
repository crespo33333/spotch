import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '../db';
import { coupons, redemptions, wallets, transactions } from '../db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { randomBytes } from 'crypto';

export const exchangeRouter = router({
    listCoupons: protectedProcedure.query(async () => {
        return await db.select().from(coupons).where(eq(coupons.isActive, true));
    }),

    getRedemptions: protectedProcedure.query(async ({ ctx }) => {
        return await db.query.redemptions.findMany({
            where: eq(redemptions.userId, ctx.user.id),
            with: {
                coupon: true
            },
            orderBy: [desc(redemptions.redeemedAt)],
        });
    }),

    redeem: protectedProcedure
        .input(z.object({ couponId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const coupon = await db.query.coupons.findFirst({
                where: eq(coupons.id, input.couponId),
            });

            if (!coupon) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Coupon not found" });
            }

            if (!coupon.isActive) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "This coupon is no longer available" });
            }

            if (coupon.stock !== null && coupon.stock <= 0) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Out of stock" });
            }

            return await db.transaction(async (tx) => {
                // 1. Safe Atomic Deduct Points
                // Try to decrement balance ONLY IF sufficient funds exist
                const [walletUpdate] = await tx.update(wallets)
                    .set({
                        currentBalance: sql`${wallets.currentBalance} - ${coupon.cost}`,
                        lastTransactionAt: new Date()
                    })
                    .where(and(
                        eq(wallets.userId, ctx.user.id),
                        sql`${wallets.currentBalance} >= ${coupon.cost}`
                    ))
                    .returning({ id: wallets.id });

                if (!walletUpdate) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient points or transaction failed" });
                }

                // 2. Safe Atomic Stock Deduct (if applicable)
                if (coupon.stock !== null) {
                    const [stockUpdate] = await tx.update(coupons)
                        .set({ stock: sql`${coupons.stock} - 1` })
                        .where(and(
                            eq(coupons.id, coupon.id),
                            sql`${coupons.stock} > 0`
                        ))
                        .returning({ id: coupons.id });

                    if (!stockUpdate) {
                        // Rollback isn't automatic in Drizzle unless error thrown?
                        // TRPC Error inside transaction callback usually rolls back in Postgres.
                        throw new TRPCError({ code: "BAD_REQUEST", message: "Out of stock just now" });
                    }
                }

                // 3. Create Transaction Record
                await tx.insert(transactions).values({
                    userId: ctx.user.id,
                    amount: -coupon.cost,
                    type: 'spend',
                    description: `Redeemed: ${coupon.name}`,
                });

                // 4. Generate Coupon Code (Simple alphanumeric)
                const code = randomBytes(4).toString('hex').toUpperCase();

                // 5. Create Redemption Record
                await tx.insert(redemptions).values({
                    userId: ctx.user.id,
                    couponId: coupon.id,
                    code: code,
                    status: 'completed',
                });

                return { success: true, code, rewardName: coupon.name };
            });
        }),

    buyGameItem: protectedProcedure
        .input(z.object({
            couponId: z.number(),
            targetSpotId: z.number()
        }))
        .mutation(async ({ ctx, input }) => {
            const { spots } = require('../db/schema');

            const coupon = await db.query.coupons.findFirst({
                where: eq(coupons.id, input.couponId),
            });

            if (!coupon || coupon.type !== 'game_item') {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid game item" });
            }

            const spot = await db.query.spots.findFirst({ where: eq(spots.id, input.targetSpotId) });
            if (!spot) throw new TRPCError({ code: "NOT_FOUND", message: "Spot not found" });

            // Specific Item Logic Constraints
            if (coupon.data?.startsWith('tax_boost') && spot.ownerId !== ctx.user.id) {
                throw new TRPCError({ code: "FORBIDDEN", message: "Only the owner can boost tax!" });
            }
            if (coupon.data?.startsWith('shield') && spot.ownerId !== ctx.user.id) {
                throw new TRPCError({ code: "FORBIDDEN", message: "Only the owner can enable shields!" });
            }

            return await db.transaction(async (tx) => {
                // 1. Safe Atomic Deduct Points
                const [walletUpdate] = await tx.update(wallets)
                    .set({
                        currentBalance: sql`${wallets.currentBalance} - ${coupon.cost}`,
                        lastTransactionAt: new Date()
                    })
                    .where(and(
                        eq(wallets.userId, ctx.user.id),
                        sql`${wallets.currentBalance} >= ${coupon.cost}`
                    ))
                    .returning({ id: wallets.id });

                if (!walletUpdate) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient points" });
                }

                // 2. Apply Effect
                const now = new Date();
                const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours fixed for now

                if (coupon.data?.startsWith('shield')) {
                    await tx.update(spots).set({ shieldExpiresAt: expiry }).where(eq(spots.id, input.targetSpotId));
                } else if (coupon.data?.startsWith('tax_boost')) {
                    await tx.update(spots).set({ taxBoostExpiresAt: expiry }).where(eq(spots.id, input.targetSpotId));
                }

                // 3. Record Transaction
                await tx.insert(transactions).values({
                    userId: ctx.user.id,
                    amount: -coupon.cost,
                    type: 'spend',
                    description: `Used Item: ${coupon.name} on ${spot.name}`,
                });

                return { success: true, message: `${coupon.name} activated!` };
            });
        }),
});
