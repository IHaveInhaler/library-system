import { Request, Response, NextFunction } from 'express'
import * as auditService from './audit.service'

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await auditService.listAuditLogs(req.query as any)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getForUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await auditService.getUserAuditLogs(req.params.id as string, req.query as any)
    res.json(result)
  } catch (err) {
    next(err)
  }
}
