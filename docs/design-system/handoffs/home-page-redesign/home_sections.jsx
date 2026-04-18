/* Home — Pulse DNA. Reuses Nav/Footer/AmbientWaveform + ActivityFeed from landing. */

/* ---------- Existing data (from ui_kits/member_app) ---------- */
const UPCOMING = [
  { name: "Morning Flow Yoga", when: "Tomorrow · 7:00am", coach: "Priya Mendes", room: "Studio B", duration: "60 min", mins: -1 }, // -1 => use countdown
  { name: "Strength Foundations", when: "Thu · 6:30pm", coach: "Jordan K.", room: "Main Floor", duration: "60 min" },
  { name: "HIIT Intervals", when: "Sat · 9:00am", coach: "Mia T.", room: "Studio A", duration: "45 min" },
];

const MEMBERSHIP = {
  plan: "Quarterly",
  status: "Active",
  renews: "May 2, 2026",
  bookingsUsed: 4,
  bookingsMax: 12,
  bookingsCopy: "Unlimited",
  renewsInDays: 12,
  savedCoaches: 3,
};

/* ---------- Hero: countdown to next booked class ---------- */
function HomeHero({ userName = "Dana" }) {
  // "Tomorrow · 7:00am" — compute target
  const target = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(7, 0, 0, 0);
    return d.getTime();
  }, []);
  const { h, m, s } = useCountdown(target);

  return (
    <div style={{ position: "relative", zIndex: 2 }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20,
        fontSize: 11, fontWeight: 600, color: "var(--color-primary-light)",
        letterSpacing: "0.24em", textTransform: "uppercase", whiteSpace: "nowrap",
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)",
          animation: "pulse-dot 1.6s ease-in-out infinite",
        }} />
        Live at the club · 47 members in
      </div>

      <h1 style={{
        fontFamily: "var(--font-display)", fontSize: 64, fontWeight: 700,
        lineHeight: 1.0, letterSpacing: "-0.01em",
        textTransform: "uppercase", margin: 0,
      }}>
        Welcome back,<br />
        <span style={{ color: "var(--color-primary)" }}>{userName}.</span>
      </h1>

      <div style={{ marginTop: 32, display: "flex", alignItems: "flex-end", gap: 28 }}>
        <BigCountdown h={h} m={m} s={s} label="Morning Flow Yoga starts in" />
        <div style={{ paddingBottom: 12, borderLeft: "1px solid var(--color-border-card)", paddingLeft: 22 }}>
          <div style={{ fontSize: 13, color: "var(--color-fg-muted)" }}>with</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: "#fff", marginTop: 2 }}>Priya Mendes</div>
          <div style={{ fontSize: 12, color: "var(--color-fg-metadata)", marginTop: 2 }}>Studio B · 60 min</div>
        </div>
      </div>

      <div style={{ marginTop: 28, display: "flex", gap: 10 }}>
        <button style={homeBtn.primary}>Add to calendar</button>
        <button style={homeBtn.secondary}>Cancel booking</button>
      </div>
    </div>
  );
}

/* ---------- Member stats strip (left bookings, renewal, favorites) ---------- */
function MemberStats() {
  const stats = [
    { n: `${MEMBERSHIP.bookingsMax - MEMBERSHIP.bookingsUsed}`, denom: `/ ${MEMBERSHIP.bookingsMax}`, l: "Bookings left", sub: "this month" },
    { n: `${MEMBERSHIP.renewsInDays}`, denom: "days", l: "Plan renews", sub: MEMBERSHIP.renews },
    { n: `${MEMBERSHIP.savedCoaches}`, denom: "", l: "Favorite coaches", sub: "Priya, Jordan, +1" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
      {stats.map(s => (
        <div key={s.l} style={{
          padding: "18px 20px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--color-border-card)",
          borderRadius: 14,
        }}>
          <div style={{ fontSize: 10, color: "var(--color-fg-metadata)", letterSpacing: "0.24em", textTransform: "uppercase", fontWeight: 600 }}>{s.l}</div>
          <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 700, color: "#fff", lineHeight: 1, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
              {s.n}
            </div>
            {s.denom && <div style={{ fontSize: 13, color: "var(--color-fg-muted)", fontWeight: 500 }}>{s.denom}</div>}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--color-fg-muted)" }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Upcoming bookings (redesigned in Pulse style) ---------- */
function UpcomingSection() {
  return (
    <div style={{
      padding: 28,
      background: "rgba(255,255,255,0.02)",
      border: "1px solid var(--color-border-card)",
      borderRadius: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-metadata)", letterSpacing: "0.22em", textTransform: "uppercase" }}>Upcoming</div>
          <div style={{ marginTop: 6, fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "-0.01em" }}>
            Next three sessions
          </div>
        </div>
        <a href="#" style={{ fontSize: 13, color: "var(--color-primary-light)", fontWeight: 500 }}>Open schedule →</a>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {UPCOMING.map((b, i) => (
          <div key={i} style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 20, alignItems: "center",
            padding: "18px 0",
            borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)",
          }}>
            {/* Time column */}
            <div style={{ minWidth: 120 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: i === 0 ? "var(--color-primary-light)" : "#fff", letterSpacing: "-0.01em", lineHeight: 1.1 }}>
                {b.when.split(" · ")[0]}
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-fg-metadata)", fontVariantNumeric: "tabular-nums" }}>
                {b.when.split(" · ")[1]}
              </div>
            </div>
            {/* Class + coach */}
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{b.name}</div>
              <div style={{ marginTop: 3, fontSize: 12, color: "var(--color-fg-muted)" }}>
                {b.coach} · {b.room} · {b.duration}
              </div>
            </div>
            {/* Status badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 10px",
              background: i === 0 ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${i === 0 ? "var(--color-primary-border)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 999,
              fontSize: 11, fontWeight: 600,
              color: i === 0 ? "var(--color-primary-light)" : "var(--color-fg-label)",
              letterSpacing: "0.06em", whiteSpace: "nowrap",
            }}>
              {i === 0 ? (
                <>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary)" }} />
                  Next up
                </>
              ) : "Booked"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Membership card (redesigned) ---------- */
function MembershipSection() {
  const pct = (MEMBERSHIP.bookingsUsed / MEMBERSHIP.bookingsMax) * 100;
  return (
    <div style={{
      padding: 28,
      background: "linear-gradient(180deg, rgba(34,197,94,0.06), rgba(255,255,255,0.02) 70%)",
      border: "1px solid var(--color-border-card)",
      borderRadius: 16,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* corner glow */}
      <div style={{
        position: "absolute", top: -40, right: -40, width: 200, height: 200,
        background: "radial-gradient(circle, rgba(34,197,94,0.2), transparent 70%)",
        filter: "blur(20px)", pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-metadata)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Your access
          </div>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "3px 10px",
            background: "rgba(34,197,94,0.1)",
            border: "1px solid var(--color-primary-border)",
            borderRadius: 999, fontSize: 10,
            color: "var(--color-primary-light)", fontWeight: 700, letterSpacing: "0.08em",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--color-primary)" }} />
            ACTIVE
          </span>
        </div>

        <div style={{ marginTop: 10, fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1.05 }}>
          {MEMBERSHIP.plan}<br />Membership
        </div>

        {/* Bookings ring */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>Bookings this cycle</div>
            <div style={{ fontSize: 12, color: "#fff", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
              {MEMBERSHIP.bookingsUsed} / {MEMBERSHIP.bookingsMax}
            </div>
          </div>
          <div style={{
            height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden",
          }}>
            <div style={{
              width: `${pct}%`, height: "100%",
              background: "linear-gradient(90deg, var(--color-primary), var(--color-primary-light))",
              borderRadius: 999,
              boxShadow: "0 0 12px rgba(34,197,94,0.5)",
            }} />
          </div>
        </div>

        {/* Renewal */}
        <div style={{
          marginTop: 20, padding: "14px 16px",
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-fg-metadata)", letterSpacing: "0.22em", textTransform: "uppercase" }}>Renews</div>
            <div style={{ marginTop: 3, fontSize: 14, fontWeight: 600, color: "#fff" }}>{MEMBERSHIP.renews}</div>
          </div>
          <div style={{
            fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700,
            color: "var(--color-primary-light)", letterSpacing: "-0.01em",
            fontVariantNumeric: "tabular-nums",
          }}>
            {MEMBERSHIP.renewsInDays}<span style={{ fontSize: 12, color: "var(--color-fg-muted)", marginLeft: 4, fontWeight: 500 }}>days</span>
          </div>
        </div>

        <button style={{
          marginTop: 18, width: "100%",
          padding: "12px 18px",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "#fff",
          borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>Manage membership</button>
      </div>
    </div>
  );
}

const homeBtn = {
  primary: {
    padding: "12px 22px", background: "var(--color-primary)", color: "#0F0F0F",
    border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
    boxShadow: "0 8px 24px rgba(34,197,94,0.3)",
  },
  secondary: {
    padding: "12px 22px", background: "transparent", color: "#fff",
    border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
};

Object.assign(window, { HomeHero, MemberStats, UpcomingSection, MembershipSection });
