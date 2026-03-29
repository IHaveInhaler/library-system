import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import * as setupService from './setup.service'
import { logAction } from '../../lib/audit'

export async function status(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await setupService.getStatus())
  } catch (err) {
    next(err)
  }
}

export async function generateCode(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await setupService.generateCode())
  } catch (err) {
    next(err)
  }
}

export async function verifyCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await setupService.verifyCode(req.body.code)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function createAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.headers['x-setup-token'] as string
    if (!token) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing setup token' })
      return
    }
    setupService.verifySetupToken(token)
    setupService.consumeSetupToken(token) // Single-use: prevent reuse

    const result = await setupService.createAdmin(req.body)

    await logAction({
      actorId: result.user.id,
      actorName: result.user.email,
      action: 'SETUP_ADMIN_CREATED',
      targetType: 'User',
      targetId: result.user.id,
      targetName: `${result.user.firstName} ${result.user.lastName}`,
    })

    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

export async function resumeExisting(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await setupService.resumeExisting()
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function complete(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await setupService.completeSetup()

    await logAction({
      actorId: req.user?.id,
      actorName: req.user?.email,
      action: 'SETUP_COMPLETED',
    })

    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function devSeed(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.headers['x-setup-token'] as string
    if (!token) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing setup token' })
      return
    }
    setupService.verifySetupToken(token)
    setupService.consumeSetupToken(token) // Single-use

    const result = await setupService.devSeed()
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function setDevMode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const enabled = req.body.enabled === true
    const result = await setupService.setDevMode(enabled)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

// In-memory factory reset codes
const resetCodes = new Map<string, { code: string; expiresAt: Date }>()

export async function factoryReset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { step, code } = req.body as { step: string; code?: string }

    if (step === 'challenge') {
      const resetCode = crypto.randomInt(100000, 999999).toString()
      resetCodes.set(req.user!.id, { code: resetCode, expiresAt: new Date(Date.now() + 10 * 60 * 1000) })

      console.log('')
      console.log('╔══════════════════════════════════════════╗')
      console.log('║         FACTORY RESET CODE               ║')
      console.log('║                                          ║')
      console.log(`║          Code:  ${resetCode}                ║`)
      console.log('║                                          ║')
      console.log('║   Enter this code to confirm reset.      ║')
      console.log('║   Expires in 10 minutes.                 ║')
      console.log('╚══════════════════════════════════════════╝')
      console.log('')

      res.json({ message: 'A factory reset code has been printed in the server logs.' })
      return
    }

    if (step === 'verify') {
      const stored = resetCodes.get(req.user!.id)
      if (!stored || stored.expiresAt < new Date()) {
        res.status(400).json({ code: 'EXPIRED', message: 'Code expired. Start again.' })
        return
      }
      if (stored.code !== code) {
        res.status(403).json({ code: 'FORBIDDEN', message: 'Invalid code' })
        return
      }
      resetCodes.delete(req.user!.id)

      await logAction({ actorId: req.user?.id, actorName: req.user?.email, action: 'FACTORY_RESET' })
      const result = await setupService.factoryReset()
      res.json(result)
      return
    }

    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'step must be "challenge" or "verify"' })
  } catch (err) {
    next(err)
  }
}
