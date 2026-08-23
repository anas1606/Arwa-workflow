import { useEffect, useId, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  ChevronDown,
  ClipboardList,
  Factory,
  LayoutDashboard,
  LayoutList,
  Layers,
  Settings2,
} from 'lucide-react';
import clsx from 'clsx';

type NavChild = {
  to: string;
  label: string;
  icon: typeof LayoutList;
  end?: boolean;
};

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  children?: NavChild[];
};

const operationsNav: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/customers', label: 'Customers', icon: Building2 },
  {
    to: '/orders',
    label: 'Orders',
    icon: ClipboardList,
    children: [
      { to: '/orders', label: 'All orders', icon: LayoutList, end: true },
      { to: '/orders/customisation', label: 'Customisation', icon: Settings2 },
    ],
  },
  { to: '/production', label: 'Production', icon: Factory },
];

const masterNav: NavItem[] = [{ to: '/bom', label: 'BOM', icon: Layers }];

const allNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true as const },
  { to: '/customers', label: 'Customers', icon: Building2 },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/production', label: 'Production', icon: Factory },
  { to: '/bom', label: 'BOM', icon: Layers },
];

function NavItemLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        clsx('nav-item group', isActive && 'nav-item-active')
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={clsx(
              'nav-icon-wrap',
              isActive && 'nav-icon-wrap-active',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function NestedNavItem({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const Icon = item.icon;
  const navigate = useNavigate();
  const submenuId = useId();
  const onSection = pathname.startsWith(item.to);
  const [open, setOpen] = useState(onSection);

  useEffect(() => {
    if (onSection) setOpen(true);
  }, [onSection]);

  return (
    <li
      className={clsx(
        'nav-branch',
        open && 'nav-branch-open',
        onSection && 'nav-branch-current',
      )}
    >
      <div className="nav-branch-row">
        <button
          type="button"
          className={clsx(
            'nav-item nav-branch-trigger group min-w-0 flex-1',
            onSection && 'nav-branch-trigger-active',
          )}
          aria-expanded={open}
          aria-controls={submenuId}
          onClick={() => {
            if (!onSection) {
              setOpen(true);
              navigate(item.to);
              return;
            }
            setOpen((v) => !v);
          }}
        >
          <span
            className={clsx(
              'nav-icon-wrap',
              onSection && 'nav-icon-wrap-active',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        </button>
        <button
          type="button"
          className="nav-branch-toggle"
          aria-expanded={open}
          aria-controls={submenuId}
          aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown
            className={clsx(
              'nav-branch-chevron h-3.5 w-3.5',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
      </div>

      <div
        id={submenuId}
        className={clsx(
          'nav-submenu',
          open ? 'nav-submenu-open' : 'nav-submenu-closed',
        )}
        role="group"
        aria-label={`${item.label} views`}
        aria-hidden={!open}
      >
        <div className="nav-submenu-panel">
          <ul className="nav-submenu-list">
            {item.children?.map((child) => {
              const ChildIcon = child.icon;
              const isAllOrdersChild = child.to === '/orders' && child.end;
              const forceAllOrdersActive =
                isAllOrdersChild &&
                pathname.startsWith('/orders') &&
                !pathname.startsWith('/orders/by-product') &&
                !pathname.startsWith('/orders/by-order-type') &&
                !pathname.startsWith('/orders/customisation') &&
                !pathname.startsWith('/orders/config');

              return (
                <li key={`${child.to}-${child.end ? 'end' : 'path'}`}>
                  <NavLink
                    to={child.to}
                    end={child.end}
                    tabIndex={open ? undefined : -1}
                    className={({ isActive }) =>
                      clsx(
                        'nav-subitem group',
                        (isActive || forceAllOrdersActive) && 'nav-subitem-active',
                      )
                    }
                    aria-current={
                      forceAllOrdersActive && pathname !== '/orders'
                        ? 'page'
                        : undefined
                    }
                  >
                    {({ isActive }) => {
                      const active = isActive || forceAllOrdersActive;
                      return (
                        <>
                          <span className="nav-subitem-connector" aria-hidden>
                            <span className="nav-subitem-dot" />
                          </span>
                          <span
                            className={clsx(
                              'nav-subitem-icon',
                              active && 'nav-subitem-icon-active',
                            )}
                          >
                            <ChildIcon className="h-3.5 w-3.5" aria-hidden />
                          </span>
                          <span className="truncate">{child.label}</span>
                        </>
                      );
                    }}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </li>
  );
}

function NavSection({
  title,
  items,
}: {
  title: string;
  items: NavItem[];
}) {
  const { pathname } = useLocation();

  return (
    <div className="mb-5">
      <p className="mb-2 px-3 text-2xs font-semibold uppercase tracking-wider text-ink-400/90">
        {title}
      </p>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) =>
          item.children?.length ? (
            <NestedNavItem key={item.to} item={item} pathname={pathname} />
          ) : (
            <li key={item.to}>
              <NavItemLink item={item} />
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

export function AppShell() {
  const { pathname } = useLocation();
  const onOrders = pathname.startsWith('/orders');
  const onCreateOrder = pathname === '/orders/new';
  const showMobileOrdersTabs = onOrders && !onCreateOrder;

  return (
    <div
      className={clsx(
        'flex w-full max-w-[100vw] overflow-x-hidden',
        onCreateOrder ? 'h-dvh max-h-dvh overflow-hidden' : 'min-h-dvh',
      )}
    >
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <aside className="glass-nav" aria-label="Application">
        <div className="glass-nav-header">
          <Link
            to="/"
            className="flex cursor-pointer items-center gap-2.5 rounded-lg outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white shadow-sm shadow-brand-600/25">
              AW
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold leading-tight text-ink-900">
                Arwa Weld
              </span>
              <span className="block text-2xs font-medium uppercase tracking-wide text-ink-500">
                Factory workflow
              </span>
            </span>
          </Link>
        </div>

        <nav className="glass-nav-body" aria-label="Primary">
          <NavSection title="Operations" items={operationsNav} />
          <NavSection title="Master data" items={masterNav} />
        </nav>

        <div className="glass-nav-footer">
          <div className="glass-nav-status">
            <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">
              Plant status
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-ink-800">
              <span
                className="h-1.5 w-1.5 rounded-full bg-success-700 shadow-[0_0_0_3px_rgba(21,128,61,0.15)]"
                aria-hidden
              />
              Shift A · Live
            </p>
          </div>
        </div>
      </aside>

      <div
        className={clsx(
          'flex min-w-0 flex-1 flex-col md:ml-[14.25rem] md:pb-0',
          onCreateOrder
            ? 'h-full min-h-0 overflow-hidden pb-0'
            : showMobileOrdersTabs
              ? 'pb-[calc(7.75rem+env(safe-area-inset-bottom))]'
              : 'pb-[calc(4.75rem+env(safe-area-inset-bottom))]',
        )}
      >
        {/* Mobile top brand bar */}
        <header className="glass-nav-mobile-top md:hidden">
          <Link
            to="/"
            className="flex min-h-11 cursor-pointer items-center gap-2.5 px-3"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
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
          className={clsx(
            'mx-auto w-full flex-1 px-3 py-3 outline-none focus:outline-none sm:px-4 sm:py-4 lg:max-w-none lg:p-5',
            onCreateOrder &&
              'flex h-full min-h-0 flex-col overflow-hidden px-3 py-2 sm:px-4 sm:py-2 lg:px-4 lg:py-3',
          )}
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile Orders secondary nav — sits above bottom bar */}
      {showMobileOrdersTabs ? (
        <div
          className="glass-orders-tabs md:hidden"
          role="navigation"
          aria-label="Orders views"
        >
          <NavLink
            to="/orders"
            end
            className={({ isActive }) =>
              clsx('mobile-orders-tab', isActive && 'mobile-orders-tab-active')
            }
          >
            <LayoutList className="h-4 w-4 shrink-0" aria-hidden />
            All orders
          </NavLink>
          <NavLink
            to="/orders/customisation"
            className={({ isActive }) =>
              clsx('mobile-orders-tab', isActive && 'mobile-orders-tab-active')
            }
          >
            <Settings2 className="h-4 w-4 shrink-0" aria-hidden />
            Customisation
          </NavLink>
        </div>
      ) : null}

      {!onCreateOrder ? (
      <nav className="glass-nav-mobile" aria-label="Primary mobile">
        {allNav.map((item) => {
          const Icon = item.icon;
          const isOrders = item.to === '/orders';
          const active = isOrders
            ? pathname.startsWith('/orders')
            : item.end
              ? pathname === item.to
              : pathname === item.to;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={clsx(
                'relative flex min-h-12 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 px-1 py-2 text-2xs font-semibold transition-colors duration-150',
                active ? 'text-brand-700' : 'text-ink-400 active:text-ink-700',
              )}
            >
              {active ? (
                <span
                  className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-brand-600"
                  aria-hidden
                />
              ) : null}
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      ) : null}
    </div>
  );
}
