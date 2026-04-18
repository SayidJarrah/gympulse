/* Pulse landing — main app with state switcher */

const STATE_TWEAK = /*EDITMODE-BEGIN*/{
  "mode": "booked",
  "userName": "Dana"
}/*EDITMODE-END*/;

function StateSwitcher({ value, onChange }) {
  const states = [
    { id: "booked", label: "Member · booked" },
    { id: "nobooked", label: "Member · no class" },
    { id: "loggedOut", label: "Logged out" },
  ];
  return (
    <div style={{
      position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
      zIndex: 1000,
      display: "flex", gap: 4, padding: 4,
      background: "rgba(15,15,15,0.92)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 999,
      backdropFilter: "blur(20px)",
      boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
    }}>
      {states.map(o => (
        <button key={o.id} onClick={()=>onChange(o.id)} style={{
          padding: "8px 16px",
          background: value === o.id ? "#fff" : "transparent",
          color: value === o.id ? "#0F0F0F" : "rgba(255,255,255,0.7)",
          border: "none", borderRadius: 999,
          fontSize: 11, fontWeight: 600, cursor: "pointer",
          transition: "all 180ms ease",
          whiteSpace: "nowrap", letterSpacing: "0.04em",
        }}>{o.label}</button>
      ))}
    </div>
  );
}

function PulseLanding() {
  const [mode, setMode] = React.useState(() => localStorage.getItem("gf:pulse:mode") || STATE_TWEAK.mode);
  const [editMode, setEditMode] = React.useState(false);
  const userName = STATE_TWEAK.userName;

  React.useEffect(() => { localStorage.setItem("gf:pulse:mode", mode); }, [mode]);

  // Tweaks host integration
  React.useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === "__activate_edit_mode") setEditMode(true);
      if (e.data?.type === "__deactivate_edit_mode") setEditMode(false);
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const updateMode = (m) => {
    setMode(m);
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { mode: m } }, "*");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--color-bg-page)", color: "#fff", overflow: "hidden" }}>
      <Nav mode={mode} userName={userName} />

      <main style={{
        flex: 1, display: "grid", gridTemplateColumns: "1.3fr 1fr",
        gap: 40, padding: "48px 40px 32px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Ambient glow */}
        <div style={{
          position: "absolute", top: "-20%", left: "-10%", width: 700, height: 700,
          background: "radial-gradient(circle, rgba(34,197,94,0.15), transparent 60%)",
          filter: "blur(40px)", pointerEvents: "none", zIndex: 0,
        }} />

        {/* Ambient waveform across hero */}
        <div style={{
          position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
          pointerEvents: "none", zIndex: 1,
        }}>
          <AmbientWaveform />
        </div>

        {/* Left column: hero */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 640 }}>
          {mode === "booked" && <HeroBooked userName={userName} />}
          {mode === "nobooked" && <HeroNoBooked userName={userName} />}
          {mode === "loggedOut" && <HeroLoggedOut />}
        </div>

        {/* Right column: feed + stats */}
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
          <ActivityFeed mode={mode} />
          <StatsStrip mode={mode} />
        </div>
      </main>

      <Footer />

      {editMode && <StateSwitcher value={mode} onChange={updateMode} />}
    </div>
  );
}

Object.assign(window, { PulseLanding, StateSwitcher });
