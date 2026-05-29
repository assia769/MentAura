import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params

  try {
    const db = await getDb()
    const userObjId = new ObjectId(userId)
    const sessionObjId = new ObjectId(id)

    const session = await db.collection('sessionetudes').findOne({
      _id: sessionObjId,
      userId: userObjId
    })

    if (!session) {
      return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
    }
    if (session.statut !== 'planifiee') {
      return NextResponse.json({ error: 'La session est déjà démarrée ou terminée' }, { status: 409 })
    }

    await db.collection('sessionetudes').updateOne(
      { _id: sessionObjId },
      { $set: { statut: 'en_cours' } }
    )

    await db.collection('notifications').insertOne({
      destinataireId: userObjId,
      type: 'rappel_session',
      titre: 'Session démarrée',
      contenu: `La session "${session.titre}" est en cours. Bonne étude !`,
      isLue: false,
      refId: sessionObjId,
      refModel: 'SessionEtude',
      createdAt: new Date()
    })

    // Enrich response with matiere so the front-end timer can display the subject name
    const matiere = await db.collection('matieres').findOne({ _id: session.matiereId })

    return NextResponse.json({
      session: {
        ...session,
        _id:      session._id.toString(),
        userId:   session.userId.toString(),
        matiereId: session.matiereId.toString(),
        statut:   'en_cours',
        matiere: matiere ? {
          nom:                 matiere.nom,
          couleur:             matiere.couleur,
          priorite:            matiere.priorite,
          totalHeuresEtudiees: matiere.totalHeuresEtudiees ?? 0
        } : null
      }
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
