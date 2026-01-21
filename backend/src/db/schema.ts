import { pgTable, serial, varchar, integer, boolean, timestamp, decimal, text, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum('role', ['user', 'admin']);
export const txTypeEnum = pgEnum('tx_type', ['earn', 'spend', 'initial']);

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    openId: varchar('open_id', { length: 255 }).unique().notNull(),
    name: varchar('name', { length: 255 }),
    email: varchar('email', { length: 255 }),
    deviceId: varchar('device_id', { length: 255 }),
    avatar: varchar('avatar', { length: 255 }).default('default_seed'), // New: Store avatar seed
    xp: integer('xp').default(0),
    level: integer('level').default(1),
    role: roleEnum('role').default('user'),
    isBanned: boolean('is_banned').default(false),
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
export const usersRelations = relations(users, ({ one, many }) => ({
    spots: many(spots),
    visits: many(visits),
    wallet: one(wallets, {
        fields: [users.id],
        references: [wallets.userId],
    }),
}));

export const spotsRelations = relations(spots, ({ one, many }) => ({
    spotter: one(users, {
        fields: [spots.spotterId],
        references: [users.id],
    }),
    visits: many(visits),
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
