import { router, protectedProcedure } from '../trpc';
import { db } from '../db';
import { wallets, transactions } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

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
    })
});
