/* Home app — Pulse DNA */

function HomePage() {
  const userName = "Dana";
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--color-bg-page)", color: "#fff" }}>
      <Nav mode="booked" userName={userName} />

      <main style={{ flex: 1, padding: "40px 40px 48px", position: "relative", overflow: "hidden" }}>
        {/* ambient layers */}
        <div style={{
          position: "absolute", top: "-10%", left: "-5%", width: 800, height: 600,
          background: "radial-gradient(circle, rgba(34,197,94,0.13), transparent 60%)",
          filter: "blur(40px)", pointerEvents: "none", zIndex: 0,
        }} />
        <div style={{
          position: "absolute", left: 0, right: 0, top: 60, height: 400,
          pointerEvents: "none", zIndex: 1, overflow: "hidden",
        }}>
          <AmbientWaveform />
        </div>

        <div style={{ position: "relative", zIndex: 2, maxWidth: 1440, margin: "0 auto" }}>
          {/* Hero row: left countdown, right activity feed */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.3fr 1fr",
            gap: 40,
            alignItems: "stretch",
            minHeight: 440,
          }}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <HomeHero userName={userName} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <ActivityFeed mode="club" />
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ marginTop: 36 }}>
            <MemberStats />
          </div>

          {/* Bottom two-column: upcoming + membership */}
          <div style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 20,
          }}>
            <UpcomingSection />
            <MembershipSection />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

Object.assign(window, { HomePage });
