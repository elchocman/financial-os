'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'

const publicRoutes = ['/login', '/register']

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Check if route is public
    const isPublicRoute = publicRoutes.includes(pathname)

    if (!isPublicRoute && !isAuthenticated()) {
      router.push('/login')
    } else {
      setIsReady(true)
    }
  }, [pathname, router])

  // Don't render if checking auth (prevent flash)
  if (!isReady) {
    return <div />
  }

  const isPublicRoute = publicRoutes.includes(pathname)

  if (isPublicRoute) {
    return <>{children}</>
  }

  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      <div className="desktop-sidebar-shell">
        <Sidebar />
      </div>
      <div
        className="app-main-shell"
        style={{
          flex: 1,
          marginLeft: 'calc(var(--sidebar-width) + 36px)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <Topbar />
        <main
          className="app-main-content"
          style={{
            flex: 1,
            padding: '32px 36px 40px',
            paddingTop: `calc(var(--topbar-height) + 32px)`,
            maxWidth: 1400,
            width: '100%',
            position: 'relative',
          }}
        >
          {children}
        </main>
      </div>
      <style jsx>{`
        @media (max-width: 900px) {
          .app-shell {
            display: block !important;
          }

          .desktop-sidebar-shell {
            display: block;
          }

          .app-main-shell {
            margin-left: 0 !important;
            min-height: auto;
          }

          .app-main-content {
            padding: 12px 12px 96px !important;
            padding-top: calc(var(--topbar-height) + 24px) !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  )
}
