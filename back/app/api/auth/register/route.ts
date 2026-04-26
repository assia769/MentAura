import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/mongodb'
import { verifyCaptcha } from '@/lib/captcha'
import { auditLog } from '@/lib/audit'
import { sendVerificationEmail } from '@/lib/mailer'
import crypto from 'crypto'

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

    // ── 1. Validation ───────────────────────────────────────────────────
    if (!nom || !prenom || !email || !password || !captchaToken) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Mot de passe trop court (min 8)' }, { status: 400 })
    }

    // ── 2. reCAPTCHA ────────────────────────────────────────────────────
    const captchaOk = await verifyCaptcha(captchaToken)
    if (!captchaOk) {
      await auditLog({ action: 'CAPTCHA_FAILED', ipAddress: ip, userAgent })
      return NextResponse.json({ error: 'Captcha invalide' }, { status: 400 })
    }

    const db    = await getDb()
    const users = db.collection('users')

    // ── 3. Email unicité ────────────────────────────────────────────────
    const existing = await users.findOne({ email: email.toLowerCase() })

    if (existing) {
      // Compte non vérifié → renvoyer le mail de vérification
      if (!existing.isEmailVerified) {
        const verifToken   = crypto.randomBytes(32).toString('hex')
        const verifExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

        await users.updateOne(
          { _id: existing._id },
          { $set: { emailVerificationToken: verifToken, emailVerificationExpires: verifExpires } }
        )

        try {
          await sendVerificationEmail(existing.email, existing.prenom, verifToken)
        } catch (mailErr) {
          console.error('[Register] Mail error:', mailErr)
          return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
        }

        return NextResponse.json(
          { message: 'Email de vérification renvoyé.' },
          { status: 200 }
        )
      }

      // Compte déjà vérifié → vrai conflit
      return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })
    }

    // ── 4. Hash password ────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 12)

    // ── 5. Créer l'utilisateur avec token de vérification ───────────────
    const verifToken   = crypto.randomBytes(32).toString('hex')
    const verifExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const now          = new Date()

    const result = await users.insertOne({
      nom,
      prenom,
      email: email.toLowerCase(),
      passwordHash,
      role: 'student',
      isEmailVerified: false,
      emailVerificationToken: verifToken,
      emailVerificationExpires: verifExpires,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now
    })

    // ── 6. Envoyer l'email — rollback si échec ──────────────────────────
    try {
      await sendVerificationEmail(email.toLowerCase(), prenom, verifToken)
    } catch (mailErr) {
      await users.deleteOne({ _id: result.insertedId })
      console.error('[Register] Mail error:', mailErr)
      return NextResponse.json(
        { error: 'Erreur envoi email. Vérifiez la config Gmail.' },
        { status: 500 }
      )
    }

    // ── 7. Audit + réponse ──────────────────────────────────────────────
    await auditLog({
      userId: result.insertedId.toString(),
      action: 'REGISTER',
      ipAddress: ip,
      userAgent
    })

    // Pas de tokens JWT — l'utilisateur doit d'abord vérifier son email
    return NextResponse.json(
      { message: 'Compte créé. Vérifiez votre email.' },
      { status: 201 }
    )

  } catch (err) {
    console.error('[Register]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}