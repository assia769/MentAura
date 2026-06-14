/**
 * Tests unitaires – route POST /api/auth/login
 *
 * Utilisateurs de test :
 *   - ahmed.bennani@student.ma  / password123  → role: student
 *   - admin@mentaura.com        / admin2026     → role: admin
 */

import { NextRequest } from 'next/server'
import { ObjectId } from 'mongodb'

// ─────────────────────────────────────────────
// 1. Helpers
// ─────────────────────────────────────────────
function makeRequest(body: Record<string, unknown>, ip = '127.0.0.1'): NextRequest {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
      'user-agent': 'jest-test-agent',
    },
  })
}

// ─────────────────────────────────────────────
// 2. Données de test (vrais ObjectId BSON)
// ─────────────────────────────────────────────
const STUDENT_OID = new ObjectId()
const ADMIN_OID   = new ObjectId()

const STUDENT_USER = {
  _id: STUDENT_OID,
  email: 'ahmed.bennani@student.ma',
  passwordHash: '$2a$10$student_hash',
  role: 'student' as const,
  failedLoginAttempts: 0,
  lockedUntil: null,
}

const ADMIN_USER = {
  _id: ADMIN_OID,
  email: 'admin@mentaura.com',
  passwordHash: '$2a$10$admin_hash',
  role: 'admin' as const,
  failedLoginAttempts: 0,
  lockedUntil: null,
}

const STUDENT_BODY = {
  email: 'ahmed.bennani@student.ma',
  password: 'password123',
  captchaToken: 'token-captcha-valide',
}

const ADMIN_BODY = {
  email: 'admin@mentaura.com',
  password: 'admin2026',
  captchaToken: 'token-captcha-valide',
}

// ─────────────────────────────────────────────
// 3. State mutable des mocks DB
// ─────────────────────────────────────────────
let mockFindOneUser: jest.Mock
let mockFindOneMfa: jest.Mock
let mockUpdateOne: jest.Mock
let mockInsertOne: jest.Mock

// ─────────────────────────────────────────────
// 4. Mocks des modules
// ─────────────────────────────────────────────
jest.mock('@/lib/mongodb', () => ({
  getDb: jest.fn().mockImplementation(async () => ({
    collection: (name: string) => {
      if (name === 'users')        return { findOne: mockFindOneUser, updateOne: mockUpdateOne }
      if (name === 'refreshtokens') return { insertOne: mockInsertOne }
      if (name === 'mfaconfigs')   return { findOne: mockFindOneMfa }
      return {}
    },
  })),
}))

jest.mock('@/lib/jwt', () => ({
  signAccessToken:  jest.fn().mockResolvedValue('access-token-mock'),
  signRefreshToken: jest.fn().mockResolvedValue('refresh-token-mock'),
}))

jest.mock('@/lib/captcha', () => ({
  verifyCaptcha: jest.fn().mockResolvedValue(true),
}))

jest.mock('@/lib/audit', () => ({
  auditLog: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}))

// Imports après mocks
import { POST } from '@/app/api/auth/login/route'
import * as bcrypt from 'bcryptjs'
import { verifyCaptcha } from '@/lib/captcha'
import { auditLog } from '@/lib/audit'

const mockBcryptCompare  = bcrypt.compare as jest.Mock
const mockVerifyCaptcha  = verifyCaptcha as jest.Mock
const mockAuditLog       = auditLog as jest.Mock

// ─────────────────────────────────────────────
// 5. Setup avant chaque test
// ─────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks()

  // Par défaut : étudiant connecté sans MFA
  mockFindOneUser  = jest.fn().mockResolvedValue(STUDENT_USER)
  mockFindOneMfa   = jest.fn().mockResolvedValue(null)
  mockUpdateOne    = jest.fn().mockResolvedValue({ modifiedCount: 1 })
  mockInsertOne    = jest.fn().mockResolvedValue({ insertedId: new ObjectId() })
  mockBcryptCompare.mockResolvedValue(true)
  mockVerifyCaptcha.mockResolvedValue(true)
})

// ─────────────────────────────────────────────
// 6. Tests
// ─────────────────────────────────────────────
describe('POST /api/auth/login', () => {

  // ── 6.1 Champs manquants ────────────────────
  describe('Champs manquants', () => {
    it('retourne 400 si email absent', async () => {
      const res  = await POST(makeRequest({ password: 'password123', captchaToken: 't' }))
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error).toBe('Champs manquants')
    })

    it('retourne 400 si password absent', async () => {
      const res = await POST(makeRequest({ email: 'ahmed.bennani@student.ma', captchaToken: 't' }))
      expect(res.status).toBe(400)
    })

    it('retourne 400 si captchaToken absent', async () => {
      const res = await POST(makeRequest({ email: 'ahmed.bennani@student.ma', password: 'password123' }))
      expect(res.status).toBe(400)
    })
  })

  // ── 6.2 CAPTCHA ─────────────────────────────
  describe('Vérification CAPTCHA', () => {
    it('retourne 400 et log CAPTCHA_FAILED si captcha invalide', async () => {
      mockVerifyCaptcha.mockResolvedValue(false)

      const res  = await POST(makeRequest(STUDENT_BODY))
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe('Captcha invalide')
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CAPTCHA_FAILED' })
      )
    })
  })

  // ── 6.3 Utilisateur inconnu ──────────────────
  describe('Utilisateur inconnu', () => {
    it('retourne 401 si email introuvable', async () => {
      mockFindOneUser = jest.fn().mockResolvedValue(null)

      const res  = await POST(makeRequest(STUDENT_BODY))
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.error).toBe('Identifiants invalides')
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_FAILED' })
      )
    })
  })

  // ── 6.4 Verrouillage ────────────────────────
  describe('Verrouillage de compte', () => {
    it('retourne 423 avec minutes restantes si compte verrouillé', async () => {
      mockFindOneUser = jest.fn().mockResolvedValue({
        ...STUDENT_USER,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
      })

      const res  = await POST(makeRequest(STUDENT_BODY))
      const json = await res.json()

      expect(res.status).toBe(423)
      expect(json.error).toMatch(/Compte verrouillé/)
      expect(json.error).toMatch(/\d+ min/)
    })

    it('laisse passer si le verrou est expiré', async () => {
      mockFindOneUser = jest.fn().mockResolvedValue({
        ...STUDENT_USER,
        lockedUntil: new Date(Date.now() - 1000), // passé
      })

      const res = await POST(makeRequest(STUDENT_BODY))
      expect(res.status).toBe(200)
    })
  })

  // ── 6.5 Mauvais mot de passe ────────────────
  describe('Mot de passe invalide', () => {
    it('retourne 401 et incrémente failedLoginAttempts', async () => {
      mockBcryptCompare.mockResolvedValue(false)
      mockFindOneUser = jest.fn().mockResolvedValue({ ...STUDENT_USER, failedLoginAttempts: 2 })

      const res = await POST(makeRequest(STUDENT_BODY))

      expect(res.status).toBe(401)
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: STUDENT_OID },
        expect.objectContaining({ $set: expect.objectContaining({ failedLoginAttempts: 3 }) })
      )
    })

    it('verrouille le compte au 5ème échec et log ACCOUNT_LOCKED', async () => {
      mockBcryptCompare.mockResolvedValue(false)
      mockFindOneUser = jest.fn().mockResolvedValue({ ...STUDENT_USER, failedLoginAttempts: 4 })

      const res = await POST(makeRequest(STUDENT_BODY))

      expect(res.status).toBe(401)
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: STUDENT_OID },
        expect.objectContaining({
          $set: expect.objectContaining({
            failedLoginAttempts: 5,
            lockedUntil: expect.any(Date),
          }),
        })
      )
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ACCOUNT_LOCKED' })
      )
    })
  })

  // ── 6.6 MFA ─────────────────────────────────
  describe('MFA requis', () => {
    it('retourne mfaRequired:true sans token quand MFA activé (étudiant)', async () => {
      mockFindOneMfa = jest.fn().mockResolvedValue({ userId: STUDENT_OID, isEnabled: true })

      const res  = await POST(makeRequest(STUDENT_BODY))
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.mfaRequired).toBe(true)
      expect(json.userId).toBe(STUDENT_OID.toString())
      expect(json.accessToken).toBeUndefined()
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'MFA_REQUIRED' })
      )
    })
  })

  // ── 6.7 Connexion réussie – étudiant ────────
  describe('Connexion réussie (ahmed.bennani@student.ma)', () => {
    it('retourne 200 avec tokens et role student', async () => {
      const res  = await POST(makeRequest(STUDENT_BODY))
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.accessToken).toBe('access-token-mock')
      expect(json.refreshToken).toBe('refresh-token-mock')
      expect(json.role).toBe('student')
      expect(json.userId).toBe(STUDENT_OID.toString())
      expect(json.email).toBe('ahmed.bennani@student.ma')
    })

    it('réinitialise les compteurs d\'échec après succès', async () => {
      mockFindOneUser = jest.fn().mockResolvedValue({ ...STUDENT_USER, failedLoginAttempts: 3 })

      await POST(makeRequest(STUDENT_BODY))

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: STUDENT_OID },
        { $set: expect.objectContaining({ failedLoginAttempts: 0, lockedUntil: null }) }
      )
    })

    it('persiste le refresh token en base', async () => {
      await POST(makeRequest(STUDENT_BODY))

      expect(mockInsertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'refresh-token-mock',
          expiresAt: expect.any(Date),
        })
      )
    })

    it('log LOGIN_SUCCESS avec userId', async () => {
      await POST(makeRequest(STUDENT_BODY))

      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_SUCCESS',
          userId: STUDENT_OID.toString(),
        })
      )
    })

    it('normalise l\'email en minuscules avant la recherche DB', async () => {
      await POST(makeRequest({ ...STUDENT_BODY, email: 'AHMED.BENNANI@STUDENT.MA' }))

      expect(mockFindOneUser).toHaveBeenCalledWith({ email: 'ahmed.bennani@student.ma' })
    })
  })

  // ── 6.8 Connexion réussie – admin ───────────
  describe('Connexion réussie (admin@mentaura.com)', () => {
    beforeEach(() => {
      mockFindOneUser = jest.fn().mockResolvedValue(ADMIN_USER)
    })

    it('retourne 200 avec role admin', async () => {
      const res  = await POST(makeRequest(ADMIN_BODY))
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.role).toBe('admin')
      expect(json.email).toBe('admin@mentaura.com')
      expect(json.userId).toBe(ADMIN_OID.toString())
    })

    it('log LOGIN_SUCCESS avec userId admin', async () => {
      await POST(makeRequest(ADMIN_BODY))

      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_SUCCESS',
          userId: ADMIN_OID.toString(),
        })
      )
    })
  })

  // ── 6.9 Erreur serveur ──────────────────────
  describe('Erreur serveur inattendue', () => {
    it('retourne 500 si getDb() plante', async () => {
      const { getDb } = require('@/lib/mongodb')
      ;(getDb as jest.Mock).mockRejectedValueOnce(new Error('DB down'))

      const res  = await POST(makeRequest(STUDENT_BODY))
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.error).toBe('Erreur serveur')
    })
  })
})