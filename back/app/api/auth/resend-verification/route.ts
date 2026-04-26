import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../../lib/mongodb'
import { sendVerificationEmail } from '../../../../lib/mailer'
import { auditLog } from '../../../../lib/audit'
import crypto from 'crypto'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:4200',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function POST(req: NextRequest) {
  const ip        = req.headers.get('x-forwarded-for') ?? 'unknown'
  const userAgent = req.headers.get('user-agent') ?? ''

  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    const db   = await getDb()
    const user = await db.collection('users').findOne({ email: email.toLowerCase() })

    // Réponse générique même si email inconnu (sécurité anti-énumération)
    if (!user || user.isEmailVerified) {
      return NextResponse.json({ message: 'Si ce compte existe, un email a été envoyé.' })
    }

    // ── Nouveau token ────────────────────────────────────
    const token   = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerificationToken: token,
          emailVerificationExpires: expires,
          updatedAt: new Date()
        }
      }
    )

    await sendVerificationEmail(user.email, user.prenom, token)

    await auditLog({
      userId: user._id.toString(),
      action: 'RESEND_VERIFICATION',
      ipAddress: ip,
      userAgent
    })

    return NextResponse.json({ message: 'Email de vérification renvoyé.' })

  } catch (err) {
    console.error('[ResendVerification]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}