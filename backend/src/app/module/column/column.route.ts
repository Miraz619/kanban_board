import { Router } from 'express'
import { auth } from '../../middleware/checkAuth.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { ColumnController } from './column.controller.js'
import { ColumnValidation } from './column.validation.js'

const router = Router({ mergeParams: true })

router.use(auth())

router.get('/', ColumnController.getColumns)

router.post(
  '/',
  validateRequest(ColumnValidation.createColumn),
  ColumnController.createColumn,
)

router.patch(
  '/:columnId',
  validateRequest(ColumnValidation.updateColumn),
  ColumnController.updateColumn,
)

router.delete('/:columnId', ColumnController.deleteColumn)

export const ColumnRoutes = router
