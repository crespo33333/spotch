"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = require("pg");
const schema = __importStar(require("./db/schema"));
const dotenv = __importStar(require("dotenv"));
const drizzle_orm_1 = require("drizzle-orm");
dotenv.config();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
const db = (0, node_postgres_1.drizzle)(pool, { schema });
async function main() {
    console.log('Topping up wallet for User ID 2...');
    const userId = 2;
    // Check if wallet exists
    let wallet = await db.query.wallets.findFirst({
        where: (0, drizzle_orm_1.eq)(schema.wallets.userId, userId)
    });
    if (!wallet) {
        console.log('Creating new wallet...');
        const [newWallet] = await db.insert(schema.wallets).values({
            userId: userId,
            currentBalance: 1000000, // 1 Million Points
            lastTransactionAt: new Date()
        }).returning();
        wallet = newWallet;
    }
    else {
        console.log('Updating existing wallet...');
        const [updatedWallet] = await db.update(schema.wallets)
            .set({ currentBalance: 1000000 })
            .where((0, drizzle_orm_1.eq)(schema.wallets.id, wallet.id))
            .returning();
        wallet = updatedWallet;
    }
    console.log(`✅ Wallet Balance Updated: ${wallet.currentBalance} points`);
    process.exit(0);
}
main().catch((err) => {
    console.error('Topup failed:', err);
    process.exit(1);
});
