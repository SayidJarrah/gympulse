import { TrainerCard } from './TrainerCard'
import type { PtTrainerSummary } from '../../types/ptBooking'

interface Props {
  trainers: PtTrainerSummary[]
  loading: boolean
  error: string | null
  allSpecialties: string[]
  selectedSpecialty: string | null
  onSpecialtyChange: (s: string | null) => void
  onSelectTrainer: (trainer: PtTrainerSummary) => void
}

export function TrainerDirectory({
  trainers,
  loading,
  error,
  allSpecialties,
  selectedSpecialty,
  onSpecialtyChange,
  onSelectTrainer,
}: Props) {
  return (
    <section aria-labelledby="trainer-dir-heading">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#22C55E]">
        STEP 1 OF 3 · CHOOSE A TRAINER
      </p>
      <h2
        id="trainer-dir-heading"
        className="mb-6 font-['Barlow_Condensed'] text-[40px] font-bold uppercase leading-tight text-white"
      >
        Pick who you want to train with
      </h2>

      {/* Specialty filter chips */}
      <div
        className="mb-6 flex flex-wrap gap-2"
        role="group"
        aria-label="Filter trainers by specialty"
      >
        <button
          className={`rounded-full px-3.5 py-[7px] text-[12px] font-medium transition-colors duration-150 ${
            selectedSpecialty === null
              ? 'border border-[rgba(34,197,94,0.30)] bg-[rgba(34,197,94,0.10)] text-[#4ADE80]'
              : 'border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[#D1D5DB] hover:border-[rgba(255,255,255,0.18)]'
          }`}
          onClick={() => onSpecialtyChange(null)}
          aria-pressed={selectedSpecialty === null}
        >
          All
        </button>
        {allSpecialties.map((s) => (
          <button
            key={s}
            className={`rounded-full px-3.5 py-[7px] text-[12px] font-medium transition-colors duration-150 ${
              selectedSpecialty === s
                ? 'border border-[rgba(34,197,94,0.30)] bg-[rgba(34,197,94,0.10)] text-[#4ADE80]'
                : 'border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[#D1D5DB] hover:border-[rgba(255,255,255,0.18)]'
            }`}
            onClick={() => onSpecialtyChange(s)}
            aria-pressed={selectedSpecialty === s}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
          aria-label="Loading trainers"
        >
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[260px] animate-pulse rounded-2xl bg-[rgba(255,255,255,0.04)]" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <p className="text-[14px] text-[#F87171]" role="alert">
          {error}
        </p>
      )}

      {/* Empty state */}
      {!loading && !error && trainers.length === 0 && (
        <p className="text-[14px] text-[#9CA3AF]">
          No trainers match the selected specialty.
        </p>
      )}

      {/* Trainer grid */}
      {!loading && !error && trainers.length > 0 && (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
        >
          {trainers.map((trainer) => (
            <TrainerCard key={trainer.id} trainer={trainer} onSelect={onSelectTrainer} />
          ))}
        </div>
      )}
    </section>
  )
}
