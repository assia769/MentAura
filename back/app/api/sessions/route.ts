import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

function parseWeek(semaine: string): { start: Date; end: Date } {
  const [year, week] = semaine.split('-W').map(Number)
  const jan4 = new Date(year, 0, 4)
  const dow = jan4.getDay() || 7
  const weekStart = new Date(jan4)
  weekStart.setDate(jan4.getDate() - (dow - 1) + (week - 1) * 7)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  return { start: weekStart, end: weekEnd }
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const db = await getDb()
    const userObjId = new ObjectId(userId)
    const { searchParams } = req.nextUrl

    const semaine = searchParams.get('semaine')
    const statut = searchParams.get('statut')
    const matiereId = searchParams.get('matiereId')

    const query: Record<string, unknown> = { userId: userObjId }

    if (semaine) {
      const { start, end } = parseWeek(semaine)
      query.dateDebut = { $gte: start, $lte: end }
    }
    if (statut) query.statut = statut
    if (matiereId) query.matiereId = new ObjectId(matiereId)

    const sessions = await db.collection('sessionetudes')
      .find(query)
      .sort({ dateDebut: 1 })
      .toArray()

    if (sessions.length === 0) return NextResponse.json({ sessions: [] })

    const matiereIds = [...new Set(sessions.map(s => s.matiereId.toString()))]
      .map(id => new ObjectId(id))

    const matieres = await db.collection('matieres')
      .find({ _id: { $in: matiereIds } })
      .toArray()

    const matiereMap = new Map(matieres.map(m => [m._id.toString(), m]))

    const enriched = sessions.map(s => ({
      ...s,
      _id: s._id.toString(),
      userId: s.userId.toString(),
      matiereId: s.matiereId.toString(),
      matiere: matiereMap.get(s.matiereId.toString()) ?? null
    }))

    return NextResponse.json({ sessions: enriched })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const body = await req.json()
    const { matiereId, titre, dateDebut, dateFin, notes, isPartagee } = body

    if (!matiereId || !titre || !dateDebut || !dateFin) {
      return NextResponse.json({ error: 'matiereId, titre, dateDebut et dateFin sont requis' }, { status: 400 })
    }

    const start = new Date(dateDebut)
    const end = new Date(dateFin)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Dates invalides' }, { status: 400 })
    }
    if (start >= end) {
      return NextResponse.json({ error: 'dateDebut doit être avant dateFin' }, { status: 400 })
    }

    const db = await getDb()
    const userObjId = new ObjectId(userId)

    const conflit = await db.collection('sessionetudes').findOne({
      userId: userObjId,
      statut: { $in: ['planifiee', 'en_cours'] },
      $or: [{ dateDebut: { $lt: end }, dateFin: { $gt: start } }]
    })

    if (conflit) {
      return NextResponse.json({ error: 'Créneau déjà occupé par une autre session' }, { status: 409 })
    }

    const heuresPlanifiees = (end.getTime() - start.getTime()) / 3600000

    const doc = {
      userId: userObjId,
      matiereId: new ObjectId(matiereId),
      titre,
      dateDebut: start,
      dateFin: end,
      dureeMax: heuresPlanifiees,
      statut: 'planifiee',
      heuresPlanifiees,
      heuresRealisees: 0,
      isPartagee: isPartagee ?? false,
      notes: notes ?? '',
      genereeAutomatiquement: false,
      createdAt: new Date()
    }

    const result = await db.collection('sessionetudes').insertOne(doc)

    const matiere = await db.collection('matieres').findOne({ _id: new ObjectId(matiereId) })

    const session = {
      ...doc,
      _id: result.insertedId.toString(),
      userId,
      matiereId,
      matiere: matiere ? {
        nom: matiere.nom,
        couleur: matiere.couleur,
        priorite: matiere.priorite
      } : null
    }

    return NextResponse.json({ session }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
