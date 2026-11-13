-- ════════════════════════════════════════════════════════════════
-- Financial OS — Auth & Multi-user Migration
-- Adds authentication and user isolation
-- ════════════════════════════════════════════════════════════════

-- Add password_hash column to users table
create extension if not exists "pgcrypto";

-- Repair older databases where users.id was accidentally created as a foreign key
alter table users drop constraint if exists users_id_fkey;

-- Repair older databases where users.id exists without a UUID default
alter table users alter column id set default gen_random_uuid();

-- Repair older databases where the original users profile columns are missing
alter table users add column if not exists name text;
alter table users add column if not exists base_currency text not null default 'CLP';
alter table users add column if not exists created_at timestamptz not null default now();
alter table users add column if not exists password_hash text;

-- Add user_id to networth_snapshots (with constraint)
alter table networth_snapshots 
add column if not exists user_id uuid references users(id) on delete cascade;

-- Replace the original global-per-day uniqueness with per-user-per-day uniqueness
alter table networth_snapshots drop constraint if exists networth_snapshots_date_key;
create unique index if not exists idx_networth_snapshots_user_date
  on networth_snapshots(user_id, date);

-- Create index for efficient user queries on networth_snapshots
create index if not exists idx_networth_user_id on networth_snapshots(user_id, date desc);

-- Add user_id to transactions if not already present
alter table transactions 
add column if not exists user_id uuid references users(id) on delete cascade;

-- Create index for user transactions
create index if not exists idx_transactions_user_id_date 
  on transactions(user_id, date desc);

-- Add user_id to assets if not already present
alter table assets 
add column if not exists user_id uuid references users(id) on delete cascade;

-- Create index for user assets
create index if not exists idx_assets_user_id on assets(user_id);

-- Add user_id to goals if not already present
alter table goals 
add column if not exists user_id uuid references users(id) on delete cascade;

-- Create index for user goals
create index if not exists idx_goals_user_id on goals(user_id);

-- Add user_id to accounts if not already present
alter table accounts 
add column if not exists user_id uuid references users(id) on delete cascade;

-- Create index for user accounts
create index if not exists idx_accounts_user_id on accounts(user_id);

-- Update categories to be user-specific if needed
-- (note: some categories are global with user_id = null, others per-user)
create index if not exists idx_categories_user_id on categories(user_id) where user_id is not null;

-- ════════════════════════════════════════════════════════════════
-- Done. Multi-user auth migration complete.
-- ════════════════════════════════════════════════════════════════
