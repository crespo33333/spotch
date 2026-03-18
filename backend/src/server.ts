import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './context';
import * as dotenv from 'dotenv';
import path from 'path';
import { db, initDB } from './db';
import { createServer } from 'http';
import { initSocket } from './socket';

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

        <hr style="margin: 60px 0; border: 0; border-top: 1px solid #e2e8f0;">

        <div lang="ja">
            <h1>プライバシーポリシー</h1>
            <span class="date">最終更新日: 2026年1月25日</span>

            <p>本プライバシーポリシーは、Spotchチームが運営するモバイルアプリケーション「Spotch」（以下「本サービス」）に適用されます。</p>

            <h2>1. 収集する情報</h2>
            <p>本サービスを提供・改善するために、以下の情報を収集します：</p>
            <ul>
                <li><strong>位置情報:</strong> ゲームプレイの中核機能である「チェックイン」を有効にするため、アプリ使用中のみ正確な位置情報（GPS）を収集します。アプリが閉じている間にバックグラウンドで位置情報を追跡することはありません。</li>
                <li><strong>ユーザー提供情報:</strong> アカウント確認のためにメールアドレスを使用し、選択されたニックネームとアバター画像を保存します。</li>
                <li><strong>ゲームプレイデータ:</strong> グローバルランキングを維持するため、チェックイン履歴、ポイント、領土所有状況を保存します。</li>
            </ul>

            <h2>2. 情報の利用目的</h2>
            <p>収集した情報は以下の目的で利用します：</p>
            <ul>
                <li>本サービスの提供およびゲーム状態の維持。</li>
                <li>公開ランキングへの表示。</li>
                <li>不正行為（GPS偽装など）の検知および防止。</li>
            </ul>

            <h2>3. 情報の共有と開示</h2>
            <p>私たちは、お客様の個人を特定できる情報を外部の第三者に販売、取引、または譲渡することはありません。ただし、本サービスの運営を支援する信頼できる第三者（クラウドホスティングプロバイダーなど）が、情報の機密性を保持することに同意している場合はこの限りではありません。</p>

            <h2>4. データの保持と削除</h2>
            <p>アカウントが有効である限り、データを保持します。アカウントおよび関連データの削除を希望される場合は、support@spotch.app までご連絡ください。リクエストを受領後、30日以内にサーバーからすべてのデータを完全に削除します。</p>

            <h2>5. セキュリティ</h2>
            <p>個人情報の安全性を維持するために、様々なセキュリティ対策を講じています。すべての機密データはSSL（Secure Socket Layer）技術を介して送信されます。</p>

            <h2>6. 子供のプライバシー</h2>
            <p>私たちは、13歳未満の子供から意図的に個人情報を収集することはありません。親権者または保護者の方で、お子様が私たちに個人データを提供したことに気づいた場合は、ご連絡ください。</p>

            <h2>7. お問い合わせ</h2>
            <p>本プライバシーポリシーに関するご質問は、以下までお問い合わせください：</p>
            <p><strong>Email:</strong> <a href="mailto:support@spotch.app" style="color:#00C2FF">support@spotch.app</a></p>
        </div>

        <a href="/" class="back-link">← Back to Home / ホームに戻る</a>
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

        <hr style="margin: 60px 0; border: 0; border-top: 1px solid #e2e8f0;">

        <div lang="ja">
            <h1>利用規約</h1>
            <span class="date">最終更新日: 2026年1月25日</span>

            <p>Spotchを利用することにより、本規約に同意したものとみなされます。よくお読みください。</p>

            <h2>1. 規約への同意</h2>
            <p>Spotchモバイルアプリケーションにアクセスまたは使用することにより、利用者は本利用規約および適用されるすべての法律・規制に拘束されることに同意するものとします。</p>

            <h2>2. ユーザーの行動規範</h2>
            <p>本サービスを不正に利用しないことに同意するものとします。禁止事項には以下が含まれます：</p>
            <ul>
                <li>GPS偽装または位置情報の改ざん。</li>
                <li>他のプレイヤーへの嫌がらせ、いじめ、または威嚇。</li>
                <li>不快または違法なコンテンツの投稿。</li>
                <li>アプリケーションのリバースエンジニアリングの試み。</li>
            </ul>

            <h2>3. アカウントの停止</h2>
            <p>私たちは、本規約に違反している、または他のユーザーに害を及ぼすと判断した場合、独自の裁量により、予告なくアカウントを停止または削除する権利を留保します。</p>

            <h2>4. 免責事項</h2>
            <p>本サービスは「現状有姿」で提供されます。私たちは、本サービスの信頼性や可用性に関して、明示または黙示を問わず、いかなる保証も行いません。</p>
        </div>

        <a href="/" class="back-link">← Back to Home / ホームに戻る</a>
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

        <hr style="margin: 60px 0; border: 0; border-top: 1px solid #e2e8f0;">

        <div lang="ja">
            <h1>サポート</h1>
            <p>お困りですか？私たちがお手伝いします。</p>
            
            <h2>お問い合わせ</h2>
            <p>不具合の報告、アカウントに関するお問い合わせは、以下のメールアドレスまで直接ご連絡ください：</p>
            <p><a href="mailto:support@spotch.app" style="font-size: 1.2rem; color: #00C2FF; font-weight: bold;">support@spotch.app</a></p>
            
            <h2>よくある質問 (FAQ)</h2>
            <p>トップページの <a href="/#faq" style="color: #00C2FF;">よくある質問</a> も併せてご確認ください。</p>
        </div>

        <a href="/" class="back-link">← Back to Home / ホームに戻る</a>
    </div>
</body>
</html>
`;



const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
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

app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} `);
    next();
});

// Robust Static Path Resolution
import fs from 'fs';
const searchPaths = [
    path.join(__dirname, 'public'),    // dist/public (Prioritize built artifact)
    path.join(__dirname, '../public'), // ../public relative to dist/server.js -> backend/public
    path.join(process.cwd(), 'public'), // backend/public
    path.join(process.cwd(), 'backend/public'), // fallback
];
console.log('DEBUG: defined searchPaths:', searchPaths);

let PUBLIC_PATH = path.join(__dirname, '../public'); // Default
for (const p of searchPaths) {
    if (fs.existsSync(p)) {
        console.log(`✅ Found public folder at: ${p} `);
        PUBLIC_PATH = p;
        break;
    } else {
        console.log(`❌ Public folder not found at: ${p} `);
    }
}

app.use(express.static(PUBLIC_PATH));

app.get('/', (req: Request, res: Response) => {
    const indexPath = path.join(PUBLIC_PATH, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send(`
    < h1 > Maintenance Mode </h1>
        < p > Landing page is compiling...</p>
            < p > Debug Info: Public Path = ${PUBLIC_PATH} </p>
                `);
    }
});

app.get('/health', (req: Request, res: Response) => res.send('OK'));
app.get('/health-check', (req: Request, res: Response) => res.json({
    status: 'OK',
    time: new Date().toISOString(),
    version: process.version
}));

app.get('/privacy-policy', (req: Request, res: Response) => res.send(PRIVACY_POLICY));
app.get('/privacy', (req: Request, res: Response) => res.send(PRIVACY_POLICY)); // Alias for convenience
app.get('/terms', (req: Request, res: Response) => res.send(TERMS_OF_SERVICE));
app.get('/support', (req: Request, res: Response) => res.send(SUPPORT_PAGE));
app.get('/help', (req: Request, res: Response) => res.send(SUPPORT_PAGE)); // Alias for convenience


app.get('/db-test', async (req: Request, res: Response) => {
    try {
        const result = await db.query.users.findMany({ limit: 1 });
        res.json({ status: 'OK', userCount: result.length, message: 'Database is connected!' });
    } catch (e: any) {
        console.error('DB Test Failed:', e);
        res.status(500).json({ status: 'ERROR', error: e.message });
    }
});

app.get('/debug-fs', (req: Request, res: Response) => {
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

app.get('/debug-index', (req: Request, res: Response) => {
    const indexPath = path.join(PUBLIC_PATH, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.send(fs.readFileSync(indexPath, 'utf-8'));
    } else {
        res.status(404).send('Not found at ' + indexPath);
    }
});

app.get('/debug-read', (req: Request, res: Response) => {
    try {
        const rootPublic = path.join(process.cwd(), 'public');
        const indexPath = path.join(rootPublic, 'index.html');

        const info = {
            cwd: process.cwd(),
            rootPublic,
            indexPath,
            exists: fs.existsSync(indexPath),
            stat: fs.existsSync(indexPath) ? fs.statSync(indexPath) : 'N/A',
            readdir: fs.existsSync(rootPublic) ? fs.readdirSync(rootPublic) : 'N/A',
            contentSnippet: '',
            error: null as any
        };

        if (info.exists) {
            info.contentSnippet = fs.readFileSync(indexPath, 'utf-8').slice(0, 100);
        }

        res.json(info);
    } catch (e) {
        res.json({ error: String(e), stack: (e as Error).stack });
    }
});

// Catch-all for debugging (MUST BE LAST)
app.use('*', (req: Request, res: Response) => {
    console.log(`Fallback hit for: ${req.url} - Current Public Path: ${PUBLIC_PATH} `);
    res.status(200).send(`
    <!DOCTYPE html>
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

// Bind to default host and start
const start = async () => {
    try {
        console.log("🚀 Starting Spotch Backend...");
        await initDB();
        const httpServer = createServer(app);
        initSocket(httpServer);
        httpServer.listen(Number(PORT), '0.0.0.0', () => {
            console.log(`✅ Server is running on port ${PORT} `);
        });
    } catch (e) {
        console.error("❌ Fatal startup error:", e);
        process.exit(1);
    }
};

// --- Cron Scheduler ---
import { processWeeklyTurfWars, cleanupStaleVisits } from './utils/cron';

// Keep-alive Ping to prevent Render sleep (every 14 mins)
setInterval(() => {
    const url = process.env.RENDER_EXTERNAL_URL || 'https://spotch-backend.onrender.com/health';
    fetch(url)
        .then(res => console.log(`🔄 Keep-alive ping sent to ${url}: ${res.status}`))
        .catch(e => console.error(`⚠️ Keep-alive ping failed:`, e));
}, 14 * 60 * 1000);

// Run every 10 minutes
setInterval(() => {
    processWeeklyTurfWars().catch(e => console.error('Cron Error:', e));
    cleanupStaleVisits().catch(e => console.error('Cleanup Error:', e));
}, 10 * 60 * 1000);

// Run once on startup after DB init (delayed)
setTimeout(() => {
    processWeeklyTurfWars().catch(e => console.error('Startup Cron Error:', e));
}, 10000);

start();
