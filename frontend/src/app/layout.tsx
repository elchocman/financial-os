import type { Metadata } from 'next'
import './globals.css'
import { ProtectedLayout } from './ProtectedLayout'

export const metadata: Metadata = {
  title: 'Financial OS',
  description: 'Personal Financial Command Center',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ProtectedLayout>{children}</ProtectedLayout>
      </body>
    </html>
  )
}
