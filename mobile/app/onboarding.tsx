import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight, FadeInLeft, FadeOutLeft } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const SLIDES = [
    {
        id: 1,
        title: "Staking Spots",
        description: "Choose a location on the map and stake your points to claim it. The more points, the higher the level!",
        icon: "location",
        color: "#ec4899",
        image: "app_onboarding_staking"
    },
    {
        id: 2,
        title: "Earn Rewards",
        description: "Receive a portion of every point spent at your staked spot. Grow your balance while you sleep!",
        icon: "flash",
        color: "#eab308",
        image: "app_onboarding_rewards"
    },
    {
        id: 3,
        title: "Social Economy",
        description: "Follow friends, like spots, and climb the global leaderboards to become a Spotch Pro.",
        icon: "people",
        color: "#06b6d4",
        image: null // We can use an icon or generate another image later
    }
];

export default function OnboardingScreen() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const router = useRouter();

    const handleNext = () => {
        if (currentSlide < SLIDES.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            router.replace('/(tabs)');
        }
    };

    const slide = SLIDES[currentSlide];

    return (
        <SafeAreaView className="flex-1 bg-slate-950">
            <View className="flex-1 px-8 justify-center">
                <Animated.View
                    key={currentSlide}
                    entering={FadeInRight.duration(400)}
                    exiting={FadeOutLeft.duration(400)}
                    className="items-center"
                >
                    <View
                        className="w-64 h-64 rounded-full items-center justify-center mb-10"
                        style={{ backgroundColor: `${slide.color}20` }}
                    >
                        <Ionicons name={slide.icon as any} size={80} color={slide.color} />
                    </View>

                    <Text className="text-4xl font-black text-white text-center tracking-tighter mb-4">
                        {slide.title}
                    </Text>

                    <Text className="text-slate-400 text-center text-lg leading-6 px-4">
                        {slide.description}
                    </Text>
                </Animated.View>
            </View>

            {/* Pagination & Button */}
            <View className="px-8 pb-12">
                <View className="flex-row justify-center mb-8">
                    {SLIDES.map((_, i) => (
                        <View
                            key={i}
                            className={`h-2 rounded-full mx-1 ${i === currentSlide ? 'w-8' : 'w-2'}`}
                            style={{ backgroundColor: i === currentSlide ? slide.color : '#334155' }}
                        />
                    ))}
                </View>

                <TouchableOpacity
                    onPress={handleNext}
                    style={{ backgroundColor: slide.color }}
                    className="py-5 rounded-3xl items-center shadow-xl"
                >
                    <Text className="text-white font-black text-xl tracking-tight">
                        {currentSlide === SLIDES.length - 1 ? "GET STARTED" : "NEXT"}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
