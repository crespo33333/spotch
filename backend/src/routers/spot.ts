import { router, protectedProcedure, publicProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db';
import { spots, wallets, transactions, users } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const spotRouter = router({
    create: protectedProcedure
        .input(z.object({
            name: z.string(),
            latitude: z.number(),
            longitude: z.number(),
            totalPoints: z.number().min(100),
            ratePerMinute: z.number().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
            // Check Balance
            const wallet = await db.query.wallets.findFirst({
                where: eq(wallets.userId, ctx.user.id),
            });

            if (!wallet || (wallet.currentBalance || 0) < input.totalPoints) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Insufficient funds' });
            }

            // Deduct Points
            await db.update(wallets)
                .set({
                    currentBalance: sql`${wallets.currentBalance} - ${input.totalPoints}`,
                    lastTransactionAt: new Date()
                })
                .where(eq(wallets.id, wallet.id));

            await db.insert(transactions).values({
                userId: ctx.user.id,
                amount: -input.totalPoints,
                type: 'spend',
                description: `Created spot: ${input.name}`,
            });

            // Create Spot
            const [spot] = await db.insert(spots).values({
                spotterId: ctx.user.id,
                name: input.name,
                latitude: input.latitude.toString(), // Drizzle decimal is string in JS usually, checking docs... pg-core decimal maps to string
                longitude: input.longitude.toString(),
                totalPoints: input.totalPoints,
                remainingPoints: input.totalPoints,
                ratePerMinute: input.ratePerMinute,
                active: true,
            }).returning();

            return spot;
        }),

    getNearby: publicProcedure
        .input(z.object({
            latitude: z.number(),
            longitude: z.number(),
            radiusKm: z.number().default(5),
        }))
        .query(async ({ input }) => {
            // Simple bounding box for MVP or fetch all and filter in JS if small scale.
            // For accurate nearby, we need PostGIS or Haversine formula in SQL.
            // Let's use specific Drizzle compatible raw SQL for Haversine.

            // This is complex in Drizzle without strict types, so let's simplify: fetch all active spots and filter in JS for MVP.
            // Fetch spots and join with users to get spotter info
            // Since we don't have relations set up in schema.ts yet, let's just fetch users map or use a manual join query if possible.
            // Drizzle query builder is easier if we set up relations, but let's just join manually or fetch all users for now (MVP).

            const allSpots = await db.select({
                spot: spots,
                user: users,
            })
                .from(spots)
                .leftJoin(users, eq(spots.spotterId, users.id))
                .where(eq(spots.active, true));

            return allSpots
                .filter(({ spot }) => {
                    const dist = getDistanceFromLatLonInKm(input.latitude, input.longitude, parseFloat(spot.latitude!), parseFloat(spot.longitude!));
                    return dist <= input.radiusKm;
                })
                .map(({ spot, user }) => ({
                    ...spot,
                    spotter: user ? {
                        id: user.id,
                        name: user.name,
                        avatar: user.avatar,
                    } : null
                }));
        }),

    getRankings: publicProcedure
        .query(async () => {
            const allSpots = await db.select()
                .from(spots)
                .where(eq(spots.active, true));

            // Calculate consumed points and sort
            const ranked = allSpots.map(s => ({
                id: s.id,
                name: s.name,
                country: '📍', // Mock flag for now, or infer from coords later
                points: (s.totalPoints || 0) - (s.remainingPoints || 0),
                lat: parseFloat(s.latitude || '0'),
                lng: parseFloat(s.longitude || '0'),
                trend: Math.random() > 0.5 ? 'up' : 'down', // 100% Mock trend for MVP
                activeUsers: Math.floor(Math.random() * 50) // Mock active users
            })).sort((a, b) => b.points - a.points).slice(0, 10);

            return ranked;
        }),
});

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180)
}
