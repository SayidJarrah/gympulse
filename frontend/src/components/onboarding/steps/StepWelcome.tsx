interface StepWelcomeProps {
  firstName?: string | null
}

export function StepWelcome({ firstName }: StepWelcomeProps) {
  const greeting = firstName ? `Hey ${firstName} —` : 'Hey there —'

  return (
    <div className="flex flex-col gap-8 max-w-[820px]">
      {/* Eyebrow */}
      <p
        className="text-xs font-semibold uppercase"
        style={{ letterSpacing: '0.22em', color: 'var(--color-primary-light)' }}
      >
        Step 01 · Welcome
      </p>

      {/* Headline */}
      <h1
        className="uppercase leading-none"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(36px, 5vw, 48px)',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: 'var(--color-fg-default)',
        }}
      >
        Welcome to GymFlow
      </h1>

      {/* Lede */}
      <p
        className="text-[15px] max-w-[580px]"
        style={{ color: 'var(--color-fg-label)', lineHeight: 1.6 }}
      >
        {greeting} start with a membership, keep your account in one place, and move into class
        booking with a clear next step every time you return.
      </p>

      {/* Preview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PreviewCard
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          }
          title="Your profile"
          meta="2 minutes · required"
        />
        <PreviewCard
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          }
          title="Your plan"
          meta="optional"
        />
        <PreviewCard
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          }
          title="Your first booking"
          meta="optional · if you picked a plan"
        />
      </div>
    </div>
  )
}

function PreviewCard({ icon, title, meta }: { icon: React.ReactNode; title: string; meta: string }) {
  return (
    <div
      className="flex flex-col gap-3 p-6 rounded-xl transition-all duration-150 cursor-default min-h-[240px]"
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
      <div style={{ color: 'var(--color-primary)' }}>{icon}</div>
      <p className="text-sm font-semibold" style={{ color: 'var(--color-fg-default)' }}>{title}</p>
      <p className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>{meta}</p>
    </div>
  )
}
