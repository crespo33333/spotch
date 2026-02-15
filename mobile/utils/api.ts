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

export const getBaseUrl = () => {
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


// Session persistence
import AsyncStorage from '@react-native-async-storage/async-storage';

let sessionUserId: string | null = null;

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 30, // 30 seconds
            refetchOnWindowFocus: false,
        },
    },
});

export const setStoredUserId = async (id: string) => {
    sessionUserId = id;
    await AsyncStorage.setItem('user_id', id);
};

export const getStoredUserId = async () => {
    if (sessionUserId) return sessionUserId;
    try {
        const id = await AsyncStorage.getItem('user_id');
        if (id) sessionUserId = id;
        return id;
    } catch (e) {
        return null;
    }
};

export const trpcClient = trpc.createClient({
    links: [
        httpBatchLink({
            url: `${getBaseUrl()}/trpc`,
            async headers() {
                const id = await getStoredUserId();
                return {
                    'x-user-id': id || '2', // Defaults to '2' if not registered (should ideally be null and handled by backend)
                };
            },
        }),
    ],
});
