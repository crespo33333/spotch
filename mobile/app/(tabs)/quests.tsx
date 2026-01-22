import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../utils/api';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function QuestsScreen() {
    const router = useRouter();
    const utils = trpc.useUtils();

    const { data: quests, isLoading, isRefetching, refetch } = trpc.quest.getQuests.useQuery();
    const claimMutation = trpc.quest.claimReward.useMutation({
        onSuccess: () => {
            utils.quest.getQuests.invalidate();
            utils.wallet.getBalance.invalidate(); // Assuming this exists or similar
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (err) => {
            alert(err.message);
        }
    });

    const handleClaim = (questId: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        claimMutation.mutate({ questId });
    };

    const renderQuestItem = ({ item }: { item: any }) => {
        const isCompleted = item.progress >= item.conditionValue;
        const isClaimed = item.status === 'claimed';
        const progressPercent = Math.min(1, item.progress / item.conditionValue);

        return (
            <View className="bg-white m-3 p-4 rounded-3xl shadow-sm border-2 border-slate-100">
                <View className="flex-row justify-between items-center mb-2">
                    <View className="flex-1">
                        <Text className="text-xl font-bold text-slate-800">{item.title}</Text>
                        <Text className="text-slate-500 mt-1">{item.description}</Text>
                    </View>
                    <View className="bg-yellow-100 px-3 py-1 rounded-full">
                        <Text className="text-yellow-700 font-bold">+{item.rewardPoints} Pts</Text>
                    </View>
                </View>

                {/* Progress Bar */}
                <View className="mt-3">
                    <View className="flex-row justify-between mb-1">
                        <Text className="text-xs font-semibold text-slate-400">Progress</Text>
                        <Text className="text-xs font-bold text-slate-600">
                            {item.progress} / {item.conditionValue}
                        </Text>
                    </View>
                    <View className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <View
                            className={`h-full rounded-full ${isClaimed ? 'bg-slate-300' : 'bg-cyan-400'}`}
                            style={{ width: `${progressPercent * 100}%` }}
                        />
                    </View>
                </View>

                {/* Action Button */}
                <TouchableOpacity
                    disabled={!isCompleted || isClaimed || claimMutation.isLoading}
                    onPress={() => handleClaim(item.id)}
                    className={`mt-4 py-3 rounded-2xl items-center flex-row justify-center space-x-2 ${isClaimed
                        ? 'bg-slate-100'
                        : isCompleted
                            ? 'bg-pink-500 shadow-md shadow-pink-200'
                            : 'bg-slate-200'
                        }`}
                >
                    {isClaimed ? (
                        <>
                            <Ionicons name="checkmark-circle" size={18} color="#94a3b8" />
                            <Text className="text-slate-400 font-bold">Claimed</Text>
                        </>
                    ) : isCompleted ? (
                        <>
                            <Ionicons name="gift" size={18} color="white" />
                            <Text className="text-white font-bold">Claim Reward!</Text>
                        </>
                    ) : (
                        <Text className="text-slate-400 font-bold">Keep Going!</Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            {/* Header */}
            <View className="px-6 py-4 flex-row items-center justify-between bg-white border-b border-slate-100">
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text className="text-2xl font-black text-slate-800 tracking-tight">QUESTS</Text>
                <Ionicons name="help-circle-outline" size={24} color="#94a3b8" />
            </View>

            {isLoading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#0ea5e9" />
                </View>
            ) : (
                <FlatList
                    data={quests}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderQuestItem}
                    contentContainerStyle={{ paddingVertical: 10 }}
                    refreshControl={
                        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                    }
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center pt-20">
                            <Ionicons name="earth" size={64} color="#e2e8f0" />
                            <Text className="text-slate-400 mt-4 font-medium">No quests available yet!</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
