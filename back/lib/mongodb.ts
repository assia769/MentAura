// lib/mongodb.ts
import { MongoClient, Db } from 'mongodb'

const uri = process.env.MONGODB_URI!

// ✅ Option nécessaire avec Turbopack
const options = {
  serverApi: {
    version: '1' as const,
    strict: false,          // ← false, pas true
    deprecationErrors: false,
  },
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

if (process.env.NODE_ENV === 'development') {
  // En dev, réutiliser la connexion entre hot-reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export async function getDb(): Promise<Db> {
  const c = await clientPromise
  return c.db() // prend le nom depuis l'URI automatiquement
}

export default clientPromise