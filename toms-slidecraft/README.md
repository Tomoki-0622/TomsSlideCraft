# 🎨 Tom's SlideCraft

社内プレゼン資料作成支援Webアプリ。AIとの対話でストーリーを設計し、マークダウン → Marpスライド → PPTX までワンストップで作成・編集できます。

## 機能

- 📝 **ストーリー作成** — AIチャットでプレゼン構成を検討
- 🖼️ **資料の作成** — Marpスライド生成・AI編集・HTML/PPTXダウンロード
- 🌐 **資料の英語化** — 日英対訳プレビューと一括翻訳
- 📜 **スクリプト作成** — 発表用日英スクリプト生成

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **スタイリング**: Tailwind CSS + shadcn/ui
- **AIバックエンド**: Azure OpenAI
- **スライド生成**: @marp-team/marp-core
- **PPTX出力**: PptxGenJS
- **認証**: 共有パスワード + httpOnly Cookie (HMAC-SHA256)

## セットアップ

### 1. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集して以下を設定:

```env
SITE_PASSWORD=your_shared_password
SESSION_SECRET=your_random_long_secret_key
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your_deployment_name
```

### 2. Suntoryロゴの差し替え

`public/suntory-logo.png` を実際のロゴ画像に差し替えてください。  
**注意**: 使用前に法務・広報部門の許諾を確認してください。

### 3. 開発サーバー起動

```bash
npm install
npm run dev
```

### 4. Vercelデプロイ

```bash
npm run build
```

Vercelに環境変数を設定してデプロイしてください。

## 利用方法

1. `/login` でパスワードを入力してログイン
2. ダッシュボードで新規プレゼンを作成
3. ストーリー作成タブでAIとの対話で構成を設計
4. 資料の作成タブでMarpスライドに変換・編集
5. 英語化タブで一括翻訳、スクリプトタブで発表資料を作成

## データ保存

プロジェクトはブラウザの LocalStorage に保存されます（上限5MB）。  
ブラウザをまたいだ共有・同期には対応していません（MVP版）。

## パスワード変更手順

1. Vercelダッシュボードで `SITE_PASSWORD` 環境変数を更新
2. Vercelで再デプロイを実行
3. 全ユーザーに新パスワードを周知（既存Cookieは自動的に無効化）
