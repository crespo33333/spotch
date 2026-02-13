import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Share, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { trpc, getStoredUserId } from '../../utils/api';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../../components/Avatar';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';

import { useTranslation } from 'react-i18next';

export default function SpotDetailScreen() {
    const { t } = useTranslation();
    const { id } = useLocalSearchParams();
    const spotId = parseInt(id as string);
    const router = useRouter();
    const [tab, setTab] = useState<'info' | 'board' | 'rank'>('info');
    const [message, setMessage] = useState('');
    const flatListRef = useRef<FlatList>(null);

    // Animations
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    // Fetch Spot Data
    const { data: spot, isLoading } = trpc.spot.getById.useQuery({ id: spotId });

    // Fetch Messages with 3s Polling
    const { data: messages, refetch: refetchMessages, isRefetching } = trpc.spot.getMessages.useQuery({ spotId }, {
        refetchInterval: tab === 'board' ? 3000 : false, // Only poll when active on board
    });
    const { data: stats, refetch: refetchStats } = trpc.spot.getStats.useQuery({ spotId }, {
        refetchInterval: 5000,
    });

    // Fetch Rank Data
    const { data: rankings, isLoading: isRankingLoading } = trpc.ranking.getSpotLeaderboard.useQuery({ spotId }, {
        enabled: tab === 'rank',
    });

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        getStoredUserId().then(id => setCurrentUserId(id));
    }, []);

    const postMutation = trpc.spot.postMessage.useMutation();
    const likeMutation = trpc.spot.toggleLike.useMutation();
    const reportCommentMutation = trpc.spot.reportComment.useMutation();
    const blockUserMutation = trpc.user.block.useMutation();
    const buyGameItemMutation = trpc.exchange.buyGameItem.useMutation();
    const takeoverMutation = trpc.spot.takeover.useMutation();

    const handleTakeover = () => {
        const cost = (spot?.remainingPoints || 0) + 10000;
        Alert.alert(
            "⚔️ Hostile Takeover",
            `Capture this spot for ${cost} Points?\n(Includes 10,000pt Premium)`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "CAPTURE",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const result = await takeoverMutation.mutateAsync({ spotId });
                            Alert.alert("🎉 VICTORY!", `You captured ${spot?.name}!\nYou are now the owner.`);
                            // Invalidate to refresh UI
                            // trpc.useUtils().spot.getById.invalidate({ id: spotId });
                            router.replace('/(tabs)'); // Go back to map to see change
                        } catch (e: any) {
                            Alert.alert("Attack Failed", e.message);
                        }
                    }
                }
            ]
        );
    };

    // Fetch Items
    const { data: coupons } = trpc.exchange.listCoupons.useQuery();
    const gameItems = coupons?.filter(c => c.type === 'game_item') || [];

    const isOwner = spot?.owner && currentUserId && spot.owner.id.toString() === currentUserId;

    const handleBuyItem = (item: any) => {
        Alert.alert(
            "Confirm Purchase",
            `Buy ${item.name} for ${item.cost} Points?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Buy",
                    onPress: async () => {
                        try {
                            await buyGameItemMutation.mutateAsync({ couponId: item.id, targetSpotId: spotId });
                            Alert.alert("Success", item.name + " activated!");
                            // Refetch spot to see status
                            // But spot query key needs invalidation or refetch.
                            // trpc.useUtils().spot.getById.invalidate({ id: spotId });
                        } catch (e: any) {
                            Alert.alert("Error", e.message);
                        }
                    }
                }
            ]
        );
    };

    const showPowerUpShop = () => {
        if (gameItems.length === 0) return Alert.alert("Shop", "No items available.");

        Alert.alert(
            "Spot Power-ups",
            "Enhance your territory!",
            [
                ...gameItems.map(item => ({
                    text: `${item.name} (${item.cost}P)`,
                    onPress: () => handleBuyItem(item)
                })),
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const handleCommentAction = (commentId: number, userId: number) => {
        Alert.alert(
            t('common.action'),
            t('common.selectAction'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.report'),
                    style: 'destructive',
                    onPress: () => showReportReasons(commentId)
                },
                {
                    text: t('common.block'),
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(t('common.blockConfirm'), t('common.blockMsg'), [
                            { text: t('common.cancel'), style: 'cancel' },
                            {
                                text: t('common.block'),
                                style: 'destructive',
                                onPress: async () => {
                                    try {
                                        await blockUserMutation.mutateAsync({ targetUserId: userId });
                                        refetchMessages(); // Refresh to hide content
                                        Alert.alert(t('common.blocked'), t('common.blockedMsg'));
                                    } catch (e: any) {
                                        Alert.alert("Error", e.message);
                                    }
                                }
                            }
                        ])
                    }
                }
            ]
        );
    };

    const showReportReasons = (commentId: number) => {
        const reasons = ['Spam', 'Harassment', 'Inappropriate Content', 'Other'];
        Alert.alert(
            t('common.reportReason'),
            undefined,
            [
                ...reasons.map(r => ({
                    text: r,
                    onPress: () => {
                        reportCommentMutation.mutate({ commentId, reason: r });
                        Alert.alert(t('common.reported'), t('common.reportedMsg'));
                    }
                })),
                { text: t('common.cancel'), style: 'cancel' }
            ]
        );
    };

    const handleLike = async () => {
        // Heart Pop Animation
        scale.value = withSequence(
            withSpring(1.5, { damping: 10, stiffness: 100 }),
            withSpring(1, { damping: 10, stiffness: 100 })
        );

        try {
            await likeMutation.mutateAsync({ spotId });
            refetchStats();
        } catch (e) {
            console.error(e);
        }
    };

    const handleSend = async () => {
        if (!message.trim()) return;
        try {
            await postMutation.mutateAsync({ spotId, content: message });
            setMessage('');
            refetchMessages();
        } catch (e) {
            console.error(e);
        }
    };

    // Auto-scroll to bottom when new messages arrive (Inverted list, so scroll to 0/top)
    useEffect(() => {
        if (tab === 'board' && messages && messages.length > 0) {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }
    }, [messages?.length, tab]);

    const handleClaim = () => {
        router.replace('/(tabs)');
    };

    const handleShare = async () => {
        if (!spot) return;
        try {
            await Share.share({
                message: `Check out this spot on Spotch: ${spot.name}! It has a staking rate of ${spot.pointsPerMinute} P/m. Join me!`,
                url: `https://spotch.app/spot/${spot.id}`,
            });
        } catch (error) {
            console.error(error);
        }
    };



    const getRelativeTime = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        return date.toLocaleDateString();
    };

    if (isLoading) return <View className="flex-1 items-center justify-center p-20"><ActivityIndicator size="large" color="#00C2FF" /><StatusBar style="dark" /></View>;
    if (!spot) return <View className="flex-1 items-center justify-center"><Text className="text-gray-400 font-bold">Spot not found</Text></View>;

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />
            <Stack.Screen options={{
                title: spot.name || 'Spot Detail',
                headerShadowVisible: false,
                headerRight: () => (
                    <TouchableOpacity onPress={handleShare}>
                        <Ionicons name="share-outline" size={24} color="#00C2FF" />
                    </TouchableOpacity>
                )
            }} />

            {/* Header Info */}
            <View className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center gap-3">
                        <View className="w-12 h-12 bg-white rounded-2xl items-center justify-center shadow-sm border border-slate-100">
                            <Text className="text-3xl">📍</Text>
                        </View>
                        <View>
                            <Text className="text-xl font-black text-slate-800" numberOfLines={1}>{spot.name}</Text>
                            <Text className="text-slate-400 font-bold uppercase tracking-tight text-xs">#{spot.id} • {spot.category}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleClaim} className="bg-primary px-6 py-2.5 rounded-full shadow-sm active:scale-95 transition-transform">
                        <Text className="text-white font-black">{t('map.visit').toUpperCase()}</Text>
                    </TouchableOpacity>
                </View>

                {/* Owner Banner */}
                {spot.owner && (
                    <View className="mx-6 mb-6 p-4 bg-yellow-50 rounded-2xl border-2 border-[#FFD700] shadow-sm">
                        <View className="flex-row justify-between items-center mb-2">
                            <View className="flex-row items-center gap-3">
                                <View className="relative">
                                    <Avatar seed={spot.owner.avatar || 'default_seed'} size={40} />
                                    <Text className="absolute -top-2 -right-2 text-lg">👑</Text>
                                </View>
                                <View>
                                    <Text className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">{t('spotDetail.controlledBy') || "CONTROLLED BY"}</Text>
                                    <Text className="text-lg font-black text-slate-800">{spot.owner.name}</Text>
                                </View>
                            </View>
                            <View className="items-end">
                                <Text className="text-2xl font-black text-slate-800">{spot.taxRate || 5}%</Text>
                                <Text className="text-[10px] font-bold text-slate-400 uppercase">Tax Rate</Text>
                            </View>
                        </View>

                        {/* Active Effects & Actions */}
                        <View className="flex-row justify-between items-center pt-2 border-t border-yellow-200/50">
                            <View className="flex-row gap-2">
                                {spot.shieldExpiresAt && new Date(spot.shieldExpiresAt) > new Date() ? (
                                    <View className="bg-blue-100 px-2 py-1 rounded-md flex-row items-center gap-1">
                                        <Text>🛡️</Text>
                                        <Text className="text-[10px] font-bold text-blue-700">Shielded</Text>
                                    </View>
                                ) : null}
                                {spot.taxBoostExpiresAt && new Date(spot.taxBoostExpiresAt) > new Date() && (
                                    <View className="bg-green-100 px-2 py-1 rounded-md flex-row items-center gap-1">
                                        <Text>💰</Text>
                                        <Text className="text-[10px] font-bold text-green-700">Boost Active</Text>
                                    </View>
                                )}
                            </View>

                            {/* Actions */}
                            {isOwner ? (
                                <TouchableOpacity onPress={showPowerUpShop} className="bg-[#FFD700] px-3 py-1.5 rounded-full flex-row items-center gap-1">
                                    <Ionicons name="flash" size={12} color="#854d0e" />
                                    <Text className="text-xs font-black text-yellow-900">POWER-UP</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    onPress={handleTakeover}
                                    className={`px-3 py-1.5 rounded-full flex-row items-center gap-1 ${spot.shieldExpiresAt && new Date(spot.shieldExpiresAt) > new Date() ? 'bg-slate-200' : 'bg-red-500'}`}
                                    disabled={!!(spot.shieldExpiresAt && new Date(spot.shieldExpiresAt) > new Date())}
                                >
                                    <Ionicons name="flag" size={12} color="white" />
                                    <Text className="text-xs font-black text-white">
                                        {spot.shieldExpiresAt && new Date(spot.shieldExpiresAt) > new Date() ? 'LOCKED' : 'CAPTURE'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
                {/* Tabs */}
                <View className="flex-row gap-8 mt-2">
                    <TouchableOpacity onPress={() => setTab('info')} className={`pb-2 ${tab === 'info' ? 'border-b-2 border-[#00C2FF]' : ''}`}>
                        <Text className={`font-black uppercase text-xs ${tab === 'info' ? 'text-slate-800' : 'text-slate-400'}`}>{t('spotDetail.information')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setTab('board')} className={`pb-2 ${tab === 'board' ? 'border-b-2 border-[#00C2FF]' : ''}`}>
                        <View className="flex-row items-center gap-1">
                            <Text className={`font-black uppercase text-xs ${tab === 'board' ? 'text-slate-800' : 'text-slate-400'}`}>{t('spotDetail.board')}</Text>
                            {messages?.length ? (
                                <View className="bg-[#FF4785] px-1 rounded-full"><Text className="text-[10px] text-white font-bold">{messages.length}</Text></View>
                            ) : null}
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setTab('rank')} className={`pb-2 ${tab === 'rank' ? 'border-b-2 border-[#00C2FF]' : ''}`}>
                        <Text className={`font-black uppercase text-xs ${tab === 'rank' ? 'text-slate-800' : 'text-slate-400'}`}>{t('spotDetail.rank')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {tab === 'info' ? (
                <ScrollView className="flex-1 p-6">
                    <View className="flex-row justify-between items-start mb-6">
                        <Text className="text-slate-500 leading-relaxed flex-1 mr-4">
                            {spot.description || "Welcome to this spot! Check in to start earning points from this area."}
                        </Text>
                        <TouchableOpacity onPress={handleLike} className="items-center">
                            <Animated.View style={animatedStyle}>
                                <Ionicons
                                    name={stats?.isLiked ? "heart" : "heart-outline"}
                                    size={32}
                                    color={stats?.isLiked ? "#FF4785" : "#cbd5e1"}
                                />
                            </Animated.View>
                            <Text className="text-[10px] font-black text-slate-400 mt-1 uppercase">{stats?.likes || 0} {t('spotDetail.likes')}</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                        <Text className="text-[10px] font-black text-slate-400 uppercase mb-2">Location</Text>
                        <Text className="text-slate-700 font-bold">{parseFloat(spot.latitude || '0').toFixed(4)}, {parseFloat(spot.longitude || '0').toFixed(4)}</Text>
                    </View>

                    <View className="flex-row gap-4 mb-4">
                        <View className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <Text className="text-[10px] font-black text-slate-400 uppercase mb-1">{t('map.stakingRate')}</Text>
                            <Text className="text-xl font-black text-slate-800">{spot.pointsPerMinute} P/m</Text>
                            {spot.owner && <Text className="text-[10px] font-bold text-red-400 mt-1">-{spot.taxRate}% Tax to Owner</Text>}
                        </View>
                        <View className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <Text className="text-[10px] font-black text-slate-400 uppercase mb-1">Spot Level</Text>
                            <View className="flex-row items-center gap-2">
                                <Text className="text-xl font-black text-[#00C2FF]">Lv.{spot.spotLevel || 1}</Text>
                                <View className="bg-cyan-100 px-1.5 py-0.5 rounded">
                                    <Text className="text-[8px] font-bold text-cyan-600">EXP {(spot as any).totalActivity || 0}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-4">
                        <Text className="text-[10px] font-black text-slate-400 uppercase mb-2">{t('spotDetail.host')}</Text>
                        <View className="flex-row items-center gap-2">
                            <Ionicons name="person-circle-outline" size={20} color="#00C2FF" />
                            <Text className="text-slate-700 font-bold capitalize">{spot.spotter?.name || 'Anonymous'}</Text>
                        </View>
                    </View>
                </ScrollView>
            ) : tab === 'board' ? (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                    keyboardVerticalOffset={100}
                >
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        inverted
                        keyExtractor={item => item.id.toString()}
                        className="flex-1 px-4"
                        contentContainerStyle={{ paddingTop: 20, paddingBottom: 20 }}
                        onRefresh={refetchMessages}
                        refreshing={isRefetching}
                        renderItem={({ item }) => {
                            const isMe = item.user.id.toString() === currentUserId;
                            return (
                                <View className={`flex-row gap-3 mb-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                                    <TouchableOpacity onPress={() => router.push(`/user/${item.user.id}`)}>
                                        <Avatar
                                            seed={item.user.avatar || 'default_seed'}
                                            size={36}
                                            style={{ backgroundColor: '#f1f5f9' }}
                                        />
                                    </TouchableOpacity>
                                    <View className="flex-1">
                                        <TouchableOpacity
                                            activeOpacity={0.8}
                                            onLongPress={() => !isMe && handleCommentAction(item.id, item.user.id)}
                                            className={`max-w-[85%] ${isMe ? 'items-end self-end' : 'items-start'}`}
                                        >
                                            {!isMe && <Text className="font-black text-slate-400 text-[10px] mb-1 ml-1 uppercase">{item.user.name}</Text>}
                                            <View className={`px-4 py-2 rounded-2xl ${isMe ? 'bg-[#00C2FF] rounded-tr-none' : 'bg-slate-100 rounded-tl-none'}`}>
                                                <Text className={`${isMe ? 'text-white' : 'text-slate-800'} text-sm font-medium`}>{item.content}</Text>
                                            </View>
                                            <Text className="text-[8px] text-slate-300 mt-1 uppercase font-bold">{getRelativeTime(item.createdAt || '')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        }}
                        ListEmptyComponent={
                            <View className="flex-1 items-center justify-center py-20">
                                <Ionicons name="chatbubbles-outline" size={48} color="#cbd5e1" />
                                <Text className="text-slate-400 font-bold mt-4">No messages yet. Be the first!</Text>
                            </View>
                        }
                    />

                    {/* Input Area */}
                    <View className="p-4 border-t border-slate-100 bg-white">
                        <View className="flex-row items-center gap-2 bg-slate-50 rounded-full px-4 py-2 border border-slate-100">
                            <TextInput
                                className="flex-1 py-1 text-slate-700 font-medium"
                                placeholder={t('spotDetail.messagePlaceholder')}
                                value={message}
                                onChangeText={setMessage}
                                maxLength={280}
                                multiline
                            />
                            <TouchableOpacity
                                onPress={handleSend}
                                disabled={!message.trim() || postMutation.isLoading}
                                className={`w-8 h-8 rounded-full items-center justify-center ${message.trim() ? 'bg-[#00C2FF]' : 'bg-slate-200'}`}
                            >
                                <Ionicons name="arrow-up" size={18} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            ) : (
                <View className="flex-1">
                    {isRankingLoading ? (
                        <ActivityIndicator className="mt-10" color="#00C2FF" />
                    ) : (
                        <FlatList
                            data={rankings}
                            keyExtractor={(item) => (item.userId ?? Math.random()).toString()}
                            className="flex-1 px-6 pt-6"
                            renderItem={({ item, index }) => (
                                <TouchableOpacity
                                    onPress={() => item.userId && router.push(`/user/${item.userId}`)}
                                    className="flex-row items-center mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100"
                                >
                                    <View className="w-8 items-center justify-center mr-2">
                                        <Text className={`font-black ${index < 3 ? 'text-[#00C2FF] text-lg' : 'text-slate-300'}`}>
                                            {index + 1}
                                        </Text>
                                    </View>
                                    <Avatar seed={item.avatar || 'default_seed'} size={40} />
                                    <View className="flex-1 ml-3">
                                        <Text className="font-bold text-slate-800">{item.name}</Text>
                                        <Text className="text-xs text-slate-400 font-bold uppercase tracking-widest">Master Earner</Text>
                                    </View>
                                    <View className="items-end">
                                        <Text className="font-black text-slate-800">{item.totalEarned} P</Text>
                                        <Text className="text-[10px] text-[#FF4785] font-bold">EARNED</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            ListHeaderComponent={() => (
                                <View className="mb-6 items-center">
                                    <Ionicons name="trophy" size={48} color="#FFD700" />
                                    <Text className="text-xl font-black text-slate-800 mt-2">{t('spotDetail.leaderboard')}</Text>
                                    <Text className="text-slate-400 text-xs font-bold uppercase">The top earners at this location</Text>
                                </View>
                            )}
                            ListEmptyComponent={() => (
                                <View className="items-center py-20">
                                    <Text className="text-slate-300 font-bold">No data yet</Text>
                                </View>
                            )}
                        />
                    )}
                </View>
            )}
        </View>
    );
}
