/* GymFlow member kit — Components
   Load with <script type="text/babel" src="components.jsx">
   Shares components globally at the bottom. */

// -------------------- Icons (Heroicons v2 outline, stroke=1.5) --------------------
const Icon = {};
function mkIcon(paths) {
  return function IconCmp({ size = 20, className = "", style, ...rest }) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        width={size}
        height={size}
        className={className}
        style={style}
        aria-hidden="true"
        {...rest}
      >
        {paths}
      </svg>
    );
  };
}
Icon.Bell = mkIcon(<path d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />);
Icon.Search = mkIcon(<path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />);
Icon.Eye = mkIcon(<><path d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><circle cx="12" cy="12" r="3" /></>);
Icon.EyeSlash = mkIcon(<path d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />);
Icon.X = mkIcon(<path d="M6 18 18 6M6 6l12 12" />);
Icon.Plus = mkIcon(<path d="M12 4.5v15m7.5-7.5h-15" />);
Icon.ChevronDown = mkIcon(<path d="m19.5 8.25-7.5 7.5-7.5-7.5" />);
Icon.ChevronRight = mkIcon(<path d="m8.25 4.5 7.5 7.5-7.5 7.5" />);
Icon.ChevronLeft = mkIcon(<path d="M15.75 19.5 8.25 12l7.5-7.5" />);
Icon.Calendar = mkIcon(<path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />);
Icon.Users = mkIcon(<path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />);
Icon.Star = mkIcon(<path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111 5.517.442c.499.04.701.663.321.988l-4.204 3.602 1.285 5.385a.562.562 0 0 1-.84.61L12 16.347l-4.725 2.885a.562.562 0 0 1-.84-.61l1.285-5.386-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442z" />);
Icon.Check = mkIcon(<path d="m4.5 12.75 6 6 9-13.5" />);
Icon.ArrowRight = mkIcon(<path d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />);
Icon.Clock = mkIcon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
Icon.MapPin = mkIcon(<><path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1 1 15 0Z" /></>);
Icon.Heart = mkIcon(<path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />);

function Bolt({ size = 20 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M13 2L4.5 13.5H11L9 22L19.5 9.5H13.5L16 2Z" fill="white" />
    </svg>
  );
}

// -------------------- Logo --------------------
function LogoMark({ size = "sm", variant = "filled" }) {
  const sz = size === "lg" ? 44 : size === "md" ? 40 : 36;
  const iconSz = Math.round(sz * 0.55);
  if (variant === "outline") {
    // MemberNav mark — outlined square with dumbbell glyph
    return (
      <svg width={sz} height={sz} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" rx="7" stroke="#22C55E" strokeWidth="2" />
        <path d="M10 11v10M22 11v10M10 16h12" stroke="#22C55E" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <span className={`logo-mark logo-mark--${size}`} style={{ width: sz, height: sz }}>
      <Bolt size={iconSz} />
    </span>
  );
}

function LogoLockup({ compact = false }) {
  return (
    <span className="logo-lockup">
      <LogoMark size={compact ? "sm" : "lg"} />
      <span>
        <span className="wordmark">GymFlow</span>
        {!compact && <div className="sublabel">Membership-first training</div>}
      </span>
    </span>
  );
}

// -------------------- Button --------------------
function Button({ variant = "primary", size = "md", block, children, leading, trailing, ...rest }) {
  const cls = `btn btn-${variant}${size === "lg" ? " btn-lg" : ""}${block ? " btn-block" : ""}`;
  return (
    <button className={cls} {...rest}>
      {leading}
      <span>{children}</span>
      {trailing}
    </button>
  );
}

function IconButton({ label, children, style, ...rest }) {
  return (
    <button
      aria-label={label}
      className="btn btn-ghost"
      style={{ padding: 8, borderRadius: 9999, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}

// -------------------- Inputs --------------------
function FieldLabel({ children, htmlFor }) {
  return <label className="input-label" htmlFor={htmlFor}>{children}</label>;
}

function Input({ label, error, help, leading, trailing, id, ...rest }) {
  const autoId = React.useId();
  const inputId = id || autoId;
  const wrapCls = "input-wrap" + (leading ? " input-wrap--icon" : "");
  return (
    <div>
      {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
      <div className={wrapCls}>
        {leading && <span className="icon-lead">{leading}</span>}
        <input id={inputId} className={"input" + (error ? " input--error" : "")} {...rest} />
        {trailing}
      </div>
      {(error || help) && (
        <div className={"input-help" + (error ? " input-help--error" : "")}>{error || help}</div>
      )}
    </div>
  );
}

function PasswordInput({ label = "Password", ...rest }) {
  const [show, setShow] = React.useState(false);
  return (
    <Input
      label={label}
      type={show ? "text" : "password"}
      trailing={
        <button
          type="button"
          className="icon-trail"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={() => setShow(s => !s)}
        >
          {show ? <Icon.EyeSlash size={18} /> : <Icon.Eye size={18} />}
        </button>
      }
      {...rest}
    />
  );
}

// -------------------- Badge & Pill --------------------
function Badge({ variant = "neutral", size, children, leading }) {
  return (
    <span className={`badge badge--${variant}${size === "sm" ? " badge--sm" : ""}`}>
      {leading}
      {children}
    </span>
  );
}

// -------------------- Avatar --------------------
function Avatar({ name = "U", size = 36, src }) {
  const initials = name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {src ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </span>
  );
}

// -------------------- Card --------------------
function Card({ variant = "default", hero, interactive, children, style, ...rest }) {
  const cls = "card" +
    (hero ? " card--hero" : "") +
    (variant === "flat" ? " card--flat" : "") +
    (interactive ? " card--interactive" : "");
  return (
    <div className={cls} style={style} {...rest}>
      {children}
    </div>
  );
}

// -------------------- Stat tile (used in MemberHomeHero) --------------------
function StatTile({ label, value }) {
  return (
    <div style={{
      background: "#0F0F0F",
      border: "1px solid var(--color-border-card)",
      borderRadius: "var(--radius-xl)",
      padding: "14px 16px",
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: "0.18em",
        textTransform: "uppercase", color: "var(--color-fg-metadata)"
      }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 20, fontWeight: 600, color: "#fff" }}>{value}</div>
    </div>
  );
}

// -------------------- Plan Card --------------------
function PlanCard({ plan, onAction, actionLabel = "Choose plan", highlighted = false }) {
  return (
    <article
      style={{
        display: "flex", flexDirection: "column", height: "100%",
        background: highlighted ? "rgba(34,197,94,.04)" : "rgba(17,24,39,.7)",
        border: `1px solid ${highlighted ? "rgba(34,197,94,.4)" : "var(--color-border-card)"}`,
        borderRadius: "var(--radius-2xl)",
        padding: 24, boxShadow: "var(--shadow-xl)",
        position: "relative",
      }}
    >
      {highlighted && (
        <span style={{
          position: "absolute", top: -12, left: 24,
          background: "var(--color-accent)", color: "#fff",
          fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase",
          padding: "4px 10px", borderRadius: 9999
        }}>Featured</span>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <div className="eyebrow" style={{ letterSpacing: "0.24em" }}>{plan.duration}</div>
          <h3 style={{ marginTop: 12, fontSize: 24, fontWeight: 600, color: "#fff" }}>{plan.name}</h3>
        </div>
        <span style={{ fontSize: 30, fontWeight: 700, color: "var(--color-primary-light)" }}>{plan.price}</span>
      </div>
      <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.55, color: "var(--color-fg-muted)" }}>{plan.description}</p>
      <dl style={{
        marginTop: 20, display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr",
        background: "rgba(15,15,15,.7)", border: "1px solid var(--color-border-card)",
        borderRadius: "var(--radius-xl)", padding: 16,
      }}>
        <div>
          <dt className="eyebrow" style={{ letterSpacing: "0.2em" }}>Duration</dt>
          <dd style={{ marginTop: 6, fontSize: 14, fontWeight: 500, color: "#fff" }}>{plan.duration}</dd>
        </div>
        <div>
          <dt className="eyebrow" style={{ letterSpacing: "0.2em" }}>Monthly bookings</dt>
          <dd style={{ marginTop: 6, fontSize: 14, fontWeight: 500, color: "#fff" }}>{plan.bookings}</dd>
        </div>
      </dl>
      <div style={{ marginTop: "auto", paddingTop: 24 }}>
        <Button
          variant={highlighted ? "primary" : "secondary"}
          block
          size="lg"
          onClick={() => onAction && onAction(plan)}
        >{actionLabel}</Button>
      </div>
    </article>
  );
}

// -------------------- Session Card (schedule) --------------------
function SessionCard({ session, onBook, onCancel }) {
  const isBooked = session.state === "booked";
  const isFull = session.state === "full";
  return (
    <div style={{
      background: "var(--color-bg-surface-1)",
      border: "1px solid var(--color-border-card)",
      borderRadius: "var(--radius-lg)",
      padding: 18,
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      gap: 18, alignItems: "center",
    }}>
      <div style={{
        width: 64, textAlign: "center",
        padding: "8px 0", borderRadius: "var(--radius-md)",
        background: "var(--color-bg-surface-2)",
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{session.time}</div>
        <div className="eyebrow" style={{ marginTop: 2, fontSize: 10 }}>{session.ampm}</div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#fff" }}>{session.name}</h3>
          {isBooked && <Badge variant="success" size="sm"><Icon.Check size={12} /> Booked</Badge>}
          {isFull && <Badge variant="warning" size="sm">Waitlist</Badge>}
        </div>
        <div style={{
          marginTop: 8, display: "flex", gap: 14, flexWrap: "wrap",
          fontSize: 13, color: "var(--color-fg-muted)"
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icon.Users size={14} /> {session.coach}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icon.MapPin size={14} /> {session.room}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icon.Clock size={14} /> {session.duration}
          </span>
          <span>{session.spotsLeft} / {session.capacity} spots</span>
        </div>
      </div>
      <div>
        {isBooked
          ? <Button variant="ghost" onClick={() => onCancel && onCancel(session)}>Cancel</Button>
          : isFull
          ? <Button variant="secondary" onClick={() => onBook && onBook(session)}>Join waitlist</Button>
          : <Button variant="primary" onClick={() => onBook && onBook(session)}>Book</Button>
        }
      </div>
    </div>
  );
}

// -------------------- Booking row (home "upcoming") --------------------
function BookingRow({ booking }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
      background: "#0F0F0F", border: "1px solid var(--color-border-card)",
      borderRadius: "var(--radius-lg)",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: "var(--radius-md)",
        background: "var(--color-primary-tint)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--color-primary-light)"
      }}>
        <Icon.Calendar size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{booking.name}</div>
        <div style={{ marginTop: 3, fontSize: 12, color: "var(--color-fg-muted)" }}>
          {booking.when} · {booking.coach}
        </div>
      </div>
      <Badge variant="success" size="sm">Confirmed</Badge>
    </div>
  );
}

// -------------------- Nav --------------------
function Navbar({ onNavigate, active, onSignOut }) {
  const [notifOpen, setNotifOpen] = React.useState(false);
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <a onClick={() => onNavigate && onNavigate("home")} style={{ cursor: "pointer" }}>
          <LogoLockup compact />
        </a>
        <nav className="nav-links">
          {[
            ["home", "Home"],
            ["schedule", "Schedule"],
            ["trainers", "Trainers"],
            ["membership", "Membership"],
          ].map(([k, l]) => (
            <a
              key={k}
              onClick={() => onNavigate && onNavigate(k)}
              className={"nav-link" + (active === k ? " nav-link--active" : "")}
            >
              {l}
            </a>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 6, position: "relative" }}>
          <IconButton label="Notifications" onClick={() => setNotifOpen(o => !o)}>
            <Icon.Bell size={20} />
          </IconButton>
          {notifOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 40, width: 280,
              background: "var(--color-bg-surface-2)", border: "1px solid var(--color-border-card)",
              borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xl)", padding: 12, zIndex: 50,
            }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Recent</div>
              <div style={{ fontSize: 13, color: "var(--color-fg-label)", padding: "6px 4px" }}>
                Your Saturday Yoga class is confirmed.
              </div>
              <div style={{ fontSize: 13, color: "var(--color-fg-label)", padding: "6px 4px" }}>
                Membership renews in 12 days.
              </div>
            </div>
          )}
          <div style={{ position: "relative" }}>
            <IconButton label="Profile" onClick={onSignOut}>
              <Avatar name="Dana R" size={32} />
            </IconButton>
          </div>
        </div>
      </div>
    </header>
  );
}

// -------------------- MemberNav (logged-in member chrome) --------------------
// Not sticky, sits on page bg, outlined dumbbell mark + Barlow Condensed wordmark.
function MemberNav({ active = "home", userName = "Dana Rivera", initials = "DR", avatarSrc, onNavigate, onLogout }) {
  const [bookOpen, setBookOpen] = React.useState(false);
  const [avatarOpen, setAvatarOpen] = React.useState(false);
  const bookRef = React.useRef(null);
  const avatarRef = React.useRef(null);

  React.useEffect(() => {
    function handleOutside(e) {
      if (bookRef.current && !bookRef.current.contains(e.target)) setBookOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setAvatarOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const go = (k) => { onNavigate && onNavigate(k); setBookOpen(false); setAvatarOpen(false); };

  return (
    <nav className="member-nav" aria-label="Main">
      <a className="member-nav-logo" onClick={() => go("home")}>
        <LogoMark variant="outline" size="sm" />
        <span className="member-nav-word">GymFlow</span>
      </a>
      <div className="member-nav-right">
        <a
          className={"member-nav-link" + (active === "home" ? " member-nav-link--active" : "")}
          onClick={() => go("home")}
        >Home</a>

        <div ref={bookRef} style={{ position: "relative" }}>
          <button
            type="button"
            aria-expanded={bookOpen}
            aria-haspopup="menu"
            className="member-nav-trigger"
            onClick={() => { setBookOpen(o => !o); setAvatarOpen(false); }}
          >
            Classes
            <svg className="member-nav-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {bookOpen && (
            <div className="member-nav-dropdown" style={{ left: 0 }} role="menu">
              <a className="item" onClick={() => go("schedule")}>
                <Icon.Calendar size={16} /> Group Classes
              </a>
              <a className="item" onClick={() => go("training")}>
                <Icon.Users size={16} /> Personal Training
              </a>
            </div>
          )}
        </div>

        <div ref={avatarRef} style={{ position: "relative" }}>
          <button
            type="button"
            aria-expanded={avatarOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
            className="member-nav-pill"
            onClick={() => { setAvatarOpen(o => !o); setBookOpen(false); }}
          >
            {avatarSrc
              ? <img src={avatarSrc} alt="" className="member-nav-avatar" style={{ objectFit: "cover" }} />
              : <span className="member-nav-avatar">{initials}</span>}
            <span className="member-nav-pill-name">{userName}</span>
          </button>
          {avatarOpen && (
            <div className="member-nav-dropdown" style={{ right: 0, minWidth: 180 }} role="menu">
              <a className="item" onClick={() => go("profile")}>Profile</a>
              <a className="item" onClick={onLogout}>Log out</a>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function LandingHeader({ onNavigate, onCTA }) {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <a onClick={() => onNavigate && onNavigate("landing")} style={{ cursor: "pointer" }}>
          <LogoLockup />
        </a>
        <nav className="nav-links">
          <a className="nav-link" onClick={() => onNavigate("landing", "plans")}>Plans</a>
          <a className="nav-link" onClick={() => onNavigate("landing", "journey")}>How it works</a>
          <a className="nav-link" onClick={() => onNavigate("landing", "faq")}>FAQ</a>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <a className="nav-link" onClick={() => onNavigate("login")}>Sign in</a>
          <Button onClick={onCTA}>Create account</Button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid var(--color-border-card)",
      padding: "40px 0 32px",
      marginTop: 48,
    }}>
      <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <LogoLockup compact />
          <div style={{ fontSize: 13, color: "var(--color-fg-muted)" }}>Membership-first training, one clear step at a time.</div>
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 13, color: "var(--color-fg-muted)" }}>
          <a className="nav-link">Plans</a>
          <a className="nav-link">Sign in</a>
          <a className="nav-link">Register</a>
        </div>
      </div>
    </footer>
  );
}

// -------------------- Toast --------------------
function Toast({ children, onDismiss }) {
  React.useEffect(() => {
    if (!onDismiss) return;
    const t = setTimeout(onDismiss, 2400);
    return () => clearTimeout(t);
  }, [onDismiss, children]);
  return (
    <div className="toast" role="status">
      <Icon.Check size={18} style={{ color: "var(--color-primary-light)" }} />
      <span>{children}</span>
    </div>
  );
}

// -------------------- Export --------------------
Object.assign(window, {
  Icon, Bolt,
  LogoMark, LogoLockup,
  Button, IconButton,
  Input, PasswordInput, FieldLabel,
  Badge, Avatar,
  Card, StatTile,
  PlanCard, SessionCard, BookingRow,
  Navbar, MemberNav, LandingHeader, Footer,
  Toast,
});
