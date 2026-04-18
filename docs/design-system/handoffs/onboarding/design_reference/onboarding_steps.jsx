/* GymFlow onboarding — individual step components.
   Each step receives { data, update, toast, goto, stepIndex, onSkip, onContinue }
   and renders its own content. The shell handles chrome + footer. */

// ---------- shared bits ----------
const fieldBase = {
  fontSize: 13, fontWeight: 500, color: "var(--color-fg-label)",
  letterSpacing: 0,
};
const inputBase = {
  background: "var(--color-bg-surface-1)",
  border: "1px solid var(--color-border-input)",
  borderRadius: "var(--radius-md)",
  padding: "12px 14px",
  color: "#fff",
  fontSize: 14,
  width: "100%",
  fontFamily: "var(--font-sans)",
  transition: "border-color 200ms, box-shadow 200ms",
};
const sectionEyebrow = {
  fontSize: 11, fontWeight: 600, letterSpacing: ".22em",
  textTransform: "uppercase", color: "var(--color-primary-light)",
};
const stepHeadline = {
  marginTop: 14, fontFamily: "var(--font-display)", fontWeight: 700,
  fontSize: 56, lineHeight: .95, color: "#fff",
  textTransform: "uppercase", letterSpacing: "-0.005em",
};
const stepLede = {
  marginTop: 16, fontSize: 16, lineHeight: 1.55,
  color: "var(--color-fg-muted)", maxWidth: 520,
};

function TextField({ label, value, onChange, placeholder, required, type = "text", help, error, id, autoFocus }) {
  const autoId = React.useId();
  const inputId = id || autoId;
  return (
    <div>
      <label htmlFor={inputId} style={{ ...fieldBase, display: "flex", gap: 6, marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: "var(--color-primary-light)" }}>*</span>}
      </label>
      <input
        id={inputId}
        type={type}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          ...inputBase,
          borderColor: error ? "rgba(239,68,68,.6)" : "var(--color-border-input)",
        }}
      />
      {(help || error) && (
        <div style={{
          marginTop: 6, fontSize: 12,
          color: error ? "var(--color-error-fg)" : "var(--color-fg-muted)",
        }}>{error || help}</div>
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, options, required, help }) {
  const id = React.useId();
  return (
    <div>
      <label htmlFor={id} style={{ ...fieldBase, display: "flex", gap: 6, marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: "var(--color-primary-light)" }}>*</span>}
      </label>
      <div style={{ position: "relative" }}>
        <select
          id={id}
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          style={{
            ...inputBase, appearance: "none",
            paddingRight: 40, cursor: "pointer",
          }}
        >
          <option value="" disabled>Choose…</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"
          style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <path strokeLinecap="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {help && <div style={{ marginTop: 6, fontSize: 12, color: "var(--color-fg-muted)" }}>{help}</div>}
    </div>
  );
}

/* =================================================================
   STEP 1 — WELCOME
   ================================================================= */
function StepWelcome({ data }) {
  const firstName = (data.firstName || "").trim() || "there";
  return (
    <div>
      <div style={sectionEyebrow}>Step 01 · Welcome</div>
      <h1 style={stepHeadline}>You're in.<br />Let's set up<br />your profile.</h1>
      <p style={stepLede}>
        A few quick steps to get your account ready: tell us who you are, optionally pick
        a membership, and book your first session. You can skip anything that isn't required.
      </p>

      <div style={{
        marginTop: 36, display: "grid", gap: 12,
        gridTemplateColumns: "repeat(3, 1fr)",
      }}>
        {[
          ["01", "Profile", "Name, contact, and the basics we need to identify you on the floor."],
          ["02", "Membership", "Choose a plan that fits your cadence — or skip and decide later."],
          ["03", "First booking", "If you picked a plan, reserve your first class or PT session."],
        ].map(([n, t, c]) => (
          <div key={n} style={{
            padding: 20,
            background: "rgba(17,24,39,.5)",
            border: "1px solid var(--color-border-card)",
            borderRadius: "var(--radius-xl)",
          }}>
            <div style={{
              fontFamily: "var(--font-display)", fontSize: 36,
              fontWeight: 700, color: "var(--color-primary-light)",
              lineHeight: 1,
            }}>{n}</div>
            <div style={{
              marginTop: 12, fontSize: 15, fontWeight: 600, color: "#fff",
            }}>{t}</div>
            <div style={{
              marginTop: 6, fontSize: 13, lineHeight: 1.5,
              color: "var(--color-fg-muted)",
            }}>{c}</div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 28, padding: "14px 18px",
        background: "rgba(34,197,94,.06)",
        border: "1px solid var(--color-primary-border)",
        borderRadius: "var(--radius-lg)",
        display: "flex", alignItems: "center", gap: 12,
        fontSize: 13, color: "var(--color-fg-label)",
      }}>
        <Icon.Clock size={16} style={{ color: "var(--color-primary-light)", flexShrink: 0 }} />
        <span>Takes about 3 minutes. Booking opens after membership activation.</span>
      </div>
    </div>
  );
}

/* =================================================================
   STEP 2 — REQUIRED PROFILE (+ optional photo)
   ================================================================= */
function StepProfile({ data, update, errors }) {
  const [preview, setPreview] = React.useState(data.photoPreview || null);
  const fileRef = React.useRef(null);
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setPreview(url);
    update({ photoName: f.name, photoPreview: url });
  };
  const initials = ((data.firstName || "")[0] || "") + ((data.lastName || "")[0] || "");

  return (
    <div>
      <div style={sectionEyebrow}>Step 02 · Profile</div>
      <h1 style={{ ...stepHeadline, fontSize: 48 }}>The basics we need</h1>
      <p style={stepLede}>
        Required so we can identify you on the floor and reach you about your bookings.
        Everything marked with <span style={{ color: "var(--color-primary-light)" }}>*</span> is required.
      </p>

      <div style={{
        marginTop: 32, display: "grid",
        gridTemplateColumns: "220px 1fr", gap: 32,
        maxWidth: 820, alignItems: "start",
      }}>
        {/* Photo upload — optional, inline */}
        <div>
          <div style={{ ...fieldBase, display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span>Profile photo</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-fg-metadata)", letterSpacing: ".18em", textTransform: "uppercase" }}>Optional</span>
          </div>
          <div style={{
            width: "100%", aspectRatio: "1",
            borderRadius: "var(--radius-2xl)",
            border: `1.5px dashed ${preview ? "transparent" : "var(--color-border-strong)"}`,
            background: preview ? "transparent" : "rgba(17,24,39,.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", position: "relative",
          }}>
            {preview ? (
              <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{
                width: 88, height: 88, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 32, fontWeight: 700, color: "#0F0F0F",
                fontFamily: "var(--font-display)",
              }}>
                {initials.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button type="button" onClick={() => fileRef.current && fileRef.current.click()}
              style={{
                flex: 1, padding: "9px 12px",
                background: "transparent",
                border: "1px solid var(--color-primary)",
                color: "var(--color-primary-light)",
                borderRadius: "var(--radius-md)",
                fontSize: 12, fontWeight: 500, cursor: "pointer",
              }}>
              {preview ? "Replace" : "Upload photo"}
            </button>
            {preview && (
              <button type="button" onClick={() => { setPreview(null); update({ photoName: null, photoPreview: null }); }}
                style={{
                  padding: "9px 12px",
                  background: "transparent",
                  border: "1px solid var(--color-border-strong)",
                  color: "var(--color-fg-muted)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 12, fontWeight: 500, cursor: "pointer",
                }}>Remove</button>
            )}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--color-fg-muted)", lineHeight: 1.45 }}>
            Helps staff check you in faster. JPG or PNG, under 5 MB.
          </div>
        </div>

        {/* Required fields */}
        <div style={{ display: "grid", gap: 18, gridTemplateColumns: "1fr 1fr" }}>
          <TextField
            label="First name" required autoFocus
            value={data.firstName}
            onChange={v => update({ firstName: v })}
            placeholder="Dana"
            error={errors.firstName}
          />
          <TextField
            label="Last name" required
            value={data.lastName}
            onChange={v => update({ lastName: v })}
            placeholder="Reyes"
            error={errors.lastName}
          />
          <TextField
            label="Phone" required type="tel"
            value={data.phone}
            onChange={v => update({ phone: v })}
            placeholder="(347) 555-0199"
            help="For booking confirmations only."
            error={errors.phone}
          />
          <TextField
            label="Date of birth" required type="date"
            value={data.dob}
            onChange={v => update({ dob: v })}
            help="18+ for unaccompanied access."
            error={errors.dob}
          />
        </div>
      </div>

      <div style={{
        marginTop: 28, padding: "14px 18px",
        background: "rgba(17,24,39,.6)",
        border: "1px solid var(--color-border-card)",
        borderRadius: "var(--radius-lg)",
        fontSize: 13, color: "var(--color-fg-muted)", maxWidth: 820,
      }}>
        Your email <strong style={{ color: "#fff", fontWeight: 600 }}>{data.email}</strong> is already on file from signup.
      </div>
    </div>
  );
}

/* =================================================================
   STEP 3 — FITNESS PREFERENCES (OPTIONAL)
   ================================================================= */
const GOALS = [
  { id: "strength", label: "Build strength", icon: "dumbbell" },
  { id: "endurance", label: "Improve endurance", icon: "heart" },
  { id: "mobility", label: "Move better", icon: "spark" },
  { id: "weight", label: "Manage weight", icon: "scale" },
  { id: "stress", label: "Reduce stress", icon: "waves" },
  { id: "sport", label: "Train for a sport", icon: "run" },
];

const CLASS_TYPES = [
  "Strength", "Yoga", "HIIT", "Cycling", "Pilates", "Boxing", "Mobility", "Open gym",
];

function StepPreferences({ data, update }) {
  const toggleGoal = (id) => {
    const set = new Set(data.goals || []);
    set.has(id) ? set.delete(id) : set.add(id);
    update({ goals: [...set] });
  };
  const toggleClass = (label) => {
    const set = new Set(data.classTypes || []);
    set.has(label) ? set.delete(label) : set.add(label);
    update({ classTypes: [...set] });
  };
  const selectedGoals = new Set(data.goals || []);
  const selectedClasses = new Set(data.classTypes || []);

  return (
    <div>
      <div style={sectionEyebrow}>Step 03 · Preferences</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <h1 style={{ ...stepHeadline, fontSize: 48 }}>What brings you in?</h1>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: ".22em",
          textTransform: "uppercase", color: "var(--color-fg-metadata)",
        }}>Optional</span>
      </div>
      <p style={stepLede}>
        Helps your coach tailor the first session. You can change any of this later from your profile.
      </p>

      <div style={{ marginTop: 32 }}>
        <div style={{ ...fieldBase, marginBottom: 14 }}>Your goals · pick any</div>
        <div style={{
          display: "grid", gap: 10,
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          maxWidth: 720,
        }}>
          {GOALS.map(g => {
            const active = selectedGoals.has(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGoal(g.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 16px",
                  background: active ? "rgba(34,197,94,.08)" : "rgba(17,24,39,.4)",
                  border: `1px solid ${active ? "var(--color-primary-border)" : "var(--color-border-card)"}`,
                  borderRadius: "var(--radius-lg)",
                  color: active ? "#fff" : "var(--color-fg-label)",
                  fontSize: 14, fontWeight: 500, textAlign: "left",
                  cursor: "pointer",
                  transition: "all 200ms",
                }}
              >
                <span style={{
                  width: 20, height: 20, borderRadius: 6,
                  border: `1.5px solid ${active ? "var(--color-primary)" : "var(--color-border-strong)"}`,
                  background: active ? "var(--color-primary)" : "transparent",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {active && <Icon.Check size={12} style={{ color: "#fff" }} />}
                </span>
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 36, maxWidth: 720 }}>
        <div style={{ ...fieldBase, marginBottom: 14 }}>Class types you'd try</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CLASS_TYPES.map(c => {
            const active = selectedClasses.has(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleClass(c)}
                style={{
                  padding: "9px 16px",
                  background: active ? "var(--color-primary)" : "transparent",
                  border: `1px solid ${active ? "var(--color-primary)" : "var(--color-border-strong)"}`,
                  borderRadius: 999,
                  color: active ? "#fff" : "var(--color-fg-label)",
                  fontSize: 13, fontWeight: 500,
                  cursor: "pointer", transition: "all 200ms",
                }}
              >{c}</button>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 36, maxWidth: 720 }}>
        <SelectField
          label="How often do you train now?"
          value={data.frequency}
          onChange={v => update({ frequency: v })}
          options={[
            { value: "new", label: "I'm new to training" },
            { value: "1-2", label: "1–2 times a week" },
            { value: "3-4", label: "3–4 times a week" },
            { value: "5+", label: "5 or more times a week" },
          ]}
        />
      </div>
    </div>
  );
}

/* =================================================================
   STEP 4 — EMERGENCY CONTACT + PHOTO (OPTIONAL)
   ================================================================= */
function StepContactPhoto({ data, update, toast }) {
  const [preview, setPreview] = React.useState(data.photoPreview || null);
  const fileRef = React.useRef(null);

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setPreview(url);
    update({ photoName: f.name, photoPreview: url });
  };

  const initials = ((data.firstName || "")[0] || "") + ((data.lastName || "")[0] || "");

  return (
    <div>
      <div style={sectionEyebrow}>Step 04 · Safety &amp; photo</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <h1 style={{ ...stepHeadline, fontSize: 48 }}>Contact &amp; face</h1>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: ".22em",
          textTransform: "uppercase", color: "var(--color-fg-metadata)",
        }}>Optional</span>
      </div>
      <p style={stepLede}>
        An emergency contact helps staff act fast if something happens on the floor.
        A photo makes front-desk check-in smoother.
      </p>

      <div style={{
        marginTop: 32, display: "grid",
        gridTemplateColumns: "1fr 280px", gap: 32,
        maxWidth: 900, alignItems: "start",
      }}>
        <div style={{ display: "grid", gap: 18 }}>
          <TextField
            label="Emergency contact name"
            value={data.emergencyName}
            onChange={v => update({ emergencyName: v })}
            placeholder="Sam Reyes"
          />
          <TextField
            label="Emergency contact phone" type="tel"
            value={data.emergencyPhone}
            onChange={v => update({ emergencyPhone: v })}
            placeholder="(347) 555-0122"
          />
          <TextField
            label="Relationship"
            value={data.emergencyRelation}
            onChange={v => update({ emergencyRelation: v })}
            placeholder="Partner, parent, sibling, friend…"
          />
        </div>

        <div>
          <div style={{ ...fieldBase, marginBottom: 10 }}>Profile photo</div>
          <div style={{
            width: "100%", aspectRatio: "1",
            borderRadius: "var(--radius-2xl)",
            border: `1.5px dashed ${preview ? "transparent" : "var(--color-border-strong)"}`,
            background: preview
              ? "transparent"
              : "rgba(17,24,39,.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", position: "relative",
          }}>
            {preview ? (
              <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{
                width: 96, height: 96, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 36, fontWeight: 700, color: "#0F0F0F",
                fontFamily: "var(--font-display)",
              }}>
                {initials.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <input
            ref={fileRef} type="file" accept="image/*"
            onChange={onFile} style={{ display: "none" }}
          />
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button type="button" onClick={() => fileRef.current && fileRef.current.click()}
              style={{
                flex: 1, padding: "10px 14px",
                background: "transparent",
                border: "1px solid var(--color-primary)",
                color: "var(--color-primary-light)",
                borderRadius: "var(--radius-md)",
                fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}>
              {preview ? "Replace" : "Upload photo"}
            </button>
            {preview && (
              <button type="button" onClick={() => { setPreview(null); update({ photoName: null, photoPreview: null }); }}
                style={{
                  padding: "10px 14px",
                  background: "transparent",
                  border: "1px solid var(--color-border-strong)",
                  color: "var(--color-fg-muted)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                }}>Remove</button>
            )}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--color-fg-muted)" }}>
            JPG or PNG · under 5 MB.
          </div>
        </div>
      </div>
    </div>
  );
}

/* =================================================================
   STEP 5 — MEMBERSHIP
   ================================================================= */
const PLANS_ON = [
  { id: "monthly",   name: "Monthly",   price: "$45",  per: "/ month",
    duration: "30-day access", bookings: "12 class bookings",
    description: "Pay month to month. Cancel any time.", featured: false },
  { id: "quarterly", name: "Quarterly", price: "$120", per: "/ 90 days",
    duration: "90-day access", bookings: "Unlimited class bookings",
    description: "Best for building a routine.", featured: true },
  { id: "annual",    name: "Annual",    price: "$399", per: "/ year",
    duration: "365-day access", bookings: "Unlimited class bookings",
    description: "Biggest savings for committed members.", featured: false },
];

function StepMembership({ data, update }) {
  const selected = data.plan;
  return (
    <div>
      <div style={sectionEyebrow}>Step 05 · Membership</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <h1 style={{ ...stepHeadline, fontSize: 48 }}>Pick your access</h1>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: ".22em",
          textTransform: "uppercase", color: "var(--color-fg-metadata)",
        }}>Optional</span>
      </div>
      <p style={stepLede}>
        Booking opens after a plan is active. Skip if you'd rather compare later — your account
        still gets saved and you can activate any time from your profile.
      </p>

      <div style={{
        marginTop: 32, display: "grid", gap: 16,
        gridTemplateColumns: "repeat(3, 1fr)", maxWidth: 1000,
      }}>
        {PLANS_ON.map(p => {
          const active = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => update({ plan: active ? null : p.id })}
              style={{
                textAlign: "left", cursor: "pointer",
                padding: 24,
                background: active
                  ? "rgba(34,197,94,.07)"
                  : "rgba(17,24,39,.5)",
                border: `1.5px solid ${active ? "var(--color-primary)" : "var(--color-border-card)"}`,
                borderRadius: "var(--radius-2xl)",
                boxShadow: active ? "0 20px 40px -12px rgba(34,197,94,.25)" : "var(--shadow-md)",
                transition: "all 200ms",
                position: "relative",
                display: "flex", flexDirection: "column",
                minHeight: 340,
              }}
            >
              {p.featured && (
                <span style={{
                  position: "absolute", top: -12, left: 24,
                  background: "var(--color-accent)", color: "#fff",
                  fontSize: 11, fontWeight: 700, letterSpacing: ".14em",
                  textTransform: "uppercase",
                  padding: "5px 11px", borderRadius: 9999,
                }}>Featured</span>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div className="eyebrow" style={{ letterSpacing: ".22em" }}>{p.duration}</div>
                  <div style={{ marginTop: 10, fontSize: 22, fontWeight: 600, color: "#fff" }}>{p.name}</div>
                </div>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%",
                  border: `2px solid ${active ? "var(--color-primary)" : "var(--color-border-strong)"}`,
                  background: active ? "var(--color-primary)" : "transparent",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {active && <Icon.Check size={12} style={{ color: "#fff" }} />}
                </span>
              </div>

              <div style={{ marginTop: 16, display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{
                  fontFamily: "var(--font-display)", fontSize: 54, fontWeight: 700,
                  color: active ? "var(--color-primary-light)" : "#fff",
                  lineHeight: 1, letterSpacing: "-0.01em",
                }}>{p.price}</span>
                <span style={{ fontSize: 13, color: "var(--color-fg-muted)" }}>{p.per}</span>
              </div>

              <p style={{ marginTop: 14, fontSize: 13, lineHeight: 1.5, color: "var(--color-fg-muted)" }}>
                {p.description}
              </p>

              <div style={{
                marginTop: "auto", paddingTop: 20,
                borderTop: "1px solid var(--color-border-card)",
                fontSize: 13, color: "var(--color-fg-label)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <Icon.Check size={14} style={{ color: "var(--color-primary-light)" }} /> {p.bookings}
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => update({ plan: null })}
        style={{
          marginTop: 20, padding: "12px 16px",
          background: !selected ? "rgba(17,24,39,.6)" : "transparent",
          border: `1px solid ${!selected ? "var(--color-primary)" : "var(--color-border-card)"}`,
          borderRadius: "var(--radius-lg)",
          color: !selected ? "#fff" : "var(--color-fg-muted)",
          fontSize: 13, fontWeight: 500, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 10,
          maxWidth: 1000, width: "100%", justifyContent: "flex-start",
          textAlign: "left",
        }}>
        <span style={{
          width: 18, height: 18, borderRadius: "50%",
          border: `2px solid ${!selected ? "var(--color-primary)" : "var(--color-border-strong)"}`,
          background: !selected ? "var(--color-primary)" : "transparent",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          {!selected && <Icon.Check size={10} style={{ color: "#fff" }} />}
        </span>
        Not now — I'll decide later. Booking stays locked until a plan is active.
      </button>

      <div style={{
        marginTop: 16, fontSize: 12, color: "var(--color-fg-muted)",
      }}>
        Payment is handled on the next step after onboarding — no charge yet.
      </div>
    </div>
  );
}

/* =================================================================
   STEP 6 — FIRST BOOKING (only if plan chosen)
   ================================================================= */
const CLASSES_FIRST = [
  { id: "c1", day: "Tomorrow", date: "Apr 20", time: "7:00am", name: "Morning Flow Yoga", coach: "Priya M", room: "Studio B", duration: "60 min", spots: "5 left" },
  { id: "c2", day: "Tomorrow", date: "Apr 20", time: "6:30pm", name: "Strength Foundations", coach: "Jordan K", room: "Studio A", duration: "60 min", spots: "4 left" },
  { id: "c3", day: "Wed",      date: "Apr 22", time: "6:30am", name: "Mobility + Core",      coach: "Priya M", room: "Studio A", duration: "45 min", spots: "7 left" },
  { id: "c4", day: "Sat",      date: "Apr 25", time: "9:00am", name: "HIIT Intervals",       coach: "Mia T",   room: "Main Floor", duration: "45 min", spots: "8 left" },
];
const TRAINERS_FIRST = [
  {
    id: "t1", name: "Jordan Kim", focus: "Strength & powerlifting", rating: "4.9",
    bio: "10 years coaching lifters of every level. Technique-first, patient.",
    slots: [
      { day: "Tue", date: "Apr 21", time: "10:00am" },
      { day: "Tue", date: "Apr 21", time: "5:30pm" },
      { day: "Wed", date: "Apr 22", time: "7:00am" },
      { day: "Thu", date: "Apr 23", time: "11:00am" },
      { day: "Fri", date: "Apr 24", time: "6:00pm" },
      { day: "Sat", date: "Apr 25", time: "8:00am" },
    ],
  },
  {
    id: "t2", name: "Priya Menon", focus: "Mobility, yoga, recovery", rating: "5.0",
    bio: "RYT-500. Great for new lifters working on range of motion.",
    slots: [
      { day: "Wed", date: "Apr 22", time: "8:30am" },
      { day: "Wed", date: "Apr 22", time: "4:00pm" },
      { day: "Thu", date: "Apr 23", time: "8:00am" },
      { day: "Fri", date: "Apr 24", time: "12:00pm" },
    ],
  },
  {
    id: "t3", name: "Mia Tanaka", focus: "HIIT, conditioning, running", rating: "4.8",
    bio: "Former collegiate sprinter. Builds engines that hold up.",
    slots: [
      { day: "Tue", date: "Apr 21", time: "6:30am" },
      { day: "Thu", date: "Apr 23", time: "5:00pm" },
      { day: "Thu", date: "Apr 23", time: "6:30pm" },
      { day: "Sat", date: "Apr 25", time: "10:00am" },
      { day: "Sun", date: "Apr 26", time: "9:00am" },
    ],
  },
];

function StepBooking({ data, update }) {
  const [mode, setMode] = React.useState(data.bookingType || "class");
  const [trainerExpanded, setTrainerExpanded] = React.useState(() => {
    if ((data.bookingType || "class") === "trainer" && data.bookingId) {
      return String(data.bookingId).split(":")[0];
    }
    return null;
  });
  const setType = (t) => {
    setMode(t);
    setTrainerExpanded(null);
    update({ bookingType: t, bookingId: null });
  };
  const picked = data.bookingId;

  return (
    <div>
      <div style={sectionEyebrow}>Step 05 · First booking</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <h1 style={{ ...stepHeadline, fontSize: 48 }}>Book your<br />first session</h1>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: ".22em",
          textTransform: "uppercase", color: "var(--color-fg-metadata)",
        }}>Optional</span>
      </div>
      <p style={stepLede}>
        Your plan will be active the moment you finish onboarding. Lock in a first class
        or personal training session, or skip and browse the full schedule later.
      </p>

      {/* Mode toggle */}
      <div style={{
        marginTop: 28, display: "inline-flex", padding: 4,
        background: "rgba(17,24,39,.6)",
        border: "1px solid var(--color-border-card)",
        borderRadius: "var(--radius-full)",
      }}>
        {[["class", "Group class"], ["trainer", "Personal training"]].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setType(k)}
            style={{
              padding: "8px 18px", borderRadius: 9999,
              background: mode === k ? "var(--color-primary)" : "transparent",
              color: mode === k ? "#fff" : "var(--color-fg-label)",
              border: 0, fontSize: 13, fontWeight: 500, cursor: "pointer",
              transition: "all 200ms",
            }}>{l}</button>
        ))}
      </div>

      {mode === "class" ? (
        <div style={{ marginTop: 20, display: "grid", gap: 10, maxWidth: 780 }}>
          {CLASSES_FIRST.map(it => {
            const active = picked === it.id;
            return (
              <button key={it.id} type="button"
                onClick={() => update({ bookingId: active ? null : it.id })}
                style={{
                  textAlign: "left", cursor: "pointer",
                  padding: "16px 20px",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  alignItems: "center", gap: 18,
                  background: active ? "rgba(34,197,94,.07)" : "var(--color-bg-surface-1)",
                  border: `1.5px solid ${active ? "var(--color-primary)" : "var(--color-border-card)"}`,
                  borderRadius: "var(--radius-lg)",
                  transition: "all 200ms",
                }}>
                <div style={{
                  width: 82, padding: "12px 8px", textAlign: "center",
                  background: "var(--color-bg-surface-2)",
                  border: "1px solid var(--color-border-card)",
                  borderRadius: "var(--radius-md)",
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: ".12em",
                    textTransform: "uppercase", color: "var(--color-fg-muted)",
                  }}>{it.day}</div>
                  <div style={{ marginTop: 6, fontSize: 16, fontWeight: 700, color: "#fff" }}>{it.time}</div>
                  <div style={{ marginTop: 3, fontSize: 10, color: "var(--color-fg-muted)" }}>{it.date}</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{it.name}</div>
                  <div style={{
                    marginTop: 6, display: "flex", gap: 14, flexWrap: "wrap",
                    fontSize: 12, color: "var(--color-fg-muted)",
                  }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Icon.Users size={12} /> {it.coach}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Icon.MapPin size={12} /> {it.room}
                    </span>
                    <span>{it.duration} · {it.spots}</span>
                  </div>
                </div>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%",
                  border: `2px solid ${active ? "var(--color-primary)" : "var(--color-border-strong)"}`,
                  background: active ? "var(--color-primary)" : "transparent",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {active && <Icon.Check size={12} style={{ color: "#fff" }} />}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ marginTop: 20, display: "grid", gap: 14, maxWidth: 820 }}>
          {TRAINERS_FIRST.map(tr => {
            const initials = tr.name.split(" ").map(s => s[0]).join("");
            const expanded = trainerExpanded === tr.id;
            const pickedSlotIdx = picked && picked.startsWith(tr.id + ":")
              ? parseInt(picked.split(":")[1], 10)
              : -1;
            const trainerHasPick = pickedSlotIdx >= 0;

            return (
              <div key={tr.id} style={{
                background: trainerHasPick ? "rgba(34,197,94,.05)" : "var(--color-bg-surface-1)",
                border: `1.5px solid ${trainerHasPick ? "var(--color-primary)" : "var(--color-border-card)"}`,
                borderRadius: "var(--radius-lg)",
                transition: "all 200ms",
                overflow: "hidden",
              }}>
                {/* Trainer header row (clickable to expand calendar) */}
                <button type="button"
                  onClick={() => setTrainerExpanded(expanded ? null : tr.id)}
                  style={{
                    width: "100%", textAlign: "left", cursor: "pointer",
                    padding: "16px 20px",
                    display: "grid", gridTemplateColumns: "auto 1fr auto",
                    alignItems: "center", gap: 18,
                    background: "transparent",
                    border: 0,
                  }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, fontWeight: 700, color: "#0F0F0F",
                    fontFamily: "var(--font-display)",
                  }}>{initials}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{tr.name}</span>
                      {trainerHasPick && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "2px 10px",
                          background: "rgba(34,197,94,.12)",
                          border: "1px solid var(--color-primary-border)",
                          borderRadius: 999,
                          fontSize: 11, fontWeight: 600,
                          color: "var(--color-primary-light)",
                          letterSpacing: ".06em",
                        }}>
                          <Icon.Check size={12} />
                          {tr.slots[pickedSlotIdx].day} {tr.slots[pickedSlotIdx].time}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "var(--color-fg-muted)", display: "flex", gap: 14, flexWrap: "wrap" }}>
                      <span>{tr.focus}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Icon.Star size={12} style={{ color: "var(--color-accent-text)" }} /> {tr.rating}
                      </span>
                      <span>{tr.slots.length} open slots this week</span>
                    </div>
                  </div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    fontSize: 12, fontWeight: 600,
                    color: expanded ? "var(--color-primary-light)" : "var(--color-fg-label)",
                  }}>
                    {expanded ? "Hide calendar" : trainerHasPick ? "Change slot" : "See availability"}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      style={{ transition: "transform 200ms", transform: expanded ? "rotate(180deg)" : "none" }}>
                      <path strokeLinecap="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>

                {expanded && (
                  <div style={{
                    padding: "4px 20px 20px",
                    borderTop: "1px solid var(--color-border-card)",
                    marginTop: 4,
                  }}>
                    <div style={{
                      marginTop: 16, fontSize: 12, color: "var(--color-fg-muted)",
                      lineHeight: 1.55,
                    }}>{tr.bio}</div>
                    <div style={{
                      marginTop: 16,
                      fontSize: 11, fontWeight: 600, letterSpacing: ".22em",
                      textTransform: "uppercase", color: "var(--color-fg-metadata)",
                    }}>Available this week · 60 min sessions</div>
                    <TrainerCalendar
                      slots={tr.slots}
                      selectedIdx={pickedSlotIdx}
                      onSelect={(idx) => {
                        const newId = tr.id + ":" + idx;
                        update({ bookingId: picked === newId ? null : newId });
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* Calendar-style grouped slot picker for a single trainer. */
function TrainerCalendar({ slots, selectedIdx, onSelect }) {
  // Group slots by day+date
  const groups = [];
  const byDay = {};
  slots.forEach((s, idx) => {
    const key = s.day + "·" + s.date;
    if (!byDay[key]) {
      byDay[key] = { day: s.day, date: s.date, entries: [] };
      groups.push(byDay[key]);
    }
    byDay[key].entries.push({ ...s, idx });
  });

  return (
    <div style={{
      marginTop: 12,
      display: "grid", gap: 10,
      gridTemplateColumns: `repeat(${groups.length}, minmax(112px, 1fr))`,
    }}>
      {groups.map((g) => (
        <div key={g.day + g.date} style={{
          background: "var(--color-bg-page)",
          border: "1px solid var(--color-border-card)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{
            padding: "8px 10px",
            background: "var(--color-bg-surface-2)",
            borderBottom: "1px solid var(--color-border-card)",
            textAlign: "center",
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: ".12em",
              textTransform: "uppercase", color: "var(--color-fg-muted)",
            }}>{g.day}</div>
            <div style={{
              marginTop: 2, fontSize: 13, fontWeight: 600, color: "#fff",
            }}>{g.date}</div>
          </div>
          <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {g.entries.map((e) => {
              const sel = selectedIdx === e.idx;
              return (
                <button key={e.idx} type="button"
                  onClick={() => onSelect(e.idx)}
                  style={{
                    padding: "8px 8px",
                    background: sel ? "var(--color-primary)" : "transparent",
                    color: sel ? "#fff" : "var(--color-fg-label)",
                    border: `1px solid ${sel ? "var(--color-primary)" : "var(--color-border-input)"}`,
                    borderRadius: "var(--radius-md)",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    transition: "all 150ms",
                  }}>{e.time}</button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* =================================================================
   STEP 7 — TERMS & NOTIFICATIONS (placeholder)
   ================================================================= */
function StepTerms({ data, update }) {
  const toggle = (k) => update({ [k]: !data[k] });
  return (
    <div>
      <div style={sectionEyebrow}>Step 07 · Final check</div>
      <h1 style={{ ...stepHeadline, fontSize: 48 }}>Last little bit</h1>
      <p style={stepLede}>
        Agree to the terms of use and pick how we can reach you. You can change
        notification preferences any time from your profile.
      </p>

      <div style={{
        marginTop: 32, display: "grid", gap: 14, maxWidth: 720,
      }}>
        {[
          ["agreeTerms", "I agree to the GymFlow terms of use", "Covers gym floor conduct, booking policy, and cancellation terms.", true],
          ["agreeWaiver", "I acknowledge the health and liability waiver", "Standard waiver for training, classes, and open gym access.", true],
          ["notifBooking", "Booking reminders", "A heads-up the day before, and a nudge 2 hours before class.", false],
          ["notifNews", "Weekly studio highlights", "New classes, trainer spotlights, and schedule changes — once a week.", false],
        ].map(([k, label, help, required]) => (
          <label key={k} style={{
            display: "grid", gridTemplateColumns: "auto 1fr",
            gap: 14, padding: "18px 20px",
            background: "rgba(17,24,39,.4)",
            border: `1px solid ${data[k] ? "var(--color-primary-border)" : "var(--color-border-card)"}`,
            borderRadius: "var(--radius-lg)",
            cursor: "pointer", transition: "border-color 200ms",
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: 6, marginTop: 1,
              border: `1.5px solid ${data[k] ? "var(--color-primary)" : "var(--color-border-strong)"}`,
              background: data[k] ? "var(--color-primary)" : "transparent",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, cursor: "pointer",
            }}
              onClick={(e) => { e.preventDefault(); toggle(k); }}
              role="checkbox" aria-checked={!!data[k]}
            >
              {data[k] && <Icon.Check size={14} style={{ color: "#fff" }} />}
            </span>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{label}</span>
                {required && <span style={{ fontSize: 11, color: "var(--color-primary-light)" }}>Required</span>}
              </div>
              <div style={{ marginTop: 4, fontSize: 13, color: "var(--color-fg-muted)", lineHeight: 1.5 }}>{help}</div>
            </div>
            <input
              type="checkbox" checked={!!data[k]}
              onChange={() => toggle(k)}
              style={{ display: "none" }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

/* =================================================================
   DONE SCREEN
   ================================================================= */
function StepDone({ data, onEnter }) {
  const firstName = (data.firstName || "").trim() || "there";
  const plan = PLANS_ON.find(p => p.id === data.plan);
  const booking = data.bookingId
    ? (data.bookingType === "trainer"
        ? TRAINERS_FIRST.find(t => t.id === data.bookingId)
        : CLASSES_FIRST.find(c => c.id === data.bookingId))
    : null;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", padding: "20px 0 60px" }}>
      <div style={{
        width: 96, height: 96, margin: "0 auto",
        borderRadius: "50%",
        background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 20px 40px -12px rgba(34,197,94,.4)",
      }}>
        <Icon.Check size={40} style={{ color: "#0F0F0F" }} />
      </div>
      <div style={{ marginTop: 28, ...sectionEyebrow, letterSpacing: ".28em" }}>All set</div>
      <h1 style={{
        marginTop: 16, fontFamily: "var(--font-display)", fontSize: 64,
        fontWeight: 700, color: "#fff", lineHeight: .95,
        textTransform: "uppercase",
      }}>
        Welcome to<br />GymFlow, {firstName}.
      </h1>
      <p style={{ marginTop: 18, fontSize: 16, color: "var(--color-fg-muted)", lineHeight: 1.55 }}>
        Your profile is saved. Here's where you stand.
      </p>

      <div style={{
        marginTop: 32, textAlign: "left",
        padding: 20,
        background: "rgba(17,24,39,.6)",
        border: "1px solid var(--color-border-card)",
        borderRadius: "var(--radius-xl)",
        display: "grid", gap: 12,
      }}>
        {[
          ["Profile", `${data.firstName} ${data.lastName}`.trim()],
          ["Membership", plan ? `${plan.name} — ${plan.price}${plan.per}` : "None yet — choose any time from Profile"],
          ["First booking", booking
            ? (data.bookingType === "trainer"
              ? `PT with ${booking.name} · ${booking.next}`
              : `${booking.name} · ${booking.day} ${booking.time}`)
            : "Not booked — schedule is open once you log in"],
        ].map(([k, v]) => (
          <div key={k} style={{
            display: "grid", gridTemplateColumns: "140px 1fr", gap: 12,
            paddingBottom: 12, borderBottom: "1px solid var(--color-border-card)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-metadata)", letterSpacing: ".18em", textTransform: "uppercase" }}>{k}</div>
            <div style={{ fontSize: 14, color: "#fff" }}>{v}</div>
          </div>
        ))}
      </div>

      <button onClick={onEnter}
        style={{
          marginTop: 28,
          padding: "14px 28px", background: "var(--color-primary)", color: "#fff",
          border: 0, borderRadius: "var(--radius-lg)",
          fontSize: 15, fontWeight: 600, cursor: "pointer",
          boxShadow: "0 10px 15px -3px rgba(34,197,94,.25)",
          display: "inline-flex", alignItems: "center", gap: 10,
        }}>
        Enter GymFlow
        <Icon.ArrowRight size={16} />
      </button>
    </div>
  );
}

Object.assign(window, {
  StepWelcome, StepProfile, StepPreferences, StepContactPhoto,
  StepMembership, StepBooking, StepTerms, StepDone,
  PLANS_ON, CLASSES_FIRST, TRAINERS_FIRST,
});
