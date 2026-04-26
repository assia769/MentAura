// import { NextRequest, NextResponse } from 'next/server'
// import { verifyAccessToken } from './lib/jwt'

// // Routes that require authentication
// const PROTECTED = ['/api/admin', '/api/user']

// export function middleware(req: NextRequest) {
//   const { pathname } = req.nextUrl

//   const needsAuth = PROTECTED.some(p => pathname.startsWith(p))
//   if (!needsAuth) return NextResponse.next()

//   const authHeader = req.headers.get('authorization') ?? ''
//   const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

//   if (!token) {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//   }

//   try {
//     const payload = verifyAccessToken(token)

//     // Admin-only routes
//     if (pathname.startsWith('/api/admin') && payload.role !== 'admin') {
//       return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
//     }

//     const headers = new Headers(req.headers)
//     headers.set('x-user-id',    payload.userId)
//     headers.set('x-user-email', payload.email)
//     headers.set('x-user-role',  payload.role)

//     return NextResponse.next({ request: { headers } })
//   } catch {
//     return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
//   }
// }

// export const config = {
//   matcher: ['/api/admin/:path*', '/api/user/:path*']
// }
import { NextRequest, NextResponse } from 'next/server'

export function proxy(req: NextRequest) {
  return NextResponse.next()
}