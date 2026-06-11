import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    const { heuresParSemaine, deadline, statut, progression, freqNotifJours } = body

    const $set: Record<string, unknown> = { updatedAt: new Date() }
    if (heuresParSemaine !== undefined) $set.heuresParSemaine = Number(heuresParSemaine)
    if (deadline !== undefined) {
      if (isNaN(new Date(deadline).getTime())) {
        return NextResponse.json({ error: 'Date limite invalide' }, { status: 400 })
      }
      $set.deadline = new Date(deadline)
    }
    if (statut     !== undefined) $set.statut     = statut
    if (progression !== undefined) $set.progression = Number(progression)
    if (freqNotifJours !== undefined) $set.freqNotifJours = Number(freqNotifJours)

    // --- AJOUT SÉCURITÉ : Si l'utilisateur force la progression à >= 100% manuellement ---
    if (Number(progression) >= 100 && statut !== 'abandonne') {
      $set.statut = 'atteint'
    }

    const db = await getDb()
    const userObjId = new ObjectId(userId)
    const objId = new ObjectId(id)

    // Récupérer l'ancien état de l'objectif pour éviter les doublons de notifications
    const ancienObjectif = await db.collection('objectifs').findOne({ _id: objId, userId: userObjId })
    if (!ancienObjectif) {
      return NextResponse.json({ error: 'Objectif introuvable ou non autorisé' }, { status: 404 })
    }

    const result = await db.collection('objectifs').updateOne(
      { _id: objId, userId: userObjId },
      { $set }
    )

    // --- ENVOI DE LA NOTIFICATION SI PASSAGE À L'ÉTAT ATTEINT ---
    if (($set.statut === 'atteint' || Number(progression) >= 100) && ancienObjectif.statut !== 'atteint') {
      const matiere = await db.collection('matieres').findOne({ _id: ancienObjectif.matiereId })
      
      await db.collection('notifications').insertOne({
        destinataireId: userObjId,
        type:           'objectif_atteint',
        titre:          'Objectif atteint ! 🎉',
        contenu:        `Bravo ! Tu as atteint ton objectif pour "${matiere?.nom ?? 'cette matière'}"`,
        isLue:          false,
        refId:          objId,
        refModel:       'Objectif',
        createdAt:      new Date()
      })
    }

    return NextResponse.json({ message: 'Objectif mis à jour' })
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

  const { id } = await params

  try {
    const db = await getDb()
    const result = await db.collection('objectifs').deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(userId)
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Objectif introuvable ou non autorisé' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Objectif supprimé' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}