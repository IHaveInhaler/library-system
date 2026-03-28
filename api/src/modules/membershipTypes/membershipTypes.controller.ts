import { Request, Response, NextFunction } from 'express'
import * as service from './membershipTypes.service'

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await service.listMembershipTypes())
  } catch (err) { next(err) }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.createMembershipType(req.body)
    res.status(201).json(result)
  } catch (err) { next(err) }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.updateMembershipType(req.params.id as string, req.body)
    res.json(result)
  } catch (err) { next(err) }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await service.deleteMembershipType(req.params.id as string)
    res.status(204).end()
  } catch (err) { next(err) }
}

export async function reorder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await service.reorderMembershipTypes(req.body.ids)
    res.json({ message: 'Reordered' })
  } catch (err) { next(err) }
}
