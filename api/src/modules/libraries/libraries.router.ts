import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { authorizePermission } from '../../middleware/authorizePermission'
import { optionalAuthenticate } from '../../middleware/optionalAuthenticate'
import { createLibrarySchema, updateLibrarySchema, libraryQuerySchema } from './libraries.schemas'
import * as controller from './libraries.controller'
import membershipsRouter from '../memberships/memberships.router'

const router = Router()

router.use('/:libraryId/memberships', membershipsRouter)

router.get('/', optionalAuthenticate, validate(libraryQuerySchema, 'query'), controller.list)
router.get('/:id', optionalAuthenticate, controller.getById)
router.get('/:id/shelves', optionalAuthenticate, controller.shelves)
router.post('/', authenticate, authorizePermission('CREATE_LIBRARY'), validate(createLibrarySchema), controller.create)
router.patch('/:id', authenticate, authorizePermission('MANAGE_LIBRARIES'), validate(updateLibrarySchema), controller.update)
router.delete('/:id', authenticate, authorize('ADMIN'), controller.remove)

export default router
