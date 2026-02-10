import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '../db';
import { coupons, redemptions, wallets, transactions } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
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
                // 1. Check Balance
                const wallet = await tx.query.wallets.findFirst({
                    where: eq(wallets.userId, ctx.user.id),
                });

                if (!wallet || (wallet.currentBalance || 0) < coupon.cost) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient points" });
                }

                // 2. Deduct Points
                await tx.update(wallets)
                    .set({ currentBalance: sql`${wallets.currentBalance} - ${coupon.cost}` })
                    .where(eq(wallets.userId, ctx.user.id));

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
                const [redemption] = await tx.insert(redemptions).values({
                    userId: ctx.user.id,
                    couponId: coupon.id,
                    code: code,
                    status: 'completed',
                }).returning() as any[];

                // 6. Update Stock (if applicable)
                if (coupon.stock !== null) {
                    await tx.update(coupons)
                        .set({ stock: sql`${coupons.stock} - 1` })
                        .where(eq(coupons.id, coupon.id));
                }

                return { success: true, code, rewardName: coupon.name };
            });
        }),
});
