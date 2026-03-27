import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import * as controller from './permissions.controller'

const router = Router()

// All permission routes require ADMIN
router.get('/', authenticate, authorize('ADMIN'), controller.matrix)
router.patch('/:role/:permission', authenticate, authorize('ADMIN'), controller.set)

export default router
