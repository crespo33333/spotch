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
    // Production / Cloud URL
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // For Simulator/Local development
    const debuggerHost = Constants.expoConfig?.hostUri;
    const localhost = debuggerHost?.split(':')[0];

    if (!localhost) {
        return 'http://localhost:4000';
    }
    return `http://${localhost}:4000`;
};


// Session persistence (JS Only, does not require native rebuild)
let sessionUserId: string | null = null;

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 30, // 30 seconds
            refetchOnWindowFocus: false, // Prevents aggressive refetching when switching apps
        },
    },
});

export const setStoredUserId = async (id: string) => {
    sessionUserId = id;
};

export const getStoredUserId = () => sessionUserId;

export const trpcClient = trpc.createClient({
    links: [
        httpBatchLink({
            url: `${getBaseUrl()}/trpc`,
            async headers() {
                return {
                    'x-user-id': sessionUserId || '2', // Defaults to '2' if not registered in this session
                };
            },
        }),
    ],
});
