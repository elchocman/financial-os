'use client'

import { useEffect, useState, useCallback } from 'react'
import NetWorthCard from '@/components/dashboard/NetWorthCard'
import PlatformCards from '@/components/dashboard/PlatformCards'
import HoldingsTable from '@/components/dashboard/HoldingsTable'
import NetWorthChart from '@/components/charts/NetWorthChart'
import AllocationChart from '@/components/charts/AllocationChart'
import Card from '@/components/ui/Card'
import { getDashboard, getNetWorthChart, getPortfolio, getPortfolioAllocation } from '@/lib/api'
import { formatCompact, formatCLP, isPositive } from '@/lib/formatters'
import type { DashboardKPIs, NetWorthSnapshot, PortfolioSummary, PortfolioAllocation } from '@/types'

export default function CommandCenter() {
  const [kpis, setKpis]           = useState<DashboardKPIs | null>(null)
  const [chart, setChart]         = useState<NetWorthSnapshot[]>([])
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null)
  const [allocation, setAllocation] = useState<PortfolioAllocation | null>(null)
  const [chartDays, setChartDays] = useState(90)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [kpisData, portfolioData, allocationData] = await Promise.all([
        getDashboard(), getPortfolio(), getPortfolioAllocation(),
      ])
      setKpis(kpisData); setPortfolio(portfolioData); setAllocation(allocationData)
    } catch (e: any) { setError(e.message ?? 'Failed to load data') }
    finally { setLoading(false) }
  }, [])

  const fetchChart = useCallback(async (days: number) => {
    try { setChart(await getNetWorthChart(days)) } catch {}
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])
  useEffect(() => { fetchChart(chartDays) }, [fetchChart, chartDays])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {error && (
        <div style={{ background: 'var(--loss-dim)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 'var(--r-md)', padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--loss)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⚠</span><span>{error}</span>
          <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)', fontSize: 11 }}>Backend: {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}</span>
        </div>
      )}

      {/* Row 1: Net Worth hero + Chart */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'start' }}>
        <NetWorthCard data={kpis} loading={loading} />
        <NetWorthChart data={chart} loading={loading} activeDays={chartDays} onChangeDays={days => setChartDays(days)} />
      </section>

      {/* Row 2: Cashflow KPIs (shown when transactions exist) */}
      {(kpis?.monthly_income || kpis?.savings_rate != null || loading) && (
        <section>
          <SectionLabel>Cashflow — This Month</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {[
              { label: 'Monthly Income',   value: kpis?.monthly_income,   color: 'var(--gain)',   fmt: formatCompact },
              { label: 'Monthly Expenses', value: kpis?.monthly_expenses, color: 'var(--loss)',   fmt: formatCompact },
              { label: 'Net Saved',        value: kpis?.monthly_income != null && kpis?.monthly_expenses != null ? (Number(kpis.monthly_income) - Number(kpis.monthly_expenses)) : null,
                                           color: isPositive(kpis?.monthly_income != null && kpis?.monthly_expenses != null ? Number(kpis.monthly_income) - Number(kpis.monthly_expenses) : 0) ? 'var(--gain)' : 'var(--loss)', fmt: formatCompact },
              { label: 'Savings Rate',     value: kpis?.savings_rate,     color: isPositive(kpis?.savings_rate ?? 0) ? 'var(--gain)' : 'var(--loss)', fmt: (v: number) => `${v.toFixed(1)}%` },
            ].map((kpi, i) => (
              <Card key={kpi.label} delay={i * 40} style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '0.1em', marginBottom: 8 }}>{kpi.label.toUpperCase()}</div>
                {loading
                  ? <div className="skeleton" style={{ height: 24 }} />
                  : kpi.value != null
                    ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: kpi.color }}>{kpi.fmt(Number(kpi.value))}</div>
                    : <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>Add transactions</div>
                }
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Row 3: Platforms */}
      <section>
        <SectionLabel>Platforms</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          <PlatformCards platforms={portfolio?.platforms ?? []} loading={loading} />
        </div>
      </section>

      {/* Row 4: Holdings + Allocation */}
      <section style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 16, alignItems: 'start' }}>
        <HoldingsTable platforms={portfolio?.platforms ?? []} loading={loading} />
        <AllocationChart data={allocation} loading={loading} />
      </section>

    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--text-tertiary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ display: 'inline-block', width: 16, height: 1, background: 'var(--border-base)' }} />
      {children}
      <span style={{ flex: 1, height: 1, background: 'var(--border-dim)' }} />
    </div>
  )
}
