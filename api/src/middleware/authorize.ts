import { Request, Response, NextFunction } from 'express'
import { ForbiddenError, UnauthorizedError } from '../errors'

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError())
      return
    }
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError(`Requires one of: ${roles.join(', ')}`))
      return
    }
    next()
  }
}
