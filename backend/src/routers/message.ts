import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '../db';
import { messages, users } from '../db/schema';
import { eq, or, and, desc, ne, sql } from 'drizzle-orm';
import { sendPushNotification } from '../utils/push';
import { getIo } from '../socket';

export const messageRouter = router({
    // Get chat history with a specific user
    getHistory: protectedProcedure
        .input(z.object({ otherUserId: z.number() }))
        .query(async ({ ctx, input }) => {
            const userId = ctx.user.id;

            return await db.query.messages.findMany({
                where: or(
                    and(eq(messages.senderId, userId), eq(messages.receiverId, input.otherUserId)),
                    and(eq(messages.senderId, input.otherUserId), eq(messages.receiverId, userId))
                ),
                orderBy: [desc(messages.createdAt)],
                limit: 50,
            });
        }),

    // Send a message
    send: protectedProcedure
        .input(z.object({
            receiverId: z.number(),
            content: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.user.id;

            const [message] = (await db.insert(messages).values({
                senderId: userId,
                receiverId: input.receiverId,
                content: input.content,
            }).returning()) as any[];

            // Emit Socket Event
            try {
                const io = getIo();
                io.to(`user_${input.receiverId}`).emit('receive_message', message);
            } catch (e) {
                console.error("Socket emit failed:", e);
            }

            // Get Receiver Push Token
            const receiver = await db.query.users.findFirst({
                where: eq(users.id, input.receiverId),
                columns: { pushToken: true, name: true }
            });

            if (receiver?.pushToken) {
                await sendPushNotification(
                    receiver.pushToken,
                    `New message from ${ctx.user.name}`,
                    input.content,
                    { type: 'chat', senderId: userId, userName: ctx.user.name }
                );
            }

            return message;
        }),

    // List recent conversations
    listConversations: protectedProcedure
        .query(async ({ ctx }) => {
            const userId = ctx.user.id;

            // Find distinct users involved in messages with me
            // This is a bit complex in pure Drizzle without raw SQL for 'DISTINCT ON' or Group By optimization
            // For now, let's fetch recent messages and filter in JS (inefficient but works for MVP)

            const recentMessages = await db.query.messages.findMany({
                where: or(eq(messages.senderId, userId), eq(messages.receiverId, userId)),
                orderBy: [desc(messages.createdAt)],
                with: {
                    sender: true,
                    receiver: true
                },
                limit: 100 // Fetch enough history to find unique contacts
            });

            const conversationsMap = new Map();

            for (const msg of recentMessages) {
                const isMeSender = msg.senderId === userId;
                const otherUser = isMeSender ? msg.receiver : msg.sender;

                if (!conversationsMap.has(otherUser.id)) {
                    conversationsMap.set(otherUser.id, {
                        user: otherUser,
                        lastMessage: msg.content,
                        lastMessageAt: msg.createdAt,
                        isMeSender
                    });
                }
            }

            return Array.from(conversationsMap.values());
        })
});
