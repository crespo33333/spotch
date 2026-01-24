import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, Dimensions } from 'react-native';
import { BarChart } from "react-native-gifted-charts";
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getCreatureAvatar } from '../../utils/avatar';
import { Avatar } from '../../components/Avatar';
import { trpc } from '../../utils/api';

// ... (Mock Data stays the same for now)
const RANKINGS = [
    { id: '1', town: 'Shibuya', country: '🇯🇵', points: 12500, lat: 35.6580, lng: 139.7016, trend: 'up' },
    { id: '2', town: 'Manhattan', country: '🇺🇸', points: 9800, lat: 40.7831, lng: -73.9712, trend: 'mid' },
    { id: '3', town: 'Gangnam', country: '🇰🇷', points: 8750, lat: 37.5172, lng: 127.0473, trend: 'up' },
    { id: '4', town: 'Paris 1er', country: '🇫🇷', points: 6400, lat: 48.8606, lng: 2.3376, trend: 'down' },
    { id: '5', town: 'London City', country: '🇬🇧', points: 5200, lat: 51.5123, lng: -0.0907, trend: 'mid' },
];

import { useTranslation } from 'react-i18next';

export default function ProfileScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const [period, setPeriod] = useState<'24h' | 'week' | 'month'>('week');

    // Fetch Real User Profile & Wallet
    const { data: user, isLoading: isLoadingUser } = trpc.user.getProfile.useQuery({});
    const { data: balance } = trpc.wallet.getBalance.useQuery();
    const { data: transactions, isLoading: isLoadingTx, refetch: refetchTx } = trpc.wallet.getTransactions.useQuery();

    // Compute Graph Data (Daily Earnings for last 7 days)
    const chartData = (() => {
        const days = 7;
        const now = new Date();
        // Create an array of 7 days ending with today
        const last7Days = Array.from({ length: days }, (_, i) => {
            const d = new Date();
            d.setDate(now.getDate() - (days - 1 - i));
            return d;
        });

        // Initialize with default values if loading or no transactions
        if (!transactions || transactions.length === 0) {
            return last7Days.map((d, i) => ({
                value: 0,
                label: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
                frontColor: i === days - 1 ? '#FF4785' : '#E0E0E0', // Today highlighted
            }));
        }

        // Map transactions to days
        const values = new Array(days).fill(0);
        transactions.forEach(tx => {
            const txDate = tx.createdAt ? new Date(tx.createdAt) : new Date();
            const diffTime = Math.abs(now.setHours(0, 0, 0, 0) - txDate.setHours(0, 0, 0, 0));
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < days) {
                const index = (days - 1) - diffDays;
                if (index >= 0) values[index] += (tx.amount || 0);
            }
        });

        return last7Days.map((d, i) => ({
            value: values[i],
            label: d.toLocaleDateString('en-US', { weekday: 'narrow' }), // M, T, W...
            frontColor: i === days - 1 ? '#FF4785' : '#00C2FF',
            spacing: 20,
            labelTextStyle: { color: 'gray', fontSize: 12, fontWeight: 'bold' as 'bold' },
        }));
    })();


    // Fetch Rankings
    const { data: rankings } = trpc.spot.getRankings.useQuery();

    const PeriodButton = ({ label, value }: { label: string, value: typeof period }) => (
        <TouchableOpacity
            onPress={() => setPeriod(value)}
            className={`px-6 py-2 rounded-full border-2 border-black ${period === value ? 'bg-primary' : 'bg-white'}`}
            style={{ shadowColor: "#000", shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 }}
        >
            <Text className={`font-black ${period === value ? 'text-white' : 'text-black'}`}>{label}</Text>
        </TouchableOpacity>
    );

    if (isLoadingUser || isLoadingTx) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <ActivityIndicator size="large" color="#FF4785" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                <View className="p-6 pb-0">
                    {/* Header */}
                    <View className="flex-row items-center justify-between mb-8">
                        {/* User Info (Left) */}
                        <View className="flex-row items-center gap-3">
                            <View className="relative">
                                <View className="p-1 rounded-full border-2 border-black">
                                    <Avatar
                                        seed={user?.avatar || 'default_seed'}
                                        size={56}
                                        style={{ backgroundColor: '#f3f4f6' }}
                                    />
                                </View>
                                {/* Level Badge */}
                                <View className="absolute -bottom-1 -right-1 bg-[#FF4785] border-2 border-black px-1.5 rounded-full">
                                    <Text className="text-white font-black text-xs">Lv.{user?.level || 1}</Text>
                                </View>
                            </View>
                            <View>
                                <Text className="text-xl font-black text-black tracking-tight">{user?.name || 'Explorer'}</Text>

                                {/* XP Bar */}
                                <View className="flex-row items-center gap-2 mt-1">
                                    <View className="w-24 h-3 bg-gray-200 rounded-full border border-black overflow-hidden relative">
                                        <View
                                            className="h-full bg-[#00C2FF]"
                                            style={{ width: `${Math.min(((user?.xp || 0) / ((user?.level || 1) * 100)) * 100, 100)}%` }}
                                        />
                                    </View>
                                    <Text className="text-xs font-bold text-gray-500">
                                        {user?.xp || 0} / {(user?.level || 1) * 100} XP
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Top Right Actions */}
                        <View className="flex-row items-center gap-3">
                            {/* Total Staked */}
                            <View className="items-end">
                                <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-0.5">{t('map.stakingRate')}</Text>
                                <View className="flex-row items-center gap-1">
                                    <View className="bg-red-50 px-2 py-1 rounded-lg">
                                        <Text className="text-lg font-black text-black">
                                            {balance?.toLocaleString() || '0'}
                                            <Text className="text-sm text-[#FF4785]"> P</Text>
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => router.push('/purchase')}
                                        className="bg-[#FF4785] p-1 rounded-full"
                                    >
                                        <Ionicons name="add" size={16} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Settings Icon - Ensure visibility */}
                            <TouchableOpacity
                                onPress={() => router.push('/settings')}
                                className="w-12 h-12 bg-white rounded-full border-2 border-slate-100 items-center justify-center shadow-sm"
                                activeOpacity={0.7}
                            >
                                <Ionicons name="settings-outline" size={24} color="#334155" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Badge Collection */}
                    {user?.badges && user.badges.length > 0 && (
                        <View className="mb-6">
                            <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-3">{t('profile.badges')}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                                {user.badges.map((badge: any) => (
                                    <View key={badge.id} className="items-center bg-gray-50 border border-gray-100 p-3 rounded-2xl w-20 h-24 justify-center">
                                        <Text className="text-3xl mb-1">{badge.icon}</Text>
                                        <Text className="text-[10px] font-bold text-center text-gray-600 leading-3">{badge.name}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Period Selector */}

                    <View className="flex-row justify-between mb-8 bg-gray-50 p-1.5 rounded-full border border-gray-100">
                        <PeriodButton label="24H" value="24h" />
                        <PeriodButton label="We" value="week" />
                        <PeriodButton label="Mo" value="month" />
                    </View>

                    {/* Main Chart Area (Refined Analytics) */}
                    <View className="bg-white p-6 rounded-[40px] border-4 border-black mb-6 shadow-2xl relative overflow-hidden">
                        {/* Title & Badge */}
                        {/* Title & Badge */}
                        <View className="flex-row justify-between items-center mb-6">
                            <View>
                                <Text className="text-gray-400 font-black text-[10px] uppercase tracking-widest mb-1">{t('profile.performance')}</Text>
                                <Text className="text-2xl font-black text-black">{t('profile.statsTitle')}</Text>
                            </View>
                            <View className="bg-[#00C2FF] px-3 py-1 rounded-full border-2 border-black rotate-3">
                                <Text className="text-white font-black text-xs uppercase italic">{t('profile.active')}</Text>
                            </View>
                        </View>

                        <View className="items-center justify-center pb-2 bg-slate-50/50 rounded-3xl pt-6 border border-slate-100">
                            <BarChart
                                data={chartData}
                                barWidth={22}
                                spacing={24}
                                roundedTop
                                roundedBottom
                                hideRules
                                xAxisThickness={0}
                                yAxisThickness={0}
                                yAxisTextStyle={{ color: '#cbd5e1', fontSize: 10, fontWeight: 'bold' as 'bold' }}
                                noOfSections={3}
                                maxValue={Math.max(...chartData.map(d => d.value), 100)}
                                isAnimated
                                animationDuration={1000}
                                barBorderRadius={6}
                            />
                        </View>

                        {/* Professional Stats Breakdown */}
                        <View className="flex-row mt-6 pt-6 border-t-2 border-gray-50 items-center justify-between">
                            <Text className="text-xl font-black text-black">
                                {(transactions || []).reduce((sum, tx) => sum + ((tx.amount ?? 0) > 0 ? (tx.amount ?? 0) : 0), 0).toLocaleString()}
                                <Text className="text-xs text-[#FF4785]"> PTS</Text>
                            </Text>
                            <Text className="text-[10px] font-bold text-gray-400 mt-0.5">{t('profile.totalEarned')}</Text>
                        </View>
                        <View className="w-[1px] h-8 bg-gray-100 mx-4" />
                        <View className="flex-1">
                            <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">{t('profile.avgDay')}</Text>
                            <Text className="text-xl font-black text-black">
                                {Math.round((chartData.reduce((sum, d) => sum + d.value, 0) / 7)).toLocaleString()}
                                <Text className="text-xs text-[#00C2FF]"> PTS</Text>
                            </Text>
                        </View>
                    </View>

                    {/* Status Footer */}
                    <View className="mt-6 flex-row justify-between items-center bg-black p-4 rounded-2xl mx-[-12px] mb-[-12px]">
                        <View className="flex-row items-center gap-2">
                            <View className="w-2 h-2 rounded-full bg-green-400" />
                            <Text className="font-black text-white text-[10px] tracking-widest uppercase">{t('profile.networkLive')}</Text>
                        </View>
                        <TouchableOpacity className="flex-row items-center gap-1">
                            <Text className="text-gray-400 font-bold text-[10px] uppercase">{t('profile.insights')}</Text>
                            <Ionicons name="chevron-forward" size={10} color="gray" />
                        </TouchableOpacity>
                    </View>
                    {/* Stats Row */}
                    <View className="flex-row justify-center gap-8 mb-6 bg-slate-50 p-6 rounded-[32px] border-2 border-slate-100">
                        <View className="items-center">
                            <Text className="text-xl font-black text-slate-800">{user?.level || 1}</Text>
                            <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('profile.level')}</Text>
                        </View>
                        <View className="h-full w-[1px] bg-slate-200" />
                        <View className="items-center">
                            <Text className="text-xl font-black text-slate-800">{user?.followingCount || 0}</Text>
                            <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('profile.following')}</Text>
                        </View>
                        <View className="h-full w-[1px] bg-slate-200" />
                        <View className="items-center">
                            <Text className="text-xl font-black text-slate-800">{user?.followerCount || 0}</Text>
                            <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('profile.followers')}</Text>
                        </View>
                    </View>

                    {/* Social & Quest Actions */}
                    <View className="flex-row gap-3 mb-8">
                        <TouchableOpacity
                            onPress={() => router.push('/search-users')}
                            className="flex-1 flex-row items-center justify-center gap-2 bg-slate-100 py-4 rounded-2xl active:bg-slate-200 border border-slate-200"
                        >
                            <Ionicons name="person-add" size={18} color="#475569" />
                            <Text className="font-black text-slate-600">{t('profile.findFriends')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => router.push('/quests')}
                            className="flex-1 flex-row items-center justify-center gap-2 bg-pink-50 py-4 rounded-2xl border border-pink-100 active:bg-pink-100"
                        >
                            <Ionicons name="gift" size={18} color="#db2777" />
                            <Text className="font-black text-pink-600">{t('profile.quests')}</Text>
                        </TouchableOpacity>
                    </View>
                    {/* History List */}
                    <View className="mb-10">
                        <Text className="text-2xl font-black italic tracking-tighter mb-4">{t('profile.history')} 📜</Text>
                        <View className="bg-white rounded-[24px] border-4 border-black p-2 shadow-lg">
                            {transactions?.slice(0, 5).map((tx) => (
                                <View key={tx.id} className="flex-row justify-between items-center p-4 border-b border-gray-100 last:border-0">
                                    <View className="flex-row items-center">
                                        <View className={`p-2 rounded-full mr-3 ${(tx.amount || 0) > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                                            <Ionicons name={(tx.amount || 0) > 0 ? "add" : "remove"} size={16} color={(tx.amount || 0) > 0 ? "green" : "red"} />
                                        </View>
                                        <View>
                                            <Text className="font-bold text-black">{tx.description || 'Unknown Transaction'}</Text>
                                            <Text className="text-gray-400 text-xs font-bold">{new Date(tx.createdAt || Date.now()).toLocaleDateString()}</Text>
                                        </View>
                                    </View>
                                    <Text className={`font-black text-lg ${(tx.amount || 0) > 0 ? 'text-green-500' : 'text-black'}`}>
                                        {(tx.amount || 0) > 0 ? '+' : ''}{tx.amount || 0} P
                                    </Text>
                                </View>
                            ))}
                            {(!transactions || transactions.length === 0) && (
                                <View className="p-8 items-center">
                                    <Text className="text-gray-400 font-bold">{t('profile.noTransactions')}</Text>
                                    <Text className="text-gray-300 text-xs mt-1">{t('profile.startEarning')}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Ranking List */}
                    <View className="flex-row items-center justify-between mb-6">
                        <Text className="text-3xl font-black italic tracking-tighter">{t('spotDetail.leaderboard')} 🏆</Text>
                        <TouchableOpacity>
                            <Text className="text-[#00C2FF] font-bold text-xs">{t('profile.viewAll')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}>
                    {rankings?.map((item, index) => (
                        <TouchableOpacity
                            key={item.id}
                            onPress={() => router.push({ pathname: '/(tabs)', params: { lat: item.lat, lng: item.lng } })}
                            className="bg-white p-5 rounded-[24px] border-4 border-black w-64 shadow-lg active:scale-95 transition-transform"
                        >
                            <View className="flex-row justify-between items-start mb-4">
                                <View className={`w-10 h-10 rounded-full border-2 border-black items-center justify-center ${index === 0 ? 'bg-[#FFD700]' : index === 1 ? 'bg-[#C0C0C0]' : 'bg-[#CD7F32]'}`}>
                                    <Text className="font-black text-lg">#{index + 1}</Text>
                                </View>
                                <Text className="text-4xl">{item.country}</Text>
                            </View>

                            <Text className="font-black text-2xl mb-1 truncate" numberOfLines={1}>{item.name}</Text>
                            <Text className="text-gray-400 font-bold text-xs uppercase mb-4">{item.activeUsers} {t('spotDetail.visited')}</Text>

                            <View className="bg-gray-50 p-3 rounded-xl flex-row justify-between items-center border border-gray-100">
                                <Text className="font-black text-xl text-black">{item.points.toLocaleString()}<Text className="text-[#00C2FF] text-sm"> P</Text></Text>
                                <Text className={`text-xs font-black ${item.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                                    {item.trend === 'up' ? '▲ 24%' : '▼ 5%'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                    {(!rankings || rankings.length === 0) && (
                        <Text className="text-gray-400 font-bold ml-6">No active spots yet.</Text>
                    )}
                </ScrollView>
            </ScrollView>
        </SafeAreaView>
    );
}

