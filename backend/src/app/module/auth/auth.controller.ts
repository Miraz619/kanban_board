import { CookieOptions, Request, Response } from 'express'
import httpStatus from 'http-status'
import config from '../../config'
import { AppError } from '../../error/AppError'
import { catchAsync } from '../../utils/catchAsync'
import { sendResponse } from '../../utils/sendResponse'
import { AuthService } from './auth.service'

const isProduction = config.node_env === 'production'

const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
}

const registerUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.registerUser(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'User registered successfully',
    data: result,
  })
})

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginUser(req.body)
  const { accessToken, refreshToken } = result
  res.cookie('accessToken', accessToken, {
    ...authCookieOptions,
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  })
  res.cookie('refreshToken', refreshToken, {
    ...authCookieOptions,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  })

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'User logged in successfully',
    data: result,
  })
})


const refreshToken =catchAsync(async (req: Request, res: Response) => {
    if (!req.cookies.refreshToken) {
        throw new Error('Refresh token is missing')
    }
    const result = await AuthService.refreshAccessToken(req.cookies.refreshToken)
    const { accessToken, refreshToken} = result

    res.cookie('accessToken', accessToken, {
        ...authCookieOptions,
        maxAge: 1000 * 60 * 60 * 24, // 1 day
    })
    res.cookie('refreshToken', refreshToken, {
        ...authCookieOptions,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    })

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'New tokens generated successfully',
        data: {
            accessToken,
            refreshToken,
        },
    })
})

const getMe = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'User is not authenticated',
    )
  }

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Current user retrieved successfully',
    data: req.user,
  })
})

const logoutUser = catchAsync(async (_req: Request, res: Response) => {
  res.clearCookie('accessToken', authCookieOptions)
  res.clearCookie('refreshToken', authCookieOptions)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Logged out successfully',
    data: null,
  })
})




export const AuthController = {
  registerUser,
  loginUser,
  refreshToken,
  getMe,
  logoutUser,
}
