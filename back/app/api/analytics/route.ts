import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db      = await getDb()
    const userObjId = new ObjectId(userId)

    // ── Semaine courante ────────────────────────────────────────────────
    const now     = new Date()
    const semaine = getSemaineISO(now)

    // ── 1. Chercher les stats de la semaine courante ────────────────────
    let stats = await db
      .collection('statistiqueusers')
      .findOne({ userId: userObjId, semaine })

    // ── 2. Fallback : dernière entrée disponible (toutes semaines) ──────
    if (!stats) {
      stats = await db
        .collection('statistiqueusers')
        .findOne({ userId: userObjId }, { sort: { createdAt: -1 } })
    }

    // ── 3. Fallback : calculer depuis les sessions réelles ───────────────
    if (!stats) {
      const sessions = await db
        .collection('sessionetudes')
        .find({ userId: userObjId })
        .toArray()

      const realisees        = sessions.filter(s => s.statut === 'realisee')
      const heuresPlanifiees = sessions.reduce((acc, s) => acc + (s.heuresPlanifiees ?? 0), 0)
      const heuresRealisees  = realisees.reduce((acc, s)  => acc + (s.heuresRealisees  ?? 0), 0)
      const tauxCompletion   = heuresPlanifiees > 0
        ? Math.round((heuresRealisees / heuresPlanifiees) * 100)
        : 0

      return NextResponse.json({
        weekly: {
          semaine,
          heuresPlanifiees,
          heuresRealisees,
          tauxCompletion,
          sessionsTotales:   sessions.length,
          sessionsRealisees: realisees.length,
          streakJours:       0,
          parMatiere:        [],
          _source:           'computed' // debug flag, tu peux le retirer
        }
      })
    }

    // ── 4. On retourne les stats trouvées avec la semaine réelle ─────────
    return NextResponse.json({
      weekly: {
        ...stats,
        semaine,           // toujours exposer la semaine courante côté front
        _semaine_source: stats.semaine, // semaine réelle des données (debug)
      }
    })

  } catch (err) {
    console.error('[analytics/weekly] error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── Helper ISO week ──────────────────────────────────────────────────────────
function getSemaineISO(date: Date): string {
  const d      = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day    = d.getUTCDay() || 7          // lundi = 1 … dimanche = 7
  d.setUTCDate(d.getUTCDate() + 4 - day)    // placer au jeudi de la semaine ISO
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week   = Math.ceil((((d.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}