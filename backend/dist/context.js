"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = void 0;
const db_1 = require("./db");
const schema_1 = require("./db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const createContext = async ({ req, res, }) => {
    let user = null;
    try {
        const authHeader = req.headers.authorization;
        // Check for Super Admin Secret (from Admin Web)
        if (authHeader === 'Bearer super-admin-secret') {
            user = {
                id: 0,
                role: 'admin',
                name: 'Super Admin',
                email: 'admin@spotch.app',
                openId: 'admin_master',
                deviceId: null,
                pushToken: null,
                xp: 999999,
                level: 99,
                createdAt: new Date(),
                isBanned: false,
                isPremium: true,
                avatar: 'default_seed'
            };
        }
        else {
            // Check for Mobile User ID
            const userId = req.headers['x-user-id'];
            if (userId) {
                user = await db_1.db.query.users.findFirst({
                    where: (0, drizzle_orm_1.eq)(schema_1.users.id, parseInt(userId))
                }) || null;
            }
        }
    }
    catch (e) {
        console.error('Auth Error:', e);
    }
    return {
        req,
        res,
        user,
    };
};
exports.createContext = createContext;
