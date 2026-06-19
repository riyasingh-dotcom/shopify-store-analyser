'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { ShopInfo } from '@/types/shopify';
import { signOutAction } from '@/app/actions/auth';

const NAV_LINKS = [
  { href: '/', label: 'Overview', exact: true },
  { href: '/products', label: 'Products', exact: false },
  { href: '/orders', label: 'Orders', exact: false },
  { href: '/history', label: 'History', exact: false },
] as const;

interface TopNavProps {
  shop: ShopInfo;
  isMockData: boolean;
  user: { name?: string | null; email?: string | null } | null;
}

export default function TopNav({ shop, isMockData, user }: TopNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials =
    shop.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'SA';

  function isActive(href: string, exact: boolean): boolean {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur-sm lg:px-16">
      <div className="flex h-16 items-center gap-4 px-4 sm:gap-6 sm:px-6">
        {/* Brand */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2"
          onClick={() => setMobileOpen(false)}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#96bf48]">
            <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4" aria-hidden="true">
              <path d="M15.337 6.94a.5.5 0 00-.464-.31h-1.39l-.52-2.81A2.5 2.5 0 0010.5 2h-.01a2.5 2.5 0 00-2.452 1.82L7.517 6.63H6.127a.5.5 0 00-.496.435l-1 8.5A.5.5 0 005.127 16h13.746a.5.5 0 00.496-.565l-1-8.5a.5.5 0 00-.032-.085zM10.49 3.5c.69 0 1.29.477 1.45 1.148l.42 1.982H8.64l.398-1.97A1 1 0 0110.49 3.5z" />
            </svg>
          </div>
          <span className="text-base font-semibold text-gray-900">Store Analyser</span>
        </Link>

        {/* Divider */}
        <div className="hidden h-5 w-px bg-gray-200 sm:block" aria-hidden="true" />

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main navigation">
          {NAV_LINKS.map(({ href, label, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" aria-hidden="true" />

        {/* Demo / Live badge (desktop) */}
        <div
          className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:flex ${
            isMockData ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isMockData ? 'bg-amber-400' : 'bg-emerald-500'
            }`}
          />
          {isMockData ? 'Demo' : 'Live'}
        </div>

        {/* User + Sign out (desktop) */}
        {user && (
          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                {initials}
              </div>
              <span className="hidden max-w-[160px] truncate text-xs text-gray-500 lg:block">
                {user.email}
              </span>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                Sign out
              </button>
            </form>
          </div>
        )}

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 md:hidden"
        >
          {mobileOpen ? (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white px-4 py-3 md:hidden">
          <nav className="space-y-0.5" aria-label="Mobile navigation">
            {NAV_LINKS.map(({ href, label, exact }) => {
              const active = isActive(href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {user && (
            <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2 px-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {initials}
                </div>
                <span className="min-w-0 truncate text-xs text-gray-500">{user.email}</span>
              </div>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}

          <div className="mt-3 border-t border-gray-100 px-3 pt-3">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                isMockData ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isMockData ? 'bg-amber-400' : 'bg-emerald-500'
                }`}
              />
              {isMockData ? 'Demo mode' : 'Live data'}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
