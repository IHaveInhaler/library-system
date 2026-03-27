import { Request, Response, NextFunction } from 'express'
import * as copiesService from './bookCopies.service'

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
    const copy = await copiesService.createCopy(req.body)
    res.status(201).json(copy)
  } catch (err) {
    next(err)
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const copy = await copiesService.updateCopy(req.params.id as string, req.body)
    res.json(copy)
  } catch (err) {
    next(err)
  }
}

export async function setStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const copy = await copiesService.setCopyStatus(req.params.id as string, req.body)
    res.json(copy)
  } catch (err) {
    next(err)
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await copiesService.deleteCopy(req.params.id as string)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
