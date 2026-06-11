import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from './lib/jwt'

const ORIGIN = process.env.FRONTEND_URL ?? 'http://localhost:4200'

function withCors(res: NextResponse): NextResponse {
  res.headers.set('Access-Control-Allow-Origin',      ORIGIN)
  res.headers.set('Access-Control-Allow-Credentials', 'true')
  return res
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Preflight — répondre immédiatement avec CORS
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin':      ORIGIN,
        'Access-Control-Allow-Methods':     'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers':     'Content-Type, Authorization, x-user-id',
        'Access-Control-Allow-Credentials': 'true',
      },
    })
  }

  if (pathname.startsWith('/api/auth')) return withCors(NextResponse.next())

  const isProtected =
    pathname.startsWith('/api/profile')       ||
    pathname.startsWith('/api/groups')        ||
    pathname.startsWith('/api/invitations')   ||
    pathname.startsWith('/api/analytics')     ||
    pathname.startsWith('/api/sessions')      ||
    pathname.startsWith('/api/objectifs')     ||
    pathname.startsWith('/api/notifications') ||
    pathname.startsWith('/api/settings')      ||
    pathname.startsWith('/api/admin')

  if (!isProtected) return withCors(NextResponse.next())

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

  if (!token) {
    return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
  }

  try {
    const payload = await verifyAccessToken(token)

    if (pathname.startsWith('/api/admin') && payload.role !== 'admin') {
      return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
    }

    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-user-id',    payload.userId)
    requestHeaders.set('x-user-email', payload.email)
    requestHeaders.set('x-user-role',  payload.role)

    return withCors(NextResponse.next({ request: { headers: requestHeaders } }))
  } catch (e) {
    console.log('[middleware] ❌ token invalide:', (e as Error).message)
    return withCors(NextResponse.json({ error: 'Invalid token' }, { status: 401 }))
  }
}

export const config = {
  matcher: [
    '/api/auth/:path*',
    '/api/profile/:path*',
    '/api/groups/:path*',
    '/api/invitations/:path*',
    '/api/analytics/:path*',
    '/api/sessions/:path*',
    '/api/objectifs/:path*',
    '/api/notifications/:path*',
    '/api/settings/:path*',
    '/api/admin/:path*',
  ]
}