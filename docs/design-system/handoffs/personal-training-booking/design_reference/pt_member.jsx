/* Member flow: browse trainers -> pick slot -> confirm -> manage bookings */

/* =====================================================================
   Stage 0 — Upcoming personal-training sessions (top, always visible)
   ===================================================================== */
function MyUpcomingPT({ bookings, onCancel }) {
  if (!bookings.length) return null;
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <Eyebrow tone="primary">Your upcoming sessions</Eyebrow>
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 600, color: "#fff" }}>
            {bookings.length} personal training {bookings.length === 1 ? "session" : "sessions"} booked
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {bookings.map(b => {
          const trainer = TRAINERS.find(t => t.id === b.trainerId);
          return (
            <div key={b.id} style={{
              display: "grid", gridTemplateColumns: "auto 1fr auto auto",
              alignItems: "center", gap: 18,
              padding: "14px 18px",
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
            }}>
              <Avatar initial={trainer?.initial || "?"} accent={trainer?.accent || "#22C55E"} size={40} glow />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{b.when}</div>
                  <Pill tone="primary">1hr · PT</Pill>
                </div>
                <div style={{ marginTop: 3, fontSize: 13, color: "var(--color-fg-muted)" }}>
                  With {b.trainer} · {b.room} · {b.note}
                </div>
              </div>
              <div style={{
                fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700,
                color: "var(--color-primary-light)", textTransform: "uppercase",
                letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums",
                textAlign: "right", minWidth: 90,
              }}>
                {b.minsFromNow < 60 ? `${b.minsFromNow}m` :
                  b.minsFromNow < 24 * 60 ? `${Math.floor(b.minsFromNow/60)}h` :
                  `${Math.floor(b.minsFromNow/60/24)}d`}
                <span style={{ fontSize: 10, color: "var(--color-fg-muted)", marginLeft: 4, fontWeight: 500 }}>away</span>
              </div>
              <button onClick={() => onCancel(b)} style={ptBtn.ghost}>Cancel</button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* =====================================================================
   Stage 1 — Browse trainers
   ===================================================================== */
function TrainerDirectory({ onPick, filter, setFilter }) {
  const allSpecialties = React.useMemo(() => {
    const s = new Set();
    TRAINERS.forEach(t => t.specialties.forEach(x => s.add(x)));
    return ["All", ...Array.from(s)];
  }, []);

  const filtered = filter === "All"
    ? TRAINERS
    : TRAINERS.filter(t => t.specialties.includes(filter));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, gap: 24, flexWrap: "wrap" }}>
        <div>
          <Eyebrow tone="primary">Step 1 of 3 · Choose a trainer</Eyebrow>
          <div style={{ marginTop: 10 }}>
            <DisplayTitle size={40}>Pick who you want to train with</DisplayTitle>
          </div>
          <div style={{ marginTop: 8, fontSize: 14, color: "var(--color-fg-muted)", maxWidth: 640 }}>
            One hour, one-on-one. Every trainer's availability is live and reflects their group classes. Book at least 24 hours ahead.
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {allSpecialties.map(s => {
          const active = s === filter;
          return (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: "7px 14px",
              background: active ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${active ? "var(--color-primary-border)" : "rgba(255,255,255,0.08)"}`,
              color: active ? "var(--color-primary-light)" : "var(--color-fg-label)",
              borderRadius: 999,
              fontSize: 12, fontWeight: active ? 600 : 500, cursor: "pointer",
              letterSpacing: "0.02em",
            }}>{s}</button>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {filtered.map(t => (
          <TrainerCard key={t.id} trainer={t} onPick={onPick} />
        ))}
      </div>
    </div>
  );
}

function TrainerCard({ trainer, onPick }) {
  const avail = React.useMemo(() => buildAvailability(trainer.id), [trainer.id]);
  const openCount = avail.slice(0, 7).reduce((acc, d) =>
    acc + Object.values(d.slots).filter(s => s === "available").length, 0);
  const nextOpen = (() => {
    for (const d of avail) {
      for (const h of Object.keys(d.slots).sort((a,b) => +a - +b)) {
        if (d.slots[h] === "available") {
          return `${formatDay(d.date)} · ${formatHour(+h)}`;
        }
      }
    }
    return null;
  })();

  return (
    <div style={{
      padding: 22,
      background: "rgba(255,255,255,0.02)",
      border: "1px solid var(--color-border-card)",
      borderRadius: 16,
      position: "relative", overflow: "hidden",
      transition: "border-color 200ms ease, transform 200ms ease, background 200ms ease",
      cursor: "pointer",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.background = "rgba(255,255,255,0.035)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border-card)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
    onClick={() => onPick(trainer)}>
      {/* subtle accent glow */}
      <div style={{
        position: "absolute", top: -40, right: -40, width: 180, height: 180,
        background: `radial-gradient(circle, ${trainer.accent}22, transparent 70%)`,
        filter: "blur(20px)", pointerEvents: "none",
      }} />

      <div style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
        <Avatar initial={trainer.initial} accent={trainer.accent} size={52} glow />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700,
            color: "#fff", textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1.05,
          }}>{trainer.name}</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-fg-muted)" }}>
            {trainer.yearsExp} yrs · {trainer.sessions} sessions
          </div>
        </div>
      </div>

      <div style={{ position: "relative", fontSize: 13, color: "var(--color-fg-label)", lineHeight: 1.5, minHeight: 60 }}>
        {trainer.bio}
      </div>

      <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
        {trainer.specialties.map(s => (
          <span key={s} style={{
            padding: "3px 10px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 999,
            fontSize: 11, color: "var(--color-fg-label)", fontWeight: 500,
          }}>{s}</span>
        ))}
      </div>

      <div style={{
        position: "relative", marginTop: 18, paddingTop: 14,
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-fg-metadata)", letterSpacing: "0.22em", textTransform: "uppercase" }}>Next open</div>
          <div style={{ marginTop: 2, fontSize: 13, fontWeight: 600, color: openCount ? "var(--color-primary-light)" : "var(--color-fg-muted)" }}>
            {nextOpen || "Fully booked"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-fg-metadata)", letterSpacing: "0.22em", textTransform: "uppercase" }}>This week</div>
          <div style={{
            marginTop: 2, fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700,
            color: "#fff", letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums",
          }}>
            {openCount}<span style={{ fontSize: 10, color: "var(--color-fg-muted)", marginLeft: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.2em" }}>open</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   Stage 2 — Calendar: pick a slot
   ===================================================================== */
function SlotPicker({ trainer, onBack, onPickSlot }) {
  const avail = React.useMemo(() => buildAvailability(trainer.id), [trainer.id]);
  const [weekOffset, setWeekOffset] = React.useState(0);

  const startIdx = weekOffset * 7;
  const week = avail.slice(startIdx, startIdx + 7);

  // gather all possible hours across visible week for the grid rows
  const allHours = Array.from(new Set(week.flatMap(d => Object.keys(d.slots).map(Number)))).sort((a,b) => a - b);

  return (
    <div>
      {/* Back bar */}
      <button onClick={onBack} style={{
        background: "transparent", border: "none", color: "var(--color-fg-muted)",
        fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 14,
        display: "inline-flex", alignItems: "center", gap: 6,
      }}>
        <span style={{ fontSize: 16 }}>←</span> Back to trainers
      </button>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Avatar initial={trainer.initial} accent={trainer.accent} size={64} glow />
          <div>
            <Eyebrow tone="primary">Step 2 of 3 · Pick a time</Eyebrow>
            <div style={{ marginTop: 8 }}>
              <DisplayTitle size={44}>{trainer.name}</DisplayTitle>
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: "var(--color-fg-muted)" }}>
              {trainer.specialties.join(" · ")} · 1 hour · No cost to your membership
            </div>
          </div>
        </div>

        {/* Week paginator */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
            disabled={weekOffset === 0}
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              color: weekOffset === 0 ? "var(--color-fg-subtle)" : "#fff",
              cursor: weekOffset === 0 ? "not-allowed" : "pointer",
              fontSize: 16,
            }}>←</button>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", minWidth: 150, textAlign: "center" }}>
            {weekOffset === 0 ? "This week" : "Next week"}
          </div>
          <button onClick={() => setWeekOffset(Math.min(1, weekOffset + 1))}
            disabled={weekOffset === 1}
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              color: weekOffset === 1 ? "var(--color-fg-subtle)" : "#fff",
              cursor: weekOffset === 1 ? "not-allowed" : "pointer",
              fontSize: 16,
            }}>→</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 18, marginBottom: 16, fontSize: 11, color: "var(--color-fg-muted)", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 600 }}>
        <LegendItem color="var(--color-primary)" label="Available" />
        <LegendItem color="rgba(249,115,22,0.5)" label="Group class" />
        <LegendItem color="rgba(255,255,255,0.1)" label="Booked" />
        <LegendItem color="transparent" border="rgba(255,255,255,0.08)" label="Too soon · 24h rule" />
      </div>

      {/* Calendar grid */}
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--color-border-card)",
        borderRadius: 16,
        overflow: "hidden",
      }}>
        {/* Day headers */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "72px repeat(7, 1fr)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}>
          <div></div>
          {week.map((d, i) => {
            const isToday = d.dayOffset === 0;
            return (
              <div key={i} style={{
                padding: "14px 10px",
                textAlign: "center",
                borderLeft: "1px solid rgba(255,255,255,0.04)",
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 600,
                  color: isToday ? "var(--color-primary-light)" : "var(--color-fg-metadata)",
                  letterSpacing: "0.22em", textTransform: "uppercase",
                }}>
                  {d.date.toLocaleDateString(undefined, { weekday: "short" })}
                </div>
                <div style={{
                  marginTop: 4,
                  fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700,
                  color: isToday ? "var(--color-primary)" : "#fff",
                  letterSpacing: "-0.01em", textTransform: "uppercase",
                }}>{dayNum(d.date)}</div>
              </div>
            );
          })}
        </div>

        {/* Time rows */}
        {allHours.map(h => (
          <div key={h} style={{
            display: "grid",
            gridTemplateColumns: "72px repeat(7, 1fr)",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            minHeight: 52,
          }}>
            <div style={{
              padding: "0 12px",
              display: "flex", alignItems: "center", justifyContent: "flex-end",
              fontSize: 11, color: "var(--color-fg-metadata)",
              fontVariantNumeric: "tabular-nums", fontWeight: 500,
            }}>{formatHour(h)}</div>
            {week.map((d, i) => {
              const status = d.slots[h];
              return <SlotCell key={i} status={status} onPick={() => onPickSlot({ day: d, hour: h })} />;
            })}
          </div>
        ))}
      </div>

      {/* Rules helper */}
      <div style={{
        marginTop: 14, padding: "12px 16px",
        background: "rgba(59,130,246,0.05)",
        border: "1px solid rgba(59,130,246,0.15)",
        borderRadius: 12,
        fontSize: 12, color: "var(--color-fg-label)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#60A5FA", flexShrink: 0 }} />
        Sessions are 1 hour, fixed. Trainer availability updates live from the class schedule — if a class appears, the corresponding slot disappears.
      </div>
    </div>
  );
}

function LegendItem({ color, label, border }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{
        width: 10, height: 10, borderRadius: 3,
        background: color,
        border: border ? `1px dashed ${border}` : "none",
      }} />
      {label}
    </div>
  );
}

function SlotCell({ status, onPick }) {
  const base = {
    borderLeft: "1px solid rgba(255,255,255,0.04)",
    padding: 6,
    display: "flex", alignItems: "stretch",
  };
  if (status === "available") {
    return (
      <div style={base}>
        <button onClick={onPick} style={{
          flex: 1,
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: 6,
          color: "var(--color-primary-light)",
          fontSize: 11, fontWeight: 600, cursor: "pointer",
          letterSpacing: "0.04em",
          transition: "all 160ms ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-primary)"; e.currentTarget.style.color = "#0F0F0F"; e.currentTarget.style.borderColor = "var(--color-primary)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(34,197,94,0.08)"; e.currentTarget.style.color = "var(--color-primary-light)"; e.currentTarget.style.borderColor = "rgba(34,197,94,0.25)"; }}
        >Book</button>
      </div>
    );
  }
  if (status === "class") {
    return (
      <div style={base}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(249,115,22,0.08)",
          border: "1px solid rgba(249,115,22,0.25)",
          borderRadius: 6,
          color: "var(--color-accent-text)",
          fontSize: 10, fontWeight: 600,
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>Class</div>
      </div>
    );
  }
  if (status === "booked") {
    return (
      <div style={base}>
        <div style={{
          flex: 1,
          background: "rgba(255,255,255,0.03)",
          border: "1px dashed rgba(255,255,255,0.08)",
          borderRadius: 6,
        }} />
      </div>
    );
  }
  if (status === "past") {
    return (
      <div style={base}>
        <div style={{
          flex: 1,
          background: "rgba(255,255,255,0.015)",
          border: "1px dashed rgba(255,255,255,0.05)",
          borderRadius: 6,
        }} />
      </div>
    );
  }
  return <div style={base} />;
}

/* =====================================================================
   Stage 3 — Confirm booking (modal)
   ===================================================================== */
function ConfirmBooking({ trainer, slot, onClose, onConfirm }) {
  if (!trainer || !slot) return null;
  const endHour = slot.hour + 1;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 520,
        background: "#0F0F0F",
        border: "1px solid var(--color-border-card)",
        borderRadius: 20,
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        overflow: "hidden",
      }}>
        <div style={{
          padding: "24px 28px 20px",
          background: "linear-gradient(180deg, rgba(34,197,94,0.08), transparent 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -40, right: -40, width: 220, height: 220,
            background: "radial-gradient(circle, rgba(34,197,94,0.18), transparent 70%)",
            filter: "blur(20px)", pointerEvents: "none",
          }} />
          <div style={{ position: "relative" }}>
            <Eyebrow tone="primary">Step 3 of 3 · Confirm</Eyebrow>
            <div style={{ marginTop: 10 }}>
              <DisplayTitle size={32}>One hour, booked.</DisplayTitle>
            </div>
          </div>
        </div>

        <div style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
            <Avatar initial={trainer.initial} accent={trainer.accent} size={52} glow />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>{trainer.name}</div>
              <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>{trainer.specialties.slice(0, 2).join(" · ")}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <InfoCell label="When" value={formatDay(slot.day.date)} sub={`${formatHour(slot.hour)} – ${formatHour(endHour)}`} />
            <InfoCell label="Duration" value="1 hour" sub="Fixed length" />
            <InfoCell label="Where" value={trainer.tags[1] || "On the floor"} sub="Meet 5 min early" />
            <InfoCell label="Cost" value="Included" sub="Counts as 1 booking" />
          </div>

          <div style={{
            marginTop: 18, padding: "12px 14px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
            fontSize: 12, color: "var(--color-fg-muted)", lineHeight: 1.55,
          }}>
            Cancel up to 6 hours before the session to get the booking slot back. After that, the session counts against your cycle.
          </div>

          <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={onClose} style={ptBtn.secondary}>Not yet</button>
            <button onClick={onConfirm} style={ptBtn.primary}>Confirm booking</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value, sub }) {
  return (
    <div style={{
      padding: "12px 14px",
      background: "rgba(0,0,0,0.35)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 10,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-fg-metadata)", letterSpacing: "0.22em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600, color: "#fff" }}>{value}</div>
      <div style={{ marginTop: 2, fontSize: 11, color: "var(--color-fg-muted)" }}>{sub}</div>
    </div>
  );
}

Object.assign(window, { MyUpcomingPT, TrainerDirectory, TrainerCard, SlotPicker, ConfirmBooking });
