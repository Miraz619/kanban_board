import type { Metadata } from "next"

import { BoardList } from "@/modules/board/components/board-list"

export const metadata: Metadata = {
  title: "My boards | Kanban Board",
}

export default function BoardsPage() {
  return <BoardList />
}