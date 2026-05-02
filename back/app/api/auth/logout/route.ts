import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { verifyRefreshToken } from '@/lib/jwt'
import { auditLog } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const ip        = req.headers.get('x-forwarded-for') ?? 'unknown'
  const userAgent = req.headers.get('user-agent') ?? ''

  try {
    const { refreshToken } = await req.json()
    if (!refreshToken) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
    }

    let userId: string | undefined
    try {
      const p = await verifyRefreshToken(refreshToken)
      userId = p.userId
    } catch { /* expired token – still delete */ }

    const db = await getDb()
    await db.collection('refreshtokens').deleteOne({ token: refreshToken })
    await auditLog({ userId, action: 'LOGOUT', ipAddress: ip, userAgent })

    return NextResponse.json({ message: 'Déconnecté' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}