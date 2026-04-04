interface Props {
  firstName: string | null;
  hasActiveMembership: boolean;
  activePlanName: string | null;
  stats: { label: string; value: string }[];
}

export function MemberHomeHero({
  firstName,
  hasActiveMembership,
  activePlanName,
  stats,
}: Props) {
  const greetingName = firstName ? `, ${firstName}` : ''

  return (
    <section className="rounded-2xl border border-gray-800 bg-[#111827]/80 p-6 shadow-md shadow-black/40">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-300">
              Club overview
            </span>
            {activePlanName ? (
              <span className="inline-flex items-center rounded-full border border-gray-700 bg-[#0F0F0F] px-3 py-1 text-xs font-medium text-gray-300">
                {activePlanName}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-300">
                Membership activation ready
              </span>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-gray-400">
              Next steps
            </p>
            <h1 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
              Welcome back{greetingName}
            </h1>
            <p className="max-w-2xl text-base leading-normal text-gray-300">
              {hasActiveMembership
                ? 'Your access is set. Use the sections below to keep your routine moving.'
                : 'Once your access is active, booking and the full member flow unlock here.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-gray-300">
            <span className="rounded-full border border-gray-700 bg-[#0F0F0F] px-3 py-1.5">
              Coaches worth saving
            </span>
            <span className="rounded-full border border-gray-700 bg-[#0F0F0F] px-3 py-1.5">
              Group classes in view
            </span>
            <span className="rounded-full border border-gray-700 bg-[#0F0F0F] px-3 py-1.5">
              Fast path into your club routine
            </span>
          </div>
        </div>

        <div className="grid gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-gray-800 bg-[#0F0F0F] px-4 py-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                {stat.label}
              </p>
              <p className="mt-2 text-xl font-semibold leading-tight text-white">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
