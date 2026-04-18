import { useEffect } from 'react'

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

/**
 * Bottom-center auto-dismissing toast.
 * Respects prefers-reduced-motion — no transition when motion is reduced.
 * Auto-dismisses after 2.4 seconds.
 */
export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    if (!message) return
    const id = setTimeout(onClose, 2400)
    return () => clearTimeout(id)
  }, [message, onClose])

  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-5 py-3 rounded-xl border border-white/[0.12] text-sm font-medium text-white"
      style={{
        background: 'rgba(15,15,15,0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
        borderRadius: 12,
        whiteSpace: 'nowrap',
      }}
    >
      {message}
    </div>
  )
}
