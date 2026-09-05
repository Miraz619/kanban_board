
import { Request, Response } from 'express'
import httpStatus from 'http-status'
import { AppError } from '../../error/AppError'
import { catchAsync } from '../../utils/catchAsync'
import { sendResponse } from '../../utils/sendResponse'
import { BoardService } from './board.service'

const createBoard = catchAsync(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req)

  const result = await BoardService.createBoard(
    userId,
    req.body,
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Board created successfully',
    data: result,
  })
})

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

const getMyBoards = catchAsync(async (req: Request, res: Response) => {
  const result = await BoardService.getMyBoards(
    getAuthenticatedUserId(req),
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Boards retrieved successfully',
    data: result,
  })
})

const getBoardById = catchAsync(async (req: Request, res: Response) => {
  const result = await BoardService.getBoardById(
    getRouteParam(req, 'boardId'),
    getAuthenticatedUserId(req),
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Board retrieved successfully',
    data: result,
  })
})

const updateBoard = catchAsync(async (req: Request, res: Response) => {
  const result = await BoardService.updateBoard(
    getRouteParam(req, 'boardId'),
    getAuthenticatedUserId(req),
    req.body,
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Board updated successfully',
    data: result,
  })
})

const deleteBoard = catchAsync(async (req: Request, res: Response) => {
  await BoardService.deleteBoard(
    getRouteParam(req, 'boardId'),
    getAuthenticatedUserId(req),
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Board deleted successfully',
    data: null,
  })
})

const getBoardMembers = catchAsync(async (req: Request, res: Response) => {
  const result = await BoardService.getBoardMembers(
    getRouteParam(req, 'boardId'),
    getAuthenticatedUserId(req),
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Board members retrieved successfully',
    data: result,
  })
})

const shareBoard = catchAsync(async (req: Request, res: Response) => {
  const result = await BoardService.shareBoard(
    getRouteParam(req, 'boardId'),
    getAuthenticatedUserId(req),
    req.body,
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Board shared successfully',
    data: result,
  })
})

const updateBoardMember = catchAsync(async (req: Request, res: Response) => {
  const result = await BoardService.updateBoardMember(
    getRouteParam(req, 'boardId'),
    getRouteParam(req, 'memberUserId'),
    getAuthenticatedUserId(req),
    req.body,
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Board member role updated successfully',
    data: result,
  })
})

const removeBoardMember = catchAsync(async (req: Request, res: Response) => {
  await BoardService.removeBoardMember(
    getRouteParam(req, 'boardId'),
    getRouteParam(req, 'memberUserId'),
    getAuthenticatedUserId(req),
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Board member removed successfully',
    data: null,
  })
})

export const BoardController = {
  createBoard,
  getMyBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  getBoardMembers,
  shareBoard,
  updateBoardMember,
  removeBoardMember,
}
