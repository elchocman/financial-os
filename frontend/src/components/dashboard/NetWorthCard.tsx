import Card from '@/components/ui/Card'
import { formatCLP, formatCompact, formatPct, isPositive } from '@/lib/formatters'
import type { DashboardKPIs } from '@/types'

interface NetWorthCardProps {
  data: DashboardKPIs | null
  loading?: boolean
}

export default function NetWorthCard({ data, loading }: NetWorthCardProps) {
  if (loading || !data) {
    return (
      <Card style={{ gridColumn: 'span 2' }}>
        <div className="skeleton" style={{ height: 22, width: '34%', marginBottom: 18 }} />
        <div className="skeleton" style={{ height: 72, width: '72%', marginBottom: 18 }} />
        <div className="skeleton" style={{ height: 18, width: '42%', marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="skeleton" style={{ height: 66 }} />
          <div className="skeleton" style={{ height: 66 }} />
        </div>
      </Card>
    )
  }

  const changePositive = isPositive(data.net_worth_change_30d)

  return (
    <Card
      delay={0}
      style={{
        gridColumn: 'span 2',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.97) 0%, rgba(244,253,248,0.95) 56%, rgba(233,248,241,0.92) 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at top right, rgba(31,157,114,0.16), transparent 34%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.12em',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Total net worth
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 56,
                fontWeight: 700,
                letterSpacing: '-0.06em',
                color: 'var(--text-primary)',
                lineHeight: 0.95,
              }}
            >
              {formatCompact(data.net_worth)}
            </div>
          </div>

          {data.net_worth_change_30d != null && (
            <div
              style={{
                alignSelf: 'flex-start',
                padding: '10px 14px',
                borderRadius: 999,
                background: changePositive ? 'var(--gain-dim)' : 'var(--loss-dim)',
                color: changePositive ? 'var(--gain)' : 'var(--loss)',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
              }}
            >
              {changePositive ? '+' : '-'} {formatPct(data.net_worth_change_pct_30d ?? 0)}
            </div>
          )}
        </div>

        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            color: 'var(--text-secondary)',
          }}
        >
          {formatCLP(data.net_worth)}
        </div>

        {data.net_worth_change_30d != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                color: changePositive ? 'var(--gain)' : 'var(--loss)',
              }}
            >
              {changePositive ? '+' : '-'}{formatCompact(Math.abs(data.net_worth_change_30d))}
            </span>
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}
            >
              versus the last 30 days
            </span>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
            marginTop: 4,
          }}
        >
          <div
            style={{
              padding: '16px 18px',
              borderRadius: 20,
              background: 'rgba(255,255,255,0.72)',
              border: '1px solid rgba(255,255,255,0.75)',
            }}
          >
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: 6 }}>
              ASSETS
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--gain)' }}>
              {formatCompact(data.total_assets)}
            </div>
          </div>

          <div
            style={{
              padding: '16px 18px',
              borderRadius: 20,
              background: 'rgba(255,255,255,0.72)',
              border: '1px solid rgba(255,255,255,0.75)',
            }}
          >
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: 6 }}>
              LIABILITIES
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: '-0.04em',
                color: data.total_liabilities > 0 ? 'var(--loss)' : 'var(--text-secondary)',
              }}
            >
              {data.total_liabilities > 0 ? formatCompact(data.total_liabilities) : '-'}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
