import { io, Socket } from 'socket.io-client';
import { getBaseUrl } from './api';

let socket: Socket | null = null;

export const initSocket = (userId: string) => {
    if (socket && socket.connected) {
        // Ensure we are in the room even if re-using
        socket.emit('join_room', userId);
        return socket;
    }

    // Clean up if exists but disconnected/broken
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
    }

    const url = getBaseUrl();
    console.log('🔌 Connecting Socket.io to:', url);

    socket = io(url, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
        console.log('✅ Socket connected:', socket?.id);
        socket?.emit('join_room', userId);
    });

    socket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
        console.error('⚠️ Socket connection error:', err);
    });

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
