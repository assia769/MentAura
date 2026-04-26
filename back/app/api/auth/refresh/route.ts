import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken, signAccessToken } from '@/lib/jwt'
import { getDb } from '@/lib/mongodb'
import { auditLog } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const ip        = req.headers.get('x-forwarded-for') ?? 'unknown'
  const userAgent = req.headers.get('user-agent') ?? ''

  try {
    const { refreshToken } = await req.json()
    if (!refreshToken) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
    }

    // Verify signature
    const payload = verifyRefreshToken(refreshToken)

    // Check token exists in DB (not revoked)
    const db  = await getDb()
    const doc = await db.collection('refreshtokens').findOne({ token: refreshToken })
    if (!doc) {
      return NextResponse.json({ error: 'Token révoqué' }, { status: 401 })
    }

    // Issue new access token
    const accessToken = signAccessToken({
      userId: payload.userId,
      email:  payload.email,
      role:   payload.role
    })

    await auditLog({ userId: payload.userId, action: 'TOKEN_REFRESH', ipAddress: ip, userAgent })

    return NextResponse.json({ accessToken })
  } catch {
    return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
  }
}