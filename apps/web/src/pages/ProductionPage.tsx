import { MACHINES } from '../data/dummy';
import { MachineStatusBadge, PageHeader } from '../components/ui';

export function ProductionPage() {
  return (
    <div>
      <PageHeader
        title="Production"
        subtitle="Workstation status at a glance — dummy monitoring board."
      />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {MACHINES.map((m) => (
          <article key={m.id} className="card-panel">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-ink-900">{m.name}</h2>
                <p className="font-mono text-2xs text-ink-500">{m.station}</p>
              </div>
              <MachineStatusBadge status={m.status} />
            </div>
            <p className="mt-3 text-sm text-ink-700">{m.job}</p>
            <div className="mt-3 flex items-center justify-between border-t border-white/40 pt-3">
              <span className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
                OEE
              </span>
              <span className="font-mono text-sm font-bold tabular-nums text-ink-900">
                {m.oee}%
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
