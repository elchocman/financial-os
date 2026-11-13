-- ════════════════════════════════════════════════════════════════
-- Migration 002 — Phase 2: Holdings persistence + price history
-- Run this in your Supabase SQL editor after 001_initial_schema.sql
-- ════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- Holdings: add avg_cost column if not present
-- (already in schema from 001, but ensure it exists)
-- ─────────────────────────────────────────────
ALTER TABLE holdings
  ADD COLUMN IF NOT EXISTS avg_cost numeric(18,4);


-- ─────────────────────────────────────────────
-- Holdings: composite unique index on (platform, ticker)
-- Enables efficient upsert without scanning the full table
-- ─────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_holdings_platform_ticker
  ON holdings(platform, ticker)
  WHERE ticker IS NOT NULL;

-- For fund holdings without a ticker (e.g. Fintual goals)
CREATE UNIQUE INDEX IF NOT EXISTS idx_holdings_platform_name
  ON holdings(platform, name)
  WHERE ticker IS NULL;


-- ─────────────────────────────────────────────
-- Prices: index for fast latest-price lookups
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_prices_ticker_fetched
  ON prices(ticker, fetched_at DESC);


-- ─────────────────────────────────────────────
-- FX rates: index for fast pair lookups
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fx_rates_pair_fetched
  ON fx_rates(from_currency, to_currency, fetched_at DESC);


-- ─────────────────────────────────────────────
-- Networth snapshots: index for chart queries
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_networth_date_asc
  ON networth_snapshots(date ASC);


-- ─────────────────────────────────────────────
-- Helper view: latest price per ticker
-- Makes "get current price" queries trivial
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW latest_prices AS
SELECT DISTINCT ON (ticker)
  ticker,
  price,
  currency,
  source,
  fetched_at
FROM prices
ORDER BY ticker, fetched_at DESC;


-- ─────────────────────────────────────────────
-- Helper view: current portfolio snapshot
-- Joins holdings with latest prices
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW portfolio_snapshot AS
SELECT
  h.id,
  h.name,
  h.ticker,
  h.platform,
  h.asset_class,
  h.quantity,
  h.avg_cost,
  h.currency,
  h.updated_at,
  lp.price        AS latest_price,
  lp.fetched_at   AS price_fetched_at,
  (h.quantity * lp.price) AS current_value
FROM holdings h
LEFT JOIN latest_prices lp ON lp.ticker = h.ticker;


-- ════════════════════════════════════════════════════════════════
-- Done. Phase 2 schema changes applied.
-- ════════════════════════════════════════════════════════════════
