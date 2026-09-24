import { Sidebar, MobileNav } from './Sidebar';
import clsx from 'clsx';
import Link from 'next/link';
import useUser from '@/hooks/useUser';
import AccessRestricted from './AccessRestricted';
import { useRouter } from 'next/router';

export function Layout({ children }) {
  const { hasPermission, isLoading } = useUser();
  const router = useRouter();

  const ROUTE_PERMISSIONS = [
    { path: '/dashboard', module: 'dashboard' },
    { path: '/customers', module: 'customers' },
    { path: '/inventory/customisation', module: 'customisation' },
    { path: '/orders', module: 'orders' },
    { path: '/production', module: 'production' },
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
  } else if (router.pathname.includes('/edit') || router.pathname.includes('/[')) {
    // If it's a sub-path like /[id] or /edit, it requires update permission
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

      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col md:pl-[14.25rem] md:pb-0 pb-[calc(4.75rem+env(safe-area-inset-bottom))]">
        {/* Mobile top brand bar */}
        <header className="glass-nav-mobile-top md:hidden">
          <Link
            href="/"
            className="flex min-h-11 cursor-pointer items-center gap-2.5 px-3"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">
              AW
            </span>
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

      <MobileNav />
    </div>
  );
}
