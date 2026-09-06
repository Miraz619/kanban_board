import type { BoardColumn } from "@/modules/board/board.types"

export type ColumnRecord = Omit<BoardColumn, "tasks">

export interface CreateColumnPayload {
  title: string
}

export interface UpdateColumnPayload {
  title: string
}
