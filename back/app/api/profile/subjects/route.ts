import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

interface SubjectBody {
  nom: string
  couleur?: string
  priorite?: 'haute' | 'moyenne' | 'faible'
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db       = await getDb()
    const subjects = await db
      .collection('matieres')
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({ subjects })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as SubjectBody
    const { nom, couleur, priorite } = body

    if (!nom) return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })

    const db      = await getDb()
    const subject = {
      userId:              new ObjectId(userId),
      nom,
      couleur:             couleur  ?? '#6366f1',
      priorite:            priorite ?? 'moyenne',
      totalHeuresEtudiees: 0,
      createdAt:           new Date(),
      updatedAt:           new Date(),
    }

    const result = await db.collection('matieres').insertOne(subject)
    return NextResponse.json(
      { subject: { ...subject, _id: result.insertedId } },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}