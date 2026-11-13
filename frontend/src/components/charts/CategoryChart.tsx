'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import Card, { CardHeader } from '@/components/ui/Card'
import { formatCLP, formatCompact } from '@/lib/formatters'
import type { CategorySummary } from '@/types'

interface CategoryChartProps {
  data: CategorySummary[]
  loading?: boolean
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload as CategorySummary
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-base)',
      borderRadius: 'var(--r-sm)',
      padding: '10px 14px',
      fontFamily: 'var(--font-mono)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span>{item.icon}</span>
        <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{item.name}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--loss)' }}>{formatCompact(item.total)}</div>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{item.percentage}% · {item.transaction_count} txns</div>
    </div>
  )
}

export default function CategoryChart({ data, loading }: CategoryChartProps) {
  return (
    <Card delay={80}>
      <CardHeader label="By Category" />
      {loading ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : data.length === 0 ? (
        <div style={{
          height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)',
          textAlign: 'center',
        }}>Add categorised expenses<br />to see breakdown</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={data}
                dataKey="total"
                cx="50%" cy="50%"
                innerRadius={44} outerRadius={68}
                paddingAngle={2} strokeWidth={0}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, maxHeight: 180, overflowY: 'auto' }}>
            {data.slice(0, 6).map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 7, height: 7, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.icon} {item.name}</span>
                </div>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
