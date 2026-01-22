
import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { trpc } from '../utils/api';

// Config: Show notifications even when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// ... (keep middle code, but replacing file content tool requires contiguous block or use multi)
// Actually I'll use separate chunks or just replace the whole file if it's small enough, or use multi_replace.
// Let's use multi_replace since I need to fix top and bottom.

async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            alert('Failed to get push token for push notification!');
            return;
        }

        // Get the token (requires Project ID for EAS)
        token = (await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId,
        })).data;

        console.log('🔔 Push Token:', token);
    } else {
        alert('Must use physical device for Push Notifications');
    }

    return token;
}

export function usePushNotifications() {
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
    const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);

    // tRPC Mutation to save token
    const updatePushToken = trpc.user.updatePushToken.useMutation();

    useEffect(() => {
        registerForPushNotificationsAsync().then(token => {
            setExpoPushToken(token);
            if (token) {
                // Sync with backend
                updatePushToken.mutate({ token });
            }
        });

        // Listen for incoming notifications
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        // Listen for user tapping a notification
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log(response);
            // Navigate to specific screen based on data here if needed
        });

        return () => {
            notificationListener.current &&
                notificationListener.current.remove();
            responseListener.current &&
                responseListener.current.remove();
        };
    }, []);

    return {
        expoPushToken,
        notification,
    };
}
