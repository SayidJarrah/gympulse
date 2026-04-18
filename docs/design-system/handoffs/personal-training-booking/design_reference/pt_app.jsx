/* Personal Training — app shell. Orchestrates Member / Trainer / Admin views. */

function PersonalTrainingApp() {
  const [role, setRole] = React.useState("member");
  const [toast, setToast] = React.useState(null);

  // Member flow state
  const [stage, setStage] = React.useState("browse"); // browse | pick | confirm
  const [filter, setFilter] = React.useState("All");
  const [selectedTrainer, setSelectedTrainer] = React.useState(null);
  const [selectedSlot, setSelectedSlot] = React.useState(null);
  const [bookings, setBookings] = React.useState(MY_PT_BOOKINGS);

  const handlePickTrainer = (t) => { setSelectedTrainer(t); setStage("pick"); };
  const handlePickSlot = ({ day, hour }) => { setSelectedSlot({ day, hour }); setStage("confirm"); };
  const handleBack = () => { setSelectedTrainer(null); setStage("browse"); };
  const handleConfirm = () => {
    const when = `${formatDay(selectedSlot.day.date)} · ${formatHour(selectedSlot.hour)}`;
    const mins = Math.max(60, Math.round(((selectedSlot.day.date.getTime() + selectedSlot.hour * 3600 * 1000) - Date.now()) / 60000));
    setBookings([...bookings, {
      id: `b${bookings.length + 1}`,
      when, trainerId: selectedTrainer.id, trainer: selectedTrainer.name,
      room: selectedTrainer.tags[1] || "Main Floor",
      note: "New booking", minsFromNow: mins,
    }]);
    setToast(`Booked with ${selectedTrainer.name} — ${when}`);
    setSelectedSlot(null); setSelectedTrainer(null); setStage("browse");
  };
  const handleCancel = (b) => {
    setBookings(bookings.filter(x => x.id !== b.id));
    setToast(`Cancelled session with ${b.trainer}`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--color-bg-page)", color: "#fff" }}>
      {/* Nav with role switcher baked in */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 40px", borderBottom: "1px solid var(--color-border-card)",
        position: "relative", zIndex: 10,
      }}>
        <Logo />
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <RoleSwitcher role={role} setRole={(r) => { setRole(r); setStage("browse"); setSelectedTrainer(null); }} />
          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)" }} />
          <a href="#" style={{ fontSize: 13, fontWeight: 500, color: "var(--color-fg-label)", textDecoration: "none" }}>Schedule</a>
          <a href="#" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary-light)", textDecoration: "none" }}>Personal training</a>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "6px 12px 6px 6px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 999,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: role === "member"  ? "linear-gradient(135deg, #22C55E, #4ADE80)" :
                          role === "trainer" ? "linear-gradient(135deg, #F97316, #FB923C)" :
                                               "linear-gradient(135deg, #6366F1, #818CF8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "#0F0F0F",
            }}>
              {role === "member" ? "D" : role === "trainer" ? "P" : "A"}
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>
              {role === "member" ? "Dana" : role === "trainer" ? "Priya" : "Admin"}
            </span>
          </div>
        </div>
      </nav>

      <main style={{ flex: 1, padding: "40px 40px 56px", position: "relative", overflow: "hidden" }}>
        {/* Ambient green radial glow */}
        <div style={{
          position: "absolute", top: "-10%", right: "-5%", width: 700, height: 500,
          background: "radial-gradient(circle, rgba(34,197,94,0.10), transparent 60%)",
          filter: "blur(40px)", pointerEvents: "none", zIndex: 0,
        }} />
        <div style={{
          position: "absolute", bottom: "-10%", left: "-5%", width: 500, height: 400,
          background: "radial-gradient(circle, rgba(249,115,22,0.06), transparent 60%)",
          filter: "blur(40px)", pointerEvents: "none", zIndex: 0,
        }} />

        <div style={{ position: "relative", zIndex: 2, maxWidth: 1320, margin: "0 auto" }}>
          {role === "member" && (
            <MemberView
              stage={stage}
              filter={filter} setFilter={setFilter}
              bookings={bookings}
              selectedTrainer={selectedTrainer}
              onPickTrainer={handlePickTrainer}
              onBack={handleBack}
              onPickSlot={handlePickSlot}
              onCancel={handleCancel}
            />
          )}
          {role === "trainer" && <TrainerSchedule />}
          {role === "admin"   && <AdminSessions />}
        </div>
      </main>

      {/* Confirm modal */}
      {stage === "confirm" && (
        <ConfirmBooking
          trainer={selectedTrainer}
          slot={selectedSlot}
          onClose={() => { setSelectedSlot(null); setStage("pick"); }}
          onConfirm={handleConfirm}
        />
      )}

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

      <Toast msg={toast} onClose={() => setToast(null)} />
    </div>
  );
}

function MemberView({ stage, filter, setFilter, bookings, selectedTrainer, onPickTrainer, onBack, onPickSlot, onCancel }) {
  if (stage === "pick" || stage === "confirm") {
    return (
      <SlotPicker trainer={selectedTrainer} onBack={onBack} onPickSlot={onPickSlot} />
    );
  }

  // Browse stage — page header + upcoming + directory
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Eyebrow tone="primary">Personal training</Eyebrow>
        <div style={{ marginTop: 10 }}>
          <DisplayTitle size={56}>
            One-on-one,<br />
            <span style={{ color: "var(--color-primary)" }}>on your terms.</span>
          </DisplayTitle>
        </div>
        <div style={{ marginTop: 10, fontSize: 15, color: "var(--color-fg-muted)", maxWidth: 620 }}>
          Every active member gets personal training as part of their plan. Pick a coach, grab a slot, show up ready.
        </div>
      </div>

      {bookings.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <MyUpcomingPT bookings={bookings} onCancel={onCancel} />
        </div>
      )}

      <TrainerDirectory onPick={onPickTrainer} filter={filter} setFilter={setFilter} />
    </div>
  );
}

Object.assign(window, { PersonalTrainingApp });
