import "../global.css";
import '../utils/i18n';
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { trpc, trpcClient, queryClient } from '../utils/api';
import { QueryClientProvider } from '@tanstack/react-query';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

import { usePushNotifications } from '../hooks/usePushNotifications';
import { StripeProvider } from '@stripe/stripe-react-native';

function PushController() {
    const { expoPushToken } = usePushNotifications();
    const updateToken = trpc.user.updatePushToken.useMutation();

    useEffect(() => {
        if (expoPushToken) {
            updateToken.mutate({ token: expoPushToken });
        }
    }, [expoPushToken]);

    return null;
}

export default function Layout() {
    useEffect(() => {
        // Hide splash screen immediately when layout is mounted
        // In a more complex app, we'd wait for fonts/assets
        const hideSplash = async () => {
            await SplashScreen.hideAsync();
        };
        hideSplash();
    }, []);

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                <StripeProvider
                    publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder"}
                    merchantIdentifier="merchant.com.spotch" // required for Apple Pay
                >
                    {/* <PushController /> */}
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
                        <Stack.Screen name="onboarding" />
                        <Stack.Screen name="welcome" />
                        <Stack.Screen name="setup-profile" />
                        <Stack.Screen name="purchase" options={{ presentation: 'modal' }} />
                        <Stack.Screen name="spot" />
                    </Stack>
                    <StatusBar style="auto" />
                </StripeProvider>
            </QueryClientProvider>
        </trpc.Provider>
    );
}
