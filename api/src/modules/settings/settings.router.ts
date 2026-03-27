import { Router } from 'express'
import { authorize } from '../../middleware/authorize'
import * as controller from './settings.controller'

const router = Router()

router.get('/', controller.getSettings)
router.patch('/', authorize('ADMIN'), controller.updateSettings)

export default router
