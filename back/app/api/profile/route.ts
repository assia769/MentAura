import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

const CORS = {
  'Access-Control-Allow-Origin':  'http://localhost:4200',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// GET /api/profile
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
    }

    const db   = await getDb()
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { passwordHash: 0, emailVerificationToken: 0 } }
    )

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404, headers: CORS })
    }

    return NextResponse.json({ profile: user }, { headers: CORS })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500, headers: CORS })
  }
}

// PUT /api/profile
export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
    }

    const body = await req.json()
    const { nom, prenom, bio, avatarUrl } = body

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

    return NextResponse.json({ profile: updated }, { headers: CORS })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500, headers: CORS })
  }
}