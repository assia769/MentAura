import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId, Document } from 'mongodb'

interface InvitationActionBody {
  action: 'accept' | 'decline'
}

// PUT /api/invitations/[id]  — accept ou decline
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId    = req.headers.get('x-user-id')
    const userEmail = req.headers.get('x-user-email')
    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body   = await req.json() as InvitationActionBody
    const { action } = body

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

    const db = await getDb()

    const invitation = await db
      .collection('invitations')
      .findOne({
        _id:         new ObjectId(params.id),
        inviteEmail: userEmail,
        statut:      'pending'
      })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 })
    }

    await db.collection('invitations').updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { statut: action === 'accept' ? 'accepted' : 'declined' } }
    )

    if (action === 'accept') {
      // ✅ FIX: convertir groupeId en ObjectId
      await db.collection<Document>('groupeetudes').updateOne(
        { _id: new ObjectId(invitation.groupeId.toString()) },
        {
          $push: {
            membres: {
              userId:   new ObjectId(userId),
              role:     'membre',
              joinedAt: new Date()
            }
          }
        } as Document
      )
    }

    return NextResponse.json({
      message: action === 'accept' ? 'Invitation acceptée' : 'Invitation déclinée'
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/invitations/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userEmail = req.headers.get('x-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = await getDb()
    const result = await db.collection('invitations').deleteOne({
      _id:         new ObjectId(params.id),
      inviteEmail: userEmail
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Invitation supprimée' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}