import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import { useMembershipStore } from '../../store/membershipStore'

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isAuthenticated, user, clearAuth } = useAuthStore()
  const {
    activeMembership,
    fetchMyMembership,
    membershipErrorCode,
    membershipLoading,
  } = useMembershipStore()
  const navigate = useNavigate()
  const shouldResolveMembership =
    isAuthenticated &&
    user?.role === 'USER' &&
    activeMembership === null &&
    membershipErrorCode === null &&
    !membershipLoading

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  useEffect(() => {
    if (shouldResolveMembership) {
      void fetchMyMembership()
    }
  }, [fetchMyMembership, shouldResolveMembership])

  const navLinks = [{ label: 'Plans', href: '/plans' }]
  const userNavLinks =
    isAuthenticated && user?.role === 'USER'
      ? [
          { label: 'Schedule', href: '/schedule' },
          { label: 'Trainers', href: '/trainers' },
          ...(activeMembership ? [{ label: 'My Favorites', href: '/trainers/favorites' }] : []),
          { label: 'Profile', href: '/profile' },
        ]
      : []

  return (
    <header className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <NavLink
          to="/"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:rounded-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M13 2L4.5 13.5H11L9 22L19.5 9.5H13.5L16 2Z" fill="white" />
            </svg>
          </div>
          <span className="text-lg font-bold text-white">GymFlow</span>
        </NavLink>

        {/* Center nav — desktop */}
        <nav className="hidden items-center gap-6 sm:flex">
          {[...navLinks, ...userNavLinks].map(({ label, href }) => (
            <NavLink
              key={href}
              to={href}
              className={({ isActive }) =>
                `pb-0.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:rounded-sm ${
                  isActive
                    ? 'border-b-2 border-green-500 text-green-400'
                    : 'text-gray-400 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right zone */}
        <div className="flex items-center gap-3">
          {/* Hamburger button — visible only on mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden rounded-md p-2 text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="h-5 w-5" />
            ) : (
              <Bars3Icon className="h-5 w-5" />
            )}
          </button>

          {isAuthenticated && user ? (
            <>
              <button
                type="button"
                onClick={handleLogout}
                className="hidden sm:inline-flex items-center justify-center rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                Log out
              </button>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-sm font-semibold text-white ring-2 ring-green-500/50"
                aria-label="User menu"
              >
                {user.email.slice(0, 2).toUpperCase()}
              </div>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <NavLink
                to="/login"
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-400 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                Log in
              </NavLink>
              <NavLink
                to="/register"
                className="inline-flex items-center justify-center rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                Get Started
              </NavLink>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-gray-800 bg-gray-900 sm:hidden">
          <nav className="flex flex-col px-4 py-3 gap-1">
            {[...navLinks, ...userNavLinks].map(({ label, href }) => (
              <NavLink
                key={href}
                to={href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors duration-150"
              >
                {label}
              </NavLink>
            ))}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md px-3 py-2 text-left text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors duration-150"
              >
                Log out
              </button>
            ) : (
              <>
                <NavLink
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors duration-150"
                >
                  Log in
                </NavLink>
                <NavLink
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors duration-150"
                >
                  Get Started
                </NavLink>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
