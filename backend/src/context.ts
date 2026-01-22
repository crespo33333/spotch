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
        const authHeader = req.headers.authorization;
        // Check for Super Admin Secret (from Admin Web)
        if (authHeader === 'Bearer super-admin-secret') {
            user = {
                id: 0,
                role: 'admin',
                name: 'Super Admin',
                email: 'admin@spotch.app',
                openId: 'admin_master',
                deviceId: null,
                pushToken: null,
                xp: 999999,
                level: 99,
                createdAt: new Date(),
                isBanned: false,
                avatar: 'default_seed'
            };
        } else {
            // Check for Mobile User ID
            const userId = req.headers['x-user-id'] as string;
            if (userId) {
                user = await db.query.users.findFirst({
                    where: eq(users.id, parseInt(userId))
                }) || null;
            }
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
