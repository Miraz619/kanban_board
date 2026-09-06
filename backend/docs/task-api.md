# Task API

All endpoints require the existing access-token authentication. Board owners
and `EDITOR` members may create, edit, delete, and move tasks. `VIEWER` members
may read tasks. Access is checked against the task's column and board.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/columns/:columnId/tasks` | Create a task at the end of the column |
| GET | `/api/v1/columns/:columnId/tasks` | List the column's tasks in position order |
| GET | `/api/v1/tasks/:taskId` | Read a task |
| PATCH | `/api/v1/tasks/:taskId` | Update a task title or description |
| DELETE | `/api/v1/tasks/:taskId` | Delete a task and compact the remaining positions |
| PATCH | `/api/v1/tasks/:taskId/move` | Move or reorder a task |

IDs must be UUIDs. The normal response envelope is
`{ success, statusCode, message, data }`. Creation returns `201`; other successful
requests return `200`. Delete returns `data: null`.

## Create and update

Create a task with:

```json
{
  "title": "Build registration form",
  "description": "Include name, email, and password fields"
}
```

The title is trimmed and must contain 1–100 characters. The description is
optional, trimmed, and limited to 500 characters. Update accepts either or both
fields and rejects an empty update. Set `description` to `null` to remove it.
Unknown body fields are rejected; callers cannot set positions or column IDs
through the create/update body.

## Move

```json
{
  "targetColumnId": "b5378c88-8d0f-4ef6-9a57-53cfc7dd7dd1",
  "position": 1
}
```

The target column must belong to the same board as the task's current column,
even if the requester owns both boards. Use the current column's ID to reorder
within that column.

Positions start at zero. The requested index is interpreted **after removing
the moving task**. It must be an integer from `0` through the remaining target
column's task count, inclusive. The task count is the append position.
For example, moving `A` to position `2` in `[A, B, C]` produces `[B, C, A]`.
An empty destination accepts only position `0`.

The endpoint returns the moved task with its new `columnId` and `position`.
The frontend should reload both affected columns after a move to receive their
updated positions. Task creation, deletion, and movement preserve contiguous
positions inside database transactions.

Writes run at PostgreSQL's serializable isolation level. Conflicting requests
are retried with fresh data up to five total attempts. If contention persists,
the API returns `409` and the client may retry; no partial move is committed.
The retry strategy follows [Prisma's transaction guidance](https://docs.prisma.io/docs/orm/v7/prisma-client/queries/transactions).

## Verification

Run `npm test` from `backend` to exercise the API against a separate, temporary
local PostgreSQL database. See [test setup](../tests/README.md) for prerequisites.
The suite does not connect to Neon or read your application `.env`.
