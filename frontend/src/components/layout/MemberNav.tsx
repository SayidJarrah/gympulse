import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useProfileStore } from '../../store/profileStore'

export function MemberNav() {
  const [bookOpen, setBookOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const bookRef = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<HTMLDivElement>(null)
  const { user, clearAuth } = useAuthStore()
  const { profile, avatarUrl, ensureProfileLoaded, resetProfile } = useProfileStore()
  const navigate = useNavigate()

  useEffect(() => {
    void ensureProfileLoaded()
  }, [ensureProfileLoaded])

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (bookRef.current && !bookRef.current.contains(e.target as Node)) setBookOpen(false)
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleLogout = () => {
    resetProfile()
    clearAuth()
    navigate('/')
  }

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || user?.email.split('@')[0] || ''
  const initial = (profile?.firstName?.charAt(0) ?? user?.email.charAt(0) ?? 'M').toUpperCase() + (profile?.lastName?.charAt(0) ?? '').toUpperCase() || 'ME'

  return (
    <nav className="relative z-10 flex items-center justify-between border-b border-[#1F2937] px-10 py-5" aria-label="Main">
      {/* Logo */}
      <Link
        to="/home"
        className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
      >
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect x="1" y="1" width="30" height="30" rx="7" stroke="#22C55E" strokeWidth="2" />
          <path
            d="M10 11v10M22 11v10M10 16h12"
            stroke="#22C55E"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
        <span className="font-['Barlow_Condensed'] text-xl font-bold uppercase tracking-[0.02em] text-white">
          GymFlow
        </span>
      </Link>

      {/* Right-side items */}
      <div className="flex items-center gap-7">
        {/* Home */}
        <NavLink
          to="/home"
          className={({ isActive }) =>
            `text-[13px] font-medium tracking-[0.02em] transition-colors duration-200 ${
              isActive ? 'text-white' : 'text-[#D1D5DB] hover:text-white'
            }`
          }
        >
          Home
        </NavLink>

        {/* Book dropdown */}
        <div className="relative" ref={bookRef}>
          <button
            type="button"
            aria-expanded={bookOpen}
            aria-haspopup="menu"
            onClick={() => { setBookOpen(o => !o); setAvatarOpen(false) }}
            className="flex items-center gap-1 text-[13px] font-medium tracking-[0.02em] text-[#D1D5DB] transition-colors duration-200 hover:text-white"
          >
            Classes
            <svg
              className={`h-3.5 w-3.5 transition-transform duration-150 ${bookOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {bookOpen && (
            <div className="absolute left-0 top-full mt-2 w-52 rounded-xl border border-[#1F2937] bg-[#111111] py-1.5 shadow-xl">
              <Link
                to="/schedule"
                onClick={() => setBookOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#D1D5DB] transition-colors duration-150 hover:bg-white/5 hover:text-white"
              >
                <svg className="h-4 w-4 shrink-0 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                Group Classes
              </Link>
              <Link
                to="/training"
                onClick={() => setBookOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#D1D5DB] transition-colors duration-150 hover:bg-white/5 hover:text-white"
              >
                <svg className="h-4 w-4 shrink-0 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
                Personal Training
              </Link>
            </div>
          )}
        </div>

        {/* Avatar dropdown */}
        <div className="relative" ref={avatarRef}>
          <button
            type="button"
            aria-label="Account menu"
            aria-expanded={avatarOpen}
            aria-haspopup="menu"
            onClick={() => { setAvatarOpen(o => !o); setBookOpen(false) }}
            className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 pl-1.5 transition-colors duration-150 hover:bg-white/[0.08]"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Your profile" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-400 text-[11px] font-bold text-[#0F0F0F]">
                {initial}
              </div>
            )}
            <span className="text-[13px] font-medium text-white">
              {fullName}
            </span>
          </button>

          {avatarOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-[#1F2937] bg-[#111111] py-1.5 shadow-xl">
              <Link
                to="/profile"
                onClick={() => setAvatarOpen(false)}
                className="block px-4 py-2.5 text-[13px] font-medium text-[#D1D5DB] transition-colors duration-150 hover:bg-white/5 hover:text-white"
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full px-4 py-2.5 text-left text-[13px] font-medium text-[#D1D5DB] transition-colors duration-150 hover:bg-white/5 hover:text-white"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
