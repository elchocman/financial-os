import Card, { CardHeader } from '@/components/ui/Card'
import { formatCLP, formatCompact } from '@/lib/formatters'
import type { PlatformSummary } from '@/types'

interface HoldingsTableProps {
  platforms: PlatformSummary[]
  loading?: boolean
}

const PLATFORM_COLORS: Record<string, string> = {
  fintual:  'var(--fintual)',
  racional: 'var(--racional)',
  binance:  'var(--binance)',
  manual:   'var(--manual)',
}

const ASSET_CLASS_LABELS: Record<string, string> = {
  fund:   'FUND',
  equity: 'EQ',
  etf:    'ETF',
  crypto: 'CRYPTO',
}

export default function HoldingsTable({ platforms, loading }: HoldingsTableProps) {
  const allHoldings = platforms.flatMap(p =>
    p.holdings.map(h => ({ ...h, platformColor: PLATFORM_COLORS[h.platform] ?? '#64748b' }))
  )

  return (
    <Card delay={200} style={{ gridColumn: 'span 3' }}>
      <CardHeader label={`Holdings · ${allHoldings.length}`} />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 36 }} />
          ))}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Asset', 'Platform', 'Class', 'Qty', 'Value (CLP)'].map(h => (
                  <th key={h} style={{
                    textAlign: h === 'Value (CLP)' ? 'right' : 'left',
                    padding: '0 8px 10px',
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 500,
                    letterSpacing: '0.1em',
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    borderBottom: '1px solid var(--border-dim)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allHoldings.map((h, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: '1px solid var(--border-dim)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                      {h.name}
                    </div>
                    {h.ticker && (
                      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                        {h.ticker}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      color: h.platformColor,
                      background: `${h.platformColor}18`,
                      padding: '2px 7px',
                      borderRadius: 3,
                    }}>
                      {h.platform.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      padding: '2px 6px',
                      borderRadius: 3,
                    }}>
                      {ASSET_CLASS_LABELS[h.asset_class] ?? h.asset_class.toUpperCase()}
                    </span>
                  </td>
                  <td style={{
                    padding: '10px 8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                  }}>
                    {Number(h.quantity).toLocaleString('es-CL', { maximumFractionDigits: 4 })}
                  </td>
                  <td style={{
                    padding: '10px 8px',
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                  }}>
                    {formatCompact(h.current_value_clp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
