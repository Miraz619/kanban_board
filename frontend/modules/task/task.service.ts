import { api } from "@/lib/api"
import type { ApiResponse } from "@/types/api"
import type {
  CreateTaskPayload,
  MoveTaskPayload,
  Task,
  UpdateTaskPayload,
} from "./task.types"

const createTask = async (columnId: string, payload: CreateTaskPayload) => {
  const response = await api.post<ApiResponse<Task>>(
    `/columns/${columnId}/tasks`,
    payload,
  )

  return response.data.data
}

const updateTask = async (taskId: string, payload: UpdateTaskPayload) => {
  const response = await api.patch<ApiResponse<Task>>(`/tasks/${taskId}`, payload)
  return response.data.data
}

const deleteTask = async (taskId: string) => {
  await api.delete<ApiResponse<null>>(`/tasks/${taskId}`)
}

const moveTask = async (taskId: string, payload: MoveTaskPayload) => {
  const response = await api.patch<ApiResponse<Task>>(
    `/tasks/${taskId}/move`,
    payload,
  )

  return response.data.data
}

export const taskService = {
  createTask,
  updateTask,
  deleteTask,
  moveTask,
}
