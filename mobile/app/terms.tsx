import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <Ionicons name="chevron-back" size={28} color="black" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-black">利用規約</Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1 p-6">
                <Text className="font-bold text-2xl mb-4">利用規約</Text>

                <Text className="text-base leading-6 text-gray-700 mb-4">
                    この利用規約（以下，「本規約」といいます。）は，Spotch運営チーム（以下，「当社」といいます。）がこのウェブサイト上で提供するサービス（以下，「本サービス」といいます。）の利用条件を定めるものです。登録ユーザーの皆さま（以下，「ユーザー」といいます。）には，本規約に従って，本サービスをご利用いただきます。
                </Text>

                <Text className="font-bold text-lg mt-4 mb-2">第1条（適用）</Text>
                <Text className="text-base leading-6 text-gray-700 mb-4">
                    本規約は，ユーザーと当社との間の本サービスの利用に関わる一切の関係に適用されるものとします。
                </Text>

                <Text className="font-bold text-lg mt-4 mb-2">第2条（利用登録）</Text>
                <Text className="text-base leading-6 text-gray-700 mb-4">
                    登録希望者が当社の定める方法によって利用登録を申請し，当社がこれを承認することによって，利用登録が完了するものとします。
                </Text>

                <Text className="text-gray-400 text-sm mt-8">
                    （以下、省略。これはダミーテキストです。）
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}
