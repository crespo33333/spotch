import { router, publicProcedure } from '../trpc';
import { userRouter } from './user';
import { walletRouter } from './wallet';
import { spotRouter } from './spot';
import { adminRouter } from './admin';
import { paymentRouter } from './payment';
import { rankingRouter } from './ranking';

export const appRouter = router({
    health: publicProcedure.query(() => {
        return 'ok';
    }),
    user: userRouter,
    wallet: walletRouter,
    spot: spotRouter,
    admin: adminRouter,
    payment: paymentRouter,
    ranking: rankingRouter,
});

export type AppRouter = typeof appRouter;
