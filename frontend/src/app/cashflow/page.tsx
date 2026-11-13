'use client'

import { useEffect, useState, useCallback } from 'react'
import Card, { CardHeader } from '@/components/ui/Card'
import MonthlyChart from '@/components/charts/MonthlyChart'
import CategoryChart from '@/components/charts/CategoryChart'
import AddTransactionForm from '@/components/dashboard/AddTransactionForm'
import {
  deleteTransaction,
  getAccounts,
  getCashflowSummary,
  getExpenseByCategory,
  getMonthlySummaries,
  getTransactions,
} from '@/lib/api'
import { formatCLP, formatCompact, formatDate, isPositive } from '@/lib/formatters'
import type { Account, CashflowSummary, CategorySummary, MonthlySummary, Transaction } from '@/types'

const TYPE_COLORS: Record<string, string> = {
  income: 'var(--gain)',
  expense: 'var(--loss)',
  transfer: 'var(--accent)',
}

const PERIOD_OPTIONS = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
]

export default function CashflowPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [monthly, setMonthly] = useState<MonthlySummary[]>([])
  const [summary, setSummary] = useState<CashflowSummary | null>(null)
  const [categories, setCategories] = useState<CategorySummary[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [typeFilter, setTypeFilter] = useState('all')
  const [accountFilter, setAccountFilter] = useState('all')
  const [period, setPeriod] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [txns, mon, sum, cats, accountData] = await Promise.all([
        getTransactions({ type: typeFilter === 'all' ? undefined : typeFilter, limit: 200 }),
        getMonthlySummaries(12),
        getCashflowSummary(period),
        getExpenseByCategory(period),
        getAccounts(),
      ])
      setTransactions(txns)
      setMonthly(mon)
      setSummary(sum)
      setCategories(cats)
      setAccounts(accountData)
    } finally {
      setLoading(false)
    }
  }, [typeFilter, period])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleDelete(id: string) {
    await deleteTransaction(id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  const visibleTransactions = accountFilter === 'all'
    ? transactions
    : transactions.filter((t) => t.account_id === accountFilter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Income', value: summary ? formatCompact(summary.total_income) : '-', color: 'var(--gain)' },
          { label: 'Expenses', value: summary ? formatCompact(summary.total_expenses) : '-', color: 'var(--loss)' },
          {
            label: 'Net',
            value: summary ? formatCompact(summary.net) : '-',
            color: summary ? (isPositive(summary.net) ? 'var(--gain)' : 'var(--loss)') : 'var(--text-primary)',
          },
          {
            label: 'Savings Rate',
            value: summary ? `${summary.savings_rate.toFixed(1)}%` : '-',
            color: isPositive(summary?.savings_rate ?? 0) ? 'var(--gain)' : 'var(--loss)',
          },
        ].map((kpi, i) => (
          <Card key={kpi.label} delay={i * 40} style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '0.1em', marginBottom: 8 }}>
              {kpi.label.toUpperCase()}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: kpi.color }}>
              {kpi.value}
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.months}
              onClick={() => setPeriod(option.months)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--r-sm)',
                border: '1px solid',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: period === option.months ? 'var(--accent-dim)' : 'transparent',
                borderColor: period === option.months ? 'rgba(232,160,32,0.3)' : 'var(--border-subtle)',
                color: period === option.months ? 'var(--accent)' : 'var(--text-tertiary)',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 'var(--r-sm)',
              border: '1px solid var(--border-base)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
            }}
          >
            <option value="all">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>

          <button
            onClick={() => setShowForm((v) => !v)}
            style={{
              padding: '7px 16px',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--r-sm)',
              color: '#000',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + Add Transaction
          </button>
        </div>
      </div>

      {showForm && (
        <AddTransactionForm
          onAdded={(transaction) => {
            setTransactions((prev) => [transaction, ...prev])
            setShowForm(false)
            loadData()
          }}
          onClose={() => setShowForm(false)}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 16, alignItems: 'start' }}>
        <MonthlyChart data={monthly} loading={loading} />
        <CategoryChart data={categories} loading={loading} />
      </div>

      <Card delay={120}>
        <CardHeader
          label={`Transactions · ${visibleTransactions.length}`}
          action={
            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'income', 'expense', 'transfer'].map((filterValue) => (
                <button
                  key={filterValue}
                  onClick={() => setTypeFilter(filterValue)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 4,
                    border: '1px solid',
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: typeFilter === filterValue ? 'var(--accent-dim)' : 'transparent',
                    borderColor: typeFilter === filterValue ? 'rgba(232,160,32,0.3)' : 'var(--border-subtle)',
                    color: typeFilter === filterValue ? 'var(--accent)' : 'var(--text-tertiary)',
                  }}
                >
                  {filterValue}
                </button>
              ))}
            </div>
          }
        />

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}
          </div>
        ) : visibleTransactions.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>
            No transactions yet - add your first one above.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date', 'Account', 'Description', 'Type', 'Amount', ''].map((header, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: header === 'Amount' ? 'right' : 'left',
                      padding: '0 8px 10px',
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-tertiary)',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      borderBottom: '1px solid var(--border-dim)',
                      fontWeight: 500,
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  style={{ borderBottom: '1px solid var(--border-dim)', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                    {formatDate(transaction.date)}
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {transaction.account_name ?? '-'}
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: 13, color: 'var(--text-primary)' }}>
                    {transaction.description ?? '-'}
                    {transaction.is_recurring && (
                      <span style={{ marginLeft: 6, fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--accent)', background: 'var(--accent-dim)', padding: '1px 5px', borderRadius: 3 }}>
                        ↻
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: TYPE_COLORS[transaction.type] ?? 'var(--text-secondary)', background: `${TYPE_COLORS[transaction.type]}18`, padding: '2px 7px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {transaction.type}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: transaction.type === 'income' ? 'var(--gain)' : transaction.type === 'expense' ? 'var(--loss)' : 'var(--text-primary)' }}>
                    {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                    {formatCLP(Number(transaction.amount))}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, padding: '2px 6px', borderRadius: 3 }}
                      onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--loss)')}
                      onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--text-muted)')}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
