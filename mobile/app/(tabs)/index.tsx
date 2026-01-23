import { View, TextInput, TouchableOpacity, ScrollView, Text } from 'react-native';
import MapView, { Spot } from '../../components/MapView';
import CreateSpotSheet from '../../components/CreateSpotSheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../utils/api';

export default function MapScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const initialCenter = params.lat && params.lng
        ? { lat: parseFloat(params.lat as string), lng: parseFloat(params.lng as string) }
        : undefined;

    const [spots, setSpots] = useState<Spot[]>([]);

    // Fetch spots from backend
    // For MVP we fetch all or nearby. getNearby is implemented in backend.
    const { data: serverSpots, refetch } = trpc.spot.getNearby.useQuery({
        latitude: initialCenter?.lat || 35.6581,
        longitude: initialCenter?.lng || 139.7017,
        radiusKm: 10,
    });

    useEffect(() => {
        if (serverSpots) {
            // Map backend spot to frontend spot interface
            const mappedSpots: Spot[] = serverSpots.map((s: any) => ({
                id: s.id,
                name: s.name,
                latitude: parseFloat(s.latitude),
                longitude: parseFloat(s.longitude),
                radius: 50, // Default radius
                pointsPerMinute: s.pointsPerMinute,
                category: s.name || 'General',
                activeUsers: [],
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
    const [selectedCategory, setSelectedCategory] = useState('All');
    const categories = ['All', 'Food', 'Chill', 'Adventure', 'Study', 'Other'];

    const filteredSpots = spots.filter(spot => {
        const matchesSearch = spot.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            spot.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || spot.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Fetch User Profile for Avatar
    const { data: user } = trpc.user.getProfile.useQuery({});

    return (
        <View className="flex-1">
            <View className="absolute top-12 left-0 right-0 z-10">
                {/* Search Bar */}
                <View className="mx-4 bg-white rounded-full p-3 shadow-lg flex-row items-center border border-gray-100" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 }}>
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

                {/* Category Filter */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mt-3 px-4"
                    contentContainerStyle={{ paddingRight: 40 }}
                >
                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            onPress={() => setSelectedCategory(cat)}
                            className={`mr-2 px-4 py-2 rounded-full border ${selectedCategory === cat ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-100'}`}
                        >
                            <Text className={`font-black text-[10px] uppercase tracking-tighter ${selectedCategory === cat ? 'text-white' : 'text-slate-400'}`}>
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Quests Button */}
            <TouchableOpacity
                onPress={() => router.push('/quests')}
                className="absolute bottom-28 right-4 z-10 bg-white p-3 rounded-full shadow-lg border border-slate-100 items-center justify-center"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8 }}
            >
                <Ionicons name="gift" size={28} color="#ec4899" />
            </TouchableOpacity>

            <MapView
                center={initialCenter}
                spots={filteredSpots}
                onLongPressLocation={setCreatingLocation}
                userAvatar={user?.avatar as string | undefined}
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
