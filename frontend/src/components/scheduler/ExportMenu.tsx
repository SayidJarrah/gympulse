import { useEffect, useRef, useState } from 'react'
import { ArrowDownTrayIcon, TableCellsIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'

interface ExportMenuProps {
  onExportCsv: () => void;
  onExportIcal: () => void;
}

export function ExportMenu({ onExportCsv, onExportIcal }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
      >
        <ArrowDownTrayIcon className="h-4 w-4" />
        Export
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-44 rounded-xl border border-gray-800 bg-gray-900 py-1 shadow-xl shadow-black/50"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onExportCsv()
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-gray-800"
          >
            <TableCellsIcon className="h-4 w-4 text-gray-400" />
            Export as CSV
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onExportIcal()
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-gray-800"
          >
            <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
            Export as iCal
          </button>
        </div>
      )}
    </div>
  )
}
