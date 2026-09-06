"use client"

import { GripVertical, Loader2, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import type { ComponentProps, FormEvent } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getApiErrorMessage } from "@/lib/api-error"
import { taskService } from "../task.service"
import type { Task } from "../task.types"

interface TaskCardProps {
  task: Task
  canEdit: boolean
  onChanged: () => void | Promise<void>
  dragHandleProps?: ComponentProps<"button">
}

export function TaskCard({
  task,
  canEdit,
  onChanged,
  dragHandleProps,
}: TaskCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || "")
  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedTitle = title.trim()

    if (!normalizedTitle) {
      setErrorMessage("Task title is required")
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage("")
      await taskService.updateTask(task.id, {
        title: normalizedTitle,
        description: description.trim() || null,
      })
      await onChanged()

      setEditOpen(false)
      toast.success("Task updated successfully")
    } catch (error) {
      const message = getApiErrorMessage(error, "Could not update the task")
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsSubmitting(true)
      setErrorMessage("")
      await taskService.deleteTask(task.id)
      await onChanged()

      setDeleteOpen(false)
      toast.success("Task deleted successfully")
    } catch (error) {
      const message = getApiErrorMessage(error, "Could not delete the task")
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card size="sm" className="bg-background">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="break-words">{task.title}</CardTitle>
            {task.description ? (
              <CardDescription className="mt-1 line-clamp-3">
                {task.description}
              </CardDescription>
            ) : null}
          </div>

          {canEdit ? (
            <div className="flex shrink-0">
              {dragHandleProps ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="cursor-grab touch-none active:cursor-grabbing"
                  aria-label={`Move ${task.title}`}
                  {...dragHandleProps}
                >
                  <GripVertical />
                </Button>
              ) : null}

              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon-xs">
                    <Pencil />
                    <span className="sr-only">Edit {task.title}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit task</DialogTitle>
                    <DialogDescription>Update this task&apos;s details.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`task-title-${task.id}`}>Title</Label>
                      <Input
                        id={`task-title-${task.id}`}
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        maxLength={100}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`task-description-${task.id}`}>
                        Description
                      </Label>
                      <Textarea
                        id={`task-description-${task.id}`}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        maxLength={500}
                        disabled={isSubmitting}
                      />
                    </div>
                    {errorMessage ? (
                      <p className="text-sm text-destructive" role="alert">
                        {errorMessage}
                      </p>
                    ) : null}
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditOpen(false)}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : null}
                        Save changes
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon-xs">
                    <Trash2 className="text-destructive" />
                    <span className="sr-only">Delete {task.title}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete task?</DialogTitle>
                    <DialogDescription>
                      This permanently deletes “{task.title}”.
                    </DialogDescription>
                  </DialogHeader>
                  {errorMessage ? (
                    <p className="text-sm text-destructive" role="alert">
                      {errorMessage}
                    </p>
                  ) : null}
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => void handleDelete()}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" /> : null}
                      Delete task
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : null}
        </div>
      </CardHeader>
    </Card>
  )
}
