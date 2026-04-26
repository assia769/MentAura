import { getDb } from './mongodb'
import { ObjectId } from 'mongodb'

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'REGISTER'
  | 'LOGOUT'
  | 'TOKEN_REFRESH'
  | 'ACCOUNT_LOCKED'
  | 'CAPTCHA_FAILED'

export async function auditLog(params: {
  userId?: string
  action: AuditAction
  ipAddress: string
  userAgent: string
  details?: Record<string, unknown>
}) {
  try {
    const db = await getDb()
    await db.collection('auditlogs').insertOne({
      userId: params.userId ? new ObjectId(params.userId) : null,
      action: params.action,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      details: params.details ?? {},
      createdAt: new Date()
    })
  } catch {
    // never block auth flow because of audit failure
    console.error('[AuditLog] write failed')
  }
}