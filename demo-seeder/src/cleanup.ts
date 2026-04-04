import { pgPool, getTrackedIds, clearTracking } from './db';

export interface CleanupResult {
  deletedClassInstances: number;
  deletedMemberships: number;
  deletedUsers: number;
}

export async function runCleanup(): Promise<CleanupResult> {
  const { userIds, membershipIds, classInstanceIds } = getTrackedIds();

  const client = await pgPool.connect();
  let deletedClassInstances = 0;
  let deletedMemberships = 0;
  let deletedUsers = 0;

  try {
    await client.query('BEGIN');

    // 1. Delete demo class instances (cascades class_instance_trainers)
    if (classInstanceIds.length > 0) {
      const r = await client.query(
        'DELETE FROM class_instances WHERE id = ANY($1::uuid[])',
        [classInstanceIds],
      );
      deletedClassInstances = r.rowCount ?? 0;
    }

    // 2. Delete demo memberships
    if (membershipIds.length > 0) {
      const r = await client.query(
        'DELETE FROM user_memberships WHERE id = ANY($1::uuid[])',
        [membershipIds],
      );
      deletedMemberships = r.rowCount ?? 0;
    }

    // 3. Delete demo users (cascades user_profiles, user_trainer_favorites)
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

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  clearTracking();

  return { deletedClassInstances, deletedMemberships, deletedUsers };
}
