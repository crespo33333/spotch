import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { trpc, trpcClient, queryClient } from '../utils/api';
import { QueryClientProvider } from '@tanstack/react-query';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function Layout() {
    useEffect(() => {
        // Hide sidebar after 2 seconds
        const timer = setTimeout(async () => {
            await SplashScreen.hideAsync();
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
                    <Stack.Screen name="onboarding" />
                    <Stack.Screen name="welcome" />
                    <Stack.Screen name="setup-profile" />
                </Stack>
                <StatusBar style="auto" />
            </QueryClientProvider>
        </trpc.Provider>
    );
}
