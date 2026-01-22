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
        .query(async () => {
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
