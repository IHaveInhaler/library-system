import { Request, Response, NextFunction } from 'express'
import * as loansService from './loans.service'

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await loansService.listLoans(req.query as any)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const loan = await loansService.getLoan(req.params.id as string)
    res.json(loan)
  } catch (err) {
    next(err)
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const loan = await loansService.createLoan(req.body)
    res.status(201).json(loan)
  } catch (err) {
    next(err)
  }
}

export async function returnLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const loan = await loansService.returnLoan(req.params.id as string)
    res.json(loan)
  } catch (err) {
    next(err)
  }
}

export async function renewLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const loan = await loansService.renewLoan(
      req.params.id as string,
      req.user!.id,
      req.user!.role
    )
    res.json(loan)
  } catch (err) {
    next(err)
  }
}

export async function markOverdue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const loan = await loansService.markOverdue(req.params.id as string)
    res.json(loan)
  } catch (err) {
    next(err)
  }
}
