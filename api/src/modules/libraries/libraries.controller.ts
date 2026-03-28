import { Request, Response, NextFunction } from 'express'
import { logAction } from '../../lib/audit'
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
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'LIBRARY_CREATED',
      targetType: 'Library',
      targetId: library.id,
      targetName: library.name,
    })
    res.status(201).json(library)
  } catch (err) { next(err) }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const library = await librariesService.updateLibrary(req.params.id as string, req.body)
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'LIBRARY_UPDATED',
      targetType: 'Library',
      targetId: library.id,
      targetName: library.name,
    })
    res.json(library)
  } catch (err) { next(err) }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const prevLibrary = await librariesService.getLibrary(req.params.id as string)
    const library = await librariesService.deleteLibrary(req.params.id as string, {
      action: req.body?.action,
      targetLibraryId: req.body?.targetLibraryId,
    })
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'LIBRARY_DELETED',
      targetType: 'Library',
      targetId: req.params.id as string,
      targetName: prevLibrary.name,
      metadata: { action: req.body?.action, targetLibraryId: req.body?.targetLibraryId },
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
