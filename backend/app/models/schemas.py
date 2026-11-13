from pydantic import BaseModel, UUID4, Field
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


# ─────────────────────────────────────────────
# Net Worth / Dashboard
# ─────────────────────────────────────────────

class NetWorthSnapshot(BaseModel):
    date: date
    net_worth: Decimal
    total_assets: Decimal
    total_liabilities: Decimal
    fintual: Optional[Decimal] = None
    racional: Optional[Decimal] = None
    binance: Optional[Decimal] = None
    cash: Optional[Decimal] = None
    other: Optional[Decimal] = None
    currency: str = "CLP"


class DashboardKPIs(BaseModel):
    net_worth: Decimal
    net_worth_change_30d: Optional[Decimal] = None
    net_worth_change_pct_30d: Optional[float] = None
    total_assets: Decimal
    total_liabilities: Decimal
    # Cashflow KPIs (from last 30 days of transactions)
    monthly_income: Optional[Decimal] = None
    monthly_expenses: Optional[Decimal] = None
    savings_rate: Optional[float] = None
    emergency_fund_months: Optional[float] = None
    currency: str = "CLP"
    last_updated: datetime


# ─────────────────────────────────────────────
# Portfolio / Holdings
# ─────────────────────────────────────────────

class Holding(BaseModel):
    name: str
    ticker: Optional[str] = None
    platform: str
    asset_class: str          # 'crypto' | 'equity' | 'etf' | 'fund'
    quantity: Decimal
    current_price: Optional[Decimal] = None
    current_value: Decimal
    currency: str
    current_value_clp: Decimal


class PlatformSummary(BaseModel):
    platform: str
    total_clp: Decimal
    percentage: float
    holdings: list[Holding]


class PortfolioSummary(BaseModel):
    total_clp: Decimal
    currency: str = "CLP"
    platforms: list[PlatformSummary]
    last_updated: datetime


class AllocationItem(BaseModel):
    label: str
    value_clp: Decimal
    percentage: float
    color: Optional[str] = None


class PortfolioAllocation(BaseModel):
    total_clp: Decimal
    by_platform: list[AllocationItem]
    by_asset_class: list[AllocationItem]


# ─────────────────────────────────────────────
# Categories
# ─────────────────────────────────────────────

class Category(BaseModel):
    id: str
    name: str
    type: str   # 'income' | 'expense'
    icon: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[str] = None


class AccountCreate(BaseModel):
    name: str
    type: str
    platform: Optional[str] = None
    currency: str = "CLP"
    is_active: bool = True


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    platform: Optional[str] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None


class AccountRead(BaseModel):
    id: str
    name: str
    type: str
    platform: Optional[str] = None
    currency: str = "CLP"
    is_active: bool = True
    created_at: datetime


# ─────────────────────────────────────────────
# Transactions
# ─────────────────────────────────────────────

class TransactionCreate(BaseModel):
    date: date
    amount: Decimal
    currency: str = "CLP"
    type: str                 # 'income' | 'expense' | 'transfer'
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    description: Optional[str] = None
    is_recurring: bool = False


class TransactionUpdate(BaseModel):
    date: Optional[date] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    type: Optional[str] = None
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    description: Optional[str] = None
    is_recurring: Optional[bool] = None


class Transaction(TransactionCreate):
    id: str
    account_name: Optional[str] = None
    amount_base_currency: Optional[Decimal] = None
    created_at: datetime


# ─────────────────────────────────────────────
# Cashflow
# ─────────────────────────────────────────────

class CashflowSummary(BaseModel):
    total_income: Decimal
    total_expenses: Decimal
    net: Decimal
    savings_rate: float
    currency: str = "CLP"
    period_months: int
    from_date: str
    to_date: str


class MonthlySummary(BaseModel):
    month: str          # "2025-03"
    income: Decimal
    expenses: Decimal
    net: Decimal
    savings_rate: float


class CategorySummary(BaseModel):
    category_id: str
    name: str
    color: str
    icon: str
    total: Decimal
    percentage: float
    transaction_count: int


# Monthly Planner

class RecurringExpenseInput(BaseModel):
    id: Optional[str] = None
    name: str
    amount: Decimal
    category_id: Optional[str] = None
    day_of_month: int = 1
    currency: str = "CLP"
    is_active: bool = True


class RecurringExpense(RecurringExpenseInput):
    id: str
    created_at: datetime
    updated_at: datetime


class CategoryBudgetInput(BaseModel):
    id: Optional[str] = None
    label: str
    planned_amount: Decimal
    category_id: Optional[str] = None


class CategoryBudget(CategoryBudgetInput):
    id: str
    month: str
    actual_amount: Decimal = Decimal("0")
    remaining_amount: Decimal = Decimal("0")
    created_at: datetime
    updated_at: datetime


class MonthlyPlannerSummary(BaseModel):
    planned_income: Decimal = Decimal("0")
    savings_target: Decimal = Decimal("0")
    recurring_total: Decimal = Decimal("0")
    budgeted_variable_total: Decimal = Decimal("0")
    available_to_budget: Decimal = Decimal("0")
    remaining_to_budget: Decimal = Decimal("0")
    actual_income: Decimal = Decimal("0")
    actual_expenses: Decimal = Decimal("0")
    actual_free_cash: Decimal = Decimal("0")


class MonthlyPlanner(BaseModel):
    month: str
    planned_income: Decimal = Decimal("0")
    savings_target: Decimal = Decimal("0")
    notes: Optional[str] = None
    recurring_expenses: list[RecurringExpense] = Field(default_factory=list)
    category_budgets: list[CategoryBudget] = Field(default_factory=list)
    summary: MonthlyPlannerSummary


class MonthlyPlannerUpdate(BaseModel):
    planned_income: Decimal = Decimal("0")
    savings_target: Decimal = Decimal("0")
    notes: Optional[str] = None
    recurring_expenses: list[RecurringExpenseInput] = Field(default_factory=list)
    category_budgets: list[CategoryBudgetInput] = Field(default_factory=list)


class GroceryItemInput(BaseModel):
    id: Optional[str] = None
    name: str
    quantity: Decimal = Decimal("1")
    unit: str = "unit"
    estimated_unit_price: Decimal = Decimal("0")
    notes: Optional[str] = None
    is_checked: bool = False


class GroceryItem(GroceryItemInput):
    id: str
    estimated_total_price: Decimal = Decimal("0")
    created_at: datetime
    updated_at: datetime


class GroceryPlan(BaseModel):
    month: str
    store_name: str = "Lider"
    budget_amount: Decimal = Decimal("0")
    estimated_total: Decimal = Decimal("0")
    remaining_budget: Decimal = Decimal("0")
    items: list[GroceryItem] = Field(default_factory=list)


class GroceryPlanUpdate(BaseModel):
    store_name: str = "Lider"
    budget_amount: Decimal = Decimal("0")
    items: list[GroceryItemInput] = Field(default_factory=list)


class GrocerySearchResult(BaseModel):
    name: str
    store_name: str
    price: Decimal
    currency: str = "CLP"
    query: str
    source_url: Optional[str] = None
    price_text: Optional[str] = None
    image_url: Optional[str] = None


# ─────────────────────────────────────────────
# Balance Sheet
# ─────────────────────────────────────────────

class AssetCreate(BaseModel):
    name: str
    type: str           # 'cash' | 'investment' | 'crypto' | 'real_estate' | 'other'
    subtype: Optional[str] = None
    is_liability: bool = False
    current_value: Decimal
    currency: str = "CLP"


class AssetItem(AssetCreate):
    id: str
    updated_at: datetime


class BalanceSheetBucket(BaseModel):
    type: str
    label: str
    total: Decimal
    percentage: float
    color: str
    items: list[AssetItem]


class BalanceSheet(BaseModel):
    total_assets: Decimal
    total_liabilities: Decimal
    net_worth: Decimal
    assets: list[BalanceSheetBucket]
    liabilities: list[AssetItem]
    currency: str = "CLP"
    last_updated: datetime


# ─────────────────────────────────────────────
# Goals
# ─────────────────────────────────────────────

class GoalCreate(BaseModel):
    name: str
    target_amount: Decimal
    current_amount: Decimal = Decimal("0")
    target_date: Optional[date] = None
    currency: str = "CLP"


class Goal(GoalCreate):
    id: str
    monthly_savings_needed: Optional[Decimal] = None
    progress_pct: float
    status: str
    created_at: datetime


# ─────────────────────────────────────────────
# FX
# ─────────────────────────────────────────────

class FXRate(BaseModel):
    from_currency: str
    to_currency: str
    rate: Decimal
    fetched_at: datetime


# ─────────────────────────────────────────────
# Authentication / Users
# ─────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class UserRead(BaseModel):
    id: str
    email: str
    name: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[str] = None


# ─────────────────────────────────────────────
# PnL / Performance
# ─────────────────────────────────────────────

class HoldingPnL(BaseModel):
    name: str
    ticker: Optional[str] = None
    platform: str
    asset_class: str
    quantity: Decimal
    currency: str
    current_value_clp: Decimal
    cost_basis_clp: Optional[Decimal] = None   # None = avg_cost not set
    pnl_clp: Optional[Decimal] = None           # None = not calculable
    pnl_pct: Optional[float] = None             # None = not calculable


class PortfolioPerformance(BaseModel):
    total_value_clp: Decimal
    total_pnl_clp: Optional[Decimal] = None
    total_pnl_pct: Optional[float] = None
    holdings: list[HoldingPnL]
    currency: str = "CLP"
    last_updated: datetime


class PerformanceDataPoint(BaseModel):
    date: date
    value_clp: Decimal
    daily_change_clp: Decimal
    daily_change_pct: float


# ─────────────────────────────────────────────
# Prices
# ─────────────────────────────────────────────

class PriceRecord(BaseModel):
    ticker: str
    price: Decimal
    currency: str
    source: str
    fetched_at: datetime


class PriceHistory(BaseModel):
    ticker: str
    data: list[PriceRecord]


# ─────────────────────────────────────────────
# Generic responses
# ─────────────────────────────────────────────

class SyncResult(BaseModel):
    success: bool
    message: str
    timestamp: datetime


class WorkerRunResult(BaseModel):
    worker: str
    success: bool
    detail: str
    timestamp: datetime


# ─────────────────────────────────────────────
# Manual Holdings (Racional / custom)
# ─────────────────────────────────────────────

class ManualHoldingCreate(BaseModel):
    name: str
    ticker: Optional[str] = None
    platform: str = "racional"
    asset_class: str = "equity"
    quantity: Decimal
    avg_cost: Optional[Decimal] = None
    currency: str = "USD"


class ManualHoldingUpdate(BaseModel):
    name: Optional[str] = None
    ticker: Optional[str] = None
    asset_class: Optional[str] = None
    quantity: Optional[Decimal] = None
    avg_cost: Optional[Decimal] = None
    currency: Optional[str] = None


class ManualHoldingRead(BaseModel):
    id: str
    name: str
    ticker: Optional[str] = None
    platform: str
    asset_class: str
    quantity: Decimal
    avg_cost: Optional[Decimal] = None
    currency: str
    updated_at: datetime


# ─────────────────────────────────────────────
# Integration status
# ─────────────────────────────────────────────

class IntegrationStatus(BaseModel):
    configured: bool
    mode: str  # 'api' | 'manual' | 'db' | 'not_set'
    detail: Optional[str] = None


class IntegrationsStatus(BaseModel):
    fintual: IntegrationStatus
    racional: IntegrationStatus
    binance: IntegrationStatus
