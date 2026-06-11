import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

const VALID_STATUTS = ['planifiee', 'en_cours', 'realisee', 'non_realisee']

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json()
    const { titre, notes, dateDebut, dateFin, statut, isPartagee } = body

    if (statut !== undefined && !VALID_STATUTS.includes(statut)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    const db = await getDb()
    const userObjId    = new ObjectId(userId)
    const sessionObjId = new ObjectId(id)

    let start: Date | undefined
    let end:   Date | undefined

    if (dateDebut !== undefined) start = new Date(dateDebut)
    if (dateFin   !== undefined) end   = new Date(dateFin)

    if (start && end && start >= end) {
      return NextResponse.json({ error: 'dateDebut doit être avant dateFin' }, { status: 400 })
    }

    // Vérification de conflit uniquement pour les statuts actifs
    const isActiveStatut = !statut || statut === 'planifiee' || statut === 'en_cours'
    if ((start || end) && isActiveStatut) {
      const session = await db.collection('sessionetudes').findOne({ _id: sessionObjId, userId: userObjId })
      if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })

      const checkStart = start ?? new Date(session.dateDebut)
      const checkEnd   = end   ?? new Date(session.dateFin)

      const conflit = await db.collection('sessionetudes').findOne({
        _id:    { $ne: sessionObjId },
        userId: userObjId,
        statut: { $in: ['planifiee', 'en_cours'] },
        $or:    [{ dateDebut: { $lt: checkEnd }, dateFin: { $gt: checkStart } }]
      })

      if (conflit) {
        return NextResponse.json({ error: 'Créneau déjà occupé par une autre session' }, { status: 409 })
      }
    }

    const $set: Record<string, unknown> = {}
    if (titre     !== undefined) $set.titre     = titre
    if (notes     !== undefined) $set.notes     = notes
    if (start     !== undefined) $set.dateDebut = start
    if (end       !== undefined) $set.dateFin   = end
    if (statut    !== undefined) $set.statut    = statut
    if (isPartagee !== undefined) $set.isPartagee = isPartagee

    if (start && end) {
      $set.heuresPlanifiees = (end.getTime() - start.getTime()) / 3600000
    }

    const result = await db.collection('sessionetudes').updateOne(
      { _id: sessionObjId, userId: userObjId },
      { $set }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Session introuvable ou non autorisée' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Session mise à jour' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const { id } = await params
    const db = await getDb()
    const result = await db.collection('sessionetudes').deleteOne({
      _id:    new ObjectId(id),
      userId: new ObjectId(userId)
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Session introuvable ou non autorisée' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Session supprimée' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}