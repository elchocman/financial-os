'use client'

import { useEffect, useState } from 'react'
import Card, { CardHeader } from '@/components/ui/Card'
import {
  getCategories,
  getGroceryPlanner,
  getMonthlyPlanner,
  saveGroceryPlanner,
  saveMonthlyPlanner,
  searchGroceryProducts,
} from '@/lib/api'
import { formatCompact } from '@/lib/formatters'
import type {
  Category,
  CategoryBudget,
  GroceryItem,
  GroceryPlan,
  GrocerySearchResult,
  MonthlyPlanner,
  RecurringExpense,
} from '@/types'

function currentMonthValue() {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}`
}

function newRecurringExpense(): RecurringExpense {
  return {
    name: '',
    amount: 0,
    category_id: undefined,
    day_of_month: 1,
    currency: 'CLP',
    is_active: true,
  }
}

function newCategoryBudget(): CategoryBudget {
  return {
    label: '',
    planned_amount: 0,
    category_id: undefined,
  }
}

function newGroceryItem(): GroceryItem {
  return {
    name: '',
    quantity: 1,
    unit: 'unit',
    estimated_unit_price: 0,
    notes: '',
    is_checked: false,
  }
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.9)',
  border: '1px solid var(--border-base)',
  borderRadius: 'var(--r-sm)',
  padding: '10px 12px',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontFamily: 'var(--font-body)',
  outline: 'none',
} as const

const labelStyle = {
  display: 'block',
  fontSize: 10,
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-secondary)',
  letterSpacing: '0.08em',
  marginBottom: 6,
  textTransform: 'uppercase' as const,
} as const

const pillButtonStyle = {
  padding: '8px 12px',
  borderRadius: 999,
  border: '1px solid var(--border-subtle)',
  background: 'rgba(255,255,255,0.7)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  cursor: 'pointer',
} as const

export default function HouseholdPage() {
  const [month, setMonth] = useState(currentMonthValue())
  const [planner, setPlanner] = useState<MonthlyPlanner | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [grocery, setGrocery] = useState<GroceryPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingGrocery, setSavingGrocery] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [grocerySearchResults, setGrocerySearchResults] = useState<Record<number, GrocerySearchResult[]>>({})
  const [grocerySearchLoading, setGrocerySearchLoading] = useState<Record<number, boolean>>({})
  const [grocerySearchErrors, setGrocerySearchErrors] = useState<Record<number, string | null>>({})

  useEffect(() => {
    setLoading(true)
    setError(null)
    setGrocerySearchResults({})
    setGrocerySearchLoading({})
    setGrocerySearchErrors({})

    Promise.all([
      getMonthlyPlanner(month),
      getGroceryPlanner(month),
      getCategories('expense'),
    ])
      .then(([plannerData, groceryData, categoryData]) => {
        setPlanner(plannerData)
        setGrocery(groceryData)
        setCategories(categoryData)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [month])

  function setPlannerField<K extends 'planned_income' | 'savings_target' | 'notes'>(key: K, value: MonthlyPlanner[K]) {
    setPlanner((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function updateRecurring(index: number, patch: Partial<RecurringExpense>) {
    setPlanner((prev) => {
      if (!prev) return prev
      const next = [...prev.recurring_expenses]
      next[index] = { ...next[index], ...patch }
      return { ...prev, recurring_expenses: next }
    })
  }

  function removeRecurring(index: number) {
    setPlanner((prev) => {
      if (!prev) return prev
      return { ...prev, recurring_expenses: prev.recurring_expenses.filter((_, i) => i !== index) }
    })
  }

  function updateBudget(index: number, patch: Partial<CategoryBudget>) {
    setPlanner((prev) => {
      if (!prev) return prev
      const next = [...prev.category_budgets]
      next[index] = { ...next[index], ...patch }
      return { ...prev, category_budgets: next }
    })
  }

  function removeBudget(index: number) {
    setPlanner((prev) => {
      if (!prev) return prev
      return { ...prev, category_budgets: prev.category_budgets.filter((_, i) => i !== index) }
    })
  }

  function updateGroceryItem(index: number, patch: Partial<GroceryItem>) {
    setGrocery((prev) => {
      if (!prev) return prev
      const next = [...prev.items]
      next[index] = { ...next[index], ...patch }
      return { ...prev, items: next }
    })
  }

  function removeGroceryItem(index: number) {
    setGrocery((prev) => {
      if (!prev) return prev
      return { ...prev, items: prev.items.filter((_, i) => i !== index) }
    })
    setGrocerySearchResults((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
    setGrocerySearchLoading((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
    setGrocerySearchErrors((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  async function handleSave() {
    if (!planner) return
    setSaving(true)
    setSaveMessage(null)
    setError(null)

    try {
      const saved = await saveMonthlyPlanner(month, {
        planned_income: Number(planner.planned_income || 0),
        savings_target: Number(planner.savings_target || 0),
        notes: planner.notes,
        recurring_expenses: planner.recurring_expenses
          .map((item) => ({
            id: item.id,
            name: item.name,
            amount: Number(item.amount || 0),
            category_id: item.category_id,
            day_of_month: Number(item.day_of_month || 1),
            currency: item.currency || 'CLP',
            is_active: item.is_active,
          }))
          .filter((item) => item.name.trim().length > 0),
        category_budgets: planner.category_budgets
          .map((item) => ({
            id: item.id,
            label: item.label,
            planned_amount: Number(item.planned_amount || 0),
            category_id: item.category_id,
          }))
          .filter((item) => item.label.trim().length > 0),
      })
      setPlanner(saved)
      setSaveMessage('Planner saved')
      setTimeout(() => setSaveMessage(null), 2500)
    } catch (err: any) {
      setError(err.message ?? 'Could not save planner')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveGrocery() {
    if (!grocery) return
    setSavingGrocery(true)
    setSaveMessage(null)
    setError(null)

    try {
      const saved = await saveGroceryPlanner(month, {
        store_name: grocery.store_name,
        budget_amount: Number(grocery.budget_amount || 0),
        items: grocery.items
          .map((item) => ({
            id: item.id,
            name: item.name,
            quantity: Number(item.quantity || 0),
            unit: item.unit || 'unit',
            estimated_unit_price: Number(item.estimated_unit_price || 0),
            notes: item.notes,
            is_checked: item.is_checked,
          }))
          .filter((item) => item.name.trim().length > 0),
      })
      setGrocery(saved)
      setSaveMessage('Grocery plan saved')
      setTimeout(() => setSaveMessage(null), 2500)
    } catch (err: any) {
      setError(err.message ?? 'Could not save grocery plan')
    } finally {
      setSavingGrocery(false)
    }
  }

  async function handleAutoPrice(index: number) {
    if (!grocery) return

    const item = grocery.items[index]
    const query = item?.name?.trim()
    if (!query) {
      setGrocerySearchErrors((prev) => ({ ...prev, [index]: 'Write a product name first.' }))
      return
    }

    setGrocerySearchLoading((prev) => ({ ...prev, [index]: true }))
    setGrocerySearchErrors((prev) => ({ ...prev, [index]: null }))

    try {
      const results = await searchGroceryProducts(grocery.store_name, query, 5)
      setGrocerySearchResults((prev) => ({ ...prev, [index]: results }))
      if (results.length === 0) {
        setGrocerySearchErrors((prev) => ({ ...prev, [index]: 'No matches found for that product.' }))
      }
    } catch (err: any) {
      setGrocerySearchErrors((prev) => ({ ...prev, [index]: err.message ?? 'Could not fetch prices.' }))
    } finally {
      setGrocerySearchLoading((prev) => ({ ...prev, [index]: false }))
    }
  }

  function applySearchResult(index: number, result: GrocerySearchResult) {
    updateGroceryItem(index, {
      name: result.name,
      estimated_unit_price: Number(result.price || 0),
      notes: result.source_url ? `Auto price from ${result.store_name}: ${result.source_url}` : undefined,
    })
    setGrocerySearchResults((prev) => ({ ...prev, [index]: [] }))
    setGrocerySearchErrors((prev) => ({ ...prev, [index]: null }))
  }

  if (loading || !planner || !grocery) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="skeleton" style={{ height: 54 }} />
        <div className="skeleton" style={{ height: 180 }} />
        <div className="skeleton" style={{ height: 260 }} />
      </div>
    )
  }

  const summary = planner.summary

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 6 }}>
              Monthly Planner
            </div>
            <div style={{ color: 'var(--text-secondary)', maxWidth: 680 }}>
              Plan your month with one simple flow: expected income, fixed obligations, category budgets, and actual spend.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={inputStyle} />
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 16px',
                borderRadius: 999,
                border: '1px solid rgba(31,157,114,0.2)',
                background: 'var(--accent)',
                color: '#f6fff9',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'SAVING' : 'SAVE PLAN'}
            </button>
          </div>
        </div>

        {(error || saveMessage) && (
          <div style={{ marginTop: 14, fontSize: 12, fontFamily: 'var(--font-mono)', color: error ? 'var(--loss)' : 'var(--gain)' }}>
            {error ?? saveMessage}
          </div>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {[
          { label: 'Planned income', value: summary.planned_income, tone: 'var(--gain)' },
          { label: 'Recurring fixed', value: summary.recurring_total, tone: 'var(--loss)' },
          { label: 'Variable budgets', value: summary.budgeted_variable_total, tone: 'var(--text-primary)' },
          { label: 'Free to assign', value: summary.remaining_to_budget, tone: summary.remaining_to_budget >= 0 ? 'var(--accent-strong)' : 'var(--loss)' },
          { label: 'Actual cash left', value: summary.actual_free_cash, tone: summary.actual_free_cash >= 0 ? 'var(--gain)' : 'var(--loss)' },
        ].map((item, index) => (
          <Card key={item.label} delay={index * 40} style={{ padding: '18px' }}>
            <div style={{ ...labelStyle, marginBottom: 10 }}>{item.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.04em', color: item.tone }}>
              {formatCompact(item.value)}
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, alignItems: 'start' }}>
        <Card>
          <CardHeader label="Monthly Base" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Planned monthly income</label>
              <input
                type="number"
                value={planner.planned_income}
                onChange={(e) => setPlannerField('planned_income', Number(e.target.value || 0) as any)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Savings target</label>
              <input
                type="number"
                value={planner.savings_target}
                onChange={(e) => setPlannerField('savings_target', Number(e.target.value || 0) as any)}
                style={inputStyle}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={planner.notes ?? ''}
                onChange={(e) => setPlannerField('notes', e.target.value as any)}
                style={{ ...inputStyle, minHeight: 88, resize: 'vertical' as const }}
                placeholder="Example: this month includes school costs and travel."
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader label="How To Use It" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text-secondary)' }}>
            <div>1. Enter your expected monthly income and the savings target you want to protect.</div>
            <div>2. Add fixed recurring expenses like rent, subscriptions, school, insurance, or debt payments.</div>
            <div>3. Add category budgets for supermarket, transport, eating out, and anything else you want to control.</div>
            <div>4. Record real transactions in Cashflow and this page will compare plan versus reality for the selected month.</div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          label="Recurring Expenses"
          action={
            <button
              onClick={() => setPlanner({ ...planner, recurring_expenses: [...planner.recurring_expenses, newRecurringExpense()] })}
              style={pillButtonStyle}
            >
              + ADD FIXED EXPENSE
            </button>
          }
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {planner.recurring_expenses.length === 0 && (
            <div style={{ color: 'var(--text-secondary)' }}>No recurring expenses yet. Add rent, subscriptions, services, debt payments, or insurance.</div>
          )}

          {planner.recurring_expenses.map((item, index) => (
            <div key={item.id ?? `new-recurring-${index}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.3fr 0.8fr auto', gap: 10, alignItems: 'end' }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input value={item.name} onChange={(e) => updateRecurring(index, { name: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Amount</label>
                <input type="number" value={item.amount} onChange={(e) => updateRecurring(index, { amount: Number(e.target.value || 0) })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Day</label>
                <input type="number" min={1} max={31} value={item.day_of_month} onChange={(e) => updateRecurring(index, { day_of_month: Number(e.target.value || 1) })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <select
                  value={item.category_id ?? ''}
                  onChange={(e) => updateRecurring(index, { category_id: e.target.value || undefined })}
                  style={inputStyle}
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Active</label>
                <button
                  onClick={() => updateRecurring(index, { is_active: !item.is_active })}
                  style={{
                    ...inputStyle,
                    cursor: 'pointer',
                    background: item.is_active ? 'var(--accent-dim)' : 'rgba(255,255,255,0.65)',
                    color: item.is_active ? 'var(--accent-strong)' : 'var(--text-secondary)',
                  }}
                >
                  {item.is_active ? 'YES' : 'NO'}
                </button>
              </div>
              <button
                onClick={() => removeRecurring(index)}
                style={{
                  height: 42,
                  padding: '0 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(212,91,77,0.16)',
                  background: 'rgba(212,91,77,0.08)',
                  color: 'var(--loss)',
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          label="Category Budgets"
          action={
            <button
              onClick={() => setPlanner({ ...planner, category_budgets: [...planner.category_budgets, newCategoryBudget()] })}
              style={pillButtonStyle}
            >
              + ADD BUDGET
            </button>
          }
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {planner.category_budgets.length === 0 && (
            <div style={{ color: 'var(--text-secondary)' }}>No variable budgets yet. Add supermarket, transport, eating out, pets, or any spending bucket you want to control.</div>
          )}

          {planner.category_budgets.map((item, index) => (
            <div key={item.id ?? `new-budget-${index}`} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.3fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
              <div>
                <label style={labelStyle}>Label</label>
                <input value={item.label} onChange={(e) => updateBudget(index, { label: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <select
                  value={item.category_id ?? ''}
                  onChange={(e) => {
                    const nextCategoryId = e.target.value || undefined
                    const category = categories.find((x) => x.id === nextCategoryId)
                    updateBudget(index, {
                      category_id: nextCategoryId,
                      label: category ? category.name : item.label,
                    })
                  }}
                  style={inputStyle}
                >
                  <option value="">Custom budget</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Planned</label>
                <input type="number" value={item.planned_amount} onChange={(e) => updateBudget(index, { planned_amount: Number(e.target.value || 0) })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Actual</label>
                <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                  {formatCompact(item.actual_amount ?? 0)}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Remaining</label>
                <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: (item.remaining_amount ?? 0) >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                  {formatCompact(item.remaining_amount ?? item.planned_amount)}
                </div>
              </div>
              <button
                onClick={() => removeBudget(index)}
                style={{
                  height: 42,
                  padding: '0 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(212,91,77,0.16)',
                  background: 'rgba(212,91,77,0.08)',
                  color: 'var(--loss)',
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader label="Grocery Budget + Shopping List" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Store</label>
            <input value={grocery.store_name} onChange={(e) => setGrocery({ ...grocery, store_name: e.target.value })} style={inputStyle} placeholder="Lider or Jumbo" />
          </div>
          <div>
            <label style={labelStyle}>Budget amount</label>
            <input type="number" value={grocery.budget_amount} onChange={(e) => setGrocery({ ...grocery, budget_amount: Number(e.target.value || 0) })} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Estimated total</label>
              <div style={{ ...inputStyle, display: 'flex', alignItems: 'center' }}>{formatCompact(grocery.estimated_total)}</div>
            </div>
            <div>
              <label style={labelStyle}>Remaining</label>
              <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: grocery.remaining_budget >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                {formatCompact(grocery.remaining_budget)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ color: 'var(--text-secondary)', maxWidth: 760 }}>
            Each product can use a manual price or fetch a live one from the selected store. Right now the automatic search supports <strong>Lider</strong> and <strong>Jumbo</strong>.
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setGrocery({ ...grocery, items: [...grocery.items, newGroceryItem()] })}
              style={pillButtonStyle}
            >
              + ADD ITEM
            </button>
            <button
              onClick={handleSaveGrocery}
              disabled={savingGrocery}
              style={{
                padding: '8px 12px',
                borderRadius: 999,
                border: '1px solid rgba(31,157,114,0.18)',
                background: 'var(--accent)',
                color: '#f6fff9',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                cursor: savingGrocery ? 'not-allowed' : 'pointer',
              }}
            >
              {savingGrocery ? 'SAVING' : 'SAVE GROCERY'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {grocery.items.length === 0 && (
            <div style={{ color: 'var(--text-secondary)' }}>
              Start your monthly grocery list here. You can enter prices manually, or search live prices from the selected store per product.
            </div>
          )}

          {grocery.items.map((item, index) => (
            <div
              key={item.id ?? `grocery-${index}`}
              style={{
                padding: 14,
                borderRadius: 18,
                background: 'rgba(255,255,255,0.62)',
                border: '1px solid rgba(255,255,255,0.72)',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.8fr 0.8fr 1fr 1fr 0.9fr auto auto', gap: 10, alignItems: 'end' }}>
                <div>
                  <label style={labelStyle}>Product</label>
                  <input value={item.name} onChange={(e) => updateGroceryItem(index, { name: e.target.value })} style={inputStyle} placeholder="Example: leche colun 1L" />
                </div>
                <div>
                  <label style={labelStyle}>Qty</label>
                  <input type="number" value={item.quantity} onChange={(e) => updateGroceryItem(index, { quantity: Number(e.target.value || 0) })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Unit</label>
                  <input value={item.unit} onChange={(e) => updateGroceryItem(index, { unit: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Unit price</label>
                  <input type="number" value={item.estimated_unit_price} onChange={(e) => updateGroceryItem(index, { estimated_unit_price: Number(e.target.value || 0) })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Line total</label>
                  <div style={{ ...inputStyle, display: 'flex', alignItems: 'center' }}>
                    {formatCompact((Number(item.quantity) || 0) * (Number(item.estimated_unit_price) || 0))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Done</label>
                  <button
                    onClick={() => updateGroceryItem(index, { is_checked: !item.is_checked })}
                    style={{
                      ...inputStyle,
                      cursor: 'pointer',
                      background: item.is_checked ? 'var(--accent-dim)' : 'rgba(255,255,255,0.65)',
                      color: item.is_checked ? 'var(--accent-strong)' : 'var(--text-secondary)',
                    }}
                  >
                    {item.is_checked ? 'YES' : 'NO'}
                  </button>
                </div>
                <button
                  onClick={() => handleAutoPrice(index)}
                  disabled={grocerySearchLoading[index]}
                  style={{
                    height: 42,
                    padding: '0 12px',
                    borderRadius: 999,
                    border: '1px solid rgba(31,157,114,0.18)',
                    background: 'rgba(31,157,114,0.1)',
                    color: 'var(--accent-strong)',
                    cursor: grocerySearchLoading[index] ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                  }}
                >
                  {grocerySearchLoading[index] ? 'SEARCHING' : 'AUTO PRICE'}
                </button>
                <button
                  onClick={() => removeGroceryItem(index)}
                  style={{
                    height: 42,
                    padding: '0 12px',
                    borderRadius: 999,
                    border: '1px solid rgba(212,91,77,0.16)',
                    background: 'rgba(212,91,77,0.08)',
                    color: 'var(--loss)',
                    cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                <div>
                  <label style={labelStyle}>Notes</label>
                  <input value={item.notes ?? ''} onChange={(e) => updateGroceryItem(index, { notes: e.target.value })} style={inputStyle} placeholder="Optional notes or preferred brand" />
                </div>
                <div style={{ display: 'flex', alignItems: 'end', color: 'var(--text-secondary)', fontSize: 12 }}>
                  If the automatic result is not right, you can overwrite the price manually.
                </div>
              </div>

              {grocerySearchErrors[index] && (
                <div style={{ marginTop: 10, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--loss)' }}>
                  {grocerySearchErrors[index]}
                </div>
              )}

              {(grocerySearchResults[index] ?? []).length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(grocerySearchResults[index] ?? []).map((result, resultIndex) => (
                    <div
                      key={`${result.name}-${resultIndex}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '84px 1.4fr 0.7fr auto',
                        gap: 10,
                        alignItems: 'center',
                        padding: '12px 14px',
                        borderRadius: 16,
                        background: 'rgba(247,250,247,0.95)',
                        border: '1px solid rgba(31,157,114,0.14)',
                      }}
                    >
                      <div
                        style={{
                          width: 84,
                          height: 84,
                          borderRadius: 14,
                          overflow: 'hidden',
                          background: 'rgba(255,255,255,0.88)',
                          border: '1px solid rgba(31,157,114,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {result.image_url ? (
                          // Using a native img keeps this lightweight for external supermarket assets.
                          <img
                            src={result.image_url}
                            alt={result.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                            No image
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{result.name}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
                          {result.store_name} {result.price_text ? `· ${result.price_text}` : ''}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--accent-strong)' }}>
                        {formatCompact(result.price)}
                      </div>
                      <button
                        onClick={() => applySearchResult(index, result)}
                        style={{
                          height: 40,
                          padding: '0 14px',
                          borderRadius: 999,
                          border: '1px solid rgba(31,157,114,0.18)',
                          background: 'var(--accent)',
                          color: '#f6fff9',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                        }}
                      >
                        USE PRICE
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
