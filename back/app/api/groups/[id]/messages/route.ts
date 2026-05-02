import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDb()
    
    const messages = await db.collection('messages').aggregate([
      { $match: { groupeId: new ObjectId(params.id) } },
      { $sort:  { createdAt: 1 } },
      {
        $lookup: {
          from:         'users',
          localField:   'userId',
          foreignField: '_id',
          as:           'author'
        }
      },
      { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          contenu:   1,
          createdAt: 1,
  auteurId:   1, 
            authorName: {
            $concat: [
              { $ifNull: ['$author.prenom', ''] },
              ' ',
              { $ifNull: ['$author.nom', ''] }
            ]
          }
        }
      }
    ]).toArray()

    return NextResponse.json({ messages })
  } catch {
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id')
    const { contenu } = await req.json()
    const db = await getDb()

    const newMessage = {
      groupeId: new ObjectId(params.id),
      userId: new ObjectId(userId!),
      contenu,
      createdAt: new Date()
    }

    await db.collection('messages').insertOne(newMessage)
    return NextResponse.json({ message: newMessage }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}