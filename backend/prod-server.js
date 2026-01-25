const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

// --- CONSTANTS ---
const PRIVACY_POLICY = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Spotch Privacy Policy</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; color: #333; }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
        h2 { margin-top: 30px; color: #111; }
        ul { margin-bottom: 20px; }
        .date { color: #666; font-style: italic; }
    </style>
</head>
<body>
    <h1>Privacy Policy</h1>
    <p class="date">Last updated: January 25, 2026</p>

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
    <p><strong>Email:</strong> support@spotch.app</p>
</body>
</html>
`;

const SUPPORT_PAGE = `
<html>
    <head><title>Spotch Support</title></head>
    <body style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h1>Need Help?</h1>
        <p>If you have any issues with Spotch, please contact us at:</p>
        <h3><a href="mailto:support@spotch.app">support@spotch.app</a></h3>
        <p>We usually reply within 24 hours.</p>
    </body>
</html>
`;

// --- ROUTES ---

app.get('/privacy', (req, res) => res.send(PRIVACY_POLICY));
app.get('/support', (req, res) => res.send(SUPPORT_PAGE));
app.get('/health', (req, res) => res.send('OK'));

// --- STATIC FILES (Best Effort) ---
// Try to find the public folder in common locations
const searchPaths = [
    path.join(__dirname, 'public'),
    path.join(__dirname, '../public'),
    path.join(process.cwd(), 'public'),
    path.join(process.cwd(), 'backend/public')
];

let PUBLIC_PATH = null;
for (const p of searchPaths) {
    if (fs.existsSync(p)) {
        console.log(`[PROD] Found public folder at: ${p}`);
        PUBLIC_PATH = p;
        break;
    }
}

if (PUBLIC_PATH) {
    app.use(express.static(PUBLIC_PATH));
    app.get('/', (req, res) => {
        res.sendFile(path.join(PUBLIC_PATH, 'index.html'));
    });
} else {
    // Fallback if static files fail
    app.get('/', (req, res) => {
        res.send(`
            <html>
                <body style="font-family:sans-serif; text-align:center; padding:50px;">
                    <h1>Spotch Server is Running (v1.0.8)</h1>
                    <p>Privacy Policy and Support pages are active.</p>
                    <p style="color:red">Warning: Static assets not found.</p>
                    <a href="/privacy">Privacy Policy</a> | <a href="/support">Support</a>
                </body>
            </html>
        `);
    });
}

// --- CATCH ALL ---
app.use('*', (req, res) => {
    res.status(200).send(PUBLIC_PATH ? `
        <h1>Spotch Global Fallback</h1>
        <p>Resource not found.</p>
        <a href="/">Go Home</a>
    ` : 'Spotch Server Active (No Static Assets)');
});

// --- START ---
app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[PROD] Server running on port ${PORT}`);
});
