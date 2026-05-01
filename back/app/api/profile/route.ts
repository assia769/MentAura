import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db   = await getDb()
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { passwordHash: 0, emailVerificationToken: 0 } }
    )

    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    return NextResponse.json({ profile: user })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { nom, prenom, bio, avatarUrl } = body as {
      nom?: string; prenom?: string; bio?: string; avatarUrl?: string
    }

    const db = await getDb()
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          ...(nom       !== undefined && { nom }),
          ...(prenom    !== undefined && { prenom }),
          ...(bio       !== undefined && { bio }),
          ...(avatarUrl !== undefined && { avatarUrl }),
          updatedAt: new Date(),
        },
      }
    )

    const updated = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { passwordHash: 0, emailVerificationToken: 0 } }
    )

    return NextResponse.json({ profile: updated })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}