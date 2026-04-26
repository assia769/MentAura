import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { auditLog } from '@/lib/audit'

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
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
    }

    const db    = await getDb()
    const users = db.collection('users')

    const user = await users.findOne({
      emailVerificationToken: token,
      isEmailVerified: false
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Lien invalide ou déjà utilisé' },
        { status: 400 }
      )
    }

    // ── Vérifier expiration (24h) ────────────────────────
    if (user.emailVerificationExpires && new Date(user.emailVerificationExpires) < new Date()) {
      return NextResponse.json(
        { error: 'Lien expiré. Demandez un nouveau.' },
        { status: 410 }
      )
    }

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
          updatedAt: new Date()
        }
      }
    )

    await auditLog({
      userId: user._id.toString(),
      action: 'EMAIL_VERIFIED',
      ipAddress: ip,
      userAgent
    })

    return NextResponse.json({ message: 'Email vérifié avec succès' })

  } catch (err) {
    console.error('[VerifyEmail]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}