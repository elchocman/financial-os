'use client'

import { useEffect, useState } from 'react'
import Card, { CardHeader } from '@/components/ui/Card'
import HoldingsTable from '@/components/dashboard/HoldingsTable'
import AllocationChart from '@/components/charts/AllocationChart'
import PlatformCards from '@/components/dashboard/PlatformCards'
import PnLTable from '@/components/dashboard/PnLTable'
import { getPortfolio, getPortfolioAllocation, getPortfolioPerformance } from '@/lib/api'
import { formatCompact, formatCLP } from '@/lib/formatters'
import type { PortfolioSummary, PortfolioAllocation, PortfolioPerformance } from '@/types'

export default function InvestmentsPage() {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null)
  const [allocation, setAllocation] = useState<PortfolioAllocation | null>(null)
  const [performance, setPerformance] = useState<PortfolioPerformance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getPortfolio(),
      getPortfolioAllocation(),
      getPortfolioPerformance(),
    ])
      .then(([p, a, perf]) => {
        setPortfolio(p)
        setAllocation(a)
        setPerformance(perf)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Total portfolio value */}
      {portfolio && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 600, color: 'var(--text-primary)' }}>
            {formatCompact(portfolio.total_clp)}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-tertiary)' }}>
            {formatCLP(portfolio.total_clp)} total
          </span>
        </div>
      )}

      {/* Platform cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        <PlatformCards platforms={portfolio?.platforms ?? []} loading={loading} />
      </div>

      {/* PnL table - full width */}
      <PnLTable data={performance} loading={loading} />

      {/* Holdings + allocation */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 16, alignItems: 'start' }}>
        <HoldingsTable platforms={portfolio?.platforms ?? []} loading={loading} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <AllocationChart data={allocation} loading={loading} />
          {allocation && (
            <Card>
              <CardHeader label="By Asset Class" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {allocation.by_asset_class.map((item, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.label}</span>
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {item.percentage}%
                      </span>
                    </div>
                    <div style={{ height: 3, background: 'var(--border-dim)', borderRadius: 2 }}>
                      <div style={{
                        height: '100%',
                        width: `${item.percentage}%`,
                        background: item.color ?? 'var(--accent)',
                        borderRadius: 2,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
