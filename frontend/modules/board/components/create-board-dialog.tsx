"use client"

import { Loader2, Plus } from "lucide-react"
import { FormEvent, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getApiErrorMessage } from "@/lib/api-error"

import { boardService } from "../board.service"

interface CreateBoardDialogProps {
  onCreated: () => void | Promise<void>
}

export function CreateBoardDialog({
  onCreated,
}: CreateBoardDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setErrorMessage("")
  }

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    setErrorMessage("")

    if (title.trim().length < 2) {
      setErrorMessage("Title must be at least 2 characters long")
      return
    }

    try {
      setIsSubmitting(true)

      await boardService.createBoard({
        title: title.trim(),
        description: description.trim() || undefined,
      })

      await onCreated()

      toast.success("Board created successfully")
      setOpen(false)
      resetForm()
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Could not create the board",
      )

      setErrorMessage(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen && !isSubmitting) {
      resetForm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Create board
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new board</DialogTitle>

          <DialogDescription>
            Add a board to organize your columns and tasks.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="board-title">Title</Label>

            <Input
              id="board-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Website redesign"
              maxLength={100}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="board-description">
              Description
            </Label>

            <Textarea
              id="board-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="What is this board for?"
              maxLength={500}
              disabled={isSubmitting}
            />
          </div>

          {errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Creating...
                </>
              ) : (
                "Create board"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}