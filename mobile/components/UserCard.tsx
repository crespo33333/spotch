
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { trpc } from '../utils/api';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';

interface UserCardProps {
    user: {
        id: number;
        name: string | null;
        avatar: string | null;
        level?: number | null;
    };
    isFollowing?: boolean;
    onFollowChange?: () => void;
}

const AVATAR_BASE = 'https://api.dicebear.com/9.x/fun-emoji/png?seed=';

export default function UserCard({ user, isFollowing = false, onFollowChange }: UserCardProps) {
    const followMutation = trpc.user.follow.useMutation();
    const unfollowMutation = trpc.user.unfollow.useMutation();
    const [following, setFollowing] = useState(isFollowing);
    const [loading, setLoading] = useState(false);

    const handlePress = async () => {
        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            if (following) {
                await unfollowMutation.mutateAsync({ targetUserId: user.id });
                setFollowing(false);
            } else {
                await followMutation.mutateAsync({ targetUserId: user.id });
                setFollowing(true);
            }
            onFollowChange?.();
        } catch (e) {
            console.error(e);
            alert('Error updating follow status');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-row items-center justify-between p-4 bg-white rounded-2xl mb-3 border border-slate-100 shadow-sm">
            <View className="flex-row items-center gap-3">
                <Image
                    source={{ uri: `${AVATAR_BASE}${user.avatar || 'default'}` }}
                    className="w-12 h-12 rounded-full bg-slate-100"
                />
                <View>
                    <Text className="font-bold text-slate-800 text-lg">{user.name}</Text>
                    <Text className="text-slate-400 text-xs font-bold">LV.{user.level || 1} • Adventurer</Text>
                </View>
            </View>

            <TouchableOpacity
                onPress={handlePress}
                disabled={loading}
                className={`px-5 py-2 rounded-full border-2 ${following
                    ? 'bg-white border-slate-200'
                    : 'bg-[#00C2FF] border-[#00C2FF]'
                    }`}
            >
                <Text className={`font-black ${following ? 'text-slate-400' : 'text-white'}`}>
                    {following ? 'Following' : 'Follow'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}
