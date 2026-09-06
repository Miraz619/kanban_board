import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { Server } from 'node:http'
import { after, before, beforeEach, describe, it } from 'node:test'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { findPostgresBin, startTestDatabase } from './support/postgres'

const postgresBin = await findPostgresBin()
const accessSecret = 'kanban-core-integration-test-access-secret'
const refreshSecret = 'kanban-core-integration-test-refresh-secret'

describe('Auth, Board, and Column APIs with isolated PostgreSQL', {
  concurrency: false,
  skip: postgresBin
    ? false
    : 'Install PostgreSQL server binaries or set TEST_PG_BIN. No external database is used.',
}, () => {
  let database: Awaited<ReturnType<typeof startTestDatabase>> | undefined
  let prisma: typeof import('../src/app/lib/prisma')['prisma']
  let server: Server | undefined
  let baseUrl: string
  let fixture: Awaited<ReturnType<typeof seed>>

  const seed = async () => {
    const password = await bcrypt.hash('Password123', 4)
    const users = await Promise.all(
      ['owner', 'editor', 'viewer', 'outsider', 'invitee'].map((name) =>
        prisma.user.create({
          data: {
            name,
            email: `${name}@kanban-test.invalid`,
            password,
          },
        }),
      ),
    )
    const [owner, editor, viewer, outsider, invitee] = users

    const board = await prisma.board.create({
      data: {
        title: 'Main board',
        description: 'Main description',
        ownerId: owner.id,
        members: {
          create: [
            { userId: editor.id, role: 'EDITOR' },
            { userId: viewer.id, role: 'VIEWER' },
          ],
        },
      },
    })
    const otherBoard = await prisma.board.create({
      data: { title: 'Other board', ownerId: owner.id },
    })
    const columns = await Promise.all(
      ['To do', 'Doing', 'Done'].map((title, position) =>
        prisma.boardColumn.create({
          data: { title, position, boardId: board.id },
        }),
      ),
    )
    const foreignColumn = await prisma.boardColumn.create({
      data: { title: 'Foreign', position: 0, boardId: otherBoard.id },
    })
    const deletedWithColumn = await prisma.task.create({
      data: { title: 'Delete with Doing', position: 0, columnId: columns[1].id },
    })

    return {
      owner,
      editor,
      viewer,
      outsider,
      invitee,
      board,
      otherBoard,
      columns,
      foreignColumn,
      deletedWithColumn,
    }
  }

  const tokenFor = (userId: string) =>
    jwt.sign({ userId }, accessSecret, { expiresIn: '5m' })

  const request = async (
    method: string,
    url: string,
    options: {
      userId?: string
      body?: unknown
      cookie?: string
    } = {},
  ) => {
    const headers: Record<string, string> = {}
    if (options.body !== undefined) headers['Content-Type'] = 'application/json'
    if (options.userId) headers.Authorization = `Bearer ${tokenFor(options.userId)}`
    if (options.cookie) headers.Cookie = options.cookie

    const response = await fetch(`${baseUrl}${url}`, {
      method,
      headers,
      body: options.body === undefined
        ? undefined
        : JSON.stringify(options.body),
    })
    return {
      status: response.status,
      body: await response.json(),
      setCookies: response.headers.getSetCookie(),
    }
  }

  const expectStatus = (
    response: Awaited<ReturnType<typeof request>>,
    status: number,
  ) => assert.equal(response.status, status, JSON.stringify(response.body))

  const cookieValue = (cookies: string[], name: string) => {
    const cookie = cookies.find((value) => value.startsWith(`${name}=`))
    assert.ok(cookie, `Missing ${name} cookie in ${JSON.stringify(cookies)}`)
    return cookie.split(';', 1)[0]
  }

  before(async () => {
    database = await startTestDatabase(postgresBin!)
    Object.assign(process.env, {
      DATABASE_URL: database.url,
      NODE_ENV: 'test',
      FRONTEND_URL: 'http://localhost:3000',
      BCRYPT_SALT_ROUNDS: '4',
      JWT_ACCESS_SECRET: accessSecret,
      JWT_REFRESH_SECRET: refreshSecret,
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      DOTENV_CONFIG_PATH: `${database.directory}/nonexistent-test.env`,
    })

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
    await prisma.user.deleteMany()
    fixture = await seed()
  })

  after(async () => {
    if (server) {
      server.closeAllConnections()
      await new Promise<void>((resolve, reject) =>
        server!.close((error) => error ? reject(error) : resolve()),
      )
    }
    if (prisma) await prisma.$disconnect()
    await database?.stop()
  }, { timeout: 30_000 })

  it('registers safely and validates duplicate or malformed users', async () => {
    const registration = await request('POST', '/api/v1/auth/register', {
      body: {
        name: '  New User  ',
        email: '  NEW@Example.com ',
        password: 'Secret123',
      },
    })
    expectStatus(registration, 201)
    assert.equal(registration.body.data.name, 'New User')
    assert.equal(registration.body.data.email, 'new@example.com')
    assert.equal('password' in registration.body.data, false)

    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: 'new@example.com' },
    })
    assert.notEqual(stored.password, 'Secret123')
    assert.equal(await bcrypt.compare('Secret123', stored.password), true)

    expectStatus(await request('POST', '/api/v1/auth/register', {
      body: { name: 'Again', email: 'new@example.com', password: 'Secret123' },
    }), 409)
    expectStatus(await request('POST', '/api/v1/auth/register', {
      body: { name: 'A', email: 'invalid', password: 'short' },
    }), 400)
  })

  it('logs in, reads /me, rotates refresh tokens, and logs out', async () => {
    expectStatus(await request('POST', '/api/v1/auth/login', {
      body: { email: fixture.owner.email, password: 'wrong-password' },
    }), 401)

    const login = await request('POST', '/api/v1/auth/login', {
      body: { email: `  ${fixture.owner.email.toUpperCase()} `, password: 'Password123' },
    })
    expectStatus(login, 200)
    assert.deepEqual(Object.keys(login.body.data), ['user'])
    const accessCookie = cookieValue(login.setCookies, 'accessToken')
    const refreshCookie = cookieValue(login.setCookies, 'refreshToken')

    const me = await request('GET', '/api/v1/auth/me', {
      cookie: accessCookie,
    })
    expectStatus(me, 200)
    assert.equal(me.body.data.userId, fixture.owner.id)

    const refreshed = await request('POST', '/api/v1/auth/refresh-token', {
      cookie: refreshCookie,
    })
    expectStatus(refreshed, 200)
    assert.equal(refreshed.body.data, null)
    const newRefreshCookie = cookieValue(refreshed.setCookies, 'refreshToken')
    assert.notEqual(newRefreshCookie, refreshCookie)
    cookieValue(refreshed.setCookies, 'accessToken')

    expectStatus(await request('POST', '/api/v1/auth/refresh-token'), 401)

    const logout = await request('POST', '/api/v1/auth/logout', {
      cookie: `${accessCookie}; ${newRefreshCookie}`,
    })
    expectStatus(logout, 200)
    assert.equal(logout.setCookies.some((cookie) =>
      cookie.startsWith('accessToken=;') && cookie.includes('Expires=Thu, 01 Jan 1970')),
    true)
    assert.equal(logout.setCookies.some((cookie) =>
      cookie.startsWith('refreshToken=;') && cookie.includes('Expires=Thu, 01 Jan 1970')),
    true)
  })

  it('requires authentication for board and column routes', async () => {
    const urls = [
      ['GET', '/api/v1/boards'],
      ['POST', '/api/v1/boards'],
      ['GET', `/api/v1/boards/${fixture.board.id}`],
      ['GET', `/api/v1/boards/${fixture.board.id}/columns`],
      ['POST', `/api/v1/boards/${fixture.board.id}/columns`],
    ]
    for (const [method, url] of urls) {
      expectStatus(await request(method, url, {
        body: method === 'POST' ? { title: 'Blocked' } : undefined,
      }), 401)
    }
  })

  it('creates, lists, reads, updates, and deletes owned boards', async () => {
    const created = await request('POST', '/api/v1/boards', {
      userId: fixture.owner.id,
      body: { title: '  Product roadmap  ', description: '  Q4 work  ' },
    })
    expectStatus(created, 201)
    assert.equal(created.body.data.title, 'Product roadmap')
    assert.equal(created.body.data.ownerId, fixture.owner.id)

    const ownerList = await request('GET', '/api/v1/boards', {
      userId: fixture.owner.id,
    })
    expectStatus(ownerList, 200)
    assert.equal(ownerList.body.data.some((board: { id: string; accessRole: string }) =>
      board.id === fixture.board.id && board.accessRole === 'OWNER'), true)

    const editorList = await request('GET', '/api/v1/boards', {
      userId: fixture.editor.id,
    })
    expectStatus(editorList, 200)
    assert.equal(editorList.body.data.length, 1)
    assert.equal(editorList.body.data[0].accessRole, 'EDITOR')

    const detail = await request('GET', `/api/v1/boards/${fixture.board.id}`, {
      userId: fixture.viewer.id,
    })
    expectStatus(detail, 200)
    assert.equal(detail.body.data.accessRole, 'VIEWER')
    assert.deepEqual(
      detail.body.data.columns.map((column: { position: number }) => column.position),
      [0, 1, 2],
    )

    const updated = await request('PATCH', `/api/v1/boards/${created.body.data.id}`, {
      userId: fixture.owner.id,
      body: { title: 'Updated roadmap', description: null },
    })
    expectStatus(updated, 200)
    assert.equal(updated.body.data.title, 'Updated roadmap')
    assert.equal(updated.body.data.description, null)

    expectStatus(await request('PATCH', `/api/v1/boards/${fixture.board.id}`, {
      userId: fixture.editor.id,
      body: { title: 'Forbidden rename' },
    }), 403)
    expectStatus(await request('GET', `/api/v1/boards/${fixture.board.id}`, {
      userId: fixture.outsider.id,
    }), 404)

    expectStatus(await request('DELETE', `/api/v1/boards/${created.body.data.id}`, {
      userId: fixture.owner.id,
    }), 200)
    assert.equal(await prisma.board.findUnique({
      where: { id: created.body.data.id },
    }), null)
  })

  it('lets only the owner share a board and manage member roles', async () => {
    expectStatus(await request('POST', `/api/v1/boards/${fixture.board.id}/members`, {
      userId: fixture.editor.id,
      body: { email: fixture.invitee.email, role: 'EDITOR' },
    }), 403)

    const shared = await request('POST', `/api/v1/boards/${fixture.board.id}/members`, {
      userId: fixture.owner.id,
      body: { email: fixture.invitee.email },
    })
    expectStatus(shared, 201)
    assert.equal(shared.body.data.role, 'VIEWER')

    expectStatus(await request('POST', `/api/v1/boards/${fixture.board.id}/members`, {
      userId: fixture.owner.id,
      body: { email: fixture.invitee.email },
    }), 409)
    expectStatus(await request('POST', `/api/v1/boards/${fixture.board.id}/members`, {
      userId: fixture.owner.id,
      body: { email: fixture.owner.email },
    }), 400)
    expectStatus(await request('POST', `/api/v1/boards/${fixture.board.id}/members`, {
      userId: fixture.owner.id,
      body: { email: 'missing@kanban-test.invalid' },
    }), 404)

    const roleUpdated = await request(
      'PATCH',
      `/api/v1/boards/${fixture.board.id}/members/${fixture.invitee.id}`,
      { userId: fixture.owner.id, body: { role: 'EDITOR' } },
    )
    expectStatus(roleUpdated, 200)
    assert.equal(roleUpdated.body.data.role, 'EDITOR')

    const members = await request('GET', `/api/v1/boards/${fixture.board.id}/members`, {
      userId: fixture.viewer.id,
    })
    expectStatus(members, 200)
    assert.equal(members.body.data.owner.role, 'OWNER')
    assert.equal(members.body.data.members.length, 3)

    expectStatus(await request(
      'DELETE',
      `/api/v1/boards/${fixture.board.id}/members/${fixture.invitee.id}`,
      { userId: fixture.owner.id },
    ), 200)
    assert.equal(await prisma.boardMember.findUnique({
      where: {
        boardId_userId: { boardId: fixture.board.id, userId: fixture.invitee.id },
      },
    }), null)
  })

  it('enforces column roles and keeps positions contiguous after deletion', async () => {
    const viewerList = await request(
      'GET',
      `/api/v1/boards/${fixture.board.id}/columns`,
      { userId: fixture.viewer.id },
    )
    expectStatus(viewerList, 200)
    assert.deepEqual(
      viewerList.body.data.map((column: { title: string }) => column.title),
      ['To do', 'Doing', 'Done'],
    )

    expectStatus(await request(
      'POST',
      `/api/v1/boards/${fixture.board.id}/columns`,
      { userId: fixture.viewer.id, body: { title: 'Blocked' } },
    ), 403)

    const created = await request(
      'POST',
      `/api/v1/boards/${fixture.board.id}/columns`,
      { userId: fixture.editor.id, body: { title: '  Review  ' } },
    )
    expectStatus(created, 201)
    assert.equal(created.body.data.title, 'Review')
    assert.equal(created.body.data.position, 3)

    const updated = await request(
      'PATCH',
      `/api/v1/boards/${fixture.board.id}/columns/${created.body.data.id}`,
      { userId: fixture.editor.id, body: { title: 'Approved' } },
    )
    expectStatus(updated, 200)
    assert.equal(updated.body.data.title, 'Approved')

    expectStatus(await request(
      'PATCH',
      `/api/v1/boards/${fixture.otherBoard.id}/columns/${fixture.columns[0].id}`,
      { userId: fixture.owner.id, body: { title: 'Cross-board update' } },
    ), 404)

    expectStatus(await request(
      'DELETE',
      `/api/v1/boards/${fixture.board.id}/columns/${fixture.columns[1].id}`,
      { userId: fixture.editor.id },
    ), 200)

    const remaining = await prisma.boardColumn.findMany({
      where: { boardId: fixture.board.id },
      orderBy: { position: 'asc' },
    })
    assert.deepEqual(remaining.map((column) => column.position), [0, 1, 2])
    assert.deepEqual(remaining.map((column) => column.title), ['To do', 'Done', 'Approved'])
    assert.equal(await prisma.task.findUnique({
      where: { id: fixture.deletedWithColumn.id },
    }), null)
  })

  it('rejects invalid board and column input without changing data', async () => {
    const boardCount = await prisma.board.count()
    const columnCount = await prisma.boardColumn.count()

    expectStatus(await request('POST', '/api/v1/boards', {
      userId: fixture.owner.id,
      body: { title: '   ' },
    }), 400)
    expectStatus(await request('PATCH', `/api/v1/boards/${fixture.board.id}`, {
      userId: fixture.owner.id,
      body: {},
    }), 400)
    expectStatus(await request(
      'POST',
      `/api/v1/boards/${fixture.board.id}/members`,
      { userId: fixture.owner.id, body: { email: fixture.invitee.email, role: 'OWNER' } },
    ), 400)
    expectStatus(await request(
      'POST',
      `/api/v1/boards/${fixture.board.id}/columns`,
      { userId: fixture.owner.id, body: { title: '' } },
    ), 400)

    assert.equal(await prisma.board.count(), boardCount)
    assert.equal(await prisma.boardColumn.count(), columnCount)
    expectStatus(await request('GET', `/api/v1/boards/${randomUUID()}`, {
      userId: fixture.owner.id,
    }), 404)
  })
})
