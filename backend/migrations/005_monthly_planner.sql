-- Monthly Planner
-- Adds persisted monthly plans, recurring expenses, and category budgets

create table if not exists monthly_plans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  month           date not null,
  planned_income  numeric(18,4) not null default 0,
  savings_target  numeric(18,4) not null default 0,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists idx_monthly_plans_user_month
  on monthly_plans(user_id, month);

create table if not exists recurring_expenses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  name          text not null,
  amount        numeric(18,4) not null,
  currency      text not null default 'CLP',
  category_id   uuid references categories(id) on delete set null,
  day_of_month  integer not null default 1 check (day_of_month between 1 and 31),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_recurring_expenses_user_active
  on recurring_expenses(user_id, is_active, day_of_month);

create table if not exists category_budgets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  month          date not null,
  label          text not null,
  planned_amount numeric(18,4) not null default 0,
  category_id    uuid references categories(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_category_budgets_user_month
  on category_budgets(user_id, month);
