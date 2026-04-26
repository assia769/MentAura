import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'

export async function GET(req: NextRequest) {
  // Role already validated by middleware
  try {
    const db = await getDb()

    const [
      totalUsers,
      totalStudents,
      activeUsers,
      totalSessions,
      totalGroups,
      recentSessions,
      topMatieres,
      globalStats
    ] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('users').countDocuments({ role: 'student' }),
      db.collection('users').countDocuments({ isActive: true }),
      db.collection('sessionetudes').countDocuments(),
      db.collection('groupeetudes').countDocuments(),
      db.collection('sessionetudes')
        .find({ statut: 'realisee' })
        .sort({ dateDebut: -1 })
        .limit(5)
        .toArray(),
      db.collection('matieres')
        .aggregate([
          { $group: { _id: '$nom', totalHeures: { $sum: '$totalHeuresEtudiees' } } },
          { $sort: { totalHeures: -1 } },
          { $limit: 5 }
        ])
        .toArray(),
      db.collection('statglobales').findOne({}, { sort: { date: -1 } })
    ])

    return NextResponse.json({
      totalUsers,
      totalStudents,
      activeUsers,
      totalSessions,
      totalGroups,
      tauxCompletionGlobal: globalStats?.tauxCompletionGlobal ?? 0,
      recentSessions,
      topMatieres
    })
  } catch (err) {
    console.error('[AdminStats]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}