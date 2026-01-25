import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { getStoredUserId } from "../utils/api";

export default function Index() {
    const [isLoading, setIsLoading] = useState(true);
    const [hasSession, setHasSession] = useState(false);
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const userId = await getStoredUserId();
            if (userId) {
                setHasSession(true);
            }
        } catch (e) {
            console.error("Auth check failed", e);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return null; // Keep showing Splash screen while loading
    }

    if (hasSession) {
        return <Redirect href="/(tabs)" />;
    }

    return <Redirect href="/welcome" />;
}
