import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { authorize } from '../../middleware/authorize'
import { authorizePermission } from '../../middleware/authorizePermission'
import { createLoanSchema, loanQuerySchema } from './loans.schemas'
import * as controller from './loans.controller'

const router = Router()

// All routes require authentication (applied in app.ts)
router.get('/', authorizePermission('VIEW_ALL_LOANS'), validate(loanQuerySchema, 'query'), controller.list)
router.get('/:id', authorizePermission('VIEW_ALL_LOANS'), controller.getById)
router.post('/', authorizePermission('ISSUE_LOANS'), validate(createLoanSchema), controller.create)
router.patch('/:id/return', authorizePermission('RETURN_LOANS'), controller.returnLoan)
router.patch('/:id/renew', controller.renewLoan)
router.patch('/:id/overdue', authorize('ADMIN'), controller.markOverdue)

export default router
