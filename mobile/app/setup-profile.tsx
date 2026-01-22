
import { View, Text, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { getCreatureAvatar, getAvatarOptions, AvatarCategory } from '../utils/avatar';
import { Avatar } from '../components/Avatar';
import { trpc, setStoredUserId } from '../utils/api';

const CATEGORIES: { id: AvatarCategory, label: string, icon: string }[] = [
    { id: 'cats', label: 'Cats', icon: '🐱' },
    { id: 'dogs', label: 'Dogs', icon: '🐶' },
    { id: 'critters', label: 'Critters', icon: '🦔' },
    { id: 'birds', label: 'Birds', icon: '🐦' },
    { id: 'fish', label: 'Fish', icon: '🐟' },
    { id: 'flowers', label: 'Flowers', icon: '🌸' },
];

export default function SetupProfileScreen() {
    const router = useRouter();
    const [nickname, setNickname] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<AvatarCategory>('cats');
    const [avatarSeed, setAvatarSeed] = useState(getAvatarOptions('cats')[0]);

    const currentOptions = getAvatarOptions(selectedCategory);

    const createUser = trpc.user.loginOrRegister.useMutation({
        onSuccess: async (data) => {
            console.log('User created:', data);
            await setStoredUserId(data.id.toString());
            router.replace('/(tabs)');
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
            deviceId: 'device_id_placeholder'
        });
    };

    return (
        <SafeAreaView className="flex-1 bg-white relative">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                    <View className="items-center mb-6">
                        <Text className="text-3xl font-black text-gray-900 mb-1">CHOOSE AVATAR</Text>
                        <Text className="text-gray-400 font-bold text-xs uppercase">Select your vibe</Text>
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
                                    {cat.icon} {cat.label}
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
                        <Text className="text-gray-400 font-black mb-2 ml-2 text-xs uppercase">Your Nickname</Text>
                        <TextInput
                            className="bg-gray-50 p-4 rounded-xl border-2 border-gray-100 text-xl font-bold text-gray-800 focus:border-[#00C2FF] text-center"
                            placeholder="Type nickname..."
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
                                {createUser.isLoading ? 'CONNECTING...' : 'START'}
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
