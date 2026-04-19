interface StepWelcomeProps {
  firstName?: string | null
}

export function StepWelcome({ firstName: _firstName }: StepWelcomeProps) {
  return (
    <div className="flex flex-col gap-8 max-w-[820px]">
      <p
        className="text-xs font-semibold uppercase"
        style={{ letterSpacing: '0.22em', color: 'var(--color-primary-light)' }}
      >
        Step 01 · Welcome
      </p>

      <h1
        className="uppercase leading-none"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(42px, 6vw, 72px)',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: 'var(--color-fg-default)',
        }}
      >
        You're in.<br />Let's set up<br />your profile.
      </h1>

      <p
        className="text-[15px] max-w-[580px]"
        style={{ color: 'var(--color-fg-label)', lineHeight: 1.6 }}
      >
        A few quick steps to get your account ready: tell us who you are, optionally pick a
        membership, and book your first session. You can skip anything that isn't required.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PreviewCard
          num="01"
          title="Profile"
          description="Name, contact, and the basics we need to identify you on the floor."
        />
        <PreviewCard
          num="02"
          title="Membership"
          description="Choose a plan that fits your cadence — or skip and decide later."
        />
        <PreviewCard
          num="03"
          title="First booking"
          description="If you picked a plan, reserve your first class or PT session."
        />
      </div>

      <div
        className="flex items-center gap-3 px-5 py-3.5 text-sm"
        style={{
          background: 'var(--color-bg-surface-1)',
          border: '1px solid var(--color-border-card)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--color-fg-muted)',
        }}
      >
        <svg
          className="w-4 h-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          style={{ color: 'var(--color-primary)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Takes about 3 minutes. Booking opens after membership activation.
      </div>
    </div>
  )
}

function PreviewCard({ num, title, description }: { num: string; title: string; description: string }) {
  return (
    <div
      className="flex flex-col gap-4 p-6 transition-all duration-150 cursor-default"
      style={{
        background: 'var(--color-bg-surface-1)',
        border: '1px solid var(--color-border-card)',
        borderRadius: 'var(--radius-lg)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(-2px)'
        el.style.borderColor = 'var(--color-primary-border)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = ''
        el.style.borderColor = 'var(--color-border-card)'
      }}
    >
      <span
        className="text-3xl font-bold leading-none"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary)' }}
      >
        {num}
      </span>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-fg-default)' }}>{title}</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-fg-muted)' }}>{description}</p>
      </div>
    </div>
  )
}
