import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

interface SubjectUpdateBody {
  nom?: string
  couleur?: string
  priorite?: 'haute' | 'moyenne' | 'faible'
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as SubjectUpdateBody
    const { nom, couleur, priorite } = body

    const db     = await getDb()
    const result = await db.collection('matieres').updateOne(
      { _id: new ObjectId(params.id), userId: new ObjectId(userId) },
      {
        $set: {
          ...(nom      !== undefined && { nom }),
          ...(couleur  !== undefined && { couleur }),
          ...(priorite !== undefined && { priorite }),
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db     = await getDb()
    const result = await db.collection('matieres').deleteOne({
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