import { Columns3, Users } from "lucide-react"
import Link from "next/link"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import type { BoardSummary } from "../board.types"

interface BoardCardProps {
  board: BoardSummary
}

export function BoardCard({ board }: BoardCardProps) {
  const memberCount = board._count.members + 1

  return (
    <Link href={`/boards/${board.id}`}>
      <Card className="h-full transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="line-clamp-1">
              {board.title}
            </CardTitle>

            <span className="rounded-full bg-secondary px-2 py-1 text-xs font-medium">
              {board.accessRole}
            </span>
          </div>

          <CardDescription className="line-clamp-2 min-h-10">
            {board.description || "No description"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Columns3 className="size-4" />
              {board._count.columns} columns
            </span>

            <span className="flex items-center gap-1">
              <Users className="size-4" />
              {memberCount} members
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}