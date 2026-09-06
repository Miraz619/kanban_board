import httpStatus from 'http-status'
import { BoardMemberRole } from '../../../generated/prisma/enums.js'
import { AppError } from '../../error/AppError.js'
import { prisma } from '../../lib/prisma.js'
import {
  ICreateColumnPayload,
  IUpdateColumnPayload,
} from './column.interface.js'

const getBoardAccess = async (boardId: string, userId: string) => {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: {
      ownerId: true,
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  })

  if (!board) {
    throw new AppError(httpStatus.NOT_FOUND, 'Board not found')
  }

  const isOwner = board.ownerId === userId
  const memberRole = board.members[0]?.role

  if (!isOwner && !memberRole) {
    throw new AppError(httpStatus.NOT_FOUND, 'Board not found')
  }

  return { isOwner, memberRole }
}

const ensureCanEditBoard = async (boardId: string, userId: string) => {
  const access = await getBoardAccess(boardId, userId)

  if (
    !access.isOwner &&
    access.memberRole !== BoardMemberRole.EDITOR
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You do not have permission to modify this board',
    )
  }
}

const getColumns = async (boardId: string, userId: string) => {
  await getBoardAccess(boardId, userId)

  return prisma.boardColumn.findMany({
    where: { boardId },
    select: {
      id: true,
      title: true,
      position: true,
      boardId: true,
      tasks: {
        orderBy: { position: 'asc' },
      },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { position: 'asc' },
  })
}

const createColumn = async (
  boardId: string,
  userId: string,
  payload: ICreateColumnPayload,
) => {
  await ensureCanEditBoard(boardId, userId)

  return prisma.$transaction(async (transactionClient) => {
    const lastColumn = await transactionClient.boardColumn.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
      select: { position: true },
    })

    const nextPosition = lastColumn
      ? lastColumn.position + 1
      : 0

    return transactionClient.boardColumn.create({
      data: {
        title: payload.title,
        boardId,
        position: nextPosition,
      },
      select: {
        id: true,
        title: true,
        position: true,
        boardId: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })
}

const updateColumn = async (
  boardId: string,
  columnId: string,
  userId: string,
  payload: IUpdateColumnPayload,
) => {
  await ensureCanEditBoard(boardId, userId)

  const column = await prisma.boardColumn.findFirst({
    where: {
      id: columnId,
      boardId,
    },
    select: { id: true },
  })

  if (!column) {
    throw new AppError(httpStatus.NOT_FOUND, 'Column not found')
  }

  return prisma.boardColumn.update({
    where: { id: columnId },
    data: { title: payload.title },
    select: {
      id: true,
      title: true,
      position: true,
      boardId: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

const deleteColumn = async (
  boardId: string,
  columnId: string,
  userId: string,
) => {
  await ensureCanEditBoard(boardId, userId)

  await prisma.$transaction(async (transactionClient) => {
    const column = await transactionClient.boardColumn.findFirst({
      where: {
        id: columnId,
        boardId,
      },
      select: {
        id: true,
        position: true,
      },
    })

    if (!column) {
      throw new AppError(httpStatus.NOT_FOUND, 'Column not found')
    }

    const followingColumns = await transactionClient.boardColumn.findMany({
      where: {
        boardId,
        position: { gt: column.position },
      },
      select: {
        id: true,
        position: true,
      },
      orderBy: { position: 'asc' },
    })

    await transactionClient.boardColumn.delete({
      where: { id: column.id },
    })

    for (const followingColumn of followingColumns) {
      await transactionClient.boardColumn.update({
        where: { id: followingColumn.id },
        data: { position: followingColumn.position - 1 },
      })
    }
  })
}

export const ColumnService = {
  getColumns,
  createColumn,
  updateColumn,
  deleteColumn,
}
