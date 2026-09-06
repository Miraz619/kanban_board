import { setTimeout as delay } from 'node:timers/promises'
import httpStatus from 'http-status'
import { Prisma } from '../../../generated/prisma/client.js'
import { BoardMemberRole } from '../../../generated/prisma/enums.js'
import { AppError } from '../../error/AppError.js'
import { prisma } from '../../lib/prisma.js'
import type {
  ICreateTaskPayload,
  IMoveTaskPayload,
  IUpdateTaskPayload,
} from './task.interface.js'

const taskSelect = {
  id: true,
  title: true,
  description: true,
  position: true,
  columnId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TaskSelect

// Retry the entire operation with fresh data if another request changes its order.
// This also handles concurrent appends hitting the unique (columnId, position) key.
const withTaskTransaction = async <T>(
  operation: (transactionClient: Prisma.TransactionClient) => Promise<T>,
): Promise<T> => {
  const maxAttempts = 5

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 30000,
      })
    } catch (error) {
      const canRetry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2034' || error.code === 'P2002')

      if (!canRetry) {
        throw error
      }

      if (attempt === maxAttempts - 1) {
        throw new AppError(
          httpStatus.CONFLICT,
          'Tasks were changed by another request. Please try again.',
        )
      }

      // A short backoff keeps concurrent requests from retrying in lockstep.
      await delay(25 * 2 ** attempt + Math.floor(Math.random() * 25))
    }
  }

  throw new AppError(httpStatus.CONFLICT, 'Please try the task operation again')
}

const boardAccessSelect = (userId: string) => ({
  ownerId: true,
  members: {
    where: { userId },
    select: { role: true },
  },
}) satisfies Prisma.BoardSelect

const ensureBoardAccess = (
  board: { ownerId: string; members: { role: BoardMemberRole }[] },
  userId: string,
  canWrite: boolean,
  resourceName: 'Task' | 'Column',
) => {
  const isOwner = board.ownerId === userId
  const memberRole = board.members[0]?.role

  if (!isOwner && !memberRole) {
    throw new AppError(httpStatus.NOT_FOUND, `${resourceName} not found`)
  }

  if (canWrite && !isOwner && memberRole !== BoardMemberRole.EDITOR) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You do not have permission to modify tasks on this board',
    )
  }
}

const getAccessibleColumn = async (
  transactionClient: Prisma.TransactionClient,
  columnId: string,
  userId: string,
  canWrite: boolean,
) => {
  const column = await transactionClient.boardColumn.findUnique({
    where: { id: columnId },
    select: {
      id: true,
      boardId: true,
      board: { select: boardAccessSelect(userId) },
    },
  })

  if (!column) {
    throw new AppError(httpStatus.NOT_FOUND, 'Column not found')
  }

  ensureBoardAccess(column.board, userId, canWrite, 'Column')
  return column
}

const getAccessibleTask = async (
  transactionClient: Prisma.TransactionClient,
  taskId: string,
  userId: string,
  canWrite: boolean,
) => {
  const record = await transactionClient.task.findUnique({
    where: { id: taskId },
    select: {
      ...taskSelect,
      column: {
        select: {
          boardId: true,
          board: { select: boardAccessSelect(userId) },
        },
      },
    },
  })

  if (!record) {
    throw new AppError(httpStatus.NOT_FOUND, 'Task not found')
  }

  ensureBoardAccess(record.column.board, userId, canWrite, 'Task')
  const { column, ...task } = record
  return { task, boardId: column.boardId }
}

// Move into the empty position first. SQL updateMany does not guarantee row order
// and could temporarily collide with the unique (columnId, position) constraint.
const shiftTasks = async (
  transactionClient: Prisma.TransactionClient,
  columnId: string,
  position: Prisma.IntFilter,
  offset: 1 | -1,
) => {
  const tasks = await transactionClient.task.findMany({
    where: { columnId, position },
    select: { id: true, position: true },
    orderBy: { position: offset === 1 ? 'desc' : 'asc' },
  })

  for (const task of tasks) {
    await transactionClient.task.update({
      where: { id: task.id },
      data: { position: task.position + offset },
    })
  }
}

const createTask = async (
  columnId: string,
  userId: string,
  payload: ICreateTaskPayload,
) => withTaskTransaction(async (transactionClient) => {
  await getAccessibleColumn(transactionClient, columnId, userId, true)

  const lastTask = await transactionClient.task.findFirst({
    where: { columnId },
    select: { position: true },
    orderBy: { position: 'desc' },
  })

  return transactionClient.task.create({
    data: {
      columnId,
      title: payload.title,
      description: payload.description || null,
      position: lastTask ? lastTask.position + 1 : 0,
    },
    select: taskSelect,
  })
})

const getTasks = async (columnId: string, userId: string) =>
  withTaskTransaction(async (transactionClient) => {
    await getAccessibleColumn(transactionClient, columnId, userId, false)

    return transactionClient.task.findMany({
      where: { columnId },
      select: taskSelect,
      orderBy: { position: 'asc' },
    })
  })

const getTaskById = async (taskId: string, userId: string) =>
  withTaskTransaction(async (transactionClient) => {
    const { task } = await getAccessibleTask(
      transactionClient, taskId, userId, false,
    )
    return task
  })

const updateTask = async (
  taskId: string,
  userId: string,
  payload: IUpdateTaskPayload,
) => withTaskTransaction(async (transactionClient) => {
  await getAccessibleTask(transactionClient, taskId, userId, true)

  // Explicit fields keep the content endpoint from changing column or position.
  return transactionClient.task.update({
    where: { id: taskId },
    data: {
      title: payload.title,
      description: payload.description,
    },
    select: taskSelect,
  })
})

const deleteTask = async (taskId: string, userId: string) =>
  withTaskTransaction(async (transactionClient) => {
    const { task } = await getAccessibleTask(
      transactionClient, taskId, userId, true,
    )

    await transactionClient.task.delete({ where: { id: taskId } })
    await shiftTasks(transactionClient, task.columnId, { gt: task.position }, -1)
  })

const moveTask = async (
  taskId: string,
  userId: string,
  payload: IMoveTaskPayload,
) => withTaskTransaction(async (transactionClient) => {
  const { task, boardId } = await getAccessibleTask(
    transactionClient, taskId, userId, true,
  )
  const targetColumn = await getAccessibleColumn(
    transactionClient, payload.targetColumnId, userId, true,
  )

  if (targetColumn.boardId !== boardId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Tasks can only move between columns on the same board',
    )
  }

  // The insertion index is measured after removing the moving task.
  const targetCount = await transactionClient.task.count({
    where: { columnId: targetColumn.id, id: { not: task.id } },
  })

  if (
    !Number.isInteger(payload.position) ||
    payload.position < 0 ||
    payload.position > targetCount
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Position must be an integer between 0 and ${targetCount}`,
    )
  }

  const isSameColumn = task.columnId === targetColumn.id
  if (isSameColumn && task.position === payload.position) {
    return task
  }

  // Free the old slot within this transaction. -1 is never committed or returned;
  // if a later step fails, PostgreSQL rolls the entire move back.
  await transactionClient.task.update({
    where: { id: task.id },
    data: { position: -1 },
  })

  if (isSameColumn) {
    if (payload.position < task.position) {
      await shiftTasks(
        transactionClient,
        task.columnId,
        { gte: payload.position, lt: task.position },
        1,
      )
    } else {
      await shiftTasks(
        transactionClient,
        task.columnId,
        { gt: task.position, lte: payload.position },
        -1,
      )
    }
  } else {
    await shiftTasks(transactionClient, task.columnId, { gt: task.position }, -1)
    await shiftTasks(
      transactionClient, targetColumn.id, { gte: payload.position }, 1,
    )
  }

  return transactionClient.task.update({
    where: { id: task.id },
    data: { columnId: targetColumn.id, position: payload.position },
    select: taskSelect,
  })
})

export const TaskService = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  moveTask,
}
