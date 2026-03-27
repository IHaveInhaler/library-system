import { Request, Response, NextFunction } from 'express'
import { UnauthorizedError } from '../errors'
import { verifyAccessToken } from '../lib/jwt'
import { prisma } from '../lib/prisma'

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header')
    }

    const token = authHeader.slice(7)
    const payload = verifyAccessToken(token)

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true },
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive')
    }

    req.user = { id: user.id, email: user.email, role: user.role }
    next()
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      next(err)
    } else {
      next(new UnauthorizedError('Invalid or expired token'))
    }
  }
}
