import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';
import * as RNIap from 'react-native-iap';
import { trpc } from '../utils/api';

// Product SKUs
const SKU_POINTS_500 = Platform.select({
    ios: 'com.spotch.app.point500',
    android: 'com.spotch.app.point500', // Matches Google Play Product ID
    default: 'com.spotch.app.point500',
});

const itemSkus = Platform.select({
    ios: [SKU_POINTS_500],
    android: [SKU_POINTS_500],
    default: [],
}) as string[];

export default function PurchaseScreen() {
    const router = useRouter();
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    const [loading, setLoading] = useState(false);
    const [iapProducts, setIapProducts] = useState<RNIap.Product[]>([]);

    // Backend Mutations
    const createPaymentIntent = trpc.payment.createPaymentIntent.useMutation();
    const confirmPurchase = trpc.payment.confirmPurchase.useMutation();
    const verifyIAPReceipt = trpc.payment.verifyIAPReceipt.useMutation();
    const utils = trpc.useUtils();

    // --- IAP Setup (iOS/Android) ---
    useEffect(() => {
        let purchaseUpdateSubscription: any;
        let purchaseErrorSubscription: any;

        const setupIAP = async () => {
            if (Platform.OS === 'ios') {
                try {
                    await (RNIap as any).initConnection();
                    const products = await (RNIap as any).getProducts({ skus: itemSkus });
                    setIapProducts(products);
                } catch (err) {
                    console.error('[IAP] Setup error:', err);
                }
            }
        };

        setupIAP();

        // Listeners
        if (Platform.OS === 'ios') {
            purchaseUpdateSubscription = (RNIap as any).purchaseUpdatedListener(async (purchase: any) => {
                const receipt = purchase.transactionReceipt;
                if (receipt) {
                    try {
                        // Verify receipt with backend
                        const result = await verifyIAPReceipt.mutateAsync({
                            receipt,
                            platform: 'ios',
                            productId: purchase.productId,
                        });

                        if (result.success) {
                            // Tell Apple we finished
                            await (RNIap as any).finishTransaction({ purchase, isConsumable: true });
                            Alert.alert('Success', `You purchased ${result.pointsAwarded} Points!`);
                            utils.wallet.getBalance.invalidate();
                            router.back();
                        }
                    } catch (error) {
                        console.error('[IAP] Verification Failed:', error);
                        Alert.alert('Verification Failed', 'Could not verify your purchase with the server.');
                    }
                }
            });

            purchaseErrorSubscription = (RNIap as any).purchaseErrorListener((error: any) => {
                console.warn('purchaseErrorListener', error);
                if (error.responseCode !== '2') { // '2' is usually user_cancelled
                    Alert.alert('Purchase Error', error.message);
                }
                setLoading(false);
            });
        }

        return () => {
            // ... cleanup code remains same but just replacing the block above
            if (purchaseUpdateSubscription) {
                purchaseUpdateSubscription.remove();
                purchaseUpdateSubscription = null;
            }
            if (purchaseErrorSubscription) {
                purchaseErrorSubscription.remove();
                purchaseErrorSubscription = null;
            }
            if (Platform.OS === 'ios') {
                (RNIap as any).endConnection();
            }
        };
    }, []);

    // --- Stripe Logic (Android / Legacy) ---
    const initializePaymentSheet = async (amount: number, points: number) => {
        setLoading(true);
        try {
            const { clientSecret } = await createPaymentIntent.mutateAsync({
                amount,
                points
            });

            if (!clientSecret) throw new Error("No client secret received");

            const { error } = await initPaymentSheet({
                paymentIntentClientSecret: clientSecret,
                merchantDisplayName: 'Spotch',
                merchantIdentifier: 'merchant.com.spotch.app',
                returnURL: 'spotch://stripe-redirect',
            });

            if (error) {
                Alert.alert('Payment Error', error.message);
                setLoading(false);
                return null;
            }
            return clientSecret;
        } catch (e: any) {
            Alert.alert('Error', e.message);
            setLoading(false);
            return null;
        }
    };

    const handleBuyStripe = async (amount: number, points: number) => {
        const clientSecret = await initializePaymentSheet(amount, points);
        if (!clientSecret) return;

        const { error } = await presentPaymentSheet();

        if (error) {
            if (error.code !== 'Canceled') {
                Alert.alert(`Error code: ${error.code}`, error.message);
            }
        } else {
            try {
                const paymentIntentId = clientSecret.split('_secret_')[0];
                await confirmPurchase.mutateAsync({ paymentIntentId, points });
                Alert.alert('Success', `You purchased ${points} Points!`);
                utils.wallet.getBalance.invalidate();
                router.back();
            } catch (e: any) {
                console.error(e);
            }
        }
        setLoading(false);
    };

    // --- Main Handler ---
    const handleBuy = async () => {
        setLoading(true);
        if (Platform.OS === 'ios') {
            try {
                if (!SKU_POINTS_500) return;
                await (RNIap as any).requestPurchase({ sku: SKU_POINTS_500 });
            } catch (err: any) {
                console.warn(err.code, err.message);
                setLoading(false);
            }
        } else {
            // Android uses Stripe for now (though currently hidden in main entry points)
            await handleBuyStripe(500, 500);
        }
    };

    const point500Product = iapProducts.find((p: any) => p.productId === SKU_POINTS_500);
    const displayPrice = Platform.OS === 'ios' && point500Product ? (point500Product as any).localizedPrice : '¥500';

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <View className="px-6 py-4 flex-row items-center justify-between border-b-2 border-black">
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <Ionicons name="close" size={28} color="black" />
                </TouchableOpacity>
                <Text className="text-xl font-black italic tracking-tighter">STORE</Text>
                <View className="w-10" />
            </View>

            <View className="p-6">
                <View className="bg-[#FFD700] p-6 rounded-[32px] border-4 border-black mb-8 items-center justify-center shadow-lg">
                    <Ionicons name="diamond" size={48} color="white" />
                    <Text className="text-black font-black text-2xl mt-2">PREMIUM POINTS</Text>
                    <Text className="text-black/50 font-bold text-xs uppercase tracking-widest">Boost your gameplay</Text>
                </View>

                <TouchableOpacity
                    onPress={handleBuy}
                    disabled={loading}
                    className="bg-black p-6 rounded-[24px] flex-row items-center justify-between active:scale-95 transition-transform"
                    style={{ shadowColor: "#000", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.5, shadowRadius: 0, elevation: 4 }}
                >
                    <View className="flex-row items-center gap-4">
                        <View className="w-12 h-12 bg-white rounded-full items-center justify-center border-2 border-black">
                            <Text className="text-2xl">💎</Text>
                        </View>
                        <View>
                            <Text className="text-white font-black text-xl">500 Points</Text>
                            <Text className="text-gray-400 font-bold text-xs">Starter Pack</Text>
                        </View>
                    </View>
                    <View className="bg-[#00C2FF] px-4 py-2 rounded-full border-2 border-white">
                        <Text className="text-white font-black">{displayPrice}</Text>
                    </View>
                </TouchableOpacity>

                {loading && (
                    <Text className="text-center mt-4 font-bold text-gray-400">Processing...</Text>
                )}
            </View>
        </SafeAreaView>
    );
}
