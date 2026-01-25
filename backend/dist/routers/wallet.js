"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletRouter = void 0;
const trpc_1 = require("../trpc");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const stripe_1 = __importDefault(require("stripe"));
const zod_1 = require("zod");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
// apiVersion: '2023-10-16', // Let library handle default or use latest if needed
});
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
    }),
    createPaymentIntent: trpc_1.protectedProcedure
        .input(zod_1.z.object({ amount: zod_1.z.number().min(100) }))
        .mutation(async ({ ctx, input }) => {
        if (!ctx.user)
            throw new Error('Unauthorized');
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
