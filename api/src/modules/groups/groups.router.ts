import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { validate } from '../../middleware/validate'
import { createGroupSchema, updateGroupSchema, reorderGroupsSchema } from './groups.schemas'
import * as controller from './groups.controller'

const router = Router()

// All group routes require ADMIN
router.get('/', authenticate, authorize('ADMIN'), controller.list)
router.post('/', authenticate, authorize('ADMIN'), validate(createGroupSchema), controller.create)
router.post('/reorder', authenticate, authorize('ADMIN'), validate(reorderGroupsSchema), controller.reorder)
router.patch('/:name', authenticate, authorize('ADMIN'), validate(updateGroupSchema), controller.update)
router.delete('/:name', authenticate, authorize('ADMIN'), controller.remove)

export default router
