"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionsRelations = exports.walletsRelations = exports.visitsRelations = exports.spotsRelations = exports.usersRelations = exports.transactions = exports.wallets = exports.visits = exports.spots = exports.users = exports.txTypeEnum = exports.roleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.roleEnum = (0, pg_core_1.pgEnum)('role', ['user', 'admin']);
exports.txTypeEnum = (0, pg_core_1.pgEnum)('tx_type', ['earn', 'spend', 'initial']);
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    openId: (0, pg_core_1.varchar)('open_id', { length: 255 }).unique().notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }),
    email: (0, pg_core_1.varchar)('email', { length: 255 }),
    deviceId: (0, pg_core_1.varchar)('device_id', { length: 255 }),
    avatar: (0, pg_core_1.varchar)('avatar', { length: 255 }).default('default_seed'), // New: Store avatar seed
    xp: (0, pg_core_1.integer)('xp').default(0),
    level: (0, pg_core_1.integer)('level').default(1),
    role: (0, exports.roleEnum)('role').default('user'),
    isBanned: (0, pg_core_1.boolean)('is_banned').default(false),
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
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ one, many }) => ({
    spots: many(exports.spots),
    visits: many(exports.visits),
    wallet: one(exports.wallets, {
        fields: [exports.users.id],
        references: [exports.wallets.userId],
    }),
}));
exports.spotsRelations = (0, drizzle_orm_1.relations)(exports.spots, ({ one, many }) => ({
    spotter: one(exports.users, {
        fields: [exports.spots.spotterId],
        references: [exports.users.id],
    }),
    visits: many(exports.visits),
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
