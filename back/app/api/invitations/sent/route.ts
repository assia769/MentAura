import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// GET /api/invitations/sent  — invitations ENVOYÉES (par inviteurId)
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = await getDb()

    const invitations = await db
      .collection('invitations')
      .find({ inviteurId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray()

    const enriched = await Promise.all(
      invitations.map(async (inv) => {
        let groupeNom = 'Groupe inconnu'

        try {
          const groupe = await db
            .collection('groupeetudes')
            .findOne(
              { _id: new ObjectId(inv.groupeId.toString()) },
              { projection: { nom: 1 } }
            )
          if (groupe) groupeNom = groupe.nom
        } catch { /* groupeId invalide */ }

        return {
          _id:         inv._id.toString(),
          groupeId:    inv.groupeId.toString(),
          groupeNom,
          inviteurId:  inv.inviteurId?.toString() ?? '',
          inviteEmail: inv.inviteEmail,
          statut:      inv.statut,
          expiresAt:   inv.expiresAt,
          createdAt:   inv.createdAt,
        }
      })
    )

    return NextResponse.json({ invitations: enriched })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}