import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightOnRectangleIcon,
  RectangleStackIcon,
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'

interface SidebarLink {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const sidebarLinks: SidebarLink[] = [
  { label: 'Plans', href: '/admin/plans', icon: RectangleStackIcon },
]

export function AdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  const userInitials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'AD'

  return (
    <aside
      className={`flex h-screen flex-col bg-[#0F0F0F] border-r border-gray-800 transition-all duration-300 flex-shrink-0 ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-800 px-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <path d="M13 2L4.5 13.5H11L9 22L19.5 9.5H13.5L16 2Z" fill="white" />
          </svg>
        </div>
        {!isCollapsed && (
          <span className="ml-3 text-base font-bold text-white">GymFlow</span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          {sidebarLinks.map(({ label, href, icon: Icon }) => (
            <li key={href}>
              <NavLink
                to={href}
                title={isCollapsed ? label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                    isActive
                      ? 'border-l-2 border-green-500 bg-green-500/10 text-green-400'
                      : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                  }`
                }
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User info + logout + collapse toggle */}
      <div className="border-t border-gray-800 px-2 py-4 space-y-1">
        {!isCollapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20 text-xs font-bold text-green-400 ring-2 ring-green-500/30">
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-gray-400">{user.email}</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          title={isCollapsed ? 'Log out' : undefined}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors duration-200 hover:bg-gray-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span>Log out</span>}
        </button>

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors duration-200 hover:bg-gray-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="h-5 w-5 flex-shrink-0" />
          ) : (
            <>
              <ChevronLeftIcon className="h-5 w-5 flex-shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
