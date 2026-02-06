import { eq, sql, and } from "drizzle-orm";
import { db } from "../db";
import { users, userBadges, badges, visits, spots, transactions } from "../db/schema";

/**
 * Adds XP to a user and handles level up logic.
 */
export async function addXp(userId: number, xpAmount: number) {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });

    if (!user) return;

    // Calculate new XP
    const currentXp = user.xp || 0;
    const currentLevel = user.level || 1;
    let newXp = currentXp + xpAmount;
    let newLevel = currentLevel;

    // Simple Leveling Curve: Level * 100 XP required to level up
    const xpToNextLevel = currentLevel * 100;

    if (newXp >= xpToNextLevel) {
        newLevel += 1;
        newXp -= xpToNextLevel; // Carry over excess XP? Or just cumulative? 
        // Let's implement cumulative XP for now effectively, 
        // but the prompt implied "resetting" bar. 
        // A better approach for RPGs is usually cumulative XP.
        // But the previous implementation (profile.tsx) did: 
        // xp / (level * 100)
        // implying "XP earned TOWARDS next level".

        // So yes, subtract requirement.
    }

    await db.update(users)
        .set({
            xp: newXp,
            level: newLevel
        })
        .where(eq(users.id, userId));

    // Check for level-based badges
    await checkBadgeUnlock(userId, 'level');

    return {
        leveledUp: newLevel > currentLevel,
        newLevel
    };
}

/**
 * Checks if a user qualifies for any new badges.
 * Triggered after specific actions.
 */
export async function checkBadgeUnlock(userId: number, triggerType: 'steps' | 'visits' | 'points' | 'spots_created' | 'level' | 'any' = 'any') {
    // 1. Fetch all badges
    const allBadges = await db.select().from(badges);

    // 2. Fetch earned badges
    const earned = await db.select().from(userBadges).where(eq(userBadges.userId, userId));
    const earnedIds = new Set(earned.map(b => b.badgeId));

    // 3. Evaluate detailed stats
    // We need to fetch user stats
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        with: {
            spots: true,
            visits: true,
            wallet: true, // For total points earned? Or wallet balance?
        }
    });
    if (!user) return [];

    const newBadges: string[] = [];

    for (const badge of allBadges) {
        if (earnedIds.has(badge.id)) continue;

        // Optimize: skip if triggerType mismatches (optional optimization)

        let qualified = false;

        switch (badge.conditionType) {
            case 'spots_created':
                if (user.spots.length >= badge.conditionValue) qualified = true;
                break;
            case 'visits': // 'steps' mapped to visits in this context? Or actual steps? using visits for now 'check-ins'
                if (user.visits.length >= badge.conditionValue) qualified = true;
                break;
            case 'level':
                if ((user.level || 1) >= badge.conditionValue) qualified = true;
                break;
            case 'points':
                // Total points earned is harder to track without a separate column, 
                // but we can sum 'earn' transactions
                const totalEarnedTx = await db.select({
                    total: sql<number>`sum(${transactions.amount})`
                })
                    .from(transactions)
                    .where(and(
                        eq(transactions.userId, userId),
                        eq(transactions.type, 'earn')
                    ));
                const totalPoints = totalEarnedTx[0]?.total || 0;
                if (totalPoints >= badge.conditionValue) qualified = true;
                break;
        }

        if (qualified) {
            await db.insert(userBadges).values({
                userId,
                badgeId: badge.id,
            });
            newBadges.push(badge.name);
        }
    }

    return newBadges;
}
