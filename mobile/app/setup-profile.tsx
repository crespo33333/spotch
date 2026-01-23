
import { View, Text, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { getCreatureAvatar, getAvatarOptions, AvatarCategory } from '../utils/avatar';
import { Avatar } from '../components/Avatar';
import { trpc, setStoredUserId } from '../utils/api';
import { usePushNotifications } from '../hooks/usePushNotifications';

const CATEGORIES: { id: AvatarCategory, labelKey: string, icon: string }[] = [
    { id: 'tech', labelKey: 'categories.tech', icon: '🤖' },
    { id: 'dogs', labelKey: 'categories.dogs', icon: '🐶' },
    { id: 'space', labelKey: 'categories.space', icon: '🚀' },
    { id: 'monsters', labelKey: 'categories.monsters', icon: '👾' },
    { id: 'cats', labelKey: 'categories.cats', icon: '🐱' },
    { id: 'flowers', labelKey: 'categories.flowers', icon: '🌸' },
];

import { useTranslation } from 'react-i18next';

export default function SetupProfileScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { expoPushToken } = usePushNotifications();
    const [nickname, setNickname] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<AvatarCategory>('tech');
    const [avatarSeed, setAvatarSeed] = useState(getAvatarOptions('tech')[0]);

    const currentOptions = getAvatarOptions(selectedCategory);

    const createUser = trpc.user.loginOrRegister.useMutation({
        onSuccess: async (data) => {
            console.log('User created:', data);
            await setStoredUserId(data.id.toString());
            router.replace('/onboarding');
        },
        onError: (error) => {
            console.error('Failed to create user:', error);
            Alert.alert('エラー', 'ユーザー登録に失敗しました。サーバーの状態を確認してください。');
        }
    });

    const handleStart = () => {
        if (!nickname) return;
        createUser.mutate({
            openId: `mock_google_${Date.now()}`,
            email: `user_${Date.now()}@example.com`,
            name: nickname,
            avatar: avatarSeed,
            deviceId: 'device_id_placeholder',
            pushToken: expoPushToken
        });
    };

    return (
        <SafeAreaView className="flex-1 bg-white relative">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                    <View className="items-center mb-6">
                        <Text className="text-3xl font-black text-gray-900 mb-1">{t('onboarding.chooseAvatar')}</Text>
                        <Text className="text-gray-400 font-bold text-xs uppercase">{t('onboarding.setupProfile')}</Text>
                    </View>

                    {/* Category Tabs */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="mb-6 max-h-12"
                        contentContainerStyle={{ paddingHorizontal: 4, gap: 8 }}
                    >
                        {CATEGORIES.map(cat => (
                            <TouchableOpacity
                                key={cat.id}
                                onPress={() => setSelectedCategory(cat.id)}
                                className={`px-4 py-2 rounded-full border ${selectedCategory === cat.id ? 'bg-gray-800 border-gray-800' : 'bg-white border-gray-200'}`}
                            >
                                <Text className={`font-bold ${selectedCategory === cat.id ? 'text-white' : 'text-gray-600'}`}>
                                    {cat.icon} {t(cat.labelKey)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Avatar Grid */}
                    <View className="flex-row flex-wrap justify-between mb-8">
                        {currentOptions.map((seed) => (
                            <TouchableOpacity
                                key={seed}
                                onPress={() => setAvatarSeed(seed)}
                                className={`w-[23%] aspect-square mb-3 rounded-2xl items-center justify-center overflow-hidden shadow-sm bg-white ${avatarSeed === seed ? 'scale-105' : ''}`}
                            >
                                <Avatar
                                    seed={seed}
                                    size={80} // Relative size, container clips it
                                    style={{ width: '100%', height: '100%', borderRadius: 16 }}
                                />
                                {avatarSeed === seed && (
                                    <View className="absolute inset-0 bg-[#FF4785]/10 z-10 border-4 border-[#FF4785] rounded-2xl" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Nickname Input */}
                    <View className="mb-12 w-full">
                        <Text className="text-gray-400 font-black mb-2 ml-2 text-xs uppercase">{t('onboarding.nickname')}</Text>
                        <TextInput
                            className="bg-gray-50 p-4 rounded-xl border-2 border-gray-100 text-xl font-bold text-gray-800 focus:border-[#00C2FF] text-center"
                            placeholder={t('onboarding.nicknamePlaceholder')}
                            value={nickname}
                            onChangeText={setNickname}
                            maxLength={12}
                        />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        className="w-full shadow-lg"
                        onPress={handleStart}
                        disabled={!nickname || createUser.isLoading}
                    >
                        <LinearGradient
                            colors={nickname && !createUser.isLoading ? ['#00C2FF', '#FF4785'] : ['#eee', '#eee']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ padding: 18, borderRadius: 999, alignItems: 'center' }}
                        >
                            <Text className={`font-black text-lg tracking-widest ${nickname && !createUser.isLoading ? 'text-white' : 'text-gray-400'}`}>
                                {createUser.isLoading ? t('common.loading') : t('onboarding.startAdventure')}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// Need to import trpc
// import { trpc, setStoredUserId } from '../utils/api'; // Removed from here
