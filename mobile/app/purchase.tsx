import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../utils/api';
import { useRouter } from 'expo-router';
import { useStripe } from '@stripe/stripe-react-native';
import * as Haptics from 'expo-haptics';

const PACKS = [
    { id: 'pack_1', name: 'Starter Pack', points: 100, price: 100, label: '$1.00' },
    { id: 'pack_2', name: 'Pro Pack', points: 1000, price: 900, label: '$9.00', popular: true },
    { id: 'pack_3', name: 'Whale Pack', points: 5000, price: 4000, label: '$40.00' },
];

export default function PurchaseScreen() {
    const router = useRouter();
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    const [loading, setLoading] = useState(false);

    const createIntent = trpc.payment.createPaymentIntent.useMutation();
    const confirmPurchase = trpc.payment.confirmPurchase.useMutation();
    const utils = trpc.useUtils();

    const handlePurchase = async (pack: typeof PACKS[0]) => {
        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            // 1. Check for Mock Mode
            const isMockMode = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.includes('placeholder');

            let clientSecret = "";
            let paymentIntentId = "";

            if (isMockMode) {
                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 1500));
                // Mock success
                paymentIntentId = `pi_mock_${Date.now()}`;
            } else {
                // Real Stripe Logic
                const intent = await createIntent.mutateAsync({
                    amount: pack.price,
                    points: pack.points,
                });
                clientSecret = intent.clientSecret!;
                if (!clientSecret) throw new Error("Failed to create payment intent");

                const { error: initError } = await initPaymentSheet({
                    paymentIntentClientSecret: clientSecret,
                    merchantDisplayName: 'Spotch App',
                    defaultBillingDetails: { name: 'Spotch User' }
                });
                if (initError) throw new Error(initError.message);

                const { error: presentError } = await presentPaymentSheet();
                if (presentError) {
                    if (presentError.code === 'Canceled') return;
                    throw new Error(presentError.message);
                }

                paymentIntentId = clientSecret.split('_secret')[0];
            }

            // 4. Success! Confirm with backend
            await confirmPurchase.mutateAsync({
                paymentIntentId,
                points: pack.points,
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success!", `You've purchased ${pack.points} points!`);
            utils.wallet.getBalance.invalidate(); // Update wallet balance
            router.back();

        } catch (e: any) {
            if (e.message !== 'Canceled') {
                Alert.alert("Error", e.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            {/* Header */}
            <View className="px-6 py-4 flex-row items-center justify-between bg-white border-b border-slate-100">
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="close" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text className="text-2xl font-black text-slate-800 tracking-tight">BUY POINTS</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView className="flex-1 px-4 pt-6">
                <View className="items-center mb-8">
                    <View className="bg-yellow-100 p-6 rounded-full border-4 border-yellow-200">
                        <Ionicons name="flash" size={48} color="#eab308" />
                    </View>
                    <Text className="text-2xl font-bold text-slate-800 mt-4 text-center">Power Up Your Experience</Text>
                    <Text className="text-slate-500 text-center mt-2 px-6">Get more points to stake your favorite spots and earn even more rewards.</Text>
                </View>

                {PACKS.map((pack) => (
                    <TouchableOpacity
                        key={pack.id}
                        onPress={() => handlePurchase(pack)}
                        disabled={loading}
                        className={`bg-white p-5 rounded-3xl mb-4 border-2 flex-row items-center justify-between ${pack.popular ? 'border-pink-500' : 'border-slate-100'
                            } shadow-sm`}
                    >
                        <View className="flex-1">
                            <View className="flex-row items-center">
                                <Text className="text-xl font-bold text-slate-800">{pack.name}</Text>
                                {pack.popular && (
                                    <View className="bg-pink-500 px-2 py-0.5 rounded-full ml-2">
                                        <Text className="text-[10px] text-white font-black">POPULAR</Text>
                                    </View>
                                )}
                            </View>
                            <Text className="text-slate-500 font-medium">{pack.points} Points</Text>
                        </View>
                        <View className={`px-4 py-2 rounded-2xl ${pack.popular ? 'bg-pink-500' : 'bg-slate-800'}`}>
                            <Text className="text-white font-bold">{pack.label}</Text>
                        </View>
                    </TouchableOpacity>
                ))}

                {loading && (
                    <View className="mt-4 items-center">
                        <ActivityIndicator size="small" color="#ec4899" />
                        <Text className="text-slate-400 mt-2 font-medium">Processing...</Text>
                    </View>
                )}

                <Text className="text-center text-slate-300 text-xs mt-8 mb-10 px-10 leading-4">
                    Payments are secured by Stripe. By purchasing points, you agree to our Terms of Service.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}
