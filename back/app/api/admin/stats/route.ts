import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'

const CORS = {
  'Access-Control-Allow-Origin': 'http://localhost:4200',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
  }

  const db = await getDb()
  const [totalUsers, activeSessions, totalGroups] = await Promise.all([
    db.collection('users').countDocuments(),
    db.collection('sessionetudes').countDocuments({ statut: 'en_cours' }),
    db.collection('groupeetudes').countDocuments(),
  ])

  return NextResponse.json({ totalUsers, activeSessions, totalGroups }, { headers: CORS })
}