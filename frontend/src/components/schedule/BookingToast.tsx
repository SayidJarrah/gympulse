import { useEffect } from 'react'

interface BookingToastProps {
  kind: 'success' | 'error';
  message: string;
  onDismiss: () => void;
}

export function BookingToast({ kind, message, onDismiss }: BookingToastProps) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onDismiss, 3000)
    return () => window.clearTimeout(timeoutId)
  }, [message, onDismiss])

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-4">
      <div
        className={`pointer-events-auto min-w-[16rem] rounded-2xl border px-4 py-3 text-sm font-medium shadow-xl shadow-black/40 transition-transform duration-200 ${
          kind === 'success'
            ? 'border-green-500/30 bg-gray-950 text-green-200'
            : 'border-red-500/30 bg-gray-950 text-red-200'
        }`}
      >
        {message}
      </div>
    </div>
  )
}
