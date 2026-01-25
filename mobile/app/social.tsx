import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trpc } from '../utils/api';
import { Avatar } from '../components/Avatar';
import { useTranslation } from 'react-i18next';

export default function SocialScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const [query, setQuery] = useState('');

    const { data: results, isLoading, refetch } = trpc.user.searchUsers.useQuery(
        { query },
        { enabled: query.length > 0 }
    );

    const utils = trpc.useUtils();
    const followMutation = trpc.user.follow.useMutation({
        onSuccess: () => {
            utils.user.getProfile.invalidate(); // Refresh my profile (following count)
            utils.user.searchUsers.invalidate(); // Refresh search results (isFollowing status if we had it)
        }
    });

    const unfollowMutation = trpc.user.unfollow.useMutation({
        onSuccess: () => {
            utils.user.getProfile.invalidate();
            utils.user.searchUsers.invalidate();
        }
    });

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            onPress={() => router.push(`/user/${item.id}`)}
            className="flex-row items-center justify-between p-4 bg-white mb-2 rounded-2xl border-2 border-slate-100"
        >
            <View className="flex-row items-center gap-3 flex-1">
                <Avatar seed={item.avatar} size={48} />
                <View>
                    <Text className="font-bold text-slate-800 text-lg">{item.name}</Text>
                    <Text className="text-xs text-slate-400 font-bold">Explorer</Text>
                </View>
            </View>

            {/* Follow Button */}
            <TouchableOpacity
                onPress={() => {
                    if (item.isFollowing) {
                        unfollowMutation.mutate({ targetUserId: item.id });
                    } else {
                        followMutation.mutate({ targetUserId: item.id });
                    }
                }}
                className={`px-4 py-2 rounded-full border-2 ${item.isFollowing ? 'bg-white border-slate-200' : 'bg-black border-black'}`}
            >
                <Text className={`font-bold text-xs ${item.isFollowing ? 'text-slate-500' : 'text-white'}`}>
                    {item.isFollowing ? 'Following' : 'Follow'}
                </Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            {/* Header */}
            <View className="px-6 py-4 border-b-2 border-black flex-row items-center gap-4">
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={28} color="black" />
                </TouchableOpacity>
                <Text className="text-xl font-black italic tracking-tighter">FIND FRIENDS</Text>
            </View>

            {/* Search Bar */}
            <View className="p-4">
                <View className="flex-row items-center bg-slate-100 p-3 rounded-full border-2 border-slate-200">
                    <Ionicons name="search" size={20} color="#94A3B8" />
                    <TextInput
                        className="flex-1 ml-2 font-bold text-slate-800"
                        placeholder="Search users..."
                        value={query}
                        onChangeText={setQuery}
                        autoCapitalize="none"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Results */}
            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#00C2FF" />
                </View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 16 }}
                    ListEmptyComponent={() => (
                        <View className="items-center py-10">
                            <Text className="text-slate-400 font-bold">
                                {query.length > 0 ? "No users found." : "Search for friends to follow!"}
                            </Text>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}
