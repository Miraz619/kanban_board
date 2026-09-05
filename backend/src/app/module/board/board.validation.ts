
import { z } from 'zod'

const createBoardSchema = z.object({
  body: z.object({
    title: z
      .string()
      .trim()
      .min(1, { message: 'Board title is required' })
      .max(100, { message: 'Board title cannot exceed 100 characters' }),

    description: z
      .string()
      .trim()
      .max(500, {
        message: 'Description cannot exceed 500 characters',
      })
      .optional(),
  }),
})

const updateBoardSchema = z.object({
  body: z
    .object({
      title: z
        .string()
        .trim()
        .min(1, { message: 'Board title is required' })
        .max(100, { message: 'Board title cannot exceed 100 characters' })
        .optional(),
      description: z
        .string()
        .trim()
        .max(500, {
          message: 'Description cannot exceed 500 characters',
        })
        .nullable()
        .optional(),
    })
    .refine(
      (data) => data.title !== undefined || data.description !== undefined,
      { message: 'Provide at least one field to update' },
    ),
})

const shareBoardSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .pipe(z.email({ message: 'Invalid email address' })),
    role: z.enum(['VIEWER', 'EDITOR']).optional(),
  }),
})

const updateBoardMemberSchema = z.object({
  body: z.object({
    role: z.enum(['VIEWER', 'EDITOR']),
  }),
})

export const BoardValidation = {
  createBoard: createBoardSchema,
  updateBoard: updateBoardSchema,
  shareBoard: shareBoardSchema,
  updateBoardMember: updateBoardMemberSchema,
}
