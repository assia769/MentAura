import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// GET /api/groups/[id]/members
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db    = await getDb()
    const group = await db
      .collection('groupeetudes')
      .findOne({ _id: new ObjectId(params.id) })

    if (!group) return NextResponse.json({ error: 'Groupe introuvable' }, { status: 404 })

    return NextResponse.json({ members: group['membres'] ?? [] })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/groups/[id]/members  ← quitter le groupe
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = await getDb()

    const update = {
      $pull: { membres: { userId: new ObjectId(userId) } }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

    await db.collection('groupeetudes').updateOne(
      { _id: new ObjectId(params.id) },
      update
    )

    return NextResponse.json({ message: 'Vous avez quitté le groupe' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}