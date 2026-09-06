import { z } from 'zod'

const taskTitleSchema = z
  .string()
  .trim()
  .min(1, { message: 'Task title is required' })
  .max(100, { message: 'Task title cannot exceed 100 characters' })

const taskDescriptionSchema = z
  .string()
  .trim()
  .max(500, { message: 'Task description cannot exceed 500 characters' })

const createTaskSchema = z.object({
  body: z.strictObject({
    title: taskTitleSchema,
    description: taskDescriptionSchema.optional(),
  }),
})

const updateTaskSchema = z.object({
  body: z
    .strictObject({
      title: taskTitleSchema.optional(),
      description: taskDescriptionSchema.nullable().optional(),
    })
    .refine(
      (data) => data.title !== undefined || data.description !== undefined,
      { message: 'Provide at least one field to update' },
    ),
})

const moveTaskSchema = z.object({
  body: z.strictObject({
    targetColumnId: z.uuid({ message: 'Invalid target column ID' }),
    position: z
      .number()
      .int({ message: 'Position must be an integer' })
      .min(0, { message: 'Position cannot be negative' })
      .max(2147483647, { message: 'Position is too large' }),
  }),
})

export const TaskValidation = {
  createTask: createTaskSchema,
  updateTask: updateTaskSchema,
  moveTask: moveTaskSchema,
  columnParams: z.object({
    columnId: z.uuid({ message: 'Invalid column ID' }),
  }),
  taskParams: z.object({
    taskId: z.uuid({ message: 'Invalid task ID' }),
  }),
}
