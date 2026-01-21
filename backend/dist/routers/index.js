"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appRouter = void 0;
const trpc_1 = require("../trpc");
const user_1 = require("./user");
const wallet_1 = require("./wallet");
const spot_1 = require("./spot");
const visit_1 = require("./visit");
exports.appRouter = (0, trpc_1.router)({
    health: trpc_1.publicProcedure.query(() => {
        return 'ok';
    }),
    user: user_1.userRouter,
    wallet: wallet_1.walletRouter,
    spot: spot_1.spotRouter,
    visit: visit_1.visitRouter,
});
