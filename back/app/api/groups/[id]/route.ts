import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

interface GroupUpdateBody {
  nom?:       string
  maxMembres?: number
  isPublic?:  boolean
}

// GET /api/groups/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = await getDb()

    const groups = await db.collection('groupeetudes').aggregate([
      { $match: { _id: new ObjectId(params.id) } },
      {
        $lookup: {
          from:         'users',
          localField:   'membres.userId',
          foreignField: '_id',
          as:           'membresInfo'
        }
      },
      {
        $addFields: {
          membres: {
            $map: {
              input: '$membres',
              as:    'm',
              in: {
                userId:   '$$m.userId',
                role:     '$$m.role',
                joinedAt: '$$m.joinedAt',
                nom: {
                  $let: {
                    vars: {
                      user: {
                        $arrayElemAt: [
                          { $filter: {
                            input: '$membresInfo',
                            cond:  { $eq: ['$$this._id', '$$m.userId'] }
                          }},
                          0
                        ]
                      }
                    },
                    in: { $concat: ['$$user.prenom', ' ', '$$user.nom'] }
                  }
                }
              }
            }
          }
        }
      },
      { $project: { membresInfo: 0 } }
    ]).toArray()

    const group = groups[0]
    if (!group) return NextResponse.json({ error: 'Groupe introuvable' }, { status: 404 })

    const isMembre = group.membres?.some(
      (m: { userId: { toString: () => string } }) => m.userId.toString() === userId
    )
    if (!isMembre) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    return NextResponse.json({ group })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT /api/groups/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as GroupUpdateBody
    const { nom, maxMembres, isPublic } = body

    const db     = await getDb()
    const result = await db.collection('groupeetudes').updateOne(
      { _id: new ObjectId(params.id), createurId: new ObjectId(userId) },
      {
        $set: {
          ...(nom        !== undefined && { nom }),
          ...(maxMembres !== undefined && { maxMembres }),
          ...(isPublic   !== undefined && { isPublic }),
          updatedAt: new Date()
        }
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Groupe introuvable ou non autorisé' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Groupe mis à jour' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/groups/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db     = await getDb()
    const result = await db.collection('groupeetudes').deleteOne({
      _id:       new ObjectId(params.id),
      createurId: new ObjectId(userId)
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Groupe introuvable ou non autorisé' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Groupe supprimé' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}