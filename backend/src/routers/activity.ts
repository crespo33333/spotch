import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { db } from '../db';
import { follows, spotLikes, spots, users, broadcasts, visits } from '../db/schema';
import { eq, inArray, desc } from 'drizzle-orm';

export const activityRouter = router({
    getFeed: protectedProcedure
        .query(async ({ ctx }) => {
            const userId = ctx.user!.id;

            // 1. Get people I follow
            const following = await db.query.follows.findMany({
                where: eq(follows.followerId, userId),
            });
            const followingIds = following.map(f => f.followingId);

            if (followingIds.length === 0) {
                return [];
            }

            // 2. Fetch recent likes by following users
            const recentLikes = await db.query.spotLikes.findMany({
                where: inArray(spotLikes.userId, followingIds),
                with: {
                    user: true,
                    spot: true,
                },
                orderBy: [desc(spotLikes.createdAt)],
                limit: 10,
            });

            // 3. Fetch recent spots created by following users
            const recentSpots = await db.query.spots.findMany({
                where: inArray(spots.spotterId, followingIds),
                with: {
                    spotter: true,
                },
                orderBy: [desc(spots.createdAt)],
                limit: 10,
            });

            // 4. Fetch recent visits (check-ins) by following users
            const recentVisits = await db.query.visits.findMany({
                where: inArray(visits.getterId, followingIds),
                with: {
                    getter: true,
                    spot: true,
                },
                orderBy: [desc(visits.createdAt)],
                limit: 10,
            });

            // Combine and format
            const activities = [
                ...recentLikes.map(l => ({
                    id: `like-${l.id}`,
                    type: 'like' as const,
                    userId: l.user.id,
                    user: l.user.name,
                    action: `がスポット「${l.spot.name}」をいいねしました`,
                    avatar: l.user.avatar,
                    createdAt: l.createdAt,
                })),
                ...recentSpots.map(s => ({
                    id: `spot-${s.id}`,
                    type: 'create_spot' as const,
                    userId: s.spotter?.id,
                    user: s.spotter?.name || '不明',
                    action: `が新しいスポット「${s.name}」を作成しました`,
                    avatar: s.spotter?.avatar,
                    createdAt: s.createdAt,
                })),
                ...recentVisits.map(v => ({
                    id: `visit-${v.id}`,
                    type: 'visit' as const,
                    userId: v.getter?.id,
                    user: v.getter?.name || '不明',
                    action: `が「${v.spot?.name || '不明なスポット'}」にチェックインしました`,
                    avatar: v.getter?.avatar,
                    createdAt: v.createdAt,
                })),
            ];

            return activities.sort((a, b) =>
                (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
            );
        }),

    getNotifications: protectedProcedure
        .query(async ({ ctx }) => {
            const userId = ctx.user!.id;

            // 1. Likes on my spots
            const mySpots = await db.query.spots.findMany({
                where: eq(spots.spotterId, userId),
            });
            const mySpotIds = mySpots.map(s => s.id);

            let likes: any[] = [];
            if (mySpotIds.length > 0) {
                likes = await db.query.spotLikes.findMany({
                    where: inArray(spotLikes.spotId, mySpotIds),
                    with: {
                        user: true,
                        spot: true,
                    },
                    orderBy: [desc(spotLikes.createdAt)],
                    limit: 20
                });
            }

            // 2. New Followers
            const myFollowers = await db.query.follows.findMany({
                where: eq(follows.followingId, userId),
                with: {
                    follower: true
                },
                orderBy: [desc(follows.createdAt)],
                limit: 20
            });

            // 3. Official Broadcasts
            const recentBroadcasts = await db.select().from(broadcasts)
                .orderBy(desc(broadcasts.createdAt))
                .limit(5);

            const notifications = [
                ...recentBroadcasts.map(b => ({
                    id: `broadcast-${b.id}`,
                    type: 'system' as const,
                    user: { name: '運営チーム', avatar: 'default_seed' }, // Mock user structure
                    message: b.title, // Title as message? Or Body?
                    body: b.body, // Pass body too if possible
                    createdAt: b.createdAt
                })),
                ...likes.map(l => ({
                    id: `like-${l.id}`,
                    type: 'like' as const,
                    user: l.user,
                    message: `liked your spot "${l.spot.name}"`,
                    createdAt: l.createdAt
                })),
                ...myFollowers.map(f => ({
                    id: `follow-${f.id}`,
                    type: 'follow' as const,
                    user: f.follower,
                    message: `started following you`,
                    createdAt: f.createdAt
                }))
            ];

            return notifications.sort((a, b) =>
                (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
            );
        }),
});
