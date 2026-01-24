# Deploy to Render

Render.com を使ってバックエンドを公開する手順です。

## 1. 準備 (GitHub)
ソースコードを GitHub にプッシュしてください。
(まだリポジトリがない場合は `git init` -> `git add .` -> `git commit` -> GitHubへプッシュ)

## 2. Render で Web Service (Backend) を作成
1. [Render Dashboard](https://dashboard.render.com/) にログイン。
2. **New +** -> **Web Service** を選択。
3. GitHubリポジトリを選択。
4. 設定入力:
   - **Name**: `spotch-backend` (任意)
   - **Root Directory**: `backend` (超重要！これを忘れないでください)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. **Create Web Service** をクリック。

## 3. Render で PostgreSQL (Database) を作成
1. **New +** -> **PostgreSQL** を選択。
2. **Name**: `spotch-db`
3. **Create Database** をクリック。
4. 作成後、**"Internal Database URL"** をコピーし、Web Service の Environment Variables に `DATABASE_URL` という名前で追加します。
   - ※ Web Service と Database が同じ Region (例: Oregon) にあることを確認してください。
   - 外部から接続する場合（初期化用）は **"External Database URL"** を使います。

## 4. データベースの初期化 (Migration & Seed)
アプリが動作するために、テーブルと初期データ（クエスト等）が必要です。
手元のPCから、Renderのデータベースに対してコマンドを実行します。

1. RenderのPostgreSQL画面で **"External Database URL"** をコピー。
2. 手元のターミナルで以下を実行（backendディレクトリで）:

```bash
# クエスト等の初期データを投入
DATABASE_URL="ここにコピーしたExternal_URLを貼り付け" npx tsx src/seed.ts
```

※ DBスキーマは `drizzle-kit push:pg` で自動同期されますが、念のため初回は上記でSeedごと流すのが確実です。

## 5. アプリの接続先変更
1. RenderのWeb Service画面で、右上のURL (`https://spotch-backend.onrender.com` 等) をコピー。
2. `mobile/eas.json` の `EXPO_PUBLIC_API_URL` をそのURLに書き換え。
3. `eas build -p ios --profile preview` でアプリ再ビルド。

これで完了です！
