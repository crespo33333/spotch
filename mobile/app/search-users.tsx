
import { View, Text, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { trpc } from '../utils/api';
import UserCard from '../components/UserCard';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SearchUsers() {
    const router = useRouter();
    const [query, setQuery] = useState('');

    // Defer query (debounce could be here)
    const { data: users, refetch } = trpc.user.searchUsers.useQuery(
        { query },
        { enabled: query.length > 1 }
    );

    const { data: myProfile } = trpc.user.getProfile.useQuery({});

    // Simple check if I follow them (client side filter for MVP)
    // Ideally backend returns "isFollowing" boolean.
    // Let's rely on backend isFollowing logic if we upgraded the schema/query efficiently.
    // For now, assuming UserCard manages state or we fetch 'isFollowing' dynamically.
    // The previous backend 'searchUsers' implementation only returned raw users.
    // Let's maintain simple state in UserCard, but note that Search resets state.

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            {/* Header */}
            <View className="px-6 py-4 flex-row items-center gap-4">
                <TouchableOpacity onPress={() => router.back()} className="bg-white p-2 rounded-full shadow-sm">
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text className="text-2xl font-black text-slate-800">Find Friends</Text>
            </View>

            {/* Search Bar */}
            <View className="px-6 mb-6">
                <View className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex-row items-center gap-3">
                    <Ionicons name="search" size={20} color="#94A3B8" />
                    <TextInput
                        className="flex-1 font-bold text-slate-700 text-lg"
                        placeholder="Search by name..."
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                    />
                </View>
            </View>

            {/* Results */}
            <FlatList
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
                data={users || []}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => {
                    if (item.id === myProfile?.id) return null; // Don't show self
                    return (
                        <UserCard
                            user={item}
                            // Quick hack: we don't know initial state from search endpoint yet without extra query
                            // Optimistically assume false or implement better backend logic later
                            isFollowing={false}
                        />
                    );
                }}
                ListEmptyComponent={() => (
                    query.length > 1 ? (
                        <Text className="text-center text-slate-400 font-bold mt-10">No users found.</Text>
                    ) : (
                        <View className="items-center mt-10 opacity-50">
                            <Ionicons name="people-outline" size={64} color="#CBD5E1" />
                            <Text className="text-slate-400 font-bold mt-4">Search for fellow adventurers!</Text>
                        </View>
                    )
                )}
            />
        </SafeAreaView>
    );
}
