import { View, TextInput, TouchableOpacity } from 'react-native';
import MapView, { Spot } from '../../components/MapView';
import CreateSpotSheet from '../../components/CreateSpotSheet';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../utils/api';

export default function MapScreen() {
    const params = useLocalSearchParams();
    const initialCenter = params.lat && params.lng
        ? { lat: parseFloat(params.lat as string), lng: parseFloat(params.lng as string) }
        : undefined;

    const [spots, setSpots] = useState<Spot[]>([]);

    // Fetch spots from backend
    // For MVP we fetch all or nearby. getNearby is implemented in backend.
    const { data: serverSpots, refetch } = trpc.spot.getNearby.useQuery({
        latitude: 35.6812,
        longitude: 139.7671,
        radiusKm: 50 // Large radius to see everything for now
    });

    useEffect(() => {
        if (serverSpots) {
            // Map backend spot to frontend spot interface
            const mappedSpots: Spot[] = serverSpots.map((s: any) => ({
                id: s.id,
                latitude: parseFloat(s.latitude),
                longitude: parseFloat(s.longitude),
                radius: 50, // Default radius as backend might not store it yet or we iterate
                pointsPerMinute: s.ratePerMinute,
                category: s.name, // Using name as category for now or we need a category field in DB
                // activeUsers: ... (requires separate logic or join)
                activeUsers: [], // Placeholder
                spotter: s.spotter ? {
                    id: s.spotter.id.toString(),
                    name: s.spotter.name,
                    avatarUrl: s.spotter.avatar // In DB it is 'avatar', in frontend User it is 'avatarUrl'
                } : undefined
            }));
            setSpots(mappedSpots);
        }
    }, [serverSpots]);

    const [creatingLocation, setCreatingLocation] = useState<{ latitude: number, longitude: number } | null>(null);

    const createSpotMutation = trpc.spot.create.useMutation({
        onSuccess: () => {
            refetch(); // Refresh map
            setCreatingLocation(null);
        }
    });

    const handleCreateSpot = (data: { category: string, totalPoints: number, rate: number, radius: number }) => {
        if (!creatingLocation) return;

        createSpotMutation.mutate({
            name: data.category,
            latitude: creatingLocation.latitude,
            longitude: creatingLocation.longitude,
            totalPoints: data.totalPoints,
            ratePerMinute: data.rate
        });
    };

    const [searchQuery, setSearchQuery] = useState('');

    const filteredSpots = spots.filter(spot =>
        spot.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.pointsPerMinute.toString().includes(searchQuery)
    );

    return (
        <View className="flex-1">
            <View className="absolute top-12 left-4 right-4 z-10">
                <View className="bg-white rounded-full p-3 shadow-lg flex-row items-center border border-gray-100" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 }}>
                    <Ionicons name="search" size={20} color="#999" style={{ marginRight: 8 }} />
                    <TextInput
                        placeholder="Search spots..."
                        className="flex-1 font-bold text-gray-700"
                        placeholderTextColor="#ccc"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery ? (
                        <TouchableOpacity onPress={() => setSearchQuery('')} className="mr-2">
                            <Ionicons name="close-circle" size={18} color="#ccc" />
                        </TouchableOpacity>
                    ) : (
                        <View className="bg-gray-100 p-1 rounded-full">
                            <Ionicons name="filter" size={18} color="#666" />
                        </View>
                    )}
                </View>
            </View>
            <MapView
                center={initialCenter}
                spots={filteredSpots}
                onLongPressLocation={setCreatingLocation}
            />
            <CreateSpotSheet
                visible={!!creatingLocation}
                coordinate={creatingLocation}
                onClose={() => setCreatingLocation(null)}
                onSubmit={handleCreateSpot}
            />
        </View>
    );
}
