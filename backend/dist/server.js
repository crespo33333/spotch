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
const db_1 = require("./db");
dotenv.config();
// --- CONSTANTS ---
const COMMON_STYLE = `
    <style>
        body { background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #334155; line-height: 1.6; padding: 40px 20px; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 60px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        h1 { color: #0f172a; font-size: 2.5rem; font-weight: 800; margin-bottom: 10px; border-bottom: none; }
        h2 { color: #0f172a; font-size: 1.5rem; font-weight: 700; margin-top: 40px; margin-bottom: 15px; }
        p { margin-bottom: 1.5rem; }
        ul { margin-bottom: 1.5rem; padding-left: 20px; }
        li { margin-bottom: 0.5rem; }
        .date { color: #64748b; font-size: 0.9rem; margin-bottom: 40px; display: block; }
        .back-link { display: inline-block; margin-top: 40px; text-decoration: none; color: #00C2FF; font-weight: bold; }
        .back-link:hover { text-decoration: underline; }
    </style>
`;
const PRIVACY_POLICY = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spotch Privacy Policy</title>
    ${COMMON_STYLE}
</head>
<body>
    <div class="container">
        <h1>Privacy Policy</h1>
        <span class="date">Last updated: January 25, 2026</span>

        <p>This Privacy Policy applies to the Spotch mobile application (the "Service") operated by the Spotch Team.</p>

        <h2>1. Information We Collect</h2>
        <p>We collect the following types of information to provide and improve our Service:</p>
        <ul>
            <li><strong>Location Data:</strong> We collect your precise location (GPS) only while you are using the app to enable the core "Check-in" gameplay feature. We do not track your location in the background when the app is closed.</li>
            <li><strong>User Provided Information:</strong> We verify your account using your email address and store your chosen nickname and avatar image.</li>
            <li><strong>Gameplay Data:</strong> We store your check-in history, points, and territory ownership status to maintain the global leaderboard.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use the collected information for the following purposes:</p>
        <ul>
            <li>To provide the Service and maintain the game state.</li>
            <li>To display your ranking on the public leaderboard.</li>
            <li>To detect and prevent cheating or abuse (e.g., GPS spoofing).</li>
        </ul>

        <h2>3. Data Sharing and Disclosure</h2>
        <p>We do not sell, trade, or otherwise transfer your Personally Identifiable Information to outside parties. This does not include trusted third parties who assist us in operating our application (e.g., cloud hosting providers), so long as those parties agree to keep this information confidential.</p>

        <h2>4. Data Retention and Deletion</h2>
        <p>We retain your data as long as your account is active. You may request the deletion of your account and all associated data by contacting us at support@spotch.app. Upon request, all your data will be permanently removed from our servers within 30 days.</p>

        <h2>5. Security</h2>
        <p>We implement a variety of security measures to maintain the safety of your personal information. All sensitive data is transmitted via Secure Socket Layer (SSL) technology.</p>

        <h2>6. Children's Privacy</h2>
        <p>We do not knowingly collect personally identifiable information from children under 13. If you are a parent or guardian and you are aware that your child has provided us with Personal Data, please contact us.</p>

        <h2>7. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us at:</p>
        <p><strong>Email:</strong> <a href="mailto:support@spotch.app" style="color:#00C2FF">support@spotch.app</a></p>

        <a href="/" class="back-link">← Back to Home</a>
    </div>
</body>
</html>
`;
const TERMS_OF_SERVICE = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spotch Terms of Service</title>
    ${COMMON_STYLE}
</head>
<body>
    <div class="container">
        <h1>Terms of Service</h1>
        <span class="date">Last updated: January 25, 2026</span>

        <p>By using Spotch, you agree to these Terms. Please read them carefully.</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using the Spotch mobile application, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>

        <h2>2. User Conduct</h2>
        <p>You agree not to misuse the Service. Prohibited actions include:</p>
        <ul>
            <li>GPS spoofing or falsifying location data.</li>
            <li>Harassing, bullying, or intimidating other players.</li>
            <li>Posting offensive or illegal content.</li>
            <li>Attempting to reverse engineer the application.</li>
        </ul>

        <h2>3. Termination</h2>
        <p>We reserve the right to suspend or terminate your account at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users.</p>

        <h2>4. Disclaimer</h2>
        <p>The Service is provided "as is". We make no warranties, expressed or implied, regarding the reliability or availability of the Service.</p>

        <a href="/" class="back-link">← Back to Home</a>
    </div>
</body>
</html>
`;
const SUPPORT_PAGE = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spotch Support</title>
    ${COMMON_STYLE}
</head>
<body>
    <div class="container">
        <h1>Support</h1>
        <p>Need help? We are here for you.</p>
        
        <h2>Contact Us</h2>
        <p>For any issues, bug reports, or account inquiries, please email us directly:</p>
        <p><a href="mailto:support@spotch.app" style="font-size: 1.2rem; color: #00C2FF; font-weight: bold;">support@spotch.app</a></p>
        
        <h2>FAQ</h2>
        <p>Check out our <a href="/#faq" style="color: #00C2FF;">Frequently Asked Questions</a> on the home page.</p>

        <a href="/" class="back-link">← Back to Home</a>
    </div>
</body>
</html>
`;
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
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} `);
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
        console.log(`✅ Found public folder at: ${p} `);
        PUBLIC_PATH = p;
        break;
    }
    else {
        console.log(`❌ Public folder not found at: ${p} `);
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
    < h1 > Maintenance Mode </h1>
        < p > Landing page is compiling...</p>
            < p > Debug Info: Public Path = ${PUBLIC_PATH} </p>
                `);
    }
});
app.get('/health', (req, res) => res.send('OK'));
app.get('/privacy-policy', (req, res) => res.send(PRIVACY_POLICY));
app.get('/terms', (req, res) => res.send(TERMS_OF_SERVICE));
app.get('/support', (req, res) => res.send(SUPPORT_PAGE));
app.get('/db-test', async (req, res) => {
    try {
        const result = await db_1.db.query.users.findMany({ limit: 1 });
        res.json({ status: 'OK', userCount: result.length, message: 'Database is connected!' });
    }
    catch (e) {
        console.error('DB Test Failed:', e);
        res.status(500).json({ status: 'ERROR', error: e.message });
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
// Catch-all for debugging (MUST BE LAST)
app.use('*', (req, res) => {
    console.log(`Fallback hit for: ${req.url} - Current Public Path: ${PUBLIC_PATH} `);
    res.status(200).send(`
    < html >
    <body style="font-family:sans-serif; text-align:center; padding:50px;" >
        <h1>Spotch is Alive </h1>
            < p > You requested: ${req.url} </p>
                < p > But we couldn't find the specific resource.</p>
                    < p > Landing page path: ${PUBLIC_PATH} </p>
                        < hr />
                        <a href="/images/screenshot_05_fixed.png" > Check Image </a>
                            </body>
                            </html>
                                `);
});
// Bind to default host and start
const start = async () => {
    try {
        console.log("🚀 Starting Spotch Backend...");
        await (0, db_1.initDB)();
        app.listen(Number(PORT), '0.0.0.0', () => {
            console.log(`✅ Server is running on port ${PORT} `);
        });
    }
    catch (e) {
        console.error("❌ Fatal startup error:", e);
        process.exit(1);
    }
};
// --- Cron Scheduler ---
const cron_1 = require("./utils/cron");
// Run every 10 minutes
setInterval(() => {
    (0, cron_1.processWeeklyTurfWars)().catch(e => console.error('Cron Error:', e));
    (0, cron_1.cleanupStaleVisits)().catch(e => console.error('Cleanup Error:', e));
}, 10 * 60 * 1000);
// Run once on startup after DB init (delayed)
setTimeout(() => {
    (0, cron_1.processWeeklyTurfWars)().catch(e => console.error('Startup Cron Error:', e));
}, 10000);
start();
