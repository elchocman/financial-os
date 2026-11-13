# Financial OS — Backend API

FastAPI backend for the Personal Financial Operating System.

## Quick Start

```bash
cd backend

# 1. Create virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your Supabase + platform credentials

# 4. Run database migrations
# Paste contents of migrations/001_initial_schema.sql into your Supabase SQL editor

# 5. Start the API server
uvicorn app.main:app --reload --port 8000

# ```python -m uvicorn app.main:app --reload --port 8000

API docs available at: http://localhost:8000/docs

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app + router registration
│   ├── config.py            # Settings (pydantic-settings + .env)
│   ├── database.py          # Supabase client singleton
│   │
│   ├── api/v1/              # Route handlers (thin — delegate to services)
│   │   ├── dashboard.py     # GET /api/v1/dashboard
│   │   ├── portfolio.py     # GET /api/v1/portfolio
│   │   ├── transactions.py  # CRUD /api/v1/transactions
│   │   └── goals.py         # CRUD /api/v1/goals
│   │
│   ├── services/            # Business logic
│   │   ├── portfolio_service.py   # Aggregates all platform collectors
│   │   └── networth_service.py    # Snapshot read/write + KPI calculation
│   │
│   ├── collectors/          # Pure data-fetching functions (no DB calls)
│   │   ├── fintual/         # Fintual API
│   │   ├── racional/        # Racional via Yahoo Finance
│   │   ├── binance/         # Binance (BTC via Yahoo Finance)
│   │   └── prices/          # Yahoo Finance price fetcher
│   │
│   ├── workers/
│   │   └── networth_snapshot.py   # Daily snapshot job (replaces save_snapshot.py)
│   │
│   └── utils/
│       ├── fx.py            # USD→CLP conversion with in-memory cache
│       └── numbers.py       # Decimal helpers
│
├── migrations/
│   └── 001_initial_schema.sql   # Full Supabase schema
│
├── requirements.txt
└── .env.example
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/dashboard` | Net worth KPIs (Command Center) |
| GET | `/api/v1/dashboard/chart?days=90` | Net worth history for chart |
| GET | `/api/v1/portfolio` | All holdings with live prices |
| GET | `/api/v1/portfolio/allocation` | Allocation by platform + asset class |
| POST | `/api/v1/portfolio/sync` | Manual sync + save snapshot |
| GET | `/api/v1/transactions` | List transactions |
| POST | `/api/v1/transactions` | Create manual transaction |
| DELETE | `/api/v1/transactions/:id` | Delete transaction |
| GET | `/api/v1/goals` | List financial goals |
| POST | `/api/v1/goals` | Create goal |
| PUT | `/api/v1/goals/:id` | Update goal |
| DELETE | `/api/v1/goals/:id` | Delete goal |

## Migrating from the original repo

Your existing `historical_data` table maps directly to `networth_snapshots`.
To migrate your existing data, run this in Supabase SQL editor:

```sql
insert into networth_snapshots (date, net_worth, total_assets, fintual, racional, binance, currency)
select date::date, total::numeric, total::numeric,
       fintual::numeric, racional::numeric, binance::numeric, 'CLP'
from historical_data
on conflict (date) do nothing;
```

## GitHub Actions

The existing cron job is preserved at `.github/workflows/daily_snapshot.yaml`.
It now calls `python -m app.workers.networth_snapshot` instead of `save_snapshot.py`.
All the same GitHub Secrets apply — no changes needed there.
