import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VisitScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const spotName = params.name as string || 'Unknown Spot';
    const rate = parseInt(params.rate as string || '0');

    const [seconds, setSeconds] = useState(0);
    const [earned, setEarned] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setSeconds(s => {
                const newSeconds = s + 1;
                // Calculate earned points: (seconds / 60) * rate
                setEarned(Math.floor((newSeconds / 60) * rate));
                return newSeconds;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [rate]);

    const handleEndVisit = () => {
        // TODO: Call Backend API to finalize visit
        Alert.alert('Visit Ended', `You earned ${earned} points!`, [
            { text: 'OK', onPress: () => router.replace('/(tabs)') }
        ]);
    };

    const formatTime = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <SafeAreaView className="flex-1 bg-primary items-center justify-center p-6">
            <View className="bg-white p-8 rounded-2xl w-full items-center shadow-lg">
                <Text className="text-gray-500 text-lg mb-2">Visiting</Text>
                <Text className="text-3xl font-bold text-black mb-8 text-center">{spotName}</Text>

                <Text className="text-6xl font-mono font-bold text-primary mb-4">
                    {formatTime(seconds)}
                </Text>

                <View className="bg-gray-100 px-6 py-3 rounded-full mb-8">
                    <Text className="text-xl font-semibold text-gray-700">
                        Earned: {earned} P
                    </Text>
                </View>

                <TouchableOpacity
                    className="bg-red-500 px-12 py-4 rounded-full shadow-md"
                    onPress={handleEndVisit}
                >
                    <Text className="text-white font-bold text-xl">End Visit</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
