# Task API integration tests

Run from the backend directory:

```sh
npm test
```

The tests use Node's test runner, `tsx`, and the actual Express application with
an isolated PostgreSQL cluster. Install PostgreSQL server binaries and put them
on `PATH`, or set `TEST_PG_BIN` to the directory containing `initdb`, `postgres`,
and `pg_ctl`. Common Windows PostgreSQL and Linux package paths are discovered
automatically. If no server binaries exist, the integration suite explicitly
reports a skip.

The helper creates a private temporary cluster under `backend/node_modules`,
listens only on `127.0.0.1` on an available port, applies repository migrations,
and supplies its URL before importing the application. It does not use the
developer's `.env`, `DATABASE_URL`, Neon database, or existing PostgreSQL service.
The temporary cluster is stopped and its own directory removed after the run.
No Docker or additional npm package is required.

Coverage includes authentication, board sharing, owner/editor/viewer permissions,
board and column CRUD, hidden resources, task CRUD, same-column and cross-column
ordering, invalid moves with no partial changes, and simultaneous task writes.
