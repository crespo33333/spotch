import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './context';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        return callback(null, true);
    },
    credentials: true,
}));

app.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
        router: appRouter,
        createContext,
    })
);

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Robust Static Path Resolution
import fs from 'fs';
const searchPaths = [
    path.join(__dirname, '../public'),
    path.join(__dirname, 'public'),
    path.join(process.cwd(), 'public'),
    path.join(process.cwd(), 'backend/public'),
];

let PUBLIC_PATH = path.join(__dirname, '../public'); // Default
for (const p of searchPaths) {
    if (fs.existsSync(p)) {
        console.log(`✅ Found public folder at: ${p}`);
        PUBLIC_PATH = p;
        break;
    } else {
        console.log(`❌ Public folder not found at: ${p}`);
    }
}

app.use(express.static(PUBLIC_PATH));

app.get('/', (req, res) => {
    const indexPath = path.join(PUBLIC_PATH, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send(`
            <h1>Maintenance Mode</h1>
            <p>Landing page is compiling...</p>
            <p>Debug Info: Public Path = ${PUBLIC_PATH}</p>
        `);
    }
});

app.get('/debug-fs', (req, res) => {
    try {
        const rootFiles = fs.readdirSync(process.cwd());
        const distFiles = fs.existsSync(path.join(process.cwd(), 'dist')) ? fs.readdirSync(path.join(process.cwd(), 'dist')) : ['No dist'];
        const publicFiles = fs.existsSync(PUBLIC_PATH) ? fs.readdirSync(PUBLIC_PATH) : ['No public'];
        res.json({
            cwd: process.cwd(),
            __dirname,
            rootFiles,
            distFiles,
            publicFiles,
            env: process.env.NODE_ENV
        });
    } catch (e) {
        res.json({ error: String(e) });
    }
});

app.get('/health', (req, res) => res.send('OK'));

// Catch-all for debugging
app.use('*', (req, res) => {
    console.log(`Fallback hit for: ${req.url} - Current Public Path: ${PUBLIC_PATH}`);
    res.status(200).send(`
        <html>
            <body style="font-family:sans-serif; text-align:center; padding:50px;">
                <h1>Spotch is Alive</h1>
                <p>You requested: ${req.url}</p>
                <p>But we couldn't find the specific resource.</p>
                <p>Landing page path: ${PUBLIC_PATH}</p>
                <hr/>
                <a href="/images/screenshot_05_fixed.png">Check Image</a>
            </body>
        </html>
    `);
});

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
