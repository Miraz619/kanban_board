"use client"

import { Loader2, Pencil, Trash2 } from "lucide-react"
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

interface ColumnActionsProps {
  boardId: string
  columnId: string
  columnTitle: string
  onChanged: () => void | Promise<void>
}

export function ColumnActions({
  boardId,
  columnId,
  columnTitle,
  onChanged,
}: ColumnActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [title, setTitle] = useState(columnTitle)
  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedTitle = title.trim()

    if (!normalizedTitle) {
      setErrorMessage("Column title is required")
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage("")
      await columnService.updateColumn(boardId, columnId, {
        title: normalizedTitle,
      })
      await onChanged()

      setEditOpen(false)
      toast.success("Column updated successfully")
    } catch (error) {
      const message = getApiErrorMessage(error, "Could not update the column")
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
      await columnService.deleteColumn(boardId, columnId)
      await onChanged()

      setDeleteOpen(false)
      toast.success("Column deleted successfully")
    } catch (error) {
      const message = getApiErrorMessage(error, "Could not delete the column")
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <Pencil />
            <span className="sr-only">Rename {columnTitle}</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename column</DialogTitle>
            <DialogDescription>Change this column&apos;s title.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`column-title-${columnId}`}>Title</Label>
              <Input
                id={`column-title-${columnId}`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
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
          <Button variant="ghost" size="icon-sm">
            <Trash2 className="text-destructive" />
            <span className="sr-only">Delete {columnTitle}</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete column?</DialogTitle>
            <DialogDescription>
              This permanently deletes “{columnTitle}” and every task inside it.
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
              Delete column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
