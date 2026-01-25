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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const trpcExpress = __importStar(require("@trpc/server/adapters/express"));
const routers_1 = require("./routers");
const context_1 = require("./context");
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        return callback(null, true);
    },
    credentials: true,
}));
app.use('/trpc', trpcExpress.createExpressMiddleware({
    router: routers_1.appRouter,
    createContext: context_1.createContext,
}));
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
// Robust Static Path Resolution
const fs_1 = __importDefault(require("fs"));
const searchPaths = [
    path_1.default.join(__dirname, '../public'),
    path_1.default.join(__dirname, 'public'),
    path_1.default.join(process.cwd(), 'public'),
    path_1.default.join(process.cwd(), 'backend/public'),
];
let PUBLIC_PATH = path_1.default.join(__dirname, '../public'); // Default
for (const p of searchPaths) {
    if (fs_1.default.existsSync(p)) {
        console.log(`✅ Found public folder at: ${p}`);
        PUBLIC_PATH = p;
        break;
    }
    else {
        console.log(`❌ Public folder not found at: ${p}`);
    }
}
app.use(express_1.default.static(PUBLIC_PATH));
app.get('/', (req, res) => {
    const indexPath = path_1.default.join(PUBLIC_PATH, 'index.html');
    if (fs_1.default.existsSync(indexPath)) {
        res.sendFile(indexPath);
    }
    else {
        res.send(`
            <h1>Maintenance Mode</h1>
            <p>Landing page is compiling...</p>
            <p>Debug Info: Public Path = ${PUBLIC_PATH}</p>
        `);
    }
});
app.get('/debug-fs', (req, res) => {
    try {
        const rootFiles = fs_1.default.readdirSync(process.cwd());
        const distFiles = fs_1.default.existsSync(path_1.default.join(process.cwd(), 'dist')) ? fs_1.default.readdirSync(path_1.default.join(process.cwd(), 'dist')) : ['No dist'];
        const publicFiles = fs_1.default.existsSync(PUBLIC_PATH) ? fs_1.default.readdirSync(PUBLIC_PATH) : ['No public'];
        res.json({
            cwd: process.cwd(),
            __dirname,
            rootFiles,
            distFiles,
            publicFiles,
            env: process.env.NODE_ENV
        });
    }
    catch (e) {
        res.json({ error: String(e) });
    }
});
app.get('/health', (req, res) => res.send('OK'));
const PRIVACY_POLICY = `
<!DOCTYPE html>
<html>
<head><title>Spotch Privacy Policy</title></head>
<body style="font-family: sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
    <h1>Privacy Policy</h1>
    <p>Last updated: 2026-01-25</p>
    <h2>1. Data Collection</h2>
    <p>We collect location data only when the app is in use to enable the core gameplay (Check-in). We do not track you in the background.</p>
    <h2>2. User Accounts</h2>
    <p>We store your nickname, avatar, and game progress securely.</p>
    <h2>3. Contact</h2>
    <p>For questions, contact support@spotch.app</p>
</body>
</html>
`;
app.get('/privacy', (req, res) => {
    res.send(PRIVACY_POLICY);
});
app.get('/support', (req, res) => {
    res.send(`
    <html>
        <head><title>Spotch Support</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1>Need Help?</h1>
            <p>If you have any issues with Spotch, please contact us at:</p>
            <h3><a href="mailto:support@spotch.app">support@spotch.app</a></h3>
            <p>We usually reply within 24 hours.</p>
        </body>
    </html>
    `);
});
// Bind to default host
app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
