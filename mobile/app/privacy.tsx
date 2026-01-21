import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <Ionicons name="chevron-back" size={28} color="black" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-black">プライバシーポリシー</Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1 p-6">
                <Text className="font-bold text-2xl mb-4">プライバシーポリシー</Text>

                <Text className="text-base leading-6 text-gray-700 mb-4">
                    Spotch運営チーム（以下，「当社」といいます。）は，本ウェブサイト上で提供するサービス（以下，「本サービス」といいます。）における，ユーザーの個人情報の取扱いについて，以下のとおりプライバシーポリシー（以下，「本ポリシー」といいます。）を定めます。
                </Text>

                <Text className="font-bold text-lg mt-4 mb-2">第1条（個人情報）</Text>
                <Text className="text-base leading-6 text-gray-700 mb-4">
                    「個人情報」とは，個人情報保護法にいう「個人情報」を指すものとし，生存する個人に関する情報であって，当該情報に含まれる氏名，生年月日，住所，電話番号，連絡先その他の記述等により特定の個人を識別できる情報を指します。
                </Text>

                <Text className="font-bold text-lg mt-4 mb-2">第2条（個人情報の収集方法）</Text>
                <Text className="text-base leading-6 text-gray-700 mb-4">
                    当社は，ユーザーが利用登録をする際に氏名，生年月日，住所，電話番号，メールアドレス，銀行口座番号，クレジットカード番号などの個人情報をお尋ねすることがあります。
                </Text>

                <Text className="text-gray-400 text-sm mt-8">
                    （以下、省略。これはダミーテキストです。）
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}
