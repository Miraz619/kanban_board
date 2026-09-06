"use client"

import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { ClipboardList } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { BoardColumn } from "@/modules/board/board.types"
import { CreateTaskDialog } from "@/modules/task/components/create-task-dialog"
import { SortableTaskCard } from "@/modules/task/components/sortable-task-card"
import { ColumnActions } from "./column-actions"

interface KanbanColumnProps {
  boardId: string
  column: BoardColumn
  canEdit: boolean
  canDrag: boolean
  onChanged: () => void | Promise<void>
}

export function KanbanColumn({
  boardId,
  column,
  canEdit,
  canDrag,
  onChanged,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${column.id}`,
    disabled: !canDrag,
    data: {
      type: "column",
      columnId: column.id,
    },
  })

  return (
    <Card
      ref={setNodeRef}
      className={`w-80 shrink-0 self-start bg-muted/30 transition-colors ${
        isOver ? "ring-2 ring-primary/50" : ""
      }`}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{column.title}</CardTitle>
          <div className="flex items-center gap-1">
            <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground ring-1 ring-border">
              {column.tasks.length}
            </span>
            {canEdit ? (
              <ColumnActions
                boardId={boardId}
                columnId={column.id}
                columnTitle={column.title}
                onChanged={onChanged}
              />
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <SortableContext
          items={column.tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-background/60 p-6 text-center">
              <ClipboardList className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No tasks</p>
            </div>
          ) : (
            column.tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                canEdit={canEdit}
                canDrag={canDrag}
                onChanged={onChanged}
              />
            ))
          )}
        </SortableContext>

        {canEdit ? (
          <CreateTaskDialog columnId={column.id} onChanged={onChanged} />
        ) : null}
      </CardContent>
    </Card>
  )
}
