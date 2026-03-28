import { Router } from 'express'
import * as controller from './settings.controller'

const router = Router()

router.get('/', controller.getSettings)
router.patch('/', controller.updateSettings) // Per-key permissions checked in handler

export default router
