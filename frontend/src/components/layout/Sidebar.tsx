'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: 'Command Center', icon: 'O' },
  { href: '/cashflow', label: 'Cashflow', icon: '<>' },
  { href: '/accounts', label: 'Accounts', icon: '$' },
  { href: '/balance-sheet', label: 'Balance Sheet', icon: '[]' },
  { href: '/investments', label: 'Investments', icon: '*' },
  { href: '/goals', label: 'Life Planning', icon: '@' },
  { href: '/household', label: 'Household', icon: '^' },
  { href: '/settings', label: 'Settings', icon: '+' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="desktop-sidebar"
      style={{
        position: 'fixed',
        top: 18,
        left: 18,
        width: 'var(--sidebar-width)',
        height: 'calc(100vh - 36px)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(251,246,239,0.9) 100%)',
        border: '1px solid rgba(255,255,255,0.68)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        padding: '0 0 24px',
        borderRadius: '30px',
        boxShadow: '0 18px 48px rgba(72, 58, 44, 0.1)',
        backdropFilter: 'blur(18px)',
      }}
    >
      <div
        style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 22px',
          borderBottom: '1px solid var(--border-dim)',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            background: 'linear-gradient(135deg, var(--accent) 0%, #58c8a0 100%)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: '#f6fff9',
            flexShrink: 0,
            boxShadow: '0 10px 24px rgba(31, 157, 114, 0.26)',
          }}
        >
          fo
        </div>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
            }}
          >
            Financial OS
          </div>
          <div
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em',
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
            }}
          >
            personal wealth system
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.12em',
            color: 'var(--text-tertiary)',
            padding: '4px 10px 10px',
            textTransform: 'uppercase',
          }}
        >
          Modules
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 12px',
                borderRadius: 14,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(31,157,114,0.14) 0%, rgba(31,157,114,0.06) 100%)'
                  : 'transparent',
                border: `1px solid ${isActive ? 'rgba(31,157,114,0.16)' : 'transparent'}`,
                color: isActive ? 'var(--accent-strong)' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 10px 18px rgba(31,157,114,0.08)' : 'none',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  opacity: isActive ? 1 : 0.7,
                  width: 18,
                  textAlign: 'center',
                }}
              >
                {item.icon}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontFamily: 'var(--font-body)',
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: '0.01em',
                }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      <div
        style={{
          padding: '0 22px',
          borderTop: '1px solid var(--border-dim)',
          paddingTop: 16,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)',
            letterSpacing: '0.08em',
          }}
        >
          v1.0.0 - personal cockpit
        </div>
      </div>
      <style jsx>{`
        @media (max-width: 900px) {
          .desktop-sidebar {
            position: fixed;
            left: 12px;
            right: 12px;
            bottom: 12px;
            top: auto;
            width: auto;
            height: auto;
            border-radius: 20px;
            padding: 8px 8px 10px;
            z-index: 80;
          }

          .desktop-sidebar > div:first-child {
            display: none;
          }

          .desktop-sidebar nav {
            flex-direction: row;
            overflow-x: auto;
            gap: 6px;
            padding: 6px 2px;
            scrollbar-width: none;
          }

          .desktop-sidebar nav::-webkit-scrollbar {
            display: none;
          }

          .desktop-sidebar nav a {
            min-width: 88px;
            padding: 10px 8px;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            gap: 4px;
          }

          .desktop-sidebar nav a span:last-child {
            font-size: 10px;
            line-height: 1.15;
          }

          .desktop-sidebar > div:last-child {
            display: none;
          }
        }
      `}</style>
    </aside>
  )
}
