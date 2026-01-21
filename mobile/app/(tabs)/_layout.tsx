import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#0a7ea4',
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Map',
                    tabBarIcon: ({ color }) => <Ionicons name="map" size={24} color={color} />,
                    tabBarButton: (props) => (
                        <TouchableOpacity
                            {...props}
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
                            {...props}
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
                            {...props}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                props.onPress?.(e);
                            }}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
