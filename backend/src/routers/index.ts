import { router, publicProcedure } from '../trpc';
import { userRouter } from './user';
import { walletRouter } from './wallet';
import { spotRouter } from './spot';
import { adminRouter } from './admin';
import { paymentRouter } from './payment';
import { rankingRouter } from './ranking';
import { activityRouter } from './activity';
import { questRouter } from './quest';
import { visitRouter } from './visit';

import { messageRouter } from './message';

export const appRouter = router({
    health: publicProcedure.query(() => {
        return 'ok';
    }),
    user: userRouter,
    wallet: walletRouter,
    spot: spotRouter,
    visit: visitRouter,
    admin: adminRouter,
    payment: paymentRouter,
    ranking: rankingRouter,
    activity: activityRouter,
    quest: questRouter,
    message: messageRouter,
});

export type AppRouter = typeof appRouter;
