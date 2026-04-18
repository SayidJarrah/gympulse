/* Profile — personal info + membership control. Pulse DNA. */

const PROFILE = {
  name: "Dana Reyes",
  email: "dana.reyes@gmail.com",
  phone: "(347) 555-0199",
  dob: "1992-08-14",
  emergencyContact: "Sam Reyes · (347) 555-0122",
  memberSince: "March 2024",
  avatarInitial: "D",
};

const MEMBERSHIP = {
  plan: "Quarterly",
  price: "$120 / 90 days",
  status: "Active",
  renews: "May 2, 2026",
  renewsInDays: 12,
  bookingsUsed: 4,
  bookingsMax: 12,
  paymentMethod: "Visa ending 4421",
  nextCharge: "$120 on May 2",
  autoRenew: true,
};

/* ---------- Shared row primitive ---------- */
function Field({ label, value, onEdit }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "160px 1fr auto",
      alignItems: "center", gap: 16,
      padding: "18px 0",
      borderTop: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-metadata)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 15, color: "#fff", fontWeight: 500 }}>{value}</div>
      <button onClick={onEdit} style={{
        padding: "6px 12px", background: "transparent",
        border: "1px solid rgba(255,255,255,0.1)", color: "var(--color-fg-label)",
        borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer",
      }}>Edit</button>
    </div>
  );
}

/* ---------- Personal information ---------- */
function PersonalInfo({ onToast }) {
  const e = (f) => () => onToast && onToast(`Edit "${f}" — stub`);
  return (
    <div style={{
      padding: "28px 28px 12px",
      background: "rgba(255,255,255,0.02)",
      border: "1px solid var(--color-border-card)",
      borderRadius: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "linear-gradient(135deg, #22C55E, #4ADE80)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, fontWeight: 700, color: "#0F0F0F",
          boxShadow: "0 8px 24px rgba(34,197,94,0.25)",
        }}>{PROFILE.avatarInitial}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-metadata)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Personal information
          </div>
          <div style={{ marginTop: 6, fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "-0.01em" }}>
            {PROFILE.name}
          </div>
          <div style={{ marginTop: 3, fontSize: 12, color: "var(--color-fg-muted)" }}>
            Member since {PROFILE.memberSince}
          </div>
        </div>
        <button onClick={() => onToast && onToast("Change avatar — stub")} style={{
          padding: "8px 14px", background: "transparent",
          border: "1px solid rgba(255,255,255,0.15)", color: "#fff",
          borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer",
          whiteSpace: "nowrap",
        }}>Change photo</button>
      </div>

      <div style={{ marginTop: 24 }}>
        <Field label="Full name" value={PROFILE.name} onEdit={e("name")} />
        <Field label="Email" value={PROFILE.email} onEdit={e("email")} />
        <Field label="Phone" value={PROFILE.phone} onEdit={e("phone")} />
        <Field label="Date of birth" value="Aug 14, 1992" onEdit={e("dob")} />
        <Field label="Emergency contact" value={PROFILE.emergencyContact} onEdit={e("emergency")} />
      </div>
    </div>
  );
}

/* ---------- Membership control ---------- */
function MembershipControl({ onToast }) {
  const pct = (MEMBERSHIP.bookingsUsed / MEMBERSHIP.bookingsMax) * 100;
  return (
    <div style={{
      padding: 28,
      background: "linear-gradient(180deg, rgba(34,197,94,0.06), rgba(255,255,255,0.02) 70%)",
      border: "1px solid var(--color-border-card)",
      borderRadius: 16,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -40, right: -40, width: 220, height: 220,
        background: "radial-gradient(circle, rgba(34,197,94,0.18), transparent 70%)",
        filter: "blur(20px)", pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-metadata)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Membership
          </div>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "3px 10px", background: "rgba(34,197,94,0.1)",
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
        <div style={{ marginTop: 6, fontSize: 13, color: "var(--color-fg-muted)" }}>{MEMBERSHIP.price}</div>

        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>Bookings this cycle</div>
            <div style={{ fontSize: 12, color: "#fff", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
              {MEMBERSHIP.bookingsUsed} / {MEMBERSHIP.bookingsMax}
            </div>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{
              width: `${pct}%`, height: "100%",
              background: "linear-gradient(90deg, var(--color-primary), var(--color-primary-light))",
              borderRadius: 999,
              boxShadow: "0 0 12px rgba(34,197,94,0.5)",
            }} />
          </div>
        </div>

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
            <div style={{ marginTop: 2, fontSize: 11, color: "var(--color-fg-muted)" }}>{MEMBERSHIP.nextCharge}</div>
          </div>
          <div style={{
            fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700,
            color: "var(--color-primary-light)", letterSpacing: "-0.01em",
            fontVariantNumeric: "tabular-nums",
          }}>
            {MEMBERSHIP.renewsInDays}<span style={{ fontSize: 12, color: "var(--color-fg-muted)", marginLeft: 4, fontWeight: 500 }}>days</span>
          </div>
        </div>

        <div style={{
          marginTop: 16, padding: "14px 16px",
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-fg-metadata)", letterSpacing: "0.22em", textTransform: "uppercase" }}>Payment</div>
            <div style={{ marginTop: 3, fontSize: 14, fontWeight: 500, color: "#fff" }}>{MEMBERSHIP.paymentMethod}</div>
          </div>
          <button onClick={() => onToast && onToast("Update payment — stub")} style={{
            padding: "6px 12px", background: "transparent",
            border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-fg-label)",
            borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer",
          }}>Update</button>
        </div>

        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button onClick={() => onToast && onToast("Change plan — stub")} style={{
            padding: "12px 16px",
            background: "var(--color-primary)", color: "#0F0F0F",
            border: "none", borderRadius: 8,
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 8px 24px rgba(34,197,94,0.3)",
          }}>Change plan</button>
          <button onClick={() => onToast && onToast("Pause membership — stub")} style={{
            padding: "12px 16px",
            background: "transparent", color: "#fff",
            border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Pause</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Account actions (sign out / cancel) ---------- */
function AccountActions({ onToast }) {
  return (
    <div style={{
      padding: 24,
      background: "rgba(255,255,255,0.02)",
      border: "1px solid var(--color-border-card)",
      borderRadius: 16,
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20,
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-fg-metadata)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Account
        </div>
        <div style={{ marginTop: 6, fontSize: 15, fontWeight: 600, color: "#fff" }}>
          Sign out or close your account
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-fg-muted)" }}>
          Cancelling ends your plan at the current cycle's end — no refund for unused days.
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => onToast && onToast("Change password — stub")} style={{
          padding: "10px 16px", background: "transparent",
          border: "1px solid rgba(255,255,255,0.15)", color: "#fff",
          borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer",
          whiteSpace: "nowrap",
        }}>Change password</button>
        <button onClick={() => onToast && onToast("Signed out — stub")} style={{
          padding: "10px 16px", background: "transparent",
          border: "1px solid rgba(255,255,255,0.15)", color: "#fff",
          borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer",
          whiteSpace: "nowrap",
        }}>Sign out</button>
        <button onClick={() => onToast && onToast("Cancel membership — stub")} style={{
          padding: "10px 16px", background: "transparent",
          border: "1px solid rgba(239,68,68,0.3)", color: "#F87171",
          borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer",
          whiteSpace: "nowrap",
        }}>Cancel membership</button>
      </div>
    </div>
  );
}

Object.assign(window, { PersonalInfo, MembershipControl, AccountActions });
