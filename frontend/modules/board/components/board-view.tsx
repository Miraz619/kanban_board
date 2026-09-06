"use client"

import {
  ArrowLeft,
  Columns3,
  Loader2,
  Users,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { getApiErrorMessage } from "@/lib/api-error"
import { CreateColumnDialog } from "@/modules/column/components/create-column-dialog"
import { boardService } from "../board.service"
import type { BoardDetails } from "../board.types"
import { BoardActions } from "./board-actions"
import { BoardMembersDialog } from "./board-members-dialog"
import { KanbanBoard } from "./kanban-board"

interface BoardViewProps {
  boardId: string
}

export function BoardView({ boardId }: BoardViewProps) {
  const [board, setBoard] = useState<BoardDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  const loadBoard = useCallback(async () => {
    try {
      const result = await boardService.getBoardById(boardId)
      setBoard(result)
      setErrorMessage("")
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Could not load this board"))
    } finally {
      setIsLoading(false)
    }
  }, [boardId])

  useEffect(() => {
    let isCancelled = false

    boardService
      .getBoardById(boardId)
      .then((result) => {
        if (isCancelled) return

        setBoard(result)
        setErrorMessage("")
      })
      .catch((error: unknown) => {
        if (isCancelled) return

        setErrorMessage(getApiErrorMessage(error, "Could not load this board"))
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [boardId])

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading board</span>
      </div>
    )
  }

  if (errorMessage || !board) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed text-center">
        <p className="text-sm text-destructive">
          {errorMessage || "Board not found"}
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/boards">Back to boards</Link>
          </Button>
          <Button onClick={() => void loadBoard()}>Try again</Button>
        </div>
      </div>
    )
  }

  const memberCount = board.members.length + 1
  const canEdit = board.accessRole === "OWNER" || board.accessRole === "EDITOR"
  const isOwner = board.accessRole === "OWNER"

  return (
    <section>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/boards">
          <ArrowLeft />
          Back to boards
        </Link>
      </Button>

      <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {board.title}
            </h1>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
              {board.accessRole}
            </span>
          </div>

          <p className="mt-2 max-w-2xl text-muted-foreground">
            {board.description || "No description provided."}
          </p>

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Columns3 className="size-4" />
              {board.columns.length} columns
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-4" />
              {memberCount} members
            </span>
            <span>Owned by {board.owner.name}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <BoardMembersDialog
            board={board}
            isOwner={isOwner}
            onChanged={loadBoard}
          />
          {canEdit ? (
            <CreateColumnDialog boardId={board.id} onChanged={loadBoard} />
          ) : null}
          {isOwner ? <BoardActions board={board} onChanged={loadBoard} /> : null}
        </div>
      </div>

      {board.accessRole === "VIEWER" ? (
        <p className="mt-6 rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          You have view-only access to this board.
        </p>
      ) : null}

      {board.columns.length === 0 ? (
        <div className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed text-center">
          <Columns3 className="size-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-medium">No columns yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a column to begin organizing tasks.
          </p>
        </div>
      ) : (
        <KanbanBoard
          boardId={board.id}
          columns={board.columns}
          canEdit={canEdit}
          onChanged={loadBoard}
        />
      )}
    </section>
  )
}
