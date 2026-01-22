import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
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

export default function ProfileScreen() {
    const router = useRouter();
    const [period, setPeriod] = useState<'24h' | 'week' | 'month'>('week');

    // Fetch Real User Profile & Wallet
    const { data: user, isLoading: isLoadingUser } = trpc.user.getProfile.useQuery({});
    const { data: balance } = trpc.wallet.getBalance.useQuery();
    const { data: transactions, isLoading: isLoadingTx, refetch: refetchTx } = trpc.wallet.getTransactions.useQuery();

    // Compute Graph Data (Daily Earnings for last 7 days)
    const chartData = (() => {
        if (!transactions) return [40, 65, 30, 85, 50, 90, 60]; // Mock for loading

        // If loaded but empty, return 0s (or maybe a small base for visuals?)
        if (transactions.length === 0) return [0, 0, 0, 0, 0, 0, 0];

        const days = 7;
        const now = new Date();
        const dailyTotals = new Array(days).fill(0);

        transactions.forEach(tx => {
            // Handle both Date objects and string representations from tRPC
            const txDate = tx.createdAt ? new Date(tx.createdAt) : new Date();
            const amount = tx.amount || 0;

            const diffTime = Math.abs(now.getTime() - txDate.getTime());
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < days) {
                // Reverse index: 0 is today (rightmost), 6 is 7 days ago (leftmost)
                const index = (days - 1) - diffDays;
                if (index >= 0) dailyTotals[index] += tx.amount;
            }
        });

        // Normalize to percentage (max value = 100%)
        // If max is 0, return all 0
        const maxVal = Math.max(...dailyTotals);
        if (maxVal === 0) return dailyTotals;

        return dailyTotals.map(val => (val / maxVal) * 100);
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
                        <View className="flex-row items-center gap-4">
                            {/* Total Staked (Hidden on small screens if needed, otherwise simplified) */}
                            <View className="items-end mr-2">
                                <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-0.5">Total Staked</Text>
                                <View className="flex-row items-center gap-2">
                                    <Text className="text-xl font-black text-black tracking-tighter">
                                        {balance?.toLocaleString() || '0'}
                                        <Text className="text-base text-[#FF4785]"> P</Text>
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => router.push('/purchase')}
                                        className="bg-[#FF4785] px-2 py-0.5 rounded-full"
                                    >
                                        <Ionicons name="add" size={14} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Settings Icon */}
                            <TouchableOpacity onPress={() => router.push('/settings')} className="p-2 bg-gray-50 rounded-full border border-gray-200">
                                <Ionicons name="settings-outline" size={24} color="black" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Period Selector */}
                    <View className="flex-row justify-between mb-8 bg-gray-50 p-1.5 rounded-full border border-gray-100">
                        <PeriodButton label="24H" value="24h" />
                        <PeriodButton label="We" value="week" />
                        <PeriodButton label="Mo" value="month" />
                    </View>

                    {/* Main Chart Area (Real Data) */}
                    <View className="bg-white p-6 rounded-[32px] border-4 border-black mb-6 shadow-xl relative overflow-hidden">
                        {/* Decorative background grid */}
                        <View className="absolute inset-0 opacity-5 flex-row">
                            {[...Array(10)].map((_, i) => (
                                <View key={i} className="flex-1 border-r border-black" />
                            ))}
                        </View>

                        <View className="flex-row justify-between items-end h-48 pb-4 gap-2">
                            {chartData.map((h, i) => (
                                <View key={i} className="flex-1 items-center gap-2">
                                    <View
                                        className="w-full rounded-t-xl border-2 border-black border-b-0 bg-[#00C2FF] shadow-sm relative group"
                                        style={{
                                            height: `${Math.max(h, 5)}%`, // Min height 5%
                                            backgroundColor: i === 6 ? '#FF4785' : '#00C2FF' // Highlight today (last item)
                                        }}
                                    >
                                        {i === 6 && (
                                            <View className="absolute -top-10 -right-4 bg-black px-2 py-1 rounded-lg z-10">
                                                <Text className="text-white font-bold text-xs">Today</Text>
                                                <View className="absolute bottom-[-4] left-1/2 w-2 h-2 bg-black rotate-45 transform -translate-x-1/2" />
                                            </View>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                        <View className="border-t-4 border-black pt-4 flex-row justify-between items-center">
                            <Text className="font-black text-gray-400 text-xs tracking-widest">ACTIVITY TREND</Text>

                            <View className="flex-row items-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm">
                                <Ionicons name="location" size={12} color="#00C2FF" />
                                <Text className="text-slate-600 font-bold text-xs">Tokyo, JP</Text>
                            </View>
                        </View>

                        {/* Stats Row */}
                        <View className="flex-row justify-center gap-8 mt-6">
                            <View className="items-center">
                                <Text className="text-xl font-black text-slate-800">{user?.level || 1}</Text>
                                <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest">Level</Text>
                            </View>
                            <View className="h-full w-[1px] bg-slate-200" />
                            <View className="items-center">
                                <Text className="text-xl font-black text-slate-800">{user?.followingCount || 0}</Text>
                                <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest">Following</Text>
                            </View>
                            <View className="h-full w-[1px] bg-slate-200" />
                            <View className="items-center">
                                <Text className="text-xl font-black text-slate-800">{user?.followerCount || 0}</Text>
                                <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest">Followers</Text>
                            </View>
                        </View>

                        {/* Social & Quest Actions */}
                        <View className="flex-row gap-3 mt-6">
                            <TouchableOpacity
                                onPress={() => router.push('/search-users')}
                                className="flex-1 flex-row items-center justify-center gap-2 bg-slate-100 py-3 rounded-xl active:bg-slate-200"
                            >
                                <Ionicons name="person-add" size={16} color="#475569" />
                                <Text className="font-bold text-slate-600">Find Friends</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => router.push('/quests')}
                                className="flex-1 flex-row items-center justify-center gap-2 bg-pink-50 py-3 rounded-xl border border-pink-100 active:bg-pink-100"
                            >
                                <Ionicons name="gift" size={16} color="#db2777" />
                                <Text className="font-bold text-pink-600">Quests</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    {/* History List */}
                    <View className="mb-10">
                        <Text className="text-2xl font-black italic tracking-tighter mb-4">RECENT HISTORY 📜</Text>
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
                                    <Text className="text-gray-400 font-bold">No transactions yet.</Text>
                                    <Text className="text-gray-300 text-xs mt-1">Visit a spot to start earning!</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Ranking List */}
                    <View className="flex-row items-center justify-between mb-6">
                        <Text className="text-3xl font-black italic tracking-tighter">TOP TOWNS 🏆</Text>
                        <TouchableOpacity>
                            <Text className="text-[#00C2FF] font-bold text-xs">VIEW ALL</Text>
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
                            <Text className="text-gray-400 font-bold text-xs uppercase mb-4">{item.activeUsers} Active Stakers</Text>

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
        </SafeAreaView >
    );
}
