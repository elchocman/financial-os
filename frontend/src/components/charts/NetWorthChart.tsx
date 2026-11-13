'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import Card, { CardHeader } from '@/components/ui/Card'
import { formatCompact, formatCLP, formatDateShort } from '@/lib/formatters'
import type { NetWorthSnapshot } from '@/types'

interface NetWorthChartProps {
  data: NetWorthSnapshot[]
  loading?: boolean
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as NetWorthSnapshot

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-base)',
      borderRadius: 'var(--r-md)',
      padding: '12px 16px',
      fontFamily: 'var(--font-mono)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>
        {formatDateShort(d.date)}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
        {formatCompact(d.net_worth)}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
        {formatCLP(d.net_worth)}
      </div>
      {d.fintual != null && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {d.fintual > 0 && <Row label="Fintual" value={d.fintual} color="var(--fintual)" />}
          {d.racional != null && d.racional > 0 && <Row label="Racional" value={d.racional} color="var(--racional)" />}
          {d.binance != null && d.binance > 0 && <Row label="Binance" value={d.binance} color="var(--binance)" />}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11 }}>
      <span style={{ color: 'var(--text-tertiary)' }}>
        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, marginRight: 5 }} />
        {label}
      </span>
      <span style={{ color: 'var(--text-secondary)' }}>{formatCompact(value)}</span>
    </div>
  )
}

const PERIODS = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
]

interface Props extends NetWorthChartProps {
  activeDays: number
  onChangeDays: (d: number) => void
}

export default function NetWorthChart({ data, loading, activeDays, onChangeDays }: Props) {
  return (
    <Card delay={100} style={{ gridColumn: 'span 4' }}>
      <CardHeader
        label="Net Worth Evolution"
        action={
          <div style={{ display: 'flex', gap: 4 }}>
            {PERIODS.map(p => (
              <button
                key={p.days}
                onClick={() => onChangeDays(p.days)}
                style={{
                  padding: '3px 10px',
                  borderRadius: 4,
                  border: '1px solid',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: activeDays === p.days ? 'var(--accent-dim)' : 'transparent',
                  borderColor: activeDays === p.days ? 'rgba(232,160,32,0.3)' : 'var(--border-subtle)',
                  color: activeDays === p.days ? 'var(--accent)' : 'var(--text-tertiary)',
                }}
              >{p.label}</button>
            ))}
          </div>
        }
      />

      {loading ? (
        <div className="skeleton" style={{ height: 220 }} />
      ) : data.length === 0 ? (
        <div style={{
          height: 220,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
        }}>No snapshot data yet — run a sync to start tracking</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e8a020" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#e8a020" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatCompact}
              tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-base)', strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="net_worth"
              stroke="#e8a020"
              strokeWidth={2}
              fill="url(#netWorthGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#e8a020', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
