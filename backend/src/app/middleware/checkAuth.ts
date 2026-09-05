import { NextFunction, Request, Response } from 'express'
import { JwtPayload } from 'jsonwebtoken'
import config from '../config'

import { prisma } from '../lib/prisma'
import { IRequestUser } from '../module/auth/auth.interface'
import { catchAsync } from '../utils/catchAsync'
import { jwtUtils } from '../utils/jwt'
import { AppError } from '../error/AppError'

declare global {
  namespace Express {
    interface Request {
      user?: IRequestUser
    }
  }
}

export const auth = () => {
  return catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies?.accessToken
      ? req.cookies.accessToken
      : req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : req.headers.authorization

    if (!token) {
      throw new AppError(401, 'You are not logged in. Please log in to access this resource.')
    }

    const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret)
    if (!verifiedToken.success) {
      throw new AppError(401, 'Invalid or expired access token.')
    }

    const { userId } = verifiedToken.data as JwtPayload
    if (typeof userId !== 'string') {
      throw new AppError(401, 'Invalid access token payload.')
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    })

    if (!user) {
      throw new AppError(401, 'User not found. Please log in again.')
    }

    req.user = {
      email: user.email,
      name: user.name,
      userId: user.id,
    }

    next()
  })
}
