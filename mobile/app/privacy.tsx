import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { PRIVACY_POLICY_JA } from '../constants/Privacy';

export default function PrivacyScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-6 py-4 border-b border-gray-100 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text className="text-xl font-bold">プライバシーポリシー</Text>
            </View>
            <ScrollView className="flex-1 px-6 py-4">
                <Markdown style={{
                    heading1: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, marginTop: 8 },
                    heading2: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginTop: 24, color: '#333' },
                    body: { fontSize: 14, lineHeight: 24, color: '#4b5563', marginBottom: 8 },
                    list_item: { marginBottom: 8 },
                }}>
                    {PRIVACY_POLICY_JA}
                </Markdown>
                <View className="h-20" />
            </ScrollView>
        </SafeAreaView>
    );
}
