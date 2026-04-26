import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(_req: NextRequest) {
  try {
    const db    = await getDb()
    const users = await db
      .collection('users')
      .find({})
      .project({ passwordHash: 0, emailVerificationToken: 0 })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({ users })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Toggle isActive
export async function PATCH(req: NextRequest) {
  try {
    const { userId, isActive } = await req.json()
    const db = await getDb()
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { isActive, updatedAt: new Date() } }
    )
    return NextResponse.json({ message: 'Mis à jour' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}