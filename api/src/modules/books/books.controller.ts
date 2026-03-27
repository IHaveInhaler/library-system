import { Request, Response, NextFunction } from 'express'
import * as booksService from './books.service'

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await booksService.listBooks(req.query as any, req.user?.id, req.user?.role)
    res.json(result)
  } catch (err) { next(err) }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const book = await booksService.getBook(req.params.id as string, req.user?.id, req.user?.role)
    res.json(book)
  } catch (err) { next(err) }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const book = await booksService.createBook(req.body)
    res.status(201).json(book)
  } catch (err) { next(err) }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const book = await booksService.updateBook(req.params.id as string, req.body)
    res.json(book)
  } catch (err) { next(err) }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await booksService.deleteBook(req.params.id as string)
    res.status(204).send()
  } catch (err) { next(err) }
}

export async function copies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await booksService.getBookCopies(req.params.id as string, req.user?.id, req.user?.role)
    res.json(result)
  } catch (err) { next(err) }
}

export async function lookupIsbn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await booksService.lookupIsbn(req.params.isbn as string)
    res.json(result)
  } catch (err) { next(err) }
}

export async function createFromIsbn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const book = await booksService.createBookFromIsbn(req.body)
    res.status(201).json(book)
  } catch (err) { next(err) }
}
