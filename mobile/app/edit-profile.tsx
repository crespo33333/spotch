import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../utils/api';
import { Avatar } from '../components/Avatar';
import { useTranslation } from 'react-i18next';
import { getAvatarOptions, AvatarCategory, getCreatureAvatar } from '../utils/avatar';

const AVATAR_CATEGORIES: { id: AvatarCategory, label: string, icon: string }[] = [
    { id: 'cats', label: 'Cats', icon: '🐱' },
    { id: 'dogs', label: 'Dogs', icon: '🐶' },
    { id: 'monsters', label: 'Monsters', icon: '👾' },
    { id: 'tech', label: 'Tech', icon: '🤖' },
    { id: 'space', label: 'Space', icon: '🚀' },
    { id: 'flowers', label: 'Nature', icon: '🌸' },
];

export default function EditProfileScreen() {
    const router = useRouter();
    const utils = trpc.useContext();
    const { t } = useTranslation();

    // Queries
    const { data: user, isLoading } = trpc.user.getProfile.useQuery({});
    const updateProfile = trpc.user.updateProfile.useMutation({
        onSuccess: () => {
            utils.user.getProfile.invalidate();
            Alert.alert("Success", "Profile updated successfully!");
            router.back();
        },
        onError: (e) => {
            Alert.alert("Error", e.message);
        }
    });

    // Form State
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<AvatarCategory>('cats');

    // Initialize form when user data loads
    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setBio(user.bio || ''); // Assuming bio exists in Type definition now
            setSelectedAvatar(user.avatar || 'default_seed');
        }
    }, [user]);

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#00C2FF" />
            </SafeAreaView>
        );
    }

    const handleSave = () => {
        if (name.length < 2) {
            Alert.alert("Invalid Name", "Name must be at least 2 characters.");
            return;
        }
        updateProfile.mutate({
            name,
            bio,
            avatar: selectedAvatar
        });
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-100">
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <Ionicons name="close" size={28} color="black" />
                </TouchableOpacity>
                <Text className="text-lg font-black italic tracking-tighter">EDIT PROFILE</Text>
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={updateProfile.isLoading}
                    className="bg-black px-4 py-2 rounded-full"
                >
                    {updateProfile.isLoading ? (
                        <ActivityIndicator color="white" size="small" />
                    ) : (
                        <Text className="text-white font-bold">Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView className="flex-1 px-6 pt-6">

                    {/* Avatar Selection */}
                    <View className="items-center mb-8">
                        <View className="p-2 rounded-full border-4 border-[#00C2FF] mb-4 shadow-xl bg-white relative">
                            <Avatar seed={selectedAvatar} size={100} />
                            <View className="absolute bottom-0 right-0 bg-black p-2 rounded-full border-2 border-white">
                                <Ionicons name="camera" size={16} color="white" />
                            </View>
                        </View>

                        {/* Category Tabs */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                            {AVATAR_CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    onPress={() => setSelectedCategory(cat.id)}
                                    className={`mr-3 px-4 py-2 rounded-full border-2 ${selectedCategory === cat.id ? 'bg-black border-black' : 'bg-white border-slate-200'}`}
                                >
                                    <Text className={`font-bold ${selectedCategory === cat.id ? 'text-white' : 'text-slate-500'}`}>
                                        {cat.icon} {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Avatar Grid */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="h-24">
                            {getAvatarOptions(selectedCategory).map((seed) => (
                                <TouchableOpacity
                                    key={seed}
                                    onPress={() => setSelectedAvatar(seed)}
                                    className={`mr-4 p-1 rounded-full border-2 ${selectedAvatar === seed ? 'border-[#00C2FF] bg-blue-50 scale-110' : 'border-transparent'}`}
                                >
                                    <Avatar seed={seed} size={60} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Name Input */}
                    <View className="mb-6">
                        <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Display Name</Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 font-bold text-lg text-black"
                            placeholder="Your Name"
                            placeholderTextColor="#94a3b8"
                        />
                    </View>

                    {/* Bio Input */}
                    <View className="mb-24">
                        <View className="flex-row justify-between mb-2">
                            <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bio</Text>
                            <Text className={`text-xs font-bold ${bio.length > 160 ? 'text-red-500' : 'text-slate-400'}`}>
                                {bio.length}/160
                            </Text>
                        </View>
                        <TextInput
                            value={bio}
                            onChangeText={setBio}
                            multiline
                            numberOfLines={4}
                            maxLength={160}
                            className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 font-medium text-base text-black h-32"
                            placeholder="Tell the world about your territory..."
                            placeholderTextColor="#94a3b8"
                            style={{ textAlignVertical: 'top' }}
                        />
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
