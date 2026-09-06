
import type { BoardMemberRole } from '../../../generated/prisma/enums.js'

export interface ICreateBoardPayload {
  title: string
  description?: string
}

export interface IUpdateBoardPayload {
  title?: string
  description?: string | null
}

export interface IShareBoardPayload {
  email: string
  role?: BoardMemberRole
}

export interface IUpdateBoardMemberPayload {
  role: BoardMemberRole
}
