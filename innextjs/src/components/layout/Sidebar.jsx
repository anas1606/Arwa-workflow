import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
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

const operationsNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
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

const masterNav = [{ to: '/bom', label: 'BOM', icon: Layers }];

const allNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/customers', label: 'Customers', icon: Building2 },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/production', label: 'Production', icon: Factory },
  { to: '/bom', label: 'BOM', icon: Layers },
];

function NavItemLink({ item }) {
  const router = useRouter();
  const Icon = item.icon;
  const isActive = item.end ? router.pathname === item.to : router.pathname.startsWith(item.to);

  return (
    <Link
      href={item.to}
      className={clsx('nav-item group', isActive && 'nav-item-active')}
    >
      <span
        className={clsx(
          'nav-icon-wrap',
          isActive && 'nav-icon-wrap-active',
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NestedNavItem({ item, pathname }) {
  const router = useRouter();
  const Icon = item.icon;
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
      <div className="nav-branch-row w-full">
        <button
          type="button"
          className={clsx(
            'nav-item group w-full',
            onSection && 'nav-item-active',
          )}
          aria-expanded={open}
          aria-controls={submenuId}
          onClick={() => setOpen((v) => !v)}
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
          <ChevronDown
            className={clsx(
              'nav-branch-chevron h-3.5 w-3.5 shrink-0 transition-transform duration-200 text-ink-400',
              open && 'rotate-180',
              onSection && 'text-brand-600'
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

              const isActive = child.end ? pathname === child.to : pathname.startsWith(child.to);
              const active = isActive || forceAllOrdersActive;

              return (
                <li key={`${child.to}-${child.end ? 'end' : 'path'}`}>
                  <Link
                    href={child.to}
                    tabIndex={open ? undefined : -1}
                    className={clsx(
                      'nav-subitem group',
                      active && 'nav-subitem-active',
                    )}
                    aria-current={
                      forceAllOrdersActive && pathname !== '/orders'
                        ? 'page'
                        : undefined
                    }
                  >
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
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </li>
  );
}

function NavSection({ title, items }) {
  const router = useRouter();

  return (
    <div className="mb-5">
      <p className="mb-2 px-3 text-2xs font-semibold uppercase tracking-wider text-ink-400/90">
        {title}
      </p>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) =>
          item.children?.length ? (
            <NestedNavItem key={item.to} item={item} pathname={router.pathname} />
          ) : (
            <li key={item.to}>
              <NavItemLink item={item} />
            </li>
          )
        )}
      </ul>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="glass-nav" aria-label="Application">
      <div className="glass-nav-header">
        <Link
          href="/"
          className="flex cursor-pointer items-center gap-2.5 rounded-md outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white shadow-sm shadow-brand-600/25">
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
  );
}

export function MobileNav() {
  const router = useRouter();
  const pathname = router.pathname;

  return (
    <nav className="glass-nav-mobile" aria-label="Primary mobile">
      {allNav.map((item) => {
        const Icon = item.icon;
        const isOrders = item.to === '/orders';
        const active = isOrders
          ? pathname.startsWith('/orders')
          : item.end
            ? pathname === item.to
            : pathname.startsWith(item.to);

        return (
          <Link
            key={item.to}
            href={item.to}
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
          </Link>
        );
      })}
    </nav>
  );
}
