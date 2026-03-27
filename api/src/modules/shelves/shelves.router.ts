import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { authorizePermission } from '../../middleware/authorizePermission'
import { createShelfSchema, updateShelfSchema, shelfQuerySchema } from './shelves.schemas'
import * as controller from './shelves.controller'

const router = Router()

router.get('/', validate(shelfQuerySchema, 'query'), controller.list)
router.get('/:id', controller.getById)
router.post('/', authenticate, authorizePermission('MANAGE_SHELVES'), validate(createShelfSchema), controller.create)
router.patch('/:id', authenticate, authorizePermission('MANAGE_SHELVES'), validate(updateShelfSchema), controller.update)
router.delete('/:id', authenticate, authorize('ADMIN'), controller.remove)

export default router
