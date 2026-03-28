import { readFileSync, unlinkSync, existsSync } from 'fs'

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:8080/api/v1'
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@gymflow.local'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@1234'
const SEED_FILE = '/tmp/gymflow-e2e-seed.json'

interface LoginResponse {
  accessToken: string;
}

async function apiRequest(
  method: string,
  url: string,
  token?: string
): Promise<void> {
  const response = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok && response.status !== 404) {
    const text = await response.text()
    throw new Error(`${method} ${url} failed: ${response.status} ${text}`)
  }
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

  const data = (await response.json()) as LoginResponse
  return data.accessToken
}

async function globalTeardown() {
  if (!existsSync(SEED_FILE)) return

  const raw = readFileSync(SEED_FILE, 'utf-8')
  const data = JSON.parse(raw) as {
    trainerId?: string;
    roomId?: string;
    instanceIds?: string[];
  }

  const token = await login()

  const instanceIds = [...(data.instanceIds ?? [])].reverse()
  for (const id of instanceIds) {
    await apiRequest('DELETE', `${API_BASE}/admin/class-instances/${id}`, token)
  }

  if (data.trainerId) {
    await apiRequest('DELETE', `${API_BASE}/admin/trainers/${data.trainerId}?force=true`, token)
  }

  if (data.roomId) {
    await apiRequest('DELETE', `${API_BASE}/rooms/${data.roomId}?force=true`, token)
  }

  unlinkSync(SEED_FILE)
}

export default globalTeardown
