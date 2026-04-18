/* Trainer view — upcoming personal-training sessions for the logged-in trainer */

function TrainerSchedule() {
  // group by day label from .when ("Today · 2:00pm")
  const grouped = React.useMemo(() => {
    const g = {};
    TRAINER_SESSIONS.forEach(s => {
      const [day] = s.when.split(" · ");
      if (!g[day]) g[day] = [];
      g[day].push(s);
    });
    return g;
  }, []);

  const ptCount = TRAINER_SESSIONS.filter(s => s.type === "Personal training").length;
  const classCount = TRAINER_SESSIONS.filter(s => s.type === "Group class").length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 28, flexWrap: "wrap" }}>
        <div>
          <Eyebrow tone="primary">Trainer view · Priya Mendes</Eyebrow>
          <div style={{ marginTop: 10 }}>
            <DisplayTitle size={48}>Your upcoming week</DisplayTitle>
          </div>
          <div style={{ marginTop: 8, fontSize: 14, color: "var(--color-fg-muted)", maxWidth: 620 }}>
            Everything on your calendar — personal training you've been booked for, plus your group classes that block those slots.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          <StatTile big={ptCount} label="PT sessions" sub="Next 7 days" tone="primary" />
          <StatTile big={classCount} label="Group classes" sub="Next 7 days" tone="accent" />
          <StatTile big={ptCount + classCount} label="Total" sub="On the floor" tone="neutral" />
        </div>
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        {Object.entries(grouped).map(([day, sessions]) => (
          <div key={day} style={{
            display: "grid", gridTemplateColumns: "140px 1fr", gap: 20,
            alignItems: "flex-start",
          }}>
            <div style={{ position: "sticky", top: 20 }}>
              <div style={{
                fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700,
                color: "#fff", letterSpacing: "-0.01em", textTransform: "uppercase", lineHeight: 1,
              }}>{day}</div>
              <div style={{ marginTop: 4, fontSize: 11, color: "var(--color-fg-metadata)", letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 }}>
                {sessions.length} {sessions.length === 1 ? "item" : "items"}
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {sessions.map((s, i) => <SessionRow key={i} s={s} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatTile({ big, label, sub, tone }) {
  const color = tone === "primary" ? "var(--color-primary-light)" :
                tone === "accent"  ? "var(--color-accent-text)" :
                                     "#fff";
  return (
    <div style={{
      padding: "14px 20px",
      background: "rgba(255,255,255,0.02)",
      border: "1px solid var(--color-border-card)",
      borderRadius: 12, minWidth: 150,
      whiteSpace: "nowrap",
    }}>
      <div style={{
        fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 700,
        color, letterSpacing: "-0.01em", lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      }}>{big}</div>
      <div style={{ marginTop: 6, fontSize: 11, color: "var(--color-fg-metadata)", letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 2, fontSize: 11, color: "var(--color-fg-muted)" }}>{sub}</div>
    </div>
  );
}

function SessionRow({ s }) {
  const isPT = s.type === "Personal training";
  const accent = isPT ? "var(--color-primary)" : "var(--color-accent)";
  const time = s.when.split(" · ")[1] || s.when;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto",
      alignItems: "center", gap: 18,
      padding: "16px 20px",
      background: "rgba(255,255,255,0.02)",
      border: "1px solid var(--color-border-card)",
      borderLeft: `3px solid ${accent}`,
      borderRadius: 12,
      transition: "background 160ms ease",
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.035)"}
    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}>
      <div style={{
        fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700,
        color: "#fff", letterSpacing: "-0.01em", textTransform: "uppercase",
        minWidth: 110, fontVariantNumeric: "tabular-nums",
      }}>{time}</div>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>
            {isPT ? s.member : s.member.replace("Group class — ", "")}
          </div>
          {isPT ? <Pill tone="primary">PT · 1hr</Pill> : <Pill tone="accent">Class</Pill>}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-fg-muted)" }}>
          {s.room} · {s.note}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        {isPT ? (
          <>
            <button style={ptBtn.ghost}>Message</button>
            <button style={ptBtn.ghost}>Details</button>
          </>
        ) : (
          <button style={ptBtn.ghost}>Class page</button>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { TrainerSchedule });
