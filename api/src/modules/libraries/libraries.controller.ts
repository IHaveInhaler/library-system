import { Request, Response, NextFunction } from 'express'
import * as librariesService from './libraries.service'

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await librariesService.listLibraries(req.query as any, req.user?.id, req.user?.role)
    res.json(result)
  } catch (err) { next(err) }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const library = await librariesService.getLibrary(req.params.id as string, req.user?.id, req.user?.role)
    res.json(library)
  } catch (err) { next(err) }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const library = await librariesService.createLibrary(req.body)
    res.status(201).json(library)
  } catch (err) { next(err) }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const library = await librariesService.updateLibrary(req.params.id as string, req.body)
    res.json(library)
  } catch (err) { next(err) }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const library = await librariesService.deleteLibrary(req.params.id as string, {
      action: req.body?.action,
      targetLibraryId: req.body?.targetLibraryId,
    })
    res.json(library)
  } catch (err) { next(err) }
}

export async function shelves(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await librariesService.getLibraryShelves(req.params.id as string, req.user?.id, req.user?.role)
    res.json(result)
  } catch (err) { next(err) }
}
