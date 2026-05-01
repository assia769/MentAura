import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = await getDb()
    const userObjId = new ObjectId(userId)

    // Récupérer toutes les matières de l'user
    const matieres = await db
      .collection('matieres')
      .find({ userId: userObjId })
      .toArray()

    // Pour chaque matière, compter les sessions et heures réalisées
    const subjectsStats = await Promise.all(
      matieres.map(async (matiere) => {
        const sessions = await db
          .collection('sessionetudes')
          .find({ userId: userObjId, matiereId: matiere._id })
          .toArray()

        const sessionsRealisees = sessions.filter(s => s.statut === 'realisee')
        const heuresRealisees   = sessionsRealisees.reduce(
          (acc, s) => acc + (s.heuresRealisees ?? 0), 0
        )

        return {
          _id:                matiere._id,
          nom:                matiere.nom,
          couleur:            matiere.couleur,
          priorite:           matiere.priorite,
          totalHeuresEtudiees: matiere.totalHeuresEtudiees ?? 0,
          heuresRealisees,
          totalSessions:      sessions.length,
          sessionsRealisees:  sessionsRealisees.length,
        }
      })
    )

    return NextResponse.json({ subjects: subjectsStats })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}