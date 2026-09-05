import Link from 'next/link';
import {
  ACTIVITY,
  ALERTS,
  FACTORY_KPIS,
  MACHINES,
} from '../../common/dummy';
import Button from '../../common/buttons/Button';
import { AlertTriangle, Info, OctagonX, Plus } from 'lucide-react';
import clsx from 'clsx';

const machineStatusMeta = {
  RUNNING: {
    className: 'bg-success-50 text-success-700',
    dot: 'bg-success-700',
    label: 'Running',
  },
  IDLE: {
    className: 'bg-ink-100 text-ink-700',
    dot: 'bg-ink-700',
    label: 'Idle',
  },
  WARNING: {
    className: 'bg-warning-50 text-warning-700',
    dot: 'bg-warning-700',
    label: 'Warning',
  },
  STOPPED: {
    className: 'bg-danger-50 text-danger-700',
    dot: 'bg-danger-700',
    label: 'Stopped',
  },
};

const alertStyles = {
  critical: 'border-danger-700/20 bg-danger-50/60 backdrop-blur-md',
  warning: 'border-warning-700/20 bg-warning-50/60 backdrop-blur-md',
  info: 'border-info-700/20 bg-info-50/60 backdrop-blur-md',
};

const toneBorder = {
  neutral: 'border-l-brand-600',
  success: 'border-l-success-700',
  warning: 'border-l-warning-700',
  danger: 'border-l-danger-700',
  info: 'border-l-info-700',
};

export default function Dashboard() {
  return (
    <div>
      {/* Page Header */}
      <div className="mb-3 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-ink-900">
            Factory dashboard
          </h1>
          <p className="mt-1 text-sm leading-snug text-ink-500">
            Operational status — problems and delays first.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          <Button href="/orders/new" variant="primary" icon={Plus} className="w-full sm:w-auto">
            New order
          </Button>
        </div>
      </div>

      {/* Alerts */}
      <section className="mb-3 space-y-2 sm:mb-4" aria-label="Alerts">
        {ALERTS.map((alert) => {
          const Icon =
            alert.severity === 'critical'
              ? OctagonX
              : alert.severity === 'warning'
                ? AlertTriangle
                : Info;
                
          return (
            <div
              key={alert.id}
              className={clsx(
                'flex gap-3 rounded-md border px-3 py-2.5 shadow-sm',
                alertStyles[alert.severity]
              )}
              role={alert.severity === 'critical' ? 'alert' : 'status'}
            >
              <Icon
                className={clsx(
                  'mt-0.5 h-4 w-4 shrink-0',
                  alert.severity === 'critical' && 'text-danger-700',
                  alert.severity === 'warning' && 'text-warning-700',
                  alert.severity === 'info' && 'text-info-700'
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-900">{alert.title}</p>
                  <time className="text-2xs font-medium text-ink-500">{alert.time}</time>
                </div>
                <p className="mt-0.5 text-xs text-ink-600">{alert.detail}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* KPIs */}
      <section
        className="mb-3 grid grid-cols-2 gap-2 sm:mb-4 lg:grid-cols-4"
        aria-label="KPIs"
      >
        {FACTORY_KPIS.map((kpi) => (
          <div 
            key={kpi.label} 
            className={clsx(
              "rounded-md border border-white/50 border-l-[4px] bg-white/60 p-3 sm:p-4 backdrop-blur-md relative overflow-hidden shadow-sm", 
              toneBorder[kpi.tone || 'neutral']
            )}
          >
            <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
              {kpi.label}
            </p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-ink-900 sm:text-2xl">
              {kpi.value}
            </p>
            {kpi.hint ? <p className="mt-1 text-xs text-ink-500">{kpi.hint}</p> : null}
          </div>
        ))}
      </section>

      <div className="grid gap-3 lg:grid-cols-12">
        {/* Machines */}
        <section className="card-panel lg:col-span-8" aria-label="Machines">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink-900">
              Machines / workstations
            </h2>
            <Link
              href="/production"
              className="cursor-pointer text-xs font-semibold text-brand-700 hover:underline"
            >
              Production view
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {MACHINES.map((m) => {
              const meta = machineStatusMeta[m.status] ?? machineStatusMeta.IDLE;
              return (
                <article
                  key={m.id}
                  className="rounded-md border border-white/45 bg-white/35 p-3 backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-ink-900">
                        {m.name}
                      </p>
                      <p className="font-mono text-2xs text-ink-500">
                        {m.station}
                      </p>
                    </div>
                    {/* Machine Status Badge inline */}
                    <span className={clsx('badge', meta.className)}>
                      <span className={clsx('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-xs text-ink-600">{m.job}</p>
                  <p className="mt-2 font-mono text-xs font-semibold text-ink-800">
                    OEE {m.oee}%
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* Activity */}
        <section className="card-panel lg:col-span-4" aria-label="Activity">
          <h2 className="mb-3 text-sm font-bold text-ink-900">Activity</h2>
          <ul className="space-y-3">
            {ACTIVITY.map((item) => (
              <li
                key={item.id}
                className="border-b border-ink-100 pb-3 last:border-0 last:pb-0"
              >
                <p className="text-sm text-ink-800">{item.text}</p>
                <p className="mt-1 text-2xs font-medium text-ink-500">
                  {item.time} ago
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
