import { NextRequest, NextResponse } from 'next/server'
import { authenticator } from 'otplib'
import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/mongodb'
import { signAccessToken, signRefreshToken } from '@/lib/jwt'
import { auditLog } from '@/lib/audit'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:4200',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const userAgent = req.headers.get('user-agent') ?? ''

  try {
    const { userId, code } = await req.json()

    if (!userId || !code) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    const db = await getDb()

    // ── MFA CONFIG ───────────────────────────────
    const mfa = await db.collection('mfaconfigs').findOne({
      userId: new ObjectId(userId),
      isEnabled: true,
      method: 'totp'
    })

    if (!mfa?.totpSecret) {
      return NextResponse.json({ error: 'MFA non configuré' }, { status: 404 })
    }

    // ── VERIFY OTP (avec fenêtre tolérance) ───────
    const isValid = authenticator.check(code, mfa.totpSecret)

    if (!isValid) {
      await auditLog({
        userId,
        action: 'MFA_FAILED',
        ipAddress: ip,
        userAgent
      })

      return NextResponse.json(
        { error: 'Code MFA invalide' },
        { status: 401 }
      )
    }

    // ── UPDATE LAST USED ──────────────────────────
    await db.collection('mfaconfigs').updateOne(
      { _id: mfa._id },
      { $set: { lastUsedAt: new Date() } }
    )

    // ── GET USER ───────────────────────────────────
    const user = await db.collection('users').findOne({
      _id: new ObjectId(userId)
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur introuvable' },
        { status: 404 }
      )
    }

    const payload = {
      userId,
      email: user.email,
      role: user.role as 'admin' | 'student'
    }

    // ── TOKENS ─────────────────────────────────────
    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    await db.collection('refreshtokens').insertOne({
      userId: new ObjectId(userId),
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date()
    })

    await auditLog({
      userId,
      action: 'MFA_SUCCESS',
      ipAddress: ip,
      userAgent
    })

    return NextResponse.json({
      accessToken,
      refreshToken,
      role: user.role,
      userId
    })

  } catch (err) {
    console.error('[MFA Verify]', err)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}