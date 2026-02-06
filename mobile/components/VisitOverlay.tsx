
import { View, Text, TouchableOpacity, ActivityIndicator, Image, StyleSheet, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spot } from './MapView';
import { trpc } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { getCreatureAvatar } from '../utils/avatar';
import { Avatar } from './Avatar';

interface VisitOverlayProps {
    spot: Spot;
    userLocation: { latitude: number; longitude: number };
    onClose: () => void;
}

export default function VisitOverlay({ spot, userLocation, onClose }: VisitOverlayProps) {
    const utils = trpc.useUtils();
    const [status, setStatus] = useState<'checking_in' | 'active' | 'error'>('checking_in');
    const [earned, setEarned] = useState(0);
    const [visitId, setVisitId] = useState<number | null>(null);

    // Mutations
    const checkInMutation = trpc.visit.checkIn.useMutation({
        onSuccess: (data: { id: number }) => {
            setStatus('active');
            setVisitId(data.id);
        },
        onError: (err: any) => {
            setStatus('error');
            console.error(err);
        }
    });

    const heartbeatMutation = trpc.visit.heartbeat.useMutation({
        onSuccess: (data: any) => {
            if (data?.earnedPoints) {
                setEarned(prev => prev + data.earnedPoints);

                // Refresh data
                utils.wallet.getBalance.invalidate();
                utils.wallet.getTransactions.invalidate();
                utils.user.getProfile.invalidate(); // Refresh XP/Level

                // Level Up Handling
                if (data.newLevel) {
                    Alert.alert(
                        "🎉 LEVEL UP!",
                        `Congratulations! You reached Level ${data.newLevel}!`,
                        [{ text: "Awesome!" }]
                    );
                }
            }
        }
    });

    const checkoutMutation = trpc.visit.checkout.useMutation();

    // Animation
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const triggerPulse = () => {
        Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
            Animated.spring(pulseAnim, { toValue: 1, friction: 3, useNativeDriver: true })
        ]).start();
    };

    useEffect(() => {
        if (earned > 0) triggerPulse();
    }, [earned]);


    // Effect: Check In on Mount
    useEffect(() => {
        checkInMutation.mutate({
            spotId: parseInt(spot.id),
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
        });
    }, []);

    // Effect: Auto-Leave if too far (Geofencing Enforcement)
    useEffect(() => {
        if (!userLocation || !spot) return;

        const dist = getDistanceFromLatLonInKm(
            userLocation.latitude,
            userLocation.longitude,
            spot.latitude,
            spot.longitude
        );

        // If distance > radius + 20m buffer (0.02km), auto-leave
        // Assuming radius is meters, spot.radius default 100m.
        const radiusKm = (spot.radius || 100) / 1000;
        if (dist > radiusKm + 0.02) {
            handleLeave();
        }
    }, [userLocation]); // Re-run when location changes

    // Effect: Heartbeat every 5s (Demo)
    useEffect(() => {
        if (status !== 'active' || !visitId) return;

        const interval = setInterval(() => {
            heartbeatMutation.mutate({ visitId });
        }, 5000); // 5 seconds for faster feedback

        return () => clearInterval(interval);
    }, [status, visitId]);

    const handleLeave = async () => {
        if (visitId) {
            try {
                await checkoutMutation.mutateAsync({ visitId });
            } catch (e) {
                console.error("Checkout failed", e);
                // Force close anyway
            }
        }
        onClose();
    };

    return (
        <View style={StyleSheet.absoluteFill}>
            <LinearGradient
                colors={['rgba(0,0,0,0.85)', 'rgba(255, 71, 133, 0.9)']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            />
            <SafeAreaView className="flex-1 w-full items-center justify-center p-6">

                {/* Close Button */}
                <TouchableOpacity onPress={handleLeave} className="absolute top-12 right-4 z-10 bg-white/20 p-2 rounded-full">
                    <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>

                {/* Spot Info */}
                <View className="items-center mb-10">
                    <View className="mb-6 shadow-2xl shadow-primary">
                        <Avatar
                            seed={spot.spotter?.avatarUrl || `spot_${spot.id}`}
                            size={128}
                            style={{ backgroundColor: '#e5e7eb' }}
                            showBorder
                        />
                        <View className="absolute -bottom-2 -right-2 bg-primary px-3 py-1 rounded-full border-2 border-white">
                            <Text className="text-white font-bold">{spot.pointsPerMinute} P/min</Text>
                        </View>
                    </View>
                    <Text className="text-white text-3xl font-black text-center mb-2">{spot.category}</Text>
                    <Text className="text-gray-400 font-bold text-center">Hosted by {spot.spotter?.name || 'Someone'}</Text>
                </View>

                {/* Status */}
                {status === 'checking_in' && (
                    <View className="items-center">
                        <ActivityIndicator size="large" color="#FF4785" />
                        <Text className="text-white font-bold mt-4 animate-pulse">Checking In...</Text>
                    </View>
                )}

                {status === 'error' && (
                    <View className="items-center">
                        <Ionicons name="warning" size={48} color="#FFD700" />
                        <Text className="text-white font-bold mt-4 text-center">Could not check in.</Text>
                        <Text className="text-gray-400 text-xs mt-2 text-center">Are you close enough?</Text>
                        <TouchableOpacity onPress={onClose} className="mt-8 bg-white px-8 py-3 rounded-full">
                            <Text className="font-black">CLOSE</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {status === 'active' && (
                    <View className="items-center w-full">
                        <View className="bg-white/10 p-8 rounded-3xl w-full items-center border border-white/20 mb-8">
                            <Text className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-2">EARNED THIS SESSION</Text>
                            <Animated.Text
                                style={{ transform: [{ scale: pulseAnim }] }}
                                className="text-6xl font-black text-[#FF4785] tracking-tighter shadow-sm"
                            >
                                {earned}
                            </Animated.Text>
                            <Text className="text-white font-bold mt-1">POINTS</Text>
                        </View>

                        <Text className="text-gray-400 text-xs mb-8 animate-pulse text-center">
                            Stay within range to keep earning...
                        </Text>

                        <TouchableOpacity
                            onPress={handleLeave}
                            disabled={checkoutMutation.isLoading}
                            className={`bg-white w-full py-4 rounded-2xl items-center active:scale-95 transition-transform ${checkoutMutation.isLoading ? 'opacity-50' : ''}`}
                        >
                            {checkoutMutation.isLoading ? (
                                <ActivityIndicator color="black" />
                            ) : (
                                <Text className="text-black font-black text-lg">LEAVE SPOT</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

            </SafeAreaView>
        </View>
    );
}

// Haversine Formula (Duplicated for overlay logic)
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}
