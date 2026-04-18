/* Pulse — hero panel, 3 states:
   - booked: member with an upcoming class (big countdown)
   - nobooked: member with nothing on the books (next available class)
   - loggedOut: public / join focus */

function useCountdown(targetMs) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, targetMs - now);
  return {
    h: Math.floor(diff / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

function BigCountdown({ h, m, s, label }) {
  const cell = {
    display: "flex", flexDirection: "column", alignItems: "center",
    minWidth: 96,
  };
  const digit = {
    fontFamily: "var(--font-display)", fontSize: 88, fontWeight: 700,
    lineHeight: 0.95, color: "var(--color-primary-light)",
    letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums",
  };
  const unit = {
    marginTop: 4, fontSize: 10, fontWeight: 600,
    color: "var(--color-fg-metadata)", letterSpacing: "0.3em", textTransform: "uppercase",
  };
  const sep = {
    fontFamily: "var(--font-display)", fontSize: 88, fontWeight: 700,
    lineHeight: 0.95, color: "var(--color-fg-subtle)",
    margin: "0 2px", opacity: 0.4,
  };
  return (
    <div>
      {label && <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-metadata)", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 18 }}>{label}</div>}
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <div style={cell}>
          <div style={digit}>{String(h).padStart(2,"0")}</div>
          <div style={unit}>Hours</div>
        </div>
        <div style={sep}>:</div>
        <div style={cell}>
          <div style={digit}>{String(m).padStart(2,"0")}</div>
          <div style={unit}>Min</div>
        </div>
        <div style={sep}>:</div>
        <div style={cell}>
          <div style={digit}>{String(s).padStart(2,"0")}</div>
          <div style={unit}>Sec</div>
        </div>
      </div>
    </div>
  );
}

/* State 1: logged-in, has a booked class */
function HeroBooked({ userName = "Dana" }) {
  const target = React.useMemo(() => Date.now() + 2 * 3600000 + 14 * 60000 + 30000, []);
  const { h, m, s } = useCountdown(target);

  return (
    <div style={{ position: "relative", zIndex: 2 }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24,
        fontSize: 11, fontWeight: 600, color: "var(--color-primary-light)",
        letterSpacing: "0.24em", textTransform: "uppercase",
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)",
          animation: "pulse-dot 1.6s ease-in-out infinite",
        }} />
        Live at the club · 47 members in
      </div>

      <h1 style={{
        fontFamily: "var(--font-display)", fontSize: 72, fontWeight: 700,
        lineHeight: 1.0, letterSpacing: "-0.01em",
        textTransform: "uppercase", margin: 0,
      }}>
        Welcome back,<br />
        <span style={{ color: "var(--color-primary)" }}>{userName}.</span>
      </h1>

      <div style={{ marginTop: 40, display: "flex", alignItems: "flex-end", gap: 32 }}>
        <BigCountdown h={h} m={m} s={s} label="Power Vinyasa starts in" />
        <div style={{ paddingBottom: 14, borderLeft: "1px solid var(--color-border-card)", paddingLeft: 24 }}>
          <div style={{ fontSize: 13, color: "var(--color-fg-muted)" }}>with</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: "#fff", marginTop: 2 }}>Priya Mendes</div>
          <div style={{ fontSize: 12, color: "var(--color-fg-metadata)", marginTop: 2 }}>Studio B · 60 min</div>
        </div>
      </div>

      <div style={{ marginTop: 32, display: "flex", gap: 12 }}>
        <button style={primaryBtn}>Check in now →</button>
        <button style={secondaryBtn}>View schedule</button>
      </div>

      <TrainerRow />
    </div>
  );
}

/* State 2: logged-in, nothing booked → show next available class */
function HeroNoBooked({ userName = "Dana" }) {
  return (
    <div style={{ position: "relative", zIndex: 2 }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24,
        fontSize: 11, fontWeight: 600, color: "var(--color-primary-light)",
        letterSpacing: "0.24em", textTransform: "uppercase",
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)",
          animation: "pulse-dot 1.6s ease-in-out infinite",
        }} />
        Live at the club · 47 members in
      </div>

      <h1 style={{
        fontFamily: "var(--font-display)", fontSize: 72, fontWeight: 700,
        lineHeight: 1.0, letterSpacing: "-0.01em",
        textTransform: "uppercase", margin: 0,
      }}>
        Hey {userName}.<br />
        <span style={{ color: "var(--color-primary)" }}>Get on a mat.</span>
      </h1>

      <div style={{
        marginTop: 40, padding: "24px 28px",
        background: "rgba(34,197,94,0.05)", border: "1px solid var(--color-primary-border)",
        borderRadius: 16, display: "inline-flex", alignItems: "center", gap: 28,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-primary-light)", letterSpacing: "0.24em", textTransform: "uppercase" }}>Next open · 45 min</div>
          <div style={{ marginTop: 8, fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em", textTransform: "uppercase" }}>
            HIIT 45
          </div>
          <div style={{ marginTop: 4, fontSize: 13, color: "var(--color-fg-muted)" }}>
            Mia Taylor · Studio A · <span style={{ color: "#FDBA74" }}>3 spots left</span>
          </div>
        </div>
        <button style={{ ...primaryBtn, padding: "16px 28px" }}>Grab a spot →</button>
      </div>

      <div style={{ marginTop: 20, fontSize: 13, color: "var(--color-fg-muted)" }}>
        Or <a href="#" style={{ color: "var(--color-primary-light)", fontWeight: 500 }}>browse the full schedule</a> — 11 more classes today.
      </div>

      <TrainerRow />
    </div>
  );
}

/* State 3: logged-out / public */
function HeroLoggedOut() {
  return (
    <div style={{ position: "relative", zIndex: 2 }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24,
        fontSize: 11, fontWeight: 600, color: "var(--color-primary-light)",
        letterSpacing: "0.24em", textTransform: "uppercase",
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)",
          animation: "pulse-dot 1.6s ease-in-out infinite",
        }} />
        Brooklyn · Williamsburg
      </div>

      <h1 style={{
        fontFamily: "var(--font-display)", fontSize: 80, fontWeight: 700,
        lineHeight: 0.95, letterSpacing: "-0.01em",
        textTransform: "uppercase", margin: 0,
      }}>
        A gym with a<br />
        <span style={{ color: "var(--color-primary)" }}>pulse.</span>
      </h1>

      <p style={{ marginTop: 24, fontSize: 17, color: "var(--color-fg-muted)", maxWidth: 480, lineHeight: 1.5 }}>
        Strength, flow, and lifting classes six days a week. No crowded floors. No nonsense.
      </p>

      <div style={{ marginTop: 32, display: "flex", gap: 12 }}>
        <button style={primaryBtn}>Start 7-day trial →</button>
        <button style={secondaryBtn}>See a class</button>
      </div>

      <div style={{ marginTop: 36, display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex" }}>
          {["Priya","Jordan","Noah","Ari","Mia"].map((n,i) => (
            <div key={n} style={{
              width: 36, height: 36, borderRadius: "50%",
              background: `hsl(${i*47+140} 60% 50%)`,
              border: "2px solid #0F0F0F",
              marginLeft: i === 0 ? 0 : -10,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: "#0F0F0F",
            }}>{n[0]}</div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
          <span style={{ color: "#fff", fontWeight: 600 }}>8 coaches</span>, 1,200+ members · <a href="#" style={{ color: "var(--color-primary-light)" }}>Meet the team</a>
        </div>
      </div>
    </div>
  );
}

function TrainerRow() {
  return (
    <div style={{ marginTop: 48, display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ display: "flex" }}>
        {["Priya","Jordan","Noah","Ari","Mia"].map((n,i) => (
          <div key={n} style={{
            width: 36, height: 36, borderRadius: "50%",
            background: `hsl(${i*47+140} 60% 50%)`,
            border: "2px solid #0F0F0F",
            marginLeft: i === 0 ? 0 : -10,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#0F0F0F",
          }}>{n[0]}</div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
        <span style={{ color: "#fff", fontWeight: 600 }}>8 coaches</span> teaching this week · <a href="#" style={{ color: "var(--color-primary-light)" }}>Meet the team</a>
      </div>
    </div>
  );
}

const primaryBtn = {
  padding: "14px 26px", background: "var(--color-primary)", color: "#0F0F0F",
  border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer",
  boxShadow: "0 8px 24px rgba(34,197,94,0.3)",
};
const secondaryBtn = {
  padding: "14px 26px", background: "transparent", color: "#fff",
  border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8,
  fontSize: 14, fontWeight: 600, cursor: "pointer",
};

Object.assign(window, { HeroBooked, HeroNoBooked, HeroLoggedOut, TrainerRow, BigCountdown, useCountdown });
