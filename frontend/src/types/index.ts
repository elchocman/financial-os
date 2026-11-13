// ─────────────────────────────────────────────
// Financial OS — Shared TypeScript Types
// ─────────────────────────────────────────────

export interface DashboardKPIs {
  net_worth: number
  net_worth_change_30d: number | null
  net_worth_change_pct_30d: number | null
  total_assets: number
  total_liabilities: number
  monthly_income?: number | null
  monthly_expenses?: number | null
  savings_rate?: number | null
  emergency_fund_months?: number | null
  currency: string
  last_updated: string
}

export interface Account {
  id: string
  name: string
  type: string
  platform?: string
  currency: string
  is_active: boolean
  created_at: string
}

export interface NetWorthSnapshot {
  date: string
  net_worth: number
  total_assets: number
  total_liabilities: number
  fintual?: number
  racional?: number
  binance?: number
  cash?: number
  other?: number
  currency: string
}

export interface Holding {
  name: string
  ticker?: string
  platform: string
  asset_class: string
  quantity: number
  current_price?: number
  current_value: number
  currency: string
  current_value_clp: number
}

export interface PlatformSummary {
  platform: string
  total_clp: number
  percentage: number
  holdings: Holding[]
}

export interface PortfolioSummary {
  total_clp: number
  currency: string
  platforms: PlatformSummary[]
  last_updated: string
}

export interface AllocationItem {
  label: string
  value_clp: number
  percentage: number
  color?: string
}

export interface PortfolioAllocation {
  total_clp: number
  by_platform: AllocationItem[]
  by_asset_class: AllocationItem[]
}

export interface Transaction {
  id: string
  date: string
  amount: number
  currency: string
  type: 'income' | 'expense' | 'transfer'
  account_id?: string
  account_name?: string
  category_id?: string
  description?: string
  is_recurring: boolean
  amount_base_currency?: number
  created_at: string
}

export interface Goal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  target_date?: string
  monthly_savings_needed?: number
  currency: string
  progress_pct: number
  status: 'active' | 'achieved' | 'paused'
  created_at: string
}

export interface HoldingPnL {
  name: string
  ticker?: string
  platform: string
  asset_class: string
  quantity: number
  currency: string
  current_value_clp: number
  cost_basis_clp?: number
  pnl_clp?: number
  pnl_pct?: number
}

export interface PortfolioPerformance {
  total_value_clp: number
  total_pnl_clp?: number
  total_pnl_pct?: number
  holdings: HoldingPnL[]
  currency: string
  last_updated: string
}

export interface PerformanceDataPoint {
  date: string
  value_clp: number
  daily_change_clp: number
  daily_change_pct: number
}

export interface PriceRecord {
  ticker: string
  price: number
  currency: string
  source: string
  fetched_at: string
}


export interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  icon?: string
  color?: string
  parent_id?: string
}

export interface CashflowSummary {
  total_income: number
  total_expenses: number
  net: number
  savings_rate: number
  currency: string
  period_months: number
  from_date: string
  to_date: string
}

export interface MonthlySummary {
  month: string
  income: number
  expenses: number
  net: number
  savings_rate: number
}

export interface CategorySummary {
  category_id: string
  name: string
  color: string
  icon: string
  total: number
  percentage: number
  transaction_count: number
}

export interface AssetItem {
  id: string
  name: string
  type: string
  subtype?: string
  is_liability: boolean
  current_value: number
  currency: string
  updated_at: string
}

export interface BalanceSheetBucket {
  type: string
  label: string
  total: number
  percentage: number
  color: string
  items: AssetItem[]
}

export interface BalanceSheet {
  total_assets: number
  total_liabilities: number
  net_worth: number
  assets: BalanceSheetBucket[]
  liabilities: AssetItem[]
  currency: string
  last_updated: string
}

export interface RecurringExpense {
  id?: string
  name: string
  amount: number
  category_id?: string
  day_of_month: number
  currency: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface CategoryBudget {
  id?: string
  month?: string
  label: string
  planned_amount: number
  category_id?: string
  actual_amount?: number
  remaining_amount?: number
  created_at?: string
  updated_at?: string
}

export interface MonthlyPlannerSummary {
  planned_income: number
  savings_target: number
  recurring_total: number
  budgeted_variable_total: number
  available_to_budget: number
  remaining_to_budget: number
  actual_income: number
  actual_expenses: number
  actual_free_cash: number
}

export interface MonthlyPlanner {
  month: string
  planned_income: number
  savings_target: number
  notes?: string
  recurring_expenses: RecurringExpense[]
  category_budgets: CategoryBudget[]
  summary: MonthlyPlannerSummary
}

export interface GroceryItem {
  id?: string
  name: string
  quantity: number
  unit: string
  estimated_unit_price: number
  estimated_total_price?: number
  notes?: string
  is_checked: boolean
  created_at?: string
  updated_at?: string
}

export interface GroceryPlan {
  month: string
  store_name: string
  budget_amount: number
  estimated_total: number
  remaining_budget: number
  items: GroceryItem[]
}

export interface GrocerySearchResult {
  name: string
  store_name: string
  price: number
  currency: string
  query: string
  source_url?: string
  price_text?: string
  image_url?: string
}

export interface SyncResult {
  success: boolean
  message: string
  timestamp: string
}

export interface ManualHolding {
  id: string
  name: string
  ticker?: string
  platform: string
  asset_class: string
  quantity: number
  avg_cost?: number
  currency: string
  updated_at: string
}

export interface IntegrationStatus {
  configured: boolean
  mode: 'api' | 'manual' | 'db' | 'not_set'
  detail?: string
}

export interface IntegrationsStatus {
  fintual: IntegrationStatus
  racional: IntegrationStatus
  binance: IntegrationStatus
}
