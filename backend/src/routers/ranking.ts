import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db';
import { users, spots, visits, wallets, transactions } from '../db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export const rankingRouter = router({
    getGlobalLeaderboard: publicProcedure
        .input(z.object({ period: z.enum(['all', 'weekly']).default('all') }))
        .query(async ({ input }) => {
            if (input.period === 'weekly') {
                // Weekly Leaderboard: Sum of 'earn' transactions in the last 7 days
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

                const results = await db.select({
                    id: users.id,
                    name: users.name,
                    avatar: users.avatar,
                    xp: sql<number>`sum(${transactions.amount})`.mapWith(Number), // Use sum of transactions as XP proxy for weekly
                    level: users.level,
                })
                    .from(transactions)
                    .innerJoin(users, eq(transactions.userId, users.id))
                    .where(
                        sql`${transactions.type} = 'earn' AND ${transactions.createdAt} > ${oneWeekAgo}`
                    )
                    .groupBy(users.id, users.name, users.avatar, users.level)
                    .orderBy(desc(sql`sum(${transactions.amount})`))
                    .limit(20);

                return results;
            }

            // All Time Leaderboard (Total XP)
            return await db.query.users.findMany({
                orderBy: [desc(users.xp)],
                limit: 20,
                columns: {
                    id: true,
                    name: true,
                    avatar: true,
                    xp: true,
                    level: true,
                },
            });
        }),

    getSpotLeaderboard: publicProcedure
        .input(z.object({ spotId: z.number() }))
        .query(async ({ input }) => {
            // Get users who earned most points at this spot
            const results = await db.select({
                userId: visits.getterId,
                totalEarned: sql<number>`sum(${visits.earnedPoints})`.mapWith(Number),
                name: users.name,
                avatar: users.avatar,
            })
                .from(visits)
                .innerJoin(users, eq(visits.getterId, users.id))
                .where(eq(visits.spotId, input.spotId))
                .groupBy(visits.getterId, users.name, users.avatar)
                .orderBy(desc(sql`sum(${visits.earnedPoints})`))
                .limit(10);

            return results;
        }),
});
