// back/app/api/admin/users/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': 'http://localhost:4200',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const { prenom, nom, email, role } = await req.json()
    const db = await getDb()
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { prenom, nom, email, role, updatedAt: new Date() } }
    )
    return NextResponse.json(
      { message: 'Utilisateur mis à jour' },
      { headers: corsHeaders() }
    )
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: corsHeaders() }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const db = await getDb()
    await db.collection('users').deleteOne({ _id: new ObjectId(userId) })
    return NextResponse.json(
      { message: 'Utilisateur supprimé' },
      { headers: corsHeaders() }
    )
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: corsHeaders() }
    )
  }
}