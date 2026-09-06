import { Router } from 'express'
import { auth } from '../../middleware/checkAuth.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { TaskController } from './task.controller.js'
import { TaskValidation } from './task.validation.js'

const columnTaskRouter = Router({ mergeParams: true })
const taskRouter = Router()

columnTaskRouter.use(auth())
taskRouter.use(auth())

columnTaskRouter.post(
  '/',
  validateRequest(TaskValidation.createTask),
  TaskController.createTask,
)

columnTaskRouter.get('/', TaskController.getTasks)

taskRouter.get('/:taskId', TaskController.getTaskById)

taskRouter.patch(
  '/:taskId',
  validateRequest(TaskValidation.updateTask),
  TaskController.updateTask,
)

taskRouter.delete('/:taskId', TaskController.deleteTask)

taskRouter.patch(
  '/:taskId/move',
  validateRequest(TaskValidation.moveTask),
  TaskController.moveTask,
)

export const ColumnTaskRoutes = columnTaskRouter
export const TaskRoutes = taskRouter
