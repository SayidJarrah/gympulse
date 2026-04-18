/* Pulse — shared UI bits: logo, nav, footer, ambient waveform */

function Logo() {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect x="1" y="1" width="30" height="30" rx="7" stroke="var(--color-primary)" strokeWidth="2" />
        <path d="M10 11v10M22 11v10M10 16h12" stroke="var(--color-primary)" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, letterSpacing: "0.02em", color: "#fff", textTransform: "uppercase" }}>GymFlow</span>
    </div>
  );
}

function Nav({ mode, userName = "Dana" }) {
  const authed = mode !== "loggedOut";
  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "20px 40px", borderBottom: "1px solid var(--color-border-card)",
      position: "relative", zIndex: 10,
    }}>
      <Logo />
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <a href="#" style={linkStyle}>Schedule</a>
        <a href="#" style={linkStyle}>Trainers</a>
        {authed ? (
          <>
            <a href="#" style={linkStyle}>Membership</a>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "6px 12px 6px 6px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 999,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "linear-gradient(135deg, #22C55E, #4ADE80)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: "#0F0F0F",
              }}>{userName[0]}</div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{userName}</span>
            </div>
          </>
        ) : (
          <>
            <a href="#" style={linkStyle}>Pricing</a>
            <a href="#" style={{ ...linkStyle, color: "var(--color-primary-light)" }}>Log in</a>
            <button style={{
              padding: "8px 16px", background: "var(--color-primary)", color: "#0F0F0F",
              border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
              whiteSpace: "nowrap",
            }}>Join GymFlow</button>
          </>
        )}
      </div>
    </nav>
  );
}

const linkStyle = {
  fontSize: 13, fontWeight: 500, color: "var(--color-fg-label)",
  textDecoration: "none", letterSpacing: "0.02em",
};

function Footer() {
  return (
    <footer style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 40px", borderTop: "1px solid var(--color-border-card)",
      fontSize: 12, color: "var(--color-fg-muted)", letterSpacing: "0.02em",
    }}>
      <div>GymFlow · 214 Wythe Ave, Brooklyn · (718) 555-0144</div>
      <div style={{ display: "flex", gap: 20 }}>
        <span>Mon–Fri 5am–11pm</span>
        <span>Sat–Sun 7am–9pm</span>
      </div>
    </footer>
  );
}

/* Ambient background waveform — very faded, pulse continues behind the hero */
function AmbientWaveform() {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    let raf, start = performance.now();
    const tick = (now) => { setT((now - start) / 1000); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const width = 1600, height = 300;
  const midY = height / 2;
  const offset = (t * 60) % 220;
  const beatEvery = 220;

  let d = "";
  for (let x = 0; x <= width; x += 2) {
    const local = ((x + offset) % beatEvery);
    let y = midY;
    if (local > 80 && local < 110) {
      const p = (local - 80) / 30;
      if (p < 0.25) y = midY - 4 - p * 160;
      else if (p < 0.5) y = midY - 44 + (p - 0.25) * 300;
      else if (p < 0.75) y = midY + 31 - (p - 0.5) * 160;
      else y = midY - 9 + (p - 0.75) * 36;
    } else {
      y = midY + Math.sin((x + offset) * 0.04) * 1.5;
    }
    d += (x === 0 ? "M" : "L") + x + "," + y.toFixed(1) + " ";
  }

  return (
    <svg
      width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{
        position: "absolute", left: 0, right: 0, top: "50%", transform: "translateY(-50%)",
        width: "100%", height: "40%", pointerEvents: "none", opacity: 0.22,
      }}
    >
      <defs>
        <linearGradient id="wavefade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#22C55E" stopOpacity="0" />
          <stop offset="0.2" stopColor="#22C55E" stopOpacity="0.7" />
          <stop offset="0.8" stopColor="#22C55E" stopOpacity="0.7" />
          <stop offset="1" stopColor="#22C55E" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke="url(#wavefade)" strokeWidth="1.5" />
    </svg>
  );
}

Object.assign(window, { Logo, Nav, Footer, AmbientWaveform });
