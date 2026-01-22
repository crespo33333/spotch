import { pgTable, serial, varchar, integer, boolean, timestamp, decimal, text, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum('role', ['user', 'admin']);
export const txTypeEnum = pgEnum('tx_type', ['earn', 'spend', 'initial']);
export const questConditionEnum = pgEnum('quest_condition', ['visit_count', 'friend_count', 'premium_status']);
export const questStatusEnum = pgEnum('quest_status', ['in_progress', 'completed', 'claimed']);

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    openId: varchar('open_id', { length: 255 }).unique().notNull(),
    name: varchar('name', { length: 255 }),
    email: varchar('email', { length: 255 }),
    deviceId: varchar('device_id', { length: 255 }),
    avatar: varchar('avatar', { length: 255 }).default('default_seed'),
    xp: integer('xp').default(0),
    level: integer('level').default(1),
    role: roleEnum('role').default('user'),
    isBanned: boolean('is_banned').default(false),
    pushToken: varchar('push_token', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow(),
});

export const spots = pgTable('spots', {
    id: serial('id').primaryKey(),
    spotterId: integer('spotter_id').references(() => users.id),
    name: varchar('name', { length: 255 }),
    latitude: decimal('latitude', { precision: 10, scale: 8 }),
    longitude: decimal('longitude', { precision: 11, scale: 8 }),
    totalPoints: integer('total_points'),
    remainingPoints: integer('remaining_points'),
    ratePerMinute: integer('rate_per_minute'),
    active: boolean('active').default(true),
    category: varchar('category', { length: 50 }).default('General'),
    color: varchar('color', { length: 50 }).default('#00C2FF'),
    radius: integer('radius').default(100),
    description: text('description'),
    spotLevel: integer('spot_level').default(1),
    totalActivity: integer('total_activity').default(0),
    createdAt: timestamp('created_at').defaultNow(),
});

export const visits = pgTable('visits', {
    id: serial('id').primaryKey(),
    spotId: integer('spot_id').references(() => spots.id),
    getterId: integer('getter_id').references(() => users.id),
    checkInTime: timestamp('check_in_time'),
    checkOutTime: timestamp('check_out_time'),
    earnedPoints: integer('earned_points'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const wallets = pgTable('wallets', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).unique(),
    currentBalance: integer('current_balance').default(0),
    lastTransactionAt: timestamp('last_transaction_at'),
});

export const transactions = pgTable('transactions', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    amount: integer('amount'),
    type: txTypeEnum('type'),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const follows = pgTable('follows', {
    id: serial('id').primaryKey(),
    followerId: integer('follower_id').references(() => users.id).notNull(),
    followingId: integer('following_id').references(() => users.id).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const quests = pgTable('quests', {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    rewardPoints: integer('reward_points').notNull(),
    conditionType: questConditionEnum('condition_type').notNull(),
    conditionValue: integer('condition_value').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const userQuests = pgTable('user_quests', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    questId: integer('quest_id').references(() => quests.id).notNull(),
    status: questStatusEnum('status').default('in_progress'),
    progress: integer('progress').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    completedAt: timestamp('completed_at'),
}, (t) => ({
    unq: uniqueIndex('user_quest_unq').on(t.userId, t.questId),
}));

export const spotLikes = pgTable('spot_likes', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    spotId: integer('spot_id').references(() => spots.id, { onDelete: 'cascade' }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
    unq: uniqueIndex('spot_like_unq').on(t.userId, t.spotId),
}));

export const spotMessages = pgTable('spot_messages', {
    id: serial('id').primaryKey(),
    spotId: integer('spot_id').references(() => spots.id, { onDelete: 'cascade' }).notNull(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
    spots: many(spots),
    visits: many(visits),
    wallet: one(wallets, {
        fields: [users.id],
        references: [wallets.userId],
    }),
    followers: many(follows, { relationName: 'followers' }),
    following: many(follows, { relationName: 'following' }),
    userQuests: many(userQuests),
    messages: many(spotMessages),
    likes: many(spotLikes),
}));

export const spotsRelations = relations(spots, ({ one, many }) => ({
    spotter: one(users, {
        fields: [spots.spotterId],
        references: [users.id],
    }),
    visits: many(visits),
    messages: many(spotMessages),
    likes: many(spotLikes),
}));

export const spotLikesRelations = relations(spotLikes, ({ one }) => ({
    spot: one(spots, {
        fields: [spotLikes.spotId],
        references: [spots.id],
    }),
    user: one(users, {
        fields: [spotLikes.userId],
        references: [users.id],
    }),
}));

export const visitsRelations = relations(visits, ({ one }) => ({
    spot: one(spots, {
        fields: [visits.spotId],
        references: [spots.id],
    }),
    getter: one(users, {
        fields: [visits.getterId],
        references: [users.id],
    }),
}));

export const walletsRelations = relations(wallets, ({ one }) => ({
    user: one(users, {
        fields: [wallets.userId],
        references: [users.id],
    }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
    user: one(users, {
        fields: [transactions.userId],
        references: [users.id],
    }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
    follower: one(users, {
        fields: [follows.followerId],
        references: [users.id],
        relationName: 'following',
    }),
    following: one(users, {
        fields: [follows.followingId],
        references: [users.id],
        relationName: 'followers',
    }),
}));

export const questsRelations = relations(quests, ({ many }) => ({
    userQuests: many(userQuests),
}));

export const userQuestsRelations = relations(userQuests, ({ one }) => ({
    user: one(users, {
        fields: [userQuests.userId],
        references: [users.id],
    }),
    quest: one(quests, {
        fields: [userQuests.questId],
        references: [quests.id],
    }),
}));

export const spotMessagesRelations = relations(spotMessages, ({ one }) => ({
    spot: one(spots, {
        fields: [spotMessages.spotId],
        references: [spots.id],
    }),
    user: one(users, {
        fields: [spotMessages.userId],
        references: [users.id],
    }),
}));
