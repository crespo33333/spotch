import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc"; // publicProcedure needed?
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { quests, userQuests, wallets, transactions, visits } from "../db/schema";
import { TRPCError } from "@trpc/server";

export const questRouter = router({
    getQuests: protectedProcedure.query(async ({ ctx }) => {
        const allQuests = await db.select().from(quests);
        const myQuests = await db.select().from(userQuests).where(eq(userQuests.userId, ctx.user.id));

        // Calculate progress dynamically for 'visit_count' if not recorded
        // This ensures users see real-time progress even if we don't update userQuests on every visit
        const myVisitsCount = (await db.select().from(visits).where(eq(visits.getterId, ctx.user.id))).length;

        return allQuests.map((quest) => {
            const myQuest = myQuests.find((q) => q.questId === quest.id);

            let status = myQuest?.status || 'in_progress';
            let progress = myQuest?.progress || 0;

            if (quest.conditionType === 'visit_count') {
                progress = myVisitsCount;
                if (progress >= quest.conditionValue && status === 'in_progress') {
                    // Client can see it's ready to claim
                    // We don't auto-update DB here to avoid side-effects in GET, 
                    // but we return 'completed' (or handle it in UI as 'Claimable')
                    // Let's rely on 'claimReward' to finalize the status.
                    // For UI, we can say:
                }
            }

            return {
                ...quest,
                status,
                progress,
                calculatedProgress: progress, // Explicitly return calculated progress
            };
        });
    }),

    claimReward: protectedProcedure
        .input(z.object({ questId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const quest = await db.query.quests.findFirst({
                where: eq(quests.id, input.questId),
            });

            if (!quest) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Quest not found" });
            }

            // Check Real-time conditions
            let isCompleted = false;

            if (quest.conditionType === 'visit_count') {
                const myVisits = await db.select().from(visits).where(eq(visits.getterId, ctx.user.id));
                if (myVisits.length >= quest.conditionValue) {
                    isCompleted = true;
                }
            } else if (quest.conditionType === 'premium_status') {
                // Check premium (not implemented yet, assume false)
                isCompleted = false;
            }

            if (!isCompleted) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Quest requirements not met" });
            }

            // Check if already claimed
            const existingUserQuest = await db.query.userQuests.findFirst({
                where: and(
                    eq(userQuests.userId, ctx.user.id),
                    eq(userQuests.questId, input.questId)
                ),
            });

            if (existingUserQuest?.status === 'claimed') {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Reward already claimed" });
            }

            // Start transaction
            return await db.transaction(async (tx) => {
                // Update User Quest Status
                await tx.insert(userQuests).values({
                    userId: ctx.user.id,
                    questId: quest.id,
                    status: 'claimed',
                    progress: quest.conditionValue, // Max out progress
                    completedAt: new Date(),
                }).onConflictDoUpdate({
                    target: [userQuests.userId, userQuests.questId],
                    set: { status: 'claimed', completedAt: new Date() }
                });

                // Award Points
                await tx.insert(wallets).values({
                    userId: ctx.user.id,
                    currentBalance: quest.rewardPoints
                }).onConflictDoUpdate({
                    target: [wallets.userId],
                    set: { currentBalance: sql`${wallets.currentBalance} + ${quest.rewardPoints}` }
                });

                // Log Transaction
                await tx.insert(transactions).values({
                    userId: ctx.user.id,
                    amount: quest.rewardPoints,
                    type: 'earn',
                    description: `Quest Reward: ${quest.title}`,
                });

                return { success: true, reward: quest.rewardPoints };
            });
        }),
});
