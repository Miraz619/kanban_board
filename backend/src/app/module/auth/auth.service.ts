
import bcrypt from 'bcryptjs'
import httpStatus from 'http-status'
import config from '../../config'
import { AppError } from '../../error/AppError'
import { prisma } from '../../lib/prisma'
import { ILoginUserPayload, IRegisterUserPayload } from './auth.interface'
import { JwtPayload, SignOptions } from 'jsonwebtoken'
import { jwtUtils } from '../../utils/jwt'

const registerUser = async (payload: IRegisterUserPayload) => {
  const name = payload.name.trim()
  const email = payload.email.trim().toLowerCase()

  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    throw new AppError(
      httpStatus.CONFLICT,
      'A user with this email already exists',
    )
  }

  const saltRounds = Number(config.bcrypt_salt_rounds) || 10
  const hashedPassword = await bcrypt.hash(payload.password, saltRounds)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return user
}

const loginUser = async (payload: ILoginUserPayload) => {

  const email = payload.email.trim().toLowerCase()

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  })

  if (!user) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Invalid email or password',
    )
  }

  const isPasswordMatched = await bcrypt.compare(
    payload.password,
    user.password,
  )

  if (!isPasswordMatched) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Invalid email or password',
    )
  }

  const accessToken = jwtUtils.createToken(
    {
      userId: user.id,
      email: user.email,
    },
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions['expiresIn'],
  )
 const refreshToken = jwtUtils.createToken({
    userId: user.id,
    email: user.email,
  }, config.jwt_refresh_secret, config.jwt_refresh_expires_in as SignOptions['expiresIn'])

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
 }
}



const refreshAccessToken = async (currentRefreshToken: string) => {
  const verificationResult = jwtUtils.verifyToken(
    currentRefreshToken,
    config.jwt_refresh_secret,
  )

  if (!verificationResult.success || !verificationResult.data) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Invalid or expired refresh token',
    )
  }

  const decodedToken = verificationResult.data as JwtPayload

  if (
    !decodedToken.userId ||
    typeof decodedToken.userId !== 'string'
  ) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Invalid refresh token',
    )
  }

  const user = await prisma.user.findUnique({
    where: {
      id: decodedToken.userId,
    },
    select: {
      id: true,
      email: true,
    },
  })

  if (!user) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'User no longer exists',
    )
  }

const tokenPayload = {
  userId: user.id,
  email: user.email,
}

const accessToken = jwtUtils.createToken(
  tokenPayload,
  config.jwt_access_secret,
  config.jwt_access_expires_in as SignOptions['expiresIn'],
)

const refreshToken = jwtUtils.createToken(
  tokenPayload,
  config.jwt_refresh_secret,
  config.jwt_refresh_expires_in as SignOptions['expiresIn'],
)


  return {
    accessToken,
    refreshToken,
  }
}



export const AuthService = {
  registerUser,
  loginUser,
  refreshAccessToken,
}
