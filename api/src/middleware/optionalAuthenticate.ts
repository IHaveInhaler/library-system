import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../lib/jwt'
import { prisma } from '../lib/prisma'

export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return next()

  try {
    const payload = verifyAccessToken(authHeader.slice(7))
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true },
    })
    if (user?.isActive) {
      req.user = { id: user.id, email: user.email, role: user.role }
    }
  } catch {
    // invalid / expired token — proceed as anonymous
  }
  next()
}
