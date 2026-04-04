import { useMemo, useState } from 'react'
import type { ClassTemplateResponse } from '../../types/scheduler'
import { getClassTemplateArtworkFromResponse } from '../../utils/classTemplateArtwork'

interface ClassPaletteProps {
  templates: ClassTemplateResponse[];
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

export function ClassPalette({ templates }: ClassPaletteProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return templates
    const lower = query.toLowerCase()
    return templates.filter((template) => template.name.toLowerCase().includes(lower))
  }, [query, templates])

  return (
    <aside className="flex w-[260px] flex-shrink-0 flex-col border-r border-gray-800 bg-[#0F0F0F]">
      <div className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Class Templates
      </div>
      <div className="px-3 pb-3">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {filtered.length === 0 ? (
          <div className="px-1 text-xs text-gray-500">No templates match</div>
        ) : (
          filtered.map((template) => (
            <div
              key={template.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('templateId', template.id)
              }}
              className="mb-2 flex cursor-grab items-center gap-3 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 text-xs text-gray-200 transition-all duration-150 hover:border-gray-600 hover:bg-gray-800"
            >
              <div className="h-9 w-9 overflow-hidden rounded-lg border border-gray-800 bg-gray-950">
                <img
                  src={getClassTemplateArtworkFromResponse(template)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="truncate text-sm font-medium text-white">{template.name}</span>
              <span className={`h-2.5 w-2.5 rounded-full ${CATEGORY_DOT[template.category] || 'bg-gray-500'}`} />
              <span className="ml-auto text-xs text-gray-500">{template.defaultDurationMin} min</span>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
