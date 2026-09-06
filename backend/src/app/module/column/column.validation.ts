import { z } from 'zod'

const columnTitleSchema = z
  .string()
  .trim()
  .min(1, { message: 'Column title is required' })
  .max(100, {
    message: 'Column title cannot exceed 100 characters',
  })

const createColumnSchema = z.object({
  body: z.object({
    title: columnTitleSchema,
  }),
})

const updateColumnSchema = z.object({
  body: z.object({
    title: columnTitleSchema,
  }),
})

export const ColumnValidation = {
  createColumn: createColumnSchema,
  updateColumn: updateColumnSchema,
}
