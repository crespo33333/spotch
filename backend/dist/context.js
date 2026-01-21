"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = void 0;
const db_1 = require("./db");
const schema_1 = require("./db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const createContext = async ({ req, res, }) => {
    let user = null;
    try {
        const userId = req.headers['x-user-id'];
        if (userId) {
            user = await db_1.db.query.users.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.users.id, parseInt(userId))
            }) || null;
            // console.log(`[Auth] User ID ${userId} -> ${user ? 'Found' : 'Not Found'}`);
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
