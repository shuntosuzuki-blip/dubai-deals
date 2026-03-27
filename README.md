# Dubai Deals — 成約履歴ベース割安物件レーダー

DLD（Dubai Land Department）の公開成約APIからリアルタイムで市場価格を取得し、
現在の売出し価格との乖離を自動スコアリングします。

## アーキテクチャ

```
Browser → Next.js (Vercel)
              ├─ /api/transactions → DLD Open Data API (CORS proxy + 1h cache)
              └─ /api/analyze     → Anthropic Claude API (AI分析)
```

## セットアップ

### 1. リポジトリをクローン / ファイルを配置

```bash
git clone <your-repo>
cd dubai-deals
npm install
```

### 2. 環境変数を設定

```bash
cp .env.example .env.local
# .env.local を編集して ANTHROPIC_API_KEY を設定
```

### 3. ローカル起動

```bash
npm run dev
# http://localhost:3000 で確認
```

### 4. Vercel にデプロイ

```bash
# Vercel CLI でデプロイ
npx vercel

# または GitHub に push して Vercel と連携
```

Vercel の Project Settings > Environment Variables に以下を追加:
- `ANTHROPIC_API_KEY` = あなたのAnthropicキー

## DLD API について

- エンドポイント: `https://gateway.dubailand.gov.ae/open-data/transactions`
- 認証不要・無料・公開
- 成約データ（Sales）を取得
- レート制限: 約100req/min → Next.js側で1時間キャッシュして対応
- エリアコード一覧: `GET https://gateway.dubailand.gov.ae/open-data/lookup/areas`

## スコアリングロジック

| スコア | 条件 |
|--------|------|
| A      | 売出価格が成約中央値より **18%以上** 安い |
| B      | 10〜18% 安い |
| C      | 4〜10% 安い |
| D      | 4%未満（ほぼ市場価格） |

乖離率 = (成約中央値psf − 売出psf) / 成約中央値psf × 100

## 物件データの拡張

`pages/index.tsx` の `SEED_LISTINGS` 配列に物件を追加するか、
Bayut/Property Finder のスクレイピング結果を `/api/listings` エンドポイント経由で
注入する構成に拡張してください。

## ファイル構成

```
dubai-deals/
├─ lib/
│  └─ dld.ts              # DLD APIクライアント + スコアリングロジック
├─ pages/
│  ├─ index.tsx           # メインUI
│  └─ api/
│     ├─ transactions.ts  # DLDプロキシ + キャッシュ
│     └─ analyze.ts       # AI分析エンドポイント
├─ .env.example
├─ next.config.js
├─ vercel.json
└─ tsconfig.json
```
