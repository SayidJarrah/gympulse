import { v4 as uuidv4 } from 'uuid';
import { faker } from '@faker-js/faker';
import fetch from 'node-fetch';
import { pgPool, trackUser, trackMembership, trackClassInstance, updateUserPlan, setMeta } from './db';
import { FITNESS_GOALS, CLASS_TYPE_PREFERENCES, pickRandom, randomBetween } from './data/personas';
import { buildSlotDates, SLOT_QUALIFIERS } from './data/schedule';
import { seedReferenceData } from './referenceSeeder';

const API_URL = process.env.GYMFLOW_API_URL ?? 'http://localhost:8080/api/v1';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD!;

export type Preset = 'small' | 'medium' | 'large';

export interface PresetConfig {
  rooms: number;
  trainers: number;
  classTemplates: number;
  membershipPlans: number;
  memberCount: number;
  weekCount: number;
  membershipPct: number;
  densityPct: number;
}

export const PRESET_CONFIG: Record<Preset, PresetConfig> = {
  small:  { rooms: 2, trainers: 3, classTemplates: 5,  membershipPlans: 3,  memberCount: 10, weekCount: 1, membershipPct: 50, densityPct: 30 },
  medium: { rooms: 4, trainers: 6, classTemplates: 10, membershipPlans: 6,  memberCount: 25, weekCount: 2, membershipPct: 80, densityPct: 60 },
  large:  { rooms: 6, trainers: 10, classTemplates: 15, membershipPlans: 10, memberCount: 50, weekCount: 4, membershipPct: 90, densityPct: 90 },
};

export interface SeederConfig {
  preset: Preset;
  memberCount: number;
  weekCount: number;
  membershipPct: number;
  densityPct: number;
}

export type EmitFn = (type: string, payload: object) => void;

// ── Reference data ─────────────────────────────────────────────────────────

interface RefData {
  roomIds: string[];
  templates: { id: string; name: string; defaultDurationMin: number; defaultCapacity: number }[];
  trainerIds: string[];
  planIds: { id: string; name: string }[];
}

async function loadReferenceData(): Promise<RefData> {
  const client = await pgPool.connect();
  try {
    const [rooms, templates, trainers, plans] = await Promise.all([
      client.query<{ id: string }>('SELECT id FROM rooms ORDER BY name'),
      client.query<{ id: string; name: string; default_duration_min: number; default_capacity: number }>(
        'SELECT id, name, default_duration_min, default_capacity FROM class_templates WHERE is_seeded = TRUE ORDER BY name',
      ),
      client.query<{ id: string }>(
        `SELECT id FROM trainers WHERE deleted_at IS NULL AND email LIKE '%@gymflow.local' ORDER BY last_name`,
      ),
      client.query<{ id: string; name: string }>(
        `SELECT id, name FROM membership_plans WHERE status = 'ACTIVE' ORDER BY price_in_cents`,
      ),
    ]);

    return {
      roomIds: rooms.rows.map((r) => r.id),
      templates: templates.rows.map((r) => ({
        id: r.id,
        name: r.name,
        defaultDurationMin: r.default_duration_min,
        defaultCapacity: r.default_capacity,
      })),
      trainerIds: trainers.rows.map((r) => r.id),
      planIds: plans.rows.map((r) => ({ id: r.id, name: r.name })),
    };
  } finally {
    client.release();
  }
}

// ── Avatar helper ──────────────────────────────────────────────────────────

async function fetchAvatar(seed: string): Promise<{ data: Buffer; mimeType: string } | null> {
  try {
    const url = `https://i.pravatar.cc/150?u=${encodeURIComponent(seed)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return { data: Buffer.from(arrayBuffer), mimeType: 'image/jpeg' };
  } catch {
    return null;
  }
}

// ── User registration ──────────────────────────────────────────────────────

interface RegisteredUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

async function registerUsers(count: number, emit: EmitFn): Promise<RegisteredUser[]> {
  const usedEmails = new Set<string>();
  const registered: RegisteredUser[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName().slice(0, 50);
    const lastName = faker.person.lastName().slice(0, 50);

    // Build unique email
    let baseEmail = `demo.${firstName.toLowerCase().replace(/[^a-z]/g, '')}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}@gym.demo`;
    let email = baseEmail;
    let counter = 2;
    while (usedEmails.has(email)) {
      email = baseEmail.replace('@gym.demo', `${counter}@gym.demo`);
      counter++;
    }
    usedEmails.add(email);

    // Register via REST API (ensures bcrypt hash)
    let userId: string;
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: DEMO_PASSWORD }),
      });

      if (res.status === 409) {
        // Already exists from a previous un-cleaned run — retrieve existing user
        emit('warning', { message: `User ${email} already exists, skipping registration` });
        // Still track it via email lookup so cleanup works
        const client = await pgPool.connect();
        try {
          const row = await client.query<{ id: string }>(
            `SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL`,
            [email],
          );
          if (row.rows.length > 0) {
            userId = row.rows[0].id;
          } else {
            continue;
          }
        } finally {
          client.release();
        }
      } else if (!res.ok) {
        const body = await res.text();
        emit('warning', { message: `Failed to register ${email}: ${res.status} ${body}` });
        continue;
      } else {
        const data = (await res.json()) as { id: string };
        userId = data.id;
      }
    } catch (err) {
      emit('warning', { message: `Network error registering ${email}: ${String(err)}` });
      continue;
    }

    // Insert user profile directly
    const dob = faker.date.birthdate({ min: 22, max: 55, mode: 'age' });
    const goals = pickRandom(FITNESS_GOALS, 2, 4);
    const classTypes = pickRandom(CLASS_TYPE_PREFERENCES, 2, 3);
    const avatar = await fetchAvatar(email);

    const client = await pgPool.connect();
    try {
      await client.query(
        `INSERT INTO user_profiles (user_id, first_name, last_name, date_of_birth, fitness_goals, preferred_class_types, profile_photo_data, profile_photo_mime_type)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)
         ON CONFLICT (user_id) DO UPDATE
           SET first_name             = EXCLUDED.first_name,
               last_name              = EXCLUDED.last_name,
               profile_photo_data     = EXCLUDED.profile_photo_data,
               profile_photo_mime_type = EXCLUDED.profile_photo_mime_type`,
        [userId, firstName, lastName, dob.toISOString().slice(0, 10), JSON.stringify(goals), JSON.stringify(classTypes), avatar?.data ?? null, avatar?.mimeType ?? null],
      );
    } finally {
      client.release();
    }

    trackUser(userId, email, firstName, lastName);
    registered.push({ id: userId, email, firstName, lastName });

    emit('progress', { step: 'users', current: registered.length, total: count });
  }

  return registered;
}

// ── Membership creation ────────────────────────────────────────────────────

async function createMemberships(
  users: RegisteredUser[],
  membershipPct: number,
  planIds: { id: string; name: string }[],
  emit: EmitFn,
): Promise<void> {
  const count = Math.floor(users.length * membershipPct / 100);
  const shuffled = [...users].sort(() => Math.random() - 0.5).slice(0, count);

  for (let i = 0; i < shuffled.length; i++) {
    const user = shuffled[i];
    const plan = planIds[Math.floor(Math.random() * planIds.length)];

    try {
      // Login as this user to get USER JWT
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: DEMO_PASSWORD }),
      });

      if (!loginRes.ok) {
        emit('warning', { message: `Cannot login as ${user.email}, skipping membership` });
        continue;
      }

      const { accessToken } = (await loginRes.json()) as { accessToken: string };

      // Purchase membership
      const memberRes = await fetch(`${API_URL}/memberships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ planId: plan.id }),
      });

      if (!memberRes.ok) {
        const body = await memberRes.text();
        emit('warning', { message: `Membership failed for ${user.email}: ${memberRes.status} ${body}` });
        continue;
      }

      const membership = (await memberRes.json()) as { id: string };
      trackMembership(membership.id, user.id);
      updateUserPlan(user.id, plan.name);
    } catch (err) {
      emit('warning', { message: `Error creating membership for ${user.email}: ${String(err)}` });
    }

    emit('progress', { step: 'memberships', current: i + 1, total: shuffled.length });
  }
}

// ── Class instance creation ────────────────────────────────────────────────

interface TimeRange {
  start: Date;
  end: Date;
}

function isTrainerFree(occupancy: Map<string, TimeRange[]>, trainerId: string, start: Date, durationMin: number): boolean {
  const end = new Date(start.getTime() + durationMin * 60_000);
  const slots = occupancy.get(trainerId) ?? [];
  return !slots.some((s) => start < s.end && end > s.start);
}

function markTrainerBusy(occupancy: Map<string, TimeRange[]>, trainerId: string, start: Date, durationMin: number): void {
  const end = new Date(start.getTime() + durationMin * 60_000);
  const slots = occupancy.get(trainerId) ?? [];
  slots.push({ start, end });
  occupancy.set(trainerId, slots);
}

async function createClassInstances(
  ref: RefData,
  weekCount: number,
  densityPct: number,
  emit: EmitFn,
): Promise<void> {
  const slots = buildSlotDates(weekCount, densityPct);
  const trainerOccupancy = new Map<string, TimeRange[]>();

  // Prepare batch arrays
  const instanceRows: {
    id: string;
    templateIdx: number;
    name: string;
    scheduledAt: string;
    durationMin: number;
    capacity: number;
    roomId: string;
  }[] = [];

  const trainerAssignments: { instanceId: string; trainerId: string }[] = [];

  for (let i = 0; i < slots.length; i++) {
    const slotDate = slots[i];
    const template = ref.templates[i % ref.templates.length];
    const roomId = ref.roomIds[i % ref.roomIds.length];
    const qualifier = SLOT_QUALIFIERS[slotDate.getUTCHours()] ?? 'Evening';
    const instanceName = `${qualifier} ${template.name}`;

    // Assign 1–2 free trainers
    const shuffledTrainers = [...ref.trainerIds].sort(() => Math.random() - 0.5);
    const assignCount = randomBetween(1, Math.min(2, ref.trainerIds.length));
    const assignedTrainers: string[] = [];

    for (const tid of shuffledTrainers) {
      if (assignedTrainers.length >= assignCount) break;
      if (isTrainerFree(trainerOccupancy, tid, slotDate, template.defaultDurationMin)) {
        assignedTrainers.push(tid);
        markTrainerBusy(trainerOccupancy, tid, slotDate, template.defaultDurationMin);
      }
    }

    // Fall back to first trainer if none free (edge case with very dense schedule)
    if (assignedTrainers.length === 0 && ref.trainerIds.length > 0) {
      const fallback = shuffledTrainers[0];
      assignedTrainers.push(fallback);
      markTrainerBusy(trainerOccupancy, fallback, slotDate, template.defaultDurationMin);
    }

    const instanceId = uuidv4();
    instanceRows.push({
      id: instanceId,
      templateIdx: i,
      name: instanceName,
      scheduledAt: slotDate.toISOString(),
      durationMin: template.defaultDurationMin,
      capacity: template.defaultCapacity,
      roomId,
    });

    for (const tid of assignedTrainers) {
      trainerAssignments.push({ instanceId, trainerId: tid });
    }
  }

  // Batch insert class_instances (20 rows at a time)
  const BATCH_SIZE = 20;
  for (let start = 0; start < instanceRows.length; start += BATCH_SIZE) {
    const batch = instanceRows.slice(start, start + BATCH_SIZE);
    const client = await pgPool.connect();
    try {
      // Build parameterised INSERT
      const valuePlaceholders = batch.map((_, j) => {
        const base = j * 8;
        return `($${base + 1}::uuid, $${base + 2}::uuid, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}::timestamptz, $${base + 7}, $${base + 8}::uuid)`;
      });
      const values = batch.flatMap((row) => [
        row.id,
        ref.templates[row.templateIdx % ref.templates.length].id,
        row.name,
        'GROUP',
        row.capacity,
        row.scheduledAt,
        row.durationMin,
        row.roomId,
      ]);

      await client.query(
        `INSERT INTO class_instances (id, template_id, name, type, capacity, scheduled_at, duration_min, room_id)
         VALUES ${valuePlaceholders.join(', ')}
         ON CONFLICT (id) DO NOTHING`,
        values,
      );
    } finally {
      client.release();
    }

    batch.forEach((row) => trackClassInstance(row.id, row.scheduledAt));
    emit('progress', {
      step: 'classes',
      current: Math.min(start + BATCH_SIZE, instanceRows.length),
      total: instanceRows.length,
    });
  }

  // Batch insert trainer assignments
  for (let start = 0; start < trainerAssignments.length; start += BATCH_SIZE) {
    const batch = trainerAssignments.slice(start, start + BATCH_SIZE);
    const client = await pgPool.connect();
    try {
      const valuePlaceholders = batch.map((_, j) => `($${j * 2 + 1}::uuid, $${j * 2 + 2}::uuid)`);
      const values = batch.flatMap((a) => [a.instanceId, a.trainerId]);
      await client.query(
        `INSERT INTO class_instance_trainers (class_instance_id, trainer_id)
         VALUES ${valuePlaceholders.join(', ')}
         ON CONFLICT DO NOTHING`,
        values,
      );
    } finally {
      client.release();
    }
  }
}

// ── Main entry ─────────────────────────────────────────────────────────────

export async function runSeeder(config: SeederConfig, emit: EmitFn): Promise<void> {
  const sessionId = uuidv4();
  setMeta('session_id', sessionId);
  setMeta('generated_at', new Date().toISOString());
  setMeta('config', JSON.stringify(config));

  const presetConfig = PRESET_CONFIG[config.preset];
  emit('start', { sessionId, config: { ...config, ...presetConfig } });

  // Reference phase — always-on. Must complete before loadReferenceData()
  // so that Phase 1+ have the prerequisites they require.
  await seedReferenceData(emit, PRESET_CONFIG[config.preset]);

  emit('log', { message: 'Loading reference data…' });
  const ref = await loadReferenceData();

  if (ref.templates.length === 0) {
    emit('error', { message: 'No seeded class templates found. Ensure Flyway migrations have run.' });
    return;
  }
  if (ref.trainerIds.length === 0) {
    emit('error', { message: 'No seeded trainers found. Ensure Flyway migrations have run.' });
    return;
  }

  emit('log', { message: `Registering ${config.memberCount} demo users…` });
  const users = await registerUsers(config.memberCount, emit);

  const membershipCount = Math.floor(users.length * config.membershipPct / 100);
  emit('log', { message: `Creating ${membershipCount} memberships…` });
  await createMemberships(users, config.membershipPct, ref.planIds, emit);

  emit('log', { message: `Building ${config.weekCount}-week schedule at ${config.densityPct}% density…` });
  await createClassInstances(ref, config.weekCount, config.densityPct, emit);

  emit('done', {
    users: users.length,
    memberships: membershipCount,
    sessionId,
  });
}
