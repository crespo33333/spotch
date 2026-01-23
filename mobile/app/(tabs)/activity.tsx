import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { trpc } from '../../utils/api';
import { Avatar } from '../../components/Avatar';

// Mock Data


const FOOTPRINT_ITEMS = [
    { id: '1', type: 'like', user: 'くーぱー', action: 'があなたの投稿をいいねしました', avatar: 'https://robohash.org/cooper?set=set4' },
    { id: '2', type: 'follow', user: 'アキ', action: 'があなたをフォローしました', avatar: 'https://robohash.org/aki?set=set4' },
    { id: '3', type: 'visit', user: 'Explorer99', action: 'があなたのスポット「Shibuya」にチェックインしました', avatar: 'https://robohash.org/exp99?set=set4' },
];

export default function ActivityScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'news' | 'footprints'>('news');
    const [refreshing, setRefreshing] = useState(false);

    // Fetch real activity feed
    const { data: feed, isLoading: isFeedLoading, refetch: refetchFeed } = trpc.activity.getFeed.useQuery(undefined, {
        enabled: activeTab === 'footprints',
    });

    // Fetch personal notifications
    const { data: notifications, isLoading: isNotifLoading, refetch: refetchNotifs } = trpc.activity.getNotifications.useQuery(undefined, {
        enabled: activeTab === 'news',
    });

    const onRefresh = async () => {
        setRefreshing(true);
        if (activeTab === 'news') await refetchNotifs();
        else await refetchFeed();
        setRefreshing(false);
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <View className="items-center py-4 border-b border-gray-100">
                <Text className="text-[#00C2FF] text-lg font-bold">アクティビティ</Text>
            </View>

            {/* Tabs */}
            <View className="flex-row border-b border-gray-200">
                <TouchableOpacity
                    onPress={() => setActiveTab('news')}
                    className={`flex-1 py-3 items-center border-b-2 ${activeTab === 'news' ? 'border-[#00C2FF]' : 'border-transparent'}`}
                >
                    <Text className={`font-bold ${activeTab === 'news' ? 'text-[#00C2FF]' : 'text-gray-400'}`}>お知らせ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('footprints')}
                    className={`flex-1 py-3 items-center border-b-2 ${activeTab === 'footprints' ? 'border-[#00C2FF]' : 'border-transparent'}`}
                >
                    <Text className={`font-bold ${activeTab === 'footprints' ? 'text-[#00C2FF]' : 'text-gray-400'}`}>ヒストリー</Text>
                </TouchableOpacity>
            </View>

            {/* Find Friends CTA */}
            <TouchableOpacity
                onPress={() => router.push('/search-users')}
                className="mx-4 mt-4 bg-slate-50 p-4 rounded-xl flex-row items-center gap-3 border border-slate-100 active:bg-slate-100"
            >
                <View className="bg-white p-2 rounded-full shadow-sm">
                    <Ionicons name="search" size={20} color="#00C2FF" />
                </View>
                <View className="flex-1">
                    <Text className="font-bold text-slate-700">友達を探す</Text>
                    <Text className="text-xs text-slate-400">IDや名前（"jun"など）で検索しよう</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </TouchableOpacity>

            <ScrollView
                className="flex-1 bg-white"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00C2FF']} />
                }
            >
                {activeTab === 'news' ? (
                    <View>
                        {/* System News (Fethed from Backend) */}
                        {notifications?.filter((n: any) => n.type === 'system').map((item: any) => (
                            <View key={item.id} className="p-4 border-b border-gray-100 flex-row gap-3 bg-slate-50">
                                <View className="w-10 h-10 rounded-full bg-[#E0F7FF] items-center justify-center">
                                    <Ionicons name="megaphone" size={20} color="#00C2FF" />
                                </View>
                                <View className="flex-1">
                                    <View className="flex-row justify-between">
                                        <Text className="text-gray-800 leading-5 mb-1 font-bold">{item.user.name}</Text>
                                        <Text className="text-gray-400 text-xs">
                                            {new Date(item.createdAt || '').toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <Text className="text-gray-800 font-bold mb-1">{item.message}</Text>
                                    <Text className="text-gray-600 text-sm">{item.body || item.message}</Text>
                                </View>
                            </View>
                        ))}

                        {/* Empty System News State */}
                        {notifications?.filter((n: any) => n.type === 'system').length === 0 && (
                            <View className="p-4 bg-slate-50 items-center">
                                <Text className="text-gray-400 text-xs">お知らせはありません</Text>
                            </View>
                        )}


                        {/* Real Notifications (Likes/Follows) */}
                        {notifications?.filter((n: any) => n.type !== 'system').map((item: any) => (
                            <View key={item.id} className="p-4 border-b border-gray-100 flex-row gap-3">
                                <View className={`w-10 h-10 rounded-full items-center justify-center ${item.type === 'like' ? 'bg-pink-100' : 'bg-green-100'}`}>
                                    <Ionicons
                                        name={item.type === 'like' ? "heart" : "person-add"}
                                        size={20}
                                        color={item.type === 'like' ? "#FF4785" : "#10B981"}
                                    />
                                </View>
                                <View className="flex-1">
                                    <View className="flex-row justify-between mb-1">
                                        <Text className="text-gray-800 text-sm">
                                            <Text className="font-bold">{item.user.name}</Text> {item.message}
                                        </Text>
                                    </View>
                                    <Text className="text-gray-400 text-xs">
                                        {new Date(item.createdAt || '').toLocaleDateString()} {new Date(item.createdAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View>
                        {feed?.map((item: any) => (
                            <View key={item.id} className="p-4 border-b border-gray-50 flex-row items-center gap-3">
                                <TouchableOpacity onPress={() => router.push(`/user/${item.userId}`)}>
                                    <Avatar
                                        seed={item.avatar || 'default_seed'}
                                        size={48}
                                        style={{ backgroundColor: '#f1f5f9' }}
                                    />
                                </TouchableOpacity>
                                <View className="flex-1">
                                    <View className="flex-row justify-between mb-1">
                                        <Text className="text-gray-800">
                                            <Text className="font-bold text-slate-900">{item.user}</Text>
                                            <Text className="text-slate-600"> {item.action}</Text>
                                        </Text>
                                    </View>
                                    <Text className="text-[10px] text-slate-400 font-medium">
                                        {new Date(item.createdAt || '').toLocaleDateString()} {new Date(item.createdAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </View>
                        ))}
                        {(!feed || feed.length === 0) && !isFeedLoading && (
                            <View className="items-center py-20">
                                <Ionicons name="people-outline" size={48} color="#cbd5e1" />
                                <Text className="mt-4 text-slate-400 font-bold">まだアクティビティはありません</Text>
                                <Text className="text-slate-300 text-xs">友達をフォローして動きをチェックしよう！</Text>
                            </View>
                        )}
                        {isFeedLoading && (
                            <View className="items-center py-20">
                                <Text className="text-slate-400 font-bold">読み込み中...</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
