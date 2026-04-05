import { writeFileSync } from 'fs'

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:8080/api/v1'
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@gymflow.local'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@1234'
const SEED_FILE = '/tmp/gymflow-e2e-seed.json'
const INSTANCE_SWEEP_WEEKS = 4

interface LoginResponse {
  accessToken: string;
}

interface TrainerResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface RoomResponse {
  id: string;
  name: string;
}

interface MembershipPlanResponse {
  id: string;
  name: string;
}

interface ClassTemplateResponse {
  id: string;
  name: string;
  defaultDurationMin: number;
  defaultCapacity: number;
}

interface ClassInstanceResponse {
  id: string;
  name: string;
  scheduledAt: string;
  room: RoomSummaryResponse | null;
  trainers: TrainerSummaryResponse[];
}

interface TrainerSummaryResponse {
  id: string;
}

interface RoomSummaryResponse {
  id: string;
}

interface MembershipPlanSeed {
  name: string;
  description: string;
  priceInCents: number;
  durationDays: number;
}

interface E2eCleanupResponse {
  deletedUsers: number;
  deletedMemberships: number;
  deletedPlans: number;
}

const REQUIRED_MEMBERSHIP_PLANS: MembershipPlanSeed[] = [
  {
    name: 'E2E Seed Starter Monthly',
    description: 'Entry membership for automated test coverage.',
    priceInCents: 3900,
    durationDays: 30,
  },
  {
    name: 'E2E Seed Unlimited Monthly',
    description: 'Higher-tier membership for purchase and admin flows.',
    priceInCents: 5900,
    durationDays: 30,
  },
]

async function apiRequest<T>(
  method: string,
  url: string,
  token?: string,
  body?: unknown
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`${method} ${url} failed: ${response.status} ${text}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

async function deleteInstance(token: string, id: string): Promise<void> {
  try {
    await apiRequest<void>('DELETE', `${API_BASE}/admin/class-instances/${id}`, token)
  } catch (err) {
    // 409 CLASS_HAS_ACTIVE_BOOKINGS — instance cannot be deleted; skip it
    if (err instanceof Error && err.message.includes('409')) return
    throw err
  }
}

async function login(): Promise<string> {
  const data = await apiRequest<LoginResponse>(
    'POST',
    `${API_BASE}/auth/login`,
    undefined,
    { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
  )
  return data.accessToken
}

async function getTemplates(token: string): Promise<ClassTemplateResponse[]> {
  const data = await apiRequest<{ content: ClassTemplateResponse[] }>(
    'GET',
    `${API_BASE}/admin/class-templates?page=0&size=500`,
    token
  )
  return data.content
}

async function getMembershipPlans(token: string): Promise<MembershipPlanResponse[]> {
  const data = await apiRequest<{ content: MembershipPlanResponse[] }>(
    'GET',
    `${API_BASE}/admin/membership-plans?page=0&size=500`,
    token
  )
  return data.content
}

async function getRooms(token: string): Promise<RoomResponse[]> {
  const data = await apiRequest<{ content: RoomResponse[] }>(
    'GET',
    `${API_BASE}/rooms?page=0&size=500`,
    token
  )
  return data.content
}

async function getTrainers(token: string, search: string): Promise<TrainerResponse[]> {
  const data = await apiRequest<{ content: TrainerResponse[] }>(
    'GET',
    `${API_BASE}/admin/trainers?page=0&size=500&search=${encodeURIComponent(search)}`,
    token
  )
  return data.content
}

async function getAllTrainers(token: string): Promise<TrainerResponse[]> {
  const data = await apiRequest<{ content: TrainerResponse[] }>(
    'GET',
    `${API_BASE}/admin/trainers?page=0&size=500`,
    token
  )
  return data.content
}

async function getWeekSchedule(token: string, week: string): Promise<ClassInstanceResponse[]> {
  const data = await apiRequest<{ instances: ClassInstanceResponse[] }>(
    'GET',
    `${API_BASE}/admin/class-instances?week=${encodeURIComponent(week)}`,
    token
  )
  return data.instances
}

function getIsoWeekStartUtc(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  const diff = (day + 6) % 7
  d.setUTCDate(d.getUTCDate() - diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function buildScheduledAt(weekStart: Date, dayIndex: number, time: string): string {
  const [hour, minute] = time.split(':').map(Number)
  const d = new Date(weekStart)
  d.setUTCDate(weekStart.getUTCDate() + dayIndex)
  d.setUTCHours(hour, minute, 0, 0)
  return d.toISOString()
}

const MS_IN_DAY = 24 * 60 * 60 * 1000

function formatWeekString(date: Date): string {
  const temp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  temp.setUTCDate(temp.getUTCDate() + 4 - (temp.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((temp.getTime() - yearStart.getTime()) / MS_IN_DAY + 1) / 7)
  const year = temp.getUTCFullYear()
  return `${year}-W${String(weekNo).padStart(2, '0')}`
}

async function createTrainer(token: string): Promise<TrainerResponse> {
  try {
    return await apiRequest<TrainerResponse>(
      'POST',
      `${API_BASE}/admin/trainers`,
      token,
      {
        firstName: 'Seed',
        lastName: 'Trainer',
        email: 'seed-trainer@gymflow.local',
      }
    )
  } catch (error) {
    const existing = await getTrainers(token, 'seed-trainer@gymflow.local')
    const trainer = existing.find((t) => t.email === 'seed-trainer@gymflow.local')
    if (trainer) return trainer
    throw error
  }
}

async function createRoom(token: string, name: string, capacity?: number): Promise<RoomResponse> {
  try {
    return await apiRequest<RoomResponse>('POST', `${API_BASE}/rooms`, token, {
      name,
      capacity,
    })
  } catch (error) {
    const rooms = await getRooms(token)
    const existing = rooms.find((room) => room.name === name)
    if (existing) return existing
    throw error
  }
}

async function createMembershipPlan(
  token: string,
  plan: MembershipPlanSeed
): Promise<MembershipPlanResponse> {
  try {
    return await apiRequest<MembershipPlanResponse>('POST', `${API_BASE}/membership-plans`, token, plan)
  } catch (error) {
    const existingPlans = await getMembershipPlans(token)
    const existingPlan = existingPlans.find((existing) => existing.name === plan.name)
    if (existingPlan) return existingPlan
    throw error
  }
}

async function cleanupExistingE2eData(token: string): Promise<void> {
  try {
    await apiRequest<E2eCleanupResponse>(
      'POST',
      `${API_BASE}/test-support/e2e/cleanup`,
      token,
      {
        emailPrefixes: ['e2e-member-', 'e2e-register-'],
        planPrefixes: ['E2E Seed ', 'E2E Plan '],
      }
    )
  } catch (error) {
    console.warn('E2E pre-run cleanup skipped', error)
  }
}

async function createInstance(
  token: string,
  payload: {
    templateId: string;
    name: string;
    scheduledAt: string;
    durationMin: number;
    capacity: number;
    roomId?: string | null;
    trainerIds: string[];
  }
): Promise<ClassInstanceResponse> {
  return apiRequest<ClassInstanceResponse>('POST', `${API_BASE}/admin/class-instances`, token, payload)
}

async function sweepNearbyInstances(token: string): Promise<void> {
  const deletedInstances = new Set<string>()
  const weekStart = getIsoWeekStartUtc(new Date())

  for (let offset = -INSTANCE_SWEEP_WEEKS; offset <= INSTANCE_SWEEP_WEEKS; offset++) {
    const d = new Date(weekStart)
    d.setUTCDate(d.getUTCDate() + offset * 7)
    const weekString = formatWeekString(d)
    const instances = await getWeekSchedule(token, weekString)
    for (const instance of instances) {
      if (deletedInstances.has(instance.id)) {
        continue
      }
      await deleteInstance(token, instance.id)
      deletedInstances.add(instance.id)
    }
  }
}

async function globalSetup() {
  const token = await login()
  await cleanupExistingE2eData(token)

  const membershipPlans = await getMembershipPlans(token)
  const planByName = new Map(membershipPlans.map((plan) => [plan.name, plan]))

  for (const requiredPlan of REQUIRED_MEMBERSHIP_PLANS) {
    if (!planByName.has(requiredPlan.name)) {
      const createdPlan = await createMembershipPlan(token, requiredPlan)
      planByName.set(createdPlan.name, createdPlan)
    }
  }

  const templates = await getTemplates(token)
  const templateByName = new Map(templates.map((t) => [t.name, t]))

  const requiredTemplates = [
    'HIIT Bootcamp',
    'Yoga Flow',
    'Spin Cycle',
    'Strength & Conditioning',
    'Pilates Core',
  ]

  for (const name of requiredTemplates) {
    if (!templateByName.has(name)) {
      throw new Error(`Missing required template: ${name}`)
    }
  }

  const rooms = await getRooms(token)
  const roomByName = new Map(rooms.map((r) => [r.name, r]))

  // ── Snapshot baseline (all IDs that exist before test data is created) ──
  const allTrainers = await getAllTrainers(token)
  const baseline = {
    trainerIds: allTrainers.map((t) => t.id),
    roomIds: rooms.map((r) => r.id),
    templateIds: templates.map((t) => t.id),
  }

  const studioA = roomByName.get('Studio A') ?? await createRoom(token, 'Studio A', 30)
  const studioB = roomByName.get('Studio B') ?? await createRoom(token, 'Studio B', 20)

  // Studio A and Studio B are part of the baseline if they existed, or just-created — add them
  if (!baseline.roomIds.includes(studioA.id)) baseline.roomIds.push(studioA.id)
  if (!baseline.roomIds.includes(studioB.id)) baseline.roomIds.push(studioB.id)

  const seedTrainer = await createTrainer(token)
  const seedRoom = await createRoom(token, 'SeedRoom-E2E', 10)

  await sweepNearbyInstances(token)

  const weekStart = getIsoWeekStartUtc(new Date())
  const instances: string[] = []

  const hiit = templateByName.get('HIIT Bootcamp')!
  const yoga = templateByName.get('Yoga Flow')!
  const spin = templateByName.get('Spin Cycle')!
  const strength = templateByName.get('Strength & Conditioning')!
  const pilates = templateByName.get('Pilates Core')!

  const instancePayloads = [
    // #1 HIIT Bootcamp — Monday 09:00 — trainer + Studio A
    {
      template: hiit,
      dayIndex: 0,
      time: '09:00',
      trainerIds: [seedTrainer.id],
      roomId: studioA.id,
    },
    // #2 Yoga Flow — Tuesday 10:00 — unassigned — Studio B
    {
      template: yoga,
      dayIndex: 1,
      time: '10:00',
      trainerIds: [],
      roomId: studioB.id,
    },
    // #3 Spin Cycle — Wednesday 09:00 — trainer + Studio B
    {
      template: spin,
      dayIndex: 2,
      time: '09:00',
      trainerIds: [seedTrainer.id],
      roomId: studioB.id,
    },
    // #4 Strength & Conditioning — Wednesday 09:00 — unassigned + Studio A (trainer conflict target)
    {
      template: strength,
      dayIndex: 2,
      time: '09:00',
      trainerIds: [],
      roomId: studioA.id,
    },
    // #5 Pilates Core — Thursday 11:00 — unassigned — Studio A (room conflict base)
    {
      template: pilates,
      dayIndex: 3,
      time: '11:00',
      trainerIds: [],
      roomId: studioA.id,
    },
    // #6 HIIT Bootcamp — Thursday 11:00 — unassigned — Studio A (room conflict)
    {
      template: hiit,
      dayIndex: 3,
      time: '11:00',
      trainerIds: [],
      roomId: studioA.id,
    },
    // SeedRoom-E2E assigned instance — Friday 12:00
    {
      template: hiit,
      dayIndex: 4,
      time: '12:00',
      trainerIds: [],
      roomId: seedRoom.id,
    },
  ]

  for (const payload of instancePayloads) {
    const scheduledAt = buildScheduledAt(weekStart, payload.dayIndex, payload.time)
    const created = await createInstance(token, {
      templateId: payload.template.id,
      name: payload.template.name,
      scheduledAt,
      durationMin: payload.template.defaultDurationMin,
      capacity: payload.template.defaultCapacity,
      roomId: payload.roomId,
      trainerIds: payload.trainerIds,
    })
    instances.push(created.id)
  }

  const seedData = {
    trainerId: seedTrainer.id,
    roomId: seedRoom.id,
    instanceIds: instances,
    baseline,
  }

  writeFileSync(SEED_FILE, JSON.stringify(seedData, null, 2))
}

export default globalSetup
