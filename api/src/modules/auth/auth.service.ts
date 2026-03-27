import crypto from 'crypto'
import { prisma } from '../../lib/prisma'
import { hashPassword, comparePassword } from '../../lib/password'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt'
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from '../../errors'
import { env } from '../../config/env'
import { getSetting } from '../../lib/settings'
import { sendPasswordResetEmail } from '../../lib/mailer'
import { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordTokenInput } from './auth.schemas'

function issueTokens(userId: string, role: string) {
  const payload = { sub: userId, role }
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  }
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) throw new ConflictError('Email already in use')

  const passwordHash = await hashPassword(input.password)

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
  })

  const tokens = issueTokens(user.id, user.role)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.refreshToken.create({
    data: { token: tokens.refreshToken, userId: user.id, expiresAt },
  })

  return { user, ...tokens }
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  if (!user || !user.isActive) throw new UnauthorizedError('Invalid credentials')

  const valid = await comparePassword(input.password, user.passwordHash)
  if (!valid) throw new UnauthorizedError('Invalid credentials')

  const tokens = issueTokens(user.id, user.role)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.refreshToken.create({
    data: { token: tokens.refreshToken, userId: user.id, expiresAt },
  })

  const { passwordHash: _, ...safeUser } = user
  return { user: safeUser, ...tokens }
}

export async function refresh(token: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { token } })

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Invalid or expired refresh token')
  }

  let payload: { sub: string; role: string }
  try {
    payload = verifyRefreshToken(token)
  } catch {
    throw new UnauthorizedError('Invalid refresh token')
  }

  // Token rotation — revoke old, issue new
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  })

  const tokens = issueTokens(payload.sub, payload.role)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.refreshToken.create({
    data: { token: tokens.refreshToken, userId: payload.sub, expiresAt },
  })

  return tokens
}

export async function logout(token: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { token } })
  if (stored && !stored.revokedAt) {
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })
  }
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  // Always return success — don't reveal whether email exists
  if (!user || !user.isActive) return

  // Invalidate existing unused tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  })

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } })

  const baseUrl = (await getSetting('app.baseUrl')) || env.CORS_ORIGIN || 'http://localhost:5173'
  const resetLink = `${baseUrl}/reset-password?token=${token}`

  await sendPasswordResetEmail(user.email, resetLink)
}

export async function resetPasswordWithToken(input: ResetPasswordTokenInput): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({ where: { token: input.token } })
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new BadRequestError('Invalid or expired reset token')
  }

  const passwordHash = await hashPassword(input.password)
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({ where: { userId: record.userId }, data: { revokedAt: new Date() } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ])
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!user) throw new NotFoundError('User')
  return user
}
