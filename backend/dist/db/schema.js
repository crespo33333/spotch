"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spotMessagesRelations = exports.userQuestsRelations = exports.questsRelations = exports.followsRelations = exports.transactionsRelations = exports.walletsRelations = exports.visitsRelations = exports.spotLikesRelations = exports.weeklySpotPointsRelations = exports.spotsRelations = exports.userBadgesRelations = exports.badgesRelations = exports.messagesRelations = exports.reportsRelations = exports.userBlocksRelations = exports.couponsRelations = exports.redemptionsRelations = exports.usersRelations = exports.reports = exports.userBlocks = exports.redemptions = exports.coupons = exports.messages = exports.userBadges = exports.badges = exports.broadcasts = exports.spotMessages = exports.spotLikes = exports.userQuests = exports.quests = exports.follows = exports.transactions = exports.wallets = exports.visits = exports.weeklySpotPoints = exports.spots = exports.users = exports.questStatusEnum = exports.questConditionEnum = exports.txTypeEnum = exports.roleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.roleEnum = (0, pg_core_1.pgEnum)('role', ['user', 'admin']);
exports.txTypeEnum = (0, pg_core_1.pgEnum)('tx_type', ['earn', 'spend', 'initial']);
exports.questConditionEnum = (0, pg_core_1.pgEnum)('quest_condition', ['visit_count', 'friend_count', 'premium_status']);
exports.questStatusEnum = (0, pg_core_1.pgEnum)('quest_status', ['in_progress', 'completed', 'claimed']);
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    openId: (0, pg_core_1.varchar)('open_id', { length: 255 }).unique().notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }),
    email: (0, pg_core_1.varchar)('email', { length: 255 }),
    deviceId: (0, pg_core_1.varchar)('device_id', { length: 255 }),
    avatar: (0, pg_core_1.varchar)('avatar', { length: 255 }).default('default_seed'),
    bio: (0, pg_core_1.text)('bio'),
    xp: (0, pg_core_1.integer)('xp').default(0),
    level: (0, pg_core_1.integer)('level').default(1),
    role: (0, exports.roleEnum)('role').default('user'),
    isBanned: (0, pg_core_1.boolean)('is_banned').default(false),
    pushToken: (0, pg_core_1.varchar)('push_token', { length: 255 }),
    isPremium: (0, pg_core_1.boolean)('is_premium').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.spots = (0, pg_core_1.pgTable)('spots', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    spotterId: (0, pg_core_1.integer)('spotter_id').references(() => exports.users.id),
    name: (0, pg_core_1.varchar)('name', { length: 255 }),
    latitude: (0, pg_core_1.decimal)('latitude', { precision: 10, scale: 8 }),
    longitude: (0, pg_core_1.decimal)('longitude', { precision: 11, scale: 8 }),
    totalPoints: (0, pg_core_1.integer)('total_points'),
    remainingPoints: (0, pg_core_1.integer)('remaining_points'),
    ratePerMinute: (0, pg_core_1.integer)('rate_per_minute'),
    active: (0, pg_core_1.boolean)('active').default(true),
    category: (0, pg_core_1.varchar)('category', { length: 50 }).default('General'),
    color: (0, pg_core_1.varchar)('color', { length: 50 }).default('#00C2FF'),
    radius: (0, pg_core_1.integer)('radius').default(100),
    description: (0, pg_core_1.text)('description'),
    spotLevel: (0, pg_core_1.integer)('spot_level').default(1),
    totalActivity: (0, pg_core_1.integer)('total_activity').default(0),
    ownerId: (0, pg_core_1.integer)('owner_id').references(() => exports.users.id),
    taxRate: (0, pg_core_1.integer)('tax_rate').default(5),
    lastOwnerChangeAt: (0, pg_core_1.timestamp)('last_owner_change_at'),
    shieldExpiresAt: (0, pg_core_1.timestamp)('shield_expires_at'),
    taxBoostExpiresAt: (0, pg_core_1.timestamp)('tax_boost_expires_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.weeklySpotPoints = (0, pg_core_1.pgTable)('weekly_spot_points', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    spotId: (0, pg_core_1.integer)('spot_id').references(() => exports.spots.id, { onDelete: 'cascade' }).notNull(),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id, { onDelete: 'cascade' }).notNull(),
    points: (0, pg_core_1.integer)('points').default(0).notNull(),
    weekStart: (0, pg_core_1.timestamp)('week_start').notNull(), // Identifying the week
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => ({
    unq: (0, pg_core_1.uniqueIndex)('weekly_spot_points_unq').on(t.spotId, t.userId, t.weekStart),
}));
exports.visits = (0, pg_core_1.pgTable)('visits', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    spotId: (0, pg_core_1.integer)('spot_id').references(() => exports.spots.id),
    getterId: (0, pg_core_1.integer)('getter_id').references(() => exports.users.id),
    checkInTime: (0, pg_core_1.timestamp)('check_in_time'),
    checkOutTime: (0, pg_core_1.timestamp)('check_out_time'),
    earnedPoints: (0, pg_core_1.decimal)('earned_points', { precision: 12, scale: 4 }).default('0'),
    lastHeartbeatAt: (0, pg_core_1.timestamp)('last_heartbeat_at').defaultNow(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.wallets = (0, pg_core_1.pgTable)('wallets', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id).unique(),
    currentBalance: (0, pg_core_1.integer)('current_balance').default(0),
    lastTransactionAt: (0, pg_core_1.timestamp)('last_transaction_at'),
});
exports.transactions = (0, pg_core_1.pgTable)('transactions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id),
    amount: (0, pg_core_1.integer)('amount'),
    type: (0, exports.txTypeEnum)('type'),
    description: (0, pg_core_1.text)('description'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.follows = (0, pg_core_1.pgTable)('follows', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    followerId: (0, pg_core_1.integer)('follower_id').references(() => exports.users.id).notNull(),
    followingId: (0, pg_core_1.integer)('following_id').references(() => exports.users.id).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.quests = (0, pg_core_1.pgTable)('quests', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description'),
    rewardPoints: (0, pg_core_1.integer)('reward_points').notNull(),
    conditionType: (0, exports.questConditionEnum)('condition_type').notNull(),
    conditionValue: (0, pg_core_1.integer)('condition_value').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.userQuests = (0, pg_core_1.pgTable)('user_quests', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id).notNull(),
    questId: (0, pg_core_1.integer)('quest_id').references(() => exports.quests.id).notNull(),
    status: (0, exports.questStatusEnum)('status').default('in_progress'),
    progress: (0, pg_core_1.integer)('progress').default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    completedAt: (0, pg_core_1.timestamp)('completed_at'),
}, (t) => ({
    unq: (0, pg_core_1.uniqueIndex)('user_quest_unq').on(t.userId, t.questId),
}));
exports.spotLikes = (0, pg_core_1.pgTable)('spot_likes', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id, { onDelete: 'cascade' }).notNull(),
    spotId: (0, pg_core_1.integer)('spot_id').references(() => exports.spots.id, { onDelete: 'cascade' }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => ({
    unq: (0, pg_core_1.uniqueIndex)('spot_like_unq').on(t.userId, t.spotId),
}));
// Messages
exports.spotMessages = (0, pg_core_1.pgTable)('spot_messages', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    spotId: (0, pg_core_1.integer)('spot_id').references(() => exports.spots.id, { onDelete: 'cascade' }).notNull(),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id, { onDelete: 'cascade' }).notNull(),
    content: (0, pg_core_1.text)('content').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.broadcasts = (0, pg_core_1.pgTable)('broadcasts', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    title: (0, pg_core_1.text)('title').notNull(),
    body: (0, pg_core_1.text)('body').notNull(),
    link: (0, pg_core_1.text)('link'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.badges = (0, pg_core_1.pgTable)('badges', {
    id: (0, pg_core_1.text)('id').primaryKey(), // e.g., 'first_step'
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    icon: (0, pg_core_1.text)('icon').notNull(), // Emoji or URL
    conditionType: (0, pg_core_1.text)('condition_type').notNull(), // 'steps', 'points', 'spots_created'
    conditionValue: (0, pg_core_1.integer)('condition_value').notNull(),
    order: (0, pg_core_1.integer)('order').default(0), // For display sorting
});
exports.userBadges = (0, pg_core_1.pgTable)('user_badges', {
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id, { onDelete: 'cascade' }).notNull(),
    badgeId: (0, pg_core_1.text)('badge_id').references(() => exports.badges.id, { onDelete: 'cascade' }).notNull(),
    earnedAt: (0, pg_core_1.timestamp)('earned_at').defaultNow(),
}, (t) => ({
    pk: (0, pg_core_1.uniqueIndex)('user_badge_pk').on(t.userId, t.badgeId),
}));
// Messages (Direct)
exports.messages = (0, pg_core_1.pgTable)('messages', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    senderId: (0, pg_core_1.integer)('sender_id').references(() => exports.users.id, { onDelete: 'cascade' }).notNull(),
    receiverId: (0, pg_core_1.integer)('receiver_id').references(() => exports.users.id, { onDelete: 'cascade' }).notNull(),
    content: (0, pg_core_1.text)('content').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    readAt: (0, pg_core_1.timestamp)('read_at'),
});
// Point Exchange
exports.coupons = (0, pg_core_1.pgTable)('coupons', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    cost: (0, pg_core_1.integer)('cost').notNull(),
    type: (0, pg_core_1.varchar)('type', { length: 50 }).notNull(), // 'gift_card', 'donation', 'premium', 'item'
    data: (0, pg_core_1.text)('data'), // Optional: Coupon code pattern, URL, etc.
    stock: (0, pg_core_1.integer)('stock'), // Null = Infinite
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.redemptions = (0, pg_core_1.pgTable)('redemptions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id).notNull(),
    couponId: (0, pg_core_1.integer)('coupon_id').references(() => exports.coupons.id).notNull(),
    redeemedAt: (0, pg_core_1.timestamp)('redeemed_at').defaultNow(),
    code: (0, pg_core_1.varchar)('code', { length: 255 }), // Generated unique code for user
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('completed'), // 'pending', 'completed'
});
// Safety & Compliance
exports.userBlocks = (0, pg_core_1.pgTable)('user_blocks', {
    blockerId: (0, pg_core_1.integer)('blocker_id').references(() => exports.users.id, { onDelete: 'cascade' }).notNull(),
    blockedId: (0, pg_core_1.integer)('blocked_id').references(() => exports.users.id, { onDelete: 'cascade' }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => ({
    pk: (0, pg_core_1.uniqueIndex)('user_block_pk').on(t.blockerId, t.blockedId),
}));
exports.reports = (0, pg_core_1.pgTable)('reports', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    reporterId: (0, pg_core_1.integer)('reporter_id').references(() => exports.users.id, { onDelete: 'cascade' }).notNull(),
    targetType: (0, pg_core_1.varchar)('target_type', { length: 50 }).notNull(), // 'user', 'spot', 'comment'
    targetId: (0, pg_core_1.integer)('target_id').notNull(),
    reason: (0, pg_core_1.text)('reason').notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('pending'), // 'pending', 'resolved', 'dismissed'
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
// Relations
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ one, many }) => ({
    spots: many(exports.spots),
    visits: many(exports.visits),
    wallet: one(exports.wallets, {
        fields: [exports.users.id],
        references: [exports.wallets.userId],
    }),
    followers: many(exports.follows, { relationName: 'followers' }),
    following: many(exports.follows, { relationName: 'following' }),
    userQuests: many(exports.userQuests),
    messages: many(exports.spotMessages),
    likes: many(exports.spotLikes),
    userBadges: many(exports.userBadges),
    sentMessages: many(exports.messages, { relationName: 'sentMessages' }),
    receivedMessages: many(exports.messages, { relationName: 'receivedMessages' }),
    redemptions: many(exports.redemptions),
    blockedUsers: many(exports.userBlocks, { relationName: 'blockedUsers' }),
    reports: many(exports.reports),
}));
exports.redemptionsRelations = (0, drizzle_orm_1.relations)(exports.redemptions, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.redemptions.userId],
        references: [exports.users.id],
    }),
    coupon: one(exports.coupons, {
        fields: [exports.redemptions.couponId],
        references: [exports.coupons.id],
    }),
}));
exports.couponsRelations = (0, drizzle_orm_1.relations)(exports.coupons, ({ many }) => ({
    redemptions: many(exports.redemptions),
}));
exports.userBlocksRelations = (0, drizzle_orm_1.relations)(exports.userBlocks, ({ one }) => ({
    blocker: one(exports.users, {
        fields: [exports.userBlocks.blockerId],
        references: [exports.users.id],
        relationName: 'blockedUsers',
    }),
    blocked: one(exports.users, {
        fields: [exports.userBlocks.blockedId],
        references: [exports.users.id],
    }),
}));
exports.reportsRelations = (0, drizzle_orm_1.relations)(exports.reports, ({ one }) => ({
    reporter: one(exports.users, {
        fields: [exports.reports.reporterId],
        references: [exports.users.id],
    }),
}));
exports.messagesRelations = (0, drizzle_orm_1.relations)(exports.messages, ({ one }) => ({
    sender: one(exports.users, {
        fields: [exports.messages.senderId],
        references: [exports.users.id],
        relationName: 'sentMessages',
    }),
    receiver: one(exports.users, {
        fields: [exports.messages.receiverId],
        references: [exports.users.id],
        relationName: 'receivedMessages',
    }),
}));
exports.badgesRelations = (0, drizzle_orm_1.relations)(exports.badges, ({ many }) => ({
    users: many(exports.userBadges),
}));
exports.userBadgesRelations = (0, drizzle_orm_1.relations)(exports.userBadges, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.userBadges.userId],
        references: [exports.users.id],
    }),
    badge: one(exports.badges, {
        fields: [exports.userBadges.badgeId],
        references: [exports.badges.id],
    }),
}));
exports.spotsRelations = (0, drizzle_orm_1.relations)(exports.spots, ({ one, many }) => ({
    spotter: one(exports.users, {
        fields: [exports.spots.spotterId],
        references: [exports.users.id],
    }),
    owner: one(exports.users, {
        fields: [exports.spots.ownerId],
        references: [exports.users.id],
        relationName: 'ownedSpots',
    }),
    visits: many(exports.visits),
    messages: many(exports.spotMessages),
    likes: many(exports.spotLikes),
    weeklyPoints: many(exports.weeklySpotPoints),
}));
exports.weeklySpotPointsRelations = (0, drizzle_orm_1.relations)(exports.weeklySpotPoints, ({ one }) => ({
    spot: one(exports.spots, {
        fields: [exports.weeklySpotPoints.spotId],
        references: [exports.spots.id],
    }),
    user: one(exports.users, {
        fields: [exports.weeklySpotPoints.userId],
        references: [exports.users.id],
    }),
}));
exports.spotLikesRelations = (0, drizzle_orm_1.relations)(exports.spotLikes, ({ one }) => ({
    spot: one(exports.spots, {
        fields: [exports.spotLikes.spotId],
        references: [exports.spots.id],
    }),
    user: one(exports.users, {
        fields: [exports.spotLikes.userId],
        references: [exports.users.id],
    }),
}));
exports.visitsRelations = (0, drizzle_orm_1.relations)(exports.visits, ({ one }) => ({
    spot: one(exports.spots, {
        fields: [exports.visits.spotId],
        references: [exports.spots.id],
    }),
    getter: one(exports.users, {
        fields: [exports.visits.getterId],
        references: [exports.users.id],
    }),
}));
exports.walletsRelations = (0, drizzle_orm_1.relations)(exports.wallets, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.wallets.userId],
        references: [exports.users.id],
    }),
}));
exports.transactionsRelations = (0, drizzle_orm_1.relations)(exports.transactions, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.transactions.userId],
        references: [exports.users.id],
    }),
}));
exports.followsRelations = (0, drizzle_orm_1.relations)(exports.follows, ({ one }) => ({
    follower: one(exports.users, {
        fields: [exports.follows.followerId],
        references: [exports.users.id],
        relationName: 'following',
    }),
    following: one(exports.users, {
        fields: [exports.follows.followingId],
        references: [exports.users.id],
        relationName: 'followers',
    }),
}));
exports.questsRelations = (0, drizzle_orm_1.relations)(exports.quests, ({ many }) => ({
    userQuests: many(exports.userQuests),
}));
exports.userQuestsRelations = (0, drizzle_orm_1.relations)(exports.userQuests, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.userQuests.userId],
        references: [exports.users.id],
    }),
    quest: one(exports.quests, {
        fields: [exports.userQuests.questId],
        references: [exports.quests.id],
    }),
}));
exports.spotMessagesRelations = (0, drizzle_orm_1.relations)(exports.spotMessages, ({ one }) => ({
    spot: one(exports.spots, {
        fields: [exports.spotMessages.spotId],
        references: [exports.spots.id],
    }),
    user: one(exports.users, {
        fields: [exports.spotMessages.userId],
        references: [exports.users.id],
    }),
}));
