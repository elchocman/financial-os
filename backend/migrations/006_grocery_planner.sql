-- Grocery planner
-- Adds monthly grocery budgets and shopping list items

create table if not exists grocery_plans (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  month          date not null,
  store_name     text not null default 'Lider',
  budget_amount  numeric(18,4) not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index if not exists idx_grocery_plans_user_month
  on grocery_plans(user_id, month);

create table if not exists grocery_items (
  id                    uuid primary key default gen_random_uuid(),
  grocery_plan_id       uuid not null references grocery_plans(id) on delete cascade,
  user_id               uuid not null references users(id) on delete cascade,
  name                  text not null,
  quantity              numeric(18,4) not null default 1,
  unit                  text not null default 'unit',
  estimated_unit_price  numeric(18,4) not null default 0,
  notes                 text,
  is_checked            boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_grocery_items_plan
  on grocery_items(grocery_plan_id, created_at);
