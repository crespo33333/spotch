import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { getCreatureAvatar } from '../utils/avatar';

// Import newly generated high-quality assets
const CUSTOM_ASSETS: Record<string, any> = {
    'app_avatar_robot': require('../assets/generated/app_avatar_robot_1769077985738.png'),
    'avatar_gold_robot': require('../assets/generated/avatar_gold_robot_1769078567461.png'),
    'avatar_cool_shiba': require('../assets/generated/avatar_cool_shiba_1769078178747.png'),
    'avatar_shiba_samurai': require('../assets/generated/avatar_shiba_samurai_1769078550174.png'),
    'avatar_space_astronaut': require('../assets/generated/avatar_space_astronaut_1769078214471.png'),
    'avatar_alien_dj': require('../assets/generated/avatar_alien_dj_1769078584965.png'),
    'avatar_neon_monster': require('../assets/generated/avatar_neon_monster_1769078199515.png'),
    'avatar_pixel_dragon': require('../assets/generated/avatar_pixel_dragon_1769078234335.png'),
    'avatar_crystal_skull_pink': require('../assets/generated/avatar_crystal_skull_pink_1769078601726.png'),
    'avatar_tech_orb_cyan_blue': require('../assets/generated/avatar_tech_orb_cyan_blue_1769078617580.png'),
    'avatar_cute_ghost_glass': require('../assets/generated/avatar_cute_ghost_glass_1769078633160.png'),
    'app_onboarding_staking': require('../assets/generated/app_onboarding_staking_1769077956863.png'),
    'app_onboarding_rewards': require('../assets/generated/app_onboarding_rewards_1769077973828.png'),
};

interface Props {
    seed: string;
    size?: number;
    style?: StyleProp<ViewStyle>;
    imageStyle?: StyleProp<ImageStyle>;
    showBorder?: boolean;
}

export const Avatar: React.FC<Props> = ({ seed, size = 40, style, imageStyle, showBorder = false }) => {
    const isEmoji = seed?.startsWith('emoji:');
    const isCustomAsset = CUSTOM_ASSETS[seed];

    if (isCustomAsset) {
        return (
            <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#f1f5f9' }, style]}>
                <Image
                    source={CUSTOM_ASSETS[seed]}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                />
            </View>
        );
    }

    // Check if seed is an emoji string (e.g. "emoji:🐶:FF9900")
    if (isEmoji) {
        const parts = seed.split(':');
        const emoji = parts[1];
        const colorHex = parts[2] || 'cccccc';

        return (
            <View
                style={[
                    styles.container,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: `#${colorHex}`,
                        borderWidth: showBorder ? 2 : 0,
                        borderColor: 'white'
                    },
                    style
                ]}
            >
                <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
            </View>
        );
    }

    // Default: Image Avatar (RoboHash)
    return (
        <Image
            source={{ uri: getCreatureAvatar(seed) }}
            style={[
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: '#f1f5f9',
                    borderWidth: showBorder ? 2 : 0,
                    borderColor: 'white'
                },
                imageStyle
            ]}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    }
});
