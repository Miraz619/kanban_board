import { ZodType } from 'zod'
import { catchAsync } from '../utils/catchAsync.js'

export const validateRequest = (schema: ZodType) => {
  return catchAsync(async (req, _res, next) => {
    const validatedData = await schema.parseAsync({
      body: req.body,
    })

    req.body = (validatedData as { body: unknown }).body

    next()
  })
}
