import { Request, Response, NextFunction } from 'express'
import * as shelvesService from './shelves.service'
import { requireStaffAccess } from '../../lib/libraryStaff'

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await shelvesService.listShelves(req.query as any, req.user?.id, req.user?.role)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shelf = await shelvesService.getShelf(req.params.id as string, req.user?.id, req.user?.role)
    res.json(shelf)
  } catch (err) {
    next(err)
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await requireStaffAccess(req.user!.id, req.user!.role, req.body.libraryId)
    const shelf = await shelvesService.createShelf(req.body)
    res.status(201).json(shelf)
  } catch (err) {
    next(err)
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shelf = await shelvesService.getShelf(req.params.id as string)
    await requireStaffAccess(req.user!.id, req.user!.role, shelf.libraryId)
    const updated = await shelvesService.updateShelf(req.params.id as string, req.body)
    res.json(updated)
  } catch (err) {
    next(err)
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shelf = await shelvesService.getShelf(req.params.id as string)
    await requireStaffAccess(req.user!.id, req.user!.role, shelf.libraryId)
    await shelvesService.deleteShelf(req.params.id as string)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

export async function migratePosition(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fromPosition, toPosition } = req.body
    const result = await shelvesService.migratePosition(fromPosition, toPosition)
    res.json(result)
  } catch (err) {
    next(err)
  }
}
