import { Request, Response, NextFunction } from 'express'
import { logAction } from '../../lib/audit'
import { requireStaffAccess } from '../../lib/libraryStaff'
import * as service from './memberships.service'

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.listMemberships(req.params.libraryId as string)
    res.json(result)
  } catch (err) { next(err) }
}

export async function myMembership(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const membership = await service.getMyMembership(req.params.libraryId as string, req.user!.id)
    res.json(membership ?? null)
  } catch (err) { next(err) }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await requireStaffAccess(req.user!.id, req.user!.role, req.params.libraryId as string)
    const membership = await service.createMembership(req.params.libraryId as string, req.body)
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'MEMBERSHIP_CREATED',
      targetType: 'Membership',
      targetId: membership.id,
      targetName: `${membership.user.firstName} ${membership.user.lastName}`,
      metadata: { libraryId: req.params.libraryId, userId: req.body.userId },
    })
    res.status(201).json(membership)
  } catch (err) { next(err) }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await requireStaffAccess(req.user!.id, req.user!.role, req.params.libraryId as string)
    const membership = await service.updateMembership(req.params.libraryId as string, req.params.userId as string, req.body)
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'MEMBERSHIP_UPDATED',
      targetType: 'Membership',
      targetName: `${membership.user.firstName} ${membership.user.lastName}`,
      metadata: { libraryId: req.params.libraryId, userId: req.params.userId },
    })
    res.json(membership)
  } catch (err) { next(err) }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await requireStaffAccess(req.user!.id, req.user!.role, req.params.libraryId as string)
    await service.removeMembership(req.params.libraryId as string, req.params.userId as string)
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'MEMBERSHIP_REMOVED',
      targetType: 'Membership',
      metadata: { libraryId: req.params.libraryId, userId: req.params.userId },
    })
    res.status(204).send()
  } catch (err) { next(err) }
}
