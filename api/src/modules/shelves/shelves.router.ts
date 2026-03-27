import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { authorizePermission } from '../../middleware/authorizePermission'
import { optionalAuthenticate } from '../../middleware/optionalAuthenticate'
import { createShelfSchema, updateShelfSchema, shelfQuerySchema } from './shelves.schemas'
import * as controller from './shelves.controller'

const router = Router()

router.get('/', optionalAuthenticate, validate(shelfQuerySchema, 'query'), controller.list)
router.get('/:id', optionalAuthenticate, controller.getById)
router.post('/', authenticate, authorizePermission('MANAGE_SHELVES'), validate(createShelfSchema), controller.create)
router.patch('/:id', authenticate, authorizePermission('MANAGE_SHELVES'), validate(updateShelfSchema), controller.update)
router.delete('/:id', authenticate, authorize('ADMIN'), controller.remove)

export default router
