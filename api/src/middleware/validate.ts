import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'
import { ValidationError } from '../errors'

type Target = 'body' | 'query' | 'params'

export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target])
    if (!result.success) {
      next(new ValidationError(result.error.issues))
      return
    }
    ;(req as unknown as Record<string, unknown>)[target] = result.data
    next()
  }
}
