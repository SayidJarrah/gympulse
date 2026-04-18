import { Link } from 'react-router-dom'

interface Props {
  authed: boolean;
  userName?: string;
}

export function PulseNav({ authed, userName }: Props) {
  return (
    <nav className="relative z-10 flex items-center justify-between border-b border-[#1F2937] px-10 py-5">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded">
        <svg
          width="28"
          height="28"
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden="true"
        >
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

      {/* Right side */}
      <div className="flex items-center gap-7">
        {authed ? (
          <>
            <Link
              to="/schedule"
              className="text-[13px] font-medium tracking-[0.02em] text-[#D1D5DB] transition-colors duration-200 hover:text-white"
            >
              Schedule
            </Link>
            <Link
              to="/trainers"
              className="text-[13px] font-medium tracking-[0.02em] text-[#D1D5DB] transition-colors duration-200 hover:text-white"
            >
              Trainers
            </Link>
            <Link
              to="/membership"
              className="text-[13px] font-medium tracking-[0.02em] text-[#D1D5DB] transition-colors duration-200 hover:text-white"
            >
              Membership
            </Link>
            {userName && (
              <div className="inline-flex items-center gap-2.5 rounded-full border border-white/8 bg-white/4 px-3 py-1.5 pl-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-400 text-[11px] font-bold text-[#0F0F0F]">
                  {userName[0]?.toUpperCase()}
                </div>
                <span className="text-[13px] font-medium text-white">{userName}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="text-[13px] font-medium tracking-[0.02em] text-[#4ADE80] transition-colors duration-[160ms] hover:brightness-[1.15]"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="whitespace-nowrap rounded-lg bg-green-500 px-4 py-2 text-[13px] font-bold text-[#0F0F0F] transition-all duration-[160ms] hover:brightness-[1.08]"
            >
              Join GymFlow
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
