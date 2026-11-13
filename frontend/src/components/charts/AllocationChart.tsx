'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import Card, { CardHeader } from '@/components/ui/Card'
import { formatCompact, formatPct } from '@/lib/formatters'
import type { PortfolioAllocation } from '@/types'

interface AllocationChartProps {
  data: PortfolioAllocation | null
  loading?: boolean
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-base)',
      borderRadius: 'var(--r-sm)',
      padding: '10px 14px',
      fontFamily: 'var(--font-mono)',
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 4 }}>{item.label}</div>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{formatCompact(item.value_clp)}</div>
      <div style={{ fontSize: 13, color: item.color ?? 'var(--accent)', fontWeight: 600 }}>{item.percentage}%</div>
    </div>
  )
}

export default function AllocationChart({ data, loading }: AllocationChartProps) {
  const items = data?.by_platform ?? []

  return (
    <Card delay={150}>
      <CardHeader label="Allocation" />

      {loading ? (
        <div className="skeleton" style={{ height: 180 }} />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={items}
                dataKey="value_clp"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={3}
                strokeWidth={0}
              >
                {items.map((entry, i) => (
                  <Cell key={i} fill={entry.color ?? '#6366f1'} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: item.color ?? '#6366f1',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                    {item.label}
                  </span>
                </div>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 }}>
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
