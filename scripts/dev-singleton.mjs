import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const lockPath = path.join(process.cwd(), '.next', 'dev-server.lock')

function pidIsRunning(pid) {
  if (!pid || Number.isNaN(Number(pid))) return false
  try {
    process.kill(Number(pid), 0)
    return true
  } catch {
    return false
  }
}

function ensureLockDir() {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true })
}

function acquireLockOrExit() {
  ensureLockDir()

  try {
    const fd = fs.openSync(lockPath, 'wx')
    fs.writeFileSync(fd, String(process.pid), 'utf8')
    return () => {
      try { fs.closeSync(fd) } catch {}
      try { fs.unlinkSync(lockPath) } catch {}
    }
  } catch (e) {
    // Lock exists: check if it's stale
    let existingPid = null
    try {
      existingPid = Number(fs.readFileSync(lockPath, 'utf8').trim())
    } catch {}

    if (pidIsRunning(existingPid)) {
      console.error(
        `Another \`next dev\` seems to be running for this repo (pid ${existingPid}).\n` +
        `Stop it first, then run \`npm run dev\` again.`
      )
      process.exit(1)
    }

    // Stale lock: remove and retry once
    try { fs.unlinkSync(lockPath) } catch {}
    const fd = fs.openSync(lockPath, 'wx')
    fs.writeFileSync(fd, String(process.pid), 'utf8')
    return () => {
      try { fs.closeSync(fd) } catch {}
      try { fs.unlinkSync(lockPath) } catch {}
    }
  }
}

const release = acquireLockOrExit()
const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'dev'], {
  stdio: 'inherit',
  env: process.env,
})

const cleanup = () => {
  try { release?.() } catch {}
}

process.on('exit', cleanup)
process.on('SIGINT', () => {
  cleanup()
  process.exit(130)
})
process.on('SIGTERM', () => {
  cleanup()
  process.exit(143)
})

child.on('exit', (code, signal) => {
  cleanup()
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})

