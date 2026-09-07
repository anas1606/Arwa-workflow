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
      className={clsx(
        'group relative flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
        isActive
          ? 'bg-primary/10 font-bold text-primary-text shadow-[inset_3px_0_0_0_var(--color-primary)]'
          : 'text-grey-text-light hover:bg-white/65 hover:text-grey-text-strong active:bg-white/78'
      )}
    >
      <span
        className={clsx(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150',
          isActive
            ? 'bg-primary/10 text-primary-dark'
            : 'text-grey-icon group-hover:bg-white/55 group-hover:text-grey-text'
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
        'group/branch',
        open && 'nav-branch-open',
        onSection && 'nav-branch-current',
      )}
    >
      <div className="flex w-full items-center gap-0.5">
        <button
          type="button"
          className={clsx(
            'group relative flex w-full min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary text-left',
            onSection
              ? 'bg-primary/10 font-bold text-primary-text shadow-[inset_3px_0_0_0_var(--color-primary)]'
              : 'text-grey-text-light hover:bg-white/65 hover:text-grey-text-strong active:bg-white/78'
          )}
          aria-expanded={open}
          aria-controls={submenuId}
          onClick={() => setOpen((v) => !v)}
        >
          <span
            className={clsx(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150',
              onSection
                ? 'bg-primary/10 text-primary-dark'
                : 'text-grey-icon group-hover:bg-white/55 group-hover:text-grey-text'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
          <ChevronDown
            className={clsx(
              'h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out text-grey-icon',
              open && 'rotate-180',
              onSection && 'text-primary'
            )}
            aria-hidden
          />
        </button>
      </div>

      <div
        id={submenuId}
        className={clsx(
          'overflow-hidden p-0 transition-all duration-200 ease-out',
          open ? 'max-h-[12rem] mt-[2px] opacity-100 pointer-events-auto' : 'm-0 max-h-0 opacity-0 pointer-events-none'
        )}
        role="group"
        aria-label={`${item.label} views`}
        aria-hidden={!open}
      >
        <div className="rounded-[10px] border border-primary/7 bg-primary/[3.5%] p-1 pr-0">
          <ul className="relative ml-3.5 min-h-0 space-y-0.5 border-l-[2px] border-primary/20 pl-3">
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
                      'group relative flex min-h-9 cursor-pointer items-center gap-2 rounded-md py-1 pl-2 pr-2.5 text-[13px] font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
                      active
                        ? 'bg-primary/10 font-bold text-primary-text shadow-[inset_3px_0_0_0_var(--color-primary)]'
                        : 'text-grey-muted hover:bg-primary/6 hover:text-primary-text'
                    )}
                    aria-current={
                      forceAllOrdersActive && pathname !== '/orders'
                        ? 'page'
                        : undefined
                    }
                  >
                    <span 
                      className={clsx(
                        "pointer-events-none absolute left-[-13px] top-1/2 h-[2px] w-[10px] -translate-y-1/2",
                        active ? "bg-primary" : "bg-primary/22 group-hover:bg-primary/45"
                      )}
                      aria-hidden 
                    >
                      <span 
                        className={clsx(
                          "absolute left-0 top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] transition-colors duration-150",
                          active ? "border-primary bg-primary" : "border-primary/45 bg-white group-hover:border-primary/75 group-hover:bg-white"
                        )}
                      />
                    </span>
                    <span
                      className={clsx(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-all duration-150',
                        active
                          ? 'bg-primary/18 text-primary-dark'
                          : 'text-grey-icon group-hover:bg-primary/8 group-hover:text-primary-dark'
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
      <p className="mb-2 px-3 text-2xs font-semibold uppercase tracking-wider text-grey-icon/90">
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
          className="flex cursor-pointer items-center gap-2.5 rounded-md outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-white shadow-sm shadow-primary/25">
            AW
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold leading-tight text-grey-text-strong">
              Arwa Weld
            </span>
            <span className="block text-2xs font-medium uppercase tracking-wide text-grey-muted">
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
          <p className="text-2xs font-semibold uppercase tracking-wide text-grey-icon">
            Plant status
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-grey-text-dark">
            <span
              className="h-1.5 w-1.5 rounded-full bg-success-dark shadow-[0_0_0_3px_rgba(21,128,61,0.15)]"
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
              active ? 'text-primary-dark' : 'text-grey-icon active:text-grey-text',
            )}
          >
            {active ? (
              <span
                className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-primary"
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
