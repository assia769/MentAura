import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const db = await getDb()
    const userObjId = new ObjectId(userId)
    const { searchParams } = req.nextUrl
    const statut = searchParams.get('statut')

    const query: Record<string, unknown> = { userId: userObjId }
    if (statut) query.statut = statut

    const objectifs = await db.collection('objectifs')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray()

    if (objectifs.length === 0) return NextResponse.json({ objectifs: [] })

    const matiereIds = [...new Set(objectifs.map(o => o.matiereId.toString()))]
      .map(id => new ObjectId(id))

    const matieres = await db.collection('matieres')
      .find({ _id: { $in: matiereIds }, userId: userObjId })
      .toArray()

    const matiereMap = new Map(matieres.map(m => [m._id.toString(), m]))

    const enriched = objectifs.map(o => ({
      ...o,
      _id: o._id.toString(),
      userId: o.userId.toString(),
      matiereId: o.matiereId.toString(),
      matiere: matiereMap.get(o.matiereId.toString()) ?? null
    }))

    return NextResponse.json({ objectifs: enriched })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const body = await req.json()
    const { matiereId, heuresParSemaine, deadline, freqNotifJours } = body

    if (!matiereId || !heuresParSemaine || !deadline) {
      return NextResponse.json({ error: 'matiereId, heuresParSemaine et deadline sont requis' }, { status: 400 })
    }

    if (isNaN(new Date(deadline).getTime())) {
      return NextResponse.json({ error: 'Date limite invalide' }, { status: 400 })
    }

    const db = await getDb()
    const userObjId = new ObjectId(userId)

    const matiere = await db.collection('matieres').findOne({
      _id: new ObjectId(matiereId),
      userId: userObjId
    })
    if (!matiere) {
      return NextResponse.json({ error: 'Matière introuvable' }, { status: 404 })
    }

    const now = new Date()
    const doc = {
      userId: userObjId,
      matiereId: new ObjectId(matiereId),
      heuresParSemaine: Number(heuresParSemaine),
      deadline: new Date(deadline),
      statut: 'actif',
      progression: 0,
      freqNotifJours: freqNotifJours ?? 3,
      createdAt: now,
      updatedAt: now
    }

    const result = await db.collection('objectifs').insertOne(doc)

    const objectif = {
      ...doc,
      _id: result.insertedId.toString(),
      userId: userId,
      matiereId: matiereId,
      matiere: {
        _id: matiere._id.toString(),
        nom: matiere.nom,
        couleur: matiere.couleur,
        priorite: matiere.priorite
      }
    }

    return NextResponse.json({ objectif }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
