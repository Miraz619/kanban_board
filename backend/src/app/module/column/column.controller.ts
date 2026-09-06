import { Request, Response } from 'express'
import httpStatus from 'http-status'
import { AppError } from '../../error/AppError.js'
import { catchAsync } from '../../utils/catchAsync.js'
import { sendResponse } from '../../utils/sendResponse.js'
import { ColumnService } from './column.service.js'

const getAuthenticatedUserId = (req: Request) => {
  if (!req.user) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'User is not authenticated',
    )
  }

  return req.user.userId
}

const getRouteParam = (req: Request, name: string) => {
  const value = req.params[name]

  if (!value || Array.isArray(value)) {
    throw new AppError(httpStatus.BAD_REQUEST, `Invalid ${name}`)
  }

  return value
}

const getColumns = catchAsync(async (req: Request, res: Response) => {
  const result = await ColumnService.getColumns(
    getRouteParam(req, 'boardId'),
    getAuthenticatedUserId(req),
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Columns retrieved successfully',
    data: result,
  })
})

const createColumn = catchAsync(async (req: Request, res: Response) => {
  const result = await ColumnService.createColumn(
    getRouteParam(req, 'boardId'),
    getAuthenticatedUserId(req),
    req.body,
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Column created successfully',
    data: result,
  })
})

const updateColumn = catchAsync(async (req: Request, res: Response) => {
  const result = await ColumnService.updateColumn(
    getRouteParam(req, 'boardId'),
    getRouteParam(req, 'columnId'),
    getAuthenticatedUserId(req),
    req.body,
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Column updated successfully',
    data: result,
  })
})

const deleteColumn = catchAsync(async (req: Request, res: Response) => {
  await ColumnService.deleteColumn(
    getRouteParam(req, 'boardId'),
    getRouteParam(req, 'columnId'),
    getAuthenticatedUserId(req),
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Column deleted successfully',
    data: null,
  })
})

export const ColumnController = {
  getColumns,
  createColumn,
  updateColumn,
  deleteColumn,
}
