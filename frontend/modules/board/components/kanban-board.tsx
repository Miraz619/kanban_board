"use client"

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { useState } from "react"
import { toast } from "sonner"

import { KanbanColumn } from "@/modules/column/components/kanban-column"
import { taskService } from "@/modules/task/task.service"
import type { Task } from "@/modules/task/task.types"
import type { BoardColumn } from "../board.types"

interface KanbanBoardProps {
  boardId: string
  columns: BoardColumn[]
  canEdit: boolean
  onChanged: () => void | Promise<void>
}

export function KanbanBoard({
  boardId,
  columns,
  canEdit,
  onChanged,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [isMoving, setIsMoving] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragStart = ({ active }: DragStartEvent) => {
    const task = columns
      .flatMap((column) => column.tasks)
      .find((item) => item.id === String(active.id))

    setActiveTask(task || null)
  }

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveTask(null)

    if (!over || active.id === over.id || !canEdit) return

    const activeColumnId = active.data.current?.columnId
    const targetColumnId = over.data.current?.columnId

    if (
      typeof activeColumnId !== "string" ||
      typeof targetColumnId !== "string"
    ) {
      return
    }

    const targetColumn = columns.find((column) => column.id === targetColumnId)
    if (!targetColumn) return

    let targetPosition: number

    if (over.data.current?.type === "task") {
      targetPosition = targetColumn.tasks.findIndex(
        (task) => task.id === String(over.id),
      )

      if (targetPosition < 0) return
    } else {
      targetPosition = targetColumn.tasks.length

      if (activeColumnId === targetColumnId) {
        targetPosition = Math.max(0, targetPosition - 1)
      }
    }

    try {
      setIsMoving(true)
      await taskService.moveTask(String(active.id), {
        targetColumnId,
        position: targetPosition,
      })
      await onChanged()
      toast.success("Task moved")
    } catch {
      toast.error("Could not move the task")
      await onChanged()
    } finally {
      setIsMoving(false)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragCancel={() => setActiveTask(null)}
      onDragEnd={(event) => void handleDragEnd(event)}
    >
      <div className="mt-8 flex gap-5 overflow-x-auto pb-5">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            boardId={boardId}
            column={column}
            canEdit={canEdit}
            canDrag={canEdit && !isMoving}
            onChanged={onChanged}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="w-72 rotate-2 rounded-xl bg-background p-4 shadow-xl ring-1 ring-primary/30">
            <p className="font-medium">{activeTask.title}</p>
            {activeTask.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {activeTask.description}
              </p>
            ) : null}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
