import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '../utils/api';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';

export default function ExchangeScreen() {
    const router = useRouter();
    const utils = trpc.useUtils();
    const { data: wallet } = trpc.wallet.getBalance.useQuery();
    const { data: coupons, isLoading: isLoadingCoupons } = trpc.exchange.listCoupons.useQuery();
    const { data: history, isLoading: isLoadingHistory } = trpc.exchange.getRedemptions.useQuery();

    const currentBalance = wallet || 0;
    const [activeTab, setActiveTab] = useState<'rewards' | 'history'>('rewards');
    const [redeemResult, setRedeemResult] = useState<{ code: string, name: string } | null>(null);

    const redeemMutation = trpc.exchange.redeem.useMutation({
        onSuccess: (data) => {
            utils.wallet.getBalance.invalidate();
            utils.exchange.listCoupons.invalidate();
            utils.exchange.getRedemptions.invalidate(); // Refresh history
            setRedeemResult({ code: data.code, name: data.rewardName });
        },
        onError: (err) => {
            Alert.alert('Exchange Failed', err.message);
        }
    });

    const handleRedeem = (coupon: any) => {
        if (currentBalance < coupon.cost) {
            Alert.alert('Insufficient Points', `You need ${coupon.cost - currentBalance} more points.`);
            return;
        }

        Alert.alert(
            'Confirm Exchange',
            `Redeem ${coupon.cost} points for "${coupon.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Redeem',
                    onPress: () => redeemMutation.mutate({ couponId: coupon.id })
                }
            ]
        );
    };

    const copyToClipboard = async (text: string) => {
        await Clipboard.setStringAsync(text);
        Alert.alert('Copied', 'Code copied to clipboard!');
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'gift_card': return 'card';
            case 'donation': return 'leaf';
            case 'premium': return 'star';
            default: return 'gift';
        }
    };

    const getColorForType = (type: string) => {
        switch (type) {
            case 'gift_card': return '#F59E0B'; // Amber
            case 'donation': return '#10B981'; // Emerald
            case 'premium': return '#EC4899'; // Pink
            default: return '#3B82F6'; // Blue
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <Ionicons name="arrow-back" size={24} color="#334155" />
                </TouchableOpacity>
                <Text className="text-lg font-black text-slate-800">Point Exchange</Text>
                <View className="w-10" />
            </View>

            {/* Tabs */}
            <View className="flex-row p-2 bg-white mb-2">
                <TouchableOpacity
                    onPress={() => setActiveTab('rewards')}
                    className={`flex-1 py-2 items-center border-b-2 ${activeTab === 'rewards' ? 'border-[#00C2FF]' : 'border-transparent'}`}
                >
                    <Text className={`font-bold ${activeTab === 'rewards' ? 'text-[#00C2FF]' : 'text-slate-400'}`}>Rewards</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('history')}
                    className={`flex-1 py-2 items-center border-b-2 ${activeTab === 'history' ? 'border-[#00C2FF]' : 'border-transparent'}`}
                >
                    <Text className={`font-bold ${activeTab === 'history' ? 'text-[#00C2FF]' : 'text-slate-400'}`}>History</Text>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 p-4">
                {activeTab === 'rewards' ? (
                    <>
                        {/* Balance Card */}
                        <LinearGradient
                            colors={['#00C2FF', '#0099CC']}
                            className="p-6 rounded-2xl mb-8 shadow-sm"
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Text className="text-white/80 font-bold mb-1">Current Balance</Text>
                            <Text className="text-4xl font-black text-white">{currentBalance.toLocaleString()} <Text className="text-xl">Pt</Text></Text>
                        </LinearGradient>

                        <Text className="text-slate-400 font-bold text-xs uppercase mb-4 ml-2">Available Rewards</Text>

                        {isLoadingCoupons ? (
                            <ActivityIndicator color="#00C2FF" />
                        ) : (
                            <View className="gap-4 pb-20">
                                {coupons?.map((coupon: any) => (
                                    <TouchableOpacity
                                        key={coupon.id}
                                        onPress={() => handleRedeem(coupon)}
                                        activeOpacity={0.9}
                                        disabled={redeemMutation.isLoading}
                                        className="bg-white p-4 rounded-2xl border border-slate-100 flex-row items-center gap-4 shadow-sm"
                                    >
                                        <View className="w-12 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: `${getColorForType(coupon.type)}20` }}>
                                            <Ionicons name={getIconForType(coupon.type) as any} size={24} color={getColorForType(coupon.type)} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-bold text-slate-800 text-lg">{coupon.name}</Text>
                                            <Text className="font-medium text-slate-500">{coupon.cost.toLocaleString()} pts</Text>
                                            {coupon.stock !== null && (
                                                <Text className="text-[10px] text-slate-400 mt-1">Stock: {coupon.stock}</Text>
                                            )}
                                        </View>
                                        <View className={`px-3 py-1 rounded-full ${currentBalance >= coupon.cost ? 'bg-blue-50' : 'bg-slate-100'}`}>
                                            <Text className={`text-xs font-bold ${currentBalance >= coupon.cost ? 'text-blue-500' : 'text-slate-400'}`}>
                                                {currentBalance >= coupon.cost ? 'GET' : 'LOCKED'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </>
                ) : (
                    // HISTORY TAB
                    <View className="gap-4 pb-20">
                        {isLoadingHistory ? (
                            <ActivityIndicator color="#00C2FF" />
                        ) : history?.length === 0 ? (
                            <View className="p-8 items-center">
                                <Text className="text-slate-400 font-bold">No redemptions yet.</Text>
                            </View>
                        ) : (
                            history?.map((item: any) => (
                                <View key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                    <View className="flex-row justify-between mb-2">
                                        <Text className="font-bold text-slate-800 text-lg">{item.coupon.name}</Text>
                                        <Text className="text-xs text-slate-400 font-bold">{new Date(item.redeemedAt).toLocaleDateString()}</Text>
                                    </View>
                                    <View className="bg-slate-50 p-3 rounded-xl flex-row justify-between items-center border border-slate-200 border-dashed">
                                        <Text className="font-mono text-slate-600 tracking-widest">{item.code}</Text>
                                        <TouchableOpacity onPress={() => copyToClipboard(item.code)}>
                                            <Ionicons name="copy-outline" size={16} color="#00C2FF" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}

                <Text className="text-center text-slate-400 text-xs mt-8 mb-20">
                    Rewards are subject to availability and terms.
                </Text>
            </ScrollView>

            {/* Success Modal */}
            <Modal
                transparent
                visible={!!redeemResult}
                animationType="fade"
                onRequestClose={() => setRedeemResult(null)}
            >
                <View className="flex-1 bg-black/50 items-center justify-center p-4">
                    <View className="bg-white p-6 rounded-3xl w-full max-w-sm items-center">
                        <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
                            <Ionicons name="checkmark" size={40} color="#10B981" />
                        </View>
                        <Text className="text-2xl font-black text-slate-800 mb-2">Success!</Text>
                        <Text className="text-slate-500 text-center mb-6">You exchanged points for:</Text>
                        <Text className="text-lg font-bold text-[#00C2FF] mb-6 text-center">{redeemResult?.name}</Text>

                        <View className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 border-dashed w-full flex-row justify-between items-center mb-6">
                            <Text className="font-mono text-xl font-bold text-slate-700 tracking-widest">{redeemResult?.code}</Text>
                            <TouchableOpacity onPress={() => redeemResult && copyToClipboard(redeemResult.code)}>
                                <Ionicons name="copy" size={20} color="#00C2FF" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={() => setRedeemResult(null)}
                            className="bg-slate-900 w-full p-4 rounded-2xl items-center"
                        >
                            <Text className="text-white font-bold text-lg">Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
