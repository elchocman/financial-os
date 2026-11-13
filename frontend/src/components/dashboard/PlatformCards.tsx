import Card from '@/components/ui/Card'
import { formatCompact, formatCLP } from '@/lib/formatters'
import type { PlatformSummary } from '@/types'

const PLATFORM_META: Record<string, { color: string; icon: string }> = {
  fintual:  { color: 'var(--fintual)',  icon: 'F' },
  racional: { color: 'var(--racional)', icon: 'R' },
  binance:  { color: 'var(--binance)',  icon: '₿' },
  manual:   { color: 'var(--manual)',   icon: 'M' },
}

interface PlatformCardsProps {
  platforms: PlatformSummary[]
  loading?: boolean
}

export default function PlatformCards({ platforms, loading }: PlatformCardsProps) {
  if (loading) {
    return (
      <>
        {[0, 1, 2].map(i => (
          <Card key={i} delay={i * 50}>
            <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 28, width: '80%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 12, width: '40%' }} />
          </Card>
        ))}
      </>
    )
  }

  return (
    <>
      {platforms.map((p, i) => {
        const meta = PLATFORM_META[p.platform] ?? { color: '#64748b', icon: '?' }
        return (
          <Card key={p.platform} delay={i * 60} style={{
            borderLeft: `3px solid ${meta.color}`,
          }}>
            {/* Platform header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                background: `${meta.color}20`,
                border: `1px solid ${meta.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: meta.color,
              }}>{meta.icon}</div>
              <span style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                letterSpacing: '0.08em',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
              }}>{p.platform}</span>
            </div>

            {/* Value */}
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
              marginBottom: 4,
            }}>
              {formatCompact(p.total_clp)}
            </div>
            <div style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-tertiary)',
              marginBottom: 14,
            }}>
              {formatCLP(p.total_clp)}
            </div>

            {/* Percentage bar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{
                height: 3,
                background: 'var(--border-dim)',
                borderRadius: 2,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${p.percentage}%`,
                  background: meta.color,
                  borderRadius: 2,
                  transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                }} />
              </div>
            </div>
            <div style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-tertiary)',
            }}>
              {p.percentage}% of portfolio · {p.holdings.length} {p.holdings.length === 1 ? 'position' : 'positions'}
            </div>
          </Card>
        )
      })}
    </>
  )
}
