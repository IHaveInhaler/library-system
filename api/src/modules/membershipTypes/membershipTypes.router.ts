import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { createMembershipTypeSchema, updateMembershipTypeSchema, reorderSchema } from './membershipTypes.schemas'
import * as controller from './membershipTypes.controller'

const router = Router()

// List is public (used in dropdowns)
router.get('/', controller.list)

// Write operations require ADMIN
router.post('/', authenticate, authorize('ADMIN'), validate(createMembershipTypeSchema), controller.create)
router.patch('/:id', authenticate, authorize('ADMIN'), validate(updateMembershipTypeSchema), controller.update)
router.delete('/:id', authenticate, authorize('ADMIN'), controller.remove)
router.post('/reorder', authenticate, authorize('ADMIN'), validate(reorderSchema), controller.reorder)

export default router
