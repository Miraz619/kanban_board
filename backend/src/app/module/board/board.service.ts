import httpStatus from 'http-status'
import { BoardMemberRole } from '../../../generated/prisma/enums'
import { AppError } from '../../error/AppError'
import { prisma } from '../../lib/prisma'
import {
  ICreateBoardPayload,
  IShareBoardPayload,
  IUpdateBoardMemberPayload,
  IUpdateBoardPayload,
} from './board.interface'

const ensureBoardOwner = async (boardId: string, userId: string) => {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { id: true, ownerId: true },
  })

  if (!board) {
    throw new AppError(httpStatus.NOT_FOUND, 'Board not found')
  }

  if (board.ownerId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only the board owner can perform this action',
    )
  }

  return board
}

const createBoard = async (
  ownerId: string,
  payload: ICreateBoardPayload,
) => {
  const board = await prisma.board.create({
    data: {
      title: payload.title,
      description: payload.description || null,
      ownerId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return board
}

const getMyBoards = async (userId: string) => {
  const boards = await prisma.board.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      ownerId: true,
      owner: {
        select: { id: true, name: true, email: true },
      },
      members: {
        where: { userId },
        select: { role: true },
      },
      _count: {
        select: { columns: true, members: true },
      },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  return boards.map(({ members, ...board }) => ({
    ...board,
    accessRole:
      board.ownerId === userId ? 'OWNER' : members[0]?.role,
  }))
}

const getBoardById = async (boardId: string, userId: string) => {
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      ownerId: true,
      owner: {
        select: { id: true, name: true, email: true },
      },
      members: {
        select: {
          role: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      columns: {
        orderBy: { position: 'asc' },
        include: {
          tasks: { orderBy: { position: 'asc' } },
        },
      },
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!board) {
    throw new AppError(httpStatus.NOT_FOUND, 'Board not found')
  }

  return {
    ...board,
    accessRole:
      board.ownerId === userId
        ? 'OWNER'
        : board.members.find((member) => member.user.id === userId)?.role,
  }
}

const updateBoard = async (
  boardId: string,
  userId: string,
  payload: IUpdateBoardPayload,
) => {
  await ensureBoardOwner(boardId, userId)

  return prisma.board.update({
    where: { id: boardId },
    data: payload,
    select: {
      id: true,
      title: true,
      description: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

const deleteBoard = async (boardId: string, userId: string) => {
  await ensureBoardOwner(boardId, userId)

  await prisma.board.delete({
    where: { id: boardId },
  })
}

const getBoardMembers = async (boardId: string, userId: string) => {
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      members: {
        select: {
          role: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!board) {
    throw new AppError(httpStatus.NOT_FOUND, 'Board not found')
  }

  return {
    owner: {
      ...board.owner,
      role: 'OWNER',
    },
    members: board.members,
  }
}

const shareBoard = async (
  boardId: string,
  ownerId: string,
  payload: IShareBoardPayload,
) => {
  await ensureBoardOwner(boardId, ownerId)

  const email = payload.email.trim().toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  })

  if (!user) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'No registered user found with this email',
    )
  }

  if (user.id === ownerId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'The board owner cannot be added as a member',
    )
  }

  const existingMember = await prisma.boardMember.findUnique({
    where: {
      boardId_userId: {
        boardId,
        userId: user.id,
      },
    },
  })

  if (existingMember) {
    throw new AppError(
      httpStatus.CONFLICT,
      'This user already has access to the board',
    )
  }

  return prisma.boardMember.create({
    data: {
      boardId,
      userId: user.id,
      role: payload.role ?? BoardMemberRole.VIEWER,
    },
    select: {
      boardId: true,
      userId: true,
      role: true,
      createdAt: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  })
}

const updateBoardMember = async (
  boardId: string,
  memberUserId: string,
  ownerId: string,
  payload: IUpdateBoardMemberPayload,
) => {
  await ensureBoardOwner(boardId, ownerId)

  const member = await prisma.boardMember.findUnique({
    where: {
      boardId_userId: { boardId, userId: memberUserId },
    },
  })

  if (!member) {
    throw new AppError(httpStatus.NOT_FOUND, 'Board member not found')
  }

  return prisma.boardMember.update({
    where: {
      boardId_userId: { boardId, userId: memberUserId },
    },
    data: { role: payload.role },
    select: {
      boardId: true,
      userId: true,
      role: true,
      updatedAt: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  })
}

const removeBoardMember = async (
  boardId: string,
  memberUserId: string,
  ownerId: string,
) => {
  await ensureBoardOwner(boardId, ownerId)

  const member = await prisma.boardMember.findUnique({
    where: {
      boardId_userId: { boardId, userId: memberUserId },
    },
  })

  if (!member) {
    throw new AppError(httpStatus.NOT_FOUND, 'Board member not found')
  }

  await prisma.boardMember.delete({
    where: {
      boardId_userId: { boardId, userId: memberUserId },
    },
  })
}

export const BoardService = {
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
