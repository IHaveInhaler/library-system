import { Request, Response, NextFunction } from 'express'
import { PERMISSIONS } from '../../lib/permissions'
import * as service from './permissions.service'

export async function matrix(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.getPermissionMatrix()
    res.json({ permissions: PERMISSIONS, matrix: data })
  } catch (err) { next(err) }
}

export async function set(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { role, permission } = req.params as { role: string; permission: string }
    const { granted } = req.body as { granted: boolean }
    const result = await service.setPermission(role, permission, granted)
    res.json(result)
  } catch (err) { next(err) }
}
