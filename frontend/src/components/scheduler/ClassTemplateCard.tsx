import {
  PencilIcon,
  TrashIcon,
  ClockIcon,
  UserGroupIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import type { ClassTemplateResponse } from '../../types/scheduler'

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
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 transition-all duration-200 hover:border-gray-600 hover:bg-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${CATEGORY_DOT[template.category] || 'bg-gray-500'}`} />
            <h3 className="text-base font-semibold text-white">{template.name}</h3>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-gray-700 px-2 py-0.5 text-xs text-gray-300">
              {template.category}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-xs ${DIFFICULTY_BADGE[template.difficulty] || 'border-gray-700 text-gray-300'}`}>
              {template.difficulty}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(template)}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
            aria-label={`Edit ${template.name}`}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(template)}
            className="rounded-md p-1 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            aria-label={`Delete ${template.name}`}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 text-sm text-gray-400">
        <ClockIcon className="mr-1 inline h-3.5 w-3.5" />
        {template.defaultDurationMin} min
        <span className="mx-2 text-gray-600">·</span>
        <UserGroupIcon className="mr-1 inline h-3.5 w-3.5" />
        Up to {template.defaultCapacity}
        <span className="mx-2 text-gray-600">·</span>
        <MapPinIcon className="mr-1 inline h-3.5 w-3.5" />
        {template.room?.name ?? (
          <span className="text-gray-600">No room set</span>
        )}
      </div>

      {template.description && (
        <p className="mt-2 line-clamp-2 text-sm text-gray-400">{template.description}</p>
      )}

      {template.isSeeded && (
        <div className="mt-3 text-xs text-gray-500">Seeded</div>
      )}
    </div>
  )
}
