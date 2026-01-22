import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/Avatar';
import { trpc } from '../../utils/api';

export default function LeaderboardScreen() {
    const router = useRouter();
    const [filter, setFilter] = useState<'all' | 'weekly'>('all');

    const { data: rankings, isLoading, refetch, isRefetching } = trpc.ranking.getGlobalLeaderboard.useQuery({ period: filter });

    const renderItem = ({ item, index }: { item: any, index: number }) => {
        const isTop3 = index < 3;
        const rankColor = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#94a3b8';

        return (
            <TouchableOpacity
                onPress={() => router.push(`/user/${item.id}`)}
                className={`flex-row items-center mb-3 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm ${isTop3 ? 'border-b-4 border-b-slate-100' : ''}`}
            >
                <View className="w-10 items-center justify-center mr-2">
                    {isTop3 ? (
                        <Ionicons name="trophy" size={24} color={rankColor} />
                    ) : (
                        <Text className="text-lg font-black text-slate-400">{index + 1}</Text>
                    )}
                </View>

                <Avatar seed={item.avatar} size={48} />

                <View className="flex-1 ml-3">
                    <View className="flex-row items-center gap-2">
                        <Text className="font-bold text-slate-800 text-lg">{item.name}</Text>
                        {index === 0 && <View className="bg-yellow-100 px-2 py-0.5 rounded-full"><Text className="text-[10px] text-yellow-700 font-bold">KING</Text></View>}
                    </View>
                    <Text className="text-xs text-slate-400 font-bold">Lv.{item.level || 1} Explorer</Text>
                </View>

                <View className="items-end">
                    <Text className="font-black text-slate-800 text-lg">{item.xp?.toLocaleString() || 0}</Text>
                    <Text className="text-[10px] text-cyan-500 font-bold tracking-widest">XP</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
            {/* Header */}
            <View className="px-6 py-4 bg-white border-b border-slate-100">
                <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-3xl font-black text-slate-800 italic tracking-tighter">RANKING</Text>
                    <TouchableOpacity className="bg-slate-100 p-2 rounded-full">
                        <Ionicons name="filter" size={20} color="#94a3b8" />
                    </TouchableOpacity>
                </View>

                {/* Filter Tabs */}
                <View className="flex-row bg-slate-100 p-1 rounded-xl">
                    <TouchableOpacity
                        onPress={() => setFilter('all')}
                        className={`flex-1 py-2 items-center rounded-lg ${filter === 'all' ? 'bg-white shadow-sm' : ''}`}
                    >
                        <Text className={`font-bold ${filter === 'all' ? 'text-slate-800' : 'text-slate-400'}`}>All Time</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setFilter('weekly')}
                        className={`flex-1 py-2 items-center rounded-lg ${filter === 'weekly' ? 'bg-white shadow-sm' : ''}`}
                    >
                        <Text className={`font-bold ${filter === 'weekly' ? 'text-slate-800' : 'text-slate-400'}`}>Weekly</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* List */}
            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#00C2FF" />
                </View>
            ) : (
                <FlatList
                    data={rankings}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    renderItem={renderItem}
                    onRefresh={refetch}
                    refreshing={isRefetching}
                    ListHeaderComponent={() => (
                        <View className="mb-6 flex-row items-center justify-center gap-4 bg-[#00C2FF] p-6 rounded-3xl shadow-lg shadow-cyan-200">
                            <Ionicons name="planet" size={48} color="white" />
                            <View>
                                <Text className="text-white font-black text-xl">GLOBAL ELITE</Text>
                                <Text className="text-cyan-100 font-bold text-xs">Top players worldwide</Text>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={() => (
                        <View className="items-center py-20">
                            <Text className="text-slate-400 font-bold">No players found yet.</Text>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}
