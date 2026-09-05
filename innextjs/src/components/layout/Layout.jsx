import { Sidebar, MobileNav } from './Sidebar';
import clsx from 'clsx';
import Link from 'next/link';

export function Layout({ children }) {
  // Keeping layout simple for dashboard
  return (
    <div className="flex w-full min-h-dvh">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-brand-600 focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">
        Skip to content
      </a>

      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col md:pl-[14.25rem] md:pb-0 pb-[calc(4.75rem+env(safe-area-inset-bottom))]">
        {/* Mobile top brand bar */}
        <header className="glass-nav-mobile-top md:hidden">
          <Link
            href="/"
            className="flex min-h-11 cursor-pointer items-center gap-2.5 px-3"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
              AW
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-ink-900">
                Arwa Weld
              </span>
              <span className="block text-2xs font-medium uppercase tracking-wide text-ink-500">
                Factory workflow
              </span>
            </span>
          </Link>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full flex-1 p-3 outline-none focus:outline-none lg:max-w-none"
        >
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
