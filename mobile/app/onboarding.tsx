import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Onboarding() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-background items-center justify-center p-6">
            <View className="bg-white p-8 rounded-3xl w-full items-center mb-8 border-4 border-black" style={{ shadowColor: "#000", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5 }}>
                <Text className="text-5xl font-black text-primary mb-2 tracking-tighter">Spotch</Text>
                <Text className="text-xl text-secondary font-bold text-center">
                    Find Spots. Get Points.
                </Text>
            </View>

            <TouchableOpacity
                className="bg-accent px-10 py-4 rounded-full border-4 border-black active:translate-y-1"
                style={{ shadowColor: "#000", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5 }}
                onPress={() => router.replace('/(tabs)')}
            >
                <Text className="text-black font-black text-xl">LET'S GO!</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}
