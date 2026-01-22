import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

import { useTranslation } from 'react-i18next';

export default function TabLayout() {
    const { t } = useTranslation();
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
                    title: t('tabs.map'),
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
                    title: t('tabs.activity'),
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
                    title: t('tabs.ranking'),
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
                    title: t('tabs.profile'),
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
                name="create-spot"
                options={{
                    href: null,
                    headerShown: true,
                    headerShadowVisible: false,
                    title: t('map.createSpot')
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
