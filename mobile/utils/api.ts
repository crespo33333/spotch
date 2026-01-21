import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import { QueryClient } from '@tanstack/react-query';
import type { AppRouter } from '../../backend/src/routers';

/**
 * A set of strongly-typed React hooks from your `AppRouter` type signature with `createTRPCReact`.
 * @link https://trpc.io/docs/react#3-create-trpc-hooks
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Extend this function when going to production by
 * setting the baseUrl to your production API URL.
 */
import Constants from 'expo-constants';

const getBaseUrl = () => {
    // Hardcoded for physical device testing on current network
    return 'http://192.168.151.10:4000';

    /* Dynamic detection (saving for later)
    const debuggerHost = Constants.expoConfig?.hostUri;
    const localhost = debuggerHost?.split(':')[0];

    if (!localhost) {
        return 'http://localhost:4000';
    }
    return `http://${localhost}:4000`;
    */
};


export const queryClient = new QueryClient();

export const trpcClient = trpc.createClient({
    links: [
        httpBatchLink({
            url: `${getBaseUrl()}/trpc`,
            async headers() {
                return {
                    'x-user-id': '2', // Hardcoded System Admin ID for testing
                };
            },
        }),
    ],
});
