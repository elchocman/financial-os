'use client'

import { useEffect, useState } from 'react'
import Card, { CardHeader } from '@/components/ui/Card'
import { createAccount, deleteAccount, getAccounts, updateAccount } from '@/lib/api'
import type { Account } from '@/types'

const ACCOUNT_TYPES = ['bank', 'investment', 'crypto', 'manual']

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.92)',
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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    type: 'bank',
    platform: '',
    currency: 'CLP',
    is_active: true,
  })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setAccounts(await getAccounts())
    } catch (err: any) {
      setError(err.message ?? 'Could not load accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate() {
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const created = await createAccount({
        name: form.name,
        type: form.type,
        platform: form.platform || undefined,
        currency: form.currency,
        is_active: form.is_active,
      })
      setAccounts((prev) => [created, ...prev])
      setForm({ name: '', type: 'bank', platform: '', currency: 'CLP', is_active: true })
    } catch (err: any) {
      setError(err.message ?? 'Could not create account')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(account: Account) {
    try {
      const updated = await updateAccount(account.id, { is_active: !account.is_active })
      setAccounts((prev) => prev.map((item) => (item.id === account.id ? updated : item)))
    } catch (err: any) {
      setError(err.message ?? 'Could not update account')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAccount(id)
      setAccounts((prev) => prev.filter((item) => item.id !== id))
    } catch (err: any) {
      setError(err.message ?? 'Could not delete account')
    }
  }

  const activeCount = accounts.filter((account) => account.is_active).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 6 }}>
              Accounts
            </div>
            <div style={{ color: 'var(--text-secondary)', maxWidth: 760 }}>
              Organize where your money lives: checking, cash, savings, cards, manual wallets, and future investment connectors.
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(140px, 1fr))', gap: 10 }}>
            <StatCard label="Total accounts" value={String(accounts.length)} />
            <StatCard label="Active accounts" value={String(activeCount)} />
          </div>
        </div>
        {error && (
          <div style={{ marginTop: 14, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--loss)' }}>
            {error}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader label="New Account" />
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 0.8fr', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} style={inputStyle} placeholder="Santander checking, cash wallet, Racional, etc." />
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))} style={inputStyle}>
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Platform</label>
            <input value={form.platform} onChange={(e) => setForm((prev) => ({ ...prev, platform: e.target.value }))} style={inputStyle} placeholder="Optional: Santander, Racional, cash" />
          </div>
          <div>
            <label style={labelStyle}>Currency</label>
            <input value={form.currency} onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <button
            onClick={() => setForm((prev) => ({ ...prev, is_active: !prev.is_active }))}
            style={{
              padding: '8px 12px',
              borderRadius: 999,
              border: '1px solid var(--border-subtle)',
              background: form.is_active ? 'var(--accent-dim)' : 'rgba(255,255,255,0.7)',
              color: form.is_active ? 'var(--accent-strong)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {form.is_active ? 'ACTIVE' : 'INACTIVE'}
          </button>

          <button
            onClick={handleCreate}
            disabled={saving || !form.name.trim()}
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
            {saving ? 'CREATING' : 'CREATE ACCOUNT'}
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader label="Your Accounts" />
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 60 }} />)}
          </div>
        ) : accounts.length === 0 ? (
          <div style={{ padding: '24px 0', color: 'var(--text-secondary)' }}>
            No accounts yet. Start by adding your main checking account, credit card, cash wallet, or investment account.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {accounts.map((account) => (
              <div
                key={account.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 0.8fr 1fr 0.7fr auto auto',
                  gap: 12,
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderRadius: 18,
                  background: 'rgba(255,255,255,0.72)',
                  border: '1px solid rgba(255,255,255,0.8)',
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{account.name}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
                    {account.platform || 'Manual account'}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                  {account.type}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {account.currency}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: account.is_active ? 'var(--gain)' : 'var(--text-tertiary)' }}>
                  {account.is_active ? 'Active' : 'Paused'}
                </div>
                <button
                  onClick={() => handleToggle(account)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 999,
                    border: '1px solid var(--border-subtle)',
                    background: account.is_active ? 'rgba(31,157,114,0.1)' : 'rgba(255,255,255,0.7)',
                    color: account.is_active ? 'var(--accent-strong)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  {account.is_active ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 999,
                    border: '1px solid rgba(212,91,77,0.16)',
                    background: 'rgba(212,91,77,0.08)',
                    color: 'var(--loss)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 18, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.78)' }}>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '0.1em', marginBottom: 8, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  )
}
