# TrustRoute — Autonomous AI Service Payments (Real x402 · Algorand TestNet)

A production-quality full-stack demo where an AI agent autonomously selects
services, negotiates **real x402 micropayments** signed in the browser, settles
them on **Algorand TestNet in USDC** via the goplausible facilitator, recovers
from provider failures, and returns a full payment trace.

The payment layer is the **real protocol** (`@x402` v2, "exact" scheme) — there
is no simulated/mock payment path. Paid endpoints return `HTTP 503` until the
server is configured, then `HTTP 402 + PAYMENT-REQUIRED` until a client pays.

---

## Architecture

```
Frontend (React UI — pays for services itself, signs in the browser)
        ↓ axios / fetch
Backend (Express Agent Controller + x402 paywall)
        ↓
Service Layer (real APIs with automatic failover ⇄ simulator)
   ├── Research API → Gemini ⇄ OpenAI ⇄ Claude ⇄ sim      (/api/research, $0.05)
   ├── News API     → GNews  ⇄ NewsAPI  ⇄ sim             (/api/services/news,  $0.02)
   ├── Writing API  → Gemini ⇄ OpenAI ⇄ Claude ⇄ sim      (/api/services/writing,$0.02)
   ├── Code API     → simulated                           (/api/services/code,  $0.02)
   └── Weather API  → OpenWeather ⇄ WeatherAPI ⇄ sim      (/api/services/weather,$0.02)
        ↓
x402 layer
   ├── server/x402/paywall.js   # middleware: 402/PAYMENT-REQUIRED, verify via facilitator
   ├── @x402/express + @x402/core   # resource server, ExactAvmScheme (server)
   └── facilitator  https://facilitator.goplausible.xyz   # verifies + settles on-chain
```

## Folder structure

```
trustroute/
├── server/
│   ├── index.js                # Express app · CORS (x402 headers) · mounts paywall · serves client/dist
│   ├── x402/paywall.js         # ← REAL x402: prices, routes, middleware, settlement analytics
│   ├── agent/
│   │   └── planner.js          # Rule-based decision engine (category + priority + budget)
│   ├── routes/
│   │   ├── research.js         # POST /api/research   (protected — $0.05)
│   │   ├── serviceRouter.js    # POST /api/services/:id  (protected — $0.02)
│   │   ├── plan.js             # POST /api/plan       (free)
│   │   └── metrics.js          # GET  /api/metrics    (free)
│   ├── scripts/
│   │   ├── setup-wallet.js     # generate payer + payTo wallets → writes server/.env
│   │   ├── check-wallet.js     # ALGO + USDC balances, opt-in status, mode
│   │   └── e2e-x402.mjs        # full client-side handshake against the local server
│   ├── services/
│   │   ├── catalog.js          # cost · reliability · speed · primary + backup per service
│   │   ├── providers.js        # Real API provider chains + failover + simulated fallback
│   │   └── goplausible.js      # settlement analytics (in-memory, /api/metrics)
│   └── utils/logger.js         # Structured logs { step, message, timestamp, status }
└── client/                     # React (Vite) + Tailwind + @x402/core + @x402/avm
    ├── vite.config.ts          # dev proxy /api → :4000 · algosdk browser polyfill aliases
    └── src/
        ├── api.ts              # planAgent + runAgent orchestrator (free plan, paid services)
        ├── x402.ts             # ← paidFetch: 402 → decode → spend policy → sign → retry → settle
        ├── spendPolicy.ts      # daily budget · per-request cap · allow/deny lists (before signing)
        ├── receipts.ts         # local payment receipts (txId, amount, service, time)
        └── components/         # Header · AgentForm · Timeline · ResultSection · TransactionsPanel …
```

---

## Setup

```bash
# 1. Backend (port 4000)
cd trustroute/server
npm install
cp .env.example .env           # optional: add real API keys (see "Real service APIs")
npm run setup-wallet           # creates server/.env (AVM_ADDRESS + payer wallet)
npm run dev

# 2. Frontend (port 5173, proxies /api to the backend)
cd trustroute/client
npm install
cp .env.example .env           # ← paste VITE_AVM_MNEMONIC (printed by setup-wallet)
npm run dev
```

Open **http://localhost:5173**. Try: `Research the latest AI agents in
payments` — budget `$1` — priority `Speed`.

---

## Real payments — x402 on Algorand TestNet (USDC)

The **client** (browser) holds the signing wallet; the **server** only ever
holds the receiving address — it never signs or holds keys.

### 1. Create the wallets (one command)

```bash
cd trustroute/server
npm run setup-wallet
```

Prints and writes:
- `server/.env` → `AVM_ADDRESS` — the address that **receives** USDC (resource server)
- client wallet (payer/signer) → `VITE_AVM_MNEMONIC` + `VITE_AVM_PRIVATE_KEY` (→ `client/.env`)

### 2. Fund + opt in (both accounts, once)

| Account | ALGO | USDC (ASA 10458941) |
| --- | --- | --- |
| **payTo** (AVM_ADDRESS) | https://lora.algokit.io/testnet/fund | https://faucet.circle.com/ |
| **payer** (client) | https://lora.algokit.io/testnet/fund | https://faucet.circle.com/ |

Both must be **opted in** to USDC: send a 0-amount USDC transfer to the
account itself. Verify with:

```bash
npm run check-wallet    # mode, ALGO + USDC balances, opt-in status
```

### 3. Price + flow

`/api/research` costs **$0.05**, `/api/services/*` costs **$0.02** (USDC,
TestNet). The browser signs each payment itself — the server never touches a
key:

```
Browser (client)                Server (paywall)              Facilitator
  │ 1. POST /api/services/weather ──▶ │  no valid signature → HTTP 402
  │ ◀──── PAYMENT-REQUIRED (base64) ─ │  { scheme: exact, amount: 20000, payTo, asset }
  │ 2. decode → spend policy (budget /cap /allowlists) → user confirm if needed
  │ 3. sign payment payload with the  │
  │    payer key (ExactAvmScheme)     │
  │ 4. retry with PAYMENT-SIGNATURE ─▶│ ── verify + simulate ──────────────▶
  │ ◀──── HTTP 200 + PAYMENT-RESPONSE │ ◀── settled on-chain (USDC 20000) ──
  │ 5. receipt stored locally (txId)   │ onAfterSettle → /api/metrics
```

Payments are gasless for the payer (the facilitator sponsors the fee) and
settled as genuine Algorand TestNet **USDC** transfers — verify any txId on
https://testnet.explorer.perawallet.app/tx/<txId>.

### 4. Optional: e2e verification harness

With the server running in REAL mode:

```bash
cd trustroute/server
npm run e2e-x402   # full handshake: 402 → decode → sign → retry → settle
```

Expect a facilitator `Transaction simulation failed … asset 10458941 missing`
until the payer wallet is funded + opted in — then **real on-chain settlement**.

---

## Endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/plan` | free | Rule-based decision: category, services, ordering, budget guard |
| `POST` | `/api/research` | x402 $0.05 | AI research (Gemini ⇄ OpenAI ⇄ Claude ⇄ sim) |
| `POST` | `/api/services/:id` | x402 $0.02 | news, writing, grammar, code, review, weather |
| `GET` | `/api/metrics` | free | Settlement analytics (in-memory) |
| `GET` | `/health` | free | Mode (`real`/`unconfigured`) + network + protocol details |

`/health` shows the x402 configuration block: mode, scheme, network
(`algorand:<genesis-hash>`), asset, decimals, facilitator, payTo.

---

## Real service APIs (opt-in keys, automatic failover)

Every service runs a **provider chain** — the first provider that succeeds wins.
Real providers fail naturally (missing key, HTTP error, network timeout); a
simulated fallback always sits at the end of the chain, so the app never
breaks in a demo with zero keys.

| Service | Primary | Backup | Simulated fallback |
| --- | --- | --- | --- |
| Weather | OpenWeather | WeatherAPI.com | ✓ always last |
| News | GNews | NewsAPI.org | ✓ always last |
| Research | Google Gemini (gemini-3.5-flash-lite) | OpenAI ⇄ Anthropic | ✓ always last |
| Writing | Google Gemini (gemini-3.5-flash-lite) | OpenAI ⇄ Anthropic | ✓ always last |
| Grammar / Code / Review | — | — | ✓ only |

```env
# server/.env — add whatever you have; missing keys skip to the next provider
OPENWEATHER_API_KEY=…        WEATHERAPI_KEY=…
GNEWS_API_KEY=…              NEWSAPI_KEY=…
GEMINI_API_KEY=…             GEMINI_MODEL=gemini-3.5-flash-lite
OPENAI_API_KEY=…             OPENAI_MODEL=gpt-4o-mini
ANTHROPIC_API_KEY=…          ANTHROPIC_MODEL=claude-3-5-haiku-latest
DEMO_FAILOVER=0              # set 1 → primary fails once each run (demo failover)
```

---

## Spend policy (client-side, before signing)

`client/.env` (defaults are permissive for demos — set them to guard real use):

```env
VITE_DAILY_BUDGET=1.0            # max USD per rolling 24h
VITE_MAX_PER_REQUEST=0.1         # max USD per single request
VITE_ALLOWED_SERVICES=           # allowlist, e.g. weather,news
VITE_BLOCKED_SERVICES=           # denylist (wins over allowlist)
VITE_REQUIRE_APPROVAL_ABOVE=0    # USD price → must confirm in-UI before signing
```

Policy is enforced **before** any key touches a transaction; denials appear in
the run timeline.

---

## Agent logic (rule-based)

| Task keyword | Services selected | Backup |
| --- | --- | --- |
| research, analyze, trend, what is… | Research API + News API | research-backup, news-backup |
| write, blog, article, email… | Writing API + Grammar API | writing-backup |
| code, debug, build, api endpoint… | Code API + Review API | code-backup |
| weather, forecast, rain… | Weather API | weather-backup |
| anything else | Research API (fallback) | research-backup |

Priority reorders the selection: **Cost** cheapest-first, **Speed**
fastest-first, **Reliability** most-reliable-first. Budget guard skips
services that would exceed the remaining budget (logged as `BUDGET_CHECK`).

## Agent response shape

```json
{
  "result": "Generated output",
  "servicesUsed": ["research", "news"],
  "totalCost": 0.009,
  "remainingBudget": 0.991,
  "transactions": [
    { "service": "research", "txId": "…on-chain id…", "network": "algorand:…",
      "explorerUrl": "https://testnet.explorer.perawallet.app/tx/…" }
  ],
  "logs": [
    { "step": "PAYMENT_VERIFIED", "message": "Settled on-chain · USDC $0.02 · tx …", "timestamp": 3, "status": "success" }
  ]
}
```

Log steps: `API_REQUEST` · `PLANNING` · `BUDGET_CHECK` · `PAYMENT_REQUIRED` ·
`PAYMENT_SENT` · `PAYMENT_VERIFIED` · `RESULT_RECEIVED` · `FAILOVER_TRIGGERED` ·
`SPEND_POLICY` · `ERROR` — each with a monotonic `timestamp`, `message` and
color-coded `status`.

---

## Production mode

```bash
cd trustroute/client
npm run build          # outputs client/dist (TS-checked: tsc --noEmit && vite build)
cd ../server
npm start              # serves the built client at http://localhost:4000
```

---

## Notes

- Pays real (worthless) **TestNet USDC** — fully verifiable on the live
  Algorand explorer. Gas is sponsored by the facilitator.
- Two wallets: `server/.env` (`AVM_ADDRESS` = receiver — *never a key*) and
  `client/.env` (`VITE_AVM_MNEMONIC` / `VITE_AVM_PRIVATE_KEY` = payer/signer).
  Both files are git-ignored — a leaked payment key can sign real money on
  MainNet, so never commit them.
- Settlement analytics are in-memory and reset on server restart (swap
  `services/goplausible.js` for a database in production).
- The x402 toolchain identifies Algorand networks by the **full base64 genesis
  hash** (`algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=`), as the
  facilitator registry does — not the short CAIP-2 segment.
