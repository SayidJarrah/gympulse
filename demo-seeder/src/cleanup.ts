import { pgPool, getTrackedIds, clearTracking } from './db';
import { MEMBERSHIP_PLANS } from './data/membershipPlans';

export interface CleanupResult {
  deletedClassInstances: number;
  deletedMemberships: number;
  deletedUsers: number;
  deletedTrainers: number;
  deletedRooms: number;
  deletedClassTemplates: number;
  deletedMembershipPlans: number;
  deletedQaUsers: number;
}

const SEEDED_ROOM_NAMES = [
  'Studio A',
  'Studio B',
  'Weight Room',
  'Functional Space',
  'Outdoor Terrace',
  'Recovery Suite',
];

const SEEDED_PLAN_IDS = MEMBERSHIP_PLANS.map((p) => p.id);

export async function runCleanup(): Promise<CleanupResult> {
  const { userIds, membershipIds, classInstanceIds } = getTrackedIds();

  const client = await pgPool.connect();
  let deletedClassInstances = 0;
  let deletedMemberships = 0;
  let deletedUsers = 0;
  let deletedTrainers = 0;
  let deletedRooms = 0;
  let deletedClassTemplates = 0;
  let deletedMembershipPlans = 0;
  let deletedQaUsers = 0;

  try {
    await client.query('BEGIN');

    // 0. Delete bookings referencing any demo class_instance or demo/QA user.
    //    bookings.class_id and bookings.user_id are ON DELETE RESTRICT, so they
    //    must be cleared before deleting class_instances or users.
    await client.query(
      `DELETE FROM bookings
        WHERE class_id = ANY($1::uuid[])
           OR class_id IN (
             SELECT id FROM class_instances
              WHERE template_id IN (SELECT id FROM class_templates WHERE is_seeded = TRUE)
           )
           OR user_id = ANY($2::uuid[])
           OR user_id IN (
             SELECT id FROM users
              WHERE email LIKE 'demo.%@gym.demo'
                 OR (email LIKE '%@gymflow.local' AND email != 'admin@gymflow.local')
           )`,
      [classInstanceIds, userIds],
    );

    // 1. Delete tracked demo class instances (cascades class_instance_trainers via ON DELETE CASCADE)
    if (classInstanceIds.length > 0) {
      const r = await client.query(
        'DELETE FROM class_instances WHERE id = ANY($1::uuid[])',
        [classInstanceIds],
      );
      deletedClassInstances = r.rowCount ?? 0;
    }

    // 2. Delete tracked demo memberships
    if (membershipIds.length > 0) {
      const r = await client.query(
        'DELETE FROM user_memberships WHERE id = ANY($1::uuid[])',
        [membershipIds],
      );
      deletedMemberships = r.rowCount ?? 0;
    }

    // 3. Delete tracked demo users (cascades user_profiles, user_trainer_favorites)
    if (userIds.length > 0) {
      const r = await client.query(
        'DELETE FROM users WHERE id = ANY($1::uuid[])',
        [userIds],
      );
      deletedUsers = r.rowCount ?? 0;
    }

    // 4. Safety-net: catch any untracked demo data (e.g. after a crash mid-run)
    await client.query(
      `DELETE FROM users WHERE email LIKE 'demo.%@gym.demo' AND deleted_at IS NULL`,
    );

    // 5. Delete any class instances referencing seeded templates
    //    (catches instances created outside the tracked session, or orphaned after crash)
    await client.query(
      `DELETE FROM class_instances
       WHERE template_id IN (SELECT id FROM class_templates WHERE is_seeded = TRUE)`,
    );

    // 6. Delete all seeded class templates
    const templatesRes = await client.query(
      `DELETE FROM class_templates WHERE is_seeded = TRUE`,
    );
    deletedClassTemplates = templatesRes.rowCount ?? 0;

    // 7. Delete trainers (class_instance_trainers already cleared by CASCADE from step 5;
    //    trainer FK on class_instance_trainers also has ON DELETE CASCADE)
    const trainersRes = await client.query(
      `DELETE FROM trainers WHERE email LIKE '%@gymflow.local' AND deleted_at IS NULL`,
    );
    deletedTrainers = trainersRes.rowCount ?? 0;

    // 8. Delete memberships referencing seeded plans
    //    (catches memberships for non-tracked users that used seeded plans)
    await client.query(
      `DELETE FROM user_memberships WHERE plan_id = ANY($1::uuid[])`,
      [SEEDED_PLAN_IDS],
    );

    // 9. Delete seeded membership plans
    const plansRes = await client.query(
      `DELETE FROM membership_plans WHERE id = ANY($1::uuid[])`,
      [SEEDED_PLAN_IDS],
    );
    deletedMembershipPlans = plansRes.rowCount ?? 0;

    // 10. Delete seeded rooms by name
    //     (rooms table has no is_seeded flag; names are the safe discriminator)
    const roomsRes = await client.query(
      `DELETE FROM rooms WHERE name = ANY($1)`,
      [SEEDED_ROOM_NAMES],
    );
    deletedRooms = roomsRes.rowCount ?? 0;

    // 11. Delete QA users (identified by @gymflow.local domain, excluding admin)
    const qaRes = await client.query(
      `DELETE FROM users WHERE email LIKE '%@gymflow.local' AND email != 'admin@gymflow.local'`,
    );
    deletedQaUsers = qaRes.rowCount ?? 0;

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  clearTracking();

  return {
    deletedClassInstances,
    deletedMemberships,
    deletedUsers,
    deletedTrainers,
    deletedRooms,
    deletedClassTemplates,
    deletedMembershipPlans,
    deletedQaUsers,
  };
}
