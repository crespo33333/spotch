"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletRouter = void 0;
const trpc_1 = require("../trpc");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
exports.walletRouter = (0, trpc_1.router)({
    getBalance: trpc_1.protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.user)
            throw new Error('Unauthorized');
        const wallet = await db_1.db.query.wallets.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.wallets.userId, ctx.user.id)
        });
        return wallet?.currentBalance || 0;
    }),
    getTransactions: trpc_1.protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.user)
            throw new Error('Unauthorized');
        return await db_1.db.query.transactions.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.transactions.userId, ctx.user.id),
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.transactions.createdAt)]
        });
    })
});
