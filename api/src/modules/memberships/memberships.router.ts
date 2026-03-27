import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { authenticate } from '../../middleware/authenticate'
import { authorizePermission } from '../../middleware/authorizePermission'
import { createMembershipSchema, updateMembershipSchema } from './memberships.schemas'
import * as controller from './memberships.controller'

// Mounted at /api/libraries/:libraryId/memberships
const router = Router({ mergeParams: true })

router.get('/', authenticate, authorizePermission('MANAGE_MEMBERSHIPS'), controller.list)
router.get('/me', authenticate, controller.myMembership)
router.post('/', authenticate, authorizePermission('MANAGE_MEMBERSHIPS'), validate(createMembershipSchema), controller.create)
router.patch('/:userId', authenticate, authorizePermission('MANAGE_MEMBERSHIPS'), validate(updateMembershipSchema), controller.update)
router.delete('/:userId', authenticate, authorizePermission('MANAGE_MEMBERSHIPS'), controller.remove)

export default router
