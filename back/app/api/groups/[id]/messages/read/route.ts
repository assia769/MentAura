import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// POST : Marquer tous les messages d'un groupe comme lus
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = await getDb()
    const userObjId = new ObjectId(userId)

   await db.collection('messages').updateMany(
  {
    groupeId: new ObjectId(params.id),
    auteurId: { $ne: userObjId },
    'readBy.userId': { $ne: userObjId }
  },
  [
    {
      $set: {
        readBy: {
          $concatArrays: [
            '$readBy',
            [{ userId: userObjId, readAt: new Date() }]
          ]
        }
      }
    }
  ]
)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[messages/read] POST error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}