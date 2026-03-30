export function FaqSection() {
  const items = [
    {
      question: 'Do I need a membership to book classes?',
      answer:
        'Yes. GymFlow opens booking only after your membership is active, so the journey stays membership-first from the start.',
    },
    {
      question: 'Can I compare plans before creating an account?',
      answer:
        'Yes. The landing page shows the active public plans so you can review the offer before you register.',
    },
    {
      question: 'What happens after I sign up?',
      answer:
        'You create your account first, choose a membership, and then move into booking once the membership is active.',
    },
  ]

  return (
    <section id="faq" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-green-400">
          FAQ
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-white">
          The minimum details people need before they move
        </h2>
      </div>

      <div className="mt-10 space-y-4">
        {items.map((item) => (
          <article
            key={item.question}
            className="rounded-3xl border border-gray-800 bg-gray-900/70 p-6"
          >
            <h3 className="text-lg font-semibold text-white">{item.question}</h3>
            <p className="mt-3 text-sm leading-6 text-gray-400">{item.answer}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
