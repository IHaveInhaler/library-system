import { Request, Response, NextFunction } from 'express'
import * as authService from './auth.service'
import { logAction } from '../../lib/audit'

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.register(req.body)
    logAction({
      actorId: result.user.id,
      actorName: result.user.email,
      action: 'USER_REGISTERED',
      targetType: 'User',
      targetId: result.user.id,
      targetName: `${result.user.firstName} ${result.user.lastName}`,
    })
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.body)
    logAction({
      actorId: result.user.id,
      actorName: result.user.email,
      action: 'USER_LOGIN',
      targetType: 'User',
      targetId: result.user.id,
    })
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tokens = await authService.refresh(req.body.refreshToken)
    res.json(tokens)
  } catch (err) {
    next(err)
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.logout(req.body.refreshToken)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getMe(req.user!.id)
    res.json(user)
  } catch (err) {
    next(err)
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.forgotPassword(req.body)
    res.json({ message: 'If that email exists, a reset link has been sent.' })
  } catch (err) {
    next(err)
  }
}

export async function resetPasswordWithToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.resetPasswordWithToken(req.body)
    res.json({ message: 'Password reset successfully.' })
  } catch (err) {
    next(err)
  }
}
