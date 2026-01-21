import * as trpcExpress from '@trpc/server/adapters/express';
import { inferAsyncReturnType } from '@trpc/server';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

export const createContext = async ({
    req,
    res,
}: trpcExpress.CreateExpressContextOptions) => {
    let user = null;

    try {
        const userId = req.headers['x-user-id'] as string;
        if (userId) {
            user = await db.query.users.findFirst({
                where: eq(users.id, parseInt(userId))
            }) || null;
            // console.log(`[Auth] User ID ${userId} -> ${user ? 'Found' : 'Not Found'}`);
        }
    } catch (e) {
        console.error('Auth Error:', e);
    }

    return {
        req,
        res,
        user,
    };
};

export type Context = inferAsyncReturnType<typeof createContext>;
