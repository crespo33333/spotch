import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trpc } from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/Avatar';

export default function ChatIndexScreen() {
    const router = useRouter();
    const { data: conversations, isLoading, refetch, isRefetching } = trpc.message.listConversations.useQuery();

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Stack.Screen options={{
                title: 'Messages',
                headerLargeTitle: true,
                headerShadowVisible: false,
                headerLargeTitleShadowVisible: false,
            }} />

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#00C2FF" />
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.user.id.toString()}
                    className="flex-1"
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={
                        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#00C2FF" />
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => router.push(`/chat/${item.user.id}?name=${item.user.name}&avatar=${item.user.avatar}`)}
                            className="flex-row items-center p-4 mb-3 bg-slate-50 rounded-2xl border border-slate-100 active:scale-[0.98] transition-transform"
                        >
                            <Avatar seed={item.user.avatar || 'default'} size={56} style={{ backgroundColor: '#e2e8f0' }} />
                            <View className="flex-1 ml-4 justify-center">
                                <View className="flex-row justify-between items-center mb-1">
                                    <Text className="font-bold text-lg text-slate-800">{item.user.name}</Text>
                                    <Text className="text-xs text-slate-400 font-medium">
                                        {item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleDateString() : ''}
                                    </Text>
                                </View>
                                <Text className="text-slate-500" numberOfLines={1}>
                                    {item.isMeSender ? 'You: ' : ''}{item.lastMessage}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center py-20">
                            <Ionicons name="chatbubbles-outline" size={48} color="#cbd5e1" />
                            <Text className="text-slate-400 font-bold mt-4">No conversations yet</Text>
                            <Text className="text-slate-300 text-xs mt-1">Visit a profile to start chatting!</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
