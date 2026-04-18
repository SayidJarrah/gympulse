/* Admin view — all PT sessions across trainers and members, with filters */

function AdminSessions() {
  const [filterTrainer, setFilterTrainer] = React.useState("All");
  const [filterStatus, setFilterStatus] = React.useState("All");
  const [q, setQ] = React.useState("");

  const trainerOptions = React.useMemo(() => {
    return ["All", ...Array.from(new Set(ADMIN_SESSIONS.map(s => s.trainer)))];
  }, []);

  const rows = ADMIN_SESSIONS.filter(s => {
    if (filterTrainer !== "All" && s.trainer !== filterTrainer) return false;
    if (filterStatus === "Active" && s.status !== "confirmed") return false;
    if (filterStatus === "Cancelled" && s.status !== "cancelled") return false;
    if (q) {
      const hay = `${s.trainer} ${s.member} ${s.room} ${s.when}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const totalActive = ADMIN_SESSIONS.filter(s => s.status === "confirmed").length;
  const totalCancelled = ADMIN_SESSIONS.filter(s => s.status === "cancelled").length;
  const uniqueMembers = new Set(ADMIN_SESSIONS.filter(s => s.status === "confirmed").map(s => s.member)).size;
  const uniqueTrainers = new Set(ADMIN_SESSIONS.filter(s => s.status === "confirmed").map(s => s.trainer)).size;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Eyebrow tone="primary">Admin view · Operations</Eyebrow>
        <div style={{ marginTop: 10 }}>
          <DisplayTitle size={48}>All personal training sessions</DisplayTitle>
        </div>
        <div style={{ marginTop: 8, fontSize: 14, color: "var(--color-fg-muted)", maxWidth: 680 }}>
          Every one-on-one booked across the club. Filter by trainer or status, search by member name.
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22 }}>
        <AdminStat big={totalActive} label="Active bookings" sub="Next 7 days" tone="primary" />
        <AdminStat big={uniqueMembers} label="Members booking" sub="This week" tone="neutral" />
        <AdminStat big={uniqueTrainers} label="Trainers in play" sub="This week" tone="neutral" />
        <AdminStat big={totalCancelled} label="Cancellations" sub="This week" tone="danger" />
      </div>

      {/* Filters row */}
      <div style={{
        display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
        padding: 14,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--color-border-card)",
        borderRadius: 12, marginBottom: 0,
        borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
        borderBottom: "none",
      }}>
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search member, trainer, room…"
          style={{
            flex: "1 1 260px", minWidth: 200,
            padding: "10px 14px",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            color: "#fff", fontSize: 13,
            outline: "none",
          }}
        />
        <SelectPill label="Trainer" value={filterTrainer} setValue={setFilterTrainer} options={trainerOptions} />
        <SelectPill label="Status" value={filterStatus} setValue={setFilterStatus} options={["All", "Active", "Cancelled"]} />
        <div style={{ flex: 1 }} />
        <button style={ptBtn.ghost}>Export CSV</button>
      </div>

      {/* Table */}
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--color-border-card)",
        borderTopLeftRadius: 0, borderTopRightRadius: 0,
        borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
        overflow: "hidden",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "180px 1.3fr 1.3fr 120px 140px 100px",
          padding: "12px 18px",
          background: "rgba(255,255,255,0.03)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          fontSize: 10, fontWeight: 600, color: "var(--color-fg-metadata)",
          letterSpacing: "0.22em", textTransform: "uppercase",
        }}>
          <div>When</div>
          <div>Trainer</div>
          <div>Member</div>
          <div>Room</div>
          <div>Status</div>
          <div style={{ textAlign: "right" }}></div>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--color-fg-muted)", fontSize: 13 }}>
            No sessions match these filters.
          </div>
        ) : rows.map((s, i) => <AdminRow key={i} s={s} />)}
      </div>
    </div>
  );
}

function SelectPill({ label, value, setValue, options }) {
  return (
    <label style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "4px 4px 4px 12px",
      background: "rgba(0,0,0,0.3)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 999,
      fontSize: 12, color: "var(--color-fg-muted)",
    }}>
      <span style={{ fontWeight: 600, color: "var(--color-fg-metadata)", letterSpacing: "0.14em", textTransform: "uppercase", fontSize: 10 }}>{label}</span>
      <select value={value} onChange={e => setValue(e.target.value)} style={{
        background: "transparent",
        border: "none", color: "#fff",
        fontSize: 12, fontWeight: 600, padding: "5px 10px",
        cursor: "pointer", outline: "none",
        appearance: "none", WebkitAppearance: "none",
        paddingRight: 22,
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path d='M1 1l4 4 4-4' stroke='white' stroke-width='1.4' fill='none'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
      }}>
        {options.map(o => <option key={o} value={o} style={{ background: "#111", color: "#fff" }}>{o}</option>)}
      </select>
    </label>
  );
}

function AdminStat({ big, label, sub, tone }) {
  const color = tone === "primary" ? "var(--color-primary-light)" :
                tone === "danger"  ? "#F87171" :
                                     "#fff";
  return (
    <div style={{
      padding: 18,
      background: "rgba(255,255,255,0.02)",
      border: "1px solid var(--color-border-card)",
      borderRadius: 12,
    }}>
      <div style={{
        fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 700,
        color, letterSpacing: "-0.01em", lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      }}>{big}</div>
      <div style={{ marginTop: 8, fontSize: 11, color: "var(--color-fg-metadata)", letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 2, fontSize: 11, color: "var(--color-fg-muted)" }}>{sub}</div>
    </div>
  );
}

function AdminRow({ s }) {
  const cancelled = s.status === "cancelled";
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "180px 1.3fr 1.3fr 120px 140px 100px",
      padding: "14px 18px",
      borderTop: "1px solid rgba(255,255,255,0.04)",
      alignItems: "center",
      fontSize: 13, color: cancelled ? "var(--color-fg-muted)" : "#fff",
      textDecoration: cancelled ? "line-through" : "none",
      transition: "background 160ms ease",
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
      <div style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{s.when}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <TinyAvatar name={s.trainer} />
        <span>{s.trainer}</span>
      </div>
      <div>{s.member}</div>
      <div style={{ color: "var(--color-fg-muted)" }}>{s.room}</div>
      <div>
        {cancelled
          ? <Pill tone="danger">Cancelled</Pill>
          : <Pill tone="primary">Confirmed</Pill>}
      </div>
      <div style={{ textAlign: "right" }}>
        <button style={ptBtn.ghost}>Open</button>
      </div>
    </div>
  );
}

function TinyAvatar({ name }) {
  const t = TRAINERS.find(x => x.name === name);
  const accent = t?.accent || "#9CA3AF";
  const initial = name.charAt(0);
  return (
    <span style={{
      width: 22, height: 22, borderRadius: "50%",
      background: `linear-gradient(135deg, ${accent}, ${accent})`,
      color: "#0F0F0F", display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: 10, fontWeight: 700, flexShrink: 0,
    }}>{initial}</span>
  );
}

Object.assign(window, { AdminSessions });
