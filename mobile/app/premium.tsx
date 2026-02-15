import { View, Text, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '../utils/api';
import * as RNIap from 'react-native-iap';
import { useEffect, useState } from 'react';
import { IAP_SKUS, IAP_ITEMS } from '../constants/IAP';

export default function PremiumScreen() {
    const router = useRouter();
    const utils = trpc.useUtils();
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<RNIap.Product[]>([]);
    const [subscriptions, setSubscriptions] = useState<RNIap.Subscription[]>([]);

    // Backend Mutation for Receipt Verification
    const verifyReceipt = trpc.payment.verifyIAPReceipt.useMutation();

    // Initialize IAP
    useEffect(() => {
        let purchaseUpdateSubscription: any;
        let purchaseErrorSubscription: any;

        const setupIAP = async () => {
            if (Platform.OS === 'ios') {
                try {
                    await RNIap.initConnection();
                    // Fetch Subscriptions specifically
                    const subs = await RNIap.getSubscriptions({ skus: [IAP_SKUS.PREMIUM_MONTHLY as string] });
                    setSubscriptions(subs);
                } catch (err) {
                    console.error('[IAP] Setup error:', err);
                }
            }
        };

        setupIAP();

        if (Platform.OS === 'ios') {
            purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase: any) => {
                const receipt = purchase.transactionReceipt;
                if (receipt) {
                    try {
                        setLoading(true);
                        // Verify receipt with backend
                        const result = await verifyReceipt.mutateAsync({
                            receipt,
                            platform: 'ios',
                            productId: purchase.productId,
                        });

                        if (result.success) {
                            // Finish transaction
                            await RNIap.finishTransaction({ purchase, isConsumable: false });

                            Alert.alert("Welcome to Premium!", "Your subscription is active. You received 500 bonus points.");
                            utils.user.getProfile.invalidate();
                            router.back();
                        }
                    } catch (error: any) {
                        console.error('[IAP] Verification Failed:', error);
                        Alert.alert('Verification Failed', 'Could not verify your subscription with the server.');
                    } finally {
                        setLoading(false);
                    }
                }
            });

            purchaseErrorSubscription = RNIap.purchaseErrorListener((error: any) => {
                console.warn('purchaseErrorListener', error);
                if (error.responseCode !== '2') { // User cancelled
                    Alert.alert('Purchase Error', error.message);
                }
                setLoading(false);
            });
        }

        return () => {
            if (purchaseUpdateSubscription) {
                purchaseUpdateSubscription.remove();
            }
            if (purchaseErrorSubscription) {
                purchaseErrorSubscription.remove();
            }
            if (Platform.OS === 'ios') {
                RNIap.endConnection();
            }
        };
    }, []);

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            if (Platform.OS === 'ios') {
                const sku = IAP_SKUS.PREMIUM_MONTHLY;
                if (!sku) return;
                // Request Subscription
                await RNIap.requestSubscription({ sku });
            } else {
                // Android fallback (or unimplemented)
                Alert.alert("Not Available", "Premium is currently available on iOS only.");
                setLoading(false);
            }
        } catch (err: any) {
            console.warn(err.code, err.message);
            setLoading(false);
        }
    };

    const Feature = ({ icon, title, desc }: { icon: keyof typeof Ionicons.glyphMap, title: string, desc: string }) => (
        <View className="flex-row items-center bg-white/10 p-4 rounded-2xl mb-4 border border-white/20">
            <View className="w-12 h-12 rounded-full bg-yellow-400 items-center justify-center mr-4">
                <Ionicons name={icon} size={24} color="#000" />
            </View>
            <View className="flex-1">
                <Text className="text-white font-black text-lg mb-0.5">{title}</Text>
                <Text className="text-white/80 font-bold text-xs">{desc}</Text>
            </View>
        </View>
    );

    // Find product details for display
    const subProduct = subscriptions.find(s => s.productId === IAP_SKUS.PREMIUM_MONTHLY);

    let displayPrice = '$10.99';
    if (subProduct) {
        if (Platform.OS === 'ios') {
            displayPrice = (subProduct as RNIap.SubscriptionIOS).localizedPrice || '$10.99';
        } else if (Platform.OS === 'android') {
            const offer = (subProduct as RNIap.SubscriptionAndroid).subscriptionOfferDetails?.[0];
            displayPrice = offer?.pricingPhases.pricingPhaseList[0].formattedPrice || '$10.99';
        }
    }

    return (
        <View className="flex-1 bg-black">
            {/* Background Gradient */}
            <LinearGradient
                colors={['#4c1d95', '#000000']}
                className="absolute inset-0"
            />

            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View className="px-4 py-2 flex-row justify-between items-center z-10">
                    <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/10 items-center justify-center">
                        <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white/50 text-xs font-bold uppercase tracking-widest">Premium Membership</Text>
                    <View className="w-10" />
                </View>

                <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>

                    {/* Hero */}
                    <View className="items-center mb-10">
                        <View className="w-24 h-24 rounded-full bg-gradient-to-tr from-yellow-400 to-yellow-600 items-center justify-center mb-6 shadow-lg shadow-yellow-500/50 border-4 border-white">
                            <Ionicons name="diamond" size={48} color="black" />
                        </View>
                        <Text className="text-4xl font-black text-white text-center mb-2 italic">Spotch Premium</Text>
                        <Text className="text-white/70 text-center font-bold">究極の体験を、あなたに。</Text>
                    </View>

                    {/* Features */}
                    <View className="mb-10">
                        <Feature
                            icon="analytics"
                            title="詳細アナリティクス"
                            desc="過去の全履歴と、スポットごとの収益効率を可視化。"
                        />
                        <Feature
                            icon="server"
                            title="ボーナスプレミアム"
                            desc="毎月 500ポイントのボーナスが付与されます。"
                        />
                        <Feature
                            icon="time"
                            title="収益時間 10%短縮"
                            desc="通常より10%早くポイントを獲得できます。"
                        />
                    </View>

                    {/* Price Card */}
                    <View className="bg-white rounded-3xl p-6 items-center mb-8 border-4 border-yellow-400 shadow-xl shadow-yellow-900/50">
                        <Text className="text-gray-500 font-bold text-xs uppercase mb-1">Monthly Plan</Text>
                        <View className="flex-row items-baseline mb-4">
                            <Text className="text-5xl font-black text-black">{displayPrice}</Text>
                            <Text className="text-gray-500 font-bold ml-1">/ month</Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleSubscribe}
                            disabled={loading}
                            className={`w-full bg-black py-4 rounded-full items-center ${loading ? 'opacity-50' : ''}`}
                        >
                            <Text className="text-white font-black text-lg">{loading ? 'Processing...' : 'Subscribe Now'}</Text>
                        </TouchableOpacity>

                        <Text className="text-gray-400 text-[10px] mt-3 text-center">
                            Auto-renews. Cancel anytime in Settings.
                        </Text>
                    </View>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
