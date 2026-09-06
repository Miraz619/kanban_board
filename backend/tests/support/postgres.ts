import { execFile, spawn } from 'node:child_process'
import { access, mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import pg from 'pg'

const execFileAsync = promisify(execFile)
const backendRoot = fileURLToPath(new URL('../../', import.meta.url))
const executable = (name: string) => `${name}${process.platform === 'win32' ? '.exe' : ''}`

export const findPostgresBin = async () => {
  const candidates = [process.env.TEST_PG_BIN, ...(process.env.PATH ?? '').split(path.delimiter)]

  if (process.platform === 'win32') {
    const installedRoot = path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'PostgreSQL')
    const versions = await readdir(installedRoot).catch(() => [] as string[])
    candidates.push(...versions.sort().reverse().map((version) => path.join(installedRoot, version, 'bin')))
  } else {
    const versions = await readdir('/usr/lib/postgresql').catch(() => [] as string[])
    candidates.push(...versions.sort().reverse().map((version) => `/usr/lib/postgresql/${version}/bin`))
    candidates.push('/opt/homebrew/opt/postgresql@18/bin', '/opt/homebrew/opt/postgresql@17/bin')
  }

  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      await Promise.all(['initdb', 'postgres', 'pg_ctl'].map((name) => access(path.join(candidate, executable(name)))))
      return candidate
    } catch {
      // Try another installed PostgreSQL distribution.
    }
  }
}

const availablePort = async () => {
  const listener = createServer()
  await new Promise<void>((resolve, reject) => {
    listener.once('error', reject)
    listener.listen(0, '127.0.0.1', resolve)
  })
  const address = listener.address()
  if (!address || typeof address === 'string') throw new Error('Could not select a test database port')
  await new Promise<void>((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()))
  return address.port
}

// Always creates a separate cluster. DATABASE_URL and existing PostgreSQL services are never used.
export const startTestDatabase = async (binDirectory: string) => {
  const temporaryParent = path.resolve(backendRoot, 'node_modules')
  const temporaryRoot = await mkdtemp(path.join(temporaryParent, '.kanban-task-test-pg-'))
  const dataDirectory = path.join(temporaryRoot, 'data')
  let running = false
  let postgres: ReturnType<typeof spawn> | undefined
  let serverOutput = ''

  const stop = async () => {
    if (running) {
      await execFileAsync(path.join(binDirectory, executable('pg_ctl')), [
        '-D', dataDirectory, '-m', 'fast', '-w', 'stop',
      ], { windowsHide: true, timeout: 20_000 })
      running = false
    }

    if (postgres?.pid !== undefined && postgres.exitCode === null && postgres.signalCode === null) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Temporary PostgreSQL did not stop; its directory was preserved')), 20_000)
        postgres!.once('exit', () => { clearTimeout(timer); resolve() })
        if (postgres!.exitCode !== null || postgres!.signalCode !== null) { clearTimeout(timer); resolve() }
      })
    }

    // Recursive cleanup is allowed only for this exact mkdtemp-owned directory.
    const resolved = path.resolve(temporaryRoot)
    if (path.dirname(resolved) !== temporaryParent || !path.basename(resolved).startsWith('.kanban-task-test-pg-')) {
      throw new Error('Refusing to remove a directory outside the temporary test cluster')
    }
    await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }

  try {
    await execFileAsync(path.join(binDirectory, executable('initdb')), [
      '-D', dataDirectory, '-A', 'trust', '-U', 'kanban_test', '--encoding=UTF8', '--no-locale',
    ], { windowsHide: true, timeout: 30_000 })

    const port = await availablePort()
    const url = `postgresql://kanban_test@127.0.0.1:${port}/postgres`
    postgres = spawn(path.join(binDirectory, executable('postgres')), [
      '-D', dataDirectory, '-h', '127.0.0.1', '-p', String(port),
      '-c', 'fsync=off', '-c', 'synchronous_commit=off', '-c', 'full_page_writes=off',
    ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    postgres.stdout?.on('data', (chunk: Buffer) => { serverOutput = (serverOutput + chunk.toString()).slice(-10_000) })
    postgres.stderr?.on('data', (chunk: Buffer) => { serverOutput = (serverOutput + chunk.toString()).slice(-10_000) })
    let startError: Error | undefined
    postgres.once('error', (error) => { startError = error })

    let ready = false
    for (let attempt = 0; attempt < 100; attempt++) {
      if (startError) throw startError
      if (postgres.exitCode !== null) throw new Error(`Temporary PostgreSQL exited: ${serverOutput}`)
      const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 200 })
      try {
        await client.connect()
        await client.query('SELECT 1')
        ready = true
        running = true
        break
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100))
      } finally {
        await client.end().catch(() => undefined)
      }
    }
    if (!ready) throw new Error(`Temporary PostgreSQL did not become ready: ${serverOutput}`)

    const client = new pg.Client({ connectionString: url })
    await client.connect()
    try {
      const migrationsRoot = path.join(backendRoot, 'prisma', 'migrations')
      const migrations = await readdir(migrationsRoot, { withFileTypes: true })
      for (const migration of migrations.filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
        await client.query(await readFile(path.join(migrationsRoot, migration.name, 'migration.sql'), 'utf8'))
      }
    } finally {
      await client.end()
    }

    return { url, directory: temporaryRoot, stop }
  } catch (error) {
    if (postgres?.pid !== undefined && postgres.exitCode === null && !running) {
      postgres.kill()
    }
    await stop()
    throw error
  }
}
