"use client"

import { Loader2, Trash2, UserPlus, Users } from "lucide-react"
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
import { boardService } from "../board.service"
import type { BoardAccessRole, BoardDetails } from "../board.types"

interface BoardMembersDialogProps {
  board: BoardDetails
  isOwner: boolean
  onChanged: () => void | Promise<void>
}

type MemberRole = Exclude<BoardAccessRole, "OWNER">

export function BoardMembersDialog({
  board,
  isOwner,
  onChanged,
}: BoardMembersDialogProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<MemberRole>("VIEWER")
  const [errorMessage, setErrorMessage] = useState("")
  const [isInviting, setIsInviting] = useState(false)
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null)

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setIsInviting(true)
      setErrorMessage("")
      await boardService.shareBoard(board.id, { email: email.trim(), role })
      await onChanged()

      setEmail("")
      setRole("VIEWER")
      toast.success("Board shared successfully")
    } catch (error) {
      const message = getApiErrorMessage(error, "Could not share the board")
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setIsInviting(false)
    }
  }

  const handleRoleChange = async (userId: string, nextRole: MemberRole) => {
    try {
      setBusyMemberId(userId)
      setErrorMessage("")
      await boardService.updateBoardMember(board.id, userId, nextRole)
      await onChanged()
      toast.success("Member role updated")
    } catch (error) {
      const message = getApiErrorMessage(error, "Could not update member role")
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setBusyMemberId(null)
    }
  }

  const handleRemove = async (userId: string) => {
    try {
      setBusyMemberId(userId)
      setErrorMessage("")
      await boardService.removeBoardMember(board.id, userId)
      await onChanged()
      toast.success("Member removed")
    } catch (error) {
      const message = getApiErrorMessage(error, "Could not remove the member")
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setBusyMemberId(null)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users />
          Members
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Board members</DialogTitle>
          <DialogDescription>
            View everyone with access to this board.
          </DialogDescription>
        </DialogHeader>

        {isOwner ? (
          <form onSubmit={handleInvite} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center gap-2 font-medium">
              <UserPlus className="size-4" />
              Invite registered user
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <div className="space-y-2">
                <Label htmlFor="member-email">Email</Label>
                <Input
                  id="member-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="member@example.com"
                  disabled={isInviting}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-role">Role</Label>
                <select
                  id="member-role"
                  value={role}
                  onChange={(event) => setRole(event.target.value as MemberRole)}
                  className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
                  disabled={isInviting}
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="EDITOR">Editor</option>
                </select>
              </div>
            </div>
            <Button type="submit" size="sm" disabled={isInviting}>
              {isInviting ? <Loader2 className="animate-spin" /> : <UserPlus />}
              Share board
            </Button>
          </form>
        ) : null}

        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="max-h-72 space-y-2 overflow-y-auto">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{board.owner.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {board.owner.email}
              </p>
            </div>
            <span className="rounded-full bg-secondary px-2 py-1 text-xs font-medium">
              OWNER
            </span>
          </div>

          {board.members.map((member) => {
            const isBusy = busyMemberId === member.user.id

            return (
              <div
                key={member.user.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{member.user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.user.email}
                  </p>
                </div>

                {isOwner ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      onChange={(event) =>
                        void handleRoleChange(
                          member.user.id,
                          event.target.value as MemberRole,
                        )
                      }
                      className="h-7 rounded-lg border border-input bg-background px-2 text-xs"
                      disabled={isBusy}
                      aria-label={`Role for ${member.user.name}`}
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="EDITOR">Editor</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void handleRemove(member.user.id)}
                      disabled={isBusy}
                    >
                      {isBusy ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Trash2 className="text-destructive" />
                      )}
                      <span className="sr-only">Remove {member.user.name}</span>
                    </Button>
                  </div>
                ) : (
                  <span className="rounded-full bg-secondary px-2 py-1 text-xs font-medium">
                    {member.role}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
