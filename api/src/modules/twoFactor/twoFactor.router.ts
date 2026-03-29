import crypto from 'crypto'
import { Router, Request, Response, NextFunction } from 'express'
import { generateSecret, verify as otpVerify, generateURI } from 'otplib'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import QRCode from 'qrcode'
import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import { authenticate } from '../../middleware/authenticate'
import { BadRequestError, NotFoundError } from '../../errors'
import { logAction } from '../../lib/audit'
import { getSetting } from '../../lib/settings'
import { signAccessToken, signRefreshToken, verify2FAChallenge } from '../../lib/jwt'
const router = Router()

// ── Backup Code Helper ─────────────────────────────────────────────────────

const BACKUP_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0,O,I,1,L
function generateBackupCodes(count = 8): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    let code = ''
    for (let j = 0; j < 16; j++) {
      code += BACKUP_CODE_CHARS[crypto.randomInt(BACKUP_CODE_CHARS.length)]
    }
    codes.push([code.slice(0, 4), code.slice(4, 8), code.slice(8, 12), code.slice(12, 16)].join('-'))
  }
  return codes
}

// ── Backup Codes ───────────────────────────────────────────────────────────

router.post('/backup-codes/generate', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, select: { passwordHash: true } })

    // Require password if codes already exist (regeneration)
    const existingCount = await prisma.backupCode.count({ where: { userId: req.user!.id } })
    if (existingCount > 0) {
      if (!req.body.password) throw new BadRequestError('Password required to regenerate codes')
      const valid = await bcrypt.compare(req.body.password, user.passwordHash)
      if (!valid) { res.status(403).json({ code: 'FORBIDDEN', message: 'Invalid password' }); return }
    }

    // Delete old codes
    await prisma.backupCode.deleteMany({ where: { userId: req.user!.id } })

    // Generate new codes
    const plaintextCodes = generateBackupCodes()
    const hashes = await Promise.all(plaintextCodes.map(code => bcrypt.hash(code.replace('-', ''), 12)))

    await prisma.backupCode.createMany({
      data: hashes.map(h => ({ userId: req.user!.id, codeHash: h }))
    })

    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: existingCount > 0 ? 'BACKUP_CODES_REGENERATED' : 'BACKUP_CODES_GENERATED',
      targetType: 'User',
      targetId: req.user!.id,
    })

    res.json({ codes: plaintextCodes })
  } catch (err) { next(err) }
})

router.get('/backup-codes/count', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.backupCode.count({ where: { userId: req.user!.id } })
    res.json({ count })
  } catch (err) { next(err) }
})

// ── TOTP Setup ──────────────────────────────────────────────────────────────

router.post('/totp/setup', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user) throw new NotFoundError('User')
    if (user.totpVerified) throw new BadRequestError('TOTP is already set up')

    const secret = generateSecret()
    const appName = (await getSetting('brand.appName')) || 'Library Portal'
    const otpauthUrl = generateURI({ secret, issuer: appName, label: user.email })
    const qrCode = await QRCode.toDataURL(otpauthUrl)

    await prisma.user.update({ where: { id: user.id }, data: { totpSecret: secret } })

    res.json({ secret, otpauthUrl, qrCode })
  } catch (err) { next(err) }
})

router.post('/totp/verify', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.body
    if (!code || typeof code !== 'string') throw new BadRequestError('Code is required')

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user || !user.totpSecret) throw new BadRequestError('TOTP not set up')

    const isValid = otpVerify({ token: code, secret: user.totpSecret })
    if (!isValid) throw new BadRequestError('Invalid code')

    await prisma.user.update({ where: { id: user.id }, data: { totpVerified: true } })
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'TOTP_ENABLED',
      targetType: 'User',
      targetId: user.id,
      targetName: user.email,
    })

    // Auto-generate backup codes if none exist
    const existingBackupCodes = await prisma.backupCode.count({ where: { userId: user.id } })
    if (existingBackupCodes === 0) {
      const plaintextCodes = generateBackupCodes()
      const hashes = await Promise.all(plaintextCodes.map(code => bcrypt.hash(code.replace('-', ''), 12)))
      await prisma.backupCode.createMany({
        data: hashes.map(h => ({ userId: user.id, codeHash: h }))
      })
      res.json({ message: 'TOTP verified and enabled.', backupCodes: plaintextCodes })
      return
    }

    res.json({ message: 'TOTP verified and enabled.' })
  } catch (err) { next(err) }
})

router.delete('/totp', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { passwordHash } = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, select: { passwordHash: true } })
    const valid = await bcrypt.compare(req.body.password, passwordHash)
    if (!valid) { res.status(403).json({ code: 'FORBIDDEN', message: 'Invalid password' }); return }

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { totpSecret: null, totpVerified: false },
    })
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'TOTP_REMOVED',
      targetType: 'User',
      targetId: req.user!.id,
    })
    res.json({ message: 'TOTP removed.' })
  } catch (err) { next(err) }
})

// ── Security Keys ───────────────────────────────────────────────────────────

router.get('/security-keys', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const keys = await prisma.securityKey.findMany({
      where: { userId: req.user!.id },
      select: { id: true, name: true, createdAt: true },
    })
    res.json(keys)
  } catch (err) { next(err) }
})

router.delete('/security-key/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { passwordHash } = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, select: { passwordHash: true } })
    const valid = await bcrypt.compare(req.body.password, passwordHash)
    if (!valid) { res.status(403).json({ code: 'FORBIDDEN', message: 'Invalid password' }); return }

    const key = await prisma.securityKey.findUnique({ where: { id: req.params.id as string } })
    if (!key || key.userId !== req.user!.id) throw new NotFoundError('Security key')
    await prisma.securityKey.delete({ where: { id: key.id } })
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'SECURITY_KEY_REMOVED',
      targetType: 'SecurityKey',
      targetId: key.id,
      targetName: key.name,
    })
    res.json({ message: 'Security key removed.' })
  } catch (err) { next(err) }
})

// ── WebAuthn Registration ────────────────────────────────────────────────────

// In-memory challenge store (per-user, short-lived)
const challengeStore = new Map<string, { challenge: string; expiresAt: number }>()

const RP_NAME = 'Library Portal'
const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost'
const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost'

router.post('/security-key/register-options', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user) throw new NotFoundError('User')

    const existingKeys = await prisma.securityKey.findMany({
      where: { userId: user.id },
      select: { credentialId: true },
    })

    const options = await generateRegistrationOptions({
      rpName: (await getSetting('brand.appName')) || RP_NAME,
      rpID: RP_ID,
      userName: user.email,
      userDisplayName: `${user.firstName} ${user.lastName}`,
      attestationType: 'none',
      excludeCredentials: existingKeys.map((k) => ({
        id: k.credentialId,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    })

    // Store challenge
    challengeStore.set(user.id, { challenge: options.challenge, expiresAt: Date.now() + 5 * 60 * 1000 })

    res.json(options)
  } catch (err) { next(err) }
})

router.post('/security-key/register-verify', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user) throw new NotFoundError('User')

    const stored = challengeStore.get(user.id)
    if (!stored || Date.now() > stored.expiresAt) throw new BadRequestError('Challenge expired — try again')
    challengeStore.delete(user.id)

    const verification = await verifyRegistrationResponse({
      response: req.body.attestation,
      expectedChallenge: stored.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    })

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestError('Verification failed')
    }

    const { credential } = verification.registrationInfo
    await prisma.securityKey.create({
      data: {
        userId: user.id,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString('base64'),
        counter: credential.counter,
        name: req.body.name || 'Security Key',
      },
    })

    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'SECURITY_KEY_REGISTERED',
      targetType: 'SecurityKey',
      targetName: req.body.name || 'Security Key',
    })

    // Auto-generate backup codes if none exist
    const existingBackupCodes = await prisma.backupCode.count({ where: { userId: user.id } })
    if (existingBackupCodes === 0) {
      const plaintextCodes = generateBackupCodes()
      const hashes = await Promise.all(plaintextCodes.map(code => bcrypt.hash(code.replace('-', ''), 12)))
      await prisma.backupCode.createMany({
        data: hashes.map(h => ({ userId: user.id, codeHash: h }))
      })
      res.json({ message: 'Security key registered.', backupCodes: plaintextCodes })
      return
    }

    res.json({ message: 'Security key registered.' })
  } catch (err) { next(err) }
})

// ── WebAuthn Authentication ─────────────────────────────────────────────────

router.post('/security-key/auth-options', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { challengeToken } = req.body
    if (!challengeToken) throw new BadRequestError('challengeToken required')

    let userId: string
    try {
      const payload = verify2FAChallenge(challengeToken)
      userId = payload.sub
    } catch {
      throw new BadRequestError('Invalid or expired challenge token')
    }

    const keys = await prisma.securityKey.findMany({
      where: { userId },
      select: { credentialId: true },
    })

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: keys.map((k) => ({
        id: k.credentialId,
      })),
      userVerification: 'preferred',
    })

    challengeStore.set(userId, { challenge: options.challenge, expiresAt: Date.now() + 5 * 60 * 1000 })
    res.json(options)
  } catch (err) { next(err) }
})

// ── 2FA Status ──────────────────────────────────────────────────────────────

router.get('/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user) throw new NotFoundError('User')
    const keyCount = await prisma.securityKey.count({ where: { userId: user.id } })

    // Check if 2FA is required for this user's role or via pending2FA flag
    const requiredRolesJson = await getSetting('2fa.requiredRoles')
    const devMode = (await getSetting('dev.enabled')) === 'true'
    const securityKeysOnly = (await getSetting('2fa.securityKeysOnly')) === 'true'
    let required = false
    if (!devMode) {
      if (user.pending2FA) required = true
      if (!required && requiredRolesJson) {
        try { required = JSON.parse(requiredRolesJson).includes(user.role) } catch { /* ignore */ }
      }
    }

    const meetsRequirement = securityKeysOnly ? keyCount > 0 : (user.totpVerified || keyCount > 0)
    const backupCodeCount = await prisma.backupCode.count({ where: { userId: user.id } })

    res.json({
      totpEnabled: user.totpVerified,
      securityKeyCount: keyCount,
      backupCodeCount,
      required,
      securityKeysOnly,
      enforced: required && !meetsRequirement,
    })
  } catch (err) { next(err) }
})

// ── 2FA Challenge (called during login) ─────────────────────────────────────

router.post('/challenge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { challengeToken, method, code } = req.body
    if (!challengeToken || !method) throw new BadRequestError('challengeToken and method are required')

    let userId: string
    try {
      const payload = verify2FAChallenge(challengeToken)
      userId = payload.sub
    } catch {
      throw new BadRequestError('Invalid or expired challenge token')
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new BadRequestError('Invalid')

    if (method === 'totp') {
      if (!user.totpSecret || !user.totpVerified) throw new BadRequestError('TOTP not configured')
      if (!code) throw new BadRequestError('Code is required')
      const isValid = otpVerify({ token: code, secret: user.totpSecret })
      if (!isValid) throw new BadRequestError('Invalid code')
    } else if (method === 'securityKey') {
      const { assertion } = req.body
      if (!assertion) throw new BadRequestError('Assertion response required')

      const stored = challengeStore.get(userId)
      if (!stored || Date.now() > stored.expiresAt) throw new BadRequestError('Challenge expired')
      challengeStore.delete(userId)

      // Find the credential being used
      const credId = assertion.id
      const key = await prisma.securityKey.findFirst({
        where: { userId, credentialId: credId },
      })
      if (!key) throw new BadRequestError('Unknown security key')

      const verification = await verifyAuthenticationResponse({
        response: assertion,
        expectedChallenge: stored.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        credential: {
          id: key.credentialId,
          publicKey: Buffer.from(key.publicKey, 'base64'),
          counter: key.counter,
        },
      })

      if (!verification.verified) throw new BadRequestError('Verification failed')

      // Update counter
      await prisma.securityKey.update({
        where: { id: key.id },
        data: { counter: verification.authenticationInfo.newCounter },
      })
    } else if (method === 'backupCode') {
      if (!code) throw new BadRequestError('Backup code is required')
      const normalizedCode = code.replace(/[-\s]/g, '').toUpperCase()

      const backupCodes = await prisma.backupCode.findMany({ where: { userId } })
      if (backupCodes.length === 0) throw new BadRequestError('No backup codes configured')

      let matched = false
      for (const bc of backupCodes) {
        if (await bcrypt.compare(normalizedCode, bc.codeHash)) {
          matched = true
          break
        }
      }
      if (!matched) throw new BadRequestError('Invalid backup code')

      // Disable ALL 2FA
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { totpSecret: null, totpVerified: false, pending2FA: false },
        }),
        prisma.securityKey.deleteMany({ where: { userId } }),
        prisma.backupCode.deleteMany({ where: { userId } }),
      ])

      logAction({
        actorId: userId,
        actorName: user.email,
        action: '2FA_RESET_BY_BACKUP_CODE',
        targetType: 'User',
        targetId: userId,
        targetName: user.email,
      })
    } else {
      throw new BadRequestError('Unsupported 2FA method')
    }

    const payload = { sub: user.id, role: user.role }
    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } })

    const { passwordHash: _, totpSecret: _s, ...safeUser } = user
    res.json({ user: safeUser, accessToken, refreshToken })
  } catch (err) { next(err) }
})

export default router
