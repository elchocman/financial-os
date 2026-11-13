'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { syncPortfolio } from '@/lib/api'
import { clearToken } from '@/lib/auth'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Command Center',
  '/cashflow': 'Cashflow Engine',
  '/balance-sheet': 'Balance Sheet',
  '/investments': 'Investments Engine',
  '/goals': 'Life Planning',
  '/household': 'Household',
  '/settings': 'Integrations',
}

export default function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const title = PAGE_TITLES[pathname] ?? 'Financial OS'

  async function handleSync() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const result = await syncPortfolio()
      setSyncMsg(result.success ? 'Synced' : 'Sync failed')
    } catch {
      setSyncMsg('Connection error')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 3000)
    }
  }

  function handleLogout() {
    clearToken()
    router.push('/login')
  }

  return (
    <header
      className="topbar-shell"
      style={{
        position: 'fixed',
        top: 18,
        left: 'calc(var(--sidebar-width) + 36px)',
        right: 18,
        height: 'var(--topbar-height)',
        background: 'rgba(255,255,255,0.62)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.68)',
        borderRadius: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        zIndex: 40,
        boxShadow: '0 14px 36px rgba(72, 58, 44, 0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 24,
              letterSpacing: '-0.04em',
              color: 'var(--text-primary)',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
              letterSpacing: '0.06em',
            }}
          >
            CLP - financial overview
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {syncMsg && (
          <span
            style={{
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              color: syncMsg === 'Synced' ? 'var(--gain)' : 'var(--loss)',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            {syncMsg}
          </span>
        )}

        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: syncing ? 'rgba(95,108,101,0.08)' : 'rgba(31,157,114,0.1)',
            border: '1px solid rgba(31,157,114,0.18)',
            borderRadius: 999,
            color: syncing ? 'var(--text-secondary)' : 'var(--accent-strong)',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            letterSpacing: '0.04em',
            cursor: syncing ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ display: 'inline-block', animation: syncing ? 'spin 1s linear infinite' : 'none' }}>O</span>
          {syncing ? 'SYNCING' : 'SYNC'}
        </button>

        <button
          onClick={handleLogout}
          style={{
            padding: '10px 16px',
            background: 'rgba(255,255,255,0.88)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 999,
            color: 'var(--text-primary)',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          LOGOUT
        </button>
      </div>

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 900px) {
          .topbar-shell {
            left: 12px !important;
            right: 12px !important;
            top: 12px !important;
            height: auto !important;
            min-height: 68px;
            padding: 14px 16px !important;
            border-radius: 22px;
            align-items: flex-start;
            gap: 12px;
          }

          .topbar-shell > div:first-child {
            flex: 1;
          }

          .topbar-shell > div:first-child > div:first-child {
            font-size: 20px !important;
          }

          .topbar-shell > div:last-child {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .topbar-shell > div:last-child > span {
            display: none;
          }

          .topbar-shell > div:last-child > button {
            padding: 8px 10px !important;
            font-size: 10px !important;
          }
        }
      `}</style>
    </header>
  )
}
