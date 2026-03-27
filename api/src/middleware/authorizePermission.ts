import { Request, Response, NextFunction } from 'express'
import { ForbiddenError, UnauthorizedError } from '../errors'
import { hasPermission } from '../lib/permissions'

export function authorizePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError()
      const granted = await hasPermission(req.user.role, permission)
      if (!granted) throw new ForbiddenError()
      next()
    } catch (err) {
      next(err)
    }
  }
}
