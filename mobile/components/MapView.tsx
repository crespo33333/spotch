
import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, Alert, Platform, Image, Animated, TouchableOpacity } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, LongPressEvent, Circle, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { getCreatureAvatar } from '../utils/avatar';
import { useGeofencing } from '../hooks/useGeofencing';
import VisitOverlay from './VisitOverlay';
import * as Haptics from 'expo-haptics';
import AnimatedReanimated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

export interface User {
    id: string;
    name: string;
    avatarUrl: string;
}

export interface Spot {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
    pointsPerMinute: number;
    category: string;
    color?: string;
    activeUsers?: User[];
    spotter?: User;
}

const getCategoryColor = (category: string) => {
    switch (category) {
        case 'Food': return 'rgba(255, 159, 64, 0.9)'; // Orange
        case 'Chill': return 'rgba(75, 192, 192, 0.9)'; // Teal
        case 'Adventure': return 'rgba(255, 99, 132, 0.9)'; // Red
        case 'Study': return 'rgba(54, 162, 235, 0.9)'; // Blue
        case 'Art': return 'rgba(153, 102, 255, 0.9)'; // Purple
        case 'Nature': return 'rgba(76, 175, 80, 0.9)'; // Green
        default: return 'rgba(201, 203, 207, 0.9)'; // Grey
    }
};


const AnimatedMarker = ({ spot, router, pulseAnim }: { spot: Spot, router: any, pulseAnim: any }) => {
    const scale = useSharedValue(0);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    useEffect(() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 90 });
    }, []);

    return (
        <React.Fragment>
            <Circle
                center={{ latitude: spot.latitude, longitude: spot.longitude }}
                radius={spot.radius}
                fillColor={getCategoryColor(spot.category).replace('0.9)', '0.4)')}
                strokeColor={getCategoryColor(spot.category)}
                strokeWidth={1}
            />

            <Marker
                coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
                onPress={() => router.push(`/spot/${spot.id}`)}
            >
                <AnimatedReanimated.View style={[{ alignItems: 'center', justifyContent: 'center' }, animatedStyle]}>
                    {spot.activeUsers && spot.activeUsers.length > 0 && (
                        <Animated.View style={{
                            position: 'absolute',
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: getCategoryColor(spot.category).replace('0.9)', '0.5)'),
                            transform: [{ scale: pulseAnim }]
                        }} />

                    )}

                    {(() => {
                        const seed = spot.spotter?.avatarUrl || `spot_${spot.id}`;
                        const avatarSource = getCreatureAvatar(seed);

                        if (avatarSource.startsWith('emoji:')) {
                            const parts = avatarSource.split(':');
                            const emoji = parts[1];
                            const color = parts[2] || 'cccccc';
                            return (
                                <View style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    borderWidth: 2,
                                    borderColor: 'white',
                                    backgroundColor: `#${color}`,
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Text style={{ fontSize: 20 }}>{emoji}</Text>
                                </View>
                            );
                        }

                        return (
                            <Image
                                source={{ uri: avatarSource }}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    borderWidth: 2,
                                    borderColor: 'white',
                                    backgroundColor: '#eee'
                                }}
                            />
                        );
                    })()}

                    {spot.activeUsers && spot.activeUsers.length > 1 && (
                        <View className="absolute -top-1 -right-1 bg-primary px-1.5 rounded-full border border-white">
                            <Text className="text-white text-[10px] font-bold">+{spot.activeUsers.length - 1}</Text>
                        </View>
                    )}
                </AnimatedReanimated.View>
                <Callout>
                    <View className="p-3 w-48 items-center bg-white rounded-xl">
                        <View className="flex-row items-center mb-3 bg-gray-50 p-1.5 rounded-full pr-3 border border-gray-100 w-full justify-center">
                            {(() => {
                                const seed = spot.spotter?.avatarUrl || `spot_${spot.id}`;
                                const avatarSource = getCreatureAvatar(seed);

                                if (avatarSource.startsWith('emoji:')) {
                                    const parts = avatarSource.split(':');
                                    const emoji = parts[1];
                                    const color = parts[2] || 'cccccc';
                                    return (
                                        <View style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 14,
                                            marginRight: 8,
                                            borderWidth: 1,
                                            borderColor: '#ddd',
                                            backgroundColor: `#${color}`,
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Text style={{ fontSize: 16 }}>{emoji}</Text>
                                        </View>
                                    );
                                }

                                return (
                                    <Image
                                        source={{ uri: avatarSource }}
                                        style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8, borderWidth: 1, borderColor: '#ddd' }}
                                    />
                                );
                            })()}

                            <Text className="font-bold text-gray-800 text-xs" numberOfLines={1}>
                                {spot.spotter?.name || `Host #${spot.id}`}
                            </Text>
                        </View>

                        <Text className="text-xl font-black mb-1 text-black">{spot.category}</Text>
                        <View className="bg-primary/10 px-2 py-0.5 rounded-md mb-2">
                            <Text className="font-bold text-primary text-xs">{spot.pointsPerMinute} pts/min</Text>
                        </View>

                        {spot.activeUsers && spot.activeUsers.length > 0 && (
                            <View className="flex-row items-center mb-2">
                                <View className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                                <Text className="text-[10px] text-gray-500 font-bold">{spot.activeUsers.length} Active Users</Text>
                            </View>
                        )}
                        <View className="mt-1 w-full bg-black py-1.5 rounded-full items-center">
                            <Text className="text-[10px] text-white font-bold uppercase tracking-widest">Acquire</Text>
                        </View>
                    </View>
                </Callout>
            </Marker>
        </React.Fragment>
    );
};

export default function AppMapView({
    center,
    spots,
    onLongPressLocation,
    userAvatar
}: {
    center?: { lat: number, lng: number },
    spots?: Spot[],
    onLongPressLocation?: (coord: { latitude: number, longitude: number }) => void,
    onRegionChangeComplete?: (region: { latitude: number, longitude: number, latitudeDelta: number, longitudeDelta: number }) => void,
    userAvatar?: string
}) {

    const mapRef = useRef<MapView>(null);
    const router = useRouter();
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const { nearestSpot, isInside } = useGeofencing(userLocation, spots);
    const [isOverlayVisible, setOverlayVisible] = useState(false);

    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            let location = await Location.getCurrentPositionAsync({});
            setUserLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
        })();
    }, []);

    useEffect(() => {
        if (center && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: center.lat,
                longitude: center.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 1000);
        }
    }, [center]);

    const handleLongPress = (e: LongPressEvent) => {
        const { coordinate } = e.nativeEvent;
        if (onLongPressLocation) onLongPressLocation(coordinate);
    };

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                showsUserLocation={false}
                showsMyLocationButton={true}
                initialRegion={{
                    latitude: 35.6812,
                    longitude: 139.7671,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                onLongPress={handleLongPress}
                onRegionChangeComplete={onRegionChangeComplete}
            >

                {center && (
                    <Marker coordinate={{ latitude: center.lat, longitude: center.lng }} title="Selected Location" />
                )}

                {/* Custom User Location Marker */}
                {userLocation && (
                    <Marker
                        coordinate={userLocation}
                        title="Me"
                        zIndex={100}
                    >
                        <View style={{
                            width: 50,
                            height: 50,
                            borderRadius: 25,
                            backgroundColor: 'rgba(0, 194, 255, 0.2)',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <View style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                borderWidth: 3,
                                borderColor: 'white',
                                backgroundColor: '#00C2FF',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.25,
                                shadowRadius: 3.84,
                                elevation: 5,
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden'
                            }}>
                                {(() => {
                                    const seed = userAvatar || 'default_user';
                                    const avatarSource = getCreatureAvatar(seed);

                                    if (avatarSource.startsWith('emoji:')) {
                                        const parts = avatarSource.split(':');
                                        return <Text style={{ fontSize: 18 }}>{parts[1]}</Text>;
                                    }

                                    return (
                                        <Image
                                            source={{ uri: avatarSource }}
                                            style={{ width: '100%', height: '100%' }}
                                        />
                                    );
                                })()}
                            </View>
                        </View>
                    </Marker>
                )}
                {spots?.map(spot => (
                    <AnimatedMarker key={spot.id} spot={spot} router={router} pulseAnim={pulseAnim} />
                ))}
            </MapView>

            {isInside && nearestSpot && !isOverlayVisible && (
                <View className="absolute bottom-24 self-center w-full px-4 items-center">
                    <CheckInButton onCheckIn={() => setOverlayVisible(true)} spot={nearestSpot} />
                </View>
            )}

            {isOverlayVisible && nearestSpot && userLocation && (
                <VisitOverlay
                    spot={nearestSpot}
                    userLocation={userLocation}
                    onClose={() => setOverlayVisible(false)}
                />
            )}
        </View>
    );
}

const CheckInButton = ({ onCheckIn, spot }: { onCheckIn: () => void, spot: Spot }) => {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    const handlePressIn = () => {
        scale.value = withSpring(0.95);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handlePressOut = () => { scale.value = withSpring(1); };
    const handlePress = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onCheckIn();
    };

    return (
        <AnimatedReanimated.View style={[{ width: '100%', maxWidth: 384 }, animatedStyle]}>
            <TouchableOpacity
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handlePress}
                activeOpacity={0.9}
                className="bg-[#FF4785] w-full py-4 rounded-full border-4 border-white shadow-xl items-center"
                style={{ elevation: 5 }}
            >
                <View className="flex-row items-center">
                    <Text className="text-white font-black text-xl mr-2">📍 VISITING</Text>
                    <View className="bg-white px-2 py-0.5 rounded text-xs font-bold text-[#FF4785]">
                        <Text className="font-bold text-[#FF4785]">{spot.category}</Text>
                    </View>
                </View>
                <Text className="text-white text-xs font-bold mt-1">Staking {spot.pointsPerMinute} pts/min</Text>
            </TouchableOpacity>
        </AnimatedReanimated.View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { width: '100%', height: '100%' },
});
