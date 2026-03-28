import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export interface TokenPayload {
  sub: string
  role: string
}

export interface ChallengePayload {
  sub: string
  purpose: '2fa-challenge'
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions)
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions)
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
  }) as unknown as TokenPayload
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    algorithms: ['HS256'],
  }) as unknown as TokenPayload
}

export function sign2FAChallenge(userId: string): string {
  return jwt.sign(
    { sub: userId, purpose: '2fa-challenge' } satisfies ChallengePayload,
    env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '5m' } as jwt.SignOptions,
  )
}

export function verify2FAChallenge(token: string): ChallengePayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
  }) as unknown as ChallengePayload
  if (payload.purpose !== '2fa-challenge') {
    throw new Error('Invalid token purpose')
  }
  return payload
}
