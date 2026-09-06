"use client"

import { Loader2, Pencil, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
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
import { boardService } from "../board.service"
import type { BoardDetails } from "../board.types"

interface BoardActionsProps {
  board: BoardDetails
  onChanged: () => void | Promise<void>
}

export function BoardActions({ board, onChanged }: BoardActionsProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [title, setTitle] = useState(board.title)
  const [description, setDescription] = useState(board.description || "")
  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedTitle = title.trim()

    if (!normalizedTitle) {
      setErrorMessage("Board title is required")
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage("")
      await boardService.updateBoard(board.id, {
        title: normalizedTitle,
        description: description.trim() || null,
      })
      await onChanged()

      setEditOpen(false)
      toast.success("Board updated successfully")
    } catch (error) {
      const message = getApiErrorMessage(error, "Could not update the board")
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
      await boardService.deleteBoard(board.id)

      toast.success("Board deleted successfully")
      router.replace("/boards")
    } catch (error) {
      const message = getApiErrorMessage(error, "Could not delete the board")
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Pencil />
            Edit board
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit board</DialogTitle>
            <DialogDescription>Update this board&apos;s details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-board-title">Title</Label>
              <Input
                id="edit-board-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={100}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-board-description">Description</Label>
              <Textarea
                id="edit-board-description"
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
          <Button variant="destructive" size="icon">
            <Trash2 />
            <span className="sr-only">Delete board</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete board?</DialogTitle>
            <DialogDescription>
              This permanently deletes “{board.title}”, all its columns, and all
              its tasks. This action cannot be undone.
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
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
