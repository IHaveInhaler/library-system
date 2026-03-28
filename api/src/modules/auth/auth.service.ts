import crypto from 'crypto'
import { prisma } from '../../lib/prisma'
import { hashPassword, comparePassword } from '../../lib/password'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt'
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError, ForbiddenError } from '../../errors'
import { env } from '../../config/env'
import { getSetting, getSettings } from '../../lib/settings'
import { sendPasswordResetEmail, sendEmailVerificationCode } from '../../lib/mailer'
import { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordTokenInput } from './auth.schemas'

function issueTokens(userId: string, role: string) {
  const payload = { sub: userId, role }
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  }
}

export async function register(input: RegisterInput) {
  // Check registration settings
  const regSettings = await getSettings(['reg.mode', 'reg.allowedDomain', 'reg.token', 'reg.requireApproval', 'reg.requireEmailConfirmation'])
  const mode = regSettings['reg.mode'] || 'open'

  if (mode === 'disabled') {
    throw new ForbiddenError('Registration is currently disabled')
  }

  if (mode === 'domain') {
    const allowedDomain = regSettings['reg.allowedDomain']
    if (allowedDomain) {
      const emailDomain = input.email.split('@')[1]?.toLowerCase()
      if (emailDomain !== allowedDomain.toLowerCase()) {
        throw new ForbiddenError(`Registration is restricted to @${allowedDomain} email addresses`)
      }
    }
  }

  if (mode === 'token') {
    const validToken = regSettings['reg.token']
    if (!input.registrationToken || input.registrationToken !== validToken) {
      throw new ForbiddenError('Invalid registration token')
    }
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) throw new ConflictError('Email already in use')

  const requireApproval = regSettings['reg.requireApproval'] === 'true'
  const requireEmailConfirmation = regSettings['reg.requireEmailConfirmation'] === 'true'
  const passwordHash = await hashPassword(input.password)

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      isActive: !requireApproval,
      emailVerified: !requireEmailConfirmation,
      deactivationReason: requireApproval ? 'Awaiting approval' : null,
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, emailVerified: true, createdAt: true },
  })

  // Send email verification code if required
  if (requireEmailConfirmation) {
    const code = crypto.randomInt(100_000, 999_999).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    await prisma.emailVerification.create({ data: { userId: user.id, code, expiresAt } })
    await sendEmailVerificationCode(user.email, code)
    return { user, pendingEmailVerification: true }
  }

  // If approval required, don't issue tokens
  if (requireApproval) {
    return { user, pendingApproval: true }
  }

  const tokens = issueTokens(user.id, user.role)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.refreshToken.create({
    data: { token: tokens.refreshToken, userId: user.id, expiresAt },
  })

  return { user, ...tokens }
}

export async function verifyEmail(email: string, code: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new BadRequestError('Invalid email or code')

  const verification = await prisma.emailVerification.findFirst({
    where: { userId: user.id, code, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  if (!verification) throw new BadRequestError('Invalid or expired verification code')

  await prisma.$transaction([
    prisma.emailVerification.update({ where: { id: verification.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } }),
  ])

  if (!user.isActive) {
    return { message: 'Email verified. Your account is pending approval.' }
  }

  return { message: 'Email verified.' }
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  if (!user || !user.isActive) throw new UnauthorizedError('Invalid credentials')
  if (!user.emailVerified) throw new UnauthorizedError('Please verify your email before logging in')

  const valid = await comparePassword(input.password, user.passwordHash)
  if (!valid) throw new UnauthorizedError('Invalid credentials')

  // Check if 2FA is required
  const has2FA = user.totpVerified || (await prisma.securityKey.count({ where: { userId: user.id } })) > 0
  const devMode = (await getSetting('dev.enabled')) === 'true'
  const securityKeysOnly = (await getSetting('2fa.securityKeysOnly')) === 'true'

  if (has2FA && !devMode) {
    const methods: string[] = []
    if (user.totpVerified && !securityKeysOnly) methods.push('totp')
    const keyCount = await prisma.securityKey.count({ where: { userId: user.id } })
    if (keyCount > 0) methods.push('securityKey')
    if (methods.length > 0) return { userId: user.id, requires2FA: true, methods }
  }

  // Check if 2FA is required by role but not set up
  if (!devMode) {
    const requiredRolesJson = await getSetting('2fa.requiredRoles')
    if (requiredRolesJson) {
      try {
        const requiredRoles = JSON.parse(requiredRolesJson)
        if (requiredRoles.includes(user.role) && !has2FA) {
          // Let them in but they'll need to set up 2FA
          // The frontend will enforce setup
        }
      } catch { /* ignore */ }
    }
  }

  const tokens = issueTokens(user.id, user.role)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.refreshToken.create({
    data: { token: tokens.refreshToken, userId: user.id, expiresAt },
  })

  const { passwordHash: _, totpSecret: _s, ...safeUser } = user
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
      avatarUrl: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!user) throw new NotFoundError('User')

  // Include staff library IDs so frontend knows where user has management access
  let staffLibraryIds: string[] | null = null
  if (user.role === 'ADMIN') {
    staffLibraryIds = null // null means all
  } else {
    const staffMemberships = await prisma.libraryMembership.findMany({
      where: { userId, isActive: true, type: { isStaff: true } },
      select: { libraryId: true },
    })
    staffLibraryIds = staffMemberships.map((m) => m.libraryId)
  }

  // Check if 2FA setup is required for this user
  const fullUser = await prisma.user.findUnique({ where: { id: userId }, select: { totpVerified: true, pending2FA: true } })
  const keyCount = await prisma.securityKey.count({ where: { userId } })
  const has2FA = fullUser?.totpVerified || keyCount > 0

  let requires2FASetup = false
  const devMode = (await getSetting('dev.enabled')) === 'true'

  // Admin-forced pending 2FA (clears automatically once 2FA is set up)
  if (fullUser?.pending2FA && !has2FA && !devMode) {
    requires2FASetup = true
  }

  // Role-based 2FA requirement
  if (!requires2FASetup && !devMode) {
    const requiredRolesJson = await getSetting('2fa.requiredRoles')
    if (requiredRolesJson) {
      try {
        const requiredRoles = JSON.parse(requiredRolesJson)
        if (requiredRoles.includes(user.role) && !has2FA) {
          const securityKeysOnly = (await getSetting('2fa.securityKeysOnly')) === 'true'
          requires2FASetup = securityKeysOnly ? keyCount === 0 : !fullUser?.totpVerified && keyCount === 0
        }
      } catch { /* ignore */ }
    }
  }

  // Auto-clear pending2FA once 2FA is set up
  if (fullUser?.pending2FA && has2FA) {
    await prisma.user.update({ where: { id: userId }, data: { pending2FA: false } })
  }

  return { ...user, staffLibraryIds, requires2FASetup }
}
