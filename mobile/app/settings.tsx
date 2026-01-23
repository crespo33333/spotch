import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, Share } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trpc } from '../utils/api';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../utils/i18n';

export default function SettingsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const isVerified = params.verified === 'true';
    const { t, i18n } = useTranslation();

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ja' : 'en';
        changeLanguage(newLang);
    };

    // Mock Notification State
    const handleNotificationToggle = () => {
        Alert.alert(t('settings.notifAlertTitle'), t('settings.notifAlertMsg'));
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: t('settings.shareMsg'),
                title: 'Spotch - Street Spot Watcher',
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleContact = () => {
        Linking.openURL('mailto:support@spotch.app?subject=' + encodeURIComponent(t('settings.contact')));
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            t('settings.confirmDeleteTitle'),
            t('settings.confirmDeleteMsg'),
            [
                { text: t('settings.cancel'), style: 'cancel' },
                {
                    text: t('settings.delete'),
                    style: 'destructive',
                    onPress: () => Alert.alert(t('settings.delete'), 'Account deleted. (Demo)')
                }
            ]
        );
    };

    const Section = ({ children }: { children: React.ReactNode }) => (
        <View className="bg-white rounded-xl mb-6 overflow-hidden border border-gray-100 shadow-sm">
            {children}
        </View>
    );

    const Item = ({ label, value, isLast, isDestructive, hasArrow = true, onPress, highlightValue }: { label: string, value?: string, isLast?: boolean, isDestructive?: boolean, hasArrow?: boolean, onPress?: () => void, highlightValue?: boolean }) => (
        <TouchableOpacity
            className={`flex-row justify-between items-center p-4 bg-white ${!isLast ? 'border-b border-gray-100' : ''}`}
            activeOpacity={0.7}
            onPress={onPress}
        >
            <Text className={`text-base font-bold ${isDestructive ? 'text-red-500' : 'text-gray-800'}`}>{label}</Text>
            <View className="flex-row items-center gap-2">
                {value && (
                    <Text className={`text-sm font-bold ${highlightValue ? 'text-green-500' : 'text-gray-400'}`}>
                        {highlightValue && <Ionicons name="checkmark-circle" size={14} color="#22c55e" style={{ marginRight: 4 }} />}
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
                <Text className="text-lg font-black text-[#00C2FF]">{t('settings.title')}</Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>

                <Section>
                    <Item
                        label={t('settings.language')}
                        value={i18n.language === 'en' ? "🇺🇸 English" : "🇯🇵 日本語"}
                        onPress={toggleLanguage}
                    />
                    <Item label={t('settings.notification')} onPress={handleNotificationToggle} />
                    <Item
                        label={t('settings.verification')}
                        value={isVerified ? t('settings.verified') : t('settings.unverified')}
                        highlightValue={isVerified}
                        onPress={() => !isVerified && router.push('/verify-identity')}
                        hasArrow={!isVerified}
                    />
                    <Item label={t('settings.premium')} value="Free" onPress={() => router.push('/premium')} />
                    <Item label={t('settings.purchasePoints')} onPress={() => router.push('/purchase')} />
                    <Item label={t('settings.exchangePoints')} onPress={() => router.push('/exchange')} />
                    <Item label={t('settings.share')} isLast onPress={handleShare} />
                </Section>

                <Section>
                    <Item label={t('settings.terms')} onPress={() => router.push('/terms')} />
                    <Item label={t('settings.privacy')} onPress={() => router.push('/privacy')} />
                    <Item label={t('settings.contact')} onPress={handleContact} isLast />
                </Section>

                <Section>
                    <Item label={t('settings.deleteAccount')} isDestructive isLast onPress={handleDeleteAccount} />
                </Section>

                <View className="items-center mt-4 mb-8">
                    <Text className="text-gray-400 font-bold">{t('settings.version')} 1.0.0 (Build 27)</Text>
                    <Text className="text-gray-300 text-xs mt-1">Powered by Spotch</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}
