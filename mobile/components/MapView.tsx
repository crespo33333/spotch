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
    latitude: number;
    longitude: number;
    radius: number;
    pointsPerMinute: number;
    category: string;
    color?: string;
    activeUsers?: User[];
    spotter?: User; // New: Spot owner
}

export default function AppMapView({ center, spots, onLongPressLocation }: { center?: { lat: number, lng: number }, spots?: Spot[], onLongPressLocation?: (coord: { latitude: number, longitude: number }) => void }) {
    const mapRef = useRef<MapView>(null);
    const router = useRouter();
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const { nearestSpot, isInside } = useGeofencing(userLocation, spots);
    const [isOverlayVisible, setOverlayVisible] = useState(false);

    // Pulse Animation
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    React.useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });
        })();
    }, []);

    // Effect to update map center when prop changes
    React.useEffect(() => {
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
        if (onLongPressLocation) {
            onLongPressLocation(coordinate);
        }
    };

    return (
        <View style={styles.container}>

            <MapView
                ref={mapRef}
                style={styles.map}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                showsUserLocation={true}
                showsMyLocationButton={true}
                initialRegion={{
                    latitude: 35.6812,
                    longitude: 139.7671,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                onLongPress={handleLongPress}
            >
                {center && (
                    <Marker
                        coordinate={{ latitude: center.lat, longitude: center.lng }}
                        title="Selected Location"
                    />
                )}
                {spots?.map(spot => (
                    <React.Fragment key={spot.id}>
                        <Circle
                            center={{ latitude: spot.latitude, longitude: spot.longitude }}
                            radius={spot.radius}
                            fillColor={spot.color || (spot.pointsPerMinute > 50 ? "rgba(255, 71, 133, 0.4)" : spot.pointsPerMinute > 20 ? "rgba(255, 214, 0, 0.4)" : "rgba(0, 194, 255, 0.4)")}
                            strokeColor={spot.color?.replace('0.4', '0.8') || (spot.pointsPerMinute > 50 ? "rgba(255, 71, 133, 0.8)" : spot.pointsPerMinute > 20 ? "rgba(255, 214, 0, 0.8)" : "rgba(0, 194, 255, 0.8)")}
                            strokeWidth={1}
                        />
                        <Marker
                            coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
                        >
                            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                {/* Active user pulse effect or just simple avatar border */}
                                {spot.activeUsers && spot.activeUsers.length > 0 && (
                                    <Animated.View style={{
                                        position: 'absolute',
                                        width: 44,
                                        height: 44,
                                        borderRadius: 22,
                                        backgroundColor: 'rgba(255, 71, 133, 0.5)',
                                        transform: [{ scale: pulseAnim }]
                                    }} />
                                )}

                                <Image
                                    // Use spotter avatar if available and NO active users (as marker icon)
                                    // If active users exist, maybe show first active user? Or keep showing spotter?
                                    // Let's show Spotter by default if no active users.
                                    source={{
                                        uri: spot.spotter?.avatarUrl
                                            ? getCreatureAvatar(spot.spotter.avatarUrl)
                                            : getCreatureAvatar(`spot_${spot.id}`)
                                    }}
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 18,
                                        borderWidth: 2,
                                        borderColor: 'white',
                                        backgroundColor: '#eee' // fallback
                                    }}
                                />

                                {/* Badge for multiple active users */}
                                {spot.activeUsers && spot.activeUsers.length > 1 && (
                                    <View className="absolute -top-1 -right-1 bg-primary px-1.5 rounded-full border border-white">
                                        <Text className="text-white text-[10px] font-bold">+{spot.activeUsers.length - 1}</Text>
                                    </View>
                                )}
                            </View>
                            <Callout>
                                <View className="p-3 w-48 items-center bg-white rounded-xl">
                                    {/* User Info Header (Spotter) */}
                                    <View className="flex-row items-center mb-3 bg-gray-50 p-1.5 rounded-full pr-3 border border-gray-100 w-full justify-center">
                                        <Image
                                            source={{
                                                uri: spot.spotter?.avatarUrl
                                                    ? getCreatureAvatar(spot.spotter.avatarUrl)
                                                    : getCreatureAvatar(`spot_${spot.id}`)
                                            }}
                                            style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8, borderWidth: 1, borderColor: '#ddd' }}
                                        />
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
                ))}
            </MapView>

            {/* Check In Button (Visible when inside a spot) */}
            {
                isInside && nearestSpot && !isOverlayVisible && (
                    <View className="absolute bottom-24 self-center w-full px-4 items-center">
                        <CheckInButton
                            onCheckIn={() => setOverlayVisible(true)}
                            spot={nearestSpot}
                        />
                    </View>
                )
            }

            {/* Visit Overlay */}
            {
                isOverlayVisible && nearestSpot && userLocation && (
                    <VisitOverlay
                        spot={nearestSpot}
                        userLocation={userLocation}
                        onClose={() => setOverlayVisible(false)}
                    />
                )
            }
        </View >
    );
}

const CheckInButton = ({ onCheckIn, spot }: { onCheckIn: () => void, spot: Spot }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const handlePressIn = () => {
        scale.value = withSpring(0.95);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

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
    container: {
        flex: 1,
    },
    map: {
        width: '100%',
        height: '100%',
    },
});
