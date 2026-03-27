import { Request, Response, NextFunction } from 'express'
import * as reservationsService from './reservations.service'

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
    const reservation = await reservationsService.createReservation(req.body, req.user!.id)
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
