'use client'

import { useState, useEffect } from 'react'
import { createTransaction, getAccounts, getCategories } from '@/lib/api'
import type { Transaction, Category, Account } from '@/types'

interface AddTransactionFormProps {
  onAdded: (t: Transaction) => void
  onClose: () => void
}

const inputStyle = {
  width: '100%',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-base)',
  borderRadius: 'var(--r-sm)',
  padding: '8px 12px',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontFamily: 'var(--font-mono)',
  outline: 'none',
} as const

const labelStyle = {
  display: 'block',
  fontSize: 10,
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-tertiary)',
  letterSpacing: '0.1em',
  marginBottom: 6,
  textTransform: 'uppercase',
} as const

export default function AddTransactionForm({ onAdded, onClose }: AddTransactionFormProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    type: 'expense',
    account_id: '',
    category_id: '',
    description: '',
    currency: 'CLP',
    is_recurring: false,
  })

  useEffect(() => {
    getCategories(form.type === 'transfer' ? undefined : form.type)
      .then(setCategories)
      .catch(() => {})
  }, [form.type])

  useEffect(() => {
    getAccounts()
      .then((items) => setAccounts(items.filter((item) => item.is_active)))
      .catch(() => {})
  }, [])

  async function handleSubmit() {
    if (!form.amount || !form.date) return
    setSaving(true)
    try {
      const t = await createTransaction({
        date: form.date as any,
        amount: Number(form.amount) as any,
        type: form.type as any,
        currency: form.currency,
        account_id: form.account_id || undefined,
        category_id: form.category_id || undefined,
        description: form.description || undefined,
        is_recurring: form.is_recurring,
      })
      onAdded(t)
    } finally {
      setSaving(false)
    }
  }

  const set = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }))

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-base)',
      borderRadius: 'var(--r-lg)',
      padding: '20px 24px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
          New Transaction
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>

      {/* Type selector */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Type</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {['income', 'expense', 'transfer'].map(t => (
            <button
              key={t}
              onClick={() => set('type', t)}
              style={{
                flex: 1,
                padding: '7px 0',
                borderRadius: 'var(--r-sm)',
                border: '1px solid',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                transition: 'all 0.15s',
                background: form.type === t
                  ? t === 'income' ? 'rgba(34,197,94,0.12)' : t === 'expense' ? 'rgba(244,63,94,0.12)' : 'var(--accent-dim)'
                  : 'transparent',
                borderColor: form.type === t
                  ? t === 'income' ? 'rgba(34,197,94,0.4)' : t === 'expense' ? 'rgba(244,63,94,0.4)' : 'rgba(232,160,32,0.3)'
                  : 'var(--border-subtle)',
                color: form.type === t
                  ? t === 'income' ? 'var(--gain)' : t === 'expense' ? 'var(--loss)' : 'var(--accent)'
                  : 'var(--text-tertiary)',
              }}
            >{t}</button>
          ))}
        </div>
      </div>

      {/* Grid fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Amount (CLP)</label>
          <input
            type="number" placeholder="0"
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Date</label>
          <input
            type="date" value={form.date}
            onChange={e => set('date', e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Account</label>
          <select
            value={form.account_id}
            onChange={e => set('account_id', e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="">— No account —</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name} · {a.type}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Description</label>
          <input
            type="text" placeholder="e.g. Groceries"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Category</label>
          <select
            value={form.category_id}
            onChange={e => set('category_id', e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="">— None —</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Recurring toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => set('is_recurring', !form.is_recurring)}
          style={{
            width: 32, height: 18,
            borderRadius: 9,
            border: 'none',
            background: form.is_recurring ? 'var(--accent)' : 'var(--border-base)',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s',
            flexShrink: 0,
          }}
        >
          <span style={{
            position: 'absolute',
            top: 2, left: form.is_recurring ? 16 : 2,
            width: 14, height: 14,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
          }} />
        </button>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>Recurring</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleSubmit}
          disabled={saving || !form.amount}
          style={{
            flex: 1,
            padding: '9px 0',
            background: saving ? 'var(--bg-elevated)' : 'var(--accent)',
            border: 'none',
            borderRadius: 'var(--r-sm)',
            color: saving ? 'var(--text-tertiary)' : '#000',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
        >{saving ? 'Saving…' : 'Add Transaction'}</button>
        <button
          onClick={onClose}
          style={{
            padding: '9px 18px',
            background: 'transparent',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--r-sm)',
            color: 'var(--text-tertiary)',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
          }}
        >Cancel</button>
      </div>
    </div>
  )
}
