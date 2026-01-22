import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, Share } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trpc } from '../utils/api';

export default function SettingsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const isVerified = params.verified === 'true';

    // Mock Notification State
    const handleNotificationToggle = () => {
        Alert.alert('通知設定', '通知機能は現在開発中です。');
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: 'Spotchで街のホットスポットを見つけたよ！今すぐチェック！ https://spotch.app',
                title: 'Spotch - Street Spot Watcher',
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleContact = () => {
        Linking.openURL('mailto:support@spotch.app?subject=お問い合わせ');
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'アカウント削除',
            '本当にアカウントを削除しますか？この操作は取り消せません。',
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: '削除',
                    style: 'destructive',
                    onPress: () => Alert.alert('削除完了', 'アカウントを削除しました。（デモ）')
                }
            ]
        );
    };

    const Section = ({ children }: { children: React.ReactNode }) => (
        <View className="bg-white rounded-xl mb-6 overflow-hidden border border-gray-100 shadow-sm">
            {children}
        </View>
    );

    const Item = ({ label, value, isLast, isDestructive, hasArrow = true, onPress }: { label: string, value?: string, isLast?: boolean, isDestructive?: boolean, hasArrow?: boolean, onPress?: () => void }) => (
        <TouchableOpacity
            className={`flex-row justify-between items-center p-4 bg-white ${!isLast ? 'border-b border-gray-100' : ''}`}
            activeOpacity={0.7}
            onPress={onPress}
        >
            <Text className={`text-base font-bold ${isDestructive ? 'text-red-500' : 'text-gray-800'}`}>{label}</Text>
            <View className="flex-row items-center gap-2">
                {value && (
                    <Text className={`text-sm font-bold ${value === '認証済み' ? 'text-green-500' : 'text-gray-400'}`}>
                        {value === '認証済み' && <Ionicons name="checkmark-circle" size={14} color="#22c55e" style={{ marginRight: 4 }} />}
                        {value}
                    </Text>
                )}
                {hasArrow && <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-[#F5F5F5]" edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <Ionicons name="close" size={28} color="#00C2FF" />
                </TouchableOpacity>
                <Text className="text-lg font-black text-[#00C2FF]">設定</Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>

                <Section>
                    <Item label="通知設定" onPress={handleNotificationToggle} />
                    <Item
                        label="本人認証"
                        value={isVerified ? "認証済み" : "未完了"}
                        onPress={() => !isVerified && router.push('/verify-identity')}
                        hasArrow={!isVerified}
                    />
                    <Item label="Spotch Premium" value="未登録" onPress={() => router.push('/premium')} />
                    <Item label="ポイント購入" onPress={() => router.push('/purchase')} />
                    <Item label="ポイント交換" onPress={() => router.push('/exchange')} />
                    <Item label="友達にシェア" isLast onPress={handleShare} />
                </Section>

                <Section>
                    <Item label="利用規約" onPress={() => router.push('/terms')} />
                    <Item label="プライバシーポリシー" onPress={() => router.push('/privacy')} />
                    <Item label="お問い合わせ" onPress={handleContact} isLast />
                </Section>

                <Section>
                    <Item label="アカウント削除" isDestructive isLast onPress={handleDeleteAccount} />
                </Section>

                <View className="items-center mt-4 mb-8">
                    <Text className="text-gray-400 font-bold">バージョン 1.0.0 (Build 1)</Text>
                    <Text className="text-gray-300 text-xs mt-1">Powered by Spotch</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}
