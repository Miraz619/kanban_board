"use client"

import { LayoutDashboard, Loader2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { getApiErrorMessage } from "@/lib/api-error"

import { boardService } from "../board.service"
import type { BoardSummary } from "../board.types"
import { BoardCard } from "./board-card"
import { CreateBoardDialog } from "./create-board-dialog"

export function BoardList() {
  const [boards, setBoards] = useState<BoardSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  // Used when retrying or after creating a board.
  const loadBoards = useCallback(async () => {
    try {
      const result = await boardService.getMyBoards()

      setBoards(result)
      setErrorMessage("")
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Could not load your boards"),
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Used only for the initial page load.
  useEffect(() => {
    let isCancelled = false

    boardService
      .getMyBoards()
      .then((result) => {
        if (isCancelled) return

        setBoards(result)
        setErrorMessage("")
      })
      .catch((error: unknown) => {
        if (isCancelled) return

        setErrorMessage(
          getApiErrorMessage(error, "Could not load your boards"),
        )
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading boards</span>
      </div>
    )
  }

  return (
    <section>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            My boards
          </h1>

          <p className="mt-2 text-muted-foreground">
            Create a board or open one shared with you.
          </p>
        </div>

        <CreateBoardDialog onCreated={loadBoards} />
      </div>

      {errorMessage ? (
        <div className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">
            {errorMessage}
          </p>

          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void loadBoards()}
          >
            Try again
          </Button>
        </div>
      ) : boards.length === 0 ? (
        <div className="mt-10 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed text-center">
          <LayoutDashboard className="size-10 text-muted-foreground" />

          <h2 className="mt-4 text-lg font-medium">
            No boards yet
          </h2>

          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create your first board to start organizing tasks.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      )}
    </section>
  )
}