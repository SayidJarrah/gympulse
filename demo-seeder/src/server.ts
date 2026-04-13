import express, { Request, Response } from 'express';
import path from 'path';
import { initSqlite, getDemoUsers, hasDemoData } from './db';
import { getState } from './state';
import { runCleanup } from './cleanup';
import { runSeeder, SeederConfig, Preset, PresetConfig, PRESET_CONFIG } from './seeder';

export type { Preset, PresetConfig };
export { PRESET_CONFIG };

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Generation state guard ──────────────────────────────────────────────────

let isGenerating = false;

// ── Health ──────────────────────────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// ── State ───────────────────────────────────────────────────────────────────

app.get('/api/state', async (_req: Request, res: Response) => {
  try {
    const state = await getState();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Credentials ─────────────────────────────────────────────────────────────

app.get('/api/credentials', (_req: Request, res: Response) => {
  res.json(getDemoUsers());
});

app.get('/api/credentials.csv', (_req: Request, res: Response) => {
  const users = getDemoUsers();
  const lines = ['email,password,membership_plan', ...users.map((u) => `${u.email},${process.env.DEMO_PASSWORD},${u.plan_name ?? ''}`)]
    .join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="demo-credentials.csv"');
  res.send(lines);
});

// ── Generate status ──────────────────────────────────────────────────────────

app.get('/api/generate/status', (_req: Request, res: Response) => {
  res.json({ running: isGenerating });
});

// ── Generate (SSE stream) ────────────────────────────────────────────────────

app.get('/api/generate/stream', async (req: Request, res: Response) => {
  if (isGenerating) {
    res.status(409).json({ error: 'Generation already in progress' });
    return;
  }

  // One-seed lock: prevent seeding on top of existing data
  if (hasDemoData()) {
    res.status(409).json({
      error: 'Demo data already exists. Run cleanup before seeding again.',
      code: 'DEMO_DATA_EXISTS',
    });
    return;
  }

  const presetParam = String(req.query.preset ?? 'medium');
  const preset: Preset = (presetParam === 'small' || presetParam === 'large') ? presetParam : 'medium';
  const presetConfig: PresetConfig = PRESET_CONFIG[preset];

  const config: SeederConfig = {
    preset,
    memberCount: presetConfig.memberCount,
    weekCount: presetConfig.weekCount,
    membershipPct: presetConfig.membershipPct,
    densityPct: presetConfig.densityPct,
  };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const emit = (type: string, payload: object): void => {
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
  };

  isGenerating = true;
  try {
    await runSeeder(config, emit);
  } catch (err) {
    emit('error', { message: String(err) });
  } finally {
    isGenerating = false;
    res.write('data: {"type":"stream_end"}\n\n');
    res.end();
  }
});

// ── Cleanup ──────────────────────────────────────────────────────────────────

app.post('/api/cleanup', async (_req: Request, res: Response) => {
  if (isGenerating) {
    res.status(409).json({ error: 'Cannot cleanup while generation is in progress' });
    return;
  }
  try {
    const result = await runCleanup();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Fallback to index.html ───────────────────────────────────────────────────

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Start ────────────────────────────────────────────────────────────────────

// ── Startup assertions ───────────────────────────────────────────────────────

const REQUIRED_ENV = ['DEMO_PASSWORD', 'DB_PASSWORD', 'ADMIN_TOKEN'] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Fatal: ${key} environment variable is required`);
    process.exit(1);
  }
}

initSqlite();

app.listen(PORT, () => {
  console.log(`Demo seeder running on http://localhost:${PORT}`);
});
