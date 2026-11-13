'use client'

import Card, { CardHeader } from '@/components/ui/Card'
import { formatCompact, formatCLP, formatPct, isPositive } from '@/lib/formatters'
import type { PortfolioPerformance } from '@/types'

interface PnLTableProps {
  data: PortfolioPerformance | null
  loading?: boolean
}

export default function PnLTable({ data, loading }: PnLTableProps) {
  const holdings = data?.holdings ?? []
  const calculable = holdings.filter(h => h.pnl_clp != null)
  const hasAnyPnL = calculable.length > 0

  return (
    <Card delay={250} style={{ gridColumn: 'span 4' }}>
      <CardHeader
        label="Performance & PnL"
        action={
          data?.total_pnl_clp != null ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 600,
                color: isPositive(data.total_pnl_clp) ? 'var(--gain)' : 'var(--loss)',
              }}>
                {isPositive(data.total_pnl_clp) ? '▲' : '▼'} {formatCompact(Math.abs(data.total_pnl_clp))}
              </span>
              {data.total_pnl_pct != null && (
                <span style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: isPositive(data.total_pnl_pct) ? 'var(--gain)' : 'var(--loss)',
                  background: isPositive(data.total_pnl_pct) ? 'var(--gain-dim)' : 'var(--loss-dim)',
                  padding: '2px 7px',
                  borderRadius: 3,
                }}>
                  {formatPct(data.total_pnl_pct)}
                </span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
              Set avg_cost on holdings to enable PnL
            </span>
          )
        }
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 40 }} />)}
        </div>
      ) : !hasAnyPnL ? (
        <div style={{
          padding: '32px 0',
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--text-tertiary)',
        }}>
          <div style={{ marginBottom: 8 }}>PnL unavailable — avg_cost not set for any holding</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Update holdings in Supabase with your average purchase cost to track unrealized gains
          </div>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Asset', 'Platform', 'Current Value', 'Cost Basis', 'PnL', '% Return'].map(h => (
                <th key={h} style={{
                  textAlign: ['Current Value', 'Cost Basis', 'PnL', '% Return'].includes(h) ? 'right' : 'left',
                  padding: '0 8px 10px',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-tertiary)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  borderBottom: '1px solid var(--border-dim)',
                  fontWeight: 500,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holdings.map((h, i) => {
              const pnlPositive = isPositive(h.pnl_clp ?? 0)
              return (
                <tr
                  key={i}
                  style={{ borderBottom: '1px solid var(--border-dim)', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{h.name}</div>
                    {h.ticker && (
                      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{h.ticker}</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      color: `var(--${h.platform})`,
                      background: `var(--${h.platform}-dim, rgba(99,102,241,0.1))`,
                      padding: '2px 7px',
                      borderRadius: 3,
                    }}>{h.platform.toUpperCase()}</span>
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {formatCompact(h.current_value_clp)}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {h.cost_basis_clp != null ? formatCompact(h.cost_basis_clp) : '—'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    {h.pnl_clp != null ? (
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        fontWeight: 500,
                        color: pnlPositive ? 'var(--gain)' : 'var(--loss)',
                      }}>
                        {pnlPositive ? '+' : ''}{formatCompact(h.pnl_clp)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    {h.pnl_pct != null ? (
                      <span style={{
                        fontSize: 12,
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 500,
                        color: isPositive(h.pnl_pct) ? 'var(--gain)' : 'var(--loss)',
                        background: isPositive(h.pnl_pct) ? 'var(--gain-dim)' : 'var(--loss-dim)',
                        padding: '3px 8px',
                        borderRadius: 4,
                      }}>
                        {formatPct(h.pnl_pct)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Card>
  )
}
