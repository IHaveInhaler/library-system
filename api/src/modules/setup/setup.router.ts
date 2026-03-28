import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { verifyCodeSchema, createAdminSchema, factoryResetSchema } from './setup.schemas'
import * as controller from './setup.controller'

const router = Router()

router.get('/status', controller.status)
router.post('/generate-code', controller.generateCode)
router.post('/verify-code', validate(verifyCodeSchema), controller.verifyCode)
router.post('/admin', validate(createAdminSchema), controller.createAdmin)
router.post('/resume', controller.resumeExisting)
router.post('/complete', authenticate, authorize('ADMIN'), controller.complete)
router.post('/dev-seed', controller.devSeed)
router.post('/dev-mode', authenticate, authorize('ADMIN'), controller.setDevMode)
router.post('/factory-reset', authenticate, authorize('ADMIN'), validate(factoryResetSchema), controller.factoryReset)

export default router
