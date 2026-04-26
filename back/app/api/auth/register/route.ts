import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/mongodb'
import { signAccessToken, signRefreshToken } from '@/lib/jwt'
import { verifyCaptcha } from '@/lib/captcha'
import { auditLog } from '@/lib/audit'

// À ajouter en haut de route.ts (login ET register)
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
    const { nom, prenom, email, password, captchaToken } = body

    // ── 1. Validate inputs ──────────────────────────────────────────────
    if (!nom || !prenom || !email || !password || !captchaToken) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Mot de passe trop court (min 8)' }, { status: 400 })
    }

    // ── 2. Verify reCAPTCHA ─────────────────────────────────────────────
    const captchaOk = await verifyCaptcha(captchaToken)
    if (!captchaOk) {
      await auditLog({ action: 'CAPTCHA_FAILED', ipAddress: ip, userAgent })
      return NextResponse.json({ error: 'Captcha invalide' }, { status: 400 })
    }

    const db = await getDb()
    const users = db.collection('users')

    // ── 3. Check email uniqueness ───────────────────────────────────────
    const existing = await users.findOne({ email: email.toLowerCase() })
    if (existing) {
      return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })
    }

    // ── 4. Hash password ────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 12)

    // ── 5. Create user ──────────────────────────────────────────────────
    const now = new Date()
    const result = await users.insertOne({
      nom,
      prenom,
      email: email.toLowerCase(),
      passwordHash,
      role: 'student',
      isEmailVerified: false,
      emailVerificationToken: null,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now
    })

    const userId = result.insertedId.toString()

    // ── 6. Issue tokens ─────────────────────────────────────────────────
    const payload = { userId, email: email.toLowerCase(), role: 'student' as const }
    const accessToken  = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    // Store refresh token
    await db.collection('refreshtokens').insertOne({
      userId: result.insertedId,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: now
    })

    await auditLog({ userId, action: 'REGISTER', ipAddress: ip, userAgent })

    return NextResponse.json(
      { accessToken, refreshToken, role: 'student', userId },
      { status: 201 }
    )
  } catch (err) {
    console.error('[Register]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}