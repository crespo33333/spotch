import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Mock Data
const NEWS_ITEMS = [
    { id: '1', type: 'system', text: 'よっ友プレミアムが新登場！今なら初月無料キャンペーン中🎉', date: '2時間前' },
    { id: '2', type: 'system', text: 'バージョン3.0.10にアップデートしました。新機能を確認しましょう。', date: '1日前' },
];

const FOOTPRINT_ITEMS = [
    { id: '1', type: 'like', user: 'くーぱー', action: 'があなたの投稿をいいねしました', avatar: 'https://robohash.org/cooper?set=set4' },
    { id: '2', type: 'follow', user: 'アキ', action: 'があなたをフォローしました', avatar: 'https://robohash.org/aki?set=set4' },
    { id: '3', type: 'visit', user: 'Explorer99', action: 'があなたのスポット「Shibuya」にチェックインしました', avatar: 'https://robohash.org/exp99?set=set4' },
];

export default function ActivityScreen() {
    const [activeTab, setActiveTab] = useState<'news' | 'footprints'>('news');

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

            <ScrollView className="flex-1 bg-white">
                {activeTab === 'news' ? (
                    <View>
                        {NEWS_ITEMS.map((item) => (
                            <View key={item.id} className="p-4 border-b border-gray-100 flex-row gap-3">
                                <View className="w-10 h-10 rounded-full bg-[#E0F7FF] items-center justify-center">
                                    <Ionicons name="megaphone" size={20} color="#00C2FF" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-800 leading-5 mb-1">{item.text}</Text>
                                    <Text className="text-gray-400 text-xs">{item.date}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View>
                        {FOOTPRINT_ITEMS.map((item) => (
                            <View key={item.id} className="p-4 border-b border-gray-50 flex-row items-center gap-3">
                                <Image source={{ uri: item.avatar }} className="w-12 h-12 rounded-full bg-gray-100" />
                                <View className="flex-1">
                                    <Text className="text-gray-800">
                                        <Text className="font-bold">{item.user}</Text> {item.action}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
