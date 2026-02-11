"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityRouter = void 0;
const trpc_1 = require("../trpc");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
exports.activityRouter = (0, trpc_1.router)({
    getFeed: trpc_1.protectedProcedure
        .query(async ({ ctx }) => {
        const userId = ctx.user.id;
        // 1. Get people I follow
        const following = await db_1.db.query.follows.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.follows.followerId, userId),
        });
        const followingIds = following.map(f => f.followingId);
        if (followingIds.length === 0) {
            return [];
        }
        // 2. Fetch recent likes by following users
        const recentLikes = await db_1.db.query.spotLikes.findMany({
            where: (0, drizzle_orm_1.inArray)(schema_1.spotLikes.userId, followingIds),
            with: {
                user: true,
                spot: true,
            },
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.spotLikes.createdAt)],
            limit: 10,
        });
        // 3. Fetch recent spots created by following users
        const recentSpots = await db_1.db.query.spots.findMany({
            where: (0, drizzle_orm_1.inArray)(schema_1.spots.spotterId, followingIds),
            with: {
                spotter: true,
            },
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.spots.createdAt)],
            limit: 10,
        });
        // 4. Fetch recent visits (check-ins) by following users
        const recentVisits = await db_1.db.query.visits.findMany({
            where: (0, drizzle_orm_1.inArray)(schema_1.visits.getterId, followingIds),
            with: {
                getter: true,
                spot: true,
            },
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.visits.createdAt)],
            limit: 10,
        });
        // 5. Fetch recent comments by following users
        const recentComments = await db_1.db.query.spotMessages.findMany({
            where: (0, drizzle_orm_1.inArray)(schema_1.spotMessages.userId, followingIds),
            with: {
                user: true,
                spot: true,
            },
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.spotMessages.createdAt)],
            limit: 10,
        });
        // Combine and format
        const activities = [
            ...recentLikes.map(l => ({
                id: `like-${l.id}`,
                type: 'like',
                userId: l.user.id,
                user: l.user.name,
                action: `がスポット「${l.spot.name}」をいいねしました`,
                avatar: l.user.avatar,
                createdAt: l.createdAt,
            })),
            ...recentSpots.map(s => ({
                id: `spot-${s.id}`,
                type: 'create_spot',
                userId: s.spotter?.id,
                user: s.spotter?.name || '不明',
                action: `が新しいスポット「${s.name}」を作成しました`,
                avatar: s.spotter?.avatar,
                createdAt: s.createdAt,
            })),
            ...recentVisits.map(v => ({
                id: `visit-${v.id}`,
                type: 'visit',
                userId: v.getter?.id,
                user: v.getter?.name || '不明',
                action: `が「${v.spot?.name || '不明なスポット'}」にチェックインしました`,
                avatar: v.getter?.avatar,
                createdAt: v.createdAt,
            })),
            ...recentComments.map(c => ({
                id: `comment-${c.id}`,
                type: 'comment',
                userId: c.user.id,
                user: c.user.name,
                action: `が「${c.spot.name}」にコメントしました: ${c.content}`,
                avatar: c.user.avatar,
                createdAt: c.createdAt,
            })),
        ];
        return activities.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    }),
    getNotifications: trpc_1.protectedProcedure
        .query(async ({ ctx }) => {
        const userId = ctx.user.id;
        // 1. Likes on my spots
        const mySpots = await db_1.db.query.spots.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.spots.spotterId, userId),
        });
        const mySpotIds = mySpots.map(s => s.id);
        let likes = [];
        let comments = [];
        if (mySpotIds.length > 0) {
            likes = await db_1.db.query.spotLikes.findMany({
                where: (0, drizzle_orm_1.inArray)(schema_1.spotLikes.spotId, mySpotIds),
                with: {
                    user: true,
                    spot: true,
                },
                orderBy: [(0, drizzle_orm_1.desc)(schema_1.spotLikes.createdAt)],
                limit: 20
            });
            comments = await db_1.db.query.spotMessages.findMany({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.spotMessages.spotId, mySpotIds), (0, drizzle_orm_1.ne)(schema_1.spotMessages.userId, userId)), // Exclude my own comments
                with: {
                    user: true,
                    spot: true,
                },
                orderBy: [(0, drizzle_orm_1.desc)(schema_1.spotMessages.createdAt)],
                limit: 20
            });
        }
        // 2. New Followers
        const myFollowers = await db_1.db.query.follows.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.follows.followingId, userId),
            with: {
                follower: true
            },
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.follows.createdAt)],
            limit: 20
        });
        // 3. Official Broadcasts
        const recentBroadcasts = await db_1.db.select().from(schema_1.broadcasts)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.broadcasts.createdAt))
            .limit(5);
        const notifications = [
            ...recentBroadcasts.map(b => ({
                id: `broadcast-${b.id}`,
                type: 'system',
                user: { name: '運営チーム', avatar: 'default_seed' }, // Mock user structure
                message: b.title, // Title as message? Or Body?
                body: b.body, // Pass body too if possible
                createdAt: b.createdAt
            })),
            ...likes.map(l => ({
                id: `like-${l.id}`,
                type: 'like',
                user: l.user,
                message: `liked your spot "${l.spot.name}"`,
                createdAt: l.createdAt
            })),
            ...comments.map(c => ({
                id: `comment-${c.id}`,
                type: 'comment',
                user: c.user,
                message: `commented on "${c.spot.name}": ${c.content}`,
                createdAt: c.createdAt
            })),
            ...myFollowers.map(f => ({
                id: `follow-${f.id}`,
                type: 'follow',
                user: f.follower,
                message: `started following you`,
                createdAt: f.createdAt
            }))
        ];
        return notifications.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    }),
});
