'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const baseLinkClasses = 'flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium';

const iconWrapperClasses = 'w-5 h-5 flex items-center justify-center';

const navItems = [
  {
    href: '/customer',
    label: 'אזור אישי',
    icon: (
      <svg className={iconWrapperClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    href: '/orders',
    label: 'הזמנות',
    icon: (
      <svg className={iconWrapperClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
  },
  {
    href: '/shop',
    label: 'מוצרים',
    icon: (
      <svg className={iconWrapperClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
    ),
  },
  {
    href: '/contact',
    label: 'תמיכה',
    icon: (
      <svg className={iconWrapperClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18 10c0 3.866-3.582 7-8 7a8.82 8.82 0 01-4-.93L2 17l1.332-3.107A7.6 7.6 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7z"
        />
      </svg>
    ),
  },
];

export default function CustomerNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg p-3">
      <ul className="flex flex-wrap items-center gap-3">
        {navItems.map(({ href, label, icon }) => {
          const isActive = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                className={`${baseLinkClasses} ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {icon}
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
