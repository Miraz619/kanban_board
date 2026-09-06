"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import type { Task } from "../task.types"
import { TaskCard } from "./task-card"

interface SortableTaskCardProps {
  task: Task
  canEdit: boolean
  canDrag: boolean
  onChanged: () => void | Promise<void>
}

export function SortableTaskCard({
  task,
  canEdit,
  canDrag,
  onChanged,
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: !canDrag,
    data: {
      type: "task",
      columnId: task.columnId,
    },
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      }}
    >
      <TaskCard
        task={task}
        canEdit={canEdit}
        onChanged={onChanged}
        dragHandleProps={canDrag ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  )
}
