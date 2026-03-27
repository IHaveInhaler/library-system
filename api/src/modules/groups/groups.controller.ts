import { Request, Response, NextFunction } from 'express'
import * as groupsService from './groups.service'

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groups = await groupsService.listGroups()
    res.json(groups)
  } catch (err) {
    next(err)
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const group = await groupsService.createGroup(req.body)
    res.status(201).json(group)
  } catch (err) {
    next(err)
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const group = await groupsService.updateGroup(req.params.name as string, req.body)
    res.json(group)
  } catch (err) {
    next(err)
  }
}

export async function reorder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await groupsService.reorderGroups(req.body)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await groupsService.deleteGroup(req.params.name as string)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}
