import type { Metadata } from "next"

import { BoardView } from "@/modules/board/components/board-view"

export const metadata: Metadata = {
  title: "Board | Kanban Board",
}

interface BoardPageProps {
  params: Promise<{
    boardId: string
  }>
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { boardId } = await params

  return <BoardView boardId={boardId} />
}
