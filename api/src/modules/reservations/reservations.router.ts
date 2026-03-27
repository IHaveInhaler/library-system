import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { authorizePermission } from '../../middleware/authorizePermission'
import {
  createReservationSchema,
  fulfillReservationSchema,
  reservationQuerySchema,
} from './reservations.schemas'
import * as controller from './reservations.controller'

const router = Router()

// All routes require authentication (applied in app.ts)
router.get('/', authorizePermission('VIEW_ALL_RESERVATIONS'), validate(reservationQuerySchema, 'query'), controller.list)
router.get('/:id', controller.getById)
router.post('/', validate(createReservationSchema), controller.create)
router.patch('/:id/cancel', controller.cancel)
router.patch('/:id/fulfill', authorizePermission('MANAGE_RESERVATIONS'), validate(fulfillReservationSchema), controller.fulfill)

export default router
