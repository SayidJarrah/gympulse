import express, { Request, Response } from 'express';
import path from 'path';
import { initSqlite, getDemoUsers, hasDemoData } from './db';
import { getState } from './state';
import { runCleanup } from './cleanup';
import { runSeeder, SeederConfig } from './seeder';

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
  const lines = ['email,password,membership_plan', ...users.map((u) => `${u.email},Demo@12345,${u.plan_name ?? ''}`)]
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

  const members = Math.min(50, Math.max(10, parseInt(String(req.query.members ?? '20'), 10)));
  const weeks = Math.min(4, Math.max(1, parseInt(String(req.query.weeks ?? '2'), 10)));
  const membershipPct = Math.min(100, Math.max(0, parseInt(String(req.query.membershipPct ?? '80'), 10)));
  const densityPct = Math.min(100, Math.max(10, parseInt(String(req.query.densityPct ?? '60'), 10)));

  const config: SeederConfig = { memberCount: members, weekCount: weeks, membershipPct, densityPct };

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

initSqlite();

app.listen(PORT, () => {
  console.log(`Demo seeder running on http://localhost:${PORT}`);
});
