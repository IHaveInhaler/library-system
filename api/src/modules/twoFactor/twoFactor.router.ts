import { Router, Request, Response, NextFunction } from 'express'
import { generateSecret, generate, verify as otpVerify, generateURI } from 'otplib'
import QRCode from 'qrcode'
import { prisma } from '../../lib/prisma'
import { authenticate } from '../../middleware/authenticate'
import { BadRequestError, NotFoundError } from '../../errors'
import { getSetting } from '../../lib/settings'
import { signAccessToken, signRefreshToken } from '../../lib/jwt'
const router = Router()

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
    res.json({ message: 'TOTP verified and enabled.' })
  } catch (err) { next(err) }
})

router.delete('/totp', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { totpSecret: null, totpVerified: false },
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
    const key = await prisma.securityKey.findUnique({ where: { id: req.params.id as string } })
    if (!key || key.userId !== req.user!.id) throw new NotFoundError('Security key')
    await prisma.securityKey.delete({ where: { id: key.id } })
    res.json({ message: 'Security key removed.' })
  } catch (err) { next(err) }
})

// ── 2FA Status ──────────────────────────────────────────────────────────────

router.get('/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user) throw new NotFoundError('User')
    const keyCount = await prisma.securityKey.count({ where: { userId: user.id } })

    // Check if 2FA is required for this user's role
    const requiredRolesJson = await getSetting('2fa.requiredRoles')
    const devMode = (await getSetting('dev.enabled')) === 'true'
    let required = false
    if (!devMode && requiredRolesJson) {
      try { required = JSON.parse(requiredRolesJson).includes(user.role) } catch { /* ignore */ }
    }

    res.json({
      totpEnabled: user.totpVerified,
      securityKeyCount: keyCount,
      required,
      enforced: required && !user.totpVerified && keyCount === 0,
    })
  } catch (err) { next(err) }
})

// ── 2FA Challenge (called during login) ─────────────────────────────────────

router.post('/challenge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, method, code } = req.body
    if (!userId || !method) throw new BadRequestError('userId and method are required')

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new BadRequestError('Invalid')

    if (method === 'totp') {
      if (!user.totpSecret || !user.totpVerified) throw new BadRequestError('TOTP not configured')
      if (!code) throw new BadRequestError('Code is required')
      const isValid = otpVerify({ token: code, secret: user.totpSecret })
      if (!isValid) throw new BadRequestError('Invalid code')
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
