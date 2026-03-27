import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { authorizePermission } from '../../middleware/authorizePermission'
import { auditQuerySchema } from './audit.schemas'
import * as controller from './audit.controller'

const router = Router()

// authenticate applied at app.ts level
router.get('/', authorizePermission('VIEW_AUDIT_LOG'), validate(auditQuerySchema, 'query'), controller.list)

export default router
