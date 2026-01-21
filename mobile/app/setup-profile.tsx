import { View, Text, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { getCreatureAvatar } from '../utils/avatar';

import { trpc } from '../utils/api';

export default function SetupProfileScreen() {
    const router = useRouter();
    const [nickname, setNickname] = useState('');
    const [avatarSeed, setAvatarSeed] = useState('new_user_seed'); // Store SEED only

    // Function to rotate avatar on click
    const cycleAvatar = () => {
        const randomSeed = Math.random().toString(36).substring(7);
        setAvatarSeed(randomSeed);
    };

    const createUser = trpc.user.loginOrRegister.useMutation({
        onSuccess: (data) => {
            // Save user ID if needed, then navigate
            console.log('User created:', data);
            router.replace('/(tabs)');
        },
        onError: (error) => {
            console.error('Failed to create user:', error);
            // Optionally show alert
        }
    });

    const handleStart = () => {
        if (!nickname) return;

        createUser.mutate({
            openId: `mock_google_${Date.now()}`, // Temporary mock ID
            email: `user_${Date.now()}@example.com`,
            name: nickname,
            avatar: avatarSeed, // Send only the SEED
            deviceId: 'device_id_placeholder'
        });
    };

    return (
        <SafeAreaView className="flex-1 bg-white relative overflow-hidden">
            {/* Simple Geometric Accents */}
            <View className="absolute top-[-20] right-[-20] w-40 h-40 rounded-full border-[12px] border-[#00C2FF] opacity-10" />
            <View className="absolute bottom-[-40] left-[-20] w-60 h-60 bg-[#FF4785] rounded-full opacity-5" />
            <View className="absolute top-1/4 left-[-10] w-20 h-20 border-t-[8px] border-r-[8px] border-[#FF4785] opacity-20 transform rotate-45" />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
                    <View className="items-center mb-12">
                        <Text className="text-4xl font-black text-gray-900 mb-2 tracking-tight">WHO ARE YOU?</Text>
                        <Text className="text-gray-400 font-bold tracking-widest text-xs uppercase">Customize your identity</Text>
                    </View>

                    <View className="items-center mb-12">
                        <TouchableOpacity
                            className="relative mb-4 active:scale-95 transition-transform"
                            onPress={cycleAvatar}
                        >
                            <View className="w-40 h-40 rounded-full border-4 border-[#00C2FF] p-1 shadow-lg" style={{ shadowColor: '#00C2FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 }}>
                                <Image
                                    source={{ uri: getCreatureAvatar(avatarSeed) }}
                                    className="w-full h-full rounded-full bg-gray-100"
                                />
                            </View>
                            <View className="absolute bottom-0 right-2 bg-[#FF4785] p-3 rounded-full border-4 border-white shadow-lg">
                                <Ionicons name="refresh" size={24} color="white" />
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View className="mb-12 w-full px-4">
                        <Text className="text-gray-400 font-black mb-3 ml-2 text-xs uppercase tracking-wider">Nickname</Text>
                        <TextInput
                            className="bg-gray-50 p-5 rounded-2xl border-2 border-gray-100 text-2xl font-black text-gray-800 focus:border-[#00C2FF] focus:bg-white text-center shadow-sm"
                            placeholder="e.g. NeoSpatio"
                            value={nickname}
                            onChangeText={setNickname}
                            maxLength={12}
                        />
                        <Text className="text-gray-300 text-xs mt-2 text-right font-bold pr-2">{nickname.length}/12</Text>
                    </View>

                    <View className="flex-1 justify-end mb-8 w-full px-4">
                        <TouchableOpacity
                            className="w-full rounded-full active:scale-95 transition-transform shadow-xl mb-4"
                            onPress={handleStart}
                            disabled={!nickname}
                            style={{
                                shadowColor: nickname ? '#00C2FF' : '#999',
                                shadowOffset: { width: 0, height: 10 },
                                shadowOpacity: 0.3,
                                shadowRadius: 20,
                                elevation: 10
                            }}
                        >
                            <LinearGradient
                                colors={nickname ? ['#00C2FF', '#FF4785'] : ['#E5E7EB', '#E5E7EB']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ padding: 20, borderRadius: 999, width: '100%', alignItems: 'center' }}
                            >
                                <Text className={`font-black text-xl tracking-widest ${nickname ? 'text-white' : 'text-gray-400'}`}>JOIN THE MAP</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <Text className="text-center text-gray-400 text-xs font-bold">
                            Terms & Conditions Apply
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
