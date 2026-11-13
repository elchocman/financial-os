# Financial OS

Personal Financial Operating System — unified dashboard for Fintual, Racional, and Binance.

## Architecture

```
frontend/     Next.js 14 + TypeScript (Vercel)
backend/      FastAPI + Python 3.11   (Railway / Fly.io)
              └─ Supabase PostgreSQL  (database)
              └─ GitHub Actions       (daily cron)
```

## Modules

| Module          | Route           | Status    |
|----------------|-----------------|-----------|
| Command Center  | `/`             | ✅ Phase 1 |
| Cashflow Engine | `/cashflow`     | ✅ Phase 4 |
| Balance Sheet   | `/balance-sheet`| ✅ Phase 4 |
| Investments     | `/investments`  | ✅ Phase 1 |
| Life Planning   | `/goals`        | ✅ Phase 5 |
| Household       | `/household`    | ✅ Phase 5 |
| Integrations    | `/settings`     | ✅ Phase 6 |

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env    # fill in your credentials
python -m uvicorn app.main:app --reload --port 8000           
# Docs → http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL
npm run dev
# App → http://localhost:3000
```

### Database setup
Run migrations in your Supabase SQL editor in order:
```
backend/migrations/001_initial_schema.sql
backend/migrations/002_phase2_indexes.sql
backend/migrations/003_phase5_goals.sql
```

## Daily worker
The `daily_runner.py` orchestrates all background jobs:
1. FX rate → persist USD/CLP
2. Prices  → persist market prices for all tickers
3. Holdings → persist portfolio snapshot
4. Net worth → save daily snapshot
5. Goals → auto-update goal progress from financial data

Run manually:
```bash
cd backend && python -m app.workers.daily_runner
```

## Deploy

### Frontend → Vercel
```bash
cd frontend && vercel --prod
# Set env var: NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
```

### Backend → Railway
```bash
railway login && railway up
# Set secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FINTUAL_*, RACIONAL_*, BINANCE_*
```

### Backend → Fly.io (alternative)
```bash
flyctl launch --config fly.toml
flyctl secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
flyctl deploy
```

## Environment Variables

| Variable                    | Required | Description                      |
|-----------------------------|----------|----------------------------------|
| `SUPABASE_URL`              | ✅       | Supabase project URL             |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅       | Supabase service role key        |
| `FINTUAL_EMAIL`             | ✅       | Fintual account email            |
| `FINTUAL_PASSWORD`          | ✅       | Fintual account password         |
| `RACIONAL_LTM_SHARES`       | ✅       | Number of LTM.SN shares          |
| `RACIONAL_CFISP500_SHARES`  | ✅       | Number of CFISP500 shares        |
| `RACIONAL_META_SHARES`      | optional | META shares                      |
| `RACIONAL_AMZN_SHARES`      | optional | AMZN shares                      |
| `RACIONAL_MSFT_SHARES`      | optional | MSFT shares                      |
| `BINANCE_BTC_AMOUNT`        | ✅       | BTC amount in Binance            |

## Tech Stack
- **FastAPI** 0.115 — API framework
- **Pydantic v2** — schema validation
- **Supabase** — PostgreSQL + realtime
- **yfinance** — market data (Yahoo Finance)
- **Next.js 14** — frontend framework
- **Recharts** — data visualisation
- **JetBrains Mono** + **Syne** + **Inter** — typography
