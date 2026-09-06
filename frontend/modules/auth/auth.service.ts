import { api } from "@/lib/api"
import type { ApiResponse } from "@/types/api"
import type {
  AuthUser,
  CurrentUserData,
  LoginData,
  LoginPayload,
  RegisterPayload,
} from "./auth.types"

const register = async (payload: RegisterPayload) => {
  const response = await api.post<ApiResponse<AuthUser>>(
    "/auth/register",
    payload
  )

  return response.data.data
}

const login = async (payload: LoginPayload) => {
  const response = await api.post<ApiResponse<LoginData>>("/auth/login", payload)

  return response.data.data.user
}

const getMe = async (): Promise<AuthUser> => {
  const response = await api.get<ApiResponse<CurrentUserData>>("/auth/me")
  const user = response.data.data

  return {
    id: user.userId,
    name: user.name,
    email: user.email,
  }
}

const refreshToken = async () => {
  await api.post<ApiResponse<null>>("/auth/refresh-token")
}

const logout = async () => {
  await api.post<ApiResponse<null>>("/auth/logout")
}

export const authService = {
  register,
  login,
  getMe,
  refreshToken,
  logout,
}
