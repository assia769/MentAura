import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/mongodb'

const SUSPICIOUS_ACTIONS = ['LOGIN_FAILED', 'ACCOUNT_LOCKED', 'CAPTCHA_FAILED']

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const onlySuspicious   = searchParams.get('suspicious') === 'true'
    const page  = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '50'))
    const skip  = (page - 1) * limit

    const db = await getDb()
    const filter = onlySuspicious ? { action: { $in: SUSPICIOUS_ACTIONS } } : {}

    const [logs, total] = await Promise.all([
      db.collection('auditlogs')
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('auditlogs').countDocuments(filter)
    ])

    // Attach user info
    const userIds = [...new Set(logs.map(l => l.userId?.toString()).filter(Boolean))]
    const users   = await db
      .collection('users')
      .find({ _id: { $in: userIds.map(id => new ObjectId(id)) } })
      .project({ _id: 1, nom: 1, prenom: 1, email: 1 })
      .toArray()

    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]))
    const enriched = logs.map(log => ({
      ...log,
      user: log.userId ? userMap[log.userId.toString()] : null
    }))

    return NextResponse.json({ logs: enriched, total, page, limit })
  } catch (err) {
    console.error('[AuditLogs]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}