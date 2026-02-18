import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
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
    const [targetAudience, setTargetAudience] = useState('all');
    const [targetAge, setTargetAge] = useState('all');
    const [targetGender, setTargetGender] = useState('all');
    const [color, setColor] = useState('#00C2FF');

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

            console.log('📍 Create Spot Params:', params);

            if (params.lat && params.lng) {
                const latStr = Array.isArray(params.lat) ? params.lat[0] : params.lat;
                const lngStr = Array.isArray(params.lng) ? params.lng[0] : params.lng;
                latitude = parseFloat(latStr);
                longitude = parseFloat(lngStr);
                console.log('📍 Parsed Coords:', { latitude, longitude });
            } else {
                console.log('📍 Requesting Location...');
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission denied', 'Location is required to create a spot');
                    return;
                }
                let location = await Location.getCurrentPositionAsync({});
                latitude = location.coords.latitude;
                longitude = location.coords.longitude;
            }

            if (isNaN(latitude) || isNaN(longitude)) {
                Alert.alert('Error', 'Invalid location data');
                return;
            }

            console.log('🚀 Mutating createSpot:', { name, points, rateVal, latitude, longitude });

            createSpot.mutate({
                name,
                totalPoints: points,
                ratePerMinute: rateVal,
                latitude,
                longitude,
                targetAudience,
                targetAge,
                targetGender,
                color
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

            <View className="mb-6">
                <Text className="text-gray-600 mb-2">Target Audience (Reach)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                    {['all', 'local', 'tourist', 'student', 'business', 'family'].map(t => (
                        <TouchableOpacity
                            key={t}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setTargetAudience(t);
                            }}
                            className={`px-4 py-2 rounded-full border border-gray-300 mr-2 ${targetAudience === t ? 'bg-black border-black' : 'bg-white'}`}
                        >
                            <Text className={targetAudience === t ? 'text-white font-bold capitalize' : 'text-gray-600 capitalize'}>
                                {t}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View className="mb-6">
                <Text className="text-gray-600 mb-2">Target Age</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                    {['all', 'teen', '20s', '30s', '40s', '50s', '60+'].map(t => (
                        <TouchableOpacity
                            key={t}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setTargetAge(t);
                            }}
                            className={`px-4 py-2 rounded-full border border-gray-300 mr-2 ${targetAge === t ? 'bg-black border-black' : 'bg-white'}`}
                        >
                            <Text className={targetAge === t ? 'text-white font-bold capitalize' : 'text-gray-600 capitalize'}>
                                {t}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View className="mb-8">
                <Text className="text-gray-600 mb-2">Target Gender</Text>
                <View className="flex-row gap-2">
                    {['all', 'male', 'female', 'couple'].map(t => (
                        <TouchableOpacity
                            key={t}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setTargetGender(t);
                            }}
                            className={`px-4 py-2 rounded-full border border-gray-300 ${targetGender === t ? 'bg-black border-black' : 'bg-white'}`}
                        >
                            <Text className={targetGender === t ? 'text-white font-bold capitalize' : 'text-gray-600 capitalize'}>
                                {t}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View className="mb-8">
                <Text className="text-gray-600 mb-2">Spot Color</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-4 px-1">
                    {[
                        '#00C2FF', // Blue (Default)
                        '#FF4785', // Pink
                        '#FFD700', // Gold/Yellow
                        '#4CAF50', // Green
                        '#FF9F40', // Orange
                        '#9C27B0', // Purple
                        '#F44336', // Red
                        '#607D8B', // Blue Grey
                    ].map(c => (
                        <TouchableOpacity
                            key={c}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setColor(c);
                            }}
                            className={`w-10 h-10 rounded-full border-2 items-center justify-center ${color === c ? 'border-black scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                        >
                            {color === c && <Text className="text-white font-bold">✓</Text>}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <TouchableOpacity
                // @ts-ignore
                className={`bg-primary p-4 rounded-full items-center ${createSpot.isLoading ? 'opacity-50' : ''}`}
                onPress={handleCreate}
                disabled={createSpot.isLoading}
            >
                {createSpot.isLoading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text
                        // @ts-ignore
                        className="text-white font-bold text-lg"
                    >
                        {t('createSpot.create')}
                    </Text>
                )}
            </TouchableOpacity>
        </SafeAreaView >
    );
}
