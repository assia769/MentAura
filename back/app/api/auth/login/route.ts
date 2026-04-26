import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/mongodb'
import { signAccessToken, signRefreshToken } from '@/lib/jwt'
import { verifyCaptcha } from '@/lib/captcha'
import { auditLog } from '@/lib/audit'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

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
  const ip        = req.headers.get('x-forwarded-for') ?? 'unknown'
  const userAgent = req.headers.get('user-agent') ?? ''

  try {
    const body = await req.json()
    const { email, password, captchaToken } = body

    console.log('📧 Email reçu:', email)
    console.log('🔑 Token captcha:', captchaToken)

    if (!email || !password || !captchaToken) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    // ── 1. Verify reCAPTCHA ─────────────────────────────────────────────
    const captchaOk = await verifyCaptcha(captchaToken)
    console.log('✅ Captcha OK?', captchaOk)
    if (!captchaOk) {
      await auditLog({ action: 'CAPTCHA_FAILED', ipAddress: ip, userAgent })
      return NextResponse.json({ error: 'Captcha invalide' }, { status: 400 })
    }

    const db    = await getDb()
    const users = db.collection('users')

    // ── 2. Find user ────────────────────────────────────────────────────
    const user = await users.findOne({ email: email.toLowerCase() })
    console.log('👤 User trouvé?', !!user)
    if (!user) {
      await auditLog({ action: 'LOGIN_FAILED', ipAddress: ip, userAgent, details: { email } })
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })
    }

    // ── 3. Check account lock ───────────────────────────────────────────
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remaining = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000)
      return NextResponse.json(
        { error: `Compte verrouillé. Réessayez dans ${remaining} min.` },
        { status: 423 }
      )
    }

    // ── 4. Check password ───────────────────────────────────────────────
    const valid = await bcrypt.compare(password, user.passwordHash)
    console.log('🔓 Password valide?', valid)
    if (!valid) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1
      const update: Record<string, unknown> = { failedLoginAttempts: attempts, updatedAt: new Date() }

      if (attempts >= MAX_ATTEMPTS) {
        update.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
        await auditLog({ userId: user._id.toString(), action: 'ACCOUNT_LOCKED', ipAddress: ip, userAgent })
      }

      await users.updateOne({ _id: user._id }, { $set: update })
      await auditLog({ userId: user._id.toString(), action: 'LOGIN_FAILED', ipAddress: ip, userAgent })

      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })
    }

    // ── 5. Reset failed attempts ────────────────────────────────────────
    await users.updateOne(
      { _id: user._id },
      { $set: { failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() } }
    )

    // ── 6. Issue tokens ─────────────────────────────────────────────────
    const userId   = user._id.toString()
    const userRole = user.role as 'admin' | 'student'
    const payload  = { userId, email: user.email, role: userRole }

    const accessToken  = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    await db.collection('refreshtokens').insertOne({
      userId: new ObjectId(userId),
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date()
    })

    await auditLog({ userId, action: 'LOGIN_SUCCESS', ipAddress: ip, userAgent })

    return NextResponse.json({
      accessToken,
      refreshToken,
      role: userRole,
      userId,
      email: user.email
    })

  } catch (err) {
    console.error('[Login]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}