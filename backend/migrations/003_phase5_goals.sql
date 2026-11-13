-- ════════════════════════════════════════════════════════════════
-- Migration 003 — Phase 5: Goals auto-sync support
-- Run after 002_phase2_indexes.sql
-- ════════════════════════════════════════════════════════════════

-- Add auto_source column to goals table
-- Values: 'net_worth' | 'fintual' | 'racional' | 'binance' | 'savings' | NULL (manual)
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS auto_source text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Index for fast lookup of auto-synced goals
CREATE INDEX IF NOT EXISTS idx_goals_auto_source
  ON goals(auto_source)
  WHERE auto_source IS NOT NULL;

-- Add categories if not already seeded
-- (Run this only if 001 didn't seed them)
INSERT INTO categories (id, name, type, icon, color) VALUES
  (gen_random_uuid(), 'Housing',       'expense', '🏠', '#6366f1'),
  (gen_random_uuid(), 'Food',          'expense', '🍔', '#f59e0b'),
  (gen_random_uuid(), 'Transport',     'expense', '🚗', '#3b82f6'),
  (gen_random_uuid(), 'Entertainment', 'expense', '🎬', '#a855f7'),
  (gen_random_uuid(), 'Health',        'expense', '💊', '#10b981'),
  (gen_random_uuid(), 'Education',     'expense', '📚', '#06b6d4'),
  (gen_random_uuid(), 'Shopping',      'expense', '🛍️', '#f43f5e'),
  (gen_random_uuid(), 'Utilities',     'expense', '⚡', '#84cc16'),
  (gen_random_uuid(), 'Insurance',     'expense', '🛡️', '#64748b'),
  (gen_random_uuid(), 'Other',         'expense', '📌', '#4a5a6a'),
  (gen_random_uuid(), 'Salary',        'income',  '💼', '#22c55e'),
  (gen_random_uuid(), 'Freelance',     'income',  '💻', '#22c55e'),
  (gen_random_uuid(), 'Investment',    'income',  '📈', '#22c55e'),
  (gen_random_uuid(), 'Other Income',  'income',  '💰', '#22c55e')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- Done. Phase 5 schema changes applied.
-- ════════════════════════════════════════════════════════════════
