import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// GET /api/profile/subjects
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db       = await getDb()
    const subjects = await db
      .collection('subjects')
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({ subjects })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/profile/subjects
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, color, weeklyGoalHours, priority } = body

    if (!name) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })
    }

    const db      = await getDb()
    const subject = {
      userId:           new ObjectId(userId),
      name,
      color:            color    ?? '#6366f1',
      weeklyGoalHours:  weeklyGoalHours ?? 0,
      priority:         priority ?? 'medium',   // low | medium | high
      createdAt:        new Date(),
      updatedAt:        new Date(),
    }

    const result = await db.collection('subjects').insertOne(subject)

    return NextResponse.json(
      { subject: { ...subject, _id: result.insertedId } },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}