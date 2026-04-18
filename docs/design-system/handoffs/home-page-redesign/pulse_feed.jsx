/* Pulse — activity feed (shared across all states) */

const FEED_AUTH = [
  { t: "now", k: "checkin", who: "Noah B.", what: "checked in" },
  { t: "1m", k: "booking", who: "Mia T.", what: "booked Power Vinyasa" },
  { t: "2m", k: "pr", who: "Ari L.", what: "logged a deadlift PR — 285lb" },
  { t: "3m", k: "class", who: "HIIT 45", what: "11 / 16 spots filled" },
  { t: "4m", k: "checkin", who: "Jordan K.", what: "checked in" },
  { t: "5m", k: "booking", who: "Priya M.", what: "booked Mobility tomorrow" },
  { t: "6m", k: "pr", who: "Dana R.", what: "logged a 5k run — 22:14" },
  { t: "7m", k: "class", who: "Oly Lifting", what: "5 / 8 spots filled" },
];

const FEED_PUBLIC = [
  { t: "now", k: "checkin", who: "A member", what: "checked in" },
  { t: "1m", k: "booking", who: "A member", what: "booked Power Vinyasa" },
  { t: "2m", k: "class", who: "HIIT 45", what: "11 / 16 spots filled" },
  { t: "4m", k: "pr", who: "A member", what: "logged a deadlift PR" },
  { t: "5m", k: "class", who: "Strength", what: "7 / 10 spots filled" },
  { t: "7m", k: "checkin", who: "A member", what: "checked in" },
  { t: "9m", k: "booking", who: "A member", what: "booked Mobility" },
  { t: "11m", k: "class", who: "Oly Lifting", what: "5 / 8 spots filled" },
];

/* Club-level only — no personal names. Used on member Home. */
const FEED_CLUB = [
  { t: "now", k: "class", who: "HIIT 45", what: "starts in 20 min · 3 spots left" },
  { t: "2m", k: "class", who: "Power Vinyasa", what: "11 / 16 spots filled" },
  { t: "4m", k: "booking", who: "Strength Foundations", what: "2 new bookings" },
  { t: "6m", k: "class", who: "Mobility", what: "sold out · waitlist open" },
  { t: "9m", k: "class", who: "Open gym floor", what: "23 members in" },
  { t: "12m", k: "booking", who: "Oly Lifting", what: "Fri 6pm filling fast" },
  { t: "18m", k: "class", who: "Yoga Sculpt", what: "added · Sat 9am" },
  { t: "24m", k: "class", who: "Sunrise Run", what: "5 / 12 spots" },
];

function FeedDot({ k }) {
  const colors = {
    checkin: "var(--color-primary)",
    booking: "var(--color-accent)",
    pr: "#FDBA74",
    class: "#60A5FA",
  };
  return (
    <span style={{
      width: 8, height: 8, borderRadius: "50%",
      background: colors[k] || "#fff",
      boxShadow: `0 0 12px ${colors[k]}`,
      flexShrink: 0,
    }} />
  );
}

function ActivityFeed({ mode }) {
  const items = mode === "loggedOut" ? FEED_PUBLIC
    : mode === "club" ? FEED_CLUB
    : FEED_AUTH;
  const [feedOffset, setFeedOffset] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setFeedOffset(o => o + 1), 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      padding: "24px 24px 8px", background: "rgba(255,255,255,0.02)",
      border: "1px solid var(--color-border-card)", borderRadius: 16,
      maxHeight: 460, overflow: "hidden", position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-metadata)", letterSpacing: "0.22em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          {mode === "loggedOut" ? "Live at the club" : mode === "club" ? "At the club" : "Activity"}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-primary-light)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary)", animation: "pulse-dot 1.6s ease-in-out infinite" }} />
          Live
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((item, i) => {
          const active = i === (feedOffset % items.length);
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 4px",
              borderBottom: i < items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              opacity: active ? 1 : 0.55,
              transition: "opacity 400ms ease",
            }}>
              <FeedDot k={item.k} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>
                  <span style={{ fontWeight: 600 }}>{item.who}</span>{" "}
                  <span style={{ color: "var(--color-fg-muted)" }}>{item.what}</span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "var(--color-fg-metadata)", fontVariantNumeric: "tabular-nums" }}>{item.t}</div>
            </div>
          );
        })}
      </div>
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
        background: "linear-gradient(180deg, transparent, var(--color-bg-page))",
        pointerEvents: "none",
      }} />
    </div>
  );
}

function StatsStrip({ mode }) {
  const stats = mode === "loggedOut"
    ? [
        { n: "1,200+", l: "Members" },
        { n: "12", l: "Classes today" },
        { n: "8", l: "Coaches" },
      ]
    : [
        { n: "47", l: "On the floor" },
        { n: "12", l: "Classes today" },
        { n: "3", l: "Spots left · HIIT" },
      ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
      {stats.map(s => (
        <div key={s.l} style={{
          padding: 14, background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--color-border-card)", borderRadius: 12,
        }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{s.n}</div>
          <div style={{ marginTop: 6, fontSize: 10, color: "var(--color-fg-metadata)", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600 }}>{s.l}</div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { ActivityFeed, StatsStrip, FeedDot });
