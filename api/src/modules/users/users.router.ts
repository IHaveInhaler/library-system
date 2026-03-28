import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { authorize } from '../../middleware/authorize'
import { authorizePermission } from '../../middleware/authorizePermission'
import { createUserSchema, updateUserSchema, paginationSchema } from './users.schemas'
import { auditQuerySchema } from '../audit/audit.schemas'
import * as controller from './users.controller'

const router = Router()

// All routes require authentication (applied in app.ts)
router.get('/', authorizePermission('VIEW_USERS'), validate(paginationSchema, 'query'), controller.list)
router.post('/', authorizePermission('MANAGE_USERS'), validate(createUserSchema), controller.create)
router.get('/:id', authorizePermission('VIEW_USERS'), controller.getById)
router.patch('/:id', authorizePermission('MANAGE_USERS'), validate(updateUserSchema), controller.update)
router.patch('/:id/active', authorizePermission('MANAGE_USERS'), controller.setActive)
router.post('/:id/revoke-sessions', authorizePermission('MANAGE_USERS'), controller.revokeSessions)
router.post('/:id/reset-password', authorizePermission('RESET_USER_PASSWORD'), controller.resetPassword)
router.post('/:id/require-2fa', authorizePermission('MANAGE_USERS'), controller.require2FA)
router.delete('/:id', authorize('ADMIN'), controller.remove)
// loans + reservations: self-access always allowed; viewing others requires VIEW_USERS (enforced in service)
router.get('/:id/loans', controller.loans)
router.get('/:id/reservations', controller.reservations)
router.get('/:id/audit', authorizePermission('VIEW_USERS'), validate(auditQuerySchema, 'query'), controller.auditLogs)

export default router
