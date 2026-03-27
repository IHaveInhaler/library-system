import { Request, Response, NextFunction } from 'express'
import * as usersService from './users.service'

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.createUser(req.body)
    res.status(201).json(user)
  } catch (err) {
    next(err)
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await usersService.listUsers(req.query as any)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.getUser(req.params.id as string)
    res.json(user)
  } catch (err) {
    next(err)
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.updateUser(req.params.id as string, req.body, req.user?.id, req.user?.role)
    res.json(user)
  } catch (err) {
    next(err)
  }
}

export async function setActive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.setUserActive(req.params.id as string, req.body.isActive)
    res.json(user)
  } catch (err) {
    next(err)
  }
}

export async function revokeSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await usersService.revokeUserSessions(req.params.id as string)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await usersService.deleteUser(req.params.id as string)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

export async function loans(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await usersService.getUserLoans(
      req.params.id as string,
      req.user!.id,
      req.user!.role
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function reservations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await usersService.getUserReservations(
      req.params.id as string,
      req.user!.id,
      req.user!.role
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
}
