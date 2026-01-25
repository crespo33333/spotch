import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';
import { trpc } from '../utils/api';

export default function PurchaseScreen() {
    const router = useRouter();
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    const [loading, setLoading] = useState(false);

    // Backend Mutations
    const createPaymentIntent = trpc.payment.createPaymentIntent.useMutation();
    const confirmPurchase = trpc.payment.confirmPurchase.useMutation();
    const utils = trpc.useUtils();

    const initializePaymentSheet = async (amount: number, points: number) => {
        setLoading(true);
        try {
            // 1. Get Client Secret from Backend
            const { clientSecret } = await createPaymentIntent.mutateAsync({
                amount,
                points
            });

            if (!clientSecret) throw new Error("No client secret received");

            // 2. Initialize Payment Sheet
            const { error } = await initPaymentSheet({
                paymentIntentClientSecret: clientSecret,
                merchantDisplayName: 'Spotch',
                applePay: {
                    merchantCountryCode: 'JP',
                },
                returnURL: 'spotch://stripe-redirect',
            });

            if (error) {
                Alert.alert('Error', error.message);
                setLoading(false);
                return null;
            }
            return clientSecret;
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to initialize payment.');
            setLoading(false);
            return null;
        }
    };

    const handleBuy = async (amount: number, points: number) => {
        const clientSecret = await initializePaymentSheet(amount, points);
        if (!clientSecret) return;

        const { error } = await presentPaymentSheet();

        if (error) {
            if (error.code !== 'Canceled') {
                Alert.alert(`Error code: ${error.code}`, error.message);
            }
        } else {
            // 3. Confirm with Backend to award points
            try {
                // Extract Payment Intent ID from Client Secret (before the _secret_ part)
                const paymentIntentId = clientSecret.split('_secret_')[0];

                await confirmPurchase.mutateAsync({
                    paymentIntentId,
                    points
                });

                Alert.alert('Success', `You purchased ${points} Points!`);
                // Refresh wallet balance
                utils.wallet.getBalance.invalidate();
                router.back();
            } catch (e: any) {
                Alert.alert('Success (Payment)', 'Payment was successful, but there was an error updating your balance. Please contact support.');
                console.error('Confirmation error:', e);
            }
        }
        setLoading(false);
    };

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
                    onPress={() => handleBuy(500, 500)} // 500 JPY for 500 Points
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
                        <Text className="text-white font-black">¥500</Text>
                    </View>
                </TouchableOpacity>

                {loading && (
                    <Text className="text-center mt-4 font-bold text-gray-400">Processing...</Text>
                )}
            </View>
        </SafeAreaView>
    );
}
