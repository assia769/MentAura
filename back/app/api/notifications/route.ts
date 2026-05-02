import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = await getDb()
    const userObjId = new ObjectId(userId)

    // ── 1. Notifications système (invitations, objectifs, etc.) ─────────
    const notifications = await db
      .collection('notifications')
      .find({ destinataireId: userObjId })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray()

    // ── 2. Messages non lus dans les groupes de l'utilisateur ───────────
    const groupes = await db
      .collection('groupeetudes')
      .find({ 'membres.userId': userObjId })
      .toArray()

    const unreadPerGroup: { groupId: string; nom: string; count: number }[] = []

    for (const groupe of groupes) {
      const unreadCount = await db
        .collection('messages')
        .countDocuments({
          groupeId: groupe._id,
          auteurId: { $ne: userObjId },           // pas les miens
          'readBy.userId': { $ne: userObjId }     // non lus par moi
        })

      if (unreadCount > 0) {
        unreadPerGroup.push({
          groupId: groupe._id.toString(),
          nom:     groupe.nom,
          count:   unreadCount
        })
      }
    }

    // ── 3. Total non lus ────────────────────────────────────────────────
    const unreadNotifs   = notifications.filter(n => !n.isLue).length
    const unreadMessages = unreadPerGroup.reduce((acc, g) => acc + g.count, 0)
    const totalUnread    = unreadNotifs + unreadMessages

    return NextResponse.json({
      notifications: notifications.map(n => ({
        _id:       n._id.toString(),
        type:      n.type,
        titre:     n.titre,
        contenu:   n.contenu,
        isLue:     n.isLue,
        createdAt: n.createdAt,
        refId:     n.refId?.toString() ?? null,
        refModel:  n.refModel ?? null,
        // Pour les invitations, on enrichit avec le groupeId si dispo
        groupeId:  n.refModel === 'GroupeEtude' ? n.refId?.toString() : null
      })),
      unreadMessages: unreadPerGroup,
      totalUnread
    })

  } catch (err) {
    console.error('[notifications] GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── PATCH : marquer une notification comme lue ───────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { notifId, markAll } = await req.json()
    const db = await getDb()
    const userObjId = new ObjectId(userId)

    if (markAll) {
      await db.collection('notifications').updateMany(
        { destinataireId: userObjId, isLue: false },
        { $set: { isLue: true } }
      )
    } else if (notifId) {
      await db.collection('notifications').updateOne(
        { _id: new ObjectId(notifId), destinataireId: userObjId },
        { $set: { isLue: true } }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[notifications] PATCH error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}