'use client'

import { useEffect, useState } from 'react'
import Card, { CardHeader } from '@/components/ui/Card'
import { getBalanceSheet, createAsset, deleteAsset } from '@/lib/api'
import { formatCLP, formatCompact, isPositive } from '@/lib/formatters'
import type { BalanceSheet, AssetItem } from '@/types'

const ASSET_TYPES = ['cash','investment','crypto','real_estate','other']
const LIABILITY_TYPES = ['credit_card','loan','mortgage','other']

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

export default function BalanceSheetPage() {
  const [data, setData]       = useState<BalanceSheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isLiability, setIsLiability] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'cash', current_value: '', currency: 'CLP' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    getBalanceSheet().then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  async function handleCreate() {
    if (!form.name || !form.current_value) return
    setSaving(true)
    try {
      await createAsset({
        name: form.name,
        type: form.type,
        is_liability: isLiability,
        current_value: Number(form.current_value) as any,
        currency: form.currency,
      })
      setForm({ name: '', type: 'cash', current_value: '', currency: 'CLP' })
      setShowForm(false)
      load()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    await deleteAsset(id)
    load()
  }

  const nwPositive = isPositive(data?.net_worth ?? 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1000 }}>

      {/* Net Worth hero */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {loading ? [...Array(3)].map((_, i) => <Card key={i}><div className="skeleton" style={{ height: 52 }} /></Card>) : [
          { label: 'Net Worth',         value: data?.net_worth ?? 0,         color: nwPositive ? 'var(--gain)' : 'var(--loss)' },
          { label: 'Total Assets',      value: data?.total_assets ?? 0,      color: 'var(--gain)' },
          { label: 'Total Liabilities', value: data?.total_liabilities ?? 0, color: data?.total_liabilities ? 'var(--loss)' : 'var(--text-secondary)' },
        ].map((kpi, i) => (
          <Card key={kpi.label} delay={i * 50} style={{ padding: '18px 20px', borderLeft: i === 0 ? `3px solid ${kpi.color}` : undefined }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '0.1em', marginBottom: 8 }}>{kpi.label.toUpperCase()}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 600, color: kpi.color }}>{formatCompact(kpi.value)}</div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 4 }}>{formatCLP(kpi.value)}</div>
          </Card>
        ))}
      </div>

      {/* Add button */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={() => { setIsLiability(false); setShowForm(v => !v) }} style={{ padding: '7px 16px', background: 'var(--accent-dim)', border: '1px solid rgba(232,160,32,0.3)', borderRadius: 'var(--r-sm)', color: 'var(--accent)', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>+ Asset</button>
        <button onClick={() => { setIsLiability(true); setShowForm(v => !v) }} style={{ padding: '7px 16px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 'var(--r-sm)', color: 'var(--loss)', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>+ Liability</button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card>
          <CardHeader label={isLiability ? 'New Liability' : 'New Asset'} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '0.1em', marginBottom: 6 }}>NAME</label>
              <input type="text" placeholder={isLiability ? 'e.g. Mortgage' : 'e.g. Savings Account'} value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '0.1em', marginBottom: 6 }}>TYPE</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {(isLiability ? LIABILITY_TYPES : ASSET_TYPES).map(t => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '0.1em', marginBottom: 6 }}>VALUE (CLP)</label>
              <input type="number" placeholder="0" value={form.current_value} onChange={e => set('current_value', e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCreate} disabled={saving || !form.name || !form.current_value} style={{ padding: '8px 20px', background: isLiability ? 'rgba(244,63,94,0.15)' : 'var(--accent)', border: isLiability ? '1px solid rgba(244,63,94,0.3)' : 'none', borderRadius: 'var(--r-sm)', color: isLiability ? 'var(--loss)' : '#000', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, cursor: 'pointer' }}>{saving ? 'Saving…' : `Add ${isLiability ? 'Liability' : 'Asset'}`}</button>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-sm)', color: 'var(--text-tertiary)', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>Cancel</button>
          </div>
        </Card>
      )}

      {/* Assets buckets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', color: 'var(--text-tertiary)', marginBottom: 10 }}>
            ─ ASSETS ─
          </div>
          {loading ? <div className="skeleton" style={{ height: 200 }} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data?.assets.map(bucket => (
                <Card key={bucket.type} style={{ borderLeft: `3px solid ${bucket.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 500, color: bucket.color, letterSpacing: '0.06em' }}>{bucket.label.toUpperCase()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{formatCompact(bucket.total)}</div>
                      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{bucket.percentage}%</div>
                    </div>
                  </div>
                  <div style={{ height: 3, background: 'var(--border-dim)', borderRadius: 2, marginBottom: 12 }}>
                    <div style={{ height: '100%', width: `${bucket.percentage}%`, background: bucket.color, borderRadius: 2 }} />
                  </div>
                  {bucket.items.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--border-dim)' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 }}>{formatCompact(item.current_value)}</span>
                        {item.id !== '__portfolio__' && (
                          <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}>✕</button>
                        )}
                      </div>
                    </div>
                  ))}
                </Card>
              ))}
              {(!data?.assets || data.assets.length === 0) && (
                <Card><div style={{ padding: '24px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>No assets added yet</div></Card>
              )}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', color: 'var(--text-tertiary)', marginBottom: 10 }}>
            ─ LIABILITIES ─
          </div>
          {loading ? <div className="skeleton" style={{ height: 120 }} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data?.liabilities.map(item => (
                <Card key={item.id} style={{ borderLeft: '3px solid var(--loss)', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 2 }}>{item.name}</div>
                      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{item.type.replace('_',' ')}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: 'var(--loss)' }}>{formatCompact(item.current_value)}</span>
                      <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}>✕</button>
                    </div>
                  </div>
                </Card>
              ))}
              {(!data?.liabilities || data.liabilities.length === 0) && (
                <Card style={{ borderLeft: '3px solid var(--border-subtle)' }}>
                  <div style={{ padding: '24px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>No liabilities — great shape! 🎯</div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
