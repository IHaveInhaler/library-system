import { Request, Response, NextFunction } from 'express'
import * as usersService from './users.service'
import * as auditService from '../audit/audit.service'
import { logAction } from '../../lib/audit'

function actorName(req: Request) {
  return req.user?.email
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.createUser(req.body)
    logAction({
      actorId: req.user?.id,
      actorName: actorName(req),
      action: 'USER_CREATED',
      targetType: 'User',
      targetId: user.id,
      targetName: `${user.firstName} ${user.lastName}`,
    })
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
    const prevUser = await usersService.getUser(req.params.id as string)
    const user = await usersService.updateUser(req.params.id as string, req.body, req.user?.id, req.user?.role)
    if (req.body.role && req.body.role !== prevUser.role) {
      logAction({
        actorId: req.user?.id,
        actorName: actorName(req),
        action: 'USER_ROLE_CHANGED',
        targetType: 'User',
        targetId: user.id,
        targetName: `${user.firstName} ${user.lastName}`,
        metadata: { from: prevUser.role, to: req.body.role },
      })
    }
    res.json(user)
  } catch (err) {
    next(err)
  }
}

export async function setActive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.setUserActive(req.params.id as string, req.body.isActive, req.body.reason)
    logAction({
      actorId: req.user?.id,
      actorName: actorName(req),
      action: req.body.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      targetType: 'User',
      targetId: user.id,
      targetName: `${user.firstName} ${user.lastName}`,
      metadata: req.body.reason ? { reason: req.body.reason } : undefined,
    })
    res.json(user)
  } catch (err) {
    next(err)
  }
}

export async function revokeSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const target = await usersService.getUser(req.params.id as string)
    await usersService.revokeUserSessions(req.params.id as string)
    logAction({
      actorId: req.user?.id,
      actorName: actorName(req),
      action: 'USER_SESSIONS_REVOKED',
      targetType: 'User',
      targetId: target.id,
      targetName: `${target.firstName} ${target.lastName}`,
    })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const target = await usersService.getUser(req.params.id as string)
    await usersService.deleteUser(req.params.id as string)
    logAction({
      actorId: req.user?.id,
      actorName: actorName(req),
      action: 'USER_DELETED',
      targetType: 'User',
      targetId: target.id,
      targetName: `${target.firstName} ${target.lastName}`,
    })
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

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const target = await usersService.getUser(req.params.id as string)
    const result = await usersService.resetUserPassword(req.params.id as string)
    logAction({
      actorId: req.user?.id,
      actorName: req.user?.email,
      action: 'USER_PASSWORD_RESET',
      targetType: 'User',
      targetId: target.id,
      targetName: `${target.firstName} ${target.lastName}`,
    })
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function auditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await auditService.getUserAuditLogs(req.params.id as string, req.query as any)
    res.json(result)
  } catch (err) {
    next(err)
  }
}
