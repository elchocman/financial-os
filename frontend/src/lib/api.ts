import type {
  AssetItem,
  Account,
  BalanceSheet,
  CashflowSummary,
  Category,
  CategoryBudget,
  CategorySummary,
  DashboardKPIs,
  Goal,
  GroceryItem,
  GroceryPlan,
  GrocerySearchResult,
  IntegrationsStatus,
  ManualHolding,
  MonthlyPlanner,
  MonthlySummary,
  NetWorthSnapshot,
  PerformanceDataPoint,
  PortfolioAllocation,
  PortfolioPerformance,
  PortfolioSummary,
  PriceRecord,
  RecurringExpense,
  SyncResult,
  Transaction,
} from '@/types'
import { clearToken, getToken } from '@/lib/auth'

interface PriceHistory {
  ticker: string
  data: PriceRecord[]
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  }

  if (token) {
    ;(headers as Record<string, string>).Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const raw = await res.text()
    let message = `API ${res.status}`
    try {
      const parsed = JSON.parse(raw) as { detail?: string }
      if (parsed.detail) {
        message = parsed.detail
      } else if (raw) {
        message = `${message}: ${raw}`
      }
    } catch {
      if (raw) {
        message = `${message}: ${raw}`
      }
    }

    if (res.status === 401 && typeof window !== 'undefined') {
      clearToken()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
      throw new Error('Session expired. Please sign in again.')
    }

    throw new Error(message)
  }

  return res.json()
}

export const getDashboard = () =>
  apiFetch<DashboardKPIs>('/dashboard/')

export const getNetWorthChart = (days = 90) =>
  apiFetch<NetWorthSnapshot[]>(`/dashboard/chart?days=${days}`)

export const getPortfolio = () =>
  apiFetch<PortfolioSummary>('/portfolio/')

export const getPortfolioAllocation = () =>
  apiFetch<PortfolioAllocation>('/portfolio/allocation')

export const getPortfolioPerformance = () =>
  apiFetch<PortfolioPerformance>('/portfolio/performance')

export const getPerformanceChart = (days = 90) =>
  apiFetch<PerformanceDataPoint[]>(`/portfolio/performance/chart?days=${days}`)

export const getTickerPriceHistory = (ticker: string, days = 30) =>
  apiFetch<PriceHistory>(`/portfolio/prices/${ticker}?days=${days}`)

export const syncPortfolio = () =>
  apiFetch<SyncResult>('/portfolio/sync', { method: 'POST' })

export const getTransactions = (params?: { type?: string; limit?: number }) => {
  const qs = new URLSearchParams()
  if (params?.type) qs.set('type', params.type)
  if (params?.limit) qs.set('limit', String(params.limit))
  return apiFetch<Transaction[]>(`/transactions/?${qs}`)
}

export const getAccounts = () =>
  apiFetch<Account[]>('/accounts/')

export const createAccount = (body: Omit<Account, 'id' | 'created_at'>) =>
  apiFetch<Account>('/accounts/', {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const updateAccount = (id: string, body: Partial<Omit<Account, 'id' | 'created_at'>>) =>
  apiFetch<Account>(`/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })

export const deleteAccount = (id: string) =>
  apiFetch<void>(`/accounts/${id}`, { method: 'DELETE' })

export const createTransaction = (body: Omit<Transaction, 'id' | 'created_at'>) =>
  apiFetch<Transaction>('/transactions/', {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const deleteTransaction = (id: string) =>
  apiFetch<void>(`/transactions/${id}`, { method: 'DELETE' })

export const getGoals = () =>
  apiFetch<Goal[]>('/goals/')

export const createGoal = (body: Omit<Goal, 'id' | 'progress_pct' | 'status' | 'created_at'>) =>
  apiFetch<Goal>('/goals/', { method: 'POST', body: JSON.stringify(body) })

export const updateGoal = (id: string, body: Partial<Goal>) =>
  apiFetch<Goal>(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(body) })

export const deleteGoal = (id: string) =>
  apiFetch<void>(`/goals/${id}`, { method: 'DELETE' })

export const getCashflowSummary = (months = 1) =>
  apiFetch<CashflowSummary>(`/transactions/summary?months=${months}`)

export const getMonthlySummaries = (months = 12) =>
  apiFetch<MonthlySummary[]>(`/transactions/monthly?months=${months}`)

export const getExpenseByCategory = (months = 1) =>
  apiFetch<CategorySummary[]>(`/transactions/by-category?months=${months}`)

export const getCategories = (type?: string) =>
  apiFetch<Category[]>(`/transactions/categories${type ? `?type=${type}` : ''}`)

export const updateTransaction = (id: string, body: Partial<Transaction>) =>
  apiFetch<Transaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(body) })

export const getBalanceSheet = () =>
  apiFetch<BalanceSheet>('/balance-sheet/')

export const getAssets = () =>
  apiFetch<AssetItem[]>('/balance-sheet/assets')

export const createAsset = (body: Omit<AssetItem, 'id' | 'updated_at'>) =>
  apiFetch<AssetItem>('/balance-sheet/assets', { method: 'POST', body: JSON.stringify(body) })

export const updateAsset = (id: string, body: Omit<AssetItem, 'id' | 'updated_at'>) =>
  apiFetch<AssetItem>(`/balance-sheet/assets/${id}`, { method: 'PUT', body: JSON.stringify(body) })

export const deleteAsset = (id: string) =>
  apiFetch<void>(`/balance-sheet/assets/${id}`, { method: 'DELETE' })

export const getMonthlyPlanner = (month?: string) =>
  apiFetch<MonthlyPlanner>(`/planner/monthly${month ? `?month=${month}` : ''}`)

export const saveMonthlyPlanner = (
  month: string,
  body: {
    planned_income: number
    savings_target: number
    notes?: string
    recurring_expenses: RecurringExpense[]
    category_budgets: CategoryBudget[]
  },
) =>
  apiFetch<MonthlyPlanner>(`/planner/monthly?month=${month}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })

export const getGroceryPlanner = (month?: string) =>
  apiFetch<GroceryPlan>(`/planner/grocery${month ? `?month=${month}` : ''}`)

export const saveGroceryPlanner = (
  month: string,
  body: {
    store_name: string
    budget_amount: number
    items: GroceryItem[]
  },
) =>
  apiFetch<GroceryPlan>(`/planner/grocery?month=${month}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })

export const searchGroceryProducts = (store: string, query: string, limit = 5) =>
  apiFetch<GrocerySearchResult[]>(`/planner/grocery/search?store=${encodeURIComponent(store)}&query=${encodeURIComponent(query)}&limit=${limit}`)

export const updateGoalExtended = (id: string, body: Omit<Goal, 'id' | 'monthly_savings_needed' | 'progress_pct' | 'status' | 'created_at'>) =>
  apiFetch<Goal>(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(body) })

// ── Manual Holdings (Racional) ────────────────────────────────────────────────

export const getIntegrationsStatus = () =>
  apiFetch<IntegrationsStatus>('/portfolio/integrations/status')

export const getManualHoldings = (platform = 'racional') =>
  apiFetch<ManualHolding[]>(`/portfolio/holdings/?platform=${platform}`)

export const createManualHolding = (body: Omit<ManualHolding, 'id' | 'updated_at'>) =>
  apiFetch<ManualHolding>('/portfolio/holdings/', {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const updateManualHolding = (id: string, body: Partial<Omit<ManualHolding, 'id' | 'updated_at'>>) =>
  apiFetch<ManualHolding>(`/portfolio/holdings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })

export const deleteManualHolding = (id: string) =>
  apiFetch<void>(`/portfolio/holdings/${id}`, { method: 'DELETE' })

// ─────────────────────────────────────────────────────────────────────────────

export const register = (email: string, password: string, name?: string) =>
  apiFetch<{ id: string; email: string; name?: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  })

export const login = (email: string, password: string) =>
  apiFetch<{ access_token: string; token_type: string }>('/auth/token', {
    method: 'POST',
    body: new URLSearchParams({ username: email, password }).toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
