import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trpc, getStoredUserId } from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/Avatar';

export default function ChatScreen() {
    const { id, name, avatar } = useLocalSearchParams();
    const otherUserId = parseInt(id as string);
    const [message, setMessage] = useState('');
    const flatListRef = useRef<FlatList>(null);
    const currentUserId = getStoredUserId();

    // Fetch History
    const { data: history, isLoading, refetch } = trpc.message.getHistory.useQuery(
        { otherUserId },
        {
            refetchInterval: 3000,
        }
    );

    const sendMutation = trpc.message.send.useMutation({
        onSuccess: () => {
            setMessage('');
            refetch();
        }
    });

    const handleSend = async () => {
        if (!message.trim()) return;
        await sendMutation.mutateAsync({
            receiverId: otherUserId,
            content: message
        });
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            <Stack.Screen options={{
                title: name as string || 'Chat',
                headerTitle: () => (
                    <View className="flex-row items-center gap-2">
                        <Avatar seed={avatar as string || 'default'} size={32} />
                        <Text className="font-bold text-lg">{name}</Text>
                    </View>
                ),
                headerShadowVisible: false,
            }} />

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#00C2FF" />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={history}
                    keyExtractor={item => item.id.toString()}
                    inverted
                    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20 }}
                    renderItem={({ item }) => {
                        const isMe = item.senderId.toString() === currentUserId;
                        return (
                            <View className={`mb-3 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
                                {!isMe && (
                                    <Avatar seed={avatar as string || 'default'} size={28} style={{ marginRight: 8, marginTop: 4 }} />
                                )}
                                <View
                                    className={`px-4 py-2.5 max-w-[80%] rounded-2xl ${isMe
                                            ? 'bg-[#00C2FF] rounded-tr-none'
                                            : 'bg-slate-100 rounded-tl-none'
                                        }`}
                                >
                                    <Text className={`text-base ${isMe ? 'text-white' : 'text-slate-800'}`}>
                                        {item.content}
                                    </Text>
                                    <Text className={`text-[10px] mt-1 ${isMe ? 'text-blue-100/80' : 'text-slate-400'}`}>
                                        {new Date(item.createdAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center py-20 transform scale-y-[-1]">
                            <Ionicons name="chatbubbles-outline" size={48} color="#cbd5e1" />
                            <Text className="text-slate-400 font-bold mt-4">Start a conversation!</Text>
                        </View>
                    }
                />
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View className="p-4 border-t border-slate-100 bg-white">
                    <View className="flex-row items-center gap-2 bg-slate-50 rounded-full px-4 py-2 border border-slate-100">
                        <TextInput
                            className="flex-1 py-2 text-slate-800 font-medium max-h-24"
                            placeholder="Message..."
                            value={message}
                            onChangeText={setMessage}
                            multiline
                        />
                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={!message.trim() || sendMutation.isLoading}
                            className={`w-10 h-10 rounded-full items-center justify-center ${message.trim() ? 'bg-[#00C2FF]' : 'bg-slate-200'
                                }`}
                        >
                            {sendMutation.isLoading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Ionicons name="arrow-up" size={20} color="white" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
