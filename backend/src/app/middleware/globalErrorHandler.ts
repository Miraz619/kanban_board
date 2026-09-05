import { NextFunction, Request, Response } from 'express'
import httpStatus from 'http-status'
import { ZodError } from 'zod'
import { Prisma } from '../../generated/prisma/client'
import config from '../config'
import { AppError } from '../error/AppError'
type ValidationError = {
  path: string
  message: string
}

export const globalErrorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const isDevelopment = config.node_env === 'development'

  if (isDevelopment) {
    console.error('Error from Global Error Handler:', err)
  }

  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR
  let errorMessage = 'Internal Server Error'
  let errorName = 'Error'
  let validationErrors: ValidationError[] | undefined

  if (err instanceof AppError) {
  statusCode = err.statusCode
  errorMessage = err.message
  errorName = err.name
} else if (err instanceof ZodError) {
  statusCode = httpStatus.BAD_REQUEST
  errorMessage = 'Validation failed'
  errorName = 'ZodError'

  validationErrors = err.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
} else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = httpStatus.BAD_REQUEST
    errorMessage = 'Incorrect or missing field values'
    errorName = err.name
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    errorName = err.name

    if (err.code === 'P2002') {
      statusCode = httpStatus.CONFLICT
      errorMessage = 'A record with this value already exists'
    } else if (err.code === 'P2003') {
      statusCode = httpStatus.BAD_REQUEST
      errorMessage = 'Foreign key constraint failed'
    } else if (err.code === 'P2025') {
      statusCode = httpStatus.NOT_FOUND
      errorMessage = 'The requested record was not found'
    }
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    errorName = err.name

    if (err.errorCode === 'P1000') {
      statusCode = httpStatus.INTERNAL_SERVER_ERROR
      errorMessage = 'Database authentication failed'
    } else if (err.errorCode === 'P1001') {
      statusCode = httpStatus.SERVICE_UNAVAILABLE
      errorMessage = 'Cannot reach the database server'
    }
  } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR
    errorMessage = 'An error occurred while executing the database query'
    errorName = err.name
  } else if (err instanceof Error) {
    errorMessage = err.message
    errorName = err.name
  }

  const canExposeMessage = isDevelopment || statusCode < 500

  res.status(statusCode).json({
    success: false,
    statusCode,
    name: isDevelopment ? errorName : undefined,
    message: canExposeMessage ? errorMessage : 'Internal Server Error',
    errors: validationErrors,
    stack: isDevelopment && err instanceof Error ? err.stack : undefined,
  })
}