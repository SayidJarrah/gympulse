import { readFileSync, unlinkSync, existsSync } from 'fs'

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:8080/api/v1'
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@gymflow.local'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@1234'
const SEED_FILE = '/tmp/gymflow-e2e-seed.json'

// ── How many weeks around today to sweep for leftover instances ──
const INSTANCE_SWEEP_WEEKS = 4

interface LoginResponse {
  accessToken: string;
}

interface IdRecord {
  id: string;
}

interface E2eCleanupResponse {
  deletedUsers: number;
  deletedMemberships: number;
}

async function login(): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Login failed: ${response.status} ${text}`)
  }
  return ((await response.json()) as LoginResponse).accessToken
}

async function apiDelete(url: string, token: string): Promise<void> {
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok && response.status !== 404) {
    console.warn(`DELETE ${url} → ${response.status}`)
  }
}

async function apiGetAll<T>(url: string, token: string): Promise<T[]> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) return []
  const data = (await response.json()) as { content?: T[]; instances?: T[] }
  return data.content ?? data.instances ?? []
}

async function apiPost<T>(url: string, token: string, body: unknown): Promise<T | null> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    if (response.status === 404) return null
    const text = await response.text()
    console.warn(`POST ${url} → ${response.status} ${text}`)
    return null
  }

  return response.json() as Promise<T>
}

function getIsoWeekStartUtc(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - (day + 6) % 7)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

const MS_IN_DAY = 24 * 60 * 60 * 1000

function formatWeekString(date: Date): string {
  const temp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  temp.setUTCDate(temp.getUTCDate() + 4 - (temp.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((temp.getTime() - yearStart.getTime()) / MS_IN_DAY + 1) / 7)
  return `${temp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

async function globalTeardown() {
  if (!existsSync(SEED_FILE)) return

  const raw = readFileSync(SEED_FILE, 'utf-8')
  const data = JSON.parse(raw) as {
    trainerId?: string;
    roomId?: string;
    instanceIds?: string[];
    baseline?: {
      trainerIds: string[];
      roomIds: string[];
      templateIds: string[];
    };
  }

  const token = await login()

  // ── 1. Delete all class instances (seed + test-created) ──────────────────
  // First delete tracked seed instances, then sweep surrounding weeks for any
  // remaining instances left by individual tests.
  const deletedInstances = new Set<string>()

  for (const id of [...(data.instanceIds ?? [])].reverse()) {
    await apiDelete(`${API_BASE}/admin/class-instances/${id}`, token)
    deletedInstances.add(id)
  }

  const weekStart = getIsoWeekStartUtc(new Date())
  for (let offset = -INSTANCE_SWEEP_WEEKS; offset <= INSTANCE_SWEEP_WEEKS; offset++) {
    const d = new Date(weekStart)
    d.setUTCDate(d.getUTCDate() + offset * 7)
    const weekStr = formatWeekString(d)
    const instances = await apiGetAll<IdRecord>(
      `${API_BASE}/admin/class-instances?week=${encodeURIComponent(weekStr)}`,
      token
    )
    for (const inst of instances) {
      if (!deletedInstances.has(inst.id)) {
        await apiDelete(`${API_BASE}/admin/class-instances/${inst.id}`, token)
        deletedInstances.add(inst.id)
      }
    }
  }

  // ── 2. Delete all trainers not in baseline ────────────────────────────────
  if (data.trainerId) {
    await apiDelete(`${API_BASE}/admin/trainers/${data.trainerId}?force=true`, token)
  }

  if (data.baseline) {
    const baselineTrainers = new Set(data.baseline.trainerIds)
    const allTrainers = await apiGetAll<IdRecord>(
      `${API_BASE}/admin/trainers?page=0&size=500`,
      token
    )
    for (const trainer of allTrainers) {
      if (!baselineTrainers.has(trainer.id)) {
        await apiDelete(`${API_BASE}/admin/trainers/${trainer.id}?force=true`, token)
      }
    }
  }

  // ── 3. Delete all rooms not in baseline ───────────────────────────────────
  if (data.roomId) {
    await apiDelete(`${API_BASE}/rooms/${data.roomId}?force=true`, token)
  }

  if (data.baseline) {
    const baselineRooms = new Set(data.baseline.roomIds)
    const allRooms = await apiGetAll<IdRecord>(
      `${API_BASE}/rooms?page=0&size=500`,
      token
    )
    for (const room of allRooms) {
      if (!baselineRooms.has(room.id)) {
        await apiDelete(`${API_BASE}/rooms/${room.id}?force=true`, token)
      }
    }
  }

  // ── 4. Delete all class templates not in baseline ─────────────────────────
  if (data.baseline) {
    const baselineTemplates = new Set(data.baseline.templateIds)
    const allTemplates = await apiGetAll<IdRecord>(
      `${API_BASE}/admin/class-templates?page=0&size=500`,
      token
    )
    for (const template of allTemplates) {
      if (!baselineTemplates.has(template.id)) {
        await apiDelete(`${API_BASE}/admin/class-templates/${template.id}?force=true`, token)
      }
    }
  }

  // ── 5. Cleanup test-created user and plan data ────────────────────────────
  await apiPost<E2eCleanupResponse>(
    `${API_BASE}/test-support/e2e/cleanup`,
    token,
    {
      emailPrefixes: ['e2e-member-', 'e2e-register-'],
      planPrefixes: ['E2E Seed ', 'E2E Plan '],
    }
  )

  unlinkSync(SEED_FILE)
}

export default globalTeardown
