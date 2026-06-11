// C:\MentAura\MentAura\back\app\api\sessions\generate\route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId, Document } from 'mongodb'

const DAY_OFFSET: Record<string, number> = {
  lun: 0, mar: 1, mer: 2, jeu: 3, ven: 4, sam: 5, dim: 6
}

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

function getDateForDay(weekStart: Date, jourSemaine: string): Date {
  const d = new Date(weekStart)
  d.setDate(weekStart.getDate() + (DAY_OFFSET[jourSemaine] ?? 0))
  return d
}

type TimeSlot = { start: Date; end: Date; dayIndex: number; durationMin: number }

interface ExistingSession {
  dateDebut: Date
  dateFin: Date
  genereeAutomatiquement?: boolean
}

function slotsOverlap(a: TimeSlot, b: ExistingSession): boolean {
  return a.start < new Date(b.dateFin) && a.end > new Date(b.dateDebut)
}

const PRIORITY_ORDER: Record<string, number> = { haute: 0, moyenne: 1, faible: 2 }

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const body = await req.json()
    const semaine: string = body.semaine
    const dureeMaxSession: number = Number(body.dureeMaxSession ?? 90)
    const dureeMinSession = 30 // Sécurité : pas de session de moins de 30 minutes

    if (!semaine) {
      return NextResponse.json({ error: 'semaine est requis (ex: 2026-W20)' }, { status: 400 })
    }

    const db = await getDb()
    const userObjId = new ObjectId(userId)
    const { start: weekStart, end: weekEnd } = parseWeek(semaine)
    
    // Pour éviter de planifier des sessions dans le passé (ex: si on est mercredi)
    const maintenant = new Date()

    // ── ÉTAPE 1 — RÈGLE DE L'UNICITÉ : Nettoyage des anciennes sessions auto ──
    await db.collection('sessionetudes').deleteMany({
      userId: userObjId,
      genereeAutomatiquement: true,
      dateDebut: { $gte: weekStart },
      dateFin: { $lte: weekEnd }
    })

    // Récupérer les objectifs actifs
    const objectifs = await db.collection('objectifs')
      .find({ userId: userObjId, statut: 'actif' })
      .toArray()

    if (objectifs.length === 0) {
      return NextResponse.json({ sessions: [], nbCreees: 0, message: 'Aucun objectif actif' })
    }

    // Charger les matières pour connaître les priorités
    const matiereIds = [...new Set(objectifs.map(o => o.matiereId.toString()))].map(id => new ObjectId(id))
    const matieres = await db.collection('matieres')
      .find({ _id: { $in: matiereIds }, userId: userObjId })
      .toArray()
    const matiereMap = new Map(matieres.map(m => [m._id.toString(), m]))

    // Charger les disponibilités de l'étudiant
    const disponibilites = await db.collection('disponibilites')
      .find({ userId: userObjId, recurrente: true })
      .toArray()

    if (disponibilites.length === 0) {
      return NextResponse.json({ sessions: [], nbCreees: 0, message: 'Aucune disponibilité configurée' })
    }

    // Charger les sessions manuelles existantes restées
    const existingSessions = await db.collection('sessionetudes')
      .find({
        userId: userObjId,
        statut: { $in: ['planifiee', 'en_cours', 'realisee'] },
        dateDebut: { $gte: weekStart },
        dateFin: { $lte: weekEnd }
      })
      .toArray() as unknown as ExistingSession[]

    // ── ÉTAPE 2 — Découpage et mapping des créneaux de disponibilité libres ──
    const freeSlots: TimeSlot[] = []

    for (const dispo of disponibilites) {
      const dayDate = getDateForDay(weekStart, dispo.jourSemaine)
      const dayIndex = DAY_OFFSET[dispo.jourSemaine] ?? 0
      const [startH, startM] = (dispo.heureDebut as string).split(':').map(Number)
      const [endH, endM] = (dispo.heureFin as string).split(':').map(Number)

      const windowStart = new Date(dayDate)
      const windowEnd = new Date(dayDate)
      
      windowStart.setHours(startH, startM, 0, 0)
      windowEnd.setHours(endH, endM, 0, 0)

      // AJOUT : Si la fenêtre de disponibilité complète est déjà passée, on l'ignore directement
      if (windowEnd.getTime() <= maintenant.getTime()) {
        continue
      }

      // AJOUT : Si le début de la fenêtre est dans le passé mais que la fin est dans le futur (ex: on est au milieu du créneau), 
      // on décale le curseur de départ à "maintenant" pour ne planifier que sur le temps restant.
      let cursor = new Date(windowStart)
      if (cursor.getTime() < maintenant.getTime()) {
        cursor = new Date(maintenant)
      }

      while (cursor.getTime() < windowEnd.getTime()) {
        const remainingWindowMin = (windowEnd.getTime() - cursor.getTime()) / 60_000
        if (remainingWindowMin < dureeMinSession) break

        const currentSlotDuration = Math.min(dureeMaxSession, remainingWindowMin)
        const candidateEnd = new Date(cursor.getTime() + currentSlotDuration * 60_000)

        const candidateSlot: TimeSlot = {
          start: new Date(cursor),
          end: candidateEnd,
          dayIndex,
          durationMin: currentSlotDuration
        }

        const conflict = existingSessions.find(s => slotsOverlap(candidateSlot, s))

        if (!conflict) {
          freeSlots.push(candidateSlot)
          cursor = candidateEnd
        } else {
          cursor = new Date(Math.max(new Date(conflict.dateFin).getTime(), cursor.getTime() + 15 * 60_000))
        }
      }
    }

    // Trier les créneaux par chronologie
    freeSlots.sort((a, b) =>
      a.dayIndex !== b.dayIndex ? a.dayIndex - b.dayIndex : a.start.getTime() - b.start.getTime()
    )

    if (freeSlots.length === 0) {
      return NextResponse.json({ sessions: [], nbCreees: 0, message: 'Aucun créneau libre et futur cette semaine' })
    }

    // ── ÉTAPE 3 — Tri strict par Priorité ──
    type TargetQueue = {
      objectif: (typeof objectifs)[0]
      matiere: (typeof matieres)[0] | undefined
      minutesRestantes: number
      dayCount: Record<number, number>
    }

    const queue: TargetQueue[] = [...objectifs]
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[matiereMap.get(a.matiereId.toString())?.priorite ?? 'faible'] ?? 2
        const pb = PRIORITY_ORDER[matiereMap.get(b.matiereId.toString())?.priorite ?? 'faible'] ?? 2
        if (pa !== pb) return pa - pb
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      })
      .map(o => ({
        objectif: o,
        matiere: matiereMap.get(o.matiereId.toString()),
        minutesRestantes: o.heuresParSemaine * 60,
        dayCount: {}
      }))

    // ── ÉTAPE 4 — Distribution intelligente et allocation des sessions ──
    const toInsert: Document[] = []
    const usedSlots = new Set<number>()

    for (const task of queue) {
      if (task.minutesRestantes <= 0) continue

      for (let si = 0; si < freeSlots.length; si++) {
        if (usedSlots.has(si)) continue
        if (task.minutesRestantes <= 0) break

        const slot = freeSlots[si]

        if ((task.dayCount[slot.dayIndex] ?? 0) >= 2) continue

        const finalDurationMin = Math.min(slot.durationMin, task.minutesRestantes)
        
        if (finalDurationMin < dureeMinSession && task.minutesRestantes >= dureeMinSession) {
          continue 
        }

        const sessionEnd = new Date(slot.start.getTime() + finalDurationMin * 60_000)
        const heuresPlanifiees = finalDurationMin / 60

        toInsert.push({
          userId: userObjId,
          matiereId: task.objectif.matiereId,
          titre: `${task.matiere?.nom ?? 'Session'} — Auto`,
          dateDebut: slot.start,
          dateFin: sessionEnd,
          dureeMax: heuresPlanifiees,
          statut: 'planifiee',
          heuresPlanifiees,
          heuresRealisees: 0,
          isPartagee: false,
          notes: 'Généré automatiquement selon vos objectifs.',
          genereeAutomatiquement: true,
          createdAt: new Date()
        })

        usedSlots.add(si)
        task.dayCount[slot.dayIndex] = (task.dayCount[slot.dayIndex] ?? 0) + 1
        task.minutesRestantes -= finalDurationMin

        if (slot.durationMin - finalDurationMin >= dureeMinSession) {
          freeSlots.push({
            start: sessionEnd,
            end: slot.end,
            dayIndex: slot.dayIndex,
            durationMin: slot.durationMin - finalDurationMin
          })
          freeSlots.sort((a, b) =>
            a.dayIndex !== b.dayIndex ? a.dayIndex - b.dayIndex : a.start.getTime() - b.start.getTime()
          )
        }
      }
    }

    // ── ÉTAPE 5 — Enregistrement en Base de Données ──
    if (toInsert.length === 0) {
      return NextResponse.json({
        sessions: [],
        nbCreees: 0,
        message: 'Vos disponibilités restantes pour cette semaine sont trop restreintes pour planifier vos objectifs.'
      })
    }

    const { insertedIds } = await db.collection('sessionetudes').insertMany(toInsert)
    const insertedIdsArray = Object.values(insertedIds)

    const insertedDocs = await db.collection('sessionetudes')
      .find({ _id: { $in: insertedIdsArray } })
      .sort({ dateDebut: 1 })
      .toArray()

    const enrichedSessions = insertedDocs.map(s => {
      const mat = matiereMap.get(s.matiereId.toString())
      return {
        ...s,
        _id: s._id.toString(),
        userId: s.userId.toString(),
        matiereId: s.matiereId.toString(),
        matiere: mat ? { nom: mat.nom, couleur: mat.couleur, priorite: mat.priorite } : null
      }
    })

    return NextResponse.json({
      sessions: enrichedSessions,
      nbCreees: enrichedSessions.length
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur interne du serveur lors de la génération' }, { status: 500 })
  }
}