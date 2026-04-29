import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// PUT /api/profile/subjects/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, color, weeklyGoalHours, priority } = body

    const db = await getDb()
    const result = await db.collection('subjects').updateOne(
      {
        _id:    new ObjectId(params.id),
        userId: new ObjectId(userId),       // sécurité : la matière doit appartenir à l'user
      },
      {
        $set: {
          ...(name             !== undefined && { name }),
          ...(color            !== undefined && { color }),
          ...(weeklyGoalHours  !== undefined && { weeklyGoalHours }),
          ...(priority         !== undefined && { priority }),
          updatedAt: new Date(),
        },
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Matière introuvable' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Matière mise à jour' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/profile/subjects/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = await getDb()
    const result = await db.collection('subjects').deleteOne({
      _id:    new ObjectId(params.id),
      userId: new ObjectId(userId),
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Matière introuvable' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Matière supprimée' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}