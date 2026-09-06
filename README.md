# Mini Kanban Board

A collaborative Kanban application built for the Webbriks Full-Stack Engineering
technical assessment. Users can own and share boards, organize columns, manage
tasks, and move tasks to an exact position without breaking their order.

## Technology

- Backend: Node.js, Express 5, and TypeScript
- Database: PostgreSQL on Neon with Prisma ORM
- Authentication: JWT access and refresh tokens in HTTP-only cookies
- Validation: Zod
- Frontend: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, and dnd-kit

## Repository structure

```text
Kanban/
|-- backend/
|   |-- prisma/
|   |   |-- migrations/
|   |   `-- schema/
|   |-- src/app/module/
|   |   |-- auth/
|   |   |-- board/
|   |   |-- column/
|   |   `-- task/
|   |-- tests/
|   `-- .env.example
|-- frontend/
|   |-- app/
|   |-- components/
|   |-- modules/
|   |-- Dockerfile
|   `-- .env.example
|-- docker-compose.yml
`-- README.md
```

## Run everything with Docker

Docker Desktop must be running. From the repository root, run:

```bash
docker compose up --build
```

Open the frontend at `http://localhost:3000`. The backend is available at
`http://localhost:5000`, and PostgreSQL is exposed locally on port `5433`.

Check service health with:

```bash
docker compose ps
```

Stop the services without deleting database data:

```bash
docker compose down
```

Do not add `-v` unless you intentionally want to delete the Docker database
volume.

## Frontend setup without Docker

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

The frontend is available at `http://localhost:3000`. Its public API URL must
point to the backend `/api/v1` path.

## Backend setup

Requirements: a recent Node.js version with npm, Git, and a PostgreSQL database
such as a Neon project.

```bash
git clone https://github.com/Miraz619/kanban_board.git
cd kanban_board/backend
npm install
```

Create the local environment file.

PowerShell:

```powershell
Copy-Item .env.example .env
```

Git Bash, macOS, or Linux:

```bash
cp .env.example .env
```

Open `.env` and replace `DATABASE_URL` with the connection string from the Neon
dashboard. Replace both JWT secrets with different random values. Generate one
random value with:

```bash
node -e "console.log(require('node:crypto').randomBytes(64).toString('hex'))"
```

Run that command twice: once for `JWT_ACCESS_SECRET` and once for
`JWT_REFRESH_SECRET`.

Generate the Prisma client and apply the committed migrations:

```bash
npx prisma generate
npx prisma migrate deploy
```

Start the development server:

```bash
npm run dev
```

The API is available at `http://localhost:5000`. A request to `/` returns the API
welcome message.

When deliberately changing the Prisma schema during development, create a new
migration with:

```bash
npx prisma migrate dev --name describe_your_change
```

Do not use `migrate dev` against a production database.

## Environment variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | Backend HTTP port | `5000` |
| `APP_URL` | Public backend URL | `http://localhost:5000` |
| `FRONTEND_URL` | Allowed CORS frontend origin | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL or Neon connection string | See `.env.example` |
| `BCRYPT_SALT_ROUNDS` | Password hashing work factor | `12` |
| `JWT_ACCESS_SECRET` | Signs short-lived access tokens | Long random value |
| `JWT_REFRESH_SECRET` | Signs refresh tokens | Different random value |
| `JWT_ACCESS_EXPIRES_IN` | Access-token lifetime | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token lifetime | `7d` |

Never commit `.env`. The repository tracks only `.env.example`.

## API response format

Successful responses use this structure:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": {}
}
```

Errors use the same status code in the HTTP response and JSON body. Validation
errors also include an `errors` array.

## API endpoints

All paths start with `/api/v1`.

### Authentication

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Register a user |
| `POST` | `/auth/login` | Log in and set access/refresh cookies |
| `POST` | `/auth/refresh-token` | Rotate both authentication tokens |
| `GET` | `/auth/me` | Return the authenticated user |
| `POST` | `/auth/logout` | Clear authentication cookies |

### Boards and collaboration

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/boards` | Create a board |
| `GET` | `/boards` | List owned and shared boards |
| `GET` | `/boards/:boardId` | Get a board with ordered columns and tasks |
| `PATCH` | `/boards/:boardId` | Update an owned board |
| `DELETE` | `/boards/:boardId` | Delete an owned board |
| `GET` | `/boards/:boardId/members` | List the owner and shared members |
| `POST` | `/boards/:boardId/members` | Share a board with a registered email |
| `PATCH` | `/boards/:boardId/members/:memberUserId` | Change a member role |
| `DELETE` | `/boards/:boardId/members/:memberUserId` | Remove a member |

### Columns

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/boards/:boardId/columns` | List ordered columns |
| `POST` | `/boards/:boardId/columns` | Create a column at the end |
| `PATCH` | `/boards/:boardId/columns/:columnId` | Rename a column |
| `DELETE` | `/boards/:boardId/columns/:columnId` | Delete a column and compact positions |

Deleting a column also deletes its tasks through the database cascade rule.

### Tasks

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/columns/:columnId/tasks` | List ordered tasks in a column |
| `POST` | `/columns/:columnId/tasks` | Create a task at the end |
| `GET` | `/tasks/:taskId` | Get one task |
| `PATCH` | `/tasks/:taskId` | Update task content |
| `DELETE` | `/tasks/:taskId` | Delete a task and compact positions |
| `PATCH` | `/tasks/:taskId/move` | Reorder or move a task |

Move request example:

```json
{
  "targetColumnId": "b5378c88-8d0f-4ef6-9a57-53cfc7dd7dd1",
  "position": 1
}
```

Positions start at zero. The requested position is calculated after removing the
moving task. A task may move only between columns on the same board. Creation,
deletion, and movement run in transactions that preserve contiguous positions.
See [the detailed Task API notes](backend/docs/task-api.md).

## Authorization rules

- `OWNER` is stored as `Board.ownerId`. Owners control board settings, sharing,
  members, columns, and tasks.
- `EDITOR` is a board membership role. Editors can read the board and manage its
  columns and tasks.
- `VIEWER` is a board membership role. Viewers have read-only access.
- Every column and task operation follows its relationship back to the board.
  Knowing another board's IDs does not grant access.

Authentication works through HTTP-only cookies. Bearer access tokens are also
accepted by protected endpoints:

```http
Authorization: Bearer ACCESS_TOKEN
```

Browser requests that use cookies must enable credentials:

```ts
fetch('http://localhost:5000/api/v1/boards', {
  credentials: 'include',
})
```

## Testing

Run all integration tests:

```bash
npm test
```

Type-check the application and tests:

```bash
npm run build
npm run test:typecheck
```

The suite contains 23 integration tests covering authentication, cookies, board
sharing, roles, columns, task movement, rollback, and concurrent task operations.

Tests create a separate temporary PostgreSQL cluster, apply the committed
migrations, and remove the cluster afterward. They do not read the application
`.env` or connect to Neon. PostgreSQL server binaries must be installed locally;
the suite reports a skip when they are unavailable. See
[the test setup notes](backend/tests/README.md).

## Available backend scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the backend with automatic restart |
| `npm run build` | Compile TypeScript into `dist` |
| `npm start` | Run the compiled backend |
| `npm test` | Run all integration tests |
| `npm run test:typecheck` | Type-check test files |

## Current project status

The backend APIs, integration tests, modular frontend, authentication,
collaboration controls, task drag-and-drop, and Docker Compose setup are
implemented. Final browser testing and optional deployment remain.
