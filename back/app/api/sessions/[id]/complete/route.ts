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
    const body = await req.json()
    // heuresRealisees = temps réellement passé (envoyé par le front depuis le chrono)
    const heuresRealisees = Number(body.heuresRealisees ?? 0)

    const db = await getDb()
    const userObjId    = new ObjectId(userId)
    const sessionObjId = new ObjectId(id)

    const session = await db.collection('sessionetudes').findOne({
      _id:    sessionObjId,
      userId: userObjId
    })

    if (!session) {
      return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
    }
    if (session.statut !== 'en_cours') {
      return NextResponse.json({ error: "La session n'est pas en cours" }, { status: 409 })
    }

    // ── Règle des 50% ─────────────────────────────────────────────
    // Si le temps fait >= 50 % de la durée planifiée → realisee
    // Sinon → non_realisee
    const heuresPlanifiees: number = session.heuresPlanifiees ?? 1
    const pct = heuresPlanifiees > 0 ? heuresRealisees / heuresPlanifiees : 0
    const nouveauStatut: 'realisee' | 'non_realisee' = pct >= 0.5 ? 'realisee' : 'non_realisee'

    const matiere = await db.collection('matieres').findOne({ _id: session.matiereId })
    const priorite: string = matiere?.priorite ?? 'faible'

    const objectif = await db.collection('objectifs').findOne({
      userId:    userObjId,
      matiereId: session.matiereId,
      statut:    'actif'
    })

    const now           = new Date()
    const beforeDeadline = objectif && now < new Date(objectif.deadline)

    // Points uniquement si la session est réalisée
    let pts = 0
    if (nouveauStatut === 'realisee') {
      pts = 10
      if (priorite === 'haute')   pts += 5
      else if (priorite === 'moyenne') pts += 2
      if (beforeDeadline) pts += 3
    }

    // ── Mise à jour de la session ──────────────────────────────────
    await db.collection('sessionetudes').updateOne(
      { _id: sessionObjId },
      { $set: { statut: nouveauStatut, heuresRealisees, dateFin: now } }
    )

    // ── Score utilisateur (seulement si réalisée) ──────────────────
    if (pts > 0) {
      await db.collection('users').updateOne(
        { _id: userObjId },
        { $inc: { score: pts } }
      )
    }

    // ── Mise à jour totalHeuresEtudiees (seulement si réalisée) ───
    if (matiere && nouveauStatut === 'realisee') {
      await db.collection('matieres').updateOne(
        { _id: session.matiereId },
        { $inc: { totalHeuresEtudiees: heuresRealisees } }
      )
    }

    // ── Progression objectif (seulement si réalisée) ──────────────
    if (objectif && nouveauStatut === 'realisee') {
      const completedSessions = await db.collection('sessionetudes')
        .find({ userId: userObjId, matiereId: session.matiereId, statut: 'realisee' })
        .toArray()

      const totalHeures  = completedSessions.reduce((sum, s) => sum + (s.heuresRealisees ?? 0), 0)
      const progression  = Math.min(100, Math.round((totalHeures / objectif.heuresParSemaine) * 100))

      const objectifUpdate: Record<string, unknown> = { progression, updatedAt: now }
      if (progression >= 100) objectifUpdate.statut = 'atteint'

      await db.collection('objectifs').updateOne(
        { _id: objectif._id },
        { $set: objectifUpdate }
      )

      if (progression >= 100) {
        await db.collection('notifications').insertOne({
          destinataireId: userObjId,
          type:           'objectif_atteint',
          titre:          'Objectif atteint !',
          contenu:        `Bravo ! Tu as atteint ton objectif pour "${matiere?.nom ?? 'cette matière'}"`,
          isLue:          false,
          refId:          objectif._id,
          refModel:       'Objectif',
          createdAt:      now
        })
      }
    }

    // ── Notification de fin ────────────────────────────────────────
    const notifContenu = nouveauStatut === 'realisee'
      ? `"${session.titre}" — +${pts} points 🎉`
      : `"${session.titre}" — session non réalisée (moins de 50 % du temps effectué)`

    await db.collection('notifications').insertOne({
      destinataireId: userObjId,
      type:           'rappel_session',
      titre:          nouveauStatut === 'realisee' ? 'Session complétée !' : 'Session non réalisée',
      contenu:        notifContenu,
      isLue:          false,
      refId:          sessionObjId,
      refModel:       'SessionEtude',
      createdAt:      now
    })

    return NextResponse.json({
      session: {
        ...session,
        _id:            session._id.toString(),
        userId:         session.userId.toString(),
        matiereId:      session.matiereId.toString(),
        statut:         nouveauStatut,
        heuresRealisees
      },
      pointsGagnes: pts,
      statut:       nouveauStatut   // pratique pour le front
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}