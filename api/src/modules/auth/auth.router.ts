import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { authenticate } from '../../middleware/authenticate'
import { registerSchema, loginSchema, refreshSchema, forgotPasswordSchema, resetPasswordTokenSchema } from './auth.schemas'
import * as controller from './auth.controller'

const router = Router()

router.post('/register', validate(registerSchema), controller.register)
router.post('/login', validate(loginSchema), controller.login)
router.post('/refresh', validate(refreshSchema), controller.refresh)
router.post('/logout', validate(refreshSchema), authenticate, controller.logout)
router.get('/me', authenticate, controller.me)
router.post('/forgot-password', validate(forgotPasswordSchema), controller.forgotPassword)
router.post('/reset-password', validate(resetPasswordTokenSchema), controller.resetPasswordWithToken)

export default router
