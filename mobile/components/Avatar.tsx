
import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { getCreatureAvatar } from '../utils/avatar';

interface AvatarProps {
    seed: string;
    size?: number;
    style?: StyleProp<ViewStyle>;
    imageStyle?: StyleProp<ImageStyle>;
    showBorder?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ seed, size = 40, style, imageStyle, showBorder = false }) => {
    // Check if seed is an emoji string (e.g. "emoji:🐶:FF9900")
    if (seed?.startsWith('emoji:')) {
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
