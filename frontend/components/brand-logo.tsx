import { cn } from '@/lib/utils'

export function BrandLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex size-11 items-center justify-center rounded-2xl shadow-[0_6px_16px_rgb(56,132,222,0.35)]',
        className,
      )}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-11"
        role="img"
        aria-label="灵境云游 logo"
      >
        <defs>
          <linearGradient id="brandBadge" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4C9BE8" />
            <stop offset="1" stopColor="#2AB7B0" />
          </linearGradient>
          <linearGradient id="brandPeak" x1="24" y1="14" x2="24" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#EAF6FF" />
          </linearGradient>
        </defs>

        {/* Badge */}
        <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#brandBadge)" />

        {/* Sun */}
        <circle cx="32.5" cy="16" r="4" fill="#FFE39B" />

        {/* Back mountain */}
        <path
          d="M9 34L18.5 20.5C19.3 19.3 21.1 19.4 21.8 20.7L28 32"
          stroke="#EAF6FF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.7"
        />

        {/* Front mountain (filled) */}
        <path
          d="M13 35L21.2 22.2C22 21 23.8 21 24.6 22.2L27.8 27.1L30.2 24.4C31 23.5 32.4 23.6 33.1 24.6L38 32"
          fill="none"
          stroke="url(#brandPeak)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Water waves */}
        <path
          d="M11 38C13.5 38 13.5 36.2 16 36.2C18.5 36.2 18.5 38 21 38C23.5 38 23.5 36.2 26 36.2C28.5 36.2 28.5 38 31 38C33.5 38 33.5 36.2 36 36.2"
          stroke="#EAF6FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </svg>
    </div>
  )
}
