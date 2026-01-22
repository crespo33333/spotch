import { View, Text, TouchableOpacity, Dimensions, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCreatureAvatar } from '../utils/avatar';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';

export default function WelcomeScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { width, height } = Dimensions.get('window');

    return (
        <View className="flex-1 bg-white relative overflow-hidden">
            {/* Geometric Shapes Background */}

            {/* Top Left Triangle Cluster */}
            <View className="absolute top-[-50] left-[-50]">
                {/* Magenta Triangle */}
                <View style={[styles.triangle, { borderBottomColor: '#FF4785', transform: [{ rotate: '180deg' }] }]} />
                {/* Cyan Line Triangle */}
                <View style={[styles.triangleLine, { borderColor: '#00C2FF', transform: [{ rotate: '0deg' }, { translateY: 50 }, { translateX: 20 }] }]} />
            </View>

            {/* Top Right Triangle Cluster */}
            <View className="absolute top-[-20] right-[-40]">
                <View style={[styles.triangleLine, { borderColor: '#00C2FF', width: 120, height: 120, borderTopWidth: 8, borderRightWidth: 8, transform: [{ rotate: '45deg' }] }]} />
                <View className="absolute top-10 right-10 w-6 h-6 rounded-full bg-primary" />
                <View className="absolute top-20 right-20 w-4 h-4 rounded-full bg-secondary" />
            </View>

            {/* Bottom Left Shapes */}
            <View className="absolute bottom-[-50] left-[-30]">
                <View style={[styles.triangleLine, { borderColor: '#00C2FF', width: 150, height: 150, borderBottomWidth: 8, borderLeftWidth: 8, transform: [{ rotate: '-15deg' }] }]} />
            </View>

            {/* Bottom Right Shapes */}
            <View className="absolute bottom-20 right-[-20]">
                <View style={[styles.triangleLine, { borderColor: '#FF4785', width: 100, height: 100, borderBottomWidth: 8, borderRightWidth: 8, transform: [{ rotate: '15deg' }] }]} />
                <View className="absolute bottom-0 right-10 w-8 h-8 rounded-full bg-primary" />
            </View>

            {/* Random Dots */}
            <View className="absolute top-1/4 left-10 w-12 h-12 rounded-full bg-primary" />
            <View className="absolute top-1/3 right-10 w-4 h-4 rounded-full bg-secondary" />

            <SafeAreaView className="flex-1 justify-center items-center px-6">

                {/* Logo Area */}
                <View className="items-center mb-20">
                    <View className="bg-white rounded-full p-6 shadow-2xl mb-6 items-center justify-center w-36 h-36 border-4 border-gray-50" style={{ shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20 }}>
                        {/* Pin Shape Container */}
                        <View className="items-center justify-center">
                            <View className="bg-[#FF4785] w-20 h-20 rounded-full items-center justify-center border-4 border-white shadow-sm" style={{ shadowColor: "#FF4785", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5 }}>
                                <Image
                                    source={{ uri: getCreatureAvatar('welcome_user_v1') }}
                                    className="w-full h-full rounded-full"
                                />
                            </View>
                            <View className="w-1.5 h-6 bg-gray-300 -mt-0.5 rounded-full" />
                            <View className="bg-red-500 rounded-full w-5 h-5 absolute -top-1 -right-1 border-2 border-white" />
                        </View>
                    </View>

                    <View className="flex-row">
                        <Text className="text-6xl font-black tracking-tighter text-[#00C2FF]">Spo</Text>
                        <Text className="text-6xl font-black tracking-tighter text-[#FF4785]">tch</Text>
                    </View>
                    <Text className="text-gray-400 font-bold tracking-widest uppercase mt-2 text-xs">{t('welcome.subtitle')}</Text>
                </View>

                {/* Bottom Button */}
                <View className="absolute bottom-12 w-full px-6">
                    <TouchableOpacity
                        className="bg-white w-full py-4 rounded-full flex-row justify-center items-center active:scale-95 transition-transform border-4 border-gray-100 shadow-xl"
                        onPress={() => router.push('/setup-profile')}
                        style={{ shadowColor: '#00C2FF', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 }}
                    >
                        <View className="absolute left-0 right-0 top-0 bottom-0 overflow-hidden rounded-full">
                            <LinearGradient
                                colors={['#00C2FF', '#FF4785']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ width: '100%', height: '100%', opacity: 0.1 }}
                            />
                        </View>



                        <Text className="text-[#00C2FF] font-black text-xl tracking-widest mr-1">{t('welcome.getStarted').split(' ')[0]}</Text>
                        <Text className="text-[#FF4785] font-black text-xl tracking-widest">{t('welcome.getStarted').split(' ')[1] || '🚀'}</Text>
                    </TouchableOpacity>
                </View>

            </SafeAreaView >
        </View >
    );
}

const styles = StyleSheet.create({
    triangle: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 50,
        borderRightWidth: 50,
        borderBottomWidth: 100,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    },
    triangleLine: {
        width: 100,
        height: 100,
        backgroundColor: 'transparent',
        borderWidth: 8,
    }
});
