import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { Server } from 'node:http'
import { after, before, beforeEach, describe, it } from 'node:test'
import jwt from 'jsonwebtoken'
import { findPostgresBin, startTestDatabase } from './support/postgres'

const postgresBin = await findPostgresBin()
const accessSecret = 'kanban-task-integration-test-secret-only'

describe('Task API with an isolated PostgreSQL database', {
  concurrency: false,
  skip: postgresBin ? false : 'Install PostgreSQL server binaries or set TEST_PG_BIN to run integration tests. No external database is used.',
}, () => {
  let database: Awaited<ReturnType<typeof startTestDatabase>> | undefined
  let prisma: typeof import('../src/app/lib/prisma')['prisma']
  let server: Server | undefined
  let baseUrl: string
  let fixture: Awaited<ReturnType<typeof seed>>

  const seed = async () => {
    const users = await Promise.all(['owner', 'editor', 'viewer', 'outsider'].map((name) => prisma.user.create({
      data: { name, email: `${name}@kanban-test.invalid`, password: 'unused-test-hash' },
    })))
    const [owner, editor, viewer, outsider] = users
    const board = await prisma.board.create({
      data: {
        title: 'Test board', ownerId: owner.id,
        members: { create: [{ userId: editor.id, role: 'EDITOR' }, { userId: viewer.id, role: 'VIEWER' }] },
      },
    })
    // The owner has access to both boards; movement must still reject crossing their boundary.
    const otherBoard = await prisma.board.create({ data: { title: 'Other board', ownerId: owner.id } })
    const [source, target, empty] = await Promise.all(['Source', 'Target', 'Empty'].map((title, position) => prisma.boardColumn.create({
      data: { title, position, boardId: board.id },
    })))
    const foreign = await prisma.boardColumn.create({ data: { title: 'Foreign', position: 0, boardId: otherBoard.id } })
    const tasks = await Promise.all(['A', 'B', 'C'].map((title, position) => prisma.task.create({
      data: { title, position, columnId: source.id },
    })))
    const targetTasks = await Promise.all(['D', 'E'].map((title, position) => prisma.task.create({
      data: { title, position, columnId: target.id },
    })))
    return { owner, editor, viewer, outsider, board, source, target, empty, foreign, tasks, targetTasks }
  }

  const request = async (
    method: string,
    url: string,
    userId?: string,
    body?: unknown,
    useCookie = false,
  ) => {
    const headers: Record<string, string> = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (userId) {
      const token = jwt.sign({ userId }, accessSecret, { expiresIn: '5m' })
      headers[useCookie ? 'Cookie' : 'Authorization'] = useCookie ? `accessToken=${token}` : `Bearer ${token}`
    }
    const response = await fetch(`${baseUrl}${url}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    })
    const responseBody = await response.json()
    return { status: response.status, body: responseBody }
  }

  const expectStatus = (response: Awaited<ReturnType<typeof request>>, status: number) => {
    assert.equal(response.status, status, JSON.stringify(response.body))
  }
  const taskPath = (taskId = fixture.tasks[0].id) => `/api/v1/tasks/${taskId}`
  const columnPath = (columnId = fixture.source.id) => `/api/v1/columns/${columnId}/tasks`
  const ordered = (columnId: string) => prisma.task.findMany({ where: { columnId }, orderBy: { position: 'asc' } })
  const expectOrder = async (columnId: string, titles: string[]) => {
    const rows = await ordered(columnId)
    assert.deepEqual(rows.map((task) => task.title), titles)
    assert.deepEqual(rows.map((task) => task.position), titles.map((_, index) => index))
  }
  const snapshot = () => prisma.task.findMany({ orderBy: [{ columnId: 'asc' }, { position: 'asc' }] })
  const move = (taskId: string, targetColumnId: string, position: number, userId = fixture.owner.id) => request(
    'PATCH', `${taskPath(taskId)}/move`, userId, { targetColumnId, position },
  )

  before(async () => {
    database = await startTestDatabase(postgresBin!)
    Object.assign(process.env, {
      DATABASE_URL: database.url,
      NODE_ENV: 'test',
      FRONTEND_URL: 'http://localhost:3000',
      JWT_ACCESS_SECRET: accessSecret,
      JWT_REFRESH_SECRET: 'kanban-refresh-integration-test-secret-only',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      DOTENV_CONFIG_PATH: `${database.directory}/nonexistent-test.env`,
    })
    // Config reads cwd/.env. An empty private cwd prevents loading any developer secrets.
    const previousDirectory = process.cwd()
    process.chdir(database.directory)
    try {
      const application = (await import('../src/app')).default
      prisma = (await import('../src/app/lib/prisma')).prisma
      const runningServer = application.listen(0, '127.0.0.1')
      server = runningServer
      await new Promise<void>((resolve, reject) => {
        runningServer.once('listening', resolve)
        runningServer.once('error', reject)
      })
      const address = runningServer.address()
      assert.ok(address && typeof address !== 'string')
      baseUrl = `http://127.0.0.1:${address.port}`
    } finally {
      process.chdir(previousDirectory)
    }
  }, { timeout: 60_000 })

  beforeEach(async () => {
    await prisma.user.deleteMany() // Test-owned temporary database only; cascade clears fixtures.
    fixture = await seed()
  })

  after(async () => {
    if (server) {
      server.closeAllConnections()
      await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()))
    }
    if (prisma) await prisma.$disconnect()
    await database?.stop()
  }, { timeout: 30_000 })

  it('creates at the end, trims the title, and supports cookie authentication', async () => {
    const response = await request('POST', columnPath(), fixture.owner.id, { title: '  New task  ', description: 'Details' }, true)
    expectStatus(response, 201)
    assert.equal(response.body.data.title, 'New task')
    assert.equal(response.body.data.description, 'Details')
    assert.equal(response.body.data.position, 3)
    assert.equal(response.body.data.columnId, fixture.source.id)
    assert.equal('password' in response.body.data, false)
    await expectOrder(fixture.source.id, ['A', 'B', 'C', 'New task'])
  })

  it('allows viewers to list ordered tasks and retrieve a task', async () => {
    const list = await request('GET', columnPath(), fixture.viewer.id)
    expectStatus(list, 200)
    assert.deepEqual(list.body.data.map((task: { title: string }) => task.title), ['A', 'B', 'C'])
    const detail = await request('GET', taskPath(), fixture.viewer.id)
    expectStatus(detail, 200)
    assert.equal(detail.body.data.id, fixture.tasks[0].id)
  })

  it('allows editors to create and edit, including clearing a description', async () => {
    const created = await request('POST', columnPath(fixture.empty.id), fixture.editor.id, { title: 'Editor task', description: 'Remove me' })
    expectStatus(created, 201)
    assert.equal(created.body.data.position, 0)
    const updated = await request('PATCH', taskPath(created.body.data.id), fixture.editor.id, { title: 'Renamed', description: null })
    expectStatus(updated, 200)
    assert.equal(updated.body.data.title, 'Renamed')
    assert.equal(updated.body.data.description, null)
    assert.equal(updated.body.data.position, 0)
  })

  it('requires authentication for every Task route', async () => {
    const requests = [
      request('POST', columnPath(), undefined, { title: 'Blocked' }),
      request('GET', columnPath()),
      request('GET', taskPath()),
      request('PATCH', taskPath(), undefined, { title: 'Blocked' }),
      request('DELETE', taskPath()),
      request('PATCH', `${taskPath()}/move`, undefined, { targetColumnId: fixture.target.id, position: 0 }),
    ]
    for (const response of await Promise.all(requests)) expectStatus(response, 401)
  })

  it('rejects every viewer mutation and leaves the database unchanged', async () => {
    const initial = await snapshot()
    const responses = await Promise.all([
      request('POST', columnPath(), fixture.viewer.id, { title: 'Blocked' }),
      request('PATCH', taskPath(), fixture.viewer.id, { title: 'Blocked' }),
      request('DELETE', taskPath(), fixture.viewer.id),
      move(fixture.tasks[0].id, fixture.target.id, 0, fixture.viewer.id),
    ])
    for (const response of responses) expectStatus(response, 403)
    assert.deepEqual(await snapshot(), initial)
  })

  it('hides tasks and columns from users outside the board', async () => {
    const initial = await snapshot()
    const responses = await Promise.all([
      request('GET', columnPath(), fixture.outsider.id),
      request('GET', taskPath(), fixture.outsider.id),
      request('POST', columnPath(), fixture.outsider.id, { title: 'Blocked' }),
      request('PATCH', taskPath(), fixture.outsider.id, { title: 'Blocked' }),
      request('DELETE', taskPath(), fixture.outsider.id),
      move(fixture.tasks[0].id, fixture.target.id, 0, fixture.outsider.id),
    ])
    for (const response of responses) expectStatus(response, 404)
    assert.deepEqual(await snapshot(), initial)
  })

  it('validates titles, nonempty updates, UUID params, and movement body', async () => {
    const initial = await snapshot()
    for (const body of [{}, { title: '' }, { title: '   ' }, { title: 12 }]) {
      expectStatus(await request('POST', columnPath(), fixture.owner.id, body), 400)
    }
    expectStatus(await request('PATCH', taskPath(), fixture.owner.id, {}), 400)
    expectStatus(await request('GET', taskPath('not-a-uuid'), fixture.owner.id), 400)
    expectStatus(await request('GET', columnPath('not-a-uuid'), fixture.owner.id), 400)
    for (const body of [
      {}, { targetColumnId: fixture.target.id }, { targetColumnId: 'bad', position: 0 },
      { targetColumnId: fixture.target.id, position: -1 },
      { targetColumnId: fixture.target.id, position: 0.5 },
      { targetColumnId: fixture.target.id, position: '1' },
    ]) {
      expectStatus(await request('PATCH', `${taskPath()}/move`, fixture.owner.id, body), 400)
    }
    assert.deepEqual(await snapshot(), initial)
  })

  it('returns 404 for missing resources', async () => {
    const missing = randomUUID()
    expectStatus(await request('GET', columnPath(missing), fixture.owner.id), 404)
    expectStatus(await request('POST', columnPath(missing), fixture.owner.id, { title: 'Missing' }), 404)
    expectStatus(await request('GET', taskPath(missing), fixture.owner.id), 404)
    expectStatus(await request('PATCH', taskPath(missing), fixture.owner.id, { title: 'Missing' }), 404)
    expectStatus(await request('DELETE', taskPath(missing), fixture.owner.id), 404)
    expectStatus(await move(missing, fixture.target.id, 0), 404)
  })

  it('moves forward, backward, and to the same position within a column', async () => {
    expectStatus(await move(fixture.tasks[0].id, fixture.source.id, 2), 200)
    await expectOrder(fixture.source.id, ['B', 'C', 'A'])
    expectStatus(await move(fixture.tasks[0].id, fixture.source.id, 0), 200)
    await expectOrder(fixture.source.id, ['A', 'B', 'C'])
    expectStatus(await move(fixture.tasks[1].id, fixture.source.id, 1), 200)
    await expectOrder(fixture.source.id, ['A', 'B', 'C'])
  })

  it('moves between columns at a chosen index, at the end, and into an empty column', async () => {
    const middle = await move(fixture.tasks[1].id, fixture.target.id, 1, fixture.editor.id)
    expectStatus(middle, 200)
    assert.equal(middle.body.data.columnId, fixture.target.id)
    assert.equal(middle.body.data.position, 1)
    await expectOrder(fixture.source.id, ['A', 'C'])
    await expectOrder(fixture.target.id, ['D', 'B', 'E'])
    expectStatus(await move(fixture.tasks[0].id, fixture.target.id, 3), 200)
    await expectOrder(fixture.source.id, ['C'])
    await expectOrder(fixture.target.id, ['D', 'B', 'E', 'A'])
    expectStatus(await move(fixture.tasks[2].id, fixture.empty.id, 0), 200)
    await expectOrder(fixture.source.id, [])
    await expectOrder(fixture.empty.id, ['C'])
  })

  it('rejects out-of-range indices, missing destinations, and cross-board moves atomically', async () => {
    const initial = await snapshot()
    expectStatus(await move(fixture.tasks[0].id, fixture.source.id, 3), 400)
    expectStatus(await move(fixture.tasks[0].id, fixture.target.id, 3), 400)
    expectStatus(await move(fixture.tasks[0].id, fixture.empty.id, 1), 400)
    expectStatus(await move(fixture.tasks[0].id, randomUUID(), 0), 404)
    expectStatus(await move(fixture.tasks[0].id, fixture.foreign.id, 0), 400)
    assert.deepEqual(await snapshot(), initial)
  })

  it('rolls back shifted positions when PostgreSQL fails during the final transfer', async () => {
    const initial = await snapshot()
    await prisma.$executeRawUnsafe(`
      CREATE FUNCTION reject_test_task_transfer() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'Intentional test-only transfer failure';
      END;
      $$
    `)
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER reject_test_task_transfer
        BEFORE UPDATE OF "columnId" ON "tasks"
        FOR EACH ROW WHEN (OLD."columnId" IS DISTINCT FROM NEW."columnId")
        EXECUTE FUNCTION reject_test_task_transfer()
      `)
      expectStatus(await move(fixture.tasks[1].id, fixture.target.id, 1), 500)
      assert.deepEqual(await snapshot(), initial)
      await expectOrder(fixture.source.id, ['A', 'B', 'C'])
      await expectOrder(fixture.target.id, ['D', 'E'])
    } finally {
      await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS reject_test_task_transfer ON "tasks"')
      await prisma.$executeRawUnsafe('DROP FUNCTION reject_test_task_transfer()')
    }
  })

  it('deletes a task, closes its position gap, and does not affect another column', async () => {
    expectStatus(await request('DELETE', taskPath(fixture.tasks[1].id), fixture.editor.id), 200)
    await expectOrder(fixture.source.id, ['A', 'C'])
    await expectOrder(fixture.target.id, ['D', 'E'])
    expectStatus(await request('GET', taskPath(fixture.tasks[1].id), fixture.owner.id), 404)
    expectStatus(await request('POST', columnPath(), fixture.editor.id, { title: 'New end' }), 201)
    await expectOrder(fixture.source.id, ['A', 'C', 'New end'])
  })

  it('keeps unique contiguous positions during simultaneous creates', async () => {
    const responses = await Promise.all(Array.from({ length: 4 }, (_, index) => request(
      'POST', columnPath(fixture.empty.id), fixture.editor.id, { title: `Concurrent ${index}` },
    )))
    for (const response of responses) expectStatus(response, 201)
    const tasks = await ordered(fixture.empty.id)
    assert.deepEqual(tasks.map((task) => task.position), [0, 1, 2, 3])
    assert.equal(new Set(tasks.map((task) => task.id)).size, 4)
  })

  it('keeps every task exactly once during simultaneous moves into one column', async () => {
    const initialIds = (await snapshot()).map((task) => task.id).sort()
    const responses = await Promise.all(fixture.tasks.map((task) => move(task.id, fixture.target.id, 0)))
    for (const response of responses) expectStatus(response, 200)
    await expectOrder(fixture.source.id, [])
    const tasks = await ordered(fixture.target.id)
    assert.deepEqual(tasks.map((task) => task.position), [0, 1, 2, 3, 4])
    assert.deepEqual(tasks.map((task) => task.id).sort(), initialIds)
  })

  it('serializes an overlapping create, delete, and move without position gaps', async () => {
    const responses = await Promise.all([
      request('POST', columnPath(), fixture.owner.id, { title: 'Concurrent new' }),
      request('DELETE', taskPath(fixture.tasks[1].id), fixture.owner.id),
      move(fixture.tasks[0].id, fixture.target.id, 0),
    ])
    responses.forEach((response, index) => expectStatus(response, index === 0 ? 201 : 200))
    await expectOrder(fixture.source.id, ['C', 'Concurrent new'])
    await expectOrder(fixture.target.id, ['A', 'D', 'E'])
    assert.equal(await prisma.task.count(), 5)
  })
})
