"use client"

import { Loader2, Plus } from "lucide-react"
import { useState } from "react"
import type { FormEvent } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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

interface CreateTaskDialogProps {
  columnId: string
  onChanged: () => void | Promise<void>
}

export function CreateTaskDialog({
  columnId,
  onChanged,
}: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedTitle = title.trim()

    if (!normalizedTitle) {
      setErrorMessage("Task title is required")
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage("")
      await taskService.createTask(columnId, {
        title: normalizedTitle,
        description: description.trim() || undefined,
      })
      await onChanged()

      setTitle("")
      setDescription("")
      setOpen(false)
      toast.success("Task created successfully")
    } catch (error) {
      const message = getApiErrorMessage(error, "Could not create the task")
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-dashed">
          <Plus />
          Add task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>Add a task to this column.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`new-task-title-${columnId}`}>Title</Label>
            <Input
              id={`new-task-title-${columnId}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Design the landing page"
              maxLength={100}
              disabled={isSubmitting}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`new-task-description-${columnId}`}>
              Description
            </Label>
            <Textarea
              id={`new-task-description-${columnId}`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add more details..."
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
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              Create task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
