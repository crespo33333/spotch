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
    const [sessionVisit, setSessionVisit] = useState<any>(null);

    const checkInMutation = trpc.visit.checkIn.useMutation();
    const heartbeatMutation = trpc.visit.heartbeat.useMutation();

    // 1. Initial Check-in
    useEffect(() => {
        const startVisit = async () => {
            try {
                const res = await checkInMutation.mutateAsync({
                    spotId: parseInt(params.id as string),
                    latitude: parseFloat(params.lat as string),
                    longitude: parseFloat(params.lng as string),
                });
                setSessionVisit(res);
            } catch (e: any) {
                Alert.alert('Error', e.message || 'Failed to check in');
                router.replace('/(tabs)');
            }
        };
        startVisit();
    }, []);

    // 2. Heartbeat Timer (5s interval as requested)
    useEffect(() => {
        if (!sessionVisit) return;

        const interval = setInterval(async () => {
            setSeconds(s => s + 5);
            try {
                const res = await heartbeatMutation.mutateAsync({
                    visitId: sessionVisit.id
                });
                // Accumulate earned points from response
                setEarned(prev => prev + res.earnedPoints);
            } catch (e) {
                console.error('Heartbeat failed:', e);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [sessionVisit]);

    const handleEndVisit = () => {
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
