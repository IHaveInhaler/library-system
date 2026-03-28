import { Router, Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { logAction } from '../../lib/audit'
import * as backupService from './backups.service'

const router = Router()

// All routes require admin
router.use(authenticate, authorize('ADMIN'))

// ── Verification codes (in-memory, for restore and delete operations) ──
const verificationCodes = new Map<string, { code: string; expiresAt: Date }>()

// Shared verification helper — issues challenge or verifies credential/code
async function issueChallenge(userId: string, action: string, req: Request, res: Response): Promise<void> {
  const { prisma } = await import('../../lib/prisma')
  const keys = await prisma.securityKey.findMany({ where: { userId } })

  if (keys.length > 0) {
    const { generateAuthenticationOptions } = await import('@simplewebauthn/server')
    const options = await generateAuthenticationOptions({
      rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
      allowCredentials: keys.map((k) => ({ id: k.credentialId, type: 'public-key' as const })),
      userVerification: 'preferred',
    })
    verificationCodes.set(`webauthn:${userId}:${action}`, { code: options.challenge, expiresAt: new Date(Date.now() + 5 * 60 * 1000) })
    res.json({ method: 'security-key', options })
    return
  }

  const code = crypto.randomInt(100000, 999999).toString()
  verificationCodes.set(`code:${userId}:${action}`, { code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) })

  console.log('')
  console.log('╔══════════════════════════════════════════╗')
  console.log('║         VERIFICATION CODE                ║')
  console.log('║                                          ║')
  console.log(`║          Code:  ${code}                ║`)
  console.log('║                                          ║')
  console.log(`║   Action: ${action.padEnd(30)}║`)
  console.log('║   Expires in 10 minutes.                 ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log('')

  res.json({ method: 'console-code', message: 'A verification code has been printed in the server logs.' })
}

async function verifyCredential(userId: string, action: string, credential: any, req: Request): Promise<boolean> {
  const storeKey = `webauthn:${userId}:${action}`
  const stored = verificationCodes.get(storeKey)
  if (!stored || stored.expiresAt < new Date()) return false

  const { prisma } = await import('../../lib/prisma')
  const { verifyAuthenticationResponse } = await import('@simplewebauthn/server')

  const credId = typeof credential.id === 'string' ? credential.id : credential.rawId
  const key = await prisma.securityKey.findUnique({ where: { credentialId: credId } })
  if (!key || key.userId !== userId) return false

  try {
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: stored.code,
      expectedOrigin: `${req.protocol}://${req.get('host')}`,
      expectedRPID: process.env.WEBAUTHN_RP_ID || 'localhost',
      credential: { id: key.credentialId, publicKey: Buffer.from(key.publicKey, 'base64url'), counter: key.counter },
    })
    if (!verification.verified) return false
    await prisma.securityKey.update({ where: { id: key.id }, data: { counter: verification.authenticationInfo.newCounter } })
    verificationCodes.delete(storeKey)
    return true
  } catch {
    return false
  }
}

function verifyCode(userId: string, action: string, code: string): boolean {
  const storeKey = `code:${userId}:${action}`
  const stored = verificationCodes.get(storeKey)
  if (!stored || stored.expiresAt < new Date()) return false
  if (stored.code !== code) return false
  verificationCodes.delete(storeKey)
  return true
}

// ── List backups ──
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ backups: backupService.listBackups() })
  } catch (err) { next(err) }
})

// ── Create manual backup ──
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const note = (req.body as any)?.note || 'Manual backup'
    const backup = backupService.createBackup('manual', note)
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'BACKUP_CREATED',
      targetType: 'Backup',
      targetId: backup.id,
      targetName: backup.filename,
      metadata: { note },
    })
    res.json(backup)
  } catch (err) { next(err) }
})

// ── Delete backup (requires verification) ──
router.post('/:id/delete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const backup = backupService.getBackup(id)
    if (!backup) { res.status(404).json({ code: 'NOT_FOUND', message: 'Backup not found' }); return }

    const { step, credential, code } = req.body as { step: string; credential?: any; code?: string }

    if (step === 'challenge') {
      await issueChallenge(req.user!.id, `delete-backup:${id}`, req, res)
      return
    }

    if (step === 'verify') {
      let verified = false
      if (credential) verified = await verifyCredential(req.user!.id, `delete-backup:${id}`, credential, req)
      else if (code) verified = verifyCode(req.user!.id, `delete-backup:${id}`, code)

      if (!verified) { res.status(403).json({ code: 'FORBIDDEN', message: 'Verification failed' }); return }

      backupService.deleteBackup(id)
      logAction({
        actorId: req.user!.id,
        actorName: req.user!.email,
        action: 'BACKUP_DELETED',
        targetType: 'Backup',
        targetId: id,
        targetName: backup.filename,
      })
      res.json({ success: true, message: 'Backup deleted' })
      return
    }

    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'step must be "challenge" or "verify"' })
  } catch (err) { next(err) }
})

// ── Download backup ──
router.get('/:id/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const backup = backupService.getBackup(req.params.id as string)
    const filePath = backupService.getBackupPath(req.params.id as string)
    if (!backup || !filePath) { res.status(404).json({ code: 'NOT_FOUND', message: 'Backup not found' }); return }
    res.download(filePath, backup.filename)
  } catch (err) { next(err) }
})

// ── Restore backup (two-step: challenge then verify) ──
router.post('/:id/restore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const backup = backupService.getBackup(id)
    if (!backup) { res.status(404).json({ code: 'NOT_FOUND', message: 'Backup not found' }); return }

    const { step, credential, code } = req.body as { step: string; credential?: any; code?: string }

    if (step === 'challenge') {
      await issueChallenge(req.user!.id, `restore:${id}`, req, res)
      return
    }

    if (step === 'verify') {
      let verified = false
      if (credential) verified = await verifyCredential(req.user!.id, `restore:${id}`, credential, req)
      else if (code) verified = verifyCode(req.user!.id, `restore:${id}`, code)

      if (!verified) { res.status(403).json({ code: 'FORBIDDEN', message: 'Verification failed' }); return }

      backupService.restoreBackup(id)
      logAction({
        actorId: req.user!.id,
        actorName: req.user!.email,
        action: 'BACKUP_RESTORED',
        targetType: 'Backup',
        targetId: id,
        targetName: backup.filename,
      })
      res.json({ success: true, message: 'Database restored. Please restart the server and re-login.' })
      return
    }

    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'step must be "challenge" or "verify"' })
  } catch (err) { next(err) }
})

export default router
