export function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      title: 'Create your account',
      copy: 'Start with a simple account so GymFlow knows where to route you next.',
    },
    {
      step: '02',
      title: 'Choose a membership',
      copy: 'Compare the live plans and select the membership that fits your training rhythm.',
    },
    {
      step: '03',
      title: 'Book classes once active',
      copy: 'Class access opens after activation, so booking rules stay clear from the start.',
    },
  ]

  return (
    <section id="journey" className="border-y border-gray-900/80 bg-gray-950/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-green-400">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white">
            A short flow you can understand in one pass
          </h2>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.step}
              className="rounded-3xl border border-gray-800 bg-gray-900/70 p-6"
            >
              <p className="font-['Barlow_Condensed'] text-4xl font-bold uppercase text-green-400">
                {step.step}
              </p>
              <h3 className="mt-4 text-xl font-semibold text-white">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-gray-400">{step.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
