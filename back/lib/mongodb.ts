import { MongoClient, Db } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI!
const DB_NAME     = 'mentaura'

if (!MONGODB_URI) throw new Error('MONGODB_URI is not defined in .env.local')

let client: MongoClient
let clientPromise: Promise<MongoClient>

declare global {
  // prevent multiple connections in dev (hot reload)
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  client = new MongoClient(MONGODB_URI)
  clientPromise = client.connect()
}

export async function getDb(): Promise<Db> {
  const c = await clientPromise
  return c.db(DB_NAME)
}

export default clientPromise