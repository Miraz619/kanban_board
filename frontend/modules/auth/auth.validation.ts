import type { RegisterFormValues } from "./auth.types"

export function validateRegistration(values: RegisterFormValues) {
  if (values.name.trim().length < 3) {
    return "Name must be at least 3 characters long"
  }

  if (values.password.length < 8) {
    return "Password must be at least 8 characters long"
  }

  if (values.password !== values.confirmPassword) {
    return "Passwords do not match"
  }

  return null
}
