import {
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import type { ClassTemplateResponse } from '../../types/scheduler'
import { getClassTemplateArtworkFromResponse } from '../../utils/classTemplateArtwork'

interface ClassTemplateCardProps {
  template: ClassTemplateResponse;
  onEdit: (template: ClassTemplateResponse) => void;
  onDelete: (template: ClassTemplateResponse) => void;
}

const CATEGORY_DOT: Record<string, string> = {
  Cardio: 'bg-orange-500',
  Strength: 'bg-red-500',
  Flexibility: 'bg-purple-500',
  'Mind & Body': 'bg-blue-400',
  Cycling: 'bg-yellow-500',
  Combat: 'bg-red-700',
  Dance: 'bg-pink-500',
  Functional: 'bg-green-500',
  Aqua: 'bg-cyan-500',
  Wellness: 'bg-indigo-400',
  Other: 'bg-gray-500',
}

const DIFFICULTY_BADGE: Record<string, string> = {
  Beginner: 'bg-green-500/10 text-green-400 border-green-500/30',
  Intermediate: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  Advanced: 'bg-red-500/10 text-red-400 border-red-500/30',
  'All Levels': 'bg-gray-700 text-gray-300 border-gray-600',
}

export function ClassTemplateCard({ template, onEdit, onDelete }: ClassTemplateCardProps) {
  const imageUrl = getClassTemplateArtworkFromResponse(template)

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/80 shadow-lg shadow-black/30 transition-all duration-200 hover:border-gray-600 hover:bg-gray-800/80">
      <div className="relative h-24 bg-gray-950">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${imageUrl}')` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/95 via-gray-950/50 to-transparent" />
        <div className="absolute bottom-2 left-3 inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-900/70 px-2.5 py-1 text-xs text-gray-200">
          <span className={`h-2 w-2 rounded-full ${CATEGORY_DOT[template.category] || 'bg-gray-500'}`} />
          {template.category}
        </div>
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(template)}
            className="rounded-md border border-gray-700 bg-gray-900/70 p-1.5 text-gray-200 hover:bg-gray-800"
            aria-label={`Edit ${template.name}`}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(template)}
            className="rounded-md border border-gray-700 bg-gray-900/70 p-1.5 text-red-300 hover:bg-red-500/20"
            aria-label={`Delete ${template.name}`}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-white">{template.name}</h3>
          <span className={`rounded-full border px-3 py-1 text-xs ${DIFFICULTY_BADGE[template.difficulty] || 'border-gray-700 text-gray-300'}`}>
            {template.difficulty}
          </span>
        </div>

        <div className="mt-2 text-sm text-gray-400">
          {template.defaultDurationMin} min
          <span className="mx-2 text-gray-600">·</span>
          Up to {template.defaultCapacity}
          <span className="mx-2 text-gray-600">·</span>
          {template.room?.name ?? (
            <span className="text-gray-600">No room set</span>
          )}
        </div>

        {template.description && (
          <p className="mt-3 line-clamp-2 text-sm text-gray-300">{template.description}</p>
        )}

        {template.isSeeded && (
          <div className="mt-3 text-xs text-gray-500">Seeded</div>
        )}
      </div>
    </div>
  )
}
