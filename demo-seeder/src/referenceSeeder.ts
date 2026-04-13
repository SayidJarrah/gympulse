import { pgPool } from './db';
import { V13_ROOMS } from './data/rooms';
import { V13_CLASS_TEMPLATES } from './data/classTemplatesV13';
import { V17_CLASS_TEMPLATES } from './data/classTemplatesV17';
import { TRAINERS } from './data/trainers';
import { MEMBERSHIP_PLANS } from './data/membershipPlans';
import { QA_USERS, QA_PROFILES } from './data/qaUsers';
import type { EmitFn, PresetConfig } from './seeder';

// ── Photo fetch helper ────────────────────────────────────────────────────────

import fetch from 'node-fetch';

async function fetchPhoto(url: string): Promise<{ data: Buffer; mimeType: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const mimeType = contentType.split(';')[0].trim();
    const arrayBuffer = await res.arrayBuffer();
    return { data: Buffer.from(arrayBuffer), mimeType };
  } catch {
    return null;
  }
}

// ── Upsert helpers ────────────────────────────────────────────────────────────

async function upsertRooms(count: number): Promise<number> {
  const client = await pgPool.connect();
  try {
    for (const room of V13_ROOMS.slice(0, count)) {
      const photo = await fetchPhoto(room.imageUrl);
      await client.query(
        `INSERT INTO rooms (name, capacity, description, photo_data, photo_mime_type)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (name) DO UPDATE
           SET capacity        = EXCLUDED.capacity,
               description     = EXCLUDED.description,
               photo_data      = EXCLUDED.photo_data,
               photo_mime_type = EXCLUDED.photo_mime_type`,
        [room.name, room.capacity, room.description, photo?.data ?? null, photo?.mimeType ?? null],
      );
    }
    return count;
  } finally {
    client.release();
  }
}

async function upsertClassTemplatesV13(count: number): Promise<number> {
  const client = await pgPool.connect();
  try {
    for (const tpl of V13_CLASS_TEMPLATES.slice(0, count)) {
      const photo = await fetchPhoto(tpl.imageUrl);
      // V13 rows have no fixed UUID — let Postgres generate on insert;
      // on conflict the existing id is preserved (ON CONFLICT DO UPDATE
      // cannot update the conflict key).
      await client.query(
        `INSERT INTO class_templates
           (id, name, description, category, default_duration_min,
            default_capacity, difficulty, room_id, is_seeded,
            photo_data, photo_mime_type)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NULL, $7, $8, $9)
         ON CONFLICT (name) DO UPDATE
           SET description          = EXCLUDED.description,
               category             = EXCLUDED.category,
               default_duration_min = EXCLUDED.default_duration_min,
               default_capacity     = EXCLUDED.default_capacity,
               difficulty           = EXCLUDED.difficulty,
               is_seeded            = TRUE,
               photo_data           = EXCLUDED.photo_data,
               photo_mime_type      = EXCLUDED.photo_mime_type`,
        [
          tpl.name,
          tpl.description,
          tpl.category,
          tpl.defaultDurationMin,
          tpl.defaultCapacity,
          tpl.difficulty,
          tpl.isSeeded,
          photo?.data ?? null,
          photo?.mimeType ?? null,
        ],
      );
    }
    return count;
  } finally {
    client.release();
  }
}

async function upsertClassTemplatesV17(count: number): Promise<number> {
  if (count <= 0) return 0;
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    try {
      for (const tpl of V17_CLASS_TEMPLATES.slice(0, count)) {
        const photo = await fetchPhoto(tpl.imageUrl);

        // Both `id` and `name` are unique, so Postgres `ON CONFLICT` (which
        // supports only one constraint target) cannot cover both. Per SDD §3.2
        // the primary conflict key is `id` (fixed UUID), with `name` as
        // fallback. Mirror the trainer pattern: UPDATE by id OR name, then
        // INSERT only if neither exists.

        // Step 1: update existing rows (match by id OR name)
        await client.query(
          `UPDATE class_templates
             SET name                 = $2,
                 description          = $3,
                 category             = $4,
                 default_duration_min = $5,
                 default_capacity     = $6,
                 difficulty           = $7,
                 is_seeded            = TRUE,
                 photo_data           = $8,
                 photo_mime_type      = $9
           WHERE id = $1::uuid OR name = $2`,
          [
            tpl.id,
            tpl.name,
            tpl.description,
            tpl.category,
            tpl.defaultDurationMin,
            tpl.defaultCapacity,
            tpl.difficulty,
            photo?.data ?? null,
            photo?.mimeType ?? null,
          ],
        );

        // Step 2: insert if neither id nor name exists
        await client.query(
          `INSERT INTO class_templates
             (id, name, description, category, default_duration_min,
              default_capacity, difficulty, room_id, is_seeded,
              photo_data, photo_mime_type)
           SELECT $1::uuid, $2, $3, $4, $5, $6, $7, NULL, $8, $9, $10
           WHERE NOT EXISTS (
             SELECT 1 FROM class_templates WHERE id = $1::uuid OR name = $2::varchar
           )`,
          [
            tpl.id,
            tpl.name,
            tpl.description,
            tpl.category,
            tpl.defaultDurationMin,
            tpl.defaultCapacity,
            tpl.difficulty,
            tpl.isSeeded,
            photo?.data ?? null,
            photo?.mimeType ?? null,
          ],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
    return count;
  } finally {
    client.release();
  }
}

async function upsertTrainers(count: number): Promise<number> {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    try {
      for (const t of TRAINERS.slice(0, count)) {
        // Step 1: update existing rows (match by id OR email)
        await client.query(
          `UPDATE trainers
             SET first_name        = $2,
                 last_name         = $3,
                 email             = $4,
                 phone             = $5,
                 bio               = $6,
                 specialisations   = $7,
                 experience_years  = $8,
                 profile_photo_url = $9,
                 deleted_at        = NULL,
                 updated_at        = NOW()
           WHERE id = $1::uuid OR email = $4`,
          [
            t.id,
            t.firstName,
            t.lastName,
            t.email,
            t.phone,
            t.bio,
            t.specialisations,
            t.experienceYears,
            t.profilePhotoUrl,
          ],
        );

        // Step 2: insert if neither id nor email exists
        await client.query(
          `INSERT INTO trainers
             (id, first_name, last_name, email, phone, bio,
              specialisations, experience_years, profile_photo_url)
           SELECT $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9
           WHERE NOT EXISTS (
             SELECT 1 FROM trainers WHERE id = $1::uuid OR email = $4::varchar
           )`,
          [
            t.id,
            t.firstName,
            t.lastName,
            t.email,
            t.phone,
            t.bio,
            t.specialisations,
            t.experienceYears,
            t.profilePhotoUrl,
          ],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
    return count;
  } finally {
    client.release();
  }
}

async function upsertMembershipPlans(count: number): Promise<number> {
  const client = await pgPool.connect();
  try {
    for (const plan of MEMBERSHIP_PLANS.slice(0, count)) {
      await client.query(
        `INSERT INTO membership_plans
           (id, name, description, price_in_cents, duration_days,
            status, max_bookings_per_month)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE
           SET name                   = EXCLUDED.name,
               description            = EXCLUDED.description,
               price_in_cents         = EXCLUDED.price_in_cents,
               duration_days          = EXCLUDED.duration_days,
               status                 = EXCLUDED.status,
               max_bookings_per_month = EXCLUDED.max_bookings_per_month`,
        [
          plan.id,
          plan.name,
          plan.description,
          plan.priceInCents,
          plan.durationDays,
          plan.status,
          plan.maxBookingsPerMonth,
        ],
      );
    }
    return count;
  } finally {
    client.release();
  }
}

async function upsertQaUsersAndProfiles(): Promise<number> {
  const client = await pgPool.connect();
  try {
    // Users
    for (const u of QA_USERS) {
      await client.query(
        `INSERT INTO users (id, email, password_hash, role)
         VALUES ($1::uuid, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE
           SET password_hash = EXCLUDED.password_hash,
               role          = EXCLUDED.role,
               deleted_at    = NULL`,
        [u.id, u.email, u.passwordHash, u.role],
      );
    }

    // Profiles (resolve user_id by email join)
    for (const p of QA_PROFILES) {
      await client.query(
        `INSERT INTO user_profiles
           (user_id, first_name, last_name, phone,
            date_of_birth, fitness_goals, preferred_class_types)
         SELECT u.id, $2, $3, $4, $5::date, $6::jsonb, $7::jsonb
         FROM users u
         WHERE u.email = $1
         ON CONFLICT (user_id) DO UPDATE
           SET first_name            = EXCLUDED.first_name,
               last_name             = EXCLUDED.last_name,
               phone                 = EXCLUDED.phone,
               date_of_birth         = EXCLUDED.date_of_birth,
               fitness_goals         = EXCLUDED.fitness_goals,
               preferred_class_types = EXCLUDED.preferred_class_types,
               deleted_at            = NULL`,
        [
          p.email,
          p.firstName,
          p.lastName,
          p.phone,
          p.dateOfBirth,
          JSON.stringify(p.fitnessGoals),
          JSON.stringify(p.preferredClassTypes),
        ],
      );
    }

    return QA_USERS.length;
  } finally {
    client.release();
  }
}

// ── Orchestration ─────────────────────────────────────────────────────────────

export async function seedReferenceData(emit: EmitFn, presetConfig: PresetConfig): Promise<void> {
  emit('log', { message: 'Seeding reference data…' });

  try {
    const rooms = await upsertRooms(presetConfig.rooms);
    const v13 = await upsertClassTemplatesV13(5); // V13 always seeded in full
    const v17 = await upsertClassTemplatesV17(Math.max(0, presetConfig.classTemplates - 5));
    const trainers = await upsertTrainers(presetConfig.trainers);
    const plans = await upsertMembershipPlans(presetConfig.membershipPlans);
    const qaUsers = await upsertQaUsersAndProfiles();

    const templates = v13 + v17;
    emit('log', {
      message: `Reference data seeded: ${rooms} rooms, ${templates} templates, ${trainers} trainers, ${plans} plans, ${qaUsers} QA users`,
    });
  } catch (err) {
    emit('error', { message: `Reference data seeding failed: ${String(err)}` });
    throw err;
  }
}
