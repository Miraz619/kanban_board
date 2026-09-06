import { api } from "@/lib/api"
import type { ApiResponse } from "@/types/api"
import type {
  ColumnRecord,
  CreateColumnPayload,
  UpdateColumnPayload,
} from "./column.types"

const createColumn = async (boardId: string, payload: CreateColumnPayload) => {
  const response = await api.post<ApiResponse<ColumnRecord>>(
    `/boards/${boardId}/columns`,
    payload,
  )

  return response.data.data
}

const updateColumn = async (
  boardId: string,
  columnId: string,
  payload: UpdateColumnPayload,
) => {
  const response = await api.patch<ApiResponse<ColumnRecord>>(
    `/boards/${boardId}/columns/${columnId}`,
    payload,
  )

  return response.data.data
}

const deleteColumn = async (boardId: string, columnId: string) => {
  await api.delete<ApiResponse<null>>(
    `/boards/${boardId}/columns/${columnId}`,
  )
}

export const columnService = {
  createColumn,
  updateColumn,
  deleteColumn,
}
