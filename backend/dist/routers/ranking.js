"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rankingRouter = void 0;
const trpc_1 = require("../trpc");
const zod_1 = require("zod");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
exports.rankingRouter = (0, trpc_1.router)({
    getGlobalLeaderboard: trpc_1.publicProcedure
        .input(zod_1.z.object({ period: zod_1.z.enum(['all', 'weekly']).default('all') }))
        .query(async ({ input }) => {
        if (input.period === 'weekly') {
            // Weekly Leaderboard: Sum of 'earn' transactions in the last 7 days
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const results = await db_1.db.select({
                id: schema_1.users.id,
                name: schema_1.users.name,
                avatar: schema_1.users.avatar,
                xp: (0, drizzle_orm_1.sql) `sum(${schema_1.transactions.amount})`.mapWith(Number), // Use sum of transactions as XP proxy for weekly
                level: schema_1.users.level,
            })
                .from(schema_1.transactions)
                .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.transactions.userId, schema_1.users.id))
                .where((0, drizzle_orm_1.sql) `${schema_1.transactions.type} = 'earn' AND ${schema_1.transactions.createdAt} > ${oneWeekAgo}`)
                .groupBy(schema_1.users.id, schema_1.users.name, schema_1.users.avatar, schema_1.users.level)
                .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `sum(${schema_1.transactions.amount})`))
                .limit(20);
            return results;
        }
        // All Time Leaderboard (Total XP)
        return await db_1.db.query.users.findMany({
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.users.xp)],
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
    getSpotLeaderboard: trpc_1.publicProcedure
        .input(zod_1.z.object({ spotId: zod_1.z.number() }))
        .query(async ({ input }) => {
        // Get users who earned most points at this spot
        const results = await db_1.db.select({
            userId: schema_1.visits.getterId,
            totalEarned: (0, drizzle_orm_1.sql) `sum(${schema_1.visits.earnedPoints})`.mapWith(Number),
            name: schema_1.users.name,
            avatar: schema_1.users.avatar,
        })
            .from(schema_1.visits)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.visits.getterId, schema_1.users.id))
            .where((0, drizzle_orm_1.eq)(schema_1.visits.spotId, input.spotId))
            .groupBy(schema_1.visits.getterId, schema_1.users.name, schema_1.users.avatar)
            .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `sum(${schema_1.visits.earnedPoints})`))
            .limit(10);
        return results;
    }),
});
