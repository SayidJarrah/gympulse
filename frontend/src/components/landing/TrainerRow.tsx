import { Link } from 'react-router-dom'

// Placeholder trainer names shown when real data is unavailable
const PLACEHOLDER_NAMES = ['Priya', 'Jordan', 'Noah', 'Ari', 'Mia']

interface TrainerAvatar {
  name: string;
  avatarUrl?: string | null;
}

interface Props {
  trainers?: TrainerAvatar[];
  /** Total coaches teaching this week — shown in copy */
  coachCount?: number;
  /** Variant copy for logged-out hero */
  variant?: 'week' | 'total';
  /** Link to trainer list */
  linkTo?: string;
}

function avatarHsl(index: number): string {
  return `hsl(${index * 47 + 140} 60% 50%)`
}

export function TrainerRow({
  trainers,
  coachCount = 8,
  variant = 'week',
  linkTo = '/trainers',
}: Props) {
  const displayTrainers: TrainerAvatar[] =
    trainers && trainers.length > 0
      ? trainers.slice(0, 5)
      : PLACEHOLDER_NAMES.map((n) => ({ name: n }))

  return (
    <div className="mt-12 flex items-center gap-3.5">
      {/* Avatar stack */}
      <div className="flex">
        {displayTrainers.map((t, i) => (
          <div
            key={t.name}
            className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-[#0F0F0F] text-xs font-bold text-[#0F0F0F]"
            style={{
              background: t.avatarUrl ? undefined : avatarHsl(i),
              marginLeft: i === 0 ? 0 : -10,
              zIndex: displayTrainers.length - i,
            }}
          >
            {t.avatarUrl ? (
              <img src={t.avatarUrl} alt={t.name} className="h-full w-full object-cover" />
            ) : (
              t.name[0]?.toUpperCase()
            )}
          </div>
        ))}
      </div>

      {/* Copy */}
      <p className="text-xs text-[#9CA3AF]">
        <span className="font-semibold text-white">{coachCount} coaches</span>{' '}
        {variant === 'week' ? 'teaching this week' : `, 1,200+ members`} ·{' '}
        <Link
          to={linkTo}
          className="text-[#4ADE80] transition-colors duration-[160ms] hover:brightness-[1.15]"
        >
          Meet the team
        </Link>
      </p>
    </div>
  )
}
