import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../utils/api';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

export default function QuestsScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const utils = trpc.useUtils();

    const { data: quests, isLoading, isRefetching, refetch } = trpc.quest.getQuests.useQuery();
    const claimMutation = trpc.quest.claimReward.useMutation({
        onSuccess: () => {
            utils.quest.getQuests.invalidate();
            utils.wallet.getBalance.invalidate();
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

    const renderQuestItem = ({ item, index }: { item: any, index: number }) => {
        const isCompleted = item.progress >= item.conditionValue;
        const isClaimed = item.status === 'claimed';
        const progressPercent = Math.min(1, item.progress / item.conditionValue);

        return (
            <View className="bg-white mx-4 mb-6 p-6 rounded-[32px] border-4 border-black shadow-xl relative overflow-hidden">
                {/* Decorative Badge */}
                <View className={`absolute top-0 right-0 px-4 py-1 border-bl-4 border-black border-l-4 border-b-4 ${isClaimed ? 'bg-gray-200' : 'bg-[#FFD700]'}`}>
                    <Text className="font-black text-[10px] uppercase">+{item.rewardPoints}P</Text>
                </View>

                <View className="flex-row justify-between items-start mb-4 pr-12">
                    <View className="flex-1">
                        <Text className="text-2xl font-black text-black italic tracking-tighter leading-7">{item.title}</Text>
                        <Text className="text-gray-400 font-bold text-xs mt-1">{item.description}</Text>
                    </View>
                </View>

                {/* Progress Bar */}
                <View className="mt-2 bg-gray-50 p-4 rounded-2xl border-2 border-gray-100">
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('quests.progress')}</Text>
                        <Text className="text-sm font-black text-black">
                            {item.progress} / {item.conditionValue}
                        </Text>
                    </View>
                    <View className="h-4 bg-white rounded-full border-2 border-black overflow-hidden relative">
                        <View
                            className={`h-full ${isClaimed ? 'bg-gray-300' : 'bg-[#00C2FF]'}`}
                            style={{ width: `${progressPercent * 100}%` }}
                        />
                    </View>
                </View>

                {/* Action Button */}
                <TouchableOpacity
                    disabled={!isCompleted || isClaimed || claimMutation.isLoading}
                    onPress={() => handleClaim(item.id)}
                    className={`mt-6 py-4 rounded-2xl border-4 border-black items-center flex-row justify-center transform active:scale-95 ${isClaimed
                        ? 'bg-gray-100 border-gray-300'
                        : isCompleted
                            ? 'bg-[#FF4785]'
                            : 'bg-white'
                        }`}
                    style={isCompleted && !isClaimed ? { shadowColor: "#000", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 } : {}}
                >
                    {isClaimed ? (
                        <>
                            <Ionicons name="checkmark-circle" size={20} color="#94a3b8" />
                            <Text className="text-gray-400 font-black ml-2 uppercase tracking-widest">{t('quests.claimed')}</Text>
                        </>
                    ) : isCompleted ? (
                        <>
                            <Ionicons name="gift" size={20} color="white" />
                            <Text className="text-white font-black ml-2 uppercase tracking-widest">{t('quests.claimReward')}</Text>
                        </>
                    ) : (
                        <Text className="text-gray-400 font-black uppercase tracking-widest">{t('quests.keepGoing')}</Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="px-6 py-6 flex-row items-center justify-between border-b-4 border-black bg-white">
                <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
                    <Ionicons name="arrow-back" size={28} color="black" />
                </TouchableOpacity>
                <Text className="text-3xl font-black italic text-black tracking-tighter">{t('quests.title')} 🏁</Text>
                <View className="w-10" />
            </View>

            {isLoading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#FF4785" />
                </View>
            ) : (
                <FlatList
                    data={quests}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderQuestItem}
                    contentContainerStyle={{ paddingVertical: 24 }}
                    refreshControl={
                        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF4785" />
                    }
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center pt-20 px-12">
                            <View className="bg-gray-50 p-8 rounded-full mb-6 border-4 border-black">
                                <Ionicons name="earth-outline" size={64} color="black" />
                            </View>
                            <Text className="text-2xl font-black text-black text-center mb-2 tracking-tighter">{t('quests.noQuests')}</Text>
                            <Text className="text-gray-400 font-bold text-center">{t('quests.emptyDescription')}</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
