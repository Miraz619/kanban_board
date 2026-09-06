
export type BoardAccessRole = "OWNER" | "EDITOR" | "VIEWER"

export interface BoardOwner {
  id: string
  name: string
  email: string
}

export interface Board {
  id: string
  title: string
  description: string | null
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface BoardSummary extends Board {
  owner: BoardOwner
  accessRole: BoardAccessRole
  _count: {
    columns: number
    members: number
  }
}

export interface BoardColumn {
  id: string
  title: string
  position: number
  boardId: string
  tasks: Task[]
  createdAt: string
  updatedAt: string
}

export interface BoardMember {
  role: Exclude<BoardAccessRole, "OWNER">
  createdAt: string
  user: BoardOwner
}

export interface BoardDetails extends Board {
  owner: BoardOwner
  members: BoardMember[]
  columns: BoardColumn[]
  accessRole: BoardAccessRole
}

export interface CreateBoardPayload {
  title: string
  description?: string
}

export interface UpdateBoardPayload {
  title?: string
  description?: string | null
}

export interface ShareBoardPayload {
  email: string
  role: Exclude<BoardAccessRole, "OWNER">
}

export interface BoardMembership {
  boardId: string
  userId: string
  role: Exclude<BoardAccessRole, "OWNER">
  createdAt?: string
  updatedAt?: string
  user: BoardOwner
}
import type { Task } from "@/modules/task/task.types"
