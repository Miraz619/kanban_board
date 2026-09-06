import { Request, Response } from 'express'
import httpStatus from 'http-status'
import { AppError } from '../../error/AppError.js'
import { catchAsync } from '../../utils/catchAsync.js'
import { sendResponse } from '../../utils/sendResponse.js'
import { TaskService } from './task.service.js'
import { TaskValidation } from './task.validation.js'

const getAuthenticatedUserId = (req: Request) => {
  if (!req.user) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'User is not authenticated',
    )
  }

  return req.user.userId
}

const createTask = catchAsync(async (req: Request, res: Response) => {
  const { columnId } = TaskValidation.columnParams.parse(req.params)
  const result = await TaskService.createTask(
    columnId,
    getAuthenticatedUserId(req),
    req.body,
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Task created successfully',
    data: result,
  })
})

const getTasks = catchAsync(async (req: Request, res: Response) => {
  const { columnId } = TaskValidation.columnParams.parse(req.params)
  const result = await TaskService.getTasks(
    columnId,
    getAuthenticatedUserId(req),
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Tasks retrieved successfully',
    data: result,
  })
})

const getTaskById = catchAsync(async (req: Request, res: Response) => {
  const { taskId } = TaskValidation.taskParams.parse(req.params)
  const result = await TaskService.getTaskById(
    taskId,
    getAuthenticatedUserId(req),
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Task retrieved successfully',
    data: result,
  })
})

const updateTask = catchAsync(async (req: Request, res: Response) => {
  const { taskId } = TaskValidation.taskParams.parse(req.params)
  const result = await TaskService.updateTask(
    taskId,
    getAuthenticatedUserId(req),
    req.body,
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Task updated successfully',
    data: result,
  })
})

const deleteTask = catchAsync(async (req: Request, res: Response) => {
  const { taskId } = TaskValidation.taskParams.parse(req.params)
  await TaskService.deleteTask(taskId, getAuthenticatedUserId(req))

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Task deleted successfully',
    data: null,
  })
})

const moveTask = catchAsync(async (req: Request, res: Response) => {
  const { taskId } = TaskValidation.taskParams.parse(req.params)
  const result = await TaskService.moveTask(
    taskId,
    getAuthenticatedUserId(req),
    req.body,
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Task moved successfully',
    data: result,
  })
})

export const TaskController = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  moveTask,
}
