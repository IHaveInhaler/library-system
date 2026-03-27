import { Request, Response, NextFunction } from 'express'
import * as authService from './auth.service'

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.register(req.body)
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.body)
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
