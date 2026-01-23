import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { trpc } from '../../utils/api';

import { useTranslation } from 'react-i18next';

export default function CreateSpot() {
    const router = useRouter();
    const { t } = useTranslation();
    const params = useLocalSearchParams();
    const [name, setName] = useState('');
    const [totalPoints, setTotalPoints] = useState('100'); // Default to satisfy min 100
    const [rate, setRate] = useState('1'); // Default to satisfy min 1
    const [radius, setRadius] = useState('50');
    // const [loading, setLoading] = useState(false); // Managed by mutation

    const utils = trpc.useUtils();
    const createSpot = trpc.spot.create.useMutation({
        onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', 'Spot created!');
            utils.spot.getNearby.invalidate(); // Refresh map
            utils.wallet.getBalance.invalidate(); // Refresh wallet
            utils.wallet.getTransactions.invalidate();
            router.back();
        },
        onError: (err) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            console.error(err);
            Alert.alert('Error', err.message || 'Failed to create spot');
        }
    });

    const handleCreate = async () => {
        if (!name) {
            Alert.alert('Missing Info', 'Please enter a spot name');
            return;
        }

        const points = parseInt(totalPoints);
        const rateVal = parseInt(rate);

        if (isNaN(points) || points < 100) {
            Alert.alert('Invalid Budget', 'Total points must be at least 100');
            return;
        }
        if (isNaN(rateVal) || rateVal < 1) {
            Alert.alert('Invalid Rate', 'Rate must be at least 1 point/minute');
            return;
        }

        try {
            let latitude, longitude;

            if (params.lat && params.lng) {
                latitude = parseFloat(params.lat as string);
                longitude = parseFloat(params.lng as string);
            } else {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission denied', 'Location is required to create a spot');
                    return;
                }
                let location = await Location.getCurrentPositionAsync({});
                latitude = location.coords.latitude;
                longitude = location.coords.longitude;
            }

            createSpot.mutate({
                name,
                totalPoints: points,
                ratePerMinute: rateVal,
                latitude,
                longitude
            });

        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Location error');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white p-4 pt-0">
            {/* Header is handled by Tab Layout now */}

            <View className="mb-4">
                <Text className="text-gray-600 mb-2">{t('createSpot.name')}</Text>
                <TextInput
                    className="bg-gray-100 p-4 rounded-lg"
                    placeholder="e.g. Central Park Bench"
                    value={name}
                    onChangeText={setName}
                />
            </View>

            <View className="mb-4">
                <Text className="text-gray-600 mb-2">Total Points Budget (Min 100)</Text>
                <TextInput
                    className="bg-gray-100 p-4 rounded-lg"
                    placeholder="100"
                    keyboardType="numeric"
                    value={totalPoints}
                    onChangeText={setTotalPoints}
                />
            </View>

            <View className="mb-6">
                <Text className="text-gray-600 mb-2">Points per Minute</Text>
                <TextInput
                    className="bg-gray-100 p-4 rounded-lg"
                    placeholder="1"
                    keyboardType="numeric"
                    value={rate}
                    onChangeText={setRate}
                />
            </View>

            <View className="mb-8">
                <Text className="text-gray-600 mb-2">Spot Radius (Meters)</Text>
                <View className="flex-row gap-2 mb-2">
                    {[10, 50, 100, 300].map(r => (
                        <TouchableOpacity
                            key={r}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setRadius(r.toString());
                            }}
                            {/* @ts-ignore */}
                            className={`px-3 py-2 rounded-full border border-gray-300 ${radius === r.toString() ? 'bg-primary border-primary' : 'bg-white'}`}
                        >
                            <Text
                                /* @ts-ignore */
                                className={radius === r.toString() ? 'text-white font-bold' : 'text-gray-600'}
                            >
                                {r}m
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {/* @ts-ignore */}
                <TextInput
                    className="bg-gray-100 p-4 rounded-lg"
                    placeholder="Radius (10 - 500)"
                    keyboardType="numeric"
                    value={radius}
                    onChangeText={setRadius}
                />
            </View >

            <TouchableOpacity
                /* @ts-ignore */
                className={`bg-primary p-4 rounded-full items-center ${createSpot.isLoading ? 'opacity-50' : ''}`}
                onPress={handleCreate}
                disabled={createSpot.isLoading}
            >
                {createSpot.isLoading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text
                        /* @ts-ignore */
                        className="text-white font-bold text-lg"
                    >
                        {t('createSpot.create')}
                    </Text>
                )}
            </TouchableOpacity>
        </SafeAreaView >
    );
}
