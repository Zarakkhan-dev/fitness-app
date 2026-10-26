'use client';

/**
 * Inline stroke icons — one consistent family, no icon-font or sprite request.
 * Each takes `className` so sizing comes from Tailwind (`h-5 w-5`).
 */

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  const { className = 'h-5 w-5', ...rest } = props;
  return {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...rest,
  };
}

export const HomeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.8V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.8" />
  </svg>
);

export const DumbbellIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11" />
  </svg>
);

export const NutritionIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 3v7a2.5 2.5 0 0 0 5 0V3M8.5 10v11" />
    <path d="M17.5 3c-1.5 1.5-2 3.5-2 6s.7 3.5 2 4v8" />
  </svg>
);

export const ChartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);

export const UsersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 19c.6-3 3-4.8 6-4.8s5.4 1.8 6 4.8" />
    <path d="M16 5.2a3.2 3.2 0 0 1 0 5.9M17.5 14.6c2 .7 3.3 2.3 3.7 4.4" />
  </svg>
);

export const SparkIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3v3M12 18v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M3 12h3M18 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
    <circle cx="12" cy="12" r="3.4" />
  </svg>
);

export const TargetIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.8" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
  </svg>
);

export const TrophyIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.4M17 6h2.5a2.5 2.5 0 0 1-2.6 3.4" />
    <path d="M12 14v3M8.5 21h7l-.7-2.6a1.5 1.5 0 0 0-1.4-1.1h-2.8a1.5 1.5 0 0 0-1.4 1.1L8.5 21Z" />
  </svg>
);

export const UserIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20c1-3.7 3.9-5.7 7.5-5.7s6.5 2 7.5 5.7" />
  </svg>
);

export const BellIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5S6.5 14 6.5 10Z" />
    <path d="M10 19a2.2 2.2 0 0 0 4 0" />
  </svg>
);

export const SunIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </svg>
);

export const MoonIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 14.5A8.2 8.2 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
  </svg>
);

export const LogoutIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    <path d="M10 16l-4-4 4-4M6 12h9" />
  </svg>
);

export const MenuIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m5 13 4.5 4.5L19 7" />
  </svg>
);

export const DropIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3.5s5.5 5.4 5.5 9.5a5.5 5.5 0 1 1-11 0C6.5 8.9 12 3.5 12 3.5Z" />
  </svg>
);

export const ScaleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
    <path d="M8.5 9.5a3.5 3.5 0 0 1 7 0" />
    <path d="M12 9.5V13" />
  </svg>
);

export const FireIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3c.5 3-1.5 4.5-2.5 6C8 11 7 12.6 7 15a5 5 0 0 0 10 0c0-2-1-3.5-2-4.5 0 1.5-1 2.5-2 2.5.5-3-1-7-1-10Z" />
  </svg>
);

export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m15 6-6 6 6 6" />
  </svg>
);

export const HeartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 5.4-7.5 10-7.5 10Z" />
  </svg>
);

export const CommentIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 12a7.5 7.5 0 0 1-7.5 7.5H9L4.5 22v-4.4A7.5 7.5 0 0 1 12.5 4.5 7.5 7.5 0 0 1 20 12Z" />
  </svg>
);

export const SendIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 4 3 11l7 2.5L13 21l8-17Z" />
    <path d="m10 13.5 4-4" />
  </svg>
);

export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 7h15M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" />
    <path d="M6.5 7 7.4 19a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9L17.5 7" />
  </svg>
);

export const PlayIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
  </svg>
);

export const PauseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 5v14M15 5v14" />
  </svg>
);

export const BoltIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M13 3 5 13.5h5.5L11 21l8-10.5h-5.5L13 3Z" />
  </svg>
);

export const LeafIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 19C4 12 8 5 20 4c1 11-5 16-11 16-1.5 0-3-.4-4-1Z" />
    <path d="M9 15c1.5-3 4-5.5 7-7" />
  </svg>
);

export const ShieldIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3.5 19 6v5.5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-2.5Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const InfoIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);

export const CalendarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 10h17M8 3.5V6M16 3.5V6" />
  </svg>
);

export const RefreshIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <path d="M20 4v4.5h-4.5" />
  </svg>
);

export const FlagIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5.5 21V4.5h9l-1 3 4.5.001V15l-4.5-.001 1 3h-9" />
  </svg>
);
