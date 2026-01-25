import "../global.css";
import '../utils/i18n';
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { trpc, trpcClient, queryClient } from '../utils/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { StripeProvider } from '@stripe/stripe-react-native';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {
    /* reloading the app might trigger some race conditions, ignore them */
});

export default function Layout() {
    useEffect(() => {
        // Hide splash screen immediately when layout is mounted
        const hideSplash = async () => {
            await SplashScreen.hideAsync().catch(console.warn);
        };
        hideSplash();
    }, []);

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                <StripeProvider
                    publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}
                    merchantIdentifier="merchant.com.spotch.app"
                >
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
                        <Stack.Screen name="onboarding" />
                        <Stack.Screen name="welcome" />
                        <Stack.Screen name="setup-profile" />
                        <Stack.Screen name="purchase" options={{ presentation: 'modal' }} />
                        <Stack.Screen name="spot" />
                    </Stack>
                </StripeProvider>
                <StatusBar style="auto" />
            </QueryClientProvider>
        </trpc.Provider>
    );
}
