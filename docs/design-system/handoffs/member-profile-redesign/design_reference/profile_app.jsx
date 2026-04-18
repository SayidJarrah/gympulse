/* Profile app — Pulse DNA */

function Toast({ msg, onClose }) {
  React.useEffect(() => {
    if (!msg) return;
    const id = setTimeout(onClose, 2400);
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

function ProfilePage() {
  const [toast, setToast] = React.useState(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--color-bg-page)", color: "#fff" }}>
      <Nav mode="booked" userName="Dana" />

      <main style={{ flex: 1, padding: "40px 40px 48px", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "-10%", right: "-5%", width: 700, height: 500,
          background: "radial-gradient(circle, rgba(34,197,94,0.10), transparent 60%)",
          filter: "blur(40px)", pointerEvents: "none", zIndex: 0,
        }} />

        <div style={{ position: "relative", zIndex: 2, maxWidth: 1240, margin: "0 auto" }}>
          {/* Page header */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-primary-light)", letterSpacing: "0.24em", textTransform: "uppercase" }}>
              Profile
            </div>
            <h1 style={{
              marginTop: 10, margin: 0,
              fontFamily: "var(--font-display)", fontSize: 56, fontWeight: 700,
              color: "#fff", textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1,
            }}>
              Your account
            </h1>
            <div style={{ marginTop: 10, fontSize: 14, color: "var(--color-fg-muted)", maxWidth: 520 }}>
              Update your personal information and manage your membership.
            </div>
          </div>

          {/* Two-column grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24,
          }}>
            <PersonalInfo onToast={setToast} />
            <MembershipControl onToast={setToast} />
          </div>

          {/* Account actions row */}
          <div style={{ marginTop: 24 }}>
            <AccountActions onToast={setToast} />
          </div>
        </div>
      </main>

      <Footer />

      <Toast msg={toast} onClose={() => setToast(null)} />
    </div>
  );
}

Object.assign(window, { ProfilePage });
