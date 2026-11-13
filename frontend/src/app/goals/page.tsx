'use client'

import { useEffect, useState } from 'react'
import Card, { CardHeader } from '@/components/ui/Card'
import { getGoals, createGoal, deleteGoal, updateGoal } from '@/lib/api'
import { formatCLP, formatCompact, formatDate } from '@/lib/formatters'
import type { Goal } from '@/types'

const STATUS_CONFIG = {
  achieved: { label: '✓ ACHIEVED', bg: 'var(--gain-dim)',   color: 'var(--gain)' },
  active:   { label: 'ACTIVE',     bg: 'var(--accent-dim)', color: 'var(--accent)' },
  overdue:  { label: 'OVERDUE',    bg: 'var(--loss-dim)',   color: 'var(--loss)' },
}

const AUTO_SOURCES = [
  { hint: 'patrimonio / net worth / total',         source: 'net_worth'  },
  { hint: 'fintual',                                source: 'fintual'    },
  { hint: 'racional',                               source: 'racional'   },
  { hint: 'bitcoin / btc / binance / crypto',       source: 'binance'    },
  { hint: 'ahorro / savings / cash / efectivo',     source: 'savings'    },
]

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

export default function GoalsPage() {
  const [goals, setGoals]       = useState<Goal[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [form, setForm]         = useState({ name: '', target_amount: '', current_amount: '', target_date: '', currency: 'CLP' })

  const load = () => getGoals().then(setGoals).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  function openCreate() { setEditGoal(null); setForm({ name: '', target_amount: '', current_amount: '', target_date: '', currency: 'CLP' }); setShowForm(true) }
  function openEdit(g: Goal) {
    setEditGoal(g)
    setForm({ name: g.name, target_amount: String(g.target_amount), current_amount: String(g.current_amount), target_date: g.target_date ?? '', currency: g.currency })
    setShowForm(true)
  }

  async function handleSubmit() {
    if (!form.name || !form.target_amount) return
    const payload = {
      name: form.name,
      target_amount: Number(form.target_amount) as any,
      current_amount: Number(form.current_amount || 0) as any,
      target_date: form.target_date || undefined,
      currency: form.currency,
    }
    if (editGoal) {
      const g = await updateGoal(editGoal.id, payload)
      setGoals(prev => prev.map(x => x.id === g.id ? g : x))
    } else {
      const g = await createGoal(payload)
      setGoals(prev => [...prev, g])
    }
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    await deleteGoal(id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  const achieved = goals.filter(g => g.progress_pct >= 100)
  const active   = goals.filter(g => g.progress_pct < 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>{active.length} active</span>
          {achieved.length > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gain)' }}>✓ {achieved.length} achieved</span>}
        </div>
        <button onClick={openCreate} style={{ padding: '7px 16px', background: 'var(--accent-dim)', border: '1px solid rgba(232,160,32,0.3)', borderRadius: 'var(--r-sm)', color: 'var(--accent)', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
          + Add Goal
        </button>
      </div>

      {/* Auto-sync hint */}
      <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 'var(--r-md)', padding: '12px 16px' }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#818cf8', marginBottom: 6, letterSpacing: '0.06em' }}>⚡ AUTO-SYNC ENABLED</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Goals with matching keywords update automatically each day. Name your goal to match a source:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginTop: 8 }}>
          {AUTO_SOURCES.map(s => (
            <span key={s.source} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', background: 'var(--bg-elevated)', padding: '3px 8px', borderRadius: 4 }}>
              {s.hint}
            </span>
          ))}
        </div>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <Card>
          <CardHeader label={editGoal ? 'Edit Goal' : 'New Goal'} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Goal Name', key: 'name', type: 'text', placeholder: 'e.g. Emergency Fund or Fintual Portfolio', span: 2 },
              { label: 'Target Amount (CLP)', key: 'target_amount', type: 'number', placeholder: '10000000' },
              { label: 'Current Amount (CLP)', key: 'current_amount', type: 'number', placeholder: '0 — or set by auto-sync' },
              { label: 'Target Date', key: 'target_date', type: 'date', placeholder: '' },
            ].map(f => (
              <div key={f.key} style={{ gridColumn: (f as any).span === 2 ? 'span 2' : undefined }}>
                <label style={{ display: 'block', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '0.1em', marginBottom: 6 }}>{f.label.toUpperCase()}</label>
                <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]} onChange={e => set(f.key, e.target.value)} style={inputStyle} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSubmit} style={{ padding: '8px 20px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-sm)', color: '#000', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, cursor: 'pointer' }}>
              {editGoal ? 'Save Changes' : 'Create Goal'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-sm)', color: 'var(--text-tertiary)', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>Cancel</button>
          </div>
        </Card>
      )}

      {/* Goals grid */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 140 }} />)}
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            No goals yet. Create your first financial goal.
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {goals.map((g, i) => <GoalCard key={g.id} goal={g} delay={i * 50} onDelete={handleDelete} onEdit={openEdit} />)}
        </div>
      )}
    </div>
  )
}

function GoalCard({ goal, delay, onDelete, onEdit }: { goal: Goal; delay: number; onDelete: (id: string) => void; onEdit: (g: Goal) => void }) {
  const isAchieved = goal.progress_pct >= 100
  const isOverdue  = !isAchieved && goal.target_date && new Date(goal.target_date) < new Date()
  const statusKey  = isAchieved ? 'achieved' : isOverdue ? 'overdue' : 'active'
  const status     = STATUS_CONFIG[statusKey]
  const pct        = Math.min(goal.progress_pct, 100)

  // Detect auto-sync
  const autoSource = detectSource(goal.name)

  return (
    <Card delay={delay} style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Progress fill background */}
      <div style={{ position: 'absolute', inset: 0, background: isAchieved ? 'var(--gain-dim)' : 'transparent', opacity: 0.4, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: isAchieved ? 'rgba(34,197,94,0.06)' : 'rgba(232,160,32,0.04)', transition: 'width 1s cubic-bezier(0.16,1,0.3,1)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{goal.name}</span>
              {autoSource && (
                <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#818cf8', background: 'rgba(99,102,241,0.1)', padding: '2px 6px', borderRadius: 3, letterSpacing: '0.06em' }}>⚡ AUTO</span>
              )}
            </div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
              {goal.target_date ? `Target: ${formatDate(goal.target_date)}` : 'No target date'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '3px 8px', borderRadius: 3, background: status.bg, color: status.color }}>{status.label}</span>
            <button onClick={() => onEdit(goal)} style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 4, color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 11, padding: '3px 8px', fontFamily: 'var(--font-mono)' }}>Edit</button>
            <button onClick={() => onDelete(goal.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}>✕</button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{pct.toFixed(1)}% complete</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: isAchieved ? 'var(--gain)' : 'var(--text-secondary)', fontWeight: 500 }}>
              {formatCompact(Number(goal.current_amount))} / {formatCompact(Number(goal.target_amount))}
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--border-dim)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: isAchieved ? 'var(--gain)' : 'var(--accent)', borderRadius: 4, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Current',         value: formatCompact(Number(goal.current_amount)) },
            { label: 'Remaining',       value: formatCompact(Math.max(0, Number(goal.target_amount) - Number(goal.current_amount))) },
            { label: goal.monthly_savings_needed ? 'Monthly needed' : 'Target', value: goal.monthly_savings_needed ? formatCompact(Number(goal.monthly_savings_needed)) : formatCLP(Number(goal.target_amount)) },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label.toUpperCase()}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function detectSource(name: string): string | null {
  const low = name.toLowerCase()
  const map: Record<string, string[]> = {
    net_worth: ['patrimonio','net worth','networth','total'],
    fintual:   ['fintual'],
    racional:  ['racional'],
    binance:   ['bitcoin','btc','binance','crypto'],
    savings:   ['ahorro','savings','cash','efectivo'],
  }
  for (const [src, kws] of Object.entries(map)) {
    if (kws.some(k => low.includes(k))) return src
  }
  return null
}
