import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './context';
import * as dotenv from 'dotenv';

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

app.get('/', (req, res) => {
    res.send('Spotch API is running');
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

// Bind to default host (usually localhost/0.0.0.0 depending on node version)
app.listen(Number(PORT), () => {
    console.log(`Server is running on port ${PORT}`);
});
