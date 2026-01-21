import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function VerifyIdentityScreen() {
    const router = useRouter();
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendCode = () => {
        if (phone.length < 10) return; // Simple validation
        setLoading(true);
        // Mock API call
        setTimeout(() => {
            setLoading(false);
            setStep('otp');
        }, 1000);
    };

    const handleVerifyParams = () => {
        if (otp.length < 4) return;
        setLoading(true);
        // Mock Verify
        setTimeout(() => {
            setLoading(false);
            // Navigate back to Settings with verified param
            router.back();
            router.setParams({ verified: 'true' }); // This might need a context or global store in real app, but for now we try navigation param or just mock in settings
            // actually router.back() with params is tricky in Expo Router v2/v3 sometimes. 
            // Better to use a global store or just navigate explicitly if acceptable.
            // Let's rely on router.push('/settings') but that pushes a new stack. 
            // For MVP, let's just go back and rely on a mock "verified" state persisting in Settings if possible, or just push.
            router.replace({ pathname: '/settings', params: { verified: 'true' } });
        }, 1500);
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 px-6"
            >
                {/* Header */}
                <View className="py-2 mb-8">
                    <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                        <Ionicons name="close" size={24} color="black" />
                    </TouchableOpacity>
                </View>

                <View className="flex-1 justify-center pb-20">
                    <View className="items-center mb-10">
                        <View className="w-20 h-20 rounded-full bg-[#E0F7FF] items-center justify-center mb-6">
                            <Ionicons name={step === 'phone' ? "phone-portrait-outline" : "shield-checkmark-outline"} size={40} color="#00C2FF" />
                        </View>
                        <Text className="text-3xl font-black text-center mb-2">
                            {step === 'phone' ? '本人確認' : '認証コードを入力'}
                        </Text>
                        <Text className="text-gray-400 text-center font-bold">
                            {step === 'phone'
                                ? '安全なコミュニティのために、\n電話番号認証をお願いしています。'
                                : `${phone} に送信された\n4桁のコードを入力してください。`}
                        </Text>
                    </View>

                    {step === 'phone' ? (
                        <View>
                            <View className="bg-gray-50 border-2 border-black rounded-2xl px-4 py-4 mb-6">
                                <Text className="text-xs font-bold text-gray-400 mb-1">PHONE NUMBER</Text>
                                <TextInput
                                    className="text-2xl font-black text-black"
                                    placeholder="090-1234-5678"
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={setPhone}
                                    autoFocus
                                />
                            </View>
                            <TouchableOpacity
                                onPress={handleSendCode}
                                disabled={phone.length < 10 || loading}
                                className={`w-full py-4 rounded-full items-center ${phone.length >= 10 ? 'bg-black' : 'bg-gray-200'}`}
                            >
                                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg">コードを送信 ➔</Text>}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            <View className="flex-row justify-center gap-4 mb-8">
                                {[0, 1, 2, 3].map((i) => (
                                    <View key={i} className="w-14 h-16 border-b-4 border-black items-center justify-center bg-gray-50 rounded-t-lg">
                                        <Text className="text-3xl font-black">{otp[i] || ''}</Text>
                                    </View>
                                ))}
                            </View>
                            {/* Hidden Input Overlay */}
                            <TextInput
                                className="absolute opacity-0 w-full h-20 top-0"
                                keyboardType="number-pad"
                                value={otp}
                                onChangeText={setOtp}
                                maxLength={4}
                                autoFocus
                            />

                            <TouchableOpacity
                                onPress={handleVerifyParams}
                                disabled={otp.length < 4 || loading}
                                className={`w-full py-4 rounded-full items-center ${otp.length === 4 ? 'bg-[#00C2FF]' : 'bg-gray-200'}`}
                            >
                                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg">認証する ✨</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setStep('phone')} className="mt-6 items-center">
                                <Text className="text-gray-400 font-bold text-sm">電話番号を変更する</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
