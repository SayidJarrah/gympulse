/* Shared primitives for the Personal Training feature. Pulse DNA. */

/* ---------- Time utilities ---------- */

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function dayIsWeekend(d) {
  const w = d.getDay(); // 0=Sun,6=Sat
  return w === 0 || w === 6;
}

function formatHour(h) {
  const suf = h >= 12 ? "pm" : "am";
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hh}:00${suf}`;
}

function formatDay(d) {
  const t = startOfToday();
  const diff = Math.round((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function shortDay(d) {
  const t = startOfToday();
  const diff = Math.round((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tom.";
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function dayNum(d) {
  return d.getDate();
}

/* Generates available slots per trainer for the next 14 days.
   - Uses gym open hours
   - Subtracts group class conflicts
   - Subtracts existing PT bookings
   - Excludes slots less than 24 hours from now
   Returns:  slots[dayOffset][hour] = "available" | "class" | "booked" | "past" | null  */
function buildAvailability(trainerId) {
  const now = new Date();
  const cutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const today = startOfToday();

  const classBlocks = new Set(
    GROUP_CLASSES.filter(r => r[0] === trainerId).map(r => `${r[1]}-${r[2]}`)
  );
  const ptBlocks = new Set(
    EXISTING_PT.filter(r => r[0] === trainerId).map(r => `${r[1]}-${r[2]}`)
  );

  const days = [];
  for (let i = 0; i < 14; i++) {
    const dayDate = addDays(today, i);
    const { open, close } = dayIsWeekend(dayDate) ? GYM_HOURS.weekend : GYM_HOURS.weekday;
    const slots = {};
    for (let h = open; h < close; h++) {
      const slotDate = new Date(dayDate);
      slotDate.setHours(h, 0, 0, 0);
      let status;
      if (classBlocks.has(`${i}-${h}`)) status = "class";
      else if (ptBlocks.has(`${i}-${h}`)) status = "booked";
      else if (slotDate < cutoff) status = "past";
      else status = "available";
      slots[h] = status;
    }
    days.push({ date: dayDate, dayOffset: i, slots, open, close });
  }
  return days;
}

/* ---------- Eyebrow / small label ---------- */
function Eyebrow({ children, tone = "muted", style = {} }) {
  const color = tone === "primary" ? "var(--color-primary-light)" :
                tone === "accent"  ? "var(--color-accent-text)"   :
                                     "var(--color-fg-metadata)";
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color,
      letterSpacing: "0.22em", textTransform: "uppercase",
      ...style,
    }}>{children}</div>
  );
}

/* ---------- Display title (Barlow Condensed uppercase) ---------- */
function DisplayTitle({ size = 56, children, style = {} }) {
  return (
    <h1 style={{
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: size, fontWeight: 700,
      color: "#fff", textTransform: "uppercase",
      letterSpacing: "-0.01em", lineHeight: 1,
      ...style,
    }}>{children}</h1>
  );
}

/* ---------- Chip / pill ---------- */
function Pill({ children, tone = "neutral", style = {} }) {
  const palette = {
    primary: { bg: "rgba(34,197,94,0.10)", bd: "var(--color-primary-border)", fg: "var(--color-primary-light)" },
    accent:  { bg: "rgba(249,115,22,0.10)", bd: "var(--color-accent-border)", fg: "var(--color-accent-text)" },
    danger:  { bg: "rgba(239,68,68,0.10)",  bd: "rgba(239,68,68,0.30)", fg: "#F87171" },
    info:    { bg: "rgba(59,130,246,0.10)", bd: "rgba(59,130,246,0.30)", fg: "#60A5FA" },
    neutral: { bg: "rgba(255,255,255,0.04)", bd: "rgba(255,255,255,0.10)", fg: "var(--color-fg-label)" },
  }[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px",
      background: palette.bg, border: `1px solid ${palette.bd}`,
      borderRadius: 999,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
      color: palette.fg, textTransform: "uppercase",
      ...style,
    }}>{children}</span>
  );
}

/* ---------- Primary / secondary / ghost button ---------- */
const ptBtn = {
  primary: {
    padding: "12px 18px",
    background: "var(--color-primary)", color: "#0F0F0F",
    border: "none", borderRadius: 10,
    fontSize: 13, fontWeight: 700, cursor: "pointer",
    boxShadow: "0 8px 24px rgba(34,197,94,0.3)",
    whiteSpace: "nowrap",
    letterSpacing: "0.01em",
  },
  secondary: {
    padding: "12px 18px",
    background: "transparent", color: "#fff",
    border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    whiteSpace: "nowrap",
  },
  ghost: {
    padding: "8px 14px",
    background: "transparent", color: "var(--color-fg-label)",
    border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8,
    fontSize: 12, fontWeight: 500, cursor: "pointer",
    whiteSpace: "nowrap",
  },
  danger: {
    padding: "10px 16px",
    background: "transparent", color: "#F87171",
    border: "1px solid rgba(239,68,68,0.30)", borderRadius: 10,
    fontSize: 13, fontWeight: 500, cursor: "pointer",
    whiteSpace: "nowrap",
  },
};

/* ---------- Card shell ---------- */
function Card({ children, style = {}, glow = false }) {
  return (
    <div style={{
      padding: 24,
      background: glow
        ? "linear-gradient(180deg, rgba(34,197,94,0.06), rgba(255,255,255,0.02) 70%)"
        : "rgba(255,255,255,0.02)",
      border: "1px solid var(--color-border-card)",
      borderRadius: 16,
      position: "relative",
      ...style,
    }}>{children}</div>
  );
}

/* ---------- Avatar (initial circle) ---------- */
function Avatar({ initial, accent = "#22C55E", size = 44, glow = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${accent}, ${shift(accent)})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.42, fontWeight: 700, color: "#0F0F0F",
      boxShadow: glow ? `0 8px 24px ${accent}40` : "none",
      flexShrink: 0,
    }}>{initial}</div>
  );
}

function shift(hex) {
  // very lightweight "lighter" variant by mixing toward white
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0,2), 16), g = parseInt(n.slice(2,4), 16), b = parseInt(n.slice(4,6), 16);
  const m = (v) => Math.min(255, Math.round(v + (255 - v) * 0.25)).toString(16).padStart(2, "0");
  return `#${m(r)}${m(g)}${m(b)}`;
}

/* ---------- Role switcher (segmented) ---------- */
function RoleSwitcher({ role, setRole }) {
  const items = [
    { id: "member",  label: "Member" },
    { id: "trainer", label: "Trainer" },
    { id: "admin",   label: "Admin" },
  ];
  return (
    <div style={{
      display: "inline-flex",
      padding: 4,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 999,
      gap: 2,
    }}>
      {items.map(it => {
        const active = role === it.id;
        return (
          <button key={it.id} onClick={() => setRole(it.id)} style={{
            padding: "6px 14px",
            background: active ? "var(--color-primary)" : "transparent",
            color: active ? "#0F0F0F" : "var(--color-fg-label)",
            border: "none", borderRadius: 999,
            fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer",
            letterSpacing: "0.02em",
          }}>{it.label}</button>
        );
      })}
    </div>
  );
}

/* ---------- Toast ---------- */
function Toast({ msg, onClose }) {
  React.useEffect(() => {
    if (!msg) return;
    const id = setTimeout(onClose, 2600);
    return () => clearTimeout(id);
  }, [msg]);
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      padding: "12px 20px",
      background: "rgba(15,15,15,0.95)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 12,
      fontSize: 13, color: "#fff", fontWeight: 500,
      boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
      zIndex: 1000, backdropFilter: "blur(12px)",
    }}>{msg}</div>
  );
}

Object.assign(window, {
  DAY_LABELS, startOfToday, addDays, dayIsWeekend, formatHour, formatDay, shortDay, dayNum,
  buildAvailability,
  Eyebrow, DisplayTitle, Pill, ptBtn, Card, Avatar, RoleSwitcher, Toast,
});
