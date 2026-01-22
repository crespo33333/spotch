import { router, publicProcedure } from '../trpc';
import { userRouter } from './user';
import { walletRouter } from './wallet';
import { spotRouter } from './spot';
import { visitRouter } from './visit';
import { adminRouter } from './admin';
import { questRouter } from './quest';
import { paymentRouter } from './payment';
import { activityRouter } from './activity';
import { rankingRouter } from './ranking';
import { z } from 'zod';

export const appRouter = router({
    health: publicProcedure.query(() => {
        return 'ok';
    }),
    user: userRouter,
    wallet: walletRouter,
    spot: spotRouter,
    visit: visitRouter,
    admin: adminRouter,
    quest: questRouter,
    payment: paymentRouter,
    activity: activityRouter,
    ranking: rankingRouter,
});

export type AppRouter = typeof appRouter;
