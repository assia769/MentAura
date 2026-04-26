import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken'

const ACCESS_SECRET  = process.env.JWT_SECRET!
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

export interface TokenPayload {
  userId: string
  email: string
  role: 'admin' | 'student'
}

// ── Access token (15 min) ──────────────────────────────────────────────────
export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' } as SignOptions)
}

// ── Refresh token (7 days) ────────────────────────────────────────────────
export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' } as SignOptions)
}

// ── Verify access token ───────────────────────────────────────────────────
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload
}

// ── Verify refresh token ──────────────────────────────────────────────────
export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload
}