import { z } from 'zod'

const registerUserSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(3, { message: 'Name must be at least 3 characters long' })
      .max(50, { message: 'Name must be at most 50 characters long' }),

   email: z
  .string()
  .trim()
  .pipe(z.email({ message: 'Invalid email address' })),

    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters long' })
      .max(72, { message: 'Password must be at most 72 characters long' }),
  }),
})

const loginUserSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .pipe(z.email({ message: 'Invalid email address' })),

    password: z
      .string()
      .min(1, { message: 'Password is required' }),
  }),
})
export const AuthValidation = {
  registerUser: registerUserSchema,
    loginUser: loginUserSchema,
}