-- ════════════════════════════════════════════════════════════════
-- Financial OS — Supabase Schema Migration
-- Run this in your Supabase SQL editor
-- ════════════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "pgcrypto";


-- ─────────────────────────────────────────────
-- USERS
-- Single user for MVP. Multi-user ready for V2.
-- ─────────────────────────────────────────────
create table if not exists users (
  id           uuid primary key default gen_random_uuid(),
  email        text unique not null,
  name         text,
  base_currency text not null default 'CLP',
  created_at   timestamptz not null default now()
);


-- ─────────────────────────────────────────────
-- ACCOUNTS (connected platforms)
-- ─────────────────────────────────────────────
create table if not exists accounts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references users(id) on delete cascade,
  name             text not null,
  type             text not null check (type in ('investment','bank','crypto','manual')),
  platform         text,          -- 'fintual' | 'racional' | 'binance' | 'manual'
  currency         text not null default 'CLP',
  is_active        boolean not null default true,
  credentials_ref  text,          -- encrypted reference, never raw credentials
  created_at       timestamptz not null default now()
);


-- ─────────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────────
create table if not exists categories (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references users(id) on delete cascade,
  name      text not null,
  type      text not null check (type in ('income','expense')),
  icon      text,
  color     text,
  parent_id uuid references categories(id)
);

-- Seed default categories
insert into categories (id, user_id, name, type, icon, color) values
  (gen_random_uuid(), null, 'Salary',        'income',  '💰', '#10b981'),
  (gen_random_uuid(), null, 'Freelance',     'income',  '💼', '#6366f1'),
  (gen_random_uuid(), null, 'Investments',   'income',  '📈', '#f59e0b'),
  (gen_random_uuid(), null, 'Food',          'expense', '🍔', '#ef4444'),
  (gen_random_uuid(), null, 'Transport',     'expense', '🚗', '#3b82f6'),
  (gen_random_uuid(), null, 'Housing',       'expense', '🏠', '#8b5cf6'),
  (gen_random_uuid(), null, 'Health',        'expense', '🏥', '#ec4899'),
  (gen_random_uuid(), null, 'Entertainment', 'expense', '🎬', '#f97316'),
  (gen_random_uuid(), null, 'Subscriptions', 'expense', '📱', '#06b6d4'),
  (gen_random_uuid(), null, 'Groceries',     'expense', '🛒', '#84cc16'),
  (gen_random_uuid(), null, 'Utilities',     'expense', '💡', '#eab308')
on conflict do nothing;


-- ─────────────────────────────────────────────
-- TRANSACTIONS
-- ─────────────────────────────────────────────
create table if not exists transactions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references users(id) on delete cascade,
  account_id            uuid references accounts(id),
  date                  date not null,
  amount                numeric(18,4) not null,
  currency              text not null default 'CLP',
  amount_base_currency  numeric(18,4),
  type                  text not null check (type in ('income','expense','transfer')),
  category_id           uuid references categories(id),
  description           text,
  is_recurring          boolean not null default false,
  source                text not null default 'manual',  -- 'manual' | 'imported' | 'synced'
  created_at            timestamptz not null default now()
);

create index if not exists idx_transactions_date     on transactions(date desc);
create index if not exists idx_transactions_type     on transactions(type);
create index if not exists idx_transactions_user_id  on transactions(user_id);


-- ─────────────────────────────────────────────
-- ASSETS (Balance Sheet items)
-- ─────────────────────────────────────────────
create table if not exists assets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references users(id) on delete cascade,
  account_id     uuid references accounts(id),
  name           text not null,
  type           text not null,    -- 'cash' | 'investment' | 'crypto' | 'real_estate' | 'other'
  subtype        text,             -- 'etf' | 'stock' | 'fund' | 'btc'
  is_liability   boolean not null default false,
  current_value  numeric(18,4),
  currency       text not null default 'CLP',
  updated_at     timestamptz not null default now()
);


-- ─────────────────────────────────────────────
-- HOLDINGS (individual investment positions)
-- ─────────────────────────────────────────────
create table if not exists holdings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,
  account_id  uuid references accounts(id),
  ticker      text,
  name        text not null,
  asset_class text,               -- 'crypto' | 'equity' | 'etf' | 'fund'
  quantity    numeric(18,8) not null,
  avg_cost    numeric(18,4),
  currency    text not null default 'USD',
  platform    text,               -- 'binance' | 'racional' | 'fintual'
  updated_at  timestamptz not null default now()
);

create index if not exists idx_holdings_platform on holdings(platform);
create index if not exists idx_holdings_ticker   on holdings(ticker);


-- ─────────────────────────────────────────────
-- PRICES (fetched by background workers)
-- ─────────────────────────────────────────────
create table if not exists prices (
  id         uuid primary key default gen_random_uuid(),
  ticker     text not null,
  price      numeric(18,4) not null,
  currency   text not null,
  source     text not null default 'yahoo',
  fetched_at timestamptz not null default now()
);

create unique index if not exists idx_prices_ticker_date
  on prices(ticker, date_trunc('day', fetched_at));

create index if not exists idx_prices_ticker on prices(ticker);


-- ─────────────────────────────────────────────
-- NET WORTH SNAPSHOTS
-- Migrates your existing historical_data table.
-- historical_data columns: date, fintual, racional, binance, total
-- ─────────────────────────────────────────────
create table if not exists networth_snapshots (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references users(id),
  date               date not null unique,
  total_assets       numeric(18,4) not null default 0,
  total_liabilities  numeric(18,4) not null default 0,
  net_worth          numeric(18,4) not null,
  -- Platform breakdown (mirrors historical_data columns)
  fintual            numeric(18,4),
  racional           numeric(18,4),
  binance            numeric(18,4),
  cash               numeric(18,4),
  other              numeric(18,4),
  currency           text not null default 'CLP',
  created_at         timestamptz not null default now()
);

create index if not exists idx_networth_snapshots_date on networth_snapshots(date desc);

-- ── Migration: copy existing historical_data into networth_snapshots ──────────
-- Run this ONCE if you have existing data in historical_data:
--
-- insert into networth_snapshots (date, net_worth, total_assets, fintual, racional, binance, currency)
-- select
--   date::date,
--   total::numeric,
--   total::numeric,
--   fintual::numeric,
--   racional::numeric,
--   binance::numeric,
--   'CLP'
-- from historical_data
-- on conflict (date) do nothing;


-- ─────────────────────────────────────────────
-- FX RATES
-- ─────────────────────────────────────────────
create table if not exists fx_rates (
  id             uuid primary key default gen_random_uuid(),
  from_currency  text not null,
  to_currency    text not null,
  rate           numeric(18,6) not null,
  fetched_at     timestamptz not null default now()
);

create unique index if not exists idx_fx_rates_pair_date
  on fx_rates(from_currency, to_currency, date_trunc('day', fetched_at));


-- ─────────────────────────────────────────────
-- GOALS
-- ─────────────────────────────────────────────
create table if not exists goals (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references users(id) on delete cascade,
  name                  text not null,
  target_amount         numeric(18,4) not null,
  current_amount        numeric(18,4) not null default 0,
  target_date           date,
  monthly_savings_needed numeric(18,4),
  currency              text not null default 'CLP',
  status                text not null default 'active' check (status in ('active','achieved','paused')),
  created_at            timestamptz not null default now()
);


-- ─────────────────────────────────────────────
-- ORDERS (future Investment Router — dormant in MVP)
-- Table exists now so the schema is migration-ready.
-- ─────────────────────────────────────────────
create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references users(id) on delete cascade,
  broker            text not null,   -- 'racional' | 'fintual' | 'binance'
  ticker            text not null,
  side              text not null check (side in ('buy','sell')),
  quantity          numeric(18,8),
  amount            numeric(18,4),
  currency          text,
  status            text not null default 'pending'
                      check (status in ('pending','routed','executed','failed','cancelled')),
  external_order_id text,
  notes             text,
  created_at        timestamptz not null default now(),
  executed_at       timestamptz
);

create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_user_id on orders(user_id);


-- ════════════════════════════════════════════════════════════════
-- Done. Your Financial OS schema is ready.
-- ════════════════════════════════════════════════════════════════
