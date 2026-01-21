import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function PremiumScreen() {
    const router = useRouter();

    const Feature = ({ icon, title, desc }: { icon: keyof typeof Ionicons.glyphMap, title: string, desc: string }) => (
        <View className="flex-row items-center bg-white/10 p-4 rounded-2xl mb-4 border border-white/20">
            <View className="w-12 h-12 rounded-full bg-yellow-400 items-center justify-center mr-4">
                <Ionicons name={icon} size={24} color="#000" />
            </View>
            <View className="flex-1">
                <Text className="text-white font-black text-lg mb-0.5">{title}</Text>
                <Text className="text-white/80 font-bold text-xs">{desc}</Text>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-black">
            {/* Background Gradient */}
            <LinearGradient
                colors={['#4c1d95', '#000000']}
                className="absolute inset-0"
            />

            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View className="px-4 py-2 flex-row justify-between items-center z-10">
                    <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/10 items-center justify-center">
                        <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white/50 text-xs font-bold uppercase tracking-widest">Premium Membership</Text>
                    <View className="w-10" />
                </View>

                <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>

                    {/* Hero */}
                    <View className="items-center mb-10">
                        <View className="w-24 h-24 rounded-full bg-gradient-to-tr from-yellow-400 to-yellow-600 items-center justify-center mb-6 shadow-lg shadow-yellow-500/50 border-4 border-white">
                            <Ionicons name="diamond" size={48} color="black" />
                        </View>
                        <Text className="text-4xl font-black text-white text-center mb-2 italic">Spotch Premium</Text>
                        <Text className="text-white/70 text-center font-bold">究極の体験を、あなたに。</Text>
                    </View>

                    {/* Features */}
                    <View className="mb-10">
                        <Feature
                            icon="analytics"
                            title="詳細アナリティクス"
                            desc="過去の全履歴と、スポットごとの収益効率を可視化。"
                        />
                        <Feature
                            icon="server"
                            title="ボーナスプレミアム"
                            desc="毎月 500ポイントのボーナスが付与されます。"
                        />
                        <Feature
                            icon="time"
                            title="収益時間 10%短縮"
                            desc="通常より10%早くポイントを獲得できます。"
                        />
                    </View>

                    {/* Price Card */}
                    <View className="bg-white rounded-3xl p-6 items-center mb-8 border-4 border-yellow-400 shadow-xl shadow-yellow-900/50">
                        <Text className="text-gray-500 font-bold text-xs uppercase mb-1">Monthly Plan</Text>
                        <View className="flex-row items-baseline mb-4">
                            <Text className="text-5xl font-black text-black">$11</Text>
                            <Text className="text-gray-500 font-bold ml-1">/ month</Text>
                        </View>
                        <TouchableOpacity className="w-full bg-black py-4 rounded-full items-center">
                            <Text className="text-white font-black text-lg">登録する (1ヶ月無料)</Text>
                        </TouchableOpacity>
                        <Text className="text-gray-400 text-[10px] mt-3 text-center">
                            いつでもキャンセル可能です。
                        </Text>
                    </View>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
