import { Platform } from 'react-native';

export const IAP_SKUS = {
    // Consumable (Points)
    POINTS_500: Platform.select({
        ios: 'com.spotch.app.point500',
        android: 'com.spotch.app.point500',
        default: 'com.spotch.app.point500',
    }),

    // Subscription (Premium)
    PREMIUM_MONTHLY: Platform.select({
        ios: 'com.spotch.app.premium.monthly',
        android: 'com.spotch.app.premium.monthly',
        default: 'com.spotch.app.premium.monthly',
    }),
};

export const IAP_ITEMS = Platform.select({
    ios: [IAP_SKUS.POINTS_500, IAP_SKUS.PREMIUM_MONTHLY],
    android: [IAP_SKUS.POINTS_500, IAP_SKUS.PREMIUM_MONTHLY],
    default: [],
}) as string[];
