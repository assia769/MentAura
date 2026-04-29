import { SignJWT, jwtVerify } from 'jose'

const ACCESS_SECRET  = new TextEncoder().encode(process.env.JWT_SECRET!)
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!)

export interface TokenPayload {
  userId: string
  email: string
  role: 'admin' | 'student'
}

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(ACCESS_SECRET)
}

export async function signRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(REFRESH_SECRET)
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET)
  return payload as unknown as TokenPayload
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, REFRESH_SECRET)
  return payload as unknown as TokenPayload
}