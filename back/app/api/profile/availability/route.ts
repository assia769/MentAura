import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// ── Type ──────────────────────────────────────────────────────
interface AvailabilitySlot {
  jourSemaine: 'lun' | 'mar' | 'mer' | 'jeu' | 'ven' | 'sam' | 'dim'
  heureDebut:  string
  heureFin:    string
  recurrente:  boolean
}

// GET /api/profile/availability
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = await getDb()
    const availability = await db
      .collection('disponibilites')
      .find({ userId: new ObjectId(userId) })
      .toArray()

    return NextResponse.json({ availability })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT /api/profile/availability
export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { slots } = body as { slots: AvailabilitySlot[] }

    if (!Array.isArray(slots)) {
      return NextResponse.json({ error: 'slots doit être un tableau' }, { status: 400 })
    }

    const db = await getDb()
    await db.collection('disponibilites').deleteMany({ userId: new ObjectId(userId) })

    if (slots.length > 0) {
      await db.collection('disponibilites').insertMany(
        slots.map((s: AvailabilitySlot) => ({
          ...s,
          userId:    new ObjectId(userId),
          createdAt: new Date(),
        }))
      )
    }

    const availability = await db
      .collection('disponibilites')
      .find({ userId: new ObjectId(userId) })
      .toArray()

    return NextResponse.json({ message: 'Disponibilités mises à jour', availability })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}