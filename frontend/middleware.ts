import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// List of protected routes that require authentication
const protectedRoutes = [
  '/',
  '/dashboard',
  '/balance-sheet',
  '/investments',
  '/cashflow',
  '/goals',
  '/household',
  '/settings',
]

// Public routes that don't require authentication
const publicRoutes = ['/login', '/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next()
  }

  // Check if the current route requires authentication
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )

  if (isProtectedRoute) {
    // Get auth token from request
    // Browser will send Authorization header, or we check a cookie fallback
    const authHeader = request.headers.get('Authorization')
    const tokenCookie = request.cookies.get('financial_os_token')?.value

    const hasToken = authHeader?.startsWith('Bearer ') || tokenCookie

    if (!hasToken) {
      // Redirect to login if no token
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
