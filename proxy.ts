import { NextRequest, NextResponse } from 'next/server'

/** Prevent the browser from caching the response (back-button protection). */
function setNoCacheHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate',
  )
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  return response
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasRefreshToken = request.cookies.has('refresh_token')

  console.log('Middleware executed for:', pathname, 'Has refresh token:', hasRefreshToken)

  // root redirect
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/dashboard') && !hasRefreshToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if ((pathname === '/login' || pathname === '/register') && hasRefreshToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const response = NextResponse.next()

  // Add no-cache headers to all protected dashboard routes so the browser
  // never serves a stale page from its bfcache / disk cache after logout.
  if (pathname.startsWith('/dashboard')) {
    setNoCacheHeaders(response)
  }

  return response
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/login', '/register'],
}
