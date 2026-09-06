import { api } from "@/lib/api"
import type { ApiResponse } from "@/types/api"

import type {
  Board,
  BoardDetails,
  BoardMembership,
  BoardSummary,
  CreateBoardPayload,
  ShareBoardPayload,
  UpdateBoardPayload,
} from "./board.types"

const getMyBoards = async () => {
  const response =
    await api.get<ApiResponse<BoardSummary[]>>("/boards")

  return response.data.data
}

const getBoardById = async (boardId: string) => {
  const response = await api.get<ApiResponse<BoardDetails>>(
    `/boards/${boardId}`,
  )

  return response.data.data
}

const createBoard = async (payload: CreateBoardPayload) => {
  const response =
    await api.post<ApiResponse<Board>>("/boards", payload)

  return response.data.data
}

const updateBoard = async (
  boardId: string,
  payload: UpdateBoardPayload,
) => {
  const response = await api.patch<ApiResponse<Board>>(
    `/boards/${boardId}`,
    payload,
  )

  return response.data.data
}

const deleteBoard = async (boardId: string) => {
  await api.delete<ApiResponse<null>>(`/boards/${boardId}`)
}

const shareBoard = async (boardId: string, payload: ShareBoardPayload) => {
  const response = await api.post<ApiResponse<BoardMembership>>(
    `/boards/${boardId}/members`,
    payload,
  )

  return response.data.data
}

const updateBoardMember = async (
  boardId: string,
  memberUserId: string,
  role: ShareBoardPayload["role"],
) => {
  const response = await api.patch<ApiResponse<BoardMembership>>(
    `/boards/${boardId}/members/${memberUserId}`,
    { role },
  )

  return response.data.data
}

const removeBoardMember = async (boardId: string, memberUserId: string) => {
  await api.delete<ApiResponse<null>>(
    `/boards/${boardId}/members/${memberUserId}`,
  )
}

export const boardService = {
  getMyBoards,
  getBoardById,
  createBoard,
  updateBoard,
  deleteBoard,
  shareBoard,
  updateBoardMember,
  removeBoardMember,
}
