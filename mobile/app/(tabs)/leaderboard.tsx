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
                className={`flex-row items-center mb-4 bg-white p-4 rounded-[24px] border-4 border-black ${isTop3 ? 'bg-yellow-50' : ''}`}
                style={{ shadowColor: "#000", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 }}
            >
                <View className={`w-12 h-12 items-center justify-center mr-3 rounded-full border-2 border-black ${index === 0 ? 'bg-[#FFD700]' : index === 1 ? 'bg-[#C0C0C0]' : index === 2 ? 'bg-[#CD7F32]' : 'bg-white'}`}>
                    <Text className="font-black text-lg text-black">#{index + 1}</Text>
                </View>

                <View className="relative">
                    <View className="p-0.5 rounded-full border-2 border-black bg-white">
                        <Avatar seed={item.avatar} size={48} />
                    </View>
                </View>

                <View className="flex-1 ml-3">
                    <View className="flex-row items-center gap-2">
                        <Text className="font-black text-black text-lg tracking-tight" numberOfLines={1}>{item.name}</Text>
                        {index === 0 && <View className="bg-black px-2 py-0.5 rounded-full"><Text className="text-[10px] text-yellow-400 font-black">KING</Text></View>}
                    </View>
                    <Text className="text-xs text-slate-500 font-bold uppercase tracking-wide">Lv.{item.level || 1} Explorer</Text>
                </View>

                <View className="items-end bg-black/5 px-2 py-1 rounded-lg">
                    <Text className="font-black text-black text-lg">{item.xp?.toLocaleString() || 0}</Text>
                    <Text className="text-[10px] text-[#00C2FF] font-black tracking-widest">XP</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
            {/* Header */}
            <View className="px-6 py-4 bg-white border-b-4 border-black">
                <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-4xl font-black text-black italic tracking-tighter">RANKING</Text>
                    <TouchableOpacity className="bg-black p-2 rounded-full border-2 border-black active:bg-gray-800">
                        <Ionicons name="filter" size={20} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Filter Tabs */}
                <View className="flex-row bg-slate-100 p-1.5 rounded-full border-2 border-slate-200">
                    <TouchableOpacity
                        onPress={() => setFilter('all')}
                        className={`flex-1 py-2 items-center rounded-full ${filter === 'all' ? 'bg-white border-2 border-black' : ''}`}
                    >
                        <Text className={`font-black ${filter === 'all' ? 'text-black' : 'text-slate-400'}`}>ALL TIME</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setFilter('weekly')}
                        className={`flex-1 py-2 items-center rounded-full ${filter === 'weekly' ? 'bg-white border-2 border-black' : ''}`}
                    >
                        <Text className={`font-black ${filter === 'weekly' ? 'text-black' : 'text-slate-400'}`}>WEEKLY</Text>
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
                        <View className="mb-6 flex-row items-center justify-center gap-4 bg-[#00C2FF] p-6 rounded-[24px] border-4 border-black" style={{ shadowColor: "#000", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 }}>
                            <Ionicons name="planet" size={48} color="white" />
                            <View>
                                <Text className="text-white font-black text-2xl italic tracking-tighter">GLOBAL ELITE</Text>
                                <Text className="text-black font-bold text-xs uppercase bg-white/30 px-2 py-0.5 rounded-full self-start mt-1">Top players worldwide</Text>
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
