import { Sidebar } from './Sidebar';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import useUser from '@/hooks/useUser';
import AccessRestricted from './AccessRestricted';
import { useRouter } from 'next/router';

export function Layout({ children }) {
  const { hasPermission, isLoading } = useUser();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const ROUTE_PERMISSIONS = [
    { path: '/dashboard', module: 'dashboard' },
    { path: '/customers', module: 'customers' },
    { path: '/inventory/customisation', module: 'customisation' },
    { path: '/orders', module: 'orders' },
    { path: '/production/job-work', module: 'job_work' },
    { path: '/production/bom-calculation', module: 'bom_calculation' },
    { path: '/bom', module: 'bom' },
    { path: '/inventory/category', module: 'categories' },
    { path: '/inventory/product', module: 'products' },
    { path: '/inventory/unit', module: 'units' },
    { path: '/inventory/packaging', module: 'packaging' },
    { path: '/inventory/godown', module: 'godown' },
    { path: '/inventory/stock', module: 'stock' },
    { path: '/users', module: 'users', fallbackModule: 'security_roles' },
    { path: '/settings', module: 'settings' }
  ];

  const matchedRoute = ROUTE_PERMISSIONS.find(route => router.pathname === route.path || router.pathname.startsWith(route.path + '/'));
  const moduleKey = matchedRoute ? matchedRoute.module : null;
  const fallbackModuleKey = matchedRoute ? matchedRoute.fallbackModule : null;

  let requiredAction = 'can_read';
  if (router.pathname.endsWith('/create') || router.pathname.endsWith('/new') || router.pathname.endsWith('/add')) {
    requiredAction = 'can_create';
  } else if (router.pathname.includes('/edit')) {
    // If it's a sub-path like /edit, it requires update permission
    requiredAction = 'can_update';
  }

  const isAuthorized = !moduleKey || 
    hasPermission(moduleKey, requiredAction) || 
    (fallbackModuleKey && hasPermission(fallbackModuleKey, requiredAction));

  if (isLoading) {
    return <div className="flex h-dvh items-center justify-center">Loading...</div>;
  }

  // Keeping layout simple for dashboard
  return (
    <div className="flex w-full min-h-dvh">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">
        Skip to content
      </a>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[14.25rem] lg:pb-0 pb-0">
        {/* Mobile top brand bar */}
        <header className="glass-nav-mobile-top lg:hidden sticky top-0 z-[999] flex items-center gap-2 px-3 py-1 bg-[var(--app-bg)]/80 backdrop-blur-md border-b border-grey-border/30">
          <button 
            type="button" 
            className="p-1 -ml-1 mr-1 text-primary-text hover:text-primary-dark focus:outline-none"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
          <Link
            href="/"
            className="flex min-h-11 cursor-pointer items-center gap-2.5"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-grey-text-strong">
                Arwa Weld
              </span>
              <span className="block text-2xs font-medium uppercase tracking-wide text-grey-muted">
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
          {isAuthorized ? children : <AccessRestricted />}
        </main>
      </div>
    </div>
  );
}
