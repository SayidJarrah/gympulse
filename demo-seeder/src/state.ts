import { pgPool } from './db';
import { getTrackedIds, getDemoUsers, hasDemoData } from './db';

export interface DemoState {
  demoUsers: number;
  activeMemberships: number;
  classesThisWeek: number;
  totalClassInstances: number;
  hasData: boolean;
}

export async function getState(): Promise<DemoState> {
  const { classInstanceIds } = getTrackedIds();
  const users = getDemoUsers();

  const client = await pgPool.connect();
  try {
    const [membershipsRes, weekClassesRes] = await Promise.all([
      client.query<{ cnt: string }>(
        `SELECT COUNT(*) AS cnt
         FROM user_memberships um
         JOIN users u ON u.id = um.user_id
         WHERE u.email LIKE 'demo.%@gym.demo'
           AND um.status = 'ACTIVE'
           AND um.deleted_at IS NULL`,
      ),
      client.query<{ cnt: string }>(
        `SELECT COUNT(*) AS cnt
         FROM class_instances
         WHERE deleted_at IS NULL
           AND status = 'SCHEDULED'
           AND scheduled_at >= date_trunc('week', NOW() AT TIME ZONE 'UTC')
           AND scheduled_at <  date_trunc('week', NOW() AT TIME ZONE 'UTC') + interval '7 days'`,
      ),
    ]);

    return {
      demoUsers: users.length,
      activeMemberships: parseInt(membershipsRes.rows[0].cnt, 10),
      classesThisWeek: parseInt(weekClassesRes.rows[0].cnt, 10),
      totalClassInstances: classInstanceIds.length,
      hasData: hasDemoData(),
    };
  } finally {
    client.release();
  }
}
