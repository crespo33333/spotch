"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.questRouter = void 0;
const zod_1 = require("zod");
const trpc_1 = require("../trpc"); // publicProcedure needed?
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../db/schema");
const server_1 = require("@trpc/server");
exports.questRouter = (0, trpc_1.router)({
    getQuests: trpc_1.protectedProcedure.query(async ({ ctx }) => {
        const allQuests = await db_1.db.select().from(schema_1.quests);
        const myQuests = await db_1.db.select().from(schema_1.userQuests).where((0, drizzle_orm_1.eq)(schema_1.userQuests.userId, ctx.user.id));
        // Calculate progress dynamically for 'visit_count' if not recorded
        // This ensures users see real-time progress even if we don't update userQuests on every visit
        const myVisitsCount = (await db_1.db.select().from(schema_1.visits).where((0, drizzle_orm_1.eq)(schema_1.visits.getterId, ctx.user.id))).length;
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
    claimReward: trpc_1.protectedProcedure
        .input(zod_1.z.object({ questId: zod_1.z.number() }))
        .mutation(async ({ ctx, input }) => {
        const quest = await db_1.db.query.quests.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.quests.id, input.questId),
        });
        if (!quest) {
            throw new server_1.TRPCError({ code: "NOT_FOUND", message: "Quest not found" });
        }
        // Check Real-time conditions
        let isCompleted = false;
        if (quest.conditionType === 'visit_count') {
            const myVisits = await db_1.db.select().from(schema_1.visits).where((0, drizzle_orm_1.eq)(schema_1.visits.getterId, ctx.user.id));
            if (myVisits.length >= quest.conditionValue) {
                isCompleted = true;
            }
        }
        else if (quest.conditionType === 'premium_status') {
            isCompleted = ctx.user.isPremium || false;
        }
        if (!isCompleted) {
            throw new server_1.TRPCError({ code: "BAD_REQUEST", message: "Quest requirements not met" });
        }
        // Check if already claimed
        const existingUserQuest = await db_1.db.query.userQuests.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userQuests.userId, ctx.user.id), (0, drizzle_orm_1.eq)(schema_1.userQuests.questId, input.questId)),
        });
        if (existingUserQuest?.status === 'claimed') {
            throw new server_1.TRPCError({ code: "BAD_REQUEST", message: "Reward already claimed" });
        }
        // Start transaction
        return await db_1.db.transaction(async (tx) => {
            // Update User Quest Status
            await tx.insert(schema_1.userQuests).values({
                userId: ctx.user.id,
                questId: quest.id,
                status: 'claimed',
                progress: quest.conditionValue, // Max out progress
                completedAt: new Date(),
            }).onConflictDoUpdate({
                target: [schema_1.userQuests.userId, schema_1.userQuests.questId],
                set: { status: 'claimed', completedAt: new Date() }
            });
            // Award Points
            await tx.insert(schema_1.wallets).values({
                userId: ctx.user.id,
                currentBalance: quest.rewardPoints
            }).onConflictDoUpdate({
                target: [schema_1.wallets.userId],
                set: { currentBalance: (0, drizzle_orm_1.sql) `${schema_1.wallets.currentBalance} + ${quest.rewardPoints}` }
            });
            // Log Transaction
            await tx.insert(schema_1.transactions).values({
                userId: ctx.user.id,
                amount: quest.rewardPoints,
                type: 'earn',
                description: `Quest Reward: ${quest.title}`,
            });
            return { success: true, reward: quest.rewardPoints };
        });
    }),
});
