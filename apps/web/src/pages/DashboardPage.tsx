import { Link } from 'react-router-dom';
import {
  ACTIVITY,
  ALERTS,
  FACTORY_KPIS,
  MACHINES,
} from '../data/dummy';
import {
  AlertBanner,
  KpiCard,
  MachineStatusBadge,
  PageHeader,
} from '../components/ui';

export function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Factory dashboard"
        subtitle="Operational status — problems and delays first."
        actions={
          <Link to="/orders/new" className="btn-primary w-full sm:w-auto">
            New order
          </Link>
        }
      />

      <section className="mb-3 space-y-2 sm:mb-4" aria-label="Alerts">
        {ALERTS.map((alert) => (
          <AlertBanner key={alert.id} {...alert} />
        ))}
      </section>

      <section
        className="mb-3 grid grid-cols-2 gap-2 sm:mb-4 lg:grid-cols-4"
        aria-label="KPIs"
      >
        {FACTORY_KPIS.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            tone={kpi.tone}
          />
        ))}
      </section>

      <div className="grid gap-3 lg:grid-cols-12">
        <section className="card-panel lg:col-span-8" aria-label="Machines">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink-900">
              Machines / workstations
            </h2>
            <Link
              to="/production"
              className="cursor-pointer text-xs font-semibold text-brand-700 hover:underline"
            >
              Production view
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {MACHINES.map((m) => (
              <article
                key={m.id}
                className="rounded-xl border border-white/45 bg-white/35 p-3 backdrop-blur-sm"
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
                  <MachineStatusBadge status={m.status} />
                </div>
                <p className="mt-2 truncate text-xs text-ink-600">{m.job}</p>
                <p className="mt-2 font-mono text-xs font-semibold text-ink-800">
                  OEE {m.oee}%
                </p>
              </article>
            ))}
          </div>
        </section>

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
