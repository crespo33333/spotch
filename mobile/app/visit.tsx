import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trpc } from '../utils/api';

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
            <View className="bg-white p-8 rounded-[32px] w-full items-center border-4 border-black shadow-xl">
                <View className="bg-gray-100 p-4 rounded-full mb-4 border-2 border-black">
                    <Ionicons name="stopwatch-outline" size={48} color="black" />
                </View>
                <Text className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-2">CURRENTLY VISITING</Text>
                <Text className="text-3xl font-black text-black mb-8 text-center italic tracking-tighter">{spotName}</Text>

                <Text className="text-6xl font-mono font-black text-[#00C2FF] mb-2">
                    {formatTime(seconds)}
                </Text>
                <Text className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-8">SESSION DURATION</Text>

                <View className="flex-row gap-4 mb-8 w-full">
                    <View className="flex-1 bg-gray-50 p-4 rounded-2xl border-2 border-slate-100 items-center">
                        <Text className="text-2xl font-black text-slate-800">{earned}</Text>
                        <Text className="text-[10px] font-bold text-slate-400 uppercase">Earned</Text>
                    </View>
                    <View className="flex-1 bg-gray-50 p-4 rounded-2xl border-2 border-slate-100 items-center">
                        <Text className="text-2xl font-black text-slate-800">{rate}</Text>
                        <Text className="text-[10px] font-bold text-slate-400 uppercase">Pts/Min</Text>
                    </View>
                </View>

                <TouchableOpacity
                    className="bg-[#FF4785] w-full py-4 rounded-2xl border-4 border-black shadow-sm active:translate-y-1 active:shadow-none"
                    onPress={handleEndVisit}
                >
                    <Text className="text-white font-black text-xl text-center uppercase tracking-widest">End Visit</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
