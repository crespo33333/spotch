
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '../utils/api';
import { StatusBar } from 'expo-status-bar';

const MOCK_REWARDS = [
    { id: 'amzn_500', name: 'Amazon Gift Card 500円分', points: 5000, color: '#FF9900', icon: 'logo-amazon' },
    { id: 'sbux_300', name: 'Starbucks Ticket 300円', points: 3000, color: '#00704A', icon: 'logo-usd' }, // No starbucks logo in ionic v5
    { id: 'premium_1mo', name: 'Spotch Premium (1ヶ月)', points: 10000, color: '#FF4785', icon: 'star' },
    { id: 'don_forest', name: '森林保全団体への寄付', points: 1000, color: '#4CAF50', icon: 'leaf' },
];

export default function ExchangeScreen() {
    const router = useRouter();
    const { data: wallet } = trpc.wallet.getBalance.useQuery();
    const currentBalance = wallet || 0;

    const handleRedeem = (reward: typeof MOCK_REWARDS[0]) => {
        if (currentBalance < reward.points) {
            Alert.alert('ポイント不足', `あと ${reward.points - currentBalance} ポイント必要です！`);
            return;
        }

        // Mock Processing
        Alert.alert(
            '交換確認',
            `${reward.name} と交換しますか？\n(これはデモ機能です)`,
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '交換する',
                    onPress: () => Alert.alert('受付完了', '在庫を確認しています... (デモ)')
                }
            ]
        );
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

            <ScrollView className="flex-1 p-4">
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

                <View className="gap-4">
                    {MOCK_REWARDS.map(reward => (
                        <TouchableOpacity
                            key={reward.id}
                            onPress={() => handleRedeem(reward)}
                            activeOpacity={0.9}
                            className="bg-white p-4 rounded-2xl border border-slate-100 flex-row items-center gap-4 shadow-sm"
                        >
                            <View className="w-12 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: `${reward.color}20` }}>
                                <Ionicons name={reward.icon as any} size={24} color={reward.color} />
                            </View>
                            <View className="flex-1">
                                <Text className="font-bold text-slate-800 text-lg">{reward.name}</Text>
                                <Text className="font-medium text-slate-500">{reward.points.toLocaleString()} pts</Text>
                            </View>
                            <View className={`px-3 py-1 rounded-full ${currentBalance >= reward.points ? 'bg-blue-50' : 'bg-slate-100'}`}>
                                <Text className={`text-xs font-bold ${currentBalance >= reward.points ? 'text-blue-500' : 'text-slate-400'}`}>
                                    {currentBalance >= reward.points ? 'GET' : 'LOCKED'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text className="text-center text-slate-400 text-xs mt-8 mb-20">
                    Rewards are subject to availability and terms.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}
