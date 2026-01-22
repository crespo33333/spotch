import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#FF4785', // Brand Pink for active tabs
                tabBarInactiveTintColor: '#94a3b8',
                headerShown: false,
                tabBarStyle: {
                    borderTopWidth: 1,
                    borderTopColor: '#f1f5f9',
                    height: 60,
                    paddingBottom: 8,
                }
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Map',
                    tabBarIcon: ({ color }) => <Ionicons name="map" size={24} color={color} />,
                    tabBarButton: (props) => (
                        <TouchableOpacity
                            {...(props as any)}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                props.onPress?.(e);
                            }}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="activity"
                options={{
                    title: 'Activity',
                    tabBarIcon: ({ color }) => <Ionicons name="notifications" size={24} color={color} />,
                    tabBarButton: (props) => (
                        <TouchableOpacity
                            {...(props as any)}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                props.onPress?.(e);
                            }}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="leaderboard"
                options={{
                    title: 'Ranking',
                    tabBarIcon: ({ color }) => <Ionicons name="trophy" size={24} color={color} />,
                    tabBarButton: (props) => (
                        <TouchableOpacity
                            {...(props as any)}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                props.onPress?.(e);
                            }}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
                    tabBarButton: (props) => (
                        <TouchableOpacity
                            {...(props as any)}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                props.onPress?.(e);
                            }}
                        />
                    ),
                }}
            />
            {/* Hidden Internal Screens to keep Tab Bar visible */}
            <Tabs.Screen
                name="spot/[id]"
                options={{
                    href: null,
                    headerShown: true, // Show header for detail view
                    headerShadowVisible: false,
                }}
            />
            <Tabs.Screen
                name="create-spot"
                options={{
                    href: null,
                    headerShown: true,
                    headerShadowVisible: false,
                    title: 'Create Spot'
                }}
            />
            <Tabs.Screen
                name="quests"
                options={{
                    href: null,
                    headerShown: true,
                    title: 'Quests'
                }}
            />
        </Tabs>
    );
}
