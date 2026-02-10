
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { trpc } from '../../utils/api';
import { Avatar } from '../../components/Avatar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function PublicProfileScreen() {
    const { id } = useLocalSearchParams();
    const userId = parseInt(id as string);
    const router = useRouter();
    const utils = trpc.useUtils();

    const { data: profile, isLoading } = trpc.user.getProfile.useQuery({ userId });

    const followMutation = trpc.user.follow.useMutation({
        onSuccess: () => utils.user.getProfile.invalidate({ userId })
    });

    const unfollowMutation = trpc.user.unfollow.useMutation({
        onSuccess: () => utils.user.getProfile.invalidate({ userId })
    });

    const reportUserMutation = trpc.user.report.useMutation();
    const blockUserMutation = trpc.user.block.useMutation();

    if (isLoading) return <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#00C2FF" /></View>;
    if (!profile) return <View className="flex-1 items-center justify-center"><Text>User not found</Text></View>;

    const handleFollowToggle = async () => {
        if (profile.isFollowing) {
            await unfollowMutation.mutateAsync({ targetUserId: userId });
        } else {
            await followMutation.mutateAsync({ targetUserId: userId });
        }
    };

    const handleProfileOptions = () => {
        Alert.alert(
            profile.name || "User",
            undefined,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Report User',
                    style: 'destructive',
                    onPress: () => {
                        const reasons = ['Spam', 'Fake Account', 'Inappropriate Content', 'Harassment'];
                        Alert.alert("Report Reason", undefined, [
                            ...reasons.map(r => ({
                                text: r,
                                onPress: () => {
                                    reportUserMutation.mutate({ targetType: 'user', targetId: userId, reason: r });
                                    Alert.alert("Reported", "Thank you for keeping Spotch safe.");
                                }
                            })),
                            { text: "Cancel", style: "cancel" }
                        ]);
                    }
                },
                {
                    text: 'Block User',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert("Block User?", "You will no longer see their content.", [
                            { text: "Cancel", style: "cancel" },
                            {
                                text: "Block",
                                style: "destructive",
                                onPress: async () => {
                                    await blockUserMutation.mutateAsync({ targetUserId: userId });
                                    utils.user.getProfile.invalidate({ userId });
                                    router.replace('/(tabs)');
                                    Alert.alert("Blocked", "User has been blocked.");
                                }
                            }
                        ]);
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Stack.Screen options={{
                title: profile.name ?? undefined,
                headerShadowVisible: false,
                headerBackTitle: 'Back',
                headerRight: () => (
                    <TouchableOpacity onPress={handleProfileOptions}>
                        <Ionicons name="ellipsis-horizontal" size={24} color="black" />
                    </TouchableOpacity>
                )
            }} />

            <ScrollView className="flex-1">
                <View className="items-center py-8 px-6">
                    <Avatar
                        seed={profile.avatar ?? 'default_seed'}
                        size={120}
                        showBorder
                    />

                    <Text className="text-3xl font-black text-gray-900 mt-4">{profile.name}</Text>
                    <Text className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-1">LVL {profile.level || 1} Explorer</Text>

                    {/* Stats */}
                    <View className="flex-row gap-8 mt-8 w-full justify-center">
                        <View className="items-center">
                            <Text className="text-xl font-black text-gray-900">{profile.followerCount}</Text>
                            <Text className="text-gray-400 font-bold text-[10px] uppercase">Followers</Text>
                        </View>
                        <View className="items-center">
                            <Text className="text-xl font-black text-gray-900">{profile.followingCount}</Text>
                            <Text className="text-gray-400 font-bold text-[10px] uppercase">Following</Text>
                        </View>
                        <View className="items-center">
                            <Text className="text-xl font-black text-gray-900">{profile.xp || 0}</Text>
                            <Text className="text-gray-400 font-bold text-[10px] uppercase">XPEarned</Text>
                        </View>
                    </View>

                    {/* Actions */}
                    <View className="mt-10 w-full flex-row gap-4">
                        <TouchableOpacity
                            onPress={handleFollowToggle}
                            className="flex-1"
                            disabled={followMutation.isLoading || unfollowMutation.isLoading}
                        >
                            <LinearGradient
                                colors={profile.isFollowing ? ['#f1f5f9', '#f1f5f9'] : ['#00C2FF', '#FF4785']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                className="p-4 rounded-2xl items-center"
                            >
                                <Text className={`font-black text-lg ${profile.isFollowing ? 'text-gray-400' : 'text-white'}`}>
                                    {profile.isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push(`/chat/${userId}?name=${profile.name}&avatar=${profile.avatar}`)}
                            className="bg-slate-50 p-4 rounded-2xl items-center justify-center border border-slate-200 aspect-square"
                        >
                            <Ionicons name="chatbubble-ellipses" size={24} color="#00C2FF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Badges */}
                <View className="px-6 py-4">
                    <Text className="text-gray-900 font-black text-lg mb-4">Badges</Text>
                    <View className="flex-row flex-wrap gap-4">
                        {profile.badges?.length > 0 ? (
                            profile.badges.map((badge: any) => (
                                <View
                                    key={badge.id}
                                    className="items-center"
                                >
                                    <View
                                        style={{ backgroundColor: badge.color }}
                                        className="w-16 h-16 rounded-2xl items-center justify-center border border-slate-100 shadow-sm"
                                    >
                                        <Text className="text-2xl">{badge.icon}</Text>
                                    </View>
                                    <Text className="text-[10px] font-black text-slate-400 mt-2 uppercase">{badge.name}</Text>
                                </View>
                            ))
                        ) : (
                            <View className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 w-full items-center">
                                <Text className="text-slate-400 font-bold uppercase text-xs">No badges earned yet</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
