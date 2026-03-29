# Dubai Deals â æç´å±¥æ­´ãã¼ã¹å²å®ç©ä»¶ã¬ã¼ãã¼

DLDï¼Dubai Land Departmentï¼ã®å¬éæç´APIãããªã¢ã«ã¿ã¤ã ã§å¸å ´ä¾¡æ ¼ãåå¾ãã
ç¾å¨ã®å£²åºãä¾¡æ ¼ã¨ã®ä¹é¢ãèªåã¹ã³ã¢ãªã³ã°ãã¾ãã

## ã¢ã¼ã­ãã¯ãã£

```
Browser â Next.js (Vercel)
              ââ /api/transactions â DLD Open Data API (CORS proxy + 1h cache)
              ââ /api/analyze     â Anthropic Claude API (AIåæ)
```

## ã»ããã¢ãã

### 1. ãªãã¸ããªãã¯ã­ã¼ã³ / ãã¡ã¤ã«ãéç½®

```bash
git clone <your-repo>
cd dubai-deals
npm install
```

### 2. ç°å¢å¤æ°ãè¨­å®

```bash
cp .env.example .env.local
# .env.local ãç·¨éãã¦ ANTHROPIC_API_KEY ãè¨­å®
```

### 3. ã­ã¼ã«ã«èµ·å

```bash
npm run dev
# http://localhost:3000 ã§ç¢ºèª
```

### 4. Vercel ã«ããã­ã¤

```bash
# Vercel CLI ã§ããã­ã¤
npx vercel

# ã¾ãã¯ GitHub ã« push ãã¦ Vercel ã¨é£æº
```

Vercel ã® Project Settings > Environment Variables ã«ä»¥ä¸ãè¿½å :
- `ANTHROPIC_API_KEY` = ããªãã®Anthropicã­ã¼

## DLD API ã«ã¤ãã¦

- ã¨ã³ããã¤ã³ã: `https://gateway.dubailand.gov.ae/open-data/transactions`
- èªè¨¼ä¸è¦ã»ç¡æã»å¬é
- æç´ãã¼ã¿ï¼Salesï¼ãåå¾
- ã¬ã¼ãå¶é: ç´100req/min â Next.jså´ã§1æéã­ã£ãã·ã¥ãã¦å¯¾å¿
- ã¨ãªã¢ã³ã¼ãä¸è¦§: `GET https://gateway.dubailand.gov.ae/open-data/lookup/areas`

## ã¹ã³ã¢ãªã³ã°ã­ã¸ãã¯

| ã¹ã³ã¢ | æ¡ä»¶ |
|--------|------|
| A      | å£²åºä¾¡æ ¼ãæç´ä¸­å¤®å¤ãã **18%ä»¥ä¸** å®ã |
| B      | 10ã18% å®ã |
| C      | 4ã10% å®ã |
| D      | 4%æªæºï¼ã»ã¼å¸å ´ä¾¡æ ¼ï¼ |

ä¹é¢ç = (æç´ä¸­å¤®å¤psf â å£²åºpsf) / æç´ä¸­å¤®å¤psf Ã 100

## ç©ä»¶ãã¼ã¿ã®æ¡å¼µ

`pages/index.tsx` ã® `SEED_LISTINGS` éåã«ç©ä»¶ãè¿½å ãããã
Bayut/Property Finder ã®ã¹ã¯ã¬ã¤ãã³ã°çµæã `/api/listings` ã¨ã³ããã¤ã³ãçµç±ã§
æ³¨å¥ããæ§æã«æ¡å¼µãã¦ãã ããã

## ãã¡ã¤ã«æ§æ

```
dubai-deals/
ââ lib/
â  ââ dld.ts              # DLD APIã¯ã©ã¤ã¢ã³ã + ã¹ã³ã¢ãªã³ã°ã­ã¸ãã¯
ââ pages/
â  ââ index.tsx           # ã¡ã¤ã³UI
â  ââ api/
â     ââ transactions.ts  # DLDãã­ã­ã· + ã­ã£ãã·ã¥
â     ââ analyze.ts       # AIåæã¨ã³ããã¤ã³ã
ââ .env.example
ââ next.config.js
ââ vercel.json
ââ tsconfig.json
```

<!-- deployed: 2026-03-29T11:38:50.741Z -->