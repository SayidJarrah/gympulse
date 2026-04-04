import { Pool } from 'pg';
import Database from 'better-sqlite3';
import path from 'path';

// ── Postgres ──────────────────────────────────────────────────────────────────

export const pgPool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432'),
  database: process.env.DB_NAME ?? 'gymflow',
  user: process.env.DB_USER ?? 'gymflow',
  password: process.env.DB_PASSWORD ?? 'secret',
  max: 10,
});

// ── SQLite session tracking ───────────────────────────────────────────────────

const DB_PATH = path.join(process.env.DATA_DIR ?? '/app/data', 'demo-session.db');

let _sqlite: Database.Database | null = null;

export function getSqlite(): Database.Database {
  if (!_sqlite) {
    _sqlite = new Database(DB_PATH);
  }
  return _sqlite;
}

export function initSqlite(): void {
  const db = getSqlite();
  db.exec(`
    CREATE TABLE IF NOT EXISTS seeder_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS demo_users (
      id         TEXT PRIMARY KEY,
      email      TEXT NOT NULL,
      first_name TEXT,
      last_name  TEXT,
      plan_name  TEXT
    );
    CREATE TABLE IF NOT EXISTS demo_memberships (
      id      TEXT PRIMARY KEY,
      user_id TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS demo_class_instances (
      id           TEXT PRIMARY KEY,
      scheduled_at TEXT NOT NULL
    );
  `);
}

// ── Tracking helpers ──────────────────────────────────────────────────────────

export function trackUser(
  id: string,
  email: string,
  firstName: string,
  lastName: string,
  planName?: string,
): void {
  getSqlite()
    .prepare(
      'INSERT OR REPLACE INTO demo_users (id, email, first_name, last_name, plan_name) VALUES (?, ?, ?, ?, ?)',
    )
    .run(id, email, firstName, lastName, planName ?? null);
}

export function updateUserPlan(id: string, planName: string): void {
  getSqlite().prepare('UPDATE demo_users SET plan_name = ? WHERE id = ?').run(planName, id);
}

export function trackMembership(id: string, userId: string): void {
  getSqlite()
    .prepare('INSERT OR REPLACE INTO demo_memberships (id, user_id) VALUES (?, ?)')
    .run(id, userId);
}

export function trackClassInstance(id: string, scheduledAt: string): void {
  getSqlite()
    .prepare('INSERT OR REPLACE INTO demo_class_instances (id, scheduled_at) VALUES (?, ?)')
    .run(id, scheduledAt);
}

export interface TrackedIds {
  userIds: string[];
  membershipIds: string[];
  classInstanceIds: string[];
}

export function getTrackedIds(): TrackedIds {
  const db = getSqlite();
  const userIds = (db.prepare('SELECT id FROM demo_users').all() as { id: string }[]).map(
    (r) => r.id,
  );
  const membershipIds = (
    db.prepare('SELECT id FROM demo_memberships').all() as { id: string }[]
  ).map((r) => r.id);
  const classInstanceIds = (
    db.prepare('SELECT id FROM demo_class_instances').all() as { id: string }[]
  ).map((r) => r.id);
  return { userIds, membershipIds, classInstanceIds };
}

export function getDemoUsers(): {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  plan_name: string | null;
}[] {
  return getSqlite().prepare('SELECT * FROM demo_users ORDER BY first_name, last_name').all() as {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    plan_name: string | null;
  }[];
}

export function hasDemoData(): boolean {
  const row = getSqlite()
    .prepare('SELECT COUNT(*) as cnt FROM demo_users')
    .get() as { cnt: number };
  return row.cnt > 0;
}

export function clearTracking(): void {
  const db = getSqlite();
  db.exec(
    'DELETE FROM demo_users; DELETE FROM demo_memberships; DELETE FROM demo_class_instances; DELETE FROM seeder_meta;',
  );
}

export function setMeta(key: string, value: string): void {
  getSqlite()
    .prepare('INSERT OR REPLACE INTO seeder_meta (key, value) VALUES (?, ?)')
    .run(key, value);
}

export function getMeta(key: string): string | null {
  const row = getSqlite()
    .prepare('SELECT value FROM seeder_meta WHERE key = ?')
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}
