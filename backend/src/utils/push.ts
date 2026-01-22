import { Expo } from 'expo-server-sdk';

const expo = new Expo();

export async function sendPushNotification(to: string, title: string, body: string, data?: any) {
    if (!Expo.isExpoPushToken(to)) {
        console.error(`Push token ${to} is not a valid Expo push token`);
        return;
    }

    const messages = [{
        to,
        sound: 'default',
        title,
        body,
        data,
    }];

    try {
        const chunks = expo.chunkPushNotifications(messages as any);
        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log('Push ticket:', ticketChunk);
            } catch (error) {
                console.error('Error sending push chunk:', error);
            }
        }
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
}
