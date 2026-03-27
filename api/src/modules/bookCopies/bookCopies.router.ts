import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { authorizePermission } from '../../middleware/authorizePermission'
import {
  createBookCopySchema,
  updateBookCopySchema,
  setCopyStatusSchema,
  copyQuerySchema,
} from './bookCopies.schemas'
import * as controller from './bookCopies.controller'

const router = Router()

router.get('/', authenticate, authorizePermission('MANAGE_COPIES'), validate(copyQuerySchema, 'query'), controller.list)
router.get('/:id', controller.getById)
router.post('/', authenticate, authorizePermission('MANAGE_COPIES'), validate(createBookCopySchema), controller.create)
router.patch('/:id', authenticate, authorizePermission('MANAGE_COPIES'), validate(updateBookCopySchema), controller.update)
router.patch('/:id/status', authenticate, authorizePermission('MANAGE_COPIES'), validate(setCopyStatusSchema), controller.setStatus)
router.delete('/:id', authenticate, authorize('ADMIN'), controller.remove)

export default router
