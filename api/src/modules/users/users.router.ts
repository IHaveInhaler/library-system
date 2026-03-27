import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { authorize } from '../../middleware/authorize'
import { authorizePermission } from '../../middleware/authorizePermission'
import { createUserSchema, updateUserSchema, paginationSchema } from './users.schemas'
import * as controller from './users.controller'

const router = Router()

// All routes require authentication (applied in app.ts)
router.post('/', authorizePermission('MANAGE_USERS'), validate(createUserSchema), controller.create)
router.get('/', authorizePermission('MANAGE_USERS'), validate(paginationSchema, 'query'), controller.list)
router.get('/:id', authorizePermission('MANAGE_USERS'), controller.getById)
router.patch('/:id', authorizePermission('MANAGE_USERS'), validate(updateUserSchema), controller.update)
router.delete('/:id', authorize('ADMIN'), controller.remove)
router.get('/:id/loans', controller.loans)
router.get('/:id/reservations', controller.reservations)

export default router
