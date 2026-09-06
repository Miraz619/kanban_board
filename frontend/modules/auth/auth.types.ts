export interface AuthUser {
  id: string
  name: string
  email: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export interface RegisterFormValues extends RegisterPayload {
  confirmPassword: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginData {
  user: AuthUser
}

export interface CurrentUserData {
  userId: string
  name: string
  email: string
}
