import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { AppError } from '../errors/AppError'

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    })
    return
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ code: 'CONFLICT', message: 'A record with that value already exists' })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Record not found' })
      return
    }
    if (err.code === 'P2003') {
      res.status(400).json({ code: 'BAD_REQUEST', message: 'Related record not found' })
      return
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ code: 'BAD_REQUEST', message: 'Invalid data provided' })
    return
  }

  console.error(err)
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Something went wrong' })
}
