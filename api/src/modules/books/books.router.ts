import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { authenticate } from '../../middleware/authenticate'
import { authorizePermission } from '../../middleware/authorizePermission'
import { optionalAuthenticate } from '../../middleware/optionalAuthenticate'
import { createBookSchema, updateBookSchema, bookQuerySchema, isbnLookupSchema } from './books.schemas'
import * as controller from './books.controller'

const router = Router()

router.get('/', optionalAuthenticate, validate(bookQuerySchema, 'query'), controller.list)
router.get('/isbn/:isbn', controller.lookupIsbn)
router.get('/:id', optionalAuthenticate, controller.getById)
router.get('/:id/copies', optionalAuthenticate, controller.copies)
router.post('/isbn', authenticate, authorizePermission('MANAGE_BOOKS'), validate(isbnLookupSchema), controller.createFromIsbn)
router.post('/', authenticate, authorizePermission('MANAGE_BOOKS'), validate(createBookSchema), controller.create)
router.patch('/:id', authenticate, authorizePermission('MANAGE_BOOKS'), validate(updateBookSchema), controller.update)
router.delete('/:id', authenticate, authorizePermission('DELETE_BOOK'), controller.remove)

export default router
