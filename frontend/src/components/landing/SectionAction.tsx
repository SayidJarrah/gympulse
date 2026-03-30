import { Link } from 'react-router-dom'
import type { LandingAction } from '../../types/landing'

interface Props {
  action: LandingAction;
  variant: 'primary' | 'secondary' | 'ghost';
  onClick?: () => void;
  showDescription?: boolean;
}

const variantClasses: Record<Props['variant'], string> = {
  primary:
    'bg-green-500 text-white hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/20',
  secondary:
    'border border-gray-700 bg-gray-900 text-white hover:border-gray-500 hover:bg-gray-800',
  ghost:
    'text-gray-300 hover:text-white',
}

export function SectionAction({ action, variant, onClick, showDescription = false }: Props) {
  const baseClasses =
    'inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F0F]'

  if (action.kind === 'disabled') {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled
          className={`${baseClasses} cursor-not-allowed border border-gray-800 bg-gray-900 text-gray-500`}
        >
          {action.label}
        </button>
        {showDescription && (
          <p className="text-sm text-gray-500">{action.description}</p>
        )}
      </div>
    )
  }

  const classes = `${baseClasses} ${variantClasses[variant]}`

  if (action.to.startsWith('#')) {
    return (
      <a href={action.to} className={classes} onClick={onClick}>
        {action.label}
      </a>
    )
  }

  return (
    <Link to={action.to} className={classes} onClick={onClick}>
      {action.label}
    </Link>
  )
}
