# Agent Setup Audit — GymPulse

Date: 2026-04-24
Scope: CLAUDE.md, .claude/{agents,skills,commands,settings.json}, .mcp.json, .agents/, docs/lessons.md, docs/superpowers/

---

## TL;DR

Сетап робочий, але переріс. Найсерйозніші проблеми:

1. **`.agents/skills/` — мертва директорія зі стейл-копіями скілів**, одна з яких прямо суперечить активній версії (`@GeneratedValue` vs «no @GeneratedValue»). Треба видалити цілком.
2. **CLAUDE.md — 193 рядки + 109 рядків `lessons.md` = ~300 рядків на кожен старт сесії.** Приблизно 40% — процедурне знання, яке мусить жити в скілах (Demo Seeder rules, Design System overview, Worktree Workflow).
3. **`run.md` — команда-монстр на 205 рядків з усією логікою inline**, тоді як `brief`/`deliver`/`fix-tests` — тонкі обгортки з логікою в скілах. Непослідовність.
4. **Троїсте дублювання правил дизайн-системи**: CLAUDE.md §«Design System» ↔ `designer.md` Hard Rules ↔ `design-standards/SKILL.md`. Три майже ідентичні списки, які дрейфуватимуть.
5. **Дублювання reviewer output + blocker criteria** між `reviewer.md` і `deliver/SKILL.md` — уже з дрейфом (критерій «SDD Hygiene» є тільки в одному з двох).
6. **Описи скілів `brief`/`deliver`/`fix-tests` починаються з «Loaded by the /X command»** — це тавтологія, яка не дає Claude автотригер. Треба description, що описує *коли викликати*, а не *ким викликається*.
7. **Відсутнє: `seeder-upkeep` скіл, auto-enforce гачки (Lesson 3/12), відсутня консолідація `lessons.md`** (правило — раз на 10 уроків, а зараз 16).

---

## Phase 1 — Inventory

### 1.1 CLAUDE.md (root, 193 рядки) — єдиний

Імпорт: `@docs/lessons.md` (+109 рядків → ~300 на старт сесії).

Секції:

| # | Секція | Рядки | Примітка |
|---|---|---|---|
| 1 | Stack | 5–10 | OK, коротко |
| 2 | Project Structure | 12–45 | ASCII tree — старіє, не згадує `docs/briefs/`, `docs/superpowers/`, `docs/backlog/` |
| 3 | Testing | 47–61 | Дублює `run.md` і `tester.md` |
| 4 | SDD Hygiene — Non-Negotiable | 63–64 | 1 абзац — OK на цьому рівні |
| 5 | Demo Seeder — Non-Negotiable | 66–91 | 25 рядків таблиця + 4 правила — **процедурне знання, просить скіл** |
| 6 | Design System — Source of Truth | 93–127 | 35 рядків — **масивне дублювання** з `designer.md` і `design-standards` |
| 7 | Git Rules + Worktree Workflow | 129–149 | Дублюється в `deliver`/`fix-tests` (абсолютні шляхи) |
| 8 | Security Rules | 151–157 | 6 рядків — OK |
| 9 | MCP Servers | 159–164 | 3 рядки — OK, але `figma` є в `.mcp.json` і не згаданий |
| 10 | Commands | 166–178 | Дублює `.claude/commands/` + `/help` |
| 11 | API Conventions | 180–184 | OK |
| 12 | Environment Variables | 186–193 | Дублює `.env.example` (який існує) |

### 1.2 Agents (6, у `.claude/agents/`)

| Агент | Рядки | Model | MCP | Роль |
|---|---|---|---|---|
| `business-analyst` | 73 | sonnet | — | Brief → PRD |
| `solution-architect` | 113 | opus | postgres | PRD + handoff → SDD; bug escalation |
| `designer` | **220** | sonnet | — | Fallback-автор handoff-пакетів |
| `developer` | 68 | sonnet | — | Backend+frontend implementation |
| `reviewer` | 90 | opus | — | Code/design/domain review |
| `tester` | 75 | sonnet | playwright | E2E specs + runs |

### 1.3 Skills (6, у `.claude/skills/`)

| Скіл | Рядки | Опис-тригер оцінка |
|---|---|---|
| `brief` | 63 | Погано — тавтологія |
| `deliver` | **428** | Погано — тавтологія + гігантський |
| `design-standards` | 223 | Добре |
| `fix-tests` | 244 | Середньо — є «do NOT use» але тавтологія на початку |
| `kotlin-conventions` | 73 | Добре |
| `react-conventions` | 123 | Добре |

### 1.4 Commands (4, у `.claude/commands/`)

| Команда | Рядки | Pattern |
|---|---|---|
| `brief` | 4 | Тонка обгортка → скіл |
| `deliver` | 17 | Тонка обгортка + парсинг mode |
| `fix-tests` | 19 | Тонка обгортка + парсинг flags |
| `run` | **205** | **АНОМАЛІЯ** — вся логіка inline, немає відповідного скіла |

### 1.5 Інші конфіги

- **`.claude/settings.json`** (35 рядків): `defaultMode: acceptEdits`, `tmuxSplitPanes: true`, experimental `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, 14 permissions.allow + 6 .deny. Хуків **нема**.
- **`.mcp.json`**: 4 MCP сервери (`postgres`, `github`, `playwright`, `figma`). `figma` не згаданий у CLAUDE.md.
- **`.agents/skills/`** (3 файли, ~60 рядків): `gymflow-domain` (DEPRECATED стікер), `react-conventions` (stale «GymFlow» версія), `kotlin-conventions` (stale — `@GeneratedValue` суперечить активному). **Нічого не посилається на `.agents/`.**
- **`docs/lessons.md`**: 16 уроків, 109 рядків. Правило «After every 10 new lessons, consolidate similar ones» — **порушено** (уроків 16).
- **`docs/superpowers/plans/2026-04-11-demo-seeder-documentation.md`**: посилається на зовнішній `superpowers:` фреймворк, який у `deliver/SKILL.md` явно заборонений («Never use `superpowers:code-reviewer`»). Стейл.
