/* GymFlow onboarding — shell.
   Layout: MemberNav at top, 2-col body (left rail stepper / right content),
   sticky footer with Back · Skip · Continue. */

const ALL_STEPS = [
  { key: "welcome",   label: "Welcome",      required: false, short: "Welcome" },
  { key: "profile",   label: "Your profile", required: true,  short: "Profile" },
  { key: "prefs",     label: "Preferences",  required: false, short: "Prefs"   },
  { key: "plan",      label: "Membership",   required: false, short: "Plan"    },
  { key: "booking",   label: "First booking",required: false, short: "Booking", conditional: true },
  { key: "terms",     label: "Final check",  required: true,  short: "Terms"   },
];

const INITIAL = {
  email: "dana.reyes@gmail.com",
  firstName: "", lastName: "", phone: "", dob: "",
  goals: [], classTypes: [], frequency: "",
  emergencyName: "", emergencyPhone: "", emergencyRelation: "",
  photoName: null, photoPreview: null,
  plan: null,
  bookingType: "class", bookingId: null,
  agreeTerms: false, agreeWaiver: false, notifBooking: true, notifNews: false,
};

function loadState() {
  try {
    const raw = localStorage.getItem("gf:onboarding:v1");
    if (!raw) return { step: 0, data: { ...INITIAL } };
    const p = JSON.parse(raw);
    return { step: p.step || 0, data: { ...INITIAL, ...(p.data || {}) } };
  } catch (_) { return { step: 0, data: { ...INITIAL } }; }
}

/* ---------------- Stepper (left rail) ---------------- */
function StepRail({ steps, currentIdx, completed, onJump, variant }) {
  // "bar" (default) = vertical pill list with numbered dots
  // "rail" = just a thin indicator
  return (
    <aside style={{
      background: "rgba(17,24,39,.35)",
      border: "1px solid var(--color-border-card)",
      borderRadius: "var(--radius-2xl)",
      padding: 24,
      position: "sticky", top: 24,
      alignSelf: "start",
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: ".28em",
        textTransform: "uppercase", color: "var(--color-primary-light)",
      }}>Onboarding</div>
      <div style={{
        marginTop: 8, fontFamily: "var(--font-display)", fontSize: 26,
        fontWeight: 700, color: "#fff", textTransform: "uppercase", lineHeight: 1,
      }}>Getting you ready</div>

      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 2 }}>
        {steps.map((s, i) => {
          const active = i === currentIdx;
          const done = completed.has(i);
          const clickable = done || i <= currentIdx;
          return (
            <button key={s.key} type="button"
              onClick={() => clickable && onJump(i)}
              disabled={!clickable}
              style={{
                display: "grid", gridTemplateColumns: "auto 1fr",
                gap: 14, padding: "12px 12px",
                background: active ? "rgba(34,197,94,.08)" : "transparent",
                border: `1px solid ${active ? "var(--color-primary-border)" : "transparent"}`,
                borderRadius: "var(--radius-md)",
                cursor: clickable ? "pointer" : "not-allowed",
                textAlign: "left",
                transition: "background 200ms",
                opacity: clickable ? 1 : 0.5,
              }}>
              <span style={{
                width: 28, height: 28, borderRadius: "50%",
                background: done
                  ? "var(--color-primary)"
                  : active
                    ? "rgba(34,197,94,.15)"
                    : "rgba(17,24,39,.8)",
                border: `1.5px solid ${done || active ? "var(--color-primary)" : "var(--color-border-strong)"}`,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: done ? "#fff" : active ? "var(--color-primary-light)" : "var(--color-fg-muted)",
                fontFamily: "var(--font-display)",
              }}>
                {done ? <Icon.Check size={14} style={{ color: "#fff" }} /> : String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{
                  display: "block", fontSize: 14, fontWeight: 600,
                  color: active || done ? "#fff" : "var(--color-fg-label)",
                }}>{s.label}</span>
                <span style={{
                  display: "block", marginTop: 2, fontSize: 11,
                  color: "var(--color-fg-metadata)", letterSpacing: ".06em",
                  textTransform: "uppercase", fontWeight: 500,
                }}>
                  {s.required ? "Required" : s.conditional ? "If plan chosen" : "Optional"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div style={{
        marginTop: 24, paddingTop: 20,
        borderTop: "1px solid var(--color-border-card)",
        fontSize: 12, color: "var(--color-fg-muted)", lineHeight: 1.5,
      }}>
        Need help? Front desk is available <span style={{ color: "#fff", fontWeight: 500 }}>Mon–Fri 6a–9p</span>.
      </div>
    </aside>
  );
}

/* ---------------- Progress bar variant ---------------- */
function ProgressBar({ steps, currentIdx }) {
  const pct = (currentIdx / (steps.length - 1)) * 100;
  return (
    <div style={{
      padding: "18px 40px",
      borderBottom: "1px solid var(--color-border-card)",
      background: "var(--color-bg-page)",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 11, fontWeight: 600, color: "var(--color-fg-metadata)",
        letterSpacing: ".22em", textTransform: "uppercase",
      }}>
        <span>Step {String(currentIdx + 1).padStart(2, "0")} · {steps[currentIdx].short}</span>
        <span>{currentIdx + 1} of {steps.length}</span>
      </div>
      <div style={{
        marginTop: 10, height: 4,
        background: "rgba(255,255,255,.06)", borderRadius: 999,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: "linear-gradient(90deg, var(--color-primary), var(--color-primary-light))",
          borderRadius: 999, boxShadow: "0 0 12px rgba(34,197,94,.5)",
          transition: "width 400ms cubic-bezier(.2,.8,.2,1)",
        }} />
      </div>
    </div>
  );
}

/* ---------------- Tweaks panel ---------------- */
function TweaksPanel({ tweaks, setTweaks, onClose }) {
  const Row = ({ label, children }) => (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, alignItems: "center" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-metadata)", letterSpacing: ".18em", textTransform: "uppercase" }}>{label}</div>
      <div>{children}</div>
    </div>
  );
  const Pill = ({ val, curVal, onClick, children }) => (
    <button onClick={onClick} style={{
      padding: "6px 10px", fontSize: 12, fontWeight: 500,
      background: curVal === val ? "var(--color-primary)" : "transparent",
      color: curVal === val ? "#fff" : "var(--color-fg-label)",
      border: `1px solid ${curVal === val ? "var(--color-primary)" : "var(--color-border-card)"}`,
      borderRadius: 9999, cursor: "pointer", marginRight: 6,
    }}>{children}</button>
  );
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 80,
      width: 340,
      background: "var(--color-bg-surface-1)",
      border: "1px solid var(--color-border-card)",
      borderRadius: "var(--radius-xl)",
      boxShadow: "0 20px 40px -5px rgba(0,0,0,.6)",
      padding: 20,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".28em", textTransform: "uppercase", color: "var(--color-primary-light)" }}>Onboarding</div>
          <div style={{ marginTop: 4, fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "#fff", textTransform: "uppercase" }}>Tweaks</div>
        </div>
        <button onClick={onClose} aria-label="Close" style={{
          background: "transparent", border: 0, color: "var(--color-fg-muted)", cursor: "pointer", padding: 6,
        }}><Icon.X size={18} /></button>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <Row label="Progress">
          <Pill val="rail" curVal={tweaks.progressStyle} onClick={() => setTweaks({ progressStyle: "rail" })}>Left rail</Pill>
          <Pill val="bar" curVal={tweaks.progressStyle} onClick={() => setTweaks({ progressStyle: "bar" })}>Top bar</Pill>
          <Pill val="both" curVal={tweaks.progressStyle} onClick={() => setTweaks({ progressStyle: "both" })}>Both</Pill>
        </Row>
        <Row label="Width">
          <Pill val="narrow" curVal={tweaks.contentWidth} onClick={() => setTweaks({ contentWidth: "narrow" })}>Narrow</Pill>
          <Pill val="wide" curVal={tweaks.contentWidth} onClick={() => setTweaks({ contentWidth: "wide" })}>Wide</Pill>
        </Row>
        <Row label="Divider">
          <Pill val="on" curVal={tweaks.stripeDivider} onClick={() => setTweaks({ stripeDivider: "on" })}>Accent stripe</Pill>
          <Pill val="off" curVal={tweaks.stripeDivider} onClick={() => setTweaks({ stripeDivider: "off" })}>Off</Pill>
        </Row>
      </div>

      <button
        onClick={() => { localStorage.removeItem("gf:onboarding:v1"); location.reload(); }}
        style={{
          marginTop: 18, width: "100%",
          padding: "10px 14px",
          background: "transparent",
          border: "1px solid var(--color-border-strong)",
          color: "var(--color-fg-label)",
          borderRadius: "var(--radius-md)",
          fontSize: 12, fontWeight: 500, cursor: "pointer",
        }}>
        Reset onboarding state
      </button>
    </div>
  );
}

/* ---------------- App ---------------- */
function OnboardingApp() {
  const initial = React.useMemo(loadState, []);
  const [step, setStep] = React.useState(initial.step);
  const [data, setData] = React.useState(initial.data);
  const [errors, setErrors] = React.useState({});
  const [completed, setCompleted] = React.useState(new Set());
  const [finished, setFinished] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "progressStyle": "rail",
    "contentWidth": "narrow",
    "stripeDivider": "on"
  }/*EDITMODE-END*/;
  const [tweaks, setTweaksRaw] = React.useState(TWEAK_DEFAULTS);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const setTweaks = (patch) => {
    const next = { ...tweaks, ...patch };
    setTweaksRaw(next);
    try { window.parent.postMessage({ type: "__edit_mode_set_keys", edits: patch }, "*"); } catch (_) {}
  };

  // Persist
  React.useEffect(() => {
    try { localStorage.setItem("gf:onboarding:v1", JSON.stringify({ step, data })); } catch (_) {}
  }, [step, data]);

  // Edit mode handshake
  React.useEffect(() => {
    const onMsg = (e) => {
      const m = e.data || {};
      if (m.type === "__activate_edit_mode") setTweaksOpen(true);
      if (m.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", onMsg);
    try { window.parent.postMessage({ type: "__edit_mode_available" }, "*"); } catch (_) {}
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Compute visible step list (skip booking if no plan)
  const visibleSteps = React.useMemo(() => {
    return ALL_STEPS.filter(s => s.key !== "booking" || !!data.plan);
  }, [data.plan]);

  // Map current step idx in visible
  const current = visibleSteps[Math.min(step, visibleSteps.length - 1)];

  const update = (patch) => setData(d => ({ ...d, ...patch }));

  const validate = (key) => {
    if (key !== "profile") return true;
    const e = {};
    if (!data.firstName.trim()) e.firstName = "Required";
    if (!data.lastName.trim()) e.lastName = "Required";
    if (!data.phone.trim()) e.phone = "Required";
    if (!data.dob.trim()) e.dob = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const validateTerms = () => {
    if (current.key !== "terms") return true;
    if (!data.agreeTerms || !data.agreeWaiver) {
      setToast("Please accept the terms and waiver to continue.");
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validate(current.key)) return;
    if (!validateTerms()) return;
    const newCompleted = new Set(completed); newCompleted.add(step);
    setCompleted(newCompleted);
    if (step >= visibleSteps.length - 1) {
      setFinished(true);
      return;
    }
    setStep(step + 1);
    setErrors({});
  };
  const goBack = () => {
    if (step === 0) return;
    setStep(step - 1);
    setErrors({});
  };
  const goSkip = () => {
    const newCompleted = new Set(completed); newCompleted.add(step);
    setCompleted(newCompleted);
    if (step >= visibleSteps.length - 1) { setFinished(true); return; }
    setStep(step + 1);
    setErrors({});
  };
  const jumpTo = (i) => setStep(i);

  const onEnterApp = () => {
    setToast("Demo only — in production, lands on member home.");
  };

  // Render current step
  const renderStep = () => {
    switch (current.key) {
      case "welcome":  return <StepWelcome data={data} />;
      case "profile":  return <StepProfile data={data} update={update} errors={errors} />;
      case "prefs":    return <StepPreferences data={data} update={update} />;
      case "plan":     return <StepMembership data={data} update={update} />;
      case "booking":  return <StepBooking data={data} update={update} />;
      case "terms":    return <StepTerms data={data} update={update} />;
      default:         return null;
    }
  };

  const isLast = step >= visibleSteps.length - 1;
  const canSkip = !current.required && current.key !== "welcome";
  const primaryLabel = current.key === "welcome"
    ? "Get started"
    : isLast
      ? "Finish onboarding"
      : "Continue";

  const contentMaxW = tweaks.contentWidth === "wide" ? 1080 : 820;
  const useRail = tweaks.progressStyle === "rail" || tweaks.progressStyle === "both";
  const useBar = tweaks.progressStyle === "bar" || tweaks.progressStyle === "both";

  if (finished) {
    return (
      <div data-screen-label={`${String(step + 1).padStart(2,"0")} Done`} style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <MiniNav />
        {useBar && <ProgressBar steps={visibleSteps} currentIdx={visibleSteps.length - 1} />}
        <main style={{ flex: 1, padding: "40px 24px" }}>
          <StepDone data={data} onEnter={onEnterApp} />
        </main>
        {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
        {tweaksOpen && <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} onClose={() => setTweaksOpen(false)} />}
      </div>
    );
  }

  return (
    <div data-screen-label={`${String(step + 1).padStart(2,"0")} ${current.short}`} style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      paddingBottom: 96, // room for sticky footer
    }}>
      <MiniNav />
      {useBar && <ProgressBar steps={visibleSteps} currentIdx={step} />}

      <main style={{
        flex: 1,
        maxWidth: 1280, margin: "0 auto", width: "100%",
        padding: "40px 40px 48px",
        display: "grid",
        gridTemplateColumns: useRail ? "260px 1fr" : "1fr",
        gap: 48,
      }}>
        {useRail && (
          <StepRail
            steps={visibleSteps}
            currentIdx={step}
            completed={completed}
            onJump={jumpTo}
          />
        )}
        <div style={{ maxWidth: contentMaxW, width: "100%" }}>
          {tweaks.stripeDivider === "on" && (
            <div style={{
              width: 48, height: 3, borderRadius: 999,
              background: "linear-gradient(90deg, var(--color-primary), var(--color-primary-light))",
              marginBottom: 20,
            }} />
          )}
          {renderStep()}
        </div>
      </main>

      {/* Sticky footer */}
      <footer style={{
        position: "fixed", left: 0, right: 0, bottom: 0,
        background: "rgba(15,15,15,.92)",
        backdropFilter: "blur(14px)",
        borderTop: "1px solid var(--color-border-card)",
        padding: "16px 40px", zIndex: 20,
      }}>
        <div style={{
          maxWidth: 1280, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={goBack} disabled={step === 0}
              style={{
                padding: "10px 16px",
                background: "transparent",
                border: "1px solid var(--color-border-card)",
                color: step === 0 ? "var(--color-fg-subtle)" : "var(--color-fg-label)",
                borderRadius: "var(--radius-md)",
                fontSize: 13, fontWeight: 500,
                cursor: step === 0 ? "not-allowed" : "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
              <Icon.ChevronLeft size={14} /> Back
            </button>
            <div style={{
              fontSize: 11, color: "var(--color-fg-metadata)",
              fontWeight: 600, letterSpacing: ".22em", textTransform: "uppercase",
            }}>
              {String(step + 1).padStart(2, "0")} / {String(visibleSteps.length).padStart(2, "0")} · {current.short}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {canSkip && (
              <button onClick={goSkip}
                style={{
                  padding: "10px 16px",
                  background: "transparent",
                  border: "1px solid transparent",
                  color: "var(--color-fg-muted)",
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                  borderRadius: "var(--radius-md)",
                }}>
                Skip this step
              </button>
            )}
            <button onClick={goNext}
              style={{
                padding: "12px 22px",
                background: "var(--color-primary)", color: "#fff",
                border: 0, borderRadius: "var(--radius-md)",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
                boxShadow: "0 10px 15px -3px rgba(34,197,94,.25)",
                display: "inline-flex", alignItems: "center", gap: 8,
              }}>
              {primaryLabel}
              <Icon.ArrowRight size={14} />
            </button>
          </div>
        </div>
      </footer>

      {toast && <Toast onDismiss={() => setToast(null)}>{toast}</Toast>}
      {tweaksOpen && <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} onClose={() => setTweaksOpen(false)} />}
    </div>
  );
}

/* Lightweight top chrome — outlined dumbbell mark + wordmark, no nav links */
function MiniNav() {
  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      borderBottom: "1px solid var(--color-border-card)",
      padding: "20px 40px",
      background: "var(--color-bg-page)",
    }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        <LogoMark variant="outline" size="sm" />
        <span style={{
          fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20,
          color: "#fff", textTransform: "uppercase", letterSpacing: ".02em",
        }}>GymFlow</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, color: "var(--color-fg-metadata)",
          letterSpacing: ".22em", textTransform: "uppercase",
        }}>New member setup</span>
        <a style={{
          fontSize: 13, color: "var(--color-fg-link)", cursor: "pointer", fontWeight: 500,
        }} onClick={() => alert("Sign out — demo stub")}>Save &amp; exit</a>
      </div>
    </nav>
  );
}

Object.assign(window, { OnboardingApp, MiniNav, StepRail, ProgressBar, TweaksPanel });
