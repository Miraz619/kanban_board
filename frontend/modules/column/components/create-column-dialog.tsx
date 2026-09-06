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
import { getApiErrorMessage } from "@/lib/api-error"
import { columnService } from "../column.service"

interface CreateColumnDialogProps {
  boardId: string
  onChanged: () => void | Promise<void>
}

export function CreateColumnDialog({
  boardId,
  onChanged,
}: CreateColumnDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedTitle = title.trim()

    if (!normalizedTitle) {
      setErrorMessage("Column title is required")
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage("")
      await columnService.createColumn(boardId, { title: normalizedTitle })
      await onChanged()

      setTitle("")
      setOpen(false)
      toast.success("Column created successfully")
    } catch (error) {
      const message = getApiErrorMessage(error, "Could not create the column")
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Add column
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create column</DialogTitle>
          <DialogDescription>
            Add another workflow stage to this board.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-column-title">Title</Label>
            <Input
              id="new-column-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="In progress"
              maxLength={100}
              disabled={isSubmitting}
              autoFocus
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
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Creating...
                </>
              ) : (
                "Create column"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
