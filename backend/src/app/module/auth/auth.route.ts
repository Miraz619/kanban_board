import { Router } from 'express'
import { auth } from '../../middleware/checkAuth'
import { validateRequest } from '../../middleware/validateRequest'
import { AuthController } from './auth.controller'
import { AuthValidation } from './auth.validation'

const router = Router()

router.post(
  '/register',
  validateRequest(AuthValidation.registerUser),
  AuthController.registerUser,
)

router.post(
  '/login',
  validateRequest(AuthValidation.loginUser),
  AuthController.loginUser,
)



router.post('/refresh-token', AuthController.refreshToken)

router.get('/me', auth(), AuthController.getMe)

router.post('/logout', AuthController.logoutUser)

export const AuthRoutes = router
