export interface Task {
  id: string
  title: string
  description: string | null
  position: number
  columnId: string
  createdAt: string
  updatedAt: string
}

export interface CreateTaskPayload {
  title: string
  description?: string
}

export interface UpdateTaskPayload {
  title?: string
  description?: string | null
}

export interface MoveTaskPayload {
  targetColumnId: string
  position: number
}
