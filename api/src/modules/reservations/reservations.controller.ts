import { Request, Response, NextFunction } from 'express'
import * as reservationsService from './reservations.service'
import { hasPermission } from '../../lib/permissions'
import { ForbiddenError } from '../../errors'

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await reservationsService.listReservations(req.query as any)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const reservation = await reservationsService.getReservation(req.params.id as string)
    res.json(reservation)
  } catch (err) {
    next(err)
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let targetUserId = req.user!.id
    if (req.body.userId && req.body.userId !== req.user!.id) {
      const canManage = await hasPermission(req.user!.role, 'MANAGE_RESERVATIONS')
      if (!canManage) throw new ForbiddenError('MANAGE_RESERVATIONS required to create reservations for other users')
      targetUserId = req.body.userId
    }
    const reservation = await reservationsService.createReservation(req.body, targetUserId)
    res.status(201).json(reservation)
  } catch (err) {
    next(err)
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const reservation = await reservationsService.cancelReservation(
      req.params.id as string,
      req.user!.id,
      req.user!.role
    )
    res.json(reservation)
  } catch (err) {
    next(err)
  }
}

export async function fulfill(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const reservation = await reservationsService.fulfillReservation(req.params.id as string, req.body)
    res.json(reservation)
  } catch (err) {
    next(err)
  }
}
