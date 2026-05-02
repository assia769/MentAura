import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

interface GroupBody {
  nom:        string
  maxMembres?: number
  isPublic?:  boolean
}

// GET /api/groups
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db     = await getDb()
    const groups = await db
      .collection('groupeetudes')
      .find({ 'membres.userId': new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({ groups })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/groups
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as GroupBody
    const { nom, maxMembres, isPublic } = body

    if (!nom) return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })

    const db    = await getDb()
    const group = {
      nom,
      createurId:     new ObjectId(userId),
      membres: [{
        userId:   new ObjectId(userId),
        role:     'admin',
        joinedAt: new Date()
      }],
      maxMembres:     maxMembres ?? 10,
      isPublic:       isPublic   ?? true,
      codeInvitation: Math.random().toString(36).substring(2, 10).toUpperCase(),
      createdAt:      new Date()
    }

    const result = await db.collection('groupeetudes').insertOne(group)
    return NextResponse.json(
      { group: { ...group, _id: result.insertedId } },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}