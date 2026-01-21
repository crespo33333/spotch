import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    PanResponder,
    Animated,
    Dimensions
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';

interface CreateSpotSheetProps {
    visible: boolean;
    coordinate: { latitude: number; longitude: number } | null;
    onClose: () => void;
    onSubmit: (data: { category: string; totalPoints: number; rate: number; radius: number }) => void;
}

const CATEGORIES = ['☕ Cafe', '🍽️ Food', '💻 Work', '🌳 Park', '🛍️ Shop', '🏠 Chill'];

export default function CreateSpotSheet({ visible, coordinate, onClose, onSubmit }: CreateSpotSheetProps) {
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [totalPoints, setTotalPoints] = useState('');
    const [rate, setRate] = useState('');
    const [radius, setRadius] = useState(50);
    const [loading, setLoading] = useState(false);

    // Animation for swipe to close
    const pan = useRef(new Animated.ValueXY()).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only enable swipe if moving down significantly
                return gestureState.dy > 5;
            },
            onPanResponderMove: Animated.event(
                [null, { dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100) {
                    onClose();
                } else {
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: false,
                    }).start();
                }
            },
        })
    ).current;

    // Reset form when opening/closing
    React.useEffect(() => {
        if (!visible) {
            pan.setValue({ x: 0, y: 0 });
            Keyboard.dismiss();
        }
    }, [visible]);

    const handleSubmit = () => {
        if (!totalPoints || !rate) return;
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            onSubmit({
                category,
                totalPoints: parseInt(totalPoints),
                rate: parseInt(rate),
                radius
            });
            setLoading(false);
            setCategory(CATEGORIES[0]);
            setTotalPoints('');
            setRate('');
            setRadius(50);
        }, 1000);
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); onClose(); }}>
                    <View style={styles.overlay}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <Animated.View
                                style={[styles.container, { transform: [{ translateY: pan.y }] }]}
                                {...panResponder.panHandlers}
                            >
                                <View style={styles.handle} />
                                <View className="flex-row justify-between items-center mb-6">
                                    <Text className="text-2xl font-black text-primary tracking-tight">CREATE SPOT</Text>
                                    <TouchableOpacity onPress={onClose} className="bg-gray-100 p-1 rounded-full">
                                        <Ionicons name="close" size={24} color="#666" />
                                    </TouchableOpacity>
                                </View>

                                <View className="mb-6">
                                    <Text className="text-gray-500 font-bold mb-2 text-xs uppercase tracking-wider">Category</Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {CATEGORIES.map(cat => (
                                            <TouchableOpacity
                                                key={cat}
                                                onPress={() => setCategory(cat)}
                                                className={`px-4 py-2 rounded-full border-2 ${category === cat ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
                                            >
                                                <Text className={`font-bold ${category === cat ? 'text-white' : 'text-gray-500'}`}>{cat}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View className="flex-row gap-4 mb-6">
                                    <View className="flex-1">
                                        <Text className="text-gray-500 font-bold mb-2 text-xs uppercase tracking-wider">Budget (Pts)</Text>
                                        <TextInput
                                            className="bg-gray-50 p-4 rounded-2xl font-black text-lg border-2 border-gray-100 focus:border-primary text-center"
                                            placeholder="1000"
                                            keyboardType="numeric"
                                            value={totalPoints}
                                            onChangeText={setTotalPoints}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-gray-500 font-bold mb-2 text-xs uppercase tracking-wider">Rate (Pts/min)</Text>
                                        <TextInput
                                            className="bg-gray-50 p-4 rounded-2xl font-black text-lg border-2 border-gray-100 focus:border-primary text-center"
                                            placeholder="10"
                                            keyboardType="numeric"
                                            value={rate}
                                            onChangeText={setRate}
                                        />
                                    </View>
                                </View>

                                <View className="mb-8">
                                    <View className="flex-row justify-between mb-2 items-end">
                                        <Text className="text-gray-500 font-bold text-xs uppercase tracking-wider">Radius</Text>
                                        <Text className="text-primary font-black text-xl">{Math.round(radius)}m</Text>
                                    </View>
                                    <Slider
                                        style={{ width: '100%', height: 40 }}
                                        minimumValue={10}
                                        maximumValue={500}
                                        step={10}
                                        value={radius}
                                        onValueChange={setRadius}
                                        minimumTrackTintColor="#00C2FF"
                                        maximumTrackTintColor="#F3F4F6"
                                        thumbTintColor="#FF4785"
                                    />
                                </View>

                                <TouchableOpacity
                                    className={`bg-primary p-4 rounded-2xl items-center active:scale-95 transition-transform ${loading ? 'opacity-50' : ''}`}
                                    onPress={handleSubmit}
                                    disabled={loading}
                                    style={{ shadowColor: "#00C2FF", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}
                                >
                                    <Text className="text-white font-black text-xl tracking-widest">{loading ? 'CREATING...' : 'DEPLOY SPOT'}</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.2)'
    },
    container: {
        backgroundColor: 'white',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: 40,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    }
});
