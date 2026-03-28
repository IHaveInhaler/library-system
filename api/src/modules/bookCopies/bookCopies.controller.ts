import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { requireStaffAccess } from '../../lib/libraryStaff'
import { NotFoundError } from '../../errors'
import { logAction } from '../../lib/audit'
import * as copiesService from './bookCopies.service'

async function getLibraryIdForCopy(copyId: string): Promise<string> {
  const copy = await prisma.bookCopy.findUnique({
    where: { id: copyId },
    include: { shelf: { select: { libraryId: true } } },
  })
  if (!copy) throw new NotFoundError('Book copy')
  return copy.shelf.libraryId
}

async function getLibraryIdForShelf(shelfId: string): Promise<string> {
  const shelf = await prisma.shelf.findUnique({ where: { id: shelfId }, select: { libraryId: true } })
  if (!shelf) throw new NotFoundError('Shelf')
  return shelf.libraryId
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await copiesService.listCopies(req.query as any)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const copy = await copiesService.getCopy(req.params.id as string)
    res.json(copy)
  } catch (err) {
    next(err)
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const libraryId = await getLibraryIdForShelf(req.body.shelfId)
    await requireStaffAccess(req.user!.id, req.user!.role, libraryId)
    const copy = await copiesService.createCopy(req.body)
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'COPY_CREATED',
      targetType: 'BookCopy',
      targetId: copy.id,
      targetName: copy.book.title,
      metadata: { barcode: copy.barcode, bookId: copy.bookId, shelfId: copy.shelfId },
    })
    res.status(201).json(copy)
  } catch (err) {
    next(err)
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const libraryId = await getLibraryIdForCopy(req.params.id as string)
    await requireStaffAccess(req.user!.id, req.user!.role, libraryId)
    const copy = await copiesService.updateCopy(req.params.id as string, req.body)
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'COPY_UPDATED',
      targetType: 'BookCopy',
      targetId: copy.id,
      targetName: copy.book.title,
    })
    res.json(copy)
  } catch (err) {
    next(err)
  }
}

export async function setStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const libraryId = await getLibraryIdForCopy(req.params.id as string)
    await requireStaffAccess(req.user!.id, req.user!.role, libraryId)
    const prevCopy = await copiesService.getCopy(req.params.id as string)
    const copy = await copiesService.setCopyStatus(req.params.id as string, req.body)
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'COPY_STATUS_CHANGED',
      targetType: 'BookCopy',
      targetId: copy.id,
      targetName: copy.book.title,
      metadata: { from: prevCopy.status, to: copy.status },
    })
    res.json(copy)
  } catch (err) {
    next(err)
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const copy = await copiesService.getCopy(req.params.id as string)
    await requireStaffAccess(req.user!.id, req.user!.role, copy.shelf.libraryId)
    await copiesService.deleteCopy(req.params.id as string)
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'COPY_DELETED',
      targetType: 'BookCopy',
      targetId: copy.id,
      targetName: copy.book.title,
      metadata: { barcode: copy.barcode },
    })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
