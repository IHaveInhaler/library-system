import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { authorize } from '../../middleware/authorize'
import { createDamageReportSchema, damageReportQuerySchema, resolveDamageReportSchema } from './damageReports.schemas'
import * as controller from './damageReports.controller'

const router = Router()

router.get('/', authorize('LIBRARIAN', 'ADMIN'), validate(damageReportQuerySchema, 'query'), controller.list)
router.post('/', validate(createDamageReportSchema), controller.create)
router.get('/loan/:loanId', controller.getForLoan)
router.get('/user/:userId', authorize('LIBRARIAN', 'ADMIN'), controller.getUserDamageInfo)
router.patch('/:id/resolve', authorize('LIBRARIAN', 'ADMIN'), validate(resolveDamageReportSchema), controller.resolve)
router.get('/:id', authorize('LIBRARIAN', 'ADMIN'), controller.getById)

export default router
