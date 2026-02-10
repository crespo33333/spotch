import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../utils/api';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

export default function QuestsScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const utils = trpc.useUtils();

    const { data: quests, isLoading } = trpc.quest.getQuests.useQuery();

    const claimMutation = trpc.quest.claimReward.useMutation({
        onSuccess: (data) => {
            Alert.alert("Reward Claimed!", `You earned ${data.reward} points! 🌟`);
            utils.quest.getQuests.invalidate();
            utils.wallet.getBalance.invalidate();
            utils.wallet.getTransactions.invalidate();
        },
        onError: (err) => {
            Alert.alert("Claim Failed", err.message);
        }
    });

    const handleClaim = (questId: number) => {
        claimMutation.mutate({ questId });
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#FF4785" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            <Stack.Screen options={{
                title: t('profile.quests', { defaultValue: 'Quests' }),
                headerShadowVisible: false,
                headerBackTitle: 'Profile',
            }} />

            <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Header Banner */}
                <View className="bg-[#FF4785] p-6 rounded-[32px] mb-8 relative overflow-hidden">
                    <View className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full" />
                    <View className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full" />

                    <Text className="text-white font-black text-3xl mb-2">Daily Quests</Text>
                    <Text className="text-white/80 font-bold text-sm">Complete challenges to earn rewards and level up faster!</Text>
                </View>

                {/* Quest List */}
                <View className="gap-4">
                    {quests?.map((quest: any) => {
                        const isClaimable = quest.status === 'in_progress' && quest.progress >= quest.conditionValue;
                        const isCompleted = quest.status === 'claimed' || quest.status === 'completed'; // Should depend on logic, usually 'claimed' means done.
                        // My backend returns calculatedProgress.
                        // Wait, my backend implementation returns 'status' as 'claimed' if claimed.

                        return (
                            <View
                                key={quest.id}
                                className={`p-5 rounded-3xl border-2 ${isCompleted ? 'bg-slate-50 border-slate-200' :
                                        isClaimable ? 'bg-white border-[#FF4785] shadow-lg shadow-pink-100' :
                                            'bg-white border-slate-100'
                                    }`}
                            >
                                <View className="flex-row justify-between items-start mb-3">
                                    <View className="flex-1 mr-4">
                                        <Text className={`font-black text-lg ${isCompleted ? 'text-slate-400' : 'text-slate-900'}`}>{quest.title}</Text>
                                        <Text className="text-slate-400 text-xs font-bold mt-1 leading-4">{quest.description}</Text>
                                    </View>
                                    <View className={`px-2 py-1 rounded-lg ${isCompleted ? 'bg-slate-200' : 'bg-yellow-100'}`}>
                                        <Text className={`font-black text-xs ${isCompleted ? 'text-slate-500' : 'text-yellow-700'}`}>
                                            +{quest.rewardPoints} P
                                        </Text>
                                    </View>
                                </View>

                                {/* Progress Bar */}
                                <View className="mb-4">
                                    <View className="flex-row justify-between mb-1.5">
                                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {isCompleted ? 'COMPLETED' : 'PROGRESS'}
                                        </Text>
                                        <Text className="text-[10px] font-black text-slate-600">
                                            {Math.min(quest.progress, quest.conditionValue)} / {quest.conditionValue}
                                        </Text>
                                    </View>
                                    <View className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <View
                                            className={`h-full rounded-full ${isCompleted ? 'bg-green-400' : 'bg-[#FF4785]'}`}
                                            style={{ width: `${Math.min((quest.progress / quest.conditionValue) * 100, 100)}%` }}
                                        />
                                    </View>
                                </View>

                                {/* Action Button */}
                                {isClaimable ? (
                                    <TouchableOpacity
                                        onPress={() => handleClaim(quest.id)}
                                        disabled={claimMutation.isLoading}
                                        className="w-full"
                                    >
                                        <LinearGradient
                                            colors={['#FF4785', '#db2777']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            className="p-3 rounded-xl items-center flex-row justify-center gap-2"
                                        >
                                            {claimMutation.isLoading ? (
                                                <ActivityIndicator color="white" size="small" />
                                            ) : (
                                                <>
                                                    <Ionicons name="gift-outline" size={18} color="white" />
                                                    <Text className="text-white font-black">CLAIM REWARD</Text>
                                                </>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                ) : isCompleted ? (
                                    <View className="flex-row items-center justify-center gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200">
                                        <Ionicons name="checkmark-circle" size={18} color="#94a3b8" />
                                        <Text className="text-slate-400 font-bold">CLAIMED</Text>
                                    </View>
                                ) : (
                                    <View className="flex-row items-center justify-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <Text className="text-slate-400 font-bold text-xs uppercase">Keep Going</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
