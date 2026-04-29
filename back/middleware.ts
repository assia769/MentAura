import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from './lib/jwt'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (req.method === 'OPTIONS') return NextResponse.next()
  if (pathname.startsWith('/api/auth')) return NextResponse.next()

  const isProtected =
    pathname.startsWith('/api/profile') ||
    pathname.startsWith('/api/groups') ||
    pathname.startsWith('/api/invitations') ||
    pathname.startsWith('/api/analytics') ||
    pathname.startsWith('/api/sessions') ||
    pathname.startsWith('/api/notifications') ||
    pathname.startsWith('/api/settings') ||
    pathname.startsWith('/api/admin')

  if (!isProtected) return NextResponse.next()

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await verifyAccessToken(token)

    if (pathname.startsWith('/api/admin') && payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-user-id', payload.userId)
    requestHeaders.set('x-user-email', payload.email)
    requestHeaders.set('x-user-role', payload.role)

    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch (e) {
    console.log('[middleware] ❌ token invalide:', (e as Error).message)
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}

export const config = {
  matcher: [
    '/api/profile/:path*',
    '/api/groups/:path*',
    '/api/invitations/:path*',
    '/api/analytics/:path*',
    '/api/sessions/:path*',
    '/api/notifications/:path*',
    '/api/settings/:path*',
    '/api/admin/:path*'
  ]
}