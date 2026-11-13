'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import Card, { CardHeader } from '@/components/ui/Card'
import { formatCompact, formatCLP } from '@/lib/formatters'
import type { MonthlySummary } from '@/types'

interface MonthlyChartProps {
  data: MonthlySummary[]
  loading?: boolean
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as MonthlySummary
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-base)',
      borderRadius: 'var(--r-md)',
      padding: '12px 16px',
      fontFamily: 'var(--font-mono)',
      minWidth: 160,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Row label="Income"   value={d?.income}   color="var(--gain)" />
        <Row label="Expenses" value={d?.expenses} color="var(--loss)" />
        <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: 6, marginTop: 2 }}>
          <Row
            label="Net"
            value={d?.net}
            color={d?.net >= 0 ? 'var(--gain)' : 'var(--loss)'}
          />
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, fontSize: 12 }}>
      <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{ color, fontWeight: 500 }}>{formatCompact(value ?? 0)}</span>
    </div>
  )
}

export default function MonthlyChart({ data, loading }: MonthlyChartProps) {
  return (
    <Card delay={50} style={{ gridColumn: 'span 3' }}>
      <CardHeader label="Monthly Cashflow" />
      {loading ? (
        <div className="skeleton" style={{ height: 220 }} />
      ) : data.length === 0 ? (
        <div style={{
          height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)',
        }}>No transaction data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barGap={3} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tickFormatter={formatCompact}
              tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={false} tickLine={false} width={56}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="income"   fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={24} />
            <Bar dataKey="expenses" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
