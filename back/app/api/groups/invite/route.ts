import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

interface InviteBody {
  groupId: string
  email:   string
}

// POST /api/groups/invite
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as InviteBody
    const { groupId, email } = body

    if (!groupId || !email) {
      return NextResponse.json({ error: 'groupId et email requis' }, { status: 400 })
    }

    const db = await getDb()

    // Vérifier que le groupe existe et que l'user est admin
    const group = await db
      .collection('groupeetudes')
      .findOne({ _id: new ObjectId(groupId) })

    if (!group) return NextResponse.json({ error: 'Groupe introuvable' }, { status: 404 })

    const isAdmin = group.membres?.some(
      (m: { userId: ObjectId; role: string }) =>
        m.userId.toString() === userId && m.role === 'admin'
    )
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Créer l'invitation
    const invitation = {
      groupeId:   new ObjectId(groupId),
      inviteurId: new ObjectId(userId),
      inviteEmail: email,
      token:      Math.random().toString(36).substring(2, 18),
      statut:     'pending',
      expiresAt:  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
      createdAt:  new Date()
    }

    await db.collection('invitations').insertOne(invitation)

    return NextResponse.json({ message: 'Invitation envoyée' }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}