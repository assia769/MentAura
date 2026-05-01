import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// GET /api/invitations
export async function GET(req: NextRequest) {
  try {
    const userId      = req.headers.get('x-user-id')
    const userEmail   = req.headers.get('x-user-email')
    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = await getDb()

    // Récupérer les invitations par email
    const invitations = await db
      .collection('invitations')
      .find({ inviteEmail: userEmail })
      .sort({ createdAt: -1 })
      .toArray()

    // Enrichir avec le nom du groupe
    const enriched = await Promise.all(
      invitations.map(async (inv) => {
        const groupe = await db
          .collection('groupeetudes')
          .findOne(
            { _id: inv.groupeId },
            { projection: { nom: 1 } }
          )
        return { ...inv, groupeNom: groupe?.nom ?? 'Groupe inconnu' }
      })
    )

    return NextResponse.json({ invitations: enriched })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}