"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spotMessagesRelations = exports.userQuestsRelations = exports.questsRelations = exports.followsRelations = exports.transactionsRelations = exports.walletsRelations = exports.visitsRelations = exports.spotLikesRelations = exports.spotsRelations = exports.usersRelations = exports.spotMessages = exports.spotLikes = exports.userQuests = exports.quests = exports.follows = exports.transactions = exports.wallets = exports.visits = exports.spots = exports.users = exports.questStatusEnum = exports.questConditionEnum = exports.txTypeEnum = exports.roleEnum = void 0;
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
    xp: (0, pg_core_1.integer)('xp').default(0),
    level: (0, pg_core_1.integer)('level').default(1),
    role: (0, exports.roleEnum)('role').default('user'),
    isBanned: (0, pg_core_1.boolean)('is_banned').default(false),
    pushToken: (0, pg_core_1.varchar)('push_token', { length: 255 }),
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
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.visits = (0, pg_core_1.pgTable)('visits', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    spotId: (0, pg_core_1.integer)('spot_id').references(() => exports.spots.id),
    getterId: (0, pg_core_1.integer)('getter_id').references(() => exports.users.id),
    checkInTime: (0, pg_core_1.timestamp)('check_in_time'),
    checkOutTime: (0, pg_core_1.timestamp)('check_out_time'),
    earnedPoints: (0, pg_core_1.integer)('earned_points'),
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
exports.spotMessages = (0, pg_core_1.pgTable)('spot_messages', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    spotId: (0, pg_core_1.integer)('spot_id').references(() => exports.spots.id, { onDelete: 'cascade' }).notNull(),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.users.id, { onDelete: 'cascade' }).notNull(),
    content: (0, pg_core_1.text)('content').notNull(),
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
}));
exports.spotsRelations = (0, drizzle_orm_1.relations)(exports.spots, ({ one, many }) => ({
    spotter: one(exports.users, {
        fields: [exports.spots.spotterId],
        references: [exports.users.id],
    }),
    visits: many(exports.visits),
    messages: many(exports.spotMessages),
    likes: many(exports.spotLikes),
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
