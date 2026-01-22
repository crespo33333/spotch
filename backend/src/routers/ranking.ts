import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db';
import { users, spots, visits, wallets } from '../db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export const rankingRouter = router({
    getGlobalLeaderboard: publicProcedure
        .query(async () => {
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
